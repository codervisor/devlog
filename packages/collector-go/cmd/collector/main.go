package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/codervisor/devlog/collector/internal/adapters"
	"github.com/codervisor/devlog/collector/internal/buffer"
	"github.com/codervisor/devlog/collector/internal/client"
	"github.com/codervisor/devlog/collector/internal/config"
	"github.com/codervisor/devlog/collector/internal/watcher"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

var (
	version    = "1.0.0"
	log        = logrus.New()
	configPath string
	cfg        *config.Config
)

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

		// Initialize adapter registry
		registry := adapters.DefaultRegistry(cfg.ProjectID)
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
			adapterInstance, err := registry.Get(agentName)
			if err != nil {
				log.Warnf("No adapter for %s, skipping", agentName)
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

	// Global flags
	rootCmd.PersistentFlags().StringVarP(&configPath, "config", "c",
		"~/.devlog/collector.json", "Path to configuration file")
	rootCmd.PersistentFlags().BoolP("verbose", "v", false, "Enable verbose logging")
}
