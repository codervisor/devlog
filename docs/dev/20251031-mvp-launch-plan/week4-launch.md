# Week 4: UI & Launch

**Timeline**: November 23-30, 2025  
**Focus**: Web UI with hierarchy navigation + production deployment  
**Status**: 📋 Planned  

---

## 🎯 Objectives

1. Build hierarchy navigation UI components
2. Update dashboard with machine/workspace breakdown
3. Implement hierarchical filtering
4. Production deployment and launch
5. Post-launch monitoring

---

## 📅 Daily Plan

### Day 1-2: Hierarchy Navigation UI

**Time**: 2 days (16 hours)  
**Priority**: HIGH - User-facing feature

#### Tasks

- [ ] **Project Hierarchy Page** (8 hours)
  ```typescript
  // apps/web/app/projects/[id]/hierarchy/page.tsx
  
  import { HierarchyTree } from '@/components/hierarchy/hierarchy-tree';
  import { hierarchyService } from '@/lib/services';
  
  export default async function ProjectHierarchyPage({
    params,
  }: {
    params: { id: string };
  }) {
    const hierarchy = await hierarchyService.getProjectHierarchy(
      parseInt(params.id)
    );
    
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{hierarchy.project.fullName}</h1>
          <p className="text-muted-foreground">{hierarchy.project.description}</p>
        </div>
        
        <HierarchyTree hierarchy={hierarchy} />
      </div>
    );
  }
  ```

- [ ] **Hierarchy Tree Component** (6 hours)
  ```typescript
  // apps/web/components/hierarchy/hierarchy-tree.tsx
  
  'use client';
  
  import { useState } from 'react';
  import { ChevronRight, ChevronDown, Monitor, Folder, MessageSquare } from 'lucide-react';
  import { ProjectHierarchy } from '@codervisor/devlog-core';
  
  export function HierarchyTree({ hierarchy }: { hierarchy: ProjectHierarchy }) {
    const [expandedMachines, setExpandedMachines] = useState<Set<number>>(new Set());
    const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<number>>(new Set());
    
    const toggleMachine = (machineId: number) => {
      setExpandedMachines(prev => {
        const next = new Set(prev);
        if (next.has(machineId)) {
          next.delete(machineId);
        } else {
          next.add(machineId);
        }
        return next;
      });
    };
    
    const toggleWorkspace = (workspaceId: number) => {
      setExpandedWorkspaces(prev => {
        const next = new Set(prev);
        if (next.has(workspaceId)) {
          next.delete(workspaceId);
        } else {
          next.add(workspaceId);
        }
        return next;
      });
    };
    
    return (
      <div className="space-y-2">
        {hierarchy.machines.map(({ machine, workspaces }) => {
          const isExpanded = expandedMachines.has(machine.id);
          const totalWorkspaces = workspaces.length;
          const totalSessions = workspaces.reduce((sum, w) => sum + w.sessions.length, 0);
          const totalEvents = workspaces.reduce((sum, w) => sum + w.eventCount, 0);
          
          return (
            <div key={machine.id} className="border rounded-lg p-4">
              <button
                onClick={() => toggleMachine(machine.id)}
                className="flex items-center gap-2 w-full text-left hover:bg-accent rounded p-2"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <Monitor className="w-5 h-5" />
                <div className="flex-1">
                  <div className="font-semibold">{machine.hostname}</div>
                  <div className="text-sm text-muted-foreground">
                    {machine.machineType} • {machine.osType}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {totalWorkspaces} workspaces • {totalSessions} sessions • {totalEvents} events
                </div>
              </button>
              
              {isExpanded && (
                <div className="ml-8 mt-2 space-y-2">
                  {workspaces.map(({ workspace, sessions, eventCount }) => {
                    const isWsExpanded = expandedWorkspaces.has(workspace.id);
                    
                    return (
                      <div key={workspace.id} className="border-l-2 pl-4">
                        <button
                          onClick={() => toggleWorkspace(workspace.id)}
                          className="flex items-center gap-2 w-full text-left hover:bg-accent rounded p-2"
                        >
                          {isWsExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <Folder className="w-4 h-4" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{workspace.workspacePath}</div>
                            <div className="text-xs text-muted-foreground">
                              {workspace.branch && `Branch: ${workspace.branch}`}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {sessions.length} sessions • {eventCount} events
                          </div>
                        </button>
                        
                        {isWsExpanded && (
                          <div className="ml-6 mt-2 space-y-1">
                            {sessions.map(session => (
                              <a
                                key={session.id}
                                href={`/sessions/${session.sessionId}`}
                                className="flex items-center gap-2 p-2 hover:bg-accent rounded text-sm"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <div className="flex-1">
                                  <div>{new Date(session.startedAt).toLocaleString()}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {session.agentType} • {session.messageCount} messages
                                  </div>
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  ```

- [ ] **Testing** (2 hours)
  - Test expand/collapse
  - Test with large hierarchies (100+ workspaces)
  - Test responsive design
  - Accessibility testing

#### Success Criteria

- ✅ Hierarchy tree renders correctly
- ✅ Expand/collapse works smoothly
- ✅ Performance good with 100+ nodes
- ✅ Accessible (keyboard navigation)

