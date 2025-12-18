use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use anyhow::{Result, Context, anyhow};
use regex::Regex;
use std::env;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub version: String,
    pub backend_url: String,
    pub api_key: String,
    pub project_id: String,
    pub collection: CollectionConfig,
    pub buffer: BufferConfig,
    pub backfill: BackfillConfig,
    pub agents: HashMap<String, AgentConfig>,
    pub logging: LoggingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionConfig {
    pub batch_size: i32,
    pub batch_interval: String,
    pub max_retries: i32,
    pub retry_backoff: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BufferConfig {
    pub enabled: bool,
    pub max_size: usize,
    pub db_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackfillConfig {
    pub db_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfig {
    pub enabled: bool,
    pub log_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoggingConfig {
    pub level: String,
    pub file: String,
}

impl Default for Config {
    fn default() -> Self {
        let home_dir = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let devlog_dir = home_dir.join(".devlog");

        let mut agents = HashMap::new();
        agents.insert("copilot".to_string(), AgentConfig { enabled: true, log_path: "auto".to_string() });
        agents.insert("claude".to_string(), AgentConfig { enabled: true, log_path: "auto".to_string() });
        agents.insert("cursor".to_string(), AgentConfig { enabled: true, log_path: "auto".to_string() });

        Self {
            version: "1.0".to_string(),
            backend_url: "http://localhost:3200".to_string(),
            api_key: "".to_string(),
            project_id: "default".to_string(),
            collection: CollectionConfig {
                batch_size: 100,
                batch_interval: "5s".to_string(),
                max_retries: 3,
                retry_backoff: "exponential".to_string(),
            },
            buffer: BufferConfig {
                enabled: true,
                max_size: 10000,
                db_path: devlog_dir.join("buffer.db").to_string_lossy().to_string(),
            },
            backfill: BackfillConfig {
                db_path: devlog_dir.join("backfill.db").to_string_lossy().to_string(),
            },
            agents,
            logging: LoggingConfig {
                level: "info".to_string(),
                file: devlog_dir.join("collector.log").to_string_lossy().to_string(),
            },
        }
    }
}

impl Config {
    pub fn load(path: &str) -> Result<Self> {
        let path = expand_path(path);
        
        let mut s = config::Config::builder();
        
        // Start with defaults
        let default_config = Self::default();
        
        if Path::new(&path).exists() {
            s = s.add_source(config::File::with_name(&path));
        }
        
        let mut config: Config = s.build()?.try_deserialize()?;
        
        // Expand environment variables
        config.expand_env_vars()?;
        
        // Validate
        config.validate()?;
        
        Ok(config)
    }

    fn expand_env_vars(&mut self) -> Result<()> {
        let re = Regex::new(r"\$\{([^}]+)\}")?;
        
        let expand = |s: &str| -> String {
            re.replace_all(s, |caps: &regex::Captures| {
                let var_name = &caps[1];
                env::var(var_name).unwrap_or_else(|_| caps[0].to_string())
            }).to_string()
        };

        self.backend_url = expand(&self.backend_url);
        self.api_key = expand(&self.api_key);
        self.project_id = expand(&self.project_id);
        self.buffer.db_path = expand_path(&expand(&self.buffer.db_path));
        self.backfill.db_path = expand_path(&expand(&self.backfill.db_path));
        self.logging.file = expand_path(&expand(&self.logging.file));

        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        if self.version.is_empty() {
            return Err(anyhow!("version is required"));
        }
        if self.backend_url.is_empty() {
            return Err(anyhow!("backendUrl is required"));
        }
        if !self.backend_url.starts_with("http://") && !self.backend_url.starts_with("https://") {
            return Err(anyhow!("backendUrl must start with http:// or https://"));
        }
        if self.api_key.is_empty() {
            return Err(anyhow!("apiKey is required"));
        }
        if self.project_id.is_empty() {
            return Err(anyhow!("projectId is required"));
        }
        if self.collection.batch_size < 1 || self.collection.batch_size > 1000 {
            return Err(anyhow!("collection.batchSize must be between 1 and 1000"));
        }
        if self.buffer.max_size < 100 || self.buffer.max_size > 100000 {
            return Err(anyhow!("buffer.maxSize must be between 100 and 100000"));
        }
        
        let valid_log_levels = ["debug", "info", "warn", "error"];
        if !valid_log_levels.contains(&self.logging.level.as_str()) {
            return Err(anyhow!("logging.level must be one of: debug, info, warn, error"));
        }

        Ok(())
    }
}

fn expand_path(path: &str) -> String {
    if path.starts_with("~/") {
        if let Some(home_dir) = dirs::home_dir() {
            return path.replacen("~", &home_dir.to_string_lossy(), 1);
        }
    }
    
    // Expand environment variables
    let expanded = env::var(path).unwrap_or_else(|_| path.to_string());
    expanded
}

mod dirs {
    use std::path::PathBuf;
    pub fn home_dir() -> Option<PathBuf> {
        #[cfg(not(windows))]
        {
            std::env::var_os("HOME").map(PathBuf::from)
        }
        #[cfg(windows)]
        {
            std::env::var_os("USERPROFILE").map(PathBuf::from)
        }
    }
}
