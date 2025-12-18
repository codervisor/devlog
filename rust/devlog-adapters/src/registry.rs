use crate::AgentAdapter;
use std::collections::HashMap;
use std::sync::Arc;

pub struct Registry {
    adapters: HashMap<String, Arc<dyn AgentAdapter>>,
}

impl Registry {
    pub fn new() -> Self {
        Self {
            adapters: HashMap::new(),
        }
    }

    pub fn register(&mut self, adapter: Arc<dyn AgentAdapter>) {
        self.adapters.insert(adapter.name().to_string(), adapter);
    }

    pub fn get(&self, name: &str) -> Option<Arc<dyn AgentAdapter>> {
        self.adapters.get(name).cloned()
    }

    pub fn list(&self) -> Vec<Arc<dyn AgentAdapter>> {
        self.adapters.values().cloned().collect()
    }
}

impl Default for Registry {
    fn default() -> Self {
        Self::new()
    }
}