---

### Day 3: Hierarchical Filtering

**Time**: 1 day (8 hours)  
**Priority**: HIGH

#### Tasks

- [ ] **Filter Component** (4 hours)
  ```typescript
  // apps/web/components/hierarchy/hierarchy-filter.tsx
  
  'use client';
  
  import { useEffect, useState } from 'react';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
  import { useRouter, useSearchParams } from 'next/navigation';
  
  export function HierarchyFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [projects, setProjects] = useState([]);
    const [machines, setMachines] = useState([]);
    const [workspaces, setWorkspaces] = useState([]);
    
    const selectedProject = searchParams.get('projectId');
    const selectedMachine = searchParams.get('machineId');
    const selectedWorkspace = searchParams.get('workspaceId');
    
    // Load projects on mount
    useEffect(() => {
      fetch('/api/projects')
        .then(res => res.json())
        .then(setProjects);
    }, []);
    
    // Load machines when project selected
    useEffect(() => {
      if (selectedProject) {
        fetch(`/api/projects/${selectedProject}/machines`)
          .then(res => res.json())
          .then(setMachines);
      } else {
        setMachines([]);
      }
    }, [selectedProject]);
    
    // Load workspaces when machine selected
    useEffect(() => {
      if (selectedMachine) {
        fetch(`/api/machines/${selectedMachine}/workspaces`)
          .then(res => res.json())
          .then(setWorkspaces);
      } else {
        setWorkspaces([]);
      }
    }, [selectedMachine]);
    
    const updateFilter = (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams);
      
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      
      // Clear child filters when parent changes
      if (key === 'projectId') {
        params.delete('machineId');
        params.delete('workspaceId');
      } else if (key === 'machineId') {
        params.delete('workspaceId');
      }
      
      router.push(`?${params.toString()}`);
    };
    
    return (
      <div className="flex gap-2">
        <Select
          value={selectedProject || undefined}
          onValueChange={value => updateFilter('projectId', value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id.toString()}>
                {project.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedProject && (
          <Select
            value={selectedMachine || undefined}
            onValueChange={value => updateFilter('machineId', value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select machine" />
            </SelectTrigger>
            <SelectContent>
              {machines.map(machine => (
                <SelectItem key={machine.id} value={machine.id.toString()}>
                  {machine.hostname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {selectedMachine && (
          <Select
            value={selectedWorkspace || undefined}
            onValueChange={value => updateFilter('workspaceId', value)}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map(workspace => (
                <SelectItem key={workspace.id} value={workspace.id.toString()}>
                  {workspace.workspacePath}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  }
  ```

- [ ] **Update Dashboard** (3 hours)
  - Add filter component to dashboard
  - Update queries to use filters
  - Add URL state persistence
  - Update real-time updates to respect filters

- [ ] **Testing** (1 hour)
  - Test filter cascade
  - Test URL state
  - Test with real-time updates

#### Success Criteria

- ✅ Filtering works at all levels
- ✅ URL state persists
- ✅ Real-time updates filtered correctly
- ✅ Smooth user experience

---

### Day 4: Dashboard Enhancements

**Time**: 1 day (8 hours)  
**Priority**: MEDIUM

#### Tasks

- [ ] **Activity by Machine Widget** (3 hours)
  ```typescript
  // apps/web/components/dashboard/machine-activity-widget.tsx
  
  'use client';
  
  import { useEffect, useState } from 'react';
  import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
  
  export function MachineActivityWidget({ projectId }: { projectId?: number }) {
    const [data, setData] = useState([]);
    
    useEffect(() => {
      const query = projectId ? `?projectId=${projectId}` : '';
      
      fetch(`/api/stats/machine-activity${query}`)
        .then(res => res.json())
        .then(setData);
    }, [projectId]);
    
    return (
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Activity by Machine</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="hostname" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="sessionCount" fill="#8884d8" name="Sessions" />
            <Bar dataKey="eventCount" fill="#82ca9d" name="Events" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }
  ```

- [ ] **Workspace Heatmap Widget** (3 hours)
  - Show activity heatmap by workspace
  - Color code by event density
  - Interactive tooltips

- [ ] **Session Timeline Widget** (2 hours)
  - Show session timeline with hierarchy context
  - Group by machine/workspace
  - Clickable for details

#### Success Criteria

- ✅ Widgets display data correctly
- ✅ Interactive and responsive
- ✅ Performance good with lots of data

---

### Day 5: Production Deployment

**Time**: 1 day (8 hours)  
**Priority**: CRITICAL

#### Tasks

- [ ] **Environment Setup** (2 hours)
  - Production PostgreSQL + TimescaleDB (RDS/managed)
  - Enable compression and retention policies
  - Set up connection pooling
  - Configure backups (daily, 30-day retention)

- [ ] **Web Deployment** (2 hours)
  - Deploy to Vercel/production
  - Configure environment variables
  - Set up monitoring (Sentry)
  - Enable SSL
  - Configure CDN

