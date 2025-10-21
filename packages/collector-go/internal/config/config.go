package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// Config represents the collector configuration
type Config struct {
	Version    string                 `json:"version"`
	BackendURL string                 `json:"backendUrl"`
	APIKey     string                 `json:"apiKey"`
	ProjectID  string                 `json:"projectId"`
	Collection CollectionConfig       `json:"collection"`
	Buffer     BufferConfig           `json:"buffer"`
	Agents     map[string]AgentConfig `json:"agents"`
	Logging    LoggingConfig          `json:"logging"`
}

// CollectionConfig configures event collection behavior
type CollectionConfig struct {
	BatchSize     int    `json:"batchSize"`
	BatchInterval string `json:"batchInterval"`
	MaxRetries    int    `json:"maxRetries"`
	RetryBackoff  string `json:"retryBackoff"`
}

// BufferConfig configures the local SQLite buffer
type BufferConfig struct {
	Enabled bool   `json:"enabled"`
	MaxSize int    `json:"maxSize"`
	DBPath  string `json:"dbPath"`
}

// AgentConfig configures a specific agent
type AgentConfig struct {
	Enabled bool   `json:"enabled"`
	LogPath string `json:"logPath"`
}

// LoggingConfig configures logging
type LoggingConfig struct {
	Level string `json:"level"`
	File  string `json:"file"`
}

// DefaultConfig returns configuration with sensible defaults
func DefaultConfig() *Config {
	homeDir, _ := os.UserHomeDir()
	devlogDir := filepath.Join(homeDir, ".devlog")

	return &Config{
		Version:    "1.0",
		BackendURL: "http://localhost:3200",
		ProjectID:  "default",
		Collection: CollectionConfig{
			BatchSize:     100,
			BatchInterval: "5s",
			MaxRetries:    3,
			RetryBackoff:  "exponential",
		},
		Buffer: BufferConfig{
			Enabled: true,
			MaxSize: 10000,
			DBPath:  filepath.Join(devlogDir, "buffer.db"),
		},
		Agents: map[string]AgentConfig{
			"copilot": {Enabled: true, LogPath: "auto"},
			"claude":  {Enabled: true, LogPath: "auto"},
			"cursor":  {Enabled: true, LogPath: "auto"},
		},
		Logging: LoggingConfig{
			Level: "info",
			File:  filepath.Join(devlogDir, "collector.log"),
		},
	}
}

// LoadConfig loads configuration from the specified path
func LoadConfig(path string) (*Config, error) {
	// Expand path
	path = expandPath(path)

	// Start with defaults
	config := DefaultConfig()

	// Check if file exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		// Return defaults if file doesn't exist
		return config, nil
	}

	// Read file
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	// Parse JSON
	if err := json.Unmarshal(data, config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	// Expand environment variables
	if err := expandEnvVars(config); err != nil {
		return nil, fmt.Errorf("failed to expand environment variables: %w", err)
	}

	// Validate configuration
	if err := ValidateConfig(config); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return config, nil
}

// SaveConfig saves configuration to the specified path
func SaveConfig(config *Config, path string) error {
	path = expandPath(path)

	// Create directory if needed
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	// Marshal to JSON
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	// Write file
	if err := os.WriteFile(path, data, 0600); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// ValidateConfig validates the configuration
func ValidateConfig(config *Config) error {
	if config.Version == "" {
		return fmt.Errorf("version is required")
	}

	if config.BackendURL == "" {
		return fmt.Errorf("backendUrl is required")
	}

	if !strings.HasPrefix(config.BackendURL, "http://") && !strings.HasPrefix(config.BackendURL, "https://") {
		return fmt.Errorf("backendUrl must start with http:// or https://")
	}

	if config.APIKey == "" {
		return fmt.Errorf("apiKey is required")
	}

	if config.ProjectID == "" {
		return fmt.Errorf("projectId is required")
	}

	if config.Collection.BatchSize < 1 || config.Collection.BatchSize > 1000 {
		return fmt.Errorf("collection.batchSize must be between 1 and 1000")
	}

	if _, err := time.ParseDuration(config.Collection.BatchInterval); err != nil {
		return fmt.Errorf("collection.batchInterval is invalid: %w", err)
	}

	if config.Collection.MaxRetries < 0 || config.Collection.MaxRetries > 10 {
		return fmt.Errorf("collection.maxRetries must be between 0 and 10")
	}

	if config.Buffer.MaxSize < 100 || config.Buffer.MaxSize > 100000 {
		return fmt.Errorf("buffer.maxSize must be between 100 and 100000")
	}

	validLogLevels := map[string]bool{
		"debug": true, "info": true, "warn": true, "error": true,
	}
	if !validLogLevels[config.Logging.Level] {
		return fmt.Errorf("logging.level must be one of: debug, info, warn, error")
	}

	return nil
}

// expandPath expands ~ and environment variables in a path
func expandPath(path string) string {
	// Expand ~
	if strings.HasPrefix(path, "~/") {
		homeDir, err := os.UserHomeDir()
		if err == nil {
			path = filepath.Join(homeDir, path[2:])
		}
	}

	// Expand environment variables
	path = os.ExpandEnv(path)

	return path
}

// expandEnvVars expands ${VAR} style environment variables in config
func expandEnvVars(config *Config) error {
	envVarPattern := regexp.MustCompile(`\$\{([^}]+)\}`)

	expandString := func(s string) string {
		return envVarPattern.ReplaceAllStringFunc(s, func(match string) string {
			varName := match[2 : len(match)-1] // Remove ${ and }
			if value := os.Getenv(varName); value != "" {
				return value
			}
			return match // Keep original if env var not found
		})
	}

	config.BackendURL = expandString(config.BackendURL)
	config.APIKey = expandString(config.APIKey)
	config.ProjectID = expandString(config.ProjectID)
	config.Buffer.DBPath = expandPath(config.Buffer.DBPath)
	config.Logging.File = expandPath(config.Logging.File)

	return nil
}

// GetBatchInterval returns the batch interval as a time.Duration
func (c *Config) GetBatchInterval() (time.Duration, error) {
	return time.ParseDuration(c.Collection.BatchInterval)
}
