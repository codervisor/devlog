use crate::AgentAdapter;
use async_trait::async_trait;
use devlog_core::{AgentEvent, EventMetrics, EVENT_TYPE_LLM_REQUEST, EVENT_TYPE_LLM_RESPONSE, EVENT_TYPE_TOOL_USE, EVENT_TYPE_FILE_READ, EVENT_TYPE_FILE_MODIFY};
use std::path::Path;
use anyhow::{Result, Context, anyhow};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use chrono::{DateTime, Utc, TimeZone};
use std::collections::HashMap;
use uuid::Uuid;
use tokio::fs;

pub struct CopilotAdapter {
    name: String,
    project_id: String,
}

impl CopilotAdapter {
    pub fn new(project_id: String) -> Self {
        Self {
            name: "github-copilot".to_string(),
            project_id,
        }
    }

    fn extract_session_id(&self, file_path: &Path) -> String {
        file_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_string()
    }

    fn extract_workspace_id(&self, file_path: &Path) -> String {
        let components: Vec<_> = file_path.components().collect();
        for i in 0..components.len() {
            if let Some(name) = components[i].as_os_str().to_str() {
                if name == "workspaceStorage" && i + 1 < components.len() {
                    return components[i + 1].as_os_str().to_str().unwrap_or_default().to_string();
                }
            }
        }
        "".to_string()
    }

    fn parse_timestamp(&self, ts: &Value) -> DateTime<Utc> {
        match ts {
            Value::String(s) => {
                if let Ok(t) = DateTime::parse_from_rfc3339(s) {
                    return t.with_timezone(&Utc);
                }
                Utc::now()
            }
            Value::Number(n) => {
                if let Some(ms) = n.as_i64() {
                    return Utc.timestamp_millis_opt(ms).unwrap();
                }
                Utc::now()
            }
            _ => Utc::now(),
        }
    }

    fn extract_value_as_string(&self, val: &Value) -> String {
        match val {
            Value::String(s) => s.clone(),
            Value::Array(arr) => {
                arr.iter()
                    .filter_map(|v| v.as_str())
                    .collect::<Vec<_>>()
                    .join("\n")
            }
            _ => "".to_string(),
        }
    }

    fn extract_file_path(&self, uri: &Value) -> String {
        if let Some(obj) = uri.as_object() {
            if let Some(path) = obj.get("path").and_then(|v| v.as_str()) {
                return path.to_string();
            }
            if let Some(fs_path) = obj.get("fsPath").and_then(|v| v.as_str()) {
                return fs_path.to_string();
            }
        }
        "".to_string()
    }

    fn estimate_tokens(&self, text: &str) -> i32 {
        (text.split_whitespace().count() as f64 * 1.3) as i32
    }
}

#[async_trait]
impl AgentAdapter for CopilotAdapter {
    fn name(&self) -> &str {
        &self.name
    }

    fn parse_log_line(&self, _line: &str) -> Result<Option<AgentEvent>> {
        Err(anyhow!("line-based parsing not supported for Copilot chat sessions"))
    }

