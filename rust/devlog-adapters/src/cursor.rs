use crate::AgentAdapter;
use async_trait::async_trait;
use devlog_core::{AgentEvent, EventMetrics, EVENT_TYPE_LLM_REQUEST, EVENT_TYPE_LLM_RESPONSE, EVENT_TYPE_TOOL_USE, EVENT_TYPE_FILE_READ, EVENT_TYPE_FILE_WRITE, EVENT_TYPE_USER_INTERACTION};
use std::path::Path;
use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use chrono::{DateTime, Utc, TimeZone};
use std::collections::HashMap;
use uuid::Uuid;
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, BufReader};

pub struct CursorAdapter {
    name: String,
    project_id: String,
}

impl CursorAdapter {
    pub fn new(project_id: String) -> Self {
        Self {
            name: "cursor".to_string(),
            project_id,
        }
    }

    fn detect_event_type(&self, entry: &CursorLogEntry) -> Option<String> {
        if let Some(ref t) = entry.event_type {
            match t.as_str() {
                "llm_request" | "prompt" | "completion_request" => return Some(EVENT_TYPE_LLM_REQUEST.to_string()),
                "llm_response" | "completion" | "completion_response" => return Some(EVENT_TYPE_LLM_RESPONSE.to_string()),
                "tool_use" | "tool_call" => return Some(EVENT_TYPE_TOOL_USE.to_string()),
                "file_read" => return Some(EVENT_TYPE_FILE_READ.to_string()),
                "file_write" | "file_modify" => return Some(EVENT_TYPE_FILE_WRITE.to_string()),
                _ => {}
            }
        }

        let msg_lower = entry.message.to_lowercase();
        
        if entry.prompt.is_some() || msg_lower.contains("prompt") || msg_lower.contains("request") {
            return Some(EVENT_TYPE_LLM_REQUEST.to_string());
        }
        
        if entry.response.is_some() || msg_lower.contains("response") || msg_lower.contains("completion") {
            return Some(EVENT_TYPE_LLM_RESPONSE.to_string());
        }
        
        if entry.tool.is_some() || msg_lower.contains("tool") {
            return Some(EVENT_TYPE_TOOL_USE.to_string());
        }
        
        if let Some(ref _file) = entry.file {
            if let Some(ref op) = entry.operation {
                if op == "read" || msg_lower.contains("read") {
                    return Some(EVENT_TYPE_FILE_READ.to_string());
                }
                if op == "write" || msg_lower.contains("write") {
                    return Some(EVENT_TYPE_FILE_WRITE.to_string());
                }
            }
        }

        None
    }

    fn parse_timestamp(&self, ts: &Value) -> DateTime<Utc> {
        match ts {
            Value::String(s) => {
                let formats = [
                    "%Y-%m-%dT%H:%M:%S%.fZ",
                    "%Y-%m-%dT%H:%M:%SZ",
                    "%Y-%m-%d %H:%M:%S",
                ];
                for format in formats {
                    if let Ok(t) = DateTime::parse_from_rfc3339(s) {
                        return t.with_timezone(&Utc);
                    }
                    if let Ok(t) = Utc.datetime_from_str(s, format) {
                        return t;
                    }
                }
                Utc::now()
            }
            Value::Number(n) => {
                if let Some(secs) = n.as_i64() {
                    return Utc.timestamp_opt(secs, 0).unwrap();
                }
                Utc::now()
            }
            _ => Utc::now(),
        }
    }

    fn extract_context(&self, entry: &CursorLogEntry) -> HashMap<String, Value> {
        let mut ctx = HashMap::new();
        
        if let Some(ref level) = entry.level {
            ctx.insert("logLevel".to_string(), Value::String(level.clone()));
        }
        
        if let Some(ref model) = entry.model {
            ctx.insert("model".to_string(), Value::String(model.clone()));
        }
        
        if let Some(ref metadata) = entry.metadata {
            for (k, v) in metadata {
                ctx.insert(k.clone(), v.clone());
            }
        }
        
        ctx
    }

