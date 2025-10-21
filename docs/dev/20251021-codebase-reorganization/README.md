# Codebase Reorganization - October 2025

**Status**: 📋 Planning  
**Started**: October 21, 2025  
**Timeline**: 4 weeks  
**Priority**: High

## 🎯 Objective

Reorganize the codebase to clearly reflect our pivot to **AI coding agent observability** as the primary value proposition, while keeping project management features as optional supporting functionality.

## 📄 Documents

| Document | Purpose | Status |
|----------|---------|--------|
| **[REORGANIZATION_PLAN.md](./REORGANIZATION_PLAN.md)** | Comprehensive 4-week reorganization plan | ✅ Complete |
| **[QUICK_WINS.md](./QUICK_WINS.md)** | Immediate actionable improvements (6-8 hours) | ✅ Complete |

## 🎯 Goals

### Primary Goals
1. **Clarify Vision**: Make it immediately obvious this is an AI agent observability platform
2. **Clean Code**: Organize code to match product architecture (agent observability > project management)
3. **Improve DX**: Better developer experience with logical structure
4. **Prepare for Scale**: Set foundation for Go integration and hybrid architecture

### Non-Goals
- ❌ Remove existing devlog entry functionality (preserve as secondary feature)
- ❌ Break existing APIs (maintain backward compatibility)
- ❌ Rewrite working code (focus on organization, not refactoring)

## 📊 Current State

### What's Good ✅
- Database schema already supports agent observability (agent_events, agent_sessions)
- Core services implemented (AgentEventService, AgentSessionService)
- Comprehensive design documentation
- Working MCP server infrastructure

### What's Messy ❌
- Mixed terminology ("devlog entry" vs "agent session" confusion)
- Code scattered across packages without clear feature domains
- Documentation emphasizes work tracking over observability
- No clear folder structure for agent observability features

## 🗺️ Reorganization Overview

### Phase 1: Documentation & Terminology (Week 1)
- Update READMEs to lead with agent observability
- Reorganize docs/ folder with clear feature hierarchy
- Create user guides for agent monitoring

### Phase 2: Code Structure (Week 2)  
- Create `agent-observability/` and `project-management/` folders in core
- Consolidate service layer with clear naming
- Update import paths and exports

### Phase 3: UI/UX (Week 3)
- Build agent dashboard as default landing page
- Reorganize web app structure (dashboard > sessions > analytics)
- Move devlog pages to nested project structure

### Phase 4: API & Integration (Week 4)
- Reorganize API routes by feature domain
- Group MCP tools (agent_* vs devlog_* tools)
- Create comprehensive API documentation

## 🚀 Getting Started

**Recommended Approach**: Start with [Quick Wins](./QUICK_WINS.md)

Quick wins provide immediate improvements (6-8 hours) without breaking changes:
1. Update documentation (READMEs, type comments)
2. Create folder structure (no code moves yet)
3. Organize MCP tools by category
4. Add service layer documentation

After quick wins, proceed with full reorganization plan.

## 📈 Success Metrics

- [ ] First-time visitors understand this is an AI agent observability tool
- [ ] Code organization matches mental model (agent features > project features)
- [ ] Developer onboarding time reduced by 50%
- [ ] All tests pass after reorganization
- [ ] No breaking changes to public APIs

## 🔗 Related Documents

- [AI Agent Observability Design](../20250115-ai-agent-observability/ai-agent-observability-design.md) - Full system design
- [Go Collector Roadmap](../20250115-ai-agent-observability/GO_COLLECTOR_ROADMAP.md) - Collector implementation plan
- [Performance Analysis](../20250115-ai-agent-observability/ai-agent-observability-performance-analysis.md) - Architecture justification

## 📝 Notes

### Key Decisions
1. **Preserve backward compatibility** - Don't break existing users
2. **Gradual migration** - Phase by phase, validate each step
3. **Documentation first** - Update docs before moving code
4. **Low-risk start** - Begin with quick wins to build confidence

### Open Questions
- [ ] Repository rename from "devlog" to something else?
- [ ] API versioning strategy during reorganization?
- [ ] Timeline for deprecating legacy terminology completely?
- [ ] Should we create a "classic" branch for pre-reorganization code?

---

**Last Updated**: October 21, 2025  
**Next Review**: After Phase 1 completion
