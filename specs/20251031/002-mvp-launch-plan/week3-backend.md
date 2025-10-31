# Week 3: Backend & API

**Timeline**: November 16-22, 2025  
**Focus**: Hierarchy-aware backend API + real-time dashboard updates  
**Status**: 📋 Planned  

---

## 🎯 Objectives

1. Implement hierarchy-aware backend API endpoints
2. Create hierarchy resolution service
3. Update dashboard with real-time hierarchy context
4. Optimize performance with TimescaleDB features
5. Comprehensive API testing

---

## 📅 Daily Plan

### Day 1-2: Hierarchy Service Layer

**Time**: 2 days (16 hours)  
**Priority**: CRITICAL - Foundation for all API endpoints

#### Tasks

- [ ] **Create HierarchyService** (6 hours)
  ```typescript
  // packages/core/src/project-management/hierarchy/hierarchy-service.ts
  
  export interface WorkspaceContext {
    projectId: number;
    machineId: number;
    workspaceId: number;
    projectName: string;
    machineName: string;
  }
  
  export interface ProjectHierarchy {
    project: Project;
    machines: Array<{
      machine: Machine;
      workspaces: Array<{
        workspace: Workspace;
        sessions: ChatSession[];
        eventCount: number;
      }>;
    }>;
  }
  
  export class HierarchyService {
    constructor(private prisma: PrismaClient) {}
    
    // Resolve workspace to full context
    async resolveWorkspace(workspaceId: string): Promise<WorkspaceContext> {
      const workspace = await this.prisma.workspace.findUnique({
        where: { workspaceId },
        include: {
          project: true,
          machine: true,
        },
      });
      
      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
      
      return {
        projectId: workspace.project.id,
        machineId: workspace.machine.id,
        workspaceId: workspace.id,
        projectName: workspace.project.fullName,
        machineName: workspace.machine.hostname,
      };
    }
    
    // Get full hierarchy tree for a project
    async getProjectHierarchy(projectId: number): Promise<ProjectHierarchy> {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          workspaces: {
            include: {
              machine: true,
              chatSessions: {
                include: {
                  _count: {
                    select: { agentEvents: true },
                  },
                },
              },
            },
          },
        },
      });
      
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }
      
      // Group workspaces by machine
      const machineMap = new Map<number, typeof project.workspaces>();
      for (const workspace of project.workspaces) {
        const machineId = workspace.machine.id;
        if (!machineMap.has(machineId)) {
          machineMap.set(machineId, []);
        }
        machineMap.get(machineId)!.push(workspace);
      }
      
      // Transform to hierarchy structure
      const machines = Array.from(machineMap.entries()).map(([machineId, workspaces]) => ({
        machine: workspaces[0].machine,
        workspaces: workspaces.map(ws => ({
          workspace: ws,
          sessions: ws.chatSessions,
          eventCount: ws.chatSessions.reduce(
            (sum, s) => sum + s._count.agentEvents,
            0
          ),
        })),
      }));
      
      return { project, machines };
    }
    
    // Upsert machine
    async upsertMachine(data: MachineCreateInput): Promise<Machine> {
      return this.prisma.machine.upsert({
        where: { machineId: data.machineId },
        create: data,
        update: {
          lastSeenAt: new Date(),
          osVersion: data.osVersion,
          ipAddress: data.ipAddress,
          metadata: data.metadata,
        },
      });
    }
    
    // Upsert workspace
    async upsertWorkspace(data: WorkspaceCreateInput): Promise<Workspace> {
      return this.prisma.workspace.upsert({
        where: { workspaceId: data.workspaceId },
        create: data,
        update: {
          lastSeenAt: new Date(),
          branch: data.branch,
          commit: data.commit,
        },
      });
    }
    
    // Resolve or create project from git URL
    async resolveProject(repoUrl: string): Promise<Project> {
      const normalized = this.normalizeGitUrl(repoUrl);
      const { owner, repo } = this.parseGitUrl(normalized);
      
      return this.prisma.project.upsert({
        where: { repoUrl: normalized },
        create: {
          name: repo,
          fullName: `${owner}/${repo}`,
          repoUrl: normalized,
          repoOwner: owner,
          repoName: repo,
        },
        update: {
          updatedAt: new Date(),
        },
      });
    }
    
    private normalizeGitUrl(url: string): string {
      // Convert SSH to HTTPS and normalize
      url = url.replace(/^git@github\.com:/, 'https://github.com/');
      url = url.replace(/\.git$/, '');
      return url;
    }
    
    private parseGitUrl(url: string): { owner: string; repo: string } {
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        throw new Error(`Invalid GitHub URL: ${url}`);
      }
      return { owner: match[1], repo: match[2] };
    }
  }
  ```

