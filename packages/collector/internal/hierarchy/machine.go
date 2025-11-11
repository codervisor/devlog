package hierarchy

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"os/user"
	"runtime"
	"strings"

	"github.com/codervisor/devlog/collector/pkg/models"
	"github.com/sirupsen/logrus"
)

// MachineDetector handles machine detection
type MachineDetector struct {
	log *logrus.Logger
}

// NewMachineDetector creates a new machine detector
func NewMachineDetector(log *logrus.Logger) *MachineDetector {
	if log == nil {
		log = logrus.New()
	}
	return &MachineDetector{
		log: log,
	}
}

// Detect detects the current machine information
func (md *MachineDetector) Detect() (*models.Machine, error) {
	// Get system info
	hostname, err := os.Hostname()
	if err != nil {
		return nil, fmt.Errorf("failed to get hostname: %w", err)
	}

	currentUser, err := user.Current()
	if err != nil {
		return nil, fmt.Errorf("failed to get current user: %w", err)
	}

	username := currentUser.Username
	osType := runtime.GOOS
	osVersion := detectOSVersion()
	machineType := detectMachineType()

	// Generate unique machine ID
	machineID := generateMachineID(hostname, username, osType)

	machine := &models.Machine{
		MachineID:   machineID,
		Hostname:    hostname,
		Username:    username,
		OSType:      osType,
		OSVersion:   osVersion,
		MachineType: machineType,
		Metadata:    make(map[string]interface{}),
	}

	// Add additional metadata
	machine.Metadata["arch"] = runtime.GOARCH
	machine.Metadata["numCPU"] = runtime.NumCPU()

	md.log.WithFields(logrus.Fields{
		"machineId":   machine.MachineID,
		"hostname":    machine.Hostname,
		"username":    machine.Username,
		"osType":      machine.OSType,
		"machineType": machine.MachineType,
	}).Info("Machine detected")

	return machine, nil
}

// generateMachineID creates a unique, stable machine identifier
func generateMachineID(hostname, username, osType string) string {
	// Create a stable hash of machine-specific information
	data := fmt.Sprintf("%s-%s-%s", hostname, username, osType)
	hash := sha256.Sum256([]byte(data))
	hashStr := hex.EncodeToString(hash[:])
	
	// Use first 16 chars of hash plus descriptive suffix
	shortHash := hashStr[:16]
	suffix := fmt.Sprintf("%s-%s", strings.ToLower(hostname), osType)
	
	// Sanitize suffix (remove special characters)
	suffix = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		return '-'
	}, suffix)
	
	return fmt.Sprintf("%s-%s", shortHash, suffix)
}

// detectMachineType determines the type of machine
func detectMachineType() string {
	// Check for CI environments
	if isGitHubActions() {
		return "ci"
	}
	
	// Check for cloud development environments
	if isCodespace() || isGitpod() {
		return "cloud"
	}
	
	// Check for SSH connection
	if isSSH() {
		return "remote"
	}
	
	// Default to local
	return "local"
}

// isGitHubActions checks if running in GitHub Actions
func isGitHubActions() bool {
	return os.Getenv("GITHUB_ACTIONS") == "true"
}

// isCodespace checks if running in GitHub Codespaces
func isCodespace() bool {
	return os.Getenv("CODESPACES") == "true"
}

// isGitpod checks if running in Gitpod
func isGitpod() bool {
	return os.Getenv("GITPOD_WORKSPACE_ID") != ""
}

// isSSH checks if connected via SSH
func isSSH() bool {
	return os.Getenv("SSH_CONNECTION") != "" || os.Getenv("SSH_CLIENT") != ""
}
