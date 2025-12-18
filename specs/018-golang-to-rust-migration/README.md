---
status: planned
created: '2025-12-18'
tags:
  - migration
  - rust
  - backend
  - architecture
  - rewrite
priority: high
assignee: marvin
created_at: '2025-12-18T01:00:49.397Z'
---

# Migrate Devlog from Go to Rust

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-12-18

## Overview

Full rewrite of devlog from Go to Rust. Since the project is in early development phase, we'll do a clean rewrite instead of incremental migration. This allows us to leverage Rust's memory safety, performance, and type system without compromises.

**Key Goals:**
- Clean rewrite with improved architecture
- Leverage Rust's type system and ownership model
- Better error handling with Result types
- Enhanced performance for parsing and buffering operations
- Maintain functional compatibility (same features, better implementation)

**Scope:**
- All internal packages (adapters, buffer, watcher, hierarchy, backfill)
- Main collector service
- Configuration management
- Simplified Docker setup
- Drop-in replacement for existing Go binary

## Design

### Architecture Principles

**1. Clean Rewrite Strategy**
- No FFI bridge - pure Rust implementation
- Reference Go implementation for behavior, not code structure
- Opportunity to improve architecture based on lessons learned
- Simplify where Go was over-engineered

**2. Type System Leverage**
- Strong typing for all data structures
- `Result<T, E>` for error handling (no panics in production code)
- Use `Option<T>` instead of nullable pointers
- Leverage Serde for JSON serialization
- Trait-based polymorphism for cleaner abstractions

