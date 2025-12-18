use devlog_cli::server;
use devlog_buffer::{Buffer, Config as BufferConfig};
use devlog_core::AgentEvent;
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use serde_json::json;
use tempfile::tempdir;
use chrono::Utc;

#[tokio::test]
async fn test_server_health_and_ingest() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test_buffer.db").to_string_lossy().to_string();

    let buffer = Arc::new(Buffer::new(BufferConfig {
        db_path: db_path.clone(),
        max_size: 100,
    }).await.unwrap());

    let state = Arc::new(server::AppState {
        buffer: buffer.clone(),
    });

    let port = 3201; // Use a different port for testing
    let state_clone = state.clone();
    tokio::spawn(async move {
        server::start_server(state_clone, port).await.unwrap();
    });

    // Wait for server to start
    sleep(Duration::from_millis(500)).await;

    let client = reqwest::Client::new();

    // Test health check
    let res = client.get(format!("http://localhost:{}/health", port))
        .send()
        .await
        .unwrap();
    assert!(res.status().is_success());
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["status"], "ok");

    // Test event ingestion
    let event = AgentEvent {
        id: "test-id".to_string(),
        timestamp: Utc::now(),
        event_type: "test-event".to_string(),
        agent_id: "test-agent".to_string(),
        agent_version: "1.0".to_string(),
        session_id: "test-session".to_string(),
        project_id: 1,
        machine_id: None,
        workspace_id: None,
        legacy_project_id: None,
        context: std::collections::HashMap::new(),
        data: std::collections::HashMap::new(),
        metrics: None,
    };

    let res = client.post(format!("http://localhost:{}/events", port))
        .json(&vec![event.clone()])
        .send()
        .await
        .unwrap();
    assert!(res.status().is_success());

    // Verify event is in buffer
    // Wait a bit for async storage if any (though it's awaited in ingest_events)
    let stored_events = buffer.get_unsynced(10).await.unwrap();
    assert_eq!(stored_events.len(), 1);
    assert_eq!(stored_events[0].id, "test-id");
}
