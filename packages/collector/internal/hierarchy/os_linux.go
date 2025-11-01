//go:build linux
// +build linux

package hierarchy

import (
	"os"
	"strings"
)

// detectOSVersion detects Linux distribution and version
func detectOSVersion() string {
	// Try to read /etc/os-release
	data, err := os.ReadFile("/etc/os-release")
	if err != nil {
		return "unknown"
	}
	
	lines := strings.Split(string(data), "\n")
	var name, version string
	
	for _, line := range lines {
		if strings.HasPrefix(line, "NAME=") {
			name = strings.Trim(strings.TrimPrefix(line, "NAME="), "\"")
		} else if strings.HasPrefix(line, "VERSION_ID=") {
			version = strings.Trim(strings.TrimPrefix(line, "VERSION_ID="), "\"")
		}
	}
	
	if name != "" && version != "" {
		return name + " " + version
	}
	if name != "" {
		return name
	}
	
	return "unknown"
}
