use clap::{Parser, Subcommand};
use anyhow::Result;
use devlog_core::AgentEvent;
use devlog_adapters::{Registry, claude::ClaudeAdapter};
use devlog_buffer::{Buffer, Config as BufferConfig};
use devlog_watcher::{Watcher, Config as WatcherConfig};
use devlog_backfill::{BackfillManager, Config as BackfillConfig};
use std::sync::Arc;
use log::{info, error};
use std::path::PathBuf;

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

    match cli.command {
        Commands::Start { no_history, initial_sync_days } => {
            info!("Starting Devlog Collector...");
            info!("Initial sync days: {}", initial_sync_days);
            
            // Initialize components
            let mut registry = Registry::new();
            registry.register(Arc::new(ClaudeAdapter::new("default".to_string())));
            let registry = Arc::new(registry);

            let buffer = Arc::new(Buffer::new(BufferConfig {
                db_path: "devlog.db".to_string(),
                max_size: 10000,
            }).await?);

            let (mut watcher, mut rx) = Watcher::new(WatcherConfig {
                registry: registry.clone(),
                event_queue_size: 1000,
                debounce_ms: 100,
            })?;

            // Start processing events
            tokio::spawn(async move {
                while let Some(event) = rx.recv().await {
                    info!("Received event: {} - {}", event.event_type, event.id);
                    // In a real implementation, we'd send to backend or buffer
                }
            });

            info!("Collector started. Press Ctrl+C to stop.");
            tokio::signal::ctrl_c().await?;
            info!("Shutting down...");
        }
        Commands::Version => {
            println!("Devlog Collector v{}", env!("CARGO_PKG_VERSION"));
        }
        Commands::Status => {
            println!("📊 Devlog Collector Status");
            println!("==========================");
            // TODO: implement status check
        }
        Commands::Backfill { command } => {
            match command {
                BackfillCommands::Run { agent, path } => {
                    info!("Running backfill for {} at {}", agent, path.display());
                    // TODO: implement backfill run
                }
                BackfillCommands::Status { agent } => {
                    info!("Checking backfill status for {:?}", agent);
                    // TODO: implement backfill status
                }
            }
        }
    }

    Ok(())
}
