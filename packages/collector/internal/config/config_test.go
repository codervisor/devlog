package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultConfig(t *testing.T) {
	config := DefaultConfig()

	if config.Version != "1.0" {
		t.Errorf("Expected version 1.0, got %s", config.Version)
	}

	if config.Collection.BatchSize != 100 {
		t.Errorf("Expected batch size 100, got %d", config.Collection.BatchSize)
	}

	if config.Collection.BatchInterval != "5s" {
		t.Errorf("Expected batch interval 5s, got %s", config.Collection.BatchInterval)
	}

	if !config.Buffer.Enabled {
		t.Error("Expected buffer to be enabled by default")
	}

	if !config.Agents["copilot"].Enabled {
		t.Error("Expected copilot agent to be enabled by default")
	}
}

func TestValidateConfig(t *testing.T) {
	validConfig := DefaultConfig()
	validConfig.APIKey = "test-api-key"

	tests := []struct {
		name      string
		config    *Config
		expectErr bool
	}{
		{
			name:      "Valid config",
			config:    validConfig,
			expectErr: false,
		},
		{
			name: "Missing version",
			config: &Config{
				BackendURL: "http://localhost:3200",
				APIKey:     "test-key",
				ProjectID:  "test",
			},
			expectErr: true,
		},
		{
			name: "Invalid backend URL",
			config: &Config{
				Version:    "1.0",
				BackendURL: "invalid-url",
				APIKey:     "test-key",
				ProjectID:  "test",
			},
			expectErr: true,
		},
		{
			name: "Missing API key",
			config: &Config{
				Version:    "1.0",
				BackendURL: "http://localhost:3200",
				ProjectID:  "test",
			},
			expectErr: true,
		},
		{
			name: "Invalid batch size",
			config: &Config{
				Version:    "1.0",
				BackendURL: "http://localhost:3200",
				APIKey:     "test-key",
				ProjectID:  "test",
				Collection: CollectionConfig{
					BatchSize:     0,
					BatchInterval: "5s",
					MaxRetries:    3,
				},
			},
			expectErr: true,
		},
		{
			name: "Invalid batch interval",
			config: &Config{
				Version:    "1.0",
				BackendURL: "http://localhost:3200",
				APIKey:     "test-key",
				ProjectID:  "test",
				Collection: CollectionConfig{
					BatchSize:     100,
					BatchInterval: "invalid",
					MaxRetries:    3,
				},
			},
			expectErr: true,
		},
		{
			name: "Invalid log level",
			config: &Config{
				Version:    "1.0",
				BackendURL: "http://localhost:3200",
				APIKey:     "test-key",
				ProjectID:  "test",
				Collection: CollectionConfig{
					BatchSize:     100,
					BatchInterval: "5s",
					MaxRetries:    3,
				},
				Buffer: BufferConfig{
					Enabled: true,
					MaxSize: 1000,
				},
				Logging: LoggingConfig{
					Level: "invalid",
				},
			},
			expectErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateConfig(tt.config)
			if tt.expectErr && err == nil {
				t.Error("Expected error but got none")
			}
			if !tt.expectErr && err != nil {
				t.Errorf("Expected no error but got: %v", err)
			}
		})
	}
}

func TestExpandPath(t *testing.T) {
	homeDir, _ := os.UserHomeDir()

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Home directory expansion",
			input:    "~/.devlog/config.json",
			expected: filepath.Join(homeDir, ".devlog/config.json"),
		},
		{
			name:     "No expansion needed",
			input:    "/etc/devlog/config.json",
			expected: "/etc/devlog/config.json",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := expandPath(tt.input)
			if result != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, result)
			}
		})
	}
}

func TestExpandEnvVars(t *testing.T) {
	// Set test environment variables
	os.Setenv("TEST_API_KEY", "secret-key")
	os.Setenv("TEST_PROJECT", "my-project")
	defer func() {
		os.Unsetenv("TEST_API_KEY")
		os.Unsetenv("TEST_PROJECT")
	}()

	config := &Config{
		APIKey:    "${TEST_API_KEY}",
		ProjectID: "${TEST_PROJECT}",
	}

	err := expandEnvVars(config)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if config.APIKey != "secret-key" {
		t.Errorf("Expected API key 'secret-key', got '%s'", config.APIKey)
	}

	if config.ProjectID != "my-project" {
		t.Errorf("Expected project ID 'my-project', got '%s'", config.ProjectID)
	}
}

func TestLoadConfig(t *testing.T) {
	// Create temporary config file
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "config.json")

	configJSON := `{
		"version": "1.0",
		"backendUrl": "http://localhost:3200",
		"apiKey": "test-key",
		"projectId": "test-project",
		"collection": {
			"batchSize": 50,
			"batchInterval": "10s",
			"maxRetries": 5,
			"retryBackoff": "exponential"
		},
		"buffer": {
			"enabled": true,
			"maxSize": 5000,
			"dbPath": "~/test-buffer.db"
		},
		"agents": {
			"copilot": {
				"enabled": true,
				"logPath": "auto"
			}
		},
		"logging": {
			"level": "debug",
			"file": "~/test.log"
		}
	}`

	if err := os.WriteFile(configPath, []byte(configJSON), 0600); err != nil {
		t.Fatalf("Failed to create test config: %v", err)
	}

	// Load config
	config, err := LoadConfig(configPath)
	if err != nil {
		t.Fatalf("Failed to load config: %v", err)
	}

	// Verify values
	if config.Version != "1.0" {
		t.Errorf("Expected version 1.0, got %s", config.Version)
	}

	if config.Collection.BatchSize != 50 {
		t.Errorf("Expected batch size 50, got %d", config.Collection.BatchSize)
	}

	if config.Logging.Level != "debug" {
		t.Errorf("Expected log level debug, got %s", config.Logging.Level)
	}
}

func TestSaveConfig(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "config.json")

	config := DefaultConfig()
	config.APIKey = "test-key"

	// Save config
	if err := SaveConfig(config, configPath); err != nil {
		t.Fatalf("Failed to save config: %v", err)
	}

	// Verify file exists
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		t.Fatal("Config file was not created")
	}

	// Load and verify
	loadedConfig, err := LoadConfig(configPath)
	if err != nil {
		t.Fatalf("Failed to load saved config: %v", err)
	}

	if loadedConfig.APIKey != "test-key" {
		t.Errorf("Expected API key 'test-key', got '%s'", loadedConfig.APIKey)
	}
}

func TestGetBatchInterval(t *testing.T) {
	config := &Config{
		Collection: CollectionConfig{
			BatchInterval: "5s",
		},
	}

	duration, err := config.GetBatchInterval()
	if err != nil {
		t.Fatalf("Failed to get batch interval: %v", err)
	}

	if duration.Seconds() != 5.0 {
		t.Errorf("Expected 5 seconds, got %v", duration)
	}
}
