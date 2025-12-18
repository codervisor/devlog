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
use tokio::io::{AsyncBufReadExt, BufReader, AsyncSeekExt};
use walkdir::WalkDir;

pub struct BackfillManager {
    registry: Arc<Registry>,
    buffer: Arc<Buffer>,
    pool: SqlitePool,
}

#[derive(Debug, Clone, Copy, PartialEq)]
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

pub struct BackfillOptions {
    pub agent_name: String,
    pub log_path: PathBuf,
    pub batch_size: usize,
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

    pub async fn backfill(&self, options: BackfillOptions) -> Result<()> {
        let adapter = self.registry.get(&options.agent_name).ok_or_else(|| anyhow!("adapter not found: {}", options.agent_name))?;
        
        if options.log_path.is_dir() {
            self.backfill_directory(&options, adapter).await?;
        } else {
            self.backfill_file(&options.agent_name, &options.log_path, adapter, options.batch_size).await?;
        }

        Ok(())
    }

    async fn backfill_directory(&self, options: &BackfillOptions, adapter: Arc<dyn AgentAdapter>) -> Result<()> {
        info!("Scanning directory: {}", options.log_path.display());
        
        let mut log_files = Vec::new();
        for entry in WalkDir::new(&options.log_path).into_iter().filter_map(|e| e.ok()) {
            if entry.file_type().is_file() {
                if let Some(ext) = entry.path().extension() {
                    if ext == "log" || ext == "txt" || ext == "json" || ext == "jsonl" || ext == "ndjson" {
                        log_files.push(entry.path().to_path_buf());
                    }
                }
            }
        }

        info!("Found {} log files", log_files.len());

        for log_file in log_files {
            info!("Processing file: {}", log_file.display());
            if let Err(e) = self.backfill_file(&options.agent_name, &log_file, adapter.clone(), options.batch_size).await {
                warn!("Failed to process {}: {}", log_file.display(), e);
            }
        }

        Ok(())
    }

    async fn backfill_file(&self, agent_name: &str, file_path: &Path, adapter: Arc<dyn AgentAdapter>, batch_size: usize) -> Result<()> {
        let mut state = self.load_state(agent_name, file_path).await?;

        if state.status == BackfillStatus::Completed {
            info!("File already processed: {}", file_path.display());
            return Ok(());
        }

        state.status = BackfillStatus::InProgress;
        self.save_state(&mut state).await?;

        // Determine if we should use file-based or line-based parsing
        let use_file_parsing = self.should_use_file_parsing(adapter.as_ref(), file_path);

        let result = if use_file_parsing {
            self.backfill_file_whole(agent_name, file_path, adapter, &mut state, batch_size).await
        } else {
            self.backfill_file_line_by_line(agent_name, file_path, adapter, &mut state, batch_size).await
        };

        match result {
            Ok(_) => {
                state.status = BackfillStatus::Completed;
                state.completed_at = Some(Utc::now());
                self.save_state(&mut state).await?;
                info!("Completed backfill for {}", file_path.display());
            }
            Err(e) => {
                state.status = BackfillStatus::Failed;
                state.error_message = Some(e.to_string());
                self.save_state(&mut state).await?;
                error!("Failed backfill for {}: {}", file_path.display(), e);
                return Err(e);
            }
        }

        Ok(())
    }

    fn should_use_file_parsing(&self, adapter: &dyn AgentAdapter, file_path: &Path) -> bool {
        let ext = file_path.extension().and_then(|e| e.to_str()).unwrap_or("");
        let adapter_name = adapter.name();

        if adapter_name == "copilot" && ext == "json" {
            return true;
        }

        false
    }

    async fn backfill_file_whole(&self, _agent_name: &str, file_path: &Path, adapter: Arc<dyn AgentAdapter>, state: &mut BackfillState, batch_size: usize) -> Result<()> {
        let events = adapter.parse_log_file(file_path).await?;
        info!("Parsed {} events from {}", events.len(), file_path.display());

        for chunk in events.chunks(batch_size) {
            for event in chunk {
                self.buffer.store(event).await?;
            }
            state.total_events_processed += chunk.len() as i32;
            if let Some(last) = chunk.last() {
                state.last_timestamp = Some(last.timestamp);
            }
            self.save_state(state).await?;
        }

        Ok(())
    }

    async fn backfill_file_line_by_line(&self, _agent_name: &str, file_path: &Path, adapter: Arc<dyn AgentAdapter>, state: &mut BackfillState, batch_size: usize) -> Result<()> {
        let file = File::open(file_path).await?;
        let file_size = file.metadata().await?.len() as i64;
        
        let mut reader = BufReader::new(file);
        if state.last_byte_offset > 0 {
            reader.seek(std::io::SeekFrom::Start(state.last_byte_offset as u64)).await?;
        }

        let mut lines = reader.lines();
        let mut batch = Vec::with_capacity(batch_size);
        let mut current_offset = state.last_byte_offset;

        while let Some(line) = lines.next_line().await? {
            let line_len = line.len() as i64 + 1; // +1 for newline
            current_offset += line_len;

            if let Some(event) = adapter.parse_log_line(&line)? {
                batch.push(event);
            }

            if batch.len() >= batch_size {
                for event in &batch {
                    self.buffer.store(event).await?;
                }
                state.total_events_processed += batch.len() as i32;
                state.last_byte_offset = current_offset;
                if let Some(last) = batch.last() {
                    state.last_timestamp = Some(last.timestamp);
                }
                self.save_state(state).await?;
                batch.clear();
            }
        }

        if !batch.is_empty() {
            for event in &batch {
                self.buffer.store(event).await?;
            }
            state.total_events_processed += batch.len() as i32;
            state.last_byte_offset = current_offset;
            if let Some(last) = batch.last() {
                state.last_timestamp = Some(last.timestamp);
            }
            self.save_state(state).await?;
        }

        state.last_byte_offset = file_size;
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

