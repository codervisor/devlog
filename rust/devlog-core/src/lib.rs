use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::collections::HashMap;

pub mod config;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentEvent {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    #[serde(rename = "eventType")]
    pub event_type: String,
    pub agent_id: String,
    pub agent_version: String,
    pub session_id: String,

    // Hierarchy context
    pub project_id: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub machine_id: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace_id: Option<i32>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub legacy_project_id: Option<String>,

    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub context: HashMap<String, serde_json::Value>,
    pub data: HashMap<String, serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metrics: Option<EventMetrics>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EventMetrics {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_count: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_tokens: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_tokens: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cost: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub session_id: String,
    pub agent_id: String,
    pub start_time: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub branch: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit: Option<String>,
}

pub const EVENT_TYPE_LLM_REQUEST: &str = "llm_request";
pub const EVENT_TYPE_LLM_RESPONSE: &str = "llm_response";
pub const EVENT_TYPE_TOOL_USE: &str = "tool_use";
pub const EVENT_TYPE_FILE_READ: &str = "file_read";
pub const EVENT_TYPE_FILE_WRITE: &str = "file_write";
pub const EVENT_TYPE_FILE_MODIFY: &str = "file_modify";
pub const EVENT_TYPE_COMMAND_EXEC: &str = "command_execution";
pub const EVENT_TYPE_USER_INTERACTION: &str = "user_interaction";
pub const EVENT_TYPE_ERROR: &str = "error_encountered";
pub const EVENT_TYPE_SESSION_START: &str = "session_start";
pub const EVENT_TYPE_SESSION_END: &str = "session_end";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Machine {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i32>,
    pub machine_id: String,
    pub hostname: String,
    pub username: String,
    pub os_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub os_version: Option<String>,
    pub machine_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip_address: Option<String>,
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i32>,
    pub name: String,
    pub full_name: String,
    pub repo_url: String,
    pub repo_owner: String,
    pub repo_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i32>,
    pub project_id: i32,
    pub machine_id: i32,
    pub workspace_id: String,
    pub workspace_path: String,
    pub workspace_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub branch: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_seen_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project: Option<Project>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub machine: Option<Machine>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_agent_event_serialization() {
        let event = AgentEvent {
            id: "test-id".to_string(),
            timestamp: Utc::now(),
            event_type: EVENT_TYPE_LLM_REQUEST.to_string(),
            agent_id: "test-agent".to_string(),
            agent_version: "1.0.0".to_string(),
            session_id: "test-session".to_string(),
            project_id: 1,
            machine_id: Some(2),
            workspace_id: Some(3),
            legacy_project_id: None,
            context: HashMap::new(),
            data: HashMap::from([("key".to_string(), json!("value"))]),
            metrics: Some(EventMetrics {
                token_count: Some(100),
                ..Default::default()
            }),
        };

        let serialized = serde_json::to_string(&event).unwrap();
        let deserialized: AgentEvent = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.id, event.id);
        assert_eq!(deserialized.event_type, event.event_type);
        assert_eq!(deserialized.metrics.unwrap().token_count, Some(100));
    }

    #[test]
    fn test_config_serialization() {
        let config = config::Config::default();
        let serialized = serde_json::to_string(&config).unwrap();
        let deserialized: config::Config = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.version, config.version);
        assert_eq!(deserialized.project_id, config.project_id);
    }
}
