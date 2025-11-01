package backfill

import (
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

// BackfillStatus represents the status of a backfill operation
type BackfillStatus string

const (
	StatusNew        BackfillStatus = "new"
	StatusInProgress BackfillStatus = "in_progress"
	StatusPaused     BackfillStatus = "paused"
	StatusCompleted  BackfillStatus = "completed"
	StatusFailed     BackfillStatus = "failed"
)

// BackfillState represents the persisted state of a backfill operation
type BackfillState struct {
	ID                   int64
	AgentName            string
	LogFilePath          string
	LastByteOffset       int64
	LastTimestamp        *time.Time
	TotalEventsProcessed int
	Status               BackfillStatus
	StartedAt            time.Time
	CompletedAt          *time.Time
	ErrorMessage         string
}

// StateStore manages backfill state persistence
type StateStore struct {
	db *sql.DB
}

// NewStateStore creates a new state store
func NewStateStore(dbPath string) (*StateStore, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open state database: %w", err)
	}

	store := &StateStore{db: db}

	if err := store.initSchema(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	return store, nil
}

// initSchema creates the backfill_state table
func (s *StateStore) initSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS backfill_state (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		agent_name TEXT NOT NULL,
		log_file_path TEXT NOT NULL,
		last_byte_offset INTEGER NOT NULL DEFAULT 0,
		last_timestamp INTEGER,
		total_events_processed INTEGER NOT NULL DEFAULT 0,
		status TEXT NOT NULL DEFAULT 'new',
		started_at INTEGER NOT NULL,
		completed_at INTEGER,
		error_message TEXT,
		UNIQUE(agent_name, log_file_path)
	);

	CREATE INDEX IF NOT EXISTS idx_backfill_status 
		ON backfill_state(status);
	CREATE INDEX IF NOT EXISTS idx_backfill_agent 
		ON backfill_state(agent_name);
	`

	_, err := s.db.Exec(schema)
	return err
}

// Load retrieves the backfill state for an agent and log file
func (s *StateStore) Load(agentName, logFilePath string) (*BackfillState, error) {
	query := `
		SELECT id, agent_name, log_file_path, last_byte_offset, last_timestamp,
		       total_events_processed, status, started_at, completed_at, error_message
		FROM backfill_state
		WHERE agent_name = ? AND log_file_path = ?
	`

	var state BackfillState
	var lastTimestamp, startedAt, completedAt sql.NullInt64
	var errorMessage sql.NullString

	err := s.db.QueryRow(query, agentName, logFilePath).Scan(
		&state.ID,
		&state.AgentName,
		&state.LogFilePath,
		&state.LastByteOffset,
		&lastTimestamp,
		&state.TotalEventsProcessed,
		&state.Status,
		&startedAt,
		&completedAt,
		&errorMessage,
	)

	if err == sql.ErrNoRows {
		// No existing state, return new state
		return &BackfillState{
			AgentName:   agentName,
			LogFilePath: logFilePath,
			Status:      StatusNew,
			StartedAt:   time.Now(),
		}, nil
	}

	if err != nil {
		return nil, fmt.Errorf("failed to load state: %w", err)
	}

	// Convert nullable fields
	if lastTimestamp.Valid {
		t := time.Unix(lastTimestamp.Int64, 0)
		state.LastTimestamp = &t
	}
	if startedAt.Valid {
		state.StartedAt = time.Unix(startedAt.Int64, 0)
	}
	if completedAt.Valid {
		t := time.Unix(completedAt.Int64, 0)
		state.CompletedAt = &t
	}
	if errorMessage.Valid {
		state.ErrorMessage = errorMessage.String
	}

	return &state, nil
}

// Save persists the backfill state
func (s *StateStore) Save(state *BackfillState) error {
	if state.ID == 0 {
		// Insert new state
		return s.insert(state)
	}

	// Update existing state
	return s.update(state)
}

// insert creates a new state record
func (s *StateStore) insert(state *BackfillState) error {
	query := `
		INSERT INTO backfill_state (
			agent_name, log_file_path, last_byte_offset, last_timestamp,
			total_events_processed, status, started_at, completed_at, error_message
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	var lastTimestamp, completedAt interface{}
	if state.LastTimestamp != nil {
		lastTimestamp = state.LastTimestamp.Unix()
	}
	if state.CompletedAt != nil {
		completedAt = state.CompletedAt.Unix()
	}

	result, err := s.db.Exec(
		query,
		state.AgentName,
		state.LogFilePath,
		state.LastByteOffset,
		lastTimestamp,
		state.TotalEventsProcessed,
		state.Status,
		state.StartedAt.Unix(),
		completedAt,
		state.ErrorMessage,
	)

	if err != nil {
		return fmt.Errorf("failed to insert state: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("failed to get insert ID: %w", err)
	}

	state.ID = id
	return nil
}

// update modifies an existing state record
func (s *StateStore) update(state *BackfillState) error {
	query := `
		UPDATE backfill_state
		SET last_byte_offset = ?,
		    last_timestamp = ?,
		    total_events_processed = ?,
		    status = ?,
		    completed_at = ?,
		    error_message = ?
		WHERE id = ?
	`

	var lastTimestamp, completedAt interface{}
	if state.LastTimestamp != nil {
		lastTimestamp = state.LastTimestamp.Unix()
	}
	if state.CompletedAt != nil {
		completedAt = state.CompletedAt.Unix()
	}

	_, err := s.db.Exec(
		query,
		state.LastByteOffset,
		lastTimestamp,
		state.TotalEventsProcessed,
		state.Status,
		completedAt,
		state.ErrorMessage,
		state.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update state: %w", err)
	}

	return nil
}

// ListByAgent returns all backfill states for an agent
func (s *StateStore) ListByAgent(agentName string) ([]*BackfillState, error) {
	query := `
		SELECT id, agent_name, log_file_path, last_byte_offset, last_timestamp,
		       total_events_processed, status, started_at, completed_at, error_message
		FROM backfill_state
		WHERE agent_name = ?
		ORDER BY started_at DESC
	`

	rows, err := s.db.Query(query, agentName)
	if err != nil {
		return nil, fmt.Errorf("failed to query states: %w", err)
	}
	defer rows.Close()

	var states []*BackfillState

	for rows.Next() {
		var state BackfillState
		var lastTimestamp, startedAt, completedAt sql.NullInt64
		var errorMessage sql.NullString

		err := rows.Scan(
			&state.ID,
			&state.AgentName,
			&state.LogFilePath,
			&state.LastByteOffset,
			&lastTimestamp,
			&state.TotalEventsProcessed,
			&state.Status,
			&startedAt,
			&completedAt,
			&errorMessage,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		if lastTimestamp.Valid {
			t := time.Unix(lastTimestamp.Int64, 0)
			state.LastTimestamp = &t
		}
		if startedAt.Valid {
			state.StartedAt = time.Unix(startedAt.Int64, 0)
		}
		if completedAt.Valid {
			t := time.Unix(completedAt.Int64, 0)
			state.CompletedAt = &t
		}
		if errorMessage.Valid {
			state.ErrorMessage = errorMessage.String
		}

		states = append(states, &state)
	}

	return states, rows.Err()
}

// Delete removes a backfill state
func (s *StateStore) Delete(id int64) error {
	_, err := s.db.Exec("DELETE FROM backfill_state WHERE id = ?", id)
	return err
}

// Close closes the database connection
func (s *StateStore) Close() error {
	return s.db.Close()
}