**3. Performance Targets**
- Parsing: 30% faster than current Go implementation
- Memory: 20% reduction in collector memory footprint
- Startup: <100ms cold start time
- Binary size: <20MB (compared to Go's ~15MB)

### Component Mapping

| Go Package | Rust Equivalent | Notes |
|------------|-----------------|-------|
| `internal/adapters` | `devlog_adapters` | Use trait system for polymorphism |
| `internal/buffer` | `devlog_buffer` | Replace channels with async Tokio |
| `internal/watcher` | `devlog_watcher` | Use `notify` crate for file watching |
| `internal/hierarchy` | `devlog_hierarchy` | Tree structures with Rc/RefCell |
| `internal/backfill` | `devlog_backfill` | Async processing with rayon |
| `cmd/devlog` | `devlog_cli` | Use `clap` for CLI parsing |

### Key Technology Choices

**Async Runtime:** Tokio
- Industry standard
- Excellent ecosystem support
- Compatible with most Rust async libraries

**Error Handling:** `thiserror` + `anyhow`
- `thiserror` for library errors
- `anyhow` for application errors
- Structured error context throughout

**Serialization:** Serde
- JSON compatibility with existing APIs
- Better performance than Go's encoding/json

**File Watching:** `notify`
- Cross-platform file system events
- Proven reliability

**CLI:** `clap` v4
- Declarative API
- Auto-generated help text
- Shell completion support

## Plan

### Phase 1: Foundation & Setup (Week 1)
- [ ] Initialize Rust workspace structure
- [ ] Set up Cargo workspace with sub-crates
- [ ] Configure CI/CD for Rust builds
- [ ] Set up development tooling (clippy, rustfmt, cargo-watch)
- [ ] Create project structure matching Rust idioms

### Phase 2: Core Types & Models (Week 1-2)
- [ ] Port `pkg/types` to Rust types
- [ ] Implement `pkg/models` with Serde support
- [ ] Create shared error types
- [ ] Add comprehensive tests for type conversions
- [ ] Benchmark serialization performance

### Phase 3: Configuration System (Week 2)
- [ ] Port `internal/config` to Rust
- [ ] Use `config` crate for YAML/TOML support
- [ ] Maintain backward compatibility with existing configs
- [ ] Add config validation with meaningful errors

### Phase 4: Buffer System (Week 2-3)
- [ ] Implement circular buffer with Tokio channels
- [ ] Port buffering logic from Go
- [ ] Add backpressure handling
- [ ] Performance test against Go implementation
- [ ] Ensure thread-safety guarantees

### Phase 5: Adapters (Week 3-4)
- [ ] Design adapter trait system
- [ ] Port Claude adapter
- [ ] Port Copilot adapter  
- [ ] Port remaining adapters
- [ ] Add adapter registry
- [ ] Integration tests for each adapter

### Phase 6: File Watcher (Week 4)
- [ ] Implement file system watcher with `notify` crate
- [ ] Port hierarchy building logic
- [ ] Add debouncing for file events
- [ ] Test cross-platform behavior

### Phase 7: Backfill System (Week 4-5)
- [ ] Port historical sync logic
- [ ] Implement async batch processing
- [ ] Add progress tracking
- [ ] Performance optimization

### Phase 8: Main Collector Service (Week 5-6)
- [ ] Port main service initialization
- [ ] Implement HTTP/WebSocket server with `axum`
- [ ] Add health check endpoints
- [ ] Port signal handling
- [ ] Integration testing

### Phase 9: CLI & Tooling (Week 6)
- [ ] Port CLI commands with `clap`
- [ ] Add shell completion support
- [ ] Maintain command compatibility
- [ ] Update documentation

### Phase 10: Final Testing & Deployment (Week 7)
- [ ] End-to-end testing against Go version for behavior parity
- [ ] Performance benchmarking
- [ ] Memory profiling
- [ ] Docker image optimization
- [ ] Update deployment scripts
- [ ] Remove Go codebase
- [ ] Update all documentation
- [ ] Update CONTRIBUTING.md
- [ ] Final performance validation

## Test

### Unit Testing
- [ ] All core types have property tests with `proptest`
- [ ] Adapter implementations tested in isolation
- [ ] Buffer system stress tested (high load scenarios)
- [ ] Configuration parsing edge cases covered
- [ ] Error handling paths validated

### Integration Testing
- [ ] End-to-end collector pipeline test
- [ ] File watcher integration with real file operations
- [ ] Adapter compatibility with actual AI services (mocked)
- [ ] Backfill process with historical data
- [ ] CLI commands match Go behavior

### Performance Testing
- [ ] Parsing throughput ≥ 1.3x Go implementation
- [ ] Memory usage ≤ 0.8x Go implementation
- [ ] Cold start time < 100ms
- [ ] Event processing latency < 5ms p99
- [ ] Sustained load test (24hr stability)

### Compatibility Testing
- [ ] Existing config files work without modification
- [ ] Same functionality as Go version
- [ ] Docker container works with same docker-compose.yml
- [ ] Environment variables honored
- [ ] Signal handling (SIGTERM, SIGINT) works correctly

### Replacement Validation
- [ ] Functional parity test suite (behavior comparison)
- [ ] Performance meets or exceeds Go version
- [ ] Memory usage validated
- [ ] Deployment smoke tests

## Notes

### Why Rust?

**Memory Safety:** Eliminates entire classes of bugs (use-after-free, data races) that are possible in Go despite its garbage collector.

**Performance:** Zero-cost abstractions and no GC pauses make Rust ideal for high-throughput parsing and buffering operations.

**Type System:** More expressive type system with traits, enums, and pattern matching leads to more maintainable code.

**Ecosystem:** Excellent libraries for async (Tokio), serialization (Serde), CLI (clap), and web (axum).

### Alternatives Considered

**Keep Go:**
- ✅ No migration effort
- ❌ Type safety limitations
- ❌ GC pause times affect latency
- ❌ Less control over memory layout

**Rewrite in TypeScript/Node:**
- ✅ Familiar ecosystem
- ❌ Performance concerns for high-throughput
- ❌ Single-threaded limitations

### Risk Mitigation

**Risk:** Breaking functional behavior during rewrite
- *Mitigation:* Reference Go implementation for behavior tests, comprehensive integration tests

**Risk:** Performance regressions
- *Mitigation:* Benchmark each component against Go baseline

**Risk:** Team learning curve
- *Mitigation:* Start with simpler components, leverage Rust resources

**Risk:** Dependency on Rust ecosystem maturity
- *Mitigation:* Use only well-maintained crates with >1M downloads

**Risk:** Loss of momentum with full rewrite
- *Mitigation:* Build in phases but deploy as complete replacement, no partial migration

### Open Questions

1. **Workspace Structure:** Monorepo with multiple crates or single binary?
   - *Leaning toward:* Workspace with separate crates for better organization

2. **Database Migration:** If we add persistence later, SQLite or embedded DB?
   - *Decision deferred:* Out of scope for initial migration

3. **Cross-compilation:** Support for ARM64 Macs immediately?
   - *Answer:* Yes, Rust has excellent cross-compilation support

4. **Go Code Preservation:** Keep Go code in separate branch for reference?
   - *Answer:* Yes, create `archive/go-implementation` branch before deletion

### References

- [Tokio Documentation](https://tokio.rs/)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [The Rust Performance Book](https://nnethercote.github.io/perf-book/)
- Internal: See `lean-spec` project for Rust migration example
