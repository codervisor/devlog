//go:build windows
// +build windows

package hierarchy

import (
	"golang.org/x/sys/windows/registry"
)

// detectOSVersion detects Windows version
func detectOSVersion() string {
	k, err := registry.OpenKey(registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows NT\CurrentVersion`, registry.QUERY_VALUE)
	if err != nil {
		return "unknown"
	}
	defer k.Close()

	productName, _, err := k.GetStringValue("ProductName")
	if err != nil {
		return "unknown"
	}

	return productName
}