    fn extract_data(&self, entry: &CursorLogEntry, event_type: &str) -> HashMap<String, Value> {
        let mut data = HashMap::new();
        
        data.insert("message".to_string(), Value::String(entry.message.clone()));
        
        match event_type {
            EVENT_TYPE_LLM_REQUEST => {
                if let Some(ref prompt) = entry.prompt {
                    data.insert("prompt".to_string(), Value::String(prompt.clone()));
                    data.insert("promptLength".to_string(), Value::Number(prompt.len().into()));
                }
            }
            EVENT_TYPE_LLM_RESPONSE => {
                if let Some(ref response) = entry.response {
                    data.insert("response".to_string(), Value::String(response.clone()));
                    data.insert("responseLength".to_string(), Value::Number(response.len().into()));
                }
            }
            EVENT_TYPE_TOOL_USE => {
                if let Some(ref tool) = entry.tool {
                    data.insert("toolName".to_string(), Value::String(tool.clone()));
                }
                if let Some(ref tool_args) = entry.tool_args {
                    data.insert("toolArgs".to_string(), tool_args.clone());
                }
            }
            EVENT_TYPE_FILE_READ | EVENT_TYPE_FILE_WRITE => {
                if let Some(ref file) = entry.file {
                    data.insert("filePath".to_string(), Value::String(file.clone()));
                }
                if let Some(ref operation) = entry.operation {
                    data.insert("operation".to_string(), Value::String(operation.clone()));
                }
            }
            _ => {}
        }
        
        data
    }

    fn extract_metrics(&self, entry: &CursorLogEntry) -> Option<EventMetrics> {
        if entry.tokens.is_none() && entry.prompt_tokens.is_none() && entry.completion_tokens.is_none() {
            return None;
        }
        
        Some(EventMetrics {
            token_count: entry.tokens,
            duration_ms: None,
            prompt_tokens: entry.prompt_tokens,
            response_tokens: entry.completion_tokens,
            cost: None,
        })
    }

    fn parse_plain_text_line(&self, line: &str) -> Option<AgentEvent> {
        let lower = line.to_lowercase();
        if !lower.contains("ai") && 
           !lower.contains("completion") && 
           !lower.contains("prompt") &&
           !lower.contains("tool") {
            return None;
        }

        let mut data = HashMap::new();
        data.insert("rawLog".to_string(), Value::String(line.to_string()));

        Some(AgentEvent {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            event_type: EVENT_TYPE_USER_INTERACTION.to_string(),
            agent_id: self.name.clone(),
            agent_version: "".to_string(),
            session_id: Uuid::new_v4().to_string(),
            project_id: 0,
            machine_id: None,
            workspace_id: None,
            legacy_project_id: Some(self.project_id.clone()),
            context: HashMap::new(),
            data,
            metrics: None,
        })
    }
}

#[async_trait]
impl AgentAdapter for CursorAdapter {
    fn name(&self) -> &str {
        &self.name
    }

    fn parse_log_line(&self, line: &str) -> Result<Option<AgentEvent>> {
        let line = line.trim();
        if line.is_empty() {
            return Ok(None);
        }

        let entry: CursorLogEntry = match serde_json::from_str(line) {
            Ok(e) => e,
            Err(_) => return Ok(self.parse_plain_text_line(line)),
        };

        let event_type = match self.detect_event_type(&entry) {
            Some(t) => t,
            None => return Ok(None),
        };

        let timestamp = self.parse_timestamp(&entry.timestamp);
        let event = AgentEvent {
            id: Uuid::new_v4().to_string(),
            timestamp,
            event_type: event_type.clone(),
            agent_id: self.name.clone(),
            agent_version: "".to_string(),
            session_id: entry.session_id.clone()
                .or(entry.conversation_id.clone())
                .unwrap_or_else(|| Uuid::new_v4().to_string()),
            project_id: 0,
            machine_id: None,
            workspace_id: None,
            legacy_project_id: Some(self.project_id.clone()),
            context: self.extract_context(&entry),
            data: self.extract_data(&entry, &event_type),
            metrics: self.extract_metrics(&entry),
        };

        Ok(Some(event))
    }

    async fn parse_log_file(&self, file_path: &Path) -> Result<Vec<AgentEvent>> {
        let file = File::open(file_path).await.context("failed to open log file")?;
        let reader = BufReader::new(file);
        let mut lines = reader.lines();
        let mut events = Vec::new();

        while let Some(line) = lines.next_line().await.context("failed to read line")? {
            if let Some(event) = self.parse_log_line(&line)? {
                events.push(event);
            }
        }

        Ok(events)
    }

