//go:build darwin
// +build darwin

package hierarchy

import (
	"os/exec"
	"strings"
)

// detectOSVersion detects macOS version
func detectOSVersion() string {
	cmd := exec.Command("sw_vers", "-productVersion")
	output, err := cmd.Output()
	if err != nil {
		return "unknown"
	}
	
	version := strings.TrimSpace(string(output))
	return version
}