- [ ] **Create Service Factory** (2 hours)
  ```typescript
  // packages/core/src/index.ts
  
  export function createHierarchyService(prisma: PrismaClient): HierarchyService {
    return new HierarchyService(prisma);
  }
  ```

- [ ] **Write Comprehensive Tests** (6 hours)
  - Test workspace resolution
  - Test project hierarchy building
  - Test machine upsert
  - Test workspace upsert
  - Test project resolution from git URLs
  - Test edge cases (missing data, invalid URLs)

- [ ] **Integration Testing** (2 hours)
  - Test with real database
  - Test performance with 100+ workspaces
  - Benchmark query times

#### Success Criteria

- ✅ All service methods work correctly
- ✅ Tests pass with >80% coverage
- ✅ Hierarchy resolution <50ms P95
- ✅ No N+1 query issues

---

### Day 3: API Endpoints - Machines & Workspaces

**Time**: 1 day (8 hours)  
**Priority**: HIGH

#### Tasks

- [ ] **Machine Endpoints** (3 hours)
  ```typescript
  // apps/web/app/api/machines/route.ts
  
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { hierarchyService } from '@/lib/services';
  
  // POST /api/machines - Upsert machine
  export async function POST(req: NextRequest) {
    try {
      const data = await req.json();
      
      // Validate input
      const validated = MachineCreateSchema.parse(data);
      
      // Upsert machine
      const machine = await hierarchyService.upsertMachine(validated);
      
      return NextResponse.json(machine, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
  }
  
  // GET /api/machines - List all machines
  export async function GET(req: NextRequest) {
    try {
      const machines = await prisma.machine.findMany({
        orderBy: { lastSeenAt: 'desc' },
        include: {
          _count: {
            select: { workspaces: true },
          },
        },
      });
      
      return NextResponse.json(machines);
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
  
  // apps/web/app/api/machines/[id]/route.ts
  
  // GET /api/machines/:id - Get machine details
  export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const machine = await prisma.machine.findUnique({
        where: { id: parseInt(params.id) },
        include: {
          workspaces: {
            include: {
              project: true,
              _count: {
                select: { chatSessions: true },
              },
            },
          },
        },
      });
      
      if (!machine) {
        return NextResponse.json(
          { error: 'Machine not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(machine);
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
  ```

- [ ] **Workspace Endpoints** (3 hours)
  ```typescript
  // apps/web/app/api/workspaces/route.ts
  
  // POST /api/workspaces - Upsert workspace
  export async function POST(req: NextRequest) {
    try {
      const data = await req.json();
      const validated = WorkspaceCreateSchema.parse(data);
      
      const workspace = await hierarchyService.upsertWorkspace(validated);
      
      return NextResponse.json(workspace, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
  }
  
  // GET /api/workspaces/:workspaceId - Get workspace by VS Code ID
  export async function GET(
    req: NextRequest,
    { params }: { params: { workspaceId: string } }
  ) {
    try {
      const context = await hierarchyService.resolveWorkspace(params.workspaceId);
      
      const workspace = await prisma.workspace.findUnique({
        where: { workspaceId: params.workspaceId },
        include: {
          project: true,
          machine: true,
          chatSessions: {
            orderBy: { startedAt: 'desc' },
            take: 10,
          },
        },
      });
      
      return NextResponse.json({
        workspace,
        context,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
  }
  ```

- [ ] **Testing** (2 hours)
  - API integration tests
  - Test upsert idempotency
  - Test error handling
  - Test validation

#### Success Criteria

- ✅ All endpoints work correctly
- ✅ Proper error handling
- ✅ Input validation working
- ✅ API tests passing

---

### Day 4: API Endpoints - Projects & Sessions

**Time**: 1 day (8 hours)  
**Priority**: HIGH

#### Tasks

