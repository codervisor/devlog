use axum::{
    routing::{get, post},
    Router,
    Json,
    extract::{State, WebSocketUpgrade, ws::{WebSocket, Message}},
    response::IntoResponse,
};
use std::sync::Arc;
use devlog_core::AgentEvent;
use devlog_buffer::Buffer;
use serde_json::json;
use log::{info, error};
use tower_http::cors::CorsLayer;

pub struct AppState {
    pub buffer: Arc<Buffer>,
}

pub async fn start_server(state: Arc<AppState>, port: u16) -> anyhow::Result<()> {
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/events", post(ingest_events))
        .route("/ws", get(ws_handler))
        .with_state(state)
        .layer(CorsLayer::permissive());

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    info!("Server listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> impl IntoResponse {
    Json(json!({ "status": "ok" }))
}

async fn ingest_events(
    State(state): State<Arc<AppState>>,
    Json(events): Json<Vec<AgentEvent>>,
) -> impl IntoResponse {
    for event in events {
        if let Err(e) = state.buffer.store(&event).await {
            error!("Failed to store event: {}", e);
        }
    }
    Json(json!({ "status": "success" }))
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    while let Some(msg) = socket.recv().await {
        let msg = match msg {
            Ok(msg) => msg,
            Err(e) => {
                error!("WebSocket error: {}", e);
                return;
            }
        };

        if let Message::Text(text) = msg {
            if let Ok(event) = serde_json::from_str::<AgentEvent>(&text) {
                if let Err(e) = state.buffer.store(&event).await {
                    error!("Failed to store event from WS: {}", e);
                }
            }
        }
    }
}
