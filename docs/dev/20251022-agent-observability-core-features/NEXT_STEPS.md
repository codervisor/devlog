# Agent Observability - Next Steps

**Last Updated**: October 22, 2025  
**Current Phase**: Phase 1 Complete - Foundation Built  
**Status**: Ready for Phase 2

## 📊 Current Progress Summary

### ✅ Completed (Phase 1)
- [x] Dashboard with real-time metrics (active sessions, events today, avg duration, events/min)
- [x] Sessions page with active and recent history views
- [x] Backend API routes (`/api/dashboard/stats`, `/api/dashboard/activity`, `/api/sessions`)
- [x] React server components for data display
- [x] Type-safe implementation with error handling
- [x] Empty states with user guidance
- [x] Comprehensive documentation

**Deliverables**: 13 files, 1,370+ lines of code, full build validation

## 🎯 Prioritized Roadmap

### Phase 2: Interactive Features (Immediate - 1-2 weeks)

#### 1. Real-Time Updates via Server-Sent Events (SSE)
**Priority**: 🔴 Critical  
**Effort**: Medium (2-3 days)  
**Value**: High - Makes dashboard feel alive

**What to Build:**
- [ ] Create `/api/events/stream` endpoint for SSE
- [ ] Implement event broadcasting when new sessions/events are created
- [ ] Update dashboard components to use client-side SSE subscription
- [ ] Add connection status indicator
- [ ] Handle reconnection logic
- [ ] Add fallback to polling if SSE unavailable

**Technical Approach:**
```typescript
// New API route: apps/web/app/api/events/stream/route.ts
export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to database changes
      // Broadcast events to controller
    }
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// Client component: apps/web/components/agent-observability/dashboard/live-stats.tsx
'use client';
export function LiveStats() {
  useEffect(() => {
    const eventSource = new EventSource('/api/events/stream');
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Update state with new data
    };
  }, []);
}
```

**Files to Modify:**
- `apps/web/app/api/events/stream/route.ts` (NEW)
- `apps/web/components/agent-observability/dashboard/dashboard-stats.tsx` (convert to client component)
- `apps/web/components/agent-observability/dashboard/recent-activity.tsx` (add live updates)
- `apps/web/components/agent-observability/dashboard/active-sessions.tsx` (add live updates)

---

#### 2. Session Details Page
**Priority**: 🔴 Critical  
**Effort**: Medium (2-3 days)  
**Value**: High - Essential for debugging and analysis

**What to Build:**
- [ ] Create `/sessions/[id]` route with detailed session view
- [ ] Display complete event timeline for the session
- [ ] Show metrics: tokens used, files modified, duration breakdown
- [ ] Add event filtering and search within session
- [ ] Display session context and objectives
- [ ] Show related work items if applicable

**Page Structure:**
```
/sessions/[id]
├── Session Header (objective, status, duration, outcome)
├── Metrics Summary (tokens, events count, files modified)
├── Event Timeline
│   ├── Filter controls (by type, severity)
│   ├── Search box
│   └── Event cards with timestamps
└── Session Context (environment, config, metadata)
```

**Files to Create:**
- `apps/web/app/sessions/[id]/page.tsx` (NEW)
- `apps/web/components/agent-observability/sessions/session-details.tsx` (NEW)
- `apps/web/components/agent-observability/sessions/event-timeline.tsx` (NEW)
- `apps/web/components/agent-observability/sessions/session-metrics.tsx` (NEW)

**API Enhancement:**
- Update `/api/sessions/[id]/route.ts` to return detailed session data
- Add `/api/sessions/[id]/events/route.ts` for session event timeline

---

#### 3. Multi-Project Support
**Priority**: 🟡 High  
**Effort**: Medium (2-3 days)  
**Value**: High - Removes major limitation

**What to Build:**
- [ ] Update API routes to query all user's projects instead of hardcoded `projectId: 1`
- [ ] Add project filter dropdown to dashboard
- [ ] Add project filter dropdown to sessions page
- [ ] Persist selected project in URL or local storage
- [ ] Add "All Projects" option for aggregate view
- [ ] Update service layer to handle multi-project queries

