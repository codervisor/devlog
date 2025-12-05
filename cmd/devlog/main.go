package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/codervisor/devlog/internal/adapters"
	"github.com/codervisor/devlog/internal/backfill"
	"github.com/codervisor/devlog/internal/buffer"
	"github.com/codervisor/devlog/internal/client"
	"github.com/codervisor/devlog/internal/config"
	"github.com/codervisor/devlog/internal/hierarchy"
	"github.com/codervisor/devlog/internal/watcher"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

var (
	version    = "1.0.0"
	log        = logrus.New()
	configPath string
	cfg        *config.Config
)

// agentNameMap maps config agent names to adapter agent names
var agentNameMap = map[string]string{
	"copilot": "github-copilot",
	"claude":  "claude",
	"cursor":  "cursor",
	"cline":   "cline",
	"aider":   "aider",
}

// mapAgentName converts config agent name to adapter agent name
func mapAgentName(configName string) string {
	if adapterName, ok := agentNameMap[configName]; ok {
		return adapterName
	}
	return configName
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "devlog-collector",
	Short: "AI Agent Activity Collector for Devlog",
	Long: `A lightweight collector that monitors AI agent logs in real-time
and forwards events to the Devlog backend.

Supports: GitHub Copilot, Claude Code, Cursor, and more.`,
	Version: version,
}

var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Start the collector daemon",
	Long:  "Start the collector daemon to monitor AI agent logs",
	RunE: func(cmd *cobra.Command, args []string) error {
		log.Info("Starting Devlog Collector...")
		log.Infof("Version: %s", version)

		// Load configuration
		var err error
		cfg, err = config.LoadConfig(configPath)
		if err != nil {
			return fmt.Errorf("failed to load configuration: %w", err)
		}
		log.Infof("Configuration loaded from: %s", configPath)
		log.Infof("Backend URL: %s", cfg.BackendURL)
		log.Infof("Project ID: %s", cfg.ProjectID)
		log.Infof("Batch size: %d events", cfg.Collection.BatchSize)
		log.Infof("Batch interval: %s", cfg.Collection.BatchInterval)

		// Configure logging level
		level, err := logrus.ParseLevel(cfg.Logging.Level)
		if err == nil {
			log.SetLevel(level)
		}

		// List enabled agents
		log.Info("Enabled agents:")
		for agentName, agentCfg := range cfg.Agents {
			if agentCfg.Enabled {
				log.Infof("  - %s (log path: %s)", agentName, agentCfg.LogPath)
			}
		}

		// Initialize adapter registry with hierarchy cache
		hiererchyCache := hierarchy.NewHierarchyCache(nil, log)
		registry := adapters.DefaultRegistry(cfg.ProjectID, hiererchyCache, log)
		log.Infof("Registered %d agent adapters", len(registry.List()))

		// Initialize buffer
		bufferConfig := buffer.Config{
			DBPath:  cfg.Buffer.DBPath,
			MaxSize: cfg.Buffer.MaxSize,
			Logger:  log,
		}
		buf, err := buffer.NewBuffer(bufferConfig)
		if err != nil {
			return fmt.Errorf("failed to create buffer: %w", err)
		}
		defer buf.Close()

		// Initialize API client
		batchInterval, _ := cfg.GetBatchInterval()
		clientConfig := client.Config{
			BaseURL:    cfg.BackendURL,
			APIKey:     cfg.APIKey,
			BatchSize:  cfg.Collection.BatchSize,
			BatchDelay: batchInterval,
			MaxRetries: cfg.Collection.MaxRetries,
			Logger:     log,
		}
		apiClient := client.NewClient(clientConfig)
		apiClient.Start()
		defer apiClient.Stop()

		// Check backend connectivity
		log.Info("Checking backend connectivity...")
		if err := apiClient.HealthCheck(); err != nil {
			log.Warnf("Backend health check failed: %v", err)
			log.Info("Will buffer events locally until backend is available")
		} else {
			log.Info("Backend is reachable")
		}

		// Initialize file watcher
		watcherConfig := watcher.Config{
			Registry:       registry,
			EventQueueSize: 1000,
			DebounceMs:     100,
			Logger:         log,
		}
		fileWatcher, err := watcher.NewWatcher(watcherConfig)
		if err != nil {
			return fmt.Errorf("failed to create watcher: %w", err)
		}
		defer fileWatcher.Stop()

		if err := fileWatcher.Start(); err != nil {
			return fmt.Errorf("failed to start watcher: %w", err)
		}

		// Discover and watch agent logs
		log.Info("Discovering agent logs...")
		discovered, err := watcher.DiscoverAllAgentLogs()
		if err != nil {
			return fmt.Errorf("failed to discover logs: %w", err)
		}

		for agentName, logs := range discovered {
			adapterName := mapAgentName(agentName)
			adapterInstance, err := registry.Get(adapterName)
			if err != nil {
				log.Warnf("No adapter for %s (mapped to %s), skipping", agentName, adapterName)
				continue
			}

			for _, logInfo := range logs {
				log.Infof("Watching %s logs at: %s", agentName, logInfo.Path)
				if err := fileWatcher.Watch(logInfo.Path, adapterInstance); err != nil {
					log.Warnf("Failed to watch %s: %v", logInfo.Path, err)
				}
			}
		}

		// Process events from watcher to client
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		go func() {
			for {
				select {
				case <-ctx.Done():
					return
				case event := <-fileWatcher.EventQueue():
					// Try to send immediately
					if err := apiClient.SendEvent(event); err != nil {
						log.Warnf("Failed to send event, buffering: %v", err)
						// Buffer if send fails
						if err := buf.Store(event); err != nil {
							log.Errorf("Failed to buffer event: %v", err)
						}
					}
				}
			}
		}()

		// Periodically flush buffered events
		go func() {
			ticker := time.NewTicker(30 * time.Second)
			defer ticker.Stop()

			for {
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					count, _ := buf.Count()
					if count == 0 {
						continue
					}

					log.Infof("Attempting to flush %d buffered events", count)

					// Retrieve events from buffer
					events, err := buf.Retrieve(cfg.Collection.BatchSize)
					if err != nil {
						log.Errorf("Failed to retrieve buffered events: %v", err)
						continue
					}

					// Try to send each buffered event
					sentIDs := []string{}
					for _, event := range events {
						if err := apiClient.SendEvent(event); err != nil {
							log.Warnf("Failed to send buffered event: %v", err)
							break // Stop if send fails
						}
						sentIDs = append(sentIDs, event.ID)
					}

					// Delete successfully sent events
					if len(sentIDs) > 0 {
						if err := buf.Delete(sentIDs); err != nil {
							log.Errorf("Failed to delete sent events: %v", err)
						} else {
							log.Infof("Flushed %d buffered events", len(sentIDs))
						}
					}
				}
			}
		}()

		log.Info("Collector started successfully")
		log.Info("Press Ctrl+C to stop gracefully")

		// Wait for interrupt signal
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan

		log.Info("Shutting down gracefully...")
		cancel()

		// Give components time to clean up
		time.Sleep(2 * time.Second)

		log.Info("Collector stopped")
		return nil
	},
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version information",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("Devlog Collector v%s\n", version)
	},
}

