use clap::{Parser, Subcommand, CommandFactory};
use clap_complete::{generate, Shell};
use anyhow::Result;
use devlog_core::{AgentEvent, config::Config};
use devlog_adapters::{Registry, claude::ClaudeAdapter, copilot::CopilotAdapter, cursor::CursorAdapter};
use devlog_buffer::{Buffer, Config as BufferConfig};
use devlog_watcher::{Watcher, Config as WatcherConfig};
use devlog_backfill::{BackfillManager, Config as BackfillConfig, BackfillOptions};
use std::sync::Arc;
use log::{info, error};
use std::path::PathBuf;

use devlog_cli::server;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    #[arg(short, long, default_value = "~/.devlog/collector.json")]
    config: String,

    #[arg(short, long)]
    verbose: bool,
}

#[derive(Subcommand)]
enum Commands {
    /// Start the collector daemon
    Start {
        #[arg(long)]
        no_history: bool,

        #[arg(long, default_value_t = 90)]
        initial_sync_days: i32,

        #[arg(short, long, default_value_t = 3200)]
        port: u16,
    },
    /// Print version information
    Version,
    /// Check collector status
    Status,
    /// Manage backfill operations
    Backfill {
        #[command(subcommand)]
        command: BackfillCommands,
    },
    /// Generate shell completions
    Completions {
        #[arg(value_enum)]
        shell: Shell,
    },
}

#[derive(Subcommand)]
enum BackfillCommands {
    /// Run backfill operation
    Run {
        #[arg(short, long)]
        agent: String,
        #[arg(short, long)]
        path: PathBuf,
    },
    /// Check backfill status
    Status {
        #[arg(short, long)]
        agent: Option<String>,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    if cli.verbose {
        std::env::set_var("RUST_LOG", "debug");
    } else {
        std::env::set_var("RUST_LOG", "info");
    }
    env_logger::init();

    // Load config
    let config = Config::load(&cli.config)?;

    match cli.command {
        Commands::Start { no_history, initial_sync_days, port } => {
            info!("Starting Devlog Collector...");
            info!("Initial sync days: {}", initial_sync_days);
            
            // Initialize components
            let mut registry = Registry::new();
            registry.register(Arc::new(ClaudeAdapter::new(config.project_id.clone())));
            registry.register(Arc::new(CopilotAdapter::new(config.project_id.clone())));
            registry.register(Arc::new(CursorAdapter::new(config.project_id.clone())));
            let registry = Arc::new(registry);

            let buffer = Arc::new(Buffer::new(BufferConfig {
                db_path: config.buffer.db_path.clone(),
                max_size: config.buffer.max_size,
            }).await?);

            let (mut watcher, mut rx) = Watcher::new(WatcherConfig {
                registry: registry.clone(),
                event_queue_size: 1000,
                debounce_ms: 100,
            })?;

            // Start processing events from watcher
            let buffer_clone = buffer.clone();
            tokio::spawn(async move {
                while let Some(event) = rx.recv().await {
                    info!("Received event from watcher: {} - {}", event.event_type, event.id);
                    if let Err(e) = buffer_clone.store(&event).await {
                        error!("Failed to store event from watcher: {}", e);
                    }
                }
            });

            // Start HTTP server
            let server_state = Arc::new(server::AppState {
                buffer: buffer.clone(),
            });
            
            tokio::spawn(async move {
                if let Err(e) = server::start_server(server_state, port).await {
                    error!("Server error: {}", e);
                }
            });

            info!("Collector started on port {}. Press Ctrl+C to stop.", port);
            tokio::signal::ctrl_c().await?;
            info!("Shutting down...");
        }
        Commands::Version => {
            println!("Devlog Collector v{}", env!("CARGO_PKG_VERSION"));
        }
        Commands::Status => {
            println!("📊 Devlog Collector Status");
            println!("==========================");
            println!("Config: {}", cli.config);
            println!("Project ID: {}", config.project_id);
            println!("Backend URL: {}", config.backend_url);
            // TODO: implement more status checks
        }
        Commands::Backfill { command } => {
            // Initialize components for backfill
            let mut registry = Registry::new();
            registry.register(Arc::new(ClaudeAdapter::new(config.project_id.clone())));
            registry.register(Arc::new(CopilotAdapter::new(config.project_id.clone())));
            registry.register(Arc::new(CursorAdapter::new(config.project_id.clone())));
            let registry = Arc::new(registry);

            let buffer = Arc::new(Buffer::new(BufferConfig {
                db_path: config.buffer.db_path.clone(),
                max_size: config.buffer.max_size,
            }).await?);

            let manager = BackfillManager::new(BackfillConfig {
                registry: registry.clone(),
                buffer: buffer.clone(),
                db_path: config.backfill.db_path.clone(),
            }).await?;

            match command {
                BackfillCommands::Run { agent, path } => {
                    info!("Running backfill for {} at {}", agent, path.display());
                    manager.backfill(BackfillOptions {
                        agent_name: agent,
                        log_path: path,
                        batch_size: 100,
                    }).await?;
                }
                BackfillCommands::Status { agent } => {
                    info!("Checking backfill status for {:?}", agent);
                    // TODO: implement backfill status
                }
            }
        }
        Commands::Completions { shell } => {
            let mut cmd = Cli::command();
            let name = cmd.get_name().to_string();
            generate(shell, &mut cmd, name, &mut std::io::stdout());
        }
    }

    Ok(())
}