**Implementation Steps:**
1. Create `/api/projects/me` endpoint to list user's projects
2. Update dashboard API routes to accept `projectId` query param (optional)
3. Add project selector component
4. Update service calls to aggregate across projects when no filter selected

**Files to Modify:**
- `apps/web/app/api/dashboard/stats/route.ts` (support projectId param)
- `apps/web/app/api/dashboard/activity/route.ts` (support projectId param)
- `apps/web/app/api/sessions/route.ts` (support projectId param)
- `apps/web/components/agent-observability/dashboard/project-selector.tsx` (NEW)
- `apps/web/app/dashboard/page.tsx` (add project selector)
- `apps/web/app/sessions/page.tsx` (add project selector)

---

### Phase 3: Enhanced Filtering & Search (2-3 weeks)

#### 4. Advanced Filtering UI
**Priority**: 🟡 High  
**Effort**: Medium-High (4-5 days)  
**Value**: Medium - Improves usability

**What to Build:**
- [ ] Filter panel component for sessions page
- [ ] Agent type dropdown filter
- [ ] Outcome status filter (success/failure/partial/cancelled)
- [ ] Date range picker for time-based filtering
- [ ] Search input for session objectives/summaries
- [ ] URL persistence for all filters
- [ ] Clear filters button
- [ ] Filter result count display

**UI Components:**
```
┌─────────────────────────────────────────┐
│  🔍 Search sessions...                  │
├─────────────────────────────────────────┤
│  Agent Type: [All ▼]                    │
│  Outcome: [All ▼]                       │
│  Date Range: [Last 7 days ▼]           │
│  [Clear Filters]         [123 results]  │
└─────────────────────────────────────────┘
```

**Files to Create:**
- `apps/web/components/agent-observability/sessions/filter-panel.tsx` (NEW)
- `apps/web/components/agent-observability/sessions/search-input.tsx` (NEW)
- `apps/web/components/agent-observability/sessions/date-range-picker.tsx` (NEW)

---

#### 5. Session Search & Pagination
**Priority**: 🟢 Medium  
**Effort**: Medium (3-4 days)  
**Value**: Medium - Scales to large datasets

**What to Build:**
- [ ] Full-text search across session objectives and summaries
- [ ] Pagination controls (Previous/Next, Page numbers)
- [ ] Items per page selector (10, 25, 50, 100)
- [ ] Total count display
- [ ] Loading states during pagination
- [ ] Preserve filters during pagination

**Files to Create:**
- `apps/web/components/agent-observability/sessions/pagination-controls.tsx` (NEW)
- Update `apps/web/app/api/sessions/route.ts` to support full-text search

---

### Phase 4: Analytics & Insights (3-4 weeks)

#### 6. Analytics Dashboard
**Priority**: 🟢 Medium  
**Effort**: High (5-7 days)  
**Value**: High - Provides insights

**What to Build:**
- [ ] Create `/analytics` route
- [ ] Session success rate chart (line chart over time)
- [ ] Agent activity heatmap (by day/hour)
- [ ] Most active agents (bar chart)
- [ ] Average session duration trends
- [ ] Token usage trends
- [ ] Common error patterns
- [ ] Performance benchmarks

**Visualization Library**: Use Recharts (already in Next.js ecosystem)

**Files to Create:**
- `apps/web/app/analytics/page.tsx` (NEW)
- `apps/web/components/agent-observability/analytics/success-rate-chart.tsx` (NEW)
- `apps/web/components/agent-observability/analytics/activity-heatmap.tsx` (NEW)
- `apps/web/components/agent-observability/analytics/agent-comparison.tsx` (NEW)
- `apps/web/app/api/analytics/trends/route.ts` (NEW)

---

#### 7. Go Collector Integration
**Priority**: 🟢 Medium  
**Effort**: High (5-7 days)  
**Value**: High - Enables real data collection

**What to Build:**
- [ ] Complete Go collector implementation (currently 20% done)
- [ ] Add event buffering and batch sending
- [ ] Implement retry logic with exponential backoff
- [ ] Add collector health checks
- [ ] Test end-to-end data flow from collectors to dashboard
- [ ] Document integration guide for users
- [ ] Create example collector configurations

