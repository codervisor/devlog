package hierarchy

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNormalizeGitURL(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "SSH format",
			input:    "git@github.com:codervisor/devlog.git",
			expected: "https://github.com/codervisor/devlog",
		},
		{
			name:     "HTTPS with .git",
			input:    "https://github.com/codervisor/devlog.git",
			expected: "https://github.com/codervisor/devlog",
		},
		{
			name:     "HTTPS without .git",
			input:    "https://github.com/codervisor/devlog",
			expected: "https://github.com/codervisor/devlog",
		},
		{
			name:     "HTTP format",
			input:    "http://github.com/codervisor/devlog.git",
			expected: "http://github.com/codervisor/devlog",
		},
		{
			name:     "Without protocol",
			input:    "github.com/codervisor/devlog",
			expected: "https://github.com/codervisor/devlog",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := normalizeGitURL(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGetGitInfo(t *testing.T) {
	// This test requires a real Git repository
	// For now, we'll test with the current repository if it exists
	
	// Try to get Git info from the project root
	// This will only work if running from within the Git repo
	info, err := GetGitInfo("../../..")
	if err != nil {
		// If not in a Git repo, skip this test
		t.Skip("Not in a Git repository, skipping test")
		return
	}

	// Verify the structure is populated
	assert.NotEmpty(t, info.RemoteURL, "RemoteURL should not be empty")
	assert.NotEmpty(t, info.Branch, "Branch should not be empty")
	assert.NotEmpty(t, info.Commit, "Commit should not be empty")
	
	// Verify URL normalization
	assert.Contains(t, info.RemoteURL, "http", "URL should be normalized to HTTP(S)")
}