var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Check collector status",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Checking collector status...")
		// TODO: Connect to health check endpoint
		fmt.Println("Status: Not implemented yet")
	},
}

var backfillCmd = &cobra.Command{
	Use:   "backfill",
	Short: "Process historical agent logs",
	Long: `Backfill processes historical log files to import past agent activity.
This is useful for capturing development history before the collector was installed.`,
}

var backfillRunCmd = &cobra.Command{
	Use:   "run",
	Short: "Run backfill operation",
	Long:  "Process historical logs for the specified agent and date range",
	RunE: func(cmd *cobra.Command, args []string) error {
		// Load configuration
		var err error
		cfg, err = config.LoadConfig(configPath)
		if err != nil {
			return fmt.Errorf("failed to load configuration: %w", err)
		}

		// Parse flags
		agentName, _ := cmd.Flags().GetString("agent")
		fromDate, _ := cmd.Flags().GetString("from")
		toDate, _ := cmd.Flags().GetString("to")
		dryRun, _ := cmd.Flags().GetBool("dry-run")
		days, _ := cmd.Flags().GetInt("days")
		allWorkspaces, _ := cmd.Flags().GetBool("all-workspaces")
		specificWorkspaces, _ := cmd.Flags().GetStringSlice("workspaces")

		// Parse dates
		var from, to time.Time
		if fromDate != "" {
			from, err = time.Parse("2006-01-02", fromDate)
			if err != nil {
				return fmt.Errorf("invalid from date: %w", err)
			}
		} else if days > 0 {
			from = time.Now().AddDate(0, 0, -days)
		}

		if toDate != "" {
			to, err = time.Parse("2006-01-02", toDate)
			if err != nil {
				return fmt.Errorf("invalid to date: %w", err)
			}
		} else {
			to = time.Now()
		}

		// Initialize buffer
		bufferConfig := buffer.Config{
			DBPath:  cfg.Buffer.DBPath,
			MaxSize: cfg.Buffer.MaxSize,
			Logger:  log,
		}
		buf, err := buffer.NewBuffer(bufferConfig)
		if err != nil {
			return fmt.Errorf("failed to create buffer: %w", err)
		}
		defer buf.Close()

		// Initialize API client
		batchInterval, _ := cfg.GetBatchInterval()
		clientConfig := client.Config{
			BaseURL:    cfg.BackendURL,
			APIKey:     cfg.APIKey,
			BatchSize:  cfg.Collection.BatchSize,
			BatchDelay: batchInterval,
			MaxRetries: cfg.Collection.MaxRetries,
			Logger:     log,
		}
		apiClient := client.NewClient(clientConfig)
		apiClient.Start()
		defer apiClient.Stop()

		// Initialize hierarchy cache and adapters (needs client)
		hiererchyCache := hierarchy.NewHierarchyCache(apiClient, log)
		registry := adapters.DefaultRegistry(cfg.ProjectID, hiererchyCache, log)

		// Create backfill manager
		backfillConfig := backfill.Config{
			Registry:    registry,
			Buffer:      buf,
			Client:      apiClient,
			StateDBPath: cfg.Buffer.DBPath,
			Logger:      log,
		}
		manager, err := backfill.NewBackfillManager(backfillConfig)
		if err != nil {
			return fmt.Errorf("failed to create backfill manager: %w", err)
		}
		defer manager.Close()

		// Determine log path
		logPath := ""
		if agentName != "" {
			if agentCfg, exists := cfg.Agents[agentName]; exists {
				logPath = agentCfg.LogPath
			} else {
				return fmt.Errorf("unknown agent: %s", agentName)
			}
		}

		if logPath == "" {
			return fmt.Errorf("no log path specified")
		}

		// If log path is "auto", discover paths
		var logPaths []string
		if logPath == "auto" {
			log.Infof("Auto-discovering log paths for %s...", agentName)
			discovered, err := watcher.DiscoverAgentLogs(agentName)
			if err != nil {
				return fmt.Errorf("failed to discover logs for %s: %w", agentName, err)
			}
			if len(discovered) == 0 {
				return fmt.Errorf("no logs found for agent %s", agentName)
			}

			// Filter by workspace IDs if specified
			if len(specificWorkspaces) > 0 {
				log.Infof("Filtering for workspaces: %v", specificWorkspaces)
				for _, d := range discovered {
					for _, wsID := range specificWorkspaces {
						if strings.Contains(d.Path, wsID) {
							logPaths = append(logPaths, d.Path)
							break
						}
					}
				}
				if len(logPaths) == 0 {
					return fmt.Errorf("no logs found for specified workspaces")
				}
			} else if allWorkspaces {
				// Process all discovered workspaces
				log.Infof("Processing all %d discovered workspaces", len(discovered))
				for _, d := range discovered {
					logPaths = append(logPaths, d.Path)
				}
			} else {
				// Default: use first discovered path (backward compatibility)
				logPaths = []string{discovered[0].Path}
				log.Infof("Using discovered log path: %s", logPaths[0])
				log.Infof("Hint: Use --all-workspaces to process all %d workspaces", len(discovered))
			}
		} else {
			// Use specified log path
			logPaths = []string{logPath}
		}

		// Progress callback
		startTime := time.Now()
		progressFunc := func(p backfill.Progress) {
			elapsed := time.Since(startTime)
			eventsPerSec := float64(p.EventsProcessed) / elapsed.Seconds()

			fmt.Printf("\rProgress: [%-20s] %.1f%% | Events: %d | Speed: %.1f/s",
				progressBar(p.Percentage),
				p.Percentage,
				p.EventsProcessed,
				eventsPerSec,
			)
		}

		// Run backfill for each log path
		ctx := context.Background()
		adapterName := mapAgentName(agentName)

		// Aggregate results
		totalResult := &backfill.BackfillResult{}
		overallStart := time.Now()

		for i, logPath := range logPaths {
			if len(logPaths) > 1 {
				fmt.Printf("\n[%d/%d] Processing: %s\n", i+1, len(logPaths), logPath)
			}

			bfConfig := backfill.BackfillConfig{
				AgentName:  adapterName,
				LogPath:    logPath,
				FromDate:   from,
				ToDate:     to,
				DryRun:     dryRun,
				BatchSize:  100,
				ProgressCB: progressFunc,
			}

			result, err := manager.Backfill(ctx, bfConfig)
			if err != nil {
				log.Warnf("Failed to process %s: %v", logPath, err)
				totalResult.ErrorEvents++
				continue
			}

			// Aggregate results
			totalResult.TotalEvents += result.TotalEvents
			totalResult.ProcessedEvents += result.ProcessedEvents
			totalResult.SkippedEvents += result.SkippedEvents
			totalResult.ErrorEvents += result.ErrorEvents
			totalResult.BytesProcessed += result.BytesProcessed
		}

		totalResult.Duration = time.Since(overallStart)

		// Print summary
		fmt.Println("\n\n✓ Backfill completed")
		if len(logPaths) > 1 {
			fmt.Printf("Workspaces processed: %d\n", len(logPaths))
		}
		fmt.Printf("Duration: %s\n", totalResult.Duration)
		fmt.Printf("Events processed: %d\n", totalResult.ProcessedEvents)
		fmt.Printf("Events skipped: %d (duplicates)\n", totalResult.SkippedEvents)
		fmt.Printf("Errors: %d\n", totalResult.ErrorEvents)
		if totalResult.Duration.Seconds() > 0 {
			fmt.Printf("Throughput: %.1f events/sec\n", float64(totalResult.ProcessedEvents)/totalResult.Duration.Seconds())
		}
		fmt.Printf("Data processed: %.2f MB\n", float64(totalResult.BytesProcessed)/(1024*1024))

		return nil
	},
}

var backfillStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Check backfill status",
	RunE: func(cmd *cobra.Command, args []string) error {
		// Load configuration
		var err error
		cfg, err = config.LoadConfig(configPath)
		if err != nil {
			return fmt.Errorf("failed to load configuration: %w", err)
		}

		// Create backfill manager
		backfillConfig := backfill.Config{
			StateDBPath: cfg.Buffer.DBPath,
			Logger:      log,
		}
		manager, err := backfill.NewBackfillManager(backfillConfig)
		if err != nil {
			return fmt.Errorf("failed to create backfill manager: %w", err)
		}
		defer manager.Close()

		// Get agent name
		agentName, _ := cmd.Flags().GetString("agent")
		if agentName == "" {
			agentName = "github-copilot" // Default
		}

		// Get status
		states, err := manager.Status(agentName)
		if err != nil {
			return fmt.Errorf("failed to get status: %w", err)
		}

		if len(states) == 0 {
			fmt.Printf("No backfill history for agent: %s\n", agentName)
			return nil
		}

		// Print status
		fmt.Printf("Backfill status for %s:\n\n", agentName)
		for _, state := range states {
			fmt.Printf("File: %s\n", state.LogFilePath)
			fmt.Printf("  Status: %s\n", state.Status)
			fmt.Printf("  Events processed: %d\n", state.TotalEventsProcessed)
			fmt.Printf("  Byte offset: %d\n", state.LastByteOffset)
			fmt.Printf("  Started: %s\n", state.StartedAt.Format(time.RFC3339))
			if state.CompletedAt != nil {
				fmt.Printf("  Completed: %s\n", state.CompletedAt.Format(time.RFC3339))
			}
			if state.ErrorMessage != "" {
				fmt.Printf("  Error: %s\n", state.ErrorMessage)
			}
			fmt.Println()
		}

		return nil
	},
}