    async fn parse_log_file(&self, file_path: &Path) -> Result<Vec<AgentEvent>> {
        let data = fs::read_to_string(file_path).await.context("failed to read chat session file")?;
        let session: CopilotChatSession = serde_json::from_str(&data).context("failed to parse chat session JSON")?;

        let session_id = self.extract_session_id(file_path);
        let workspace_id = self.extract_workspace_id(file_path);

        let mut events = Vec::new();

        for request in session.requests {
            if request.is_canceled {
                continue;
            }

            let timestamp = self.parse_timestamp(&request.timestamp);
            
            // 1. LLM Request Event
            let prompt_text = request.message.text.clone();
            let mut req_event = AgentEvent {
                id: Uuid::new_v4().to_string(),
                timestamp,
                event_type: EVENT_TYPE_LLM_REQUEST.to_string(),
                agent_id: self.name.clone(),
                agent_version: "1.0.0".to_string(),
                session_id: session_id.clone(),
                project_id: 0,
                machine_id: None,
                workspace_id: None,
                legacy_project_id: Some(self.project_id.clone()),
                context: HashMap::from([
                    ("username".to_string(), Value::String(session.requester_username.clone())),
                    ("workspaceId".to_string(), Value::String(workspace_id.clone())),
                ]),
                data: HashMap::from([
                    ("requestId".to_string(), Value::String(request.request_id.clone())),
                    ("modelId".to_string(), Value::String(request.model_id.clone())),
                    ("prompt".to_string(), Value::String(prompt_text.clone())),
                    ("promptLength".to_string(), Value::Number(prompt_text.len().into())),
                ]),
                metrics: Some(EventMetrics {
                    prompt_tokens: Some(self.estimate_tokens(&prompt_text)),
                    ..Default::default()
                }),
            };
            events.push(req_event);

            // 2. File References from variables
            for var in request.variable_data.variables {
                let file_path = self.extract_file_path(&Value::Object(var.value.clone().into_iter().collect()));
                if !file_path.is_empty() {
                    events.push(AgentEvent {
                        id: Uuid::new_v4().to_string(),
                        timestamp,
                        event_type: EVENT_TYPE_FILE_READ.to_string(),
                        agent_id: self.name.clone(),
                        agent_version: "1.0.0".to_string(),
                        session_id: session_id.clone(),
                        project_id: 0,
                        machine_id: None,
                        workspace_id: None,
                        legacy_project_id: Some(self.project_id.clone()),
                        context: HashMap::new(),
                        data: HashMap::from([
                            ("requestId".to_string(), Value::String(request.request_id.clone())),
                            ("filePath".to_string(), Value::String(file_path)),
                            ("variableName".to_string(), Value::String(var.name)),
                        ]),
                        metrics: None,
                    });
                }
            }

            // 3. Tool Invocations and Response Text
            let mut response_text_parts = Vec::new();
            for item in request.response {
                match item.kind.as_deref() {
                    None => {
                        let text = self.extract_value_as_string(&item.value);
                        if !text.is_empty() {
                            response_text_parts.push(text);
                        }
                    }
                    Some("toolInvocationSerialized") => {
                        events.push(AgentEvent {
                            id: Uuid::new_v4().to_string(),
                            timestamp: timestamp + chrono::Duration::milliseconds(100),
                            event_type: EVENT_TYPE_TOOL_USE.to_string(),
                            agent_id: self.name.clone(),
                            agent_version: "1.0.0".to_string(),
                            session_id: session_id.clone(),
                            project_id: 0,
                            machine_id: None,
                            workspace_id: None,
                            legacy_project_id: Some(self.project_id.clone()),
                            context: HashMap::new(),
                            data: HashMap::from([
                                ("requestId".to_string(), Value::String(request.request_id.clone())),
                                ("toolId".to_string(), Value::String(item.tool_id.unwrap_or_default())),
                                ("toolName".to_string(), Value::String(item.tool_name.unwrap_or_default())),
                            ]),
                            metrics: None,
                        });
                    }
                    Some("textEditGroup") => {
                        events.push(AgentEvent {
                            id: Uuid::new_v4().to_string(),
                            timestamp: timestamp + chrono::Duration::milliseconds(200),
                            event_type: EVENT_TYPE_FILE_MODIFY.to_string(),
                            agent_id: self.name.clone(),
                            agent_version: "1.0.0".to_string(),
                            session_id: session_id.clone(),
                            project_id: 0,
                            machine_id: None,
                            workspace_id: None,
                            legacy_project_id: Some(self.project_id.clone()),
                            context: HashMap::new(),
                            data: HashMap::from([
                                ("requestId".to_string(), Value::String(request.request_id.clone())),
                            ]),
                            metrics: None,
                        });
                    }
                    _ => {}
                }
            }

            // 4. LLM Response Event
            let response_text = response_text_parts.join("");
            events.push(AgentEvent {
                id: Uuid::new_v4().to_string(),
                timestamp: timestamp + chrono::Duration::seconds(1),
                event_type: EVENT_TYPE_LLM_RESPONSE.to_string(),
                agent_id: self.name.clone(),
                agent_version: "1.0.0".to_string(),
                session_id: session_id.clone(),
                project_id: 0,
                machine_id: None,
                workspace_id: None,
                legacy_project_id: Some(self.project_id.clone()),
                context: HashMap::new(),
                data: HashMap::from([
                    ("requestId".to_string(), Value::String(request.request_id.clone())),
                    ("response".to_string(), Value::String(response_text.clone())),
                    ("responseLength".to_string(), Value::Number(response_text.len().into())),
                ]),
                metrics: Some(EventMetrics {
                    response_tokens: Some(self.estimate_tokens(&response_text)),
                    ..Default::default()
                }),
            });
        }

        Ok(events)
    }

    fn supports_format(&self, sample: &str) -> bool {
        let session: Result<CopilotChatSession, _> = serde_json::from_str(sample);
        match session {
            Ok(s) => s.version > 0 && !s.requests.is_empty(),
            Err(_) => false,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CopilotChatSession {
    version: i32,
    requester_username: String,
    requests: Vec<CopilotRequest>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CopilotRequest {
    request_id: String,
    timestamp: Value,
    model_id: String,
    message: CopilotMessage,
    response: Vec<CopilotResponseItem>,
    variable_data: CopilotVariableData,
    #[serde(default)]
    is_canceled: bool,
}

#[derive(Debug, Deserialize)]
struct CopilotMessage {
    text: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CopilotResponseItem {
    kind: Option<String>,
    #[serde(default)]
    value: Value,
    tool_id: Option<String>,
    tool_name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CopilotVariableData {
    variables: Vec<CopilotVariable>,
}

#[derive(Debug, Deserialize)]
struct CopilotVariable {
    name: String,
    value: HashMap<String, Value>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[tokio::test]
    async fn test_copilot_adapter_parse_file() {
        let mut file = NamedTempFile::new().unwrap();
        let json_content = r#"{
            "version": 1,
            "requesterUsername": "testuser",
            "requests": [
                {
                    "requestId": "req-1",
                    "timestamp": 1700000000000,
                    "modelId": "gpt-4",
                    "message": { "text": "Hello" },
                    "response": [
                        { "value": "Hi there" }
                    ],
                    "variableData": { "variables": [] },
                    "isCanceled": false
                }
            ]
        }"#;
        file.write_all(json_content.as_bytes()).unwrap();

        let adapter = CopilotAdapter::new("test-project".to_string());
        let events = adapter.parse_log_file(file.path()).await.unwrap();

        assert_eq!(events.len(), 2); // Request and Response
        assert_eq!(events[0].event_type, EVENT_TYPE_LLM_REQUEST);
        assert_eq!(events[1].event_type, EVENT_TYPE_LLM_RESPONSE);
        assert_eq!(events[0].data["prompt"], "Hello");
        assert_eq!(events[1].data["response"], "Hi there");
    }
}
