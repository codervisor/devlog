package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/codervisor/devlog/collector/pkg/models"
)

// UpsertMachine registers or updates a machine with the backend
func (c *Client) UpsertMachine(machine *models.Machine) (*models.Machine, error) {
	body, err := json.Marshal(machine)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal machine: %w", err)
	}

	url := fmt.Sprintf("%s/api/machines", c.baseURL)
	req, err := http.NewRequestWithContext(c.ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(respBody))
	}

	var result models.Machine
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	c.log.WithFields(map[string]interface{}{
		"machineId": result.MachineID,
		"id":        result.ID,
	}).Info("Machine registered/updated successfully")

	return &result, nil
}

// GetMachine retrieves machine information by machine ID
func (c *Client) GetMachine(machineID string) (*models.Machine, error) {
	url := fmt.Sprintf("%s/api/machines/%s", c.baseURL, machineID)
	req, err := http.NewRequestWithContext(c.ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode == 404 {
		return nil, fmt.Errorf("machine not found: %s", machineID)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(respBody))
	}

	var machine models.Machine
	if err := json.Unmarshal(respBody, &machine); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &machine, nil
}

// UpsertWorkspace registers or updates a workspace with the backend
func (c *Client) UpsertWorkspace(workspace *models.Workspace) (*models.Workspace, error) {
	body, err := json.Marshal(workspace)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal workspace: %w", err)
	}

	url := fmt.Sprintf("%s/api/workspaces", c.baseURL)
	req, err := http.NewRequestWithContext(c.ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(respBody))
	}

	var result models.Workspace
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	c.log.WithFields(map[string]interface{}{
		"workspaceId": result.WorkspaceID,
		"id":          result.ID,
		"projectId":   result.ProjectID,
	}).Info("Workspace registered/updated successfully")

	return &result, nil
}

// GetWorkspace retrieves workspace information by workspace ID
func (c *Client) GetWorkspace(workspaceID string) (*models.Workspace, error) {
	url := fmt.Sprintf("%s/api/workspaces/%s", c.baseURL, workspaceID)
	req, err := http.NewRequestWithContext(c.ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode == 404 {
		return nil, fmt.Errorf("workspace not found: %s", workspaceID)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(respBody))
	}

	var workspace models.Workspace
	if err := json.Unmarshal(respBody, &workspace); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &workspace, nil
}

// ListWorkspaces retrieves all workspaces
func (c *Client) ListWorkspaces() ([]*models.Workspace, error) {
	url := fmt.Sprintf("%s/api/workspaces", c.baseURL)
	req, err := http.NewRequestWithContext(c.ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(respBody))
	}

	var workspaces []*models.Workspace
	if err := json.Unmarshal(respBody, &workspaces); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return workspaces, nil
}

// ResolveProject resolves or creates a project from a Git remote URL
func (c *Client) ResolveProject(gitRemoteURL string) (*models.Project, error) {
	body, err := json.Marshal(map[string]interface{}{
		"repoUrl": gitRemoteURL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/api/projects/resolve", c.baseURL)
	req, err := http.NewRequestWithContext(c.ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(respBody))
	}

	var project models.Project
	if err := json.Unmarshal(respBody, &project); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	c.log.WithFields(map[string]interface{}{
		"projectId": project.ID,
		"fullName":  project.FullName,
	}).Info("Project resolved successfully")

	return &project, nil
}
