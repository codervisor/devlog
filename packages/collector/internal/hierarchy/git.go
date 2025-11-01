package hierarchy

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/go-git/go-git/v5"
)

// GitInfo contains Git repository information
type GitInfo struct {
	RemoteURL string
	Branch    string
	Commit    string
}

// GetGitInfo extracts Git information from a directory
func GetGitInfo(path string) (*GitInfo, error) {
	// Open the repository
	repo, err := git.PlainOpen(path)
	if err != nil {
		return nil, fmt.Errorf("failed to open git repository: %w", err)
	}

	// Get remote URL
	remote, err := repo.Remote("origin")
	if err != nil {
		return nil, fmt.Errorf("failed to get origin remote: %w", err)
	}

	if len(remote.Config().URLs) == 0 {
		return nil, fmt.Errorf("no remote URL configured")
	}

	remoteURL := remote.Config().URLs[0]

	// Get current branch
	head, err := repo.Head()
	if err != nil {
		return nil, fmt.Errorf("failed to get HEAD: %w", err)
	}

	branch := head.Name().Short()

	// Get current commit
	commit := head.Hash().String()

	return &GitInfo{
		RemoteURL: normalizeGitURL(remoteURL),
		Branch:    branch,
		Commit:    commit,
	}, nil
}

// normalizeGitURL normalizes Git URLs to a consistent format
func normalizeGitURL(url string) string {
	// Convert SSH URLs to HTTPS format for consistency
	// git@github.com:owner/repo.git -> https://github.com/owner/repo.git
	if strings.HasPrefix(url, "git@") {
		parts := strings.SplitN(url, ":", 2)
		if len(parts) == 2 {
			host := strings.TrimPrefix(parts[0], "git@")
			path := parts[1]
			url = fmt.Sprintf("https://%s/%s", host, path)
		}
	}

	// Remove trailing .git if present
	url = strings.TrimSuffix(url, ".git")

	// Ensure https:// prefix
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		url = "https://" + url
	}

	return url
}

// FindGitRoot finds the Git repository root from a given path
func FindGitRoot(path string) (string, error) {
	// Try to open as-is first
	_, err := git.PlainOpen(path)
	if err == nil {
		return path, nil
	}

	// Walk up the directory tree looking for .git
	dir := path
	for {
		_, err := git.PlainOpen(dir)
		if err == nil {
			return dir, nil
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			// Reached root without finding .git
			return "", fmt.Errorf("not a git repository: %s", path)
		}
		dir = parent

		// Safety check: don't go too high
		if len(strings.Split(dir, string(filepath.Separator))) < 2 {
			return "", fmt.Errorf("not a git repository: %s", path)
		}
	}
}
