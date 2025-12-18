use async_trait::async_trait;
use devlog_core::AgentEvent;
use std::path::Path;
use anyhow::Result;

#[async_trait]
pub trait AgentAdapter: Send + Sync {
    fn name(&self) -> &str;
    fn parse_log_line(&self, line: &str) -> Result<Option<AgentEvent>>;
    async fn parse_log_file(&self, file_path: &Path) -> Result<Vec<AgentEvent>>;
    fn supports_format(&self, sample: &str) -> bool;
}

pub mod claude;
pub mod copilot;
pub mod registry;

pub use registry::Registry;