**Files to Work On:**
- `packages/collector-go/` (complete implementation)
- Create integration tests
- Add documentation in `docs/`

---

### Phase 5: Performance & Quality (Ongoing)

#### 8. Performance Optimizations
**Priority**: 🟢 Medium  
**Effort**: Medium (3-4 days)  
**Value**: Medium - Improves user experience at scale

**What to Build:**
- [ ] Add Redis caching for dashboard stats (5-minute TTL)
- [ ] Implement Incremental Static Regeneration (ISR) for static content
- [ ] Add database indexes on frequently queried fields
- [ ] Optimize queries with query plan analysis
- [ ] Add request rate limiting to API routes
- [ ] Implement response compression

---

#### 9. Testing & Quality Assurance
**Priority**: 🟡 High  
**Effort**: High (7-10 days)  
**Value**: High - Ensures reliability

**What to Build:**
- [ ] E2E tests with Playwright for critical workflows
  - Dashboard loads and displays metrics
  - Sessions page filtering
  - Session details page navigation
- [ ] Unit tests for API routes
- [ ] Integration tests for service layer
- [ ] Load testing for high-volume scenarios (1000+ events/min)
- [ ] Error handling tests
- [ ] Performance regression tests

**Testing Structure:**
```
tests/
├── e2e/
│   ├── dashboard.spec.ts
│   ├── sessions.spec.ts
│   └── session-details.spec.ts
├── api/
│   ├── dashboard-stats.test.ts
│   ├── dashboard-activity.test.ts
│   └── sessions.test.ts
└── integration/
    ├── agent-session-service.test.ts
    └── agent-event-service.test.ts
```

---

## 📋 Implementation Strategy

### Recommended Order
1. **Week 1-2**: Phase 2 items #1-3 (Real-time updates, Session details, Multi-project)
2. **Week 3-4**: Phase 3 items #4-5 (Advanced filtering, Search & pagination)
3. **Week 5-7**: Phase 4 items #6-7 (Analytics dashboard, Go collector)
4. **Week 8-9**: Phase 5 items #8-9 (Performance, Testing)

### Dependencies
- Real-time updates (#1) should be done before analytics (#6)
- Session details page (#2) is independent and can be done in parallel
- Multi-project support (#3) is a prerequisite for advanced filtering (#4)
- Go collector (#7) can be developed in parallel with UI work

### Success Metrics
- **User Engagement**: Time spent on dashboard increases by 50%
- **Feature Adoption**: 80% of sessions viewed in detail within first week
- **Performance**: Dashboard loads in <2 seconds with 1000+ sessions
- **Reliability**: 99.9% uptime for real-time updates
- **Data Volume**: Support 10,000+ events/day without degradation

## 🎯 Quick Wins (Can be done anytime)

These smaller improvements can be done opportunistically:

- [ ] Add keyboard shortcuts for navigation (Cmd+K for search)
- [ ] Add export to CSV functionality for sessions
- [ ] Add session comparison feature (compare 2 sessions side-by-side)
- [ ] Add dark mode support
- [ ] Add customizable dashboard widgets
- [ ] Add notification preferences
- [ ] Add session bookmarking/favorites
- [ ] Add session notes/annotations

## 📚 Resources Needed

### External Libraries (evaluate/add as needed)
- **Recharts** (v2.x) - For analytics charts
- **date-fns** (already included) - Date manipulation
- **react-hot-toast** - Better notification system for real-time updates
- **@tanstack/react-query** - For client-side data fetching and caching (if moving to client components)

### Documentation to Create
- [ ] Real-time events API documentation
- [ ] Session details page user guide
- [ ] Multi-project setup guide
- [ ] Analytics interpretation guide
- [ ] Go collector integration tutorial
- [ ] Performance tuning guide

## 🔄 Review & Iteration

**Review Cadence**: After each phase
- Validate with users
- Gather feedback
- Adjust priorities
- Update this document

**Next Review**: After Phase 2 completion (estimated 2 weeks)

---

**For Questions**: Review [README.md](./README.md) and [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)  
**Last Updated**: October 22, 2025
