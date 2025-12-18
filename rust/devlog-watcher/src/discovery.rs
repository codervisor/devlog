use std::path::{Path, PathBuf};
use std::collections::HashMap;
use anyhow::{Result, anyhow};
use glob::glob;

pub struct DiscoveredLog {
    pub agent_name: String,
    pub path: PathBuf,
    pub is_dir: bool,
    pub exists: bool,
}

pub fn get_agent_log_locations() -> HashMap<String, HashMap<String, Vec<String>>> {
    let mut locations = HashMap::new();

    // Copilot
    let mut copilot = HashMap::new();
    copilot.insert("macos".to_string(), vec![
        "~/Library/Application Support/Code/User/workspaceStorage/*/chatSessions".to_string(),
        "~/Library/Application Support/Code - Insiders/User/workspaceStorage/*/chatSessions".to_string(),
    ]);
    copilot.insert("linux".to_string(), vec![
        "~/.config/Code/User/workspaceStorage/*/chatSessions".to_string(),
        "~/.config/Code - Insiders/User/workspaceStorage/*/chatSessions".to_string(),
    ]);
    copilot.insert("windows".to_string(), vec![
        "%APPDATA%\\Code\\User\\workspaceStorage\\*\\chatSessions".to_string(),
        "%APPDATA%\\Code - Insiders\\User\\workspaceStorage\\*\\chatSessions".to_string(),
    ]);
    locations.insert("copilot".to_string(), copilot);

    // Claude
    let mut claude = HashMap::new();
    claude.insert("macos".to_string(), vec![
        "~/.claude/logs".to_string(),
        "~/Library/Application Support/Claude/logs".to_string(),
        "~/Library/Logs/Claude".to_string(),
    ]);
    claude.insert("linux".to_string(), vec![
        "~/.claude/logs".to_string(),
        "~/.config/claude/logs".to_string(),
        "~/.local/share/claude/logs".to_string(),
    ]);
    claude.insert("windows".to_string(), vec![
        "%APPDATA%\\Claude\\logs".to_string(),
        "%LOCALAPPDATA%\\Claude\\logs".to_string(),
    ]);
    locations.insert("claude".to_string(), claude);

    // Add others as needed...
    locations
}

pub fn discover_agent_logs(agent_name: &str) -> Result<Vec<DiscoveredLog>> {
    let os_name = if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else {
        "linux"
    };

    let locations = get_agent_log_locations();
    let agent_locations = locations.get(agent_name).ok_or_else(|| anyhow!("unknown agent: {}", agent_name))?;
    let patterns = agent_locations.get(os_name).ok_or_else(|| anyhow!("agent {} not supported on {}", agent_name, os_name))?;

    let mut discovered = Vec::new();

    for pattern in patterns {
        let expanded = expand_path(pattern);
        if let Ok(entries) = glob(&expanded) {
            for entry in entries {
                if let Ok(path) = entry {
                    if let Ok(metadata) = std::fs::metadata(&path) {
                        discovered.push(DiscoveredLog {
                            agent_name: agent_name.to_string(),
                            path,
                            is_dir: metadata.is_dir(),
                            exists: true,
                        });
                    }
                }
            }
        }
    }

    Ok(discovered)
}

pub fn discover_all_agent_logs() -> Result<HashMap<String, Vec<DiscoveredLog>>> {
    let mut result = HashMap::new();
    let locations = get_agent_log_locations();

    for agent_name in locations.keys() {
        if let Ok(logs) = discover_agent_logs(agent_name) {
            if !logs.is_empty() {
                result.insert(agent_name.clone(), logs);
            }
        }
    }

    Ok(result)
}

pub fn expand_path(path: &str) -> String {
    let mut expanded = path.to_string();

    // Expand ~
    if expanded.starts_with("~/") {
        if let Some(home_dir) = dirs::home_dir() {
            expanded = expanded.replacen("~/", &format!("{}/", home_dir.display()), 1);
        }
    }

    // Expand environment variables
    if cfg!(target_os = "windows") {
        // Simple %VAR% expansion
        for (key, value) in std::env::vars() {
            let pattern = format!("%{}%", key);
            expanded = expanded.replace(&pattern, &value);
        }
    } else {
        // Simple $VAR expansion
        for (key, value) in std::env::vars() {
            let pattern = format!("${}", key);
            expanded = expanded.replace(&pattern, &value);
            let pattern_braces = format!("${{{}}}", key);
            expanded = expanded.replace(&pattern_braces, &value);
        }
    }

    expanded
}

pub fn is_log_file(path: &Path) -> bool {
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    let base = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_lowercase();

    let log_extensions = ["log", "txt", "json", "jsonl", "ndjson"];
    if log_extensions.contains(&ext.as_str()) {
        return true;
    }

    let log_patterns = ["log", "output", "console", "trace", "debug", "error", "access"];
    for pattern in log_patterns {
        if base.contains(pattern) {
            return true;
        }
    }

    false
}
