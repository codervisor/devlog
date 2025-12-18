use devlog_core::AgentEvent;
use sqlx::{sqlite::SqlitePool, Row};
use anyhow::{Result, Context};
use std::path::Path;
use chrono::Utc;

pub struct Buffer {
    pool: SqlitePool,
    max_size: usize,
}

pub struct Config {
    pub db_path: String,
    pub max_size: usize,
}

impl Buffer {
    pub async fn new(config: Config) -> Result<Self> {
        let db_url = format!("sqlite:{}", config.db_path);
        
        // Create file if it doesn't exist
        if !Path::new(&config.db_path).exists() {
            if let Some(parent) = Path::new(&config.db_path).parent() {
                tokio::fs::create_dir_all(parent).await?;
            }
            tokio::fs::File::create(&config.db_path).await?;
        }

        let pool = SqlitePool::connect(&db_url).await.context("failed to connect to sqlite")?;

        let buffer = Self {
            pool,
            max_size: if config.max_size == 0 { 10000 } else { config.max_size },
        };

        buffer.init_schema().await?;

        Ok(buffer)
    }

    async fn init_schema(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                agent_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                project_id INTEGER NOT NULL,
                data TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp);
            CREATE INDEX IF NOT EXISTS idx_created_at ON events(created_at);
            "#
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn store(&self, event: &AgentEvent) -> Result<()> {
        let count = self.count().await?;

        if count >= self.max_size {
            self.evict_oldest().await?;
        }

        let data_json = serde_json::to_string(event)?;

        sqlx::query(
            r#"
            INSERT INTO events (event_id, timestamp, agent_id, session_id, project_id, data, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&event.id)
        .bind(event.timestamp.timestamp())
        .bind(&event.agent_id)
        .bind(&event.session_id)
        .bind(event.project_id)
        .bind(data_json)
        .bind(Utc::now().timestamp())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn retrieve(&self, limit: i32) -> Result<Vec<AgentEvent>> {
        let rows = sqlx::query("SELECT data FROM events ORDER BY created_at ASC LIMIT ?")
            .bind(limit)
            .fetch_all(&self.pool)
            .await?;

        let mut events = Vec::new();
        for row in rows {
            let data_json: String = row.get(0);
            let event: AgentEvent = serde_json::from_str(&data_json)?;
            events.push(event);
        }

        Ok(events)
    }

    pub async fn delete(&self, event_ids: &[String]) -> Result<()> {
        if event_ids.is_empty() {
            return Ok(());
        }

        // Build query with placeholders
        let placeholders = vec!["?"; event_ids.len()].join(",");
        let query_str = format!("DELETE FROM events WHERE event_id IN ({})", placeholders);

        let mut query = sqlx::query(&query_str);
        for id in event_ids {
            query = query.bind(id);
        }

        query.execute(&self.pool).await?;

        Ok(())
    }

    pub async fn count(&self) -> Result<usize> {
        let row = sqlx::query("SELECT COUNT(*) FROM events")
            .fetch_one(&self.pool)
            .await?;

        let count: i64 = row.get(0);
        Ok(count as usize)
    }

    async fn evict_oldest(&self) -> Result<()> {
        sqlx::query(
            "DELETE FROM events WHERE id = (SELECT id FROM events ORDER BY created_at ASC LIMIT 1)"
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn clear(&self) -> Result<()> {
        sqlx::query("DELETE FROM events").execute(&self.pool).await?;
        Ok(())
    }

    pub async fn vacuum(&self) -> Result<()> {
        sqlx::query("VACUUM").execute(&self.pool).await?;
        Ok(())
    }
}
