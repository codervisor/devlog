package main

import (
	"fmt"
	"os"

	"github.com/codervisor/devlog/collector/internal/config"
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

		// TODO: Initialize components
		// TODO: Start watching logs
		// TODO: Handle graceful shutdown

		log.Info("Collector started successfully")
		log.Warn("Press Ctrl+C to stop (TODO: implement graceful shutdown)")

		// Keep the process running
		select {}
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