- [ ] **Project Endpoints** (4 hours)
  ```typescript
  // apps/web/app/api/projects/route.ts
  
  // GET /api/projects - List all projects
  export async function GET(req: NextRequest) {
    try {
      const projects = await prisma.project.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: {
              workspaces: true,
              agentEvents: true,
            },
          },
        },
      });
      
      return NextResponse.json(projects);
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
  
  // apps/web/app/api/projects/[id]/hierarchy/route.ts
  
  // GET /api/projects/:id/hierarchy - Get full hierarchy tree
  export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const hierarchy = await hierarchyService.getProjectHierarchy(
        parseInt(params.id)
      );
      
      return NextResponse.json(hierarchy);
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
  
  // apps/web/app/api/projects/[id]/events/route.ts
  
  // GET /api/projects/:id/events - Get project events with filters
  export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const { searchParams } = new URL(req.url);
      const machineId = searchParams.get('machineId');
      const workspaceId = searchParams.get('workspaceId');
      const from = searchParams.get('from');
      const to = searchParams.get('to');
      const limit = parseInt(searchParams.get('limit') || '100');
      
      const where: any = {
        projectId: parseInt(params.id),
      };
      
      if (machineId) {
        // Filter by machine via workspace
        where.session = {
          workspace: {
            machineId: parseInt(machineId),
          },
        };
      }
      
      if (workspaceId) {
        where.session = {
          ...where.session,
          workspaceId: parseInt(workspaceId),
        };
      }
      
      if (from || to) {
        where.timestamp = {};
        if (from) where.timestamp.gte = new Date(from);
        if (to) where.timestamp.lte = new Date(to);
      }
      
      const events = await prisma.agentEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        include: {
          session: {
            include: {
              workspace: {
                include: {
                  machine: true,
                },
              },
            },
          },
        },
      });
      
      return NextResponse.json(events);
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
  ```

- [ ] **Session Endpoints** (2 hours)
  ```typescript
  // apps/web/app/api/sessions/route.ts
  
  // POST /api/sessions - Create/update chat session
  export async function POST(req: NextRequest) {
    try {
      const data = await req.json();
      const validated = ChatSessionCreateSchema.parse(data);
      
      const session = await prisma.chatSession.upsert({
        where: { sessionId: validated.sessionId },
        create: validated,
        update: {
          endedAt: validated.endedAt,
          messageCount: validated.messageCount,
          totalTokens: validated.totalTokens,
        },
      });
      
      return NextResponse.json(session);
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
  }
  
  // GET /api/sessions/:sessionId/events
  export async function GET(
    req: NextRequest,
    { params }: { params: { sessionId: string } }
  ) {
    try {
      const events = await prisma.agentEvent.findMany({
        where: { sessionId: params.sessionId },
        orderBy: { timestamp: 'asc' },
      });
      
      return NextResponse.json(events);
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
  ```

- [ ] **Testing** (2 hours)
  - Test all endpoints
  - Test filtering logic
  - Test pagination
  - Performance testing

#### Success Criteria

- ✅ All endpoints functional
- ✅ Filtering works correctly
- ✅ Performance <100ms P95
- ✅ Tests passing

---

### Day 5: Event Ingestion API

**Time**: 1 day (8 hours)  
**Priority**: CRITICAL

#### Tasks

- [ ] **Batch Event Creation** (4 hours)
  ```typescript
  // apps/web/app/api/events/route.ts
  
  // POST /api/events - Batch create events
  export async function POST(req: NextRequest) {
    try {
      const events = await req.json();
      
      if (!Array.isArray(events)) {
        return NextResponse.json(
          { error: 'Expected array of events' },
          { status: 400 }
        );
      }
      
      // Validate all events
      const validated = events.map(e => AgentEventCreateSchema.parse(e));
      
      // Batch insert with transaction
      const created = await prisma.$transaction(
        validated.map(event =>
          prisma.agentEvent.create({
            data: event,
          })
        )
      );
      
      return NextResponse.json({
        created: created.length,
        events: created,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
  }
  ```

- [ ] **Optimize Batch Inserts** (2 hours)
  - Use `createMany` for better performance
  - Add batch size limits (1000 events max)
  - Add request timeout handling
  - Add retry logic

- [ ] **Performance Testing** (2 hours)
  - Load test with 10K events
  - Test concurrent requests
  - Measure throughput (target: >1000 events/sec)
  - Profile database performance

#### Success Criteria

- ✅ Batch inserts working
- ✅ Performance >1000 events/sec
- ✅ No timeouts with large batches
- ✅ Proper error handling

---

### Day 6: Real-time Dashboard Updates

**Time**: 1 day (8 hours)  
**Priority**: HIGH

#### Tasks

