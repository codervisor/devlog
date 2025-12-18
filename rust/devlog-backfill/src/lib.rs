use devlog_core::AgentEvent;
use devlog_adapters::{Registry, AgentAdapter};
use devlog_buffer::Buffer;
use sqlx::{sqlite::SqlitePool, Row};
use anyhow::{Result, Context, anyhow};
use std::path::{Path, PathBuf};
use chrono::{DateTime, Utc, TimeZone};
use std::sync::Arc;
use log::{info, warn, error, debug};
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, BufReader};

pub struct BackfillManager {
    registry: Arc<Registry>,
    buffer: Arc<Buffer>,
    pool: SqlitePool,
}

#[derive(Debug, Clone, PartialEq)]
pub enum BackfillStatus {
    New,
    InProgress,
    Paused,
    Completed,
    Failed,
}

impl From<String> for BackfillStatus {
    fn from(s: String) -> Self {
        match s.as_str() {
            "new" => BackfillStatus::New,
            "in_progress" => BackfillStatus::InProgress,
            "paused" => BackfillStatus::Paused,
            "completed" => BackfillStatus::Completed,
            "failed" => BackfillStatus::Failed,
            _ => BackfillStatus::New,
        }
    }
}

impl ToString for BackfillStatus {
    fn to_string(&self) -> String {
        match self {
            BackfillStatus::New => "new".to_string(),
            BackfillStatus::InProgress => "in_progress".to_string(),
            BackfillStatus::Paused => "paused".to_string(),
            BackfillStatus::Completed => "completed".to_string(),
            BackfillStatus::Failed => "failed".to_string(),
        }
    }
}

pub struct BackfillState {
    pub id: i64,
    pub agent_name: String,
    pub log_file_path: String,
    pub last_byte_offset: i64,
    pub last_timestamp: Option<DateTime<Utc>>,
    pub total_events_processed: i32,
    pub status: BackfillStatus,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub error_message: Option<String>,
}

pub struct Config {
    pub registry: Arc<Registry>,
    pub buffer: Arc<Buffer>,
    pub db_path: String,
}

impl BackfillManager {
    pub async fn new(config: Config) -> Result<Self> {
        let db_url = format!("sqlite:{}", config.db_path);
        let pool = SqlitePool::connect(&db_url).await.context("failed to connect to sqlite")?;

        let manager = Self {
            registry: config.registry,
            buffer: config.buffer,
            pool,
        };

        manager.init_schema().await?;

        Ok(manager)
    }

    async fn init_schema(&self) -> Result<()> {
        sqlx::query(
            r#"
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
            CREATE INDEX IF NOT EXISTS idx_backfill_status ON backfill_state(status);
            CREATE INDEX IF NOT EXISTS idx_backfill_agent ON backfill_state(agent_name);
            "#
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn backfill(&self, agent_name: &str, log_path: &Path) -> Result<()> {
        let adapter = self.registry.get(agent_name).ok_or_else(|| anyhow!("adapter not found: {}", agent_name))?;
        
        if log_path.is_dir() {
            self.backfill_directory(agent_name, log_path, adapter).await?;
        } else {
            self.backfill_file(agent_name, log_path, adapter).await?;
        }

        Ok(())
    }

    async fn backfill_directory(&self, agent_name: &str, dir_path: &Path, adapter: Arc<dyn AgentAdapter>) -> Result<()> {
        // Simplified: just find files and call backfill_file
        // In a real implementation, we'd use a recursive walker
        Ok(())
    }

    async fn backfill_file(&self, agent_name: &str, file_path: &Path, adapter: Arc<dyn AgentAdapter>) -> Result<()> {
        let mut state = self.load_state(agent_name, file_path).await?;

        if state.status == BackfillStatus::Completed {
            return Ok(());
        }

        state.status = BackfillStatus::InProgress;
        self.save_state(&mut state).await?;

        // Simplified: parse whole file
        match adapter.parse_log_file(file_path).await {
            Ok(events) => {
                for event in events {
                    self.buffer.store(&event).await?;
                }
                state.status = BackfillStatus::Completed;
                state.completed_at = Some(Utc::now());
                state.total_events_processed = state.total_events_processed + 1; // Simplified
                self.save_state(&mut state).await?;
            }
            Err(e) => {
                state.status = BackfillStatus::Failed;
                state.error_message = Some(e.to_string());
                self.save_state(&mut state).await?;
                return Err(e);
            }
        }

        Ok(())
    }

    async fn load_state(&self, agent_name: &str, file_path: &Path) -> Result<BackfillState> {
        let path_str = file_path.to_string_lossy().to_string();
        let row = sqlx::query(
            "SELECT id, agent_name, log_file_path, last_byte_offset, last_timestamp, total_events_processed, status, started_at, completed_at, error_message FROM backfill_state WHERE agent_name = ? AND log_file_path = ?"
        )
        .bind(agent_name)
        .bind(&path_str)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            Ok(BackfillState {
                id: row.get(0),
                agent_name: row.get(1),
                log_file_path: row.get(2),
                last_byte_offset: row.get(3),
                last_timestamp: row.get::<Option<i64>, _>(4).map(|ts| Utc.timestamp_opt(ts, 0).unwrap()),
                total_events_processed: row.get(5),
                status: BackfillStatus::from(row.get::<String, _>(6)),
                started_at: Utc.timestamp_opt(row.get(7), 0).unwrap(),
                completed_at: row.get::<Option<i64>, _>(8).map(|ts| Utc.timestamp_opt(ts, 0).unwrap()),
                error_message: row.get(9),
            })
        } else {
            Ok(BackfillState {
                id: 0,
                agent_name: agent_name.to_string(),
                log_file_path: path_str,
                last_byte_offset: 0,
                last_timestamp: None,
                total_events_processed: 0,
                status: BackfillStatus::New,
                started_at: Utc::now(),
                completed_at: None,
                error_message: None,
            })
        }
    }

    async fn save_state(&self, state: &mut BackfillState) -> Result<()> {
        if state.id == 0 {
            let res = sqlx::query(
                r#"
                INSERT INTO backfill_state (agent_name, log_file_path, last_byte_offset, last_timestamp, total_events_processed, status, started_at, completed_at, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#
            )
            .bind(&state.agent_name)
            .bind(&state.log_file_path)
            .bind(state.last_byte_offset)
            .bind(state.last_timestamp.map(|ts| ts.timestamp()))
            .bind(state.total_events_processed)
            .bind(state.status.to_string())
            .bind(state.started_at.timestamp())
            .bind(state.completed_at.map(|ts| ts.timestamp()))
            .bind(&state.error_message)
            .execute(&self.pool)
            .await?;

            state.id = res.last_insert_rowid();
        } else {
            sqlx::query(
                r#"
                UPDATE backfill_state
                SET last_byte_offset = ?, last_timestamp = ?, total_events_processed = ?, status = ?, completed_at = ?, error_message = ?
                WHERE id = ?
                "#
            )
            .bind(state.last_byte_offset)
            .bind(state.last_timestamp.map(|ts| ts.timestamp()))
            .bind(state.total_events_processed)
            .bind(state.status.to_string())
            .bind(state.completed_at.map(|ts| ts.timestamp()))
            .bind(&state.error_message)
            .bind(state.id)
            .execute(&self.pool)
            .await?;
        }
        Ok(())
    }
}
