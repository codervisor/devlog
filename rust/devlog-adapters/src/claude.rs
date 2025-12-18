use crate::AgentAdapter;
use async_trait::async_trait;
use devlog_core::{AgentEvent, EventMetrics, EVENT_TYPE_LLM_REQUEST, EVENT_TYPE_LLM_RESPONSE, EVENT_TYPE_TOOL_USE, EVENT_TYPE_FILE_READ, EVENT_TYPE_FILE_WRITE};
use std::path::Path;
use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use chrono::{DateTime, Utc, TimeZone};
use std::collections::HashMap;
use uuid::Uuid;
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, BufReader};

pub struct ClaudeAdapter {
    name: String,
    project_id: String,
}

impl ClaudeAdapter {
    pub fn new(project_id: String) -> Self {
        Self {
            name: "claude".to_string(),
            project_id,
        }
    }

    fn detect_event_type(&self, entry: &ClaudeLogEntry) -> Option<String> {
        if let Some(ref t) = entry.event_type {
            match t.as_str() {
                "llm_request" | "prompt" => return Some(EVENT_TYPE_LLM_REQUEST.to_string()),
                "llm_response" | "completion" => return Some(EVENT_TYPE_LLM_RESPONSE.to_string()),
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
        if entry.tool_name.is_some() || msg_lower.contains("tool") {
            return Some(EVENT_TYPE_TOOL_USE.to_string());
        }
        if let Some(ref _file_path) = entry.file_path {
            if let Some(ref action) = entry.action {
                if action == "read" || msg_lower.contains("read") {
                    return Some(EVENT_TYPE_FILE_READ.to_string());
                }
                if action == "write" || msg_lower.contains("write") || msg_lower.contains("modify") {
                    return Some(EVENT_TYPE_FILE_WRITE.to_string());
                }
            }
        }

        None
    }

    fn parse_timestamp(&self, ts: &Value) -> DateTime<Utc> {
        match ts {
            Value::String(s) => {
                if let Ok(t) = DateTime::parse_from_rfc3339(s) {
                    return t.with_timezone(&Utc);
                }
                // Fallback to other formats if needed
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

    fn extract_context(&self, entry: &ClaudeLogEntry) -> HashMap<String, Value> {
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

    fn extract_data(&self, entry: &ClaudeLogEntry, event_type: &str) -> HashMap<String, Value> {
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
                if let Some(ref tool_name) = entry.tool_name {
                    data.insert("toolName".to_string(), Value::String(tool_name.clone()));
                }
                if let Some(ref tool_input) = entry.tool_input {
                    data.insert("toolInput".to_string(), tool_input.clone());
                }
                if let Some(ref tool_output) = entry.tool_output {
                    data.insert("toolOutput".to_string(), tool_output.clone());
                }
            }
            EVENT_TYPE_FILE_READ | EVENT_TYPE_FILE_WRITE => {
                if let Some(ref file_path) = entry.file_path {
                    data.insert("filePath".to_string(), Value::String(file_path.clone()));
                }
                if let Some(ref action) = entry.action {
                    data.insert("action".to_string(), Value::String(action.clone()));
                }
            }
            _ => {}
        }

        if let Some(ref conversation_id) = entry.conversation_id {
            data.insert("conversationId".to_string(), Value::String(conversation_id.clone()));
        }

        data
    }

    fn extract_metrics(&self, entry: &ClaudeLogEntry) -> Option<EventMetrics> {
        if entry.tokens_used.is_none() && entry.prompt_tokens.is_none() && entry.response_tokens.is_none() {
            return None;
        }

        Some(EventMetrics {
            token_count: entry.tokens_used,
            duration_ms: None,
            prompt_tokens: entry.prompt_tokens,
            response_tokens: entry.response_tokens,
            cost: None,
        })
    }
}

#[async_trait]
impl AgentAdapter for ClaudeAdapter {
    fn name(&self) -> &str {
        &self.name
    }

    fn parse_log_line(&self, line: &str) -> Result<Option<AgentEvent>> {
        let line = line.trim();
        if line.is_empty() {
            return Ok(None);
        }

        let entry: ClaudeLogEntry = match serde_json::from_str(line) {
            Ok(e) => e,
            Err(_) => return Ok(None),
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
            agent_version: "".to_string(), // TODO: extract from logs if available
            session_id: entry.conversation_id.clone().unwrap_or_default(),
            project_id: 0, // TODO: resolve from hierarchy
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
        let entry: ClaudeLogEntry = match serde_json::from_str(sample) {
            Ok(e) => e,
            Err(_) => return false,
        };

        entry.conversation_id.is_some() || 
        entry.model.is_some() || 
        entry.message.to_lowercase().contains("claude") || 
        entry.message.to_lowercase().contains("anthropic")
    }
}

#[derive(Debug, Deserialize)]
struct ClaudeLogEntry {
    timestamp: Value,
    level: Option<String>,
    message: String,
    #[serde(rename = "type")]
    event_type: Option<String>,
    conversation_id: Option<String>,
    model: Option<String>,
    prompt: Option<String>,
    response: Option<String>,
    tokens_used: Option<i32>,
    prompt_tokens: Option<i32>,
    response_tokens: Option<i32>,
    tool_name: Option<String>,
    tool_input: Option<Value>,
    tool_output: Option<Value>,
    file_path: Option<String>,
    action: Option<String>,
    metadata: Option<HashMap<String, Value>>,
}