- [ ] **SSE Endpoint with Hierarchy** (4 hours)
  ```typescript
  // apps/web/app/api/events/stream/route.ts
  
  export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const machineId = searchParams.get('machineId');
    const workspaceId = searchParams.get('workspaceId');
    
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // Send initial connection message
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
        );
        
        // Poll for new events
        const interval = setInterval(async () => {
          try {
            const where: any = {};
            if (projectId) where.projectId = parseInt(projectId);
            if (machineId) {
              where.session = { workspace: { machineId: parseInt(machineId) } };
            }
            if (workspaceId) {
              where.session = { ...where.session, workspaceId: parseInt(workspaceId) };
            }
            
            // Get events from last 5 seconds
            where.timestamp = {
              gte: new Date(Date.now() - 5000),
            };
            
            const events = await prisma.agentEvent.findMany({
              where,
              include: {
                session: {
                  include: {
                    workspace: {
                      include: {
                        machine: true,
                        project: true,
                      },
                    },
                  },
                },
              },
            });
            
            if (events.length > 0) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'events', data: events })}\n\n`)
              );
            }
          } catch (error) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
            );
          }
        }, 5000);
        
        // Cleanup on close
        req.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
  ```

- [ ] **Dashboard Hook** (2 hours)
  ```typescript
  // apps/web/hooks/use-realtime-events.ts
  
  export function useRealtimeEvents(filters: {
    projectId?: number;
    machineId?: number;
    workspaceId?: number;
  }) {
    const [events, setEvents] = useState<AgentEvent[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    
    useEffect(() => {
      const params = new URLSearchParams();
      if (filters.projectId) params.set('projectId', filters.projectId.toString());
      if (filters.machineId) params.set('machineId', filters.machineId.toString());
      if (filters.workspaceId) params.set('workspaceId', filters.workspaceId.toString());
      
      const eventSource = new EventSource(`/api/events/stream?${params}`);
      
      eventSource.onopen = () => setIsConnected(true);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'events') {
          setEvents(prev => [...data.data, ...prev].slice(0, 100));
        }
      };
      
      eventSource.onerror = () => {
        setIsConnected(false);
      };
      
      return () => {
        eventSource.close();
      };
    }, [filters.projectId, filters.machineId, filters.workspaceId]);
    
    return { events, isConnected };
  }
  ```

- [ ] **Testing** (2 hours)
  - Test SSE connection
  - Test event streaming
  - Test filtering
  - Test reconnection

#### Success Criteria

- ✅ SSE working correctly
- ✅ Events stream in real-time (<5s latency)
- ✅ Filtering works
- ✅ Reconnection handles gracefully

---

### Day 7: Integration Testing & Optimization

**Time**: 1 day (8 hours)  
**Priority**: CRITICAL

#### Tasks

- [ ] **End-to-End API Testing** (3 hours)
  - Test full flow: collector → API → database → UI
  - Test hierarchy resolution across all endpoints
  - Test error scenarios
  - Test concurrent requests

- [ ] **Performance Optimization** (3 hours)
  - Add database indexes where needed
  - Optimize N+1 queries
  - Add query result caching (optional)
  - Test with 10K+ events

- [ ] **Documentation** (2 hours)
  - API documentation (OpenAPI spec)
  - Example requests/responses
  - Error codes reference

#### Success Criteria

- ✅ All E2E tests passing
- ✅ API latency <200ms P95
- ✅ No N+1 queries
- ✅ Documentation complete

---

## 📊 Week 3 Success Metrics

### Functionality
- ✅ All hierarchy endpoints working
- ✅ Event ingestion API functional
- ✅ Real-time streaming working
- ✅ Filtering by project/machine/workspace works

### Performance
- ✅ API latency: <200ms P95
- ✅ Event ingestion: >1000 events/sec
- ✅ Hierarchy queries: <100ms P95
- ✅ Real-time updates: <5s latency

### Quality
- ✅ Test coverage: >70%
- ✅ All integration tests passing
- ✅ No critical bugs
- ✅ API documentation complete

---

## 🚧 Blockers & Risks

### Potential Issues

1. **N+1 Query Problems**
   - Risk: Slow hierarchy queries with many workspaces
   - Mitigation: Use proper includes, add database indexes

2. **SSE Connection Stability**
   - Risk: Connections drop frequently
   - Mitigation: Add reconnection logic, heartbeat messages

3. **Batch Insert Performance**
   - Risk: Timeouts with large event batches
   - Mitigation: Batch size limits, streaming inserts

---

**Next**: [Week 4: UI & Launch](./week4-launch.md)
