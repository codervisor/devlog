package hierarchy

import (
	"os"
	"runtime"
	"testing"

	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMachineDetector_Detect(t *testing.T) {
	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel) // Reduce noise in tests
	
	detector := NewMachineDetector(log)
	
	machine, err := detector.Detect()
	require.NoError(t, err)
	require.NotNil(t, machine)
	
	// Verify required fields are set
	assert.NotEmpty(t, machine.MachineID, "MachineID should not be empty")
	assert.NotEmpty(t, machine.Hostname, "Hostname should not be empty")
	assert.NotEmpty(t, machine.Username, "Username should not be empty")
	assert.NotEmpty(t, machine.OSType, "OSType should not be empty")
	assert.NotEmpty(t, machine.MachineType, "MachineType should not be empty")
	
	// Verify OSType matches runtime
	assert.Equal(t, runtime.GOOS, machine.OSType)
	
	// Verify MachineType is valid
	validTypes := []string{"local", "remote", "cloud", "ci"}
	assert.Contains(t, validTypes, machine.MachineType)
	
	// Verify metadata is present
	assert.NotNil(t, machine.Metadata)
	assert.Contains(t, machine.Metadata, "arch")
	assert.Contains(t, machine.Metadata, "numCPU")
}

func TestGenerateMachineID(t *testing.T) {
	tests := []struct {
		name     string
		hostname string
		username string
		osType   string
		wantLen  int
	}{
		{
			name:     "standard case",
			hostname: "test-machine",
			username: "testuser",
			osType:   "linux",
			wantLen:  16 + 1 + len("test-machine-linux"), // hash + dash + suffix
		},
		{
			name:     "special characters in hostname",
			hostname: "test@machine#123",
			username: "user",
			osType:   "darwin",
			wantLen:  16 + 1 + len("test-machine-123-darwin"), // sanitized
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			id1 := generateMachineID(tt.hostname, tt.username, tt.osType)
			id2 := generateMachineID(tt.hostname, tt.username, tt.osType)
			
			// Should be stable (same input = same output)
			assert.Equal(t, id1, id2)
			
			// Should not be empty
			assert.NotEmpty(t, id1)
			
			// Should start with 16-char hash
			assert.GreaterOrEqual(t, len(id1), 16)
		})
	}
}

func TestDetectMachineType(t *testing.T) {
	// Test local (default)
	machineType := detectMachineType()
	assert.NotEmpty(t, machineType)
	
	// Test GitHub Actions
	t.Run("GitHub Actions", func(t *testing.T) {
		os.Setenv("GITHUB_ACTIONS", "true")
		defer os.Unsetenv("GITHUB_ACTIONS")
		
		assert.Equal(t, "ci", detectMachineType())
	})
	
	// Test Codespaces
	t.Run("Codespaces", func(t *testing.T) {
		os.Setenv("CODESPACES", "true")
		defer os.Unsetenv("CODESPACES")
		
		assert.Equal(t, "cloud", detectMachineType())
	})
	
	// Test Gitpod
	t.Run("Gitpod", func(t *testing.T) {
		os.Setenv("GITPOD_WORKSPACE_ID", "test-workspace")
		defer os.Unsetenv("GITPOD_WORKSPACE_ID")
		
		assert.Equal(t, "cloud", detectMachineType())
	})
	
	// Test SSH
	t.Run("SSH", func(t *testing.T) {
		os.Setenv("SSH_CONNECTION", "192.168.1.1")
		defer os.Unsetenv("SSH_CONNECTION")
		
		assert.Equal(t, "remote", detectMachineType())
	})
}

func TestIsGitHubActions(t *testing.T) {
	// Clean state
	os.Unsetenv("GITHUB_ACTIONS")
	assert.False(t, isGitHubActions())
	
	// Set environment
	os.Setenv("GITHUB_ACTIONS", "true")
	defer os.Unsetenv("GITHUB_ACTIONS")
	assert.True(t, isGitHubActions())
}

func TestIsCodespace(t *testing.T) {
	// Clean state
	os.Unsetenv("CODESPACES")
	assert.False(t, isCodespace())
	
	// Set environment
	os.Setenv("CODESPACES", "true")
	defer os.Unsetenv("CODESPACES")
	assert.True(t, isCodespace())
}

func TestIsGitpod(t *testing.T) {
	// Clean state
	os.Unsetenv("GITPOD_WORKSPACE_ID")
	assert.False(t, isGitpod())
	
	// Set environment
	os.Setenv("GITPOD_WORKSPACE_ID", "test-workspace")
	defer os.Unsetenv("GITPOD_WORKSPACE_ID")
	assert.True(t, isGitpod())
}

func TestIsSSH(t *testing.T) {
	// Clean state
	os.Unsetenv("SSH_CONNECTION")
	os.Unsetenv("SSH_CLIENT")
	assert.False(t, isSSH())
	
	// Test SSH_CONNECTION
	os.Setenv("SSH_CONNECTION", "192.168.1.1")
	assert.True(t, isSSH())
	os.Unsetenv("SSH_CONNECTION")
	
	// Test SSH_CLIENT
	os.Setenv("SSH_CLIENT", "192.168.1.1")
	assert.True(t, isSSH())
	os.Unsetenv("SSH_CLIENT")
}
