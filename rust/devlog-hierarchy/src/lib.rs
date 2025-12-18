use devlog_core::Workspace;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use anyhow::{Result, anyhow};
use log::{info, debug};

#[derive(Debug, Clone)]
pub struct WorkspaceContext {
    pub project_id: i32,
    pub machine_id: i32,
    pub workspace_id: i32,
    pub project_name: String,
    pub machine_name: String,
}

pub struct HierarchyCache {
    workspaces: Arc<RwLock<HashMap<String, WorkspaceContext>>>,
}

impl HierarchyCache {
    pub fn new() -> Self {
        Self {
            workspaces: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn initialize(&self, workspaces: Vec<Workspace>) {
        let mut map = self.workspaces.write().await;
        for ws in workspaces {
            let ctx = WorkspaceContext {
                project_id: ws.project_id,
                machine_id: ws.machine_id,
                workspace_id: ws.id.unwrap_or(0),
                project_name: ws.project.as_ref().map(|p| p.full_name.clone()).unwrap_or_default(),
                machine_name: ws.machine.as_ref().map(|m| m.hostname.clone()).unwrap_or_default(),
            };
            map.insert(ws.workspace_id, ctx);
        }
        info!("Hierarchy cache initialized with {} workspaces", map.len());
    }

    pub async fn resolve(&self, workspace_id: &str) -> Result<WorkspaceContext> {
        let map = self.workspaces.read().await;
        if let Some(ctx) = map.get(workspace_id) {
            debug!("Cache hit for workspace: {}", workspace_id);
            return Ok(ctx.clone());
        }

        // In a real implementation, we'd fetch from backend here
        Err(anyhow!("workspace not found in cache: {}", workspace_id))
    }

    pub async fn add(&self, ws: Workspace) {
        let mut map = self.workspaces.write().await;
        let workspace_id = ws.workspace_id.clone();
        let ctx = WorkspaceContext {
            project_id: ws.project_id,
            machine_id: ws.machine_id,
            workspace_id: ws.id.unwrap_or(0),
            project_name: ws.project.as_ref().map(|p| p.full_name.clone()).unwrap_or_default(),
            machine_name: ws.machine.as_ref().map(|m| m.hostname.clone()).unwrap_or_default(),
        };
        map.insert(workspace_id.clone(), ctx);
        debug!("Added workspace to cache: {}", workspace_id);
    }
}

impl Default for HierarchyCache {
    fn default() -> Self {
        Self::new()
    }
}