- [ ] **Collector Distribution** (3 hours)
  ```bash
  # Build for all platforms
  cd packages/collector-go
  make build-all
  
  # Outputs:
  # bin/devlog-collector-darwin-amd64
  # bin/devlog-collector-darwin-arm64
  # bin/devlog-collector-linux-amd64
  # bin/devlog-collector-linux-arm64
  # bin/devlog-collector-windows-amd64.exe
  
  # Create npm package
  cd ../collector-npm
  npm version 1.0.0
  npm publish
  ```

- [ ] **Final Smoke Test** (1 hour)
  - Install collector on test machine
  - Verify events flow to production
  - Test dashboard loads
  - Test hierarchy navigation
  - Test real-time updates

#### Success Criteria

- ✅ All services running
- ✅ Collector installable via npm
- ✅ Events flowing correctly
- ✅ Dashboard loads <2s
- ✅ Monitoring active

---

### Day 6: Launch Day! 🚀

**Timeline**: November 30, 2025

#### Morning (9:00 AM)

- [ ] **Final Pre-flight Checks**
  - [ ] All services healthy
  - [ ] Database migrations applied
  - [ ] Monitoring dashboards showing data
  - [ ] Error rate at 0%
  - [ ] Backup tested

- [ ] **Smoke Tests**
  - [ ] Install collector
  - [ ] Verify machine/workspace detection
  - [ ] Process sample chat session
  - [ ] Check event in database
  - [ ] Verify dashboard shows event
  - [ ] Test real-time updates
  - [ ] Test hierarchy navigation

#### Launch (10:00 AM)

- [ ] **Go Live**
  - [ ] Send launch announcement
  - [ ] Share on social media
  - [ ] Post in relevant communities
  - [ ] Update website

- [ ] **Monitor (First Hour)**
  - [ ] Watch error rates (target: <0.1%)
  - [ ] Watch API response times (<200ms P95)
  - [ ] Watch event ingestion rate
  - [ ] Watch database CPU/memory
  - [ ] Respond to questions immediately

#### Afternoon (2:00 PM)

- [ ] **Health Check**
  - [ ] Review metrics from first 4 hours
  - [ ] Check user feedback
  - [ ] Review error logs
  - [ ] Verify backups ran

- [ ] **Issue Response**
  - [ ] Address critical bugs immediately
  - [ ] Document known issues
  - [ ] Update FAQ if needed

#### Evening (6:00 PM)

- [ ] **Day 0 Review**
  - Total users: ___
  - Total events: ___
  - Error rate: ___%
  - P95 latency: ___ms
  - Critical issues: ___

- [ ] **🎉 Celebrate!**
  - Team acknowledgment
  - Document launch metrics
  - Plan for tomorrow

---

### Day 7: Post-Launch Monitoring

**Time**: 1 day (8 hours)  
**Priority**: CRITICAL

#### Tasks

- [ ] **Monitor Key Metrics** (ongoing)
  - Error rate (target: <0.1%)
  - API latency (target: <200ms P95)
  - Event processing rate
  - Database performance
  - User growth

- [ ] **User Support** (4 hours)
  - Respond to questions (<4 hour response time)
  - Fix critical bugs same-day
  - Update documentation based on feedback
  - Track feature requests

- [ ] **Bug Fixes** (3 hours)
  - Address any issues found
  - Deploy hotfixes if needed
  - Update tests

- [ ] **Week 1 Planning** (1 hour)
  - Plan improvements
  - Prioritize feature requests
  - Schedule next iteration

#### Success Criteria

- ✅ No critical bugs
- ✅ Error rate <0.1%
- ✅ User feedback collected
- ✅ Support response time <4 hours

---

## 📊 Week 4 Success Metrics

### Functionality
- ✅ Hierarchy navigation working
- ✅ Filtering working at all levels
- ✅ Dashboard widgets functional
- ✅ Collector installable
- ✅ Real-time updates working

### Performance
- ✅ Dashboard load: <2s
- ✅ API latency: <200ms P95
- ✅ Hierarchy tree: smooth with 100+ nodes
- ✅ Real-time updates: <5s latency

### Quality
- ✅ All features tested
- ✅ Zero critical bugs at launch
- ✅ Documentation complete
- ✅ Monitoring configured

### Launch
- ✅ 10+ users in first week
- ✅ 1000+ events collected
- ✅ Error rate <0.1%
- ✅ Uptime >99.9%

---

## 🎉 Launch Success Criteria

Launch is considered successful if (Day 7):

**Adoption**:
- ✅ 10+ users installed collector
- ✅ 1000+ events collected
- ✅ 3+ projects tracked

**Stability**:
- ✅ Error rate <0.1% average
- ✅ Zero critical bugs
- ✅ Zero data loss incidents
- ✅ Uptime >99.9%

**Performance**:
- ✅ API latency <200ms P95
- ✅ Dashboard load <2s
- ✅ Event processing >500 events/sec

**User Satisfaction**:
- ✅ Positive feedback >80%
- ✅ Support response time <4 hours
- ✅ Feature requests documented
- ✅ No complaints about data loss

---

**Related**: [Launch Checklist](./launch-checklist.md) | [MVP Launch Plan](./README.md)
