package buffer

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/codervisor/devlog/collector/pkg/types"
	"github.com/sirupsen/logrus"
	_ "modernc.org/sqlite"
)

// Buffer provides SQLite-based offline event storage
type Buffer struct {
	db      *sql.DB
	maxSize int
	log     *logrus.Logger
	mu      sync.Mutex
}

// Config holds buffer configuration
type Config struct {
	DBPath  string
	MaxSize int
	Logger  *logrus.Logger
}

// NewBuffer creates a new event buffer
func NewBuffer(config Config) (*Buffer, error) {
	if config.Logger == nil {
		config.Logger = logrus.New()
	}

	if config.MaxSize == 0 {
		config.MaxSize = 10000
	}

	// Open database
	db, err := sql.Open("sqlite", config.DBPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	buffer := &Buffer{
		db:      db,
		maxSize: config.MaxSize,
		log:     config.Logger,
	}

	// Initialize schema
	if err := buffer.initSchema(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	config.Logger.Infof("Buffer initialized at %s (max size: %d)", config.DBPath, config.MaxSize)

	return buffer, nil
}

// initSchema creates the events table
func (b *Buffer) initSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event_id TEXT NOT NULL,
		timestamp INTEGER NOT NULL,
		agent_id TEXT NOT NULL,
		session_id TEXT NOT NULL,
		project_id TEXT NOT NULL,
		data TEXT NOT NULL,
		created_at INTEGER NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp);
	CREATE INDEX IF NOT EXISTS idx_created_at ON events(created_at);
	`

	_, err := b.db.Exec(schema)
	return err
}

// Store adds an event to the buffer
func (b *Buffer) Store(event *types.AgentEvent) error {
	b.mu.Lock()
	defer b.mu.Unlock()

	// Check if buffer is full
	count, err := b.count()
	if err != nil {
		return fmt.Errorf("failed to count events: %w", err)
	}

	if count >= b.maxSize {
		// Evict oldest event (FIFO)
		if err := b.evictOldest(); err != nil {
			return fmt.Errorf("failed to evict oldest event: %w", err)
		}
	}

	// Serialize event data
	dataJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	// Insert event
	query := `
		INSERT INTO events (event_id, timestamp, agent_id, session_id, project_id, data, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`

	_, err = b.db.Exec(
		query,
		event.ID,
		event.Timestamp.Unix(),
		event.AgentID,
		event.SessionID,
		event.ProjectID,
		string(dataJSON),
		time.Now().Unix(),
	)

	if err != nil {
		return fmt.Errorf("failed to insert event: %w", err)
	}

	return nil
}

// Retrieve fetches the next batch of events
func (b *Buffer) Retrieve(limit int) ([]*types.AgentEvent, error) {
	b.mu.Lock()
	defer b.mu.Unlock()

	query := `
		SELECT data FROM events
		ORDER BY created_at ASC
		LIMIT ?
	`

	rows, err := b.db.Query(query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query events: %w", err)
	}
	defer rows.Close()

	var events []*types.AgentEvent

	for rows.Next() {
		var dataJSON string
		if err := rows.Scan(&dataJSON); err != nil {
			b.log.Warnf("Failed to scan row: %v", err)
			continue
		}

		var event types.AgentEvent
		if err := json.Unmarshal([]byte(dataJSON), &event); err != nil {
			b.log.Warnf("Failed to unmarshal event: %v", err)
			continue
		}

		events = append(events, &event)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return events, nil
}

// Delete removes events from the buffer
func (b *Buffer) Delete(eventIDs []string) error {
	b.mu.Lock()
	defer b.mu.Unlock()

	if len(eventIDs) == 0 {
		return nil
	}

	// Build placeholders for IN clause
	placeholders := ""
	args := make([]interface{}, len(eventIDs))
	for i, id := range eventIDs {
		if i > 0 {
			placeholders += ","
		}
		placeholders += "?"
		args[i] = id
	}

	query := fmt.Sprintf("DELETE FROM events WHERE event_id IN (%s)", placeholders)

	result, err := b.db.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("failed to delete events: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	b.log.Debugf("Deleted %d events from buffer", rowsAffected)

	return nil
}

// Count returns the number of events in the buffer
func (b *Buffer) Count() (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()

	return b.count()
}

// count returns the number of events (internal, assumes lock held)
func (b *Buffer) count() (int, error) {
	var count int
	err := b.db.QueryRow("SELECT COUNT(*) FROM events").Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// evictOldest removes the oldest event (FIFO)
func (b *Buffer) evictOldest() error {
	query := `
		DELETE FROM events
		WHERE id = (SELECT id FROM events ORDER BY created_at ASC LIMIT 1)
	`

	_, err := b.db.Exec(query)
	return err
}

// Clear removes all events from the buffer
func (b *Buffer) Clear() error {
	b.mu.Lock()
	defer b.mu.Unlock()

	_, err := b.db.Exec("DELETE FROM events")
	return err
}

// Close closes the database connection
func (b *Buffer) Close() error {
	return b.db.Close()
}

// GetStats returns buffer statistics
func (b *Buffer) GetStats() (map[string]interface{}, error) {
	count, err := b.Count()
	if err != nil {
		return nil, err
	}

	// Get oldest and newest event timestamps
	var oldestTS, newestTS sql.NullInt64
	query := `
		SELECT 
			MIN(created_at) as oldest,
			MAX(created_at) as newest
		FROM events
	`

	err = b.db.QueryRow(query).Scan(&oldestTS, &newestTS)
	if err != nil {
		return nil, err
	}

	stats := map[string]interface{}{
		"count":    count,
		"max_size": b.maxSize,
		"usage":    float64(count) / float64(b.maxSize) * 100,
	}

	if oldestTS.Valid && newestTS.Valid {
		oldest := time.Unix(oldestTS.Int64, 0)
		newest := time.Unix(newestTS.Int64, 0)
		stats["oldest_event"] = oldest
		stats["newest_event"] = newest
		stats["age_range"] = newest.Sub(oldest).String()
	}

	return stats, nil
}

// Vacuum optimizes the database
func (b *Buffer) Vacuum() error {
	b.mu.Lock()
	defer b.mu.Unlock()

	_, err := b.db.Exec("VACUUM")
	return err
}