func progressBar(percentage float64) string {
	filled := int(percentage / 5) // 20 chars = 100%
	if filled > 20 {
		filled = 20
	}
	bar := ""
	for i := 0; i < 20; i++ {
		if i < filled {
			bar += "█"
		} else {
			bar += "░"
		}
	}
	return bar
}

func init() {
	// Configure logging
	log.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})
	log.SetLevel(logrus.InfoLevel)

	// Add subcommands
	rootCmd.AddCommand(startCmd)
	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(statusCmd)
	rootCmd.AddCommand(backfillCmd)

	// Add backfill subcommands
	backfillCmd.AddCommand(backfillRunCmd)
	backfillCmd.AddCommand(backfillStatusCmd)

	// Backfill run flags
	backfillRunCmd.Flags().StringP("agent", "a", "copilot", "Agent name (copilot, claude, cursor)")
	backfillRunCmd.Flags().StringP("from", "f", "", "Start date (YYYY-MM-DD)")
	backfillRunCmd.Flags().StringP("to", "t", "", "End date (YYYY-MM-DD)")
	backfillRunCmd.Flags().IntP("days", "d", 0, "Backfill last N days (alternative to from/to)")
	backfillRunCmd.Flags().Bool("dry-run", false, "Preview without processing")
	backfillRunCmd.Flags().Bool("all-workspaces", false, "Process all discovered workspaces")
	backfillRunCmd.Flags().StringSlice("workspaces", []string{}, "Specific workspace IDs to process (comma-separated)")

	// Backfill status flags
	backfillStatusCmd.Flags().StringP("agent", "a", "", "Agent name to check")

	// Global flags
	rootCmd.PersistentFlags().StringVarP(&configPath, "config", "c",
		"~/.devlog/collector.json", "Path to configuration file")
	rootCmd.PersistentFlags().BoolP("verbose", "v", false, "Enable verbose logging")
}
