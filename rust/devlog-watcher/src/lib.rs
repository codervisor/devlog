use devlog_core::AgentEvent;
use devlog_adapters::{Registry, AgentAdapter};
use notify::{Watcher as _, RecursiveMode, Event, EventKind};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::mpsc;
use anyhow::{Result, Context};
use std::collections::HashMap;
use tokio::sync::Mutex;
use log::{info, warn, error, debug};
use std::time::Duration;

pub mod discovery;

pub struct Watcher {
    registry: Arc<Registry>,
    event_tx: mpsc::Sender<AgentEvent>,
    watcher: Box<dyn notify::Watcher + Send>,
    watching: Arc<Mutex<HashMap<PathBuf, Arc<dyn AgentAdapter>>>>,
}

pub struct Config {
    pub registry: Arc<Registry>,
    pub event_queue_size: usize,
    pub debounce_ms: u64,
}

impl Watcher {
    pub fn new(config: Config) -> Result<(Self, mpsc::Receiver<AgentEvent>)> {
        let (tx, rx) = mpsc::channel(config.event_queue_size);
        let tx_clone = tx.clone();
        
        let watching = Arc::new(Mutex::new(HashMap::new()));
        let watching_clone = watching.clone();

        let watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
            if let Ok(event) = res {
                let tx = tx_clone.clone();
                let watching = watching_clone.clone();
                
                tokio::spawn(async move {
                    if let Err(e) = Self::handle_event(event, tx, watching).await {
                        error!("Error handling file event: {}", e);
                    }
                });
            }
        })?;

        Ok((Self {
            registry: config.registry,
            event_tx: tx,
            watcher: Box::new(watcher),
            watching,
        }, rx))
    }

    async fn handle_event(
        event: Event,
        tx: mpsc::Sender<AgentEvent>,
        watching: Arc<Mutex<HashMap<PathBuf, Arc<dyn AgentAdapter>>>>,
    ) -> Result<()> {
        match event.kind {
            EventKind::Modify(_) | EventKind::Create(_) => {
                for path in event.paths {
                    if discovery::is_log_file(&path) {
                        let watching_map = watching.lock().await;
                        if let Some(adapter) = watching_map.get(&path) {
                            let adapter = adapter.clone();
                            drop(watching_map);
                            
                            // Read and parse file
                            // In a real implementation, we'd track the last read position
                            // For now, we'll just parse the whole file (simplified)
                            if let Ok(events) = adapter.parse_log_file(&path).await {
                                for event in events {
                                    let _ = tx.send(event).await;
                                }
                            }
                        }
                    }
                }
            }
            _ => {}
        }
        Ok(())
    }

    pub async fn watch(&mut self, path: PathBuf, adapter: Arc<dyn AgentAdapter>) -> Result<()> {
        let mut watching = self.watching.lock().await;
        if watching.contains_key(&path) {
            return Ok(());
        }

        if path.is_dir() {
            self.watcher.watch(&path, RecursiveMode::Recursive)?;
            // For directories, we might need to find all log files first
            // and add them to the map, or handle new files in handle_event
        } else {
            self.watcher.watch(&path, RecursiveMode::NonRecursive)?;
        }

        watching.insert(path.clone(), adapter);
        info!("Watching path: {}", path.display());
        Ok(())
    }
}
