package client

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/codervisor/devlog/collector/pkg/types"
	"github.com/sirupsen/logrus"
)

// Client handles sending events to the backend API
type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
	batchSize  int
	batchDelay time.Duration
	maxRetries int
	log        *logrus.Logger
	batch      []*types.AgentEvent
	batchMu    sync.Mutex
	ctx        context.Context
	cancel     context.CancelFunc
	wg         sync.WaitGroup
}

// Config holds client configuration
type Config struct {
	BaseURL    string
	APIKey     string
	BatchSize  int
	BatchDelay time.Duration
	MaxRetries int
	Timeout    time.Duration
	Logger     *logrus.Logger
}

// NewClient creates a new API client
func NewClient(config Config) *Client {
	ctx, cancel := context.WithCancel(context.Background())

	if config.Logger == nil {
		config.Logger = logrus.New()
	}

	if config.Timeout == 0 {
		config.Timeout = 30 * time.Second
	}

	if config.BatchSize == 0 {
		config.BatchSize = 100
	}

	if config.BatchDelay == 0 {
		config.BatchDelay = 5 * time.Second
	}

	if config.MaxRetries == 0 {
		config.MaxRetries = 3
	}

	client := &Client{
		baseURL: config.BaseURL,
		apiKey:  config.APIKey,
		httpClient: &http.Client{
			Timeout: config.Timeout,
		},
		batchSize:  config.BatchSize,
		batchDelay: config.BatchDelay,
		maxRetries: config.MaxRetries,
		log:        config.Logger,
		batch:      make([]*types.AgentEvent, 0, config.BatchSize),
		ctx:        ctx,
		cancel:     cancel,
	}

	return client
}

// Start begins the batch processing loop
func (c *Client) Start() {
	c.log.Info("Starting API client...")
	c.wg.Add(1)
	go c.processBatchLoop()
}

// Stop stops the client and flushes remaining events
func (c *Client) Stop() error {
	c.log.Info("Stopping API client...")

	// Flush remaining events before canceling context
	if err := c.FlushBatch(); err != nil {
		// Only log if not a context cancellation
		if !errors.Is(err, context.Canceled) {
			c.log.Errorf("Failed to flush batch on shutdown: %v", err)
		}
	}

	// Now cancel the context to stop background workers
	c.cancel()
	c.wg.Wait()
	c.log.Info("API client stopped")
	return nil
}

// SendEvent adds an event to the batch queue
func (c *Client) SendEvent(event *types.AgentEvent) error {
	c.batchMu.Lock()
	defer c.batchMu.Unlock()

	c.batch = append(c.batch, event)

	// Auto-flush if batch is full
	if len(c.batch) >= c.batchSize {
		go c.FlushBatch()
	}

	return nil
}

// FlushBatch sends the current batch to the backend
func (c *Client) FlushBatch() error {
	c.batchMu.Lock()

	if len(c.batch) == 0 {
		c.batchMu.Unlock()
		return nil
	}

	// Take ownership of current batch
	batch := c.batch
	c.batch = make([]*types.AgentEvent, 0, c.batchSize)
	c.batchMu.Unlock()

	c.log.Infof("Flushing batch of %d events", len(batch))

	// Send batch with retries
	return c.sendBatchWithRetry(batch)
}

// processBatchLoop periodically flushes the batch
func (c *Client) processBatchLoop() {
	defer c.wg.Done()

	ticker := time.NewTicker(c.batchDelay)
	defer ticker.Stop()

	for {
		select {
		case <-c.ctx.Done():
			return
		case <-ticker.C:
			if err := c.FlushBatch(); err != nil {
				// Only log if not a context cancellation
				if !errors.Is(err, context.Canceled) {
					c.log.Errorf("Failed to flush batch: %v", err)
				}
			}
		}
	}
}

// sendBatchWithRetry sends a batch with exponential backoff retry
func (c *Client) sendBatchWithRetry(batch []*types.AgentEvent) error {
	var lastErr error

	for attempt := 0; attempt <= c.maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff: 1s, 2s, 4s, 8s...
			backoff := time.Duration(1<<uint(attempt-1)) * time.Second

			select {
			case <-time.After(backoff):
			case <-c.ctx.Done():
				return fmt.Errorf("send cancelled: %w", c.ctx.Err())
			}
		}

		err := c.sendBatch(batch)
		if err == nil {
			return nil
		}

		lastErr = err
		// Only log warnings if not a context cancellation
		if !errors.Is(err, context.Canceled) && c.ctx.Err() == nil {
			c.log.Warnf("Failed to send batch (attempt %d/%d): %v", attempt+1, c.maxRetries+1, err)
		}
	}

	return fmt.Errorf("failed after %d attempts: %w", c.maxRetries+1, lastErr)
}

// sendBatch sends a batch of events to the backend
func (c *Client) sendBatch(batch []*types.AgentEvent) error {
	// Prepare request body - API expects array directly, not wrapped in object
	body, err := json.Marshal(batch)
	if err != nil {
		return fmt.Errorf("failed to marshal events: %w", err)
	}

	// Create request
	url := fmt.Sprintf("%s/api/events/batch", c.baseURL)
	req, err := http.NewRequestWithContext(c.ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))
	req.Header.Set("User-Agent", "devlog-collector/1.0")

	// Send request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	respBody, _ := io.ReadAll(resp.Body)

	// Check status code
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(respBody))
	}

	c.log.Debugf("Successfully sent batch of %d events", len(batch))
	return nil
}

// SendSingleEvent sends a single event immediately (bypass batching)
func (c *Client) SendSingleEvent(event *types.AgentEvent) error {
	body, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	url := fmt.Sprintf("%s/api/events", c.baseURL)
	req, err := http.NewRequestWithContext(c.ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// HealthCheck checks if the backend is reachable
func (c *Client) HealthCheck() error {
	url := fmt.Sprintf("%s/api/health", c.baseURL)
	req, err := http.NewRequestWithContext(c.ctx, "GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("unhealthy: status %d", resp.StatusCode)
	}

	return nil
}

// GetStats returns client statistics
func (c *Client) GetStats() map[string]interface{} {
	c.batchMu.Lock()
	defer c.batchMu.Unlock()

	return map[string]interface{}{
		"pending_events": len(c.batch),
		"batch_size":     c.batchSize,
		"batch_delay":    c.batchDelay.String(),
	}
}
