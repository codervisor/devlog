package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/codervisor/devlog/collector/internal/adapters"
	"github.com/codervisor/devlog/collector/pkg/types"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run test-parser.go <directory> [--preview]")
		os.Exit(1)
	}

	dir := os.Args[1]
	showPreview := len(os.Args) > 2 && os.Args[2] == "--preview"

	adapter := adapters.NewCopilotAdapter("test-project")

	// Find all JSON files
	files, err := filepath.Glob(filepath.Join(dir, "*.json"))
	if err != nil {
		fmt.Printf("Error finding files: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Found %d chat session files\n\n", len(files))

	totalEvents := 0
	successCount := 0
	errorCount := 0
	eventTypeCount := make(map[string]int)
	var sampleEvents []*types.AgentEvent

	for i, file := range files {
		if i >= 10 { // Test first 10 files
			break
		}

		events, err := adapter.ParseLogFile(file)
		if err != nil {
			fmt.Printf("❌ %s: ERROR - %v\n", filepath.Base(file), err)
			errorCount++
			continue
		}

		successCount++
		totalEvents += len(events)

		// Count event types
		for _, event := range events {
			eventTypeCount[event.Type]++
		}

		// Collect sample events from first file
		if i == 0 && len(events) > 0 {
			sampleEvents = events
		}

		fmt.Printf("✅ %s: %d events extracted\n", filepath.Base(file), len(events))
	}

	fmt.Printf("\n📊 Summary:\n")
	fmt.Printf("   Files processed: %d\n", successCount+errorCount)
	fmt.Printf("   Successful: %d\n", successCount)
	fmt.Printf("   Errors: %d\n", errorCount)
	fmt.Printf("   Total events: %d\n", totalEvents)
	fmt.Printf("   Average events/file: %.1f\n", float64(totalEvents)/float64(successCount))

	fmt.Printf("\n📋 Event Types Distribution:\n")
	for eventType, count := range eventTypeCount {
		percentage := float64(count) / float64(totalEvents) * 100
		fmt.Printf("   %s: %d (%.1f%%)\n", eventType, count, percentage)
	}

	if showPreview && len(sampleEvents) > 0 {
		fmt.Printf("\n🔍 Sample Events Preview (from first file):\n")
		fmt.Printf("=" + strings.Repeat("=", 79) + "\n\n")

		// Show first 5 events
		maxPreview := 5
		if len(sampleEvents) < maxPreview {
			maxPreview = len(sampleEvents)
		}

		for i, event := range sampleEvents[:maxPreview] {
			fmt.Printf("Event #%d:\n", i+1)
			printEvent(event)
			fmt.Println()
		}

		if len(sampleEvents) > maxPreview {
			fmt.Printf("... and %d more events\n", len(sampleEvents)-maxPreview)
		}
	} else if !showPreview {
		fmt.Printf("\n💡 Tip: Add --preview flag to see sample events\n")
	}
}

func printEvent(event *types.AgentEvent) {
	fmt.Printf("  Type:      %s\n", event.Type)
	fmt.Printf("  Timestamp: %s\n", event.Timestamp.Format("2006-01-02 15:04:05"))
	fmt.Printf("  Agent:     %s\n", event.AgentID)
	fmt.Printf("  Session:   %s\n", event.SessionID[:8]+"...")

	if len(event.Context) > 0 {
		fmt.Printf("  Context:\n")
		printMap(event.Context, "    ")
	}

	if len(event.Data) > 0 {
		fmt.Printf("  Data:\n")
		printMap(event.Data, "    ")
	}

	if event.Metrics != nil {
		fmt.Printf("  Metrics:\n")
		if event.Metrics.PromptTokens > 0 {
			fmt.Printf("    Prompt tokens: %d\n", event.Metrics.PromptTokens)
		}
		if event.Metrics.ResponseTokens > 0 {
			fmt.Printf("    Response tokens: %d\n", event.Metrics.ResponseTokens)
		}
		if event.Metrics.DurationMs > 0 {
			fmt.Printf("    Duration: %d ms\n", event.Metrics.DurationMs)
		}
	}
}

func printMap(m map[string]interface{}, indent string) {
	for key, value := range m {
		switch v := value.(type) {
		case string:
			// Truncate long strings
			if len(v) > 100 {
				fmt.Printf("%s%s: %s...\n", indent, key, v[:100])
			} else {
				fmt.Printf("%s%s: %s\n", indent, key, v)
			}
		case int, int64, float64, bool:
			fmt.Printf("%s%s: %v\n", indent, key, v)
		default:
			// Use JSON for complex types
			jsonBytes, _ := json.Marshal(v)
			jsonStr := string(jsonBytes)
			if len(jsonStr) > 100 {
				fmt.Printf("%s%s: %s...\n", indent, key, jsonStr[:100])
			} else {
				fmt.Printf("%s%s: %s\n", indent, key, jsonStr)
			}
		}
	}
}