    fn supports_format(&self, sample: &str) -> bool {
        if let Ok(entry) = serde_json::from_str::<CursorLogEntry>(sample) {
            return entry.session_id.is_some() || 
                entry.conversation_id.is_some() ||
                entry.message.to_lowercase().contains("cursor") ||
                entry.model.is_some();
        }
        
        let lower = sample.to_lowercase();
        lower.contains("cursor") && (lower.contains("ai") || lower.contains("completion"))
    }
}

#[derive(Debug, Deserialize)]
struct CursorLogEntry {
    #[serde(default = "default_timestamp")]
    timestamp: Value,
    level: Option<String>,
    #[serde(default)]
    message: String,
    #[serde(rename = "type")]
    event_type: Option<String>,
    session_id: Option<String>,
    conversation_id: Option<String>,
    model: Option<String>,
    prompt: Option<String>,
    response: Option<String>,
    tokens: Option<i32>,
    prompt_tokens: Option<i32>,
    completion_tokens: Option<i32>,
    tool: Option<String>,
    tool_args: Option<Value>,
    file: Option<String>,
    operation: Option<String>,
    metadata: Option<HashMap<String, Value>>,
}

fn default_timestamp() -> Value {
    Value::Null
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[tokio::test]
    async fn test_cursor_adapter_parse_line() {
        let adapter = CursorAdapter::new("test-project".to_string());

        // JSON LLM Request
        let line = r#"{"timestamp":"2025-10-31T10:00:00Z","type":"llm_request","session_id":"sess_123","prompt":"Test prompt","prompt_tokens":2}"#;
        let event = adapter.parse_log_line(line).unwrap().unwrap();
        assert_eq!(event.event_type, EVENT_TYPE_LLM_REQUEST);
        assert_eq!(event.data["prompt"], "Test prompt");

        // JSON LLM Response
        let line = r#"{"timestamp":"2025-10-31T10:00:01Z","type":"llm_response","session_id":"sess_123","response":"Test response","completion_tokens":2}"#;
        let event = adapter.parse_log_line(line).unwrap().unwrap();
        assert_eq!(event.event_type, EVENT_TYPE_LLM_RESPONSE);
        assert_eq!(event.data["response"], "Test response");

        // Plain text AI-related log
        let line = "[2025-10-31 10:00:00] INFO Cursor AI completion requested";
        let event = adapter.parse_log_line(line).unwrap().unwrap();
        assert_eq!(event.event_type, EVENT_TYPE_USER_INTERACTION);
    }

    #[tokio::test]
    async fn test_cursor_adapter_parse_file() {
        let mut file = NamedTempFile::new().unwrap();
        let content = r#"{"timestamp":"2025-10-31T10:00:00Z","type":"llm_request","session_id":"sess_123","prompt":"Hello","prompt_tokens":1}
{"timestamp":"2025-10-31T10:00:01Z","type":"llm_response","session_id":"sess_123","response":"Hi!","completion_tokens":1}
[2025-10-31 10:00:02] DEBUG System info
{"timestamp":"2025-10-31T10:00:03Z","type":"tool_use","tool":"search"}"#;
        file.write_all(content.as_bytes()).unwrap();

        let adapter = CursorAdapter::new("test-project".to_string());
        let events = adapter.parse_log_file(file.path()).await.unwrap();

        assert!(events.len() >= 3);
        
        let types: Vec<String> = events.iter().map(|e| e.event_type.clone()).collect();
        assert!(types.contains(&EVENT_TYPE_LLM_REQUEST.to_string()));
        assert!(types.contains(&EVENT_TYPE_LLM_RESPONSE.to_string()));
        assert!(types.contains(&EVENT_TYPE_TOOL_USE.to_string()));
    }

    #[test]
    fn test_cursor_adapter_supports_format() {
        let adapter = CursorAdapter::new("test-project".to_string());

        assert!(adapter.supports_format(r#"{"session_id":"sess_123","message":"test"}"#));
        assert!(adapter.supports_format(r#"{"model":"gpt-4","message":"test"}"#));
        assert!(adapter.supports_format("Cursor AI completion requested"));
        assert!(!adapter.supports_format("Generic log message"));
    }
}
