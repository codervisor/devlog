package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
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
	Long: `Start the collector daemon to monitor AI agent logs.

By default, the collector will sync historical data before starting real-time
watching. Use --no-history to skip historical sync (for power users).`,
	RunE: func(cmd *cobra.Command, args []string) error {
		log.Info("Starting Devlog Collector...")
		log.Infof("Version: %s", version)

		// Parse flags
		skipHistory, _ := cmd.Flags().GetBool("no-history")
		initialSyncDays, _ := cmd.Flags().GetInt("initial-sync-days")

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

		// Create context for graceful shutdown
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		// Sync historical data before starting watcher (unless --no-history)
		if !skipHistory {
			log.Info("Syncing historical data...")

			// Initialize hierarchy cache with client for backfill
			hierarchyCacheWithClient := hierarchy.NewHierarchyCache(apiClient, log)
			backfillRegistry := adapters.DefaultRegistry(cfg.ProjectID, hierarchyCacheWithClient, log)

			// Create backfill manager
			backfillConfig := backfill.Config{
				Registry:    backfillRegistry,
				Buffer:      buf,
				Client:      apiClient,
				StateDBPath: cfg.Buffer.DBPath,
				Logger:      log,
			}
			manager, err := backfill.NewBackfillManager(backfillConfig)
			if err != nil {
				log.Warnf("Failed to create backfill manager, skipping historical sync: %v", err)
			} else {
				defer manager.Close()

				// Calculate date range for initial sync
				fromDate := time.Now().AddDate(0, 0, -initialSyncDays)
				toDate := time.Now()

				totalSynced := 0
				totalSkipped := 0
				totalSources := 0
				currentSource := 0

				// Count total sources first
				for _, logs := range discovered {
					totalSources += len(logs)
				}

				syncStartTime := time.Now()

				for agentName, logs := range discovered {
					adapterName := mapAgentName(agentName)

					for _, logInfo := range logs {
						currentSource++
						// Show progress
						fmt.Printf("\r🔄 Syncing [%d/%d]: %s...", currentSource, totalSources, filepath.Base(filepath.Dir(logInfo.Path)))

						bfConfig := backfill.BackfillConfig{
							AgentName: adapterName,
							LogPath:   logInfo.Path,
							FromDate:  fromDate,
							ToDate:    toDate,
							BatchSize: 100,
						}

						result, err := manager.Backfill(ctx, bfConfig)
						if err != nil {
							log.Warnf("Failed to sync historical data for %s: %v", logInfo.Path, err)
							continue
						}

						totalSynced += result.ProcessedEvents
						totalSkipped += result.SkippedEvents
					}
				}

				syncDuration := time.Since(syncStartTime)
				fmt.Println() // New line after progress
				log.Infof("✅ Historical sync complete in %s: %d events synced, %d skipped (already synced)", 
					syncDuration.Round(time.Millisecond), totalSynced, totalSkipped)
			}
		} else {
			log.Info("Skipping historical sync (--no-history flag)")
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

			// Also watch parent directories for new workspace detection
			var parentPaths []string
			for _, logInfo := range logs {
				parentPaths = append(parentPaths, logInfo.Path)
			}
			if err := fileWatcher.WatchParentDirs(parentPaths, adapterInstance); err != nil {
				log.Warnf("Failed to watch parent dirs for %s: %v", agentName, err)
			}
		}

		// Start dynamic workspace discovery (check every 60 seconds for new workspaces)
		fileWatcher.StartDynamicDiscovery(60*time.Second, func(path string, adapter adapters.AgentAdapter) {
			log.Infof("New workspace discovered: %s", path)
			if err := fileWatcher.Watch(path, adapter); err != nil {
				log.Warnf("Failed to watch new workspace %s: %v", path, err)
			}
		})

		// Process events from watcher to client
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
	Short: "Check collector status and sync state",
	Long: `Display the current status of the collector, including:
- Configuration status
- Backend connectivity
- Sync state for all discovered agents
- Buffer state (pending events)`,
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Println("📊 Devlog Collector Status")
		fmt.Println("==========================")
		fmt.Println()

		// Load configuration
		cfg, err := config.LoadConfig(configPath)
		if err != nil {
			fmt.Printf("⚠️  Configuration: Failed to load (%v)\n", err)
		} else {
			fmt.Printf("✅ Configuration: Loaded from %s\n", configPath)
			fmt.Printf("   Backend URL: %s\n", cfg.BackendURL)
			fmt.Printf("   Project ID: %s\n", cfg.ProjectID)
		}
		fmt.Println()

		// Check backend connectivity
		if cfg != nil {
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
			if err := apiClient.HealthCheck(); err != nil {
				fmt.Printf("❌ Backend: Unreachable (%v)\n", err)
			} else {
				fmt.Printf("✅ Backend: Connected\n")
			}
		}
		fmt.Println()

		// Check buffer state
		if cfg != nil {
			bufferConfig := buffer.Config{
				DBPath:  cfg.Buffer.DBPath,
				MaxSize: cfg.Buffer.MaxSize,
				Logger:  log,
			}
			buf, err := buffer.NewBuffer(bufferConfig)
			if err == nil {
				defer buf.Close()
				count, _ := buf.Count()
				if count > 0 {
					fmt.Printf("📦 Buffer: %d events pending\n", count)
				} else {
					fmt.Printf("📦 Buffer: Empty (all events synced)\n")
				}
			}
		}
		fmt.Println()

		// Discover all agent logs and show sync status
		fmt.Println("🤖 Agents:")
		discovered, err := watcher.DiscoverAllAgentLogs()
		if err != nil {
			fmt.Printf("   ⚠️  Failed to discover agents: %v\n", err)
			return nil
		}

		if len(discovered) == 0 {
			fmt.Println("   No agent logs discovered")
			return nil
		}

		// Get sync state from backfill manager
		var manager *backfill.BackfillManager
		if cfg != nil {
			backfillConfig := backfill.Config{
				StateDBPath: cfg.Buffer.DBPath,
				Logger:      log,
			}
			manager, err = backfill.NewBackfillManager(backfillConfig)
			if err != nil {
				log.Debugf("Failed to create backfill manager: %v", err)
			} else {
				defer manager.Close()
			}
		}

		for agentName, logs := range discovered {
			adapterName := mapAgentName(agentName)
			fmt.Printf("\n   %s (%d log sources)\n", agentName, len(logs))

			if manager == nil {
				for _, logInfo := range logs {
					fmt.Printf("      📁 %s\n", logInfo.Path)
				}
				continue
			}

			states, err := manager.Status(adapterName)
			if err != nil {
				continue
			}

			stateMap := make(map[string]*backfill.BackfillState)
			for _, state := range states {
				stateMap[state.LogFilePath] = state
			}

			for _, logInfo := range logs {
				state, exists := stateMap[logInfo.Path]
				if !exists {
					fmt.Printf("      📁 %s - ⏳ pending\n", filepath.Base(filepath.Dir(logInfo.Path)))
					continue
				}

				switch state.Status {
				case backfill.StatusCompleted:
					fmt.Printf("      📁 %s - ✅ synced (%d events)\n", 
						filepath.Base(filepath.Dir(logInfo.Path)), state.TotalEventsProcessed)
				case backfill.StatusInProgress:
					fmt.Printf("      📁 %s - 🔄 syncing (%d events)\n", 
						filepath.Base(filepath.Dir(logInfo.Path)), state.TotalEventsProcessed)
				case backfill.StatusFailed:
					fmt.Printf("      📁 %s - ❌ failed: %s\n", 
						filepath.Base(filepath.Dir(logInfo.Path)), state.ErrorMessage)
				default:
					fmt.Printf("      📁 %s - ⏳ pending\n", filepath.Base(filepath.Dir(logInfo.Path)))
				}
			}
		}

		fmt.Println()
		fmt.Println("💡 Tip: Run 'devlog-collector start' to begin collecting events")

		return nil
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
	Short: "Run backfill operation (deprecated)",
	Long: `Process historical logs for the specified agent and date range.

DEPRECATED: The 'start' command now automatically syncs historical data.
Use 'devlog-collector start' instead. To skip historical sync, use 'start --no-history'.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Show deprecation warning
		fmt.Println("⚠️  DEPRECATED: The 'backfill run' command is deprecated.")
		fmt.Println("   The 'start' command now automatically syncs historical data.")
		fmt.Println("   Use 'devlog-collector start' for automatic sync,")
		fmt.Println("   or 'devlog-collector start --no-history' to skip historical sync.")
		fmt.Println()

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

var syncCmd = &cobra.Command{
	Use:   "sync",
	Short: "Manage sync state",
	Long:  "View and manage the synchronization state of agent logs",
}

var syncStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Check sync status for all agents",
	Long:  "Display the synchronization status for all discovered agent logs",
	RunE: func(cmd *cobra.Command, args []string) error {
		// Load configuration
		var err error
		cfg, err = config.LoadConfig(configPath)
		if err != nil {
			return fmt.Errorf("failed to load configuration: %w", err)
		}

		// Create backfill manager (uses same state store)
		backfillConfig := backfill.Config{
			StateDBPath: cfg.Buffer.DBPath,
			Logger:      log,
		}
		manager, err := backfill.NewBackfillManager(backfillConfig)
		if err != nil {
			return fmt.Errorf("failed to create sync manager: %w", err)
		}
		defer manager.Close()

		// Get agent filter
		agentFilter, _ := cmd.Flags().GetString("agent")

		// Discover all agent logs
		discovered, err := watcher.DiscoverAllAgentLogs()
		if err != nil {
			return fmt.Errorf("failed to discover logs: %w", err)
		}

		fmt.Println("📊 Sync Status")
		fmt.Println("==============")
		fmt.Println()

		totalSynced := 0
		totalPending := 0
		totalInProgress := 0

		for agentName, logs := range discovered {
			adapterName := mapAgentName(agentName)

			// Filter by agent if specified
			if agentFilter != "" && agentFilter != agentName && agentFilter != adapterName {
				continue
			}

			fmt.Printf("🤖 %s (%d log sources)\n", agentName, len(logs))

			states, err := manager.Status(adapterName)
			if err != nil {
				fmt.Printf("   ❌ Error getting status: %v\n", err)
				continue
			}

			// Create a map for quick lookup
			stateMap := make(map[string]*backfill.BackfillState)
			for _, state := range states {
				stateMap[state.LogFilePath] = state
			}

			for _, logInfo := range logs {
				state, exists := stateMap[logInfo.Path]
				if !exists {
					fmt.Printf("   📁 %s\n", logInfo.Path)
					fmt.Printf("      Status: ⏳ pending (not yet synced)\n")
					totalPending++
					continue
				}

				fmt.Printf("   📁 %s\n", logInfo.Path)
				switch state.Status {
				case backfill.StatusCompleted:
					fmt.Printf("      Status: ✅ synced (%d events)\n", state.TotalEventsProcessed)
					if state.CompletedAt != nil {
						fmt.Printf("      Last sync: %s\n", state.CompletedAt.Format(time.RFC3339))
					}
					totalSynced++
				case backfill.StatusInProgress:
					fmt.Printf("      Status: 🔄 syncing (%d events so far)\n", state.TotalEventsProcessed)
					totalInProgress++
				case backfill.StatusPaused:
					fmt.Printf("      Status: ⏸️  paused (%d events)\n", state.TotalEventsProcessed)
					totalPending++
				case backfill.StatusFailed:
					fmt.Printf("      Status: ❌ failed: %s\n", state.ErrorMessage)
					totalPending++
				default:
					fmt.Printf("      Status: ⏳ pending\n")
					totalPending++
				}
			}
			fmt.Println()
		}

		fmt.Println("Summary:")
		fmt.Printf("  ✅ Synced:      %d\n", totalSynced)
		fmt.Printf("  🔄 In progress: %d\n", totalInProgress)
		fmt.Printf("  ⏳ Pending:     %d\n", totalPending)

		return nil
	},
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
	rootCmd.AddCommand(syncCmd)

	// Add backfill subcommands
	backfillCmd.AddCommand(backfillRunCmd)
	backfillCmd.AddCommand(backfillStatusCmd)

	// Add sync subcommands
	syncCmd.AddCommand(syncStatusCmd)

	// Start command flags
	startCmd.Flags().Bool("no-history", false, "Skip historical sync (only watch for new events)")
	startCmd.Flags().Int("initial-sync-days", 90, "Number of days to sync on first run")

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

	// Sync status flags
	syncStatusCmd.Flags().StringP("agent", "a", "", "Filter by agent name")

	// Global flags
	rootCmd.PersistentFlags().StringVarP(&configPath, "config", "c",
		"~/.devlog/collector.json", "Path to configuration file")
	rootCmd.PersistentFlags().BoolP("verbose", "v", false, "Enable verbose logging")
}
