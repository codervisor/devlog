# Copilot Adapter Redesign - Critical Blocker Resolution

**Created**: October 31, 2025  
**Status**: Design Phase  
**Priority**: CRITICAL  
**Estimated Effort**: 3.5-5 hours implementation + 2-3 hours testing

---

## 🚨 Problem Statement

The current Copilot adapter **cannot extract any meaningful data** from real Copilot logs, making the collector completely non-functional.

**Current State**:
- ❌ Adapter expects line-based JSON logs (one event per line)
- ❌ Processes 24.20 MB of data but extracts 0 events
- ❌ Backfill infrastructure works but produces no useful data

**Actual Reality**:
- ✅ Copilot stores chat sessions as structured JSON files
- ✅ Each workspace has its own `chatSessions/` directory
- ✅ 657 chat session files totaling 1.4 GB on this machine
- ✅ 11 workspace directories contain chat sessions

**Impact**: This is a **critical blocker** preventing any real-world usage of the collector.

---

## 📊 Data Discovery

### File Locations

```
~/Library/Application Support/Code/User/workspaceStorage/
  └── {workspace-hash}/
      └── chatSessions/
          └── {session-uuid}.json

~/Library/Application Support/Code - Insiders/User/workspaceStorage/
  └── {workspace-hash}/
      └── chatSessions/
          └── {session-uuid}.json
```

### Volume Statistics

| Metric | Value |
|--------|-------|
| Total workspace directories | 11 |
| Total chat session files | 657 |
| Total data volume | 1.4 GB |
| Per-file size | ~2-5 MB typical |

### File Structure Analysis

#### Top-Level Schema

```json
{
  "version": 3,                        // Format version
  "requesterUsername": "tikazyq",      // GitHub username
  "requesterAvatarIconUri": {...},     // User avatar
  "responderUsername": "GitHub Copilot",
  "responderAvatarIconUri": {...},
  "initialLocation": "panel",          // Where chat was opened
  "requests": [...]                    // Array of conversation turns
}
```

#### Request Object Schema

Each element in the `requests[]` array contains:

```json
{
  "requestId": "request_3c8d6de9-...",
  "timestamp": "2025-10-30T10:15:30.123Z",
  "modelId": "gpt-4o",
  "agent": {...},
  
  // User's message
  "message": {
    "text": "user's full question...",
    "parts": [
      {
        "text": "...",
        "kind": "text",
        "range": {...},
        "editorRange": {...}
      }
    ]
  },
  
  // Context variables (files, workspace context)
  "variableData": {
    "variables": [
      {
        "id": "vscode.prompt.instructions.root__file:///...",
        "name": "prompt:AGENTS.md",
        "value": { "$mid": 1, "path": "/path/to/file", "scheme": "file" },
        "kind": "promptFile",
        "modelDescription": "Prompt instructions file",
        "isRoot": true,
        "automaticallyAdded": true
      }
    ]
  },
  
  // AI's response stream
  "response": [
    {
      "kind": null,                    // Plain text response
      "value": "I'll help you...",
      "supportThemeIcons": false,
      "supportHtml": false
    },
    {
      "kind": "prepareToolInvocation",
      "toolName": "copilot_findTextInFiles"
    },
    {
      "kind": "toolInvocationSerialized",
      "toolId": "copilot_findTextInFiles",
      "toolCallId": "5875d6e4-...",
      "invocationMessage": {
        "value": "Searching text for `PATTERN` (`**/*.{yml,yaml}`)",
        "uris": {}
      },
      "pastTenseMessage": {
        "value": "Searched text for `PATTERN`, no results",
        "uris": {}
      },
      "isConfirmed": { "type": 1 },
      "isComplete": true,
      "source": { "type": "internal", "label": "Built-In" }
    },
    {
      "kind": "codeblockUri",
      "uri": { "$mid": 1, "path": "/path/to/file.ts" }
    },
    {
      "kind": "textEditGroup",
      "edits": [...]
    },
    {
      "kind": "undoStop"
    }
  ],
  
  "responseId": "response_abc123",
  "codeCitations": [],
  "contentReferences": [],
  "followups": [],
  "result": {...},
  "isCanceled": false
}
```

#### Response Item Kinds

Based on analysis of real data:

| Kind | Description | Frequency |
|------|-------------|-----------|
| `null` | Plain text response chunks | Very High |
| `toolInvocationSerialized` | Tool/command execution | High |
| `prepareToolInvocation` | Before tool execution | High |
| `codeblockUri` | Code references/links | Medium |
| `textEditGroup` | File edits/changes | Medium |
| `mcpServersStarting` | MCP server initialization | Low |
| `inlineReference` | Inline code references | Medium |
| `undoStop` | Undo boundaries | Low |

---

## 🎯 Design Solution

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ CopilotAdapter                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ParseLogFile(filePath) →                              │
│    └─ ParseChatSessionFile()                           │
│                                                          │
│  ParseChatSessionFile(filePath) →                      │
│    ├─ Read and parse JSON file                         │
│    ├─ Validate chat session structure                  │
│    ├─ Extract session metadata                          │
│    ├─ For each request:                                 │
│    │   ├─ Extract LLM request event                     │
│    │   ├─ Extract LLM response event                    │
│    │   ├─ Extract tool invocations                      │
│    │   ├─ Extract file references                       │
│    │   └─ Extract code edits                            │
│    └─ Return []AgentEvent                               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Event Extraction Strategy

#### 1. LLM Request Event (per request)

```go
Event {
  Type: EventTypeLLMRequest
  Timestamp: request.timestamp
  Data: {
    requestId: request.requestId
    modelId: request.modelId
    prompt: request.message.text
    promptLength: len(request.message.text)
  }
  Context: {
    username: session.requesterUsername
    location: session.initialLocation
    variablesCount: len(request.variableData.variables)
  }
}
```

#### 2. LLM Response Event (per request)

```go
Event {
  Type: EventTypeLLMResponse
  Timestamp: request.timestamp + estimated_duration
  Data: {
    requestId: request.requestId
    responseId: request.responseId
    response: concatenate_text_responses(request.response)
    responseLength: len(response)
  }
  Metrics: {
    responseTokens: estimate_tokens(response)
    durationMs: estimate_or_extract_duration()
  }
}
```

#### 3. Tool Invocation Events (per tool call)

```go
Event {
  Type: EventTypeToolUse
  Timestamp: extract_or_estimate_from_sequence()
  Data: {
    requestId: request.requestId
    toolId: tool.toolId
    toolName: tool.toolName
    invocationMessage: tool.invocationMessage.value
    result: tool.pastTenseMessage.value
    isComplete: tool.isComplete
    source: tool.source.label
  }
  Context: {
    toolCallId: tool.toolCallId
    confirmed: tool.isConfirmed.type == 1
  }
}
```

#### 4. File Reference Events

```go
// From variableData.variables
Event {
  Type: EventTypeFileRead
  Data: {
    filePath: variable.value.path
    variableId: variable.id
    variableName: variable.name
    kind: variable.kind  // "promptFile", etc
    automatic: variable.automaticallyAdded
  }
}

// From response codeblockUri
Event {
  Type: EventTypeFileRead  // or FileWrite if in textEditGroup
  Data: {
    filePath: codeblock.uri.path
  }
}
```

#### 5. Code Edit Events

```go
Event {
  Type: EventTypeFileModify
  Data: {
    requestId: request.requestId
    edits: textEditGroup.edits
    fileCount: count_unique_files(edits)
  }
}
```

---

## 🏗️ Implementation Plan

### Phase 1: Core Structure (1.5 hours)

**Files to modify**:
- `internal/adapters/copilot_adapter.go`

**Tasks**:
1. Add chat session type definitions
```go
type CopilotChatSession struct {
    Version              int                    `json:"version"`
    RequesterUsername    string                 `json:"requesterUsername"`
    ResponderUsername    string                 `json:"responderUsername"`
    InitialLocation      string                 `json:"initialLocation"`
    Requests             []CopilotRequest       `json:"requests"`
}

type CopilotRequest struct {
    RequestID       string                 `json:"requestId"`
    ResponseID      string                 `json:"responseId"`
    Timestamp       string                 `json:"timestamp"`
    ModelID         string                 `json:"modelId"`
    Message         CopilotMessage         `json:"message"`
    Response        []CopilotResponseItem  `json:"response"`
    VariableData    CopilotVariableData    `json:"variableData"`
    IsCanceled      bool                   `json:"isCanceled"`
}

type CopilotMessage struct {
    Text  string                `json:"text"`
    Parts []CopilotMessagePart  `json:"parts"`
}

type CopilotResponseItem struct {
    Kind              *string                `json:"kind"`  // nullable
    Value             string                 `json:"value,omitempty"`
    ToolID            string                 `json:"toolId,omitempty"`
    ToolName          string                 `json:"toolName,omitempty"`
    ToolCallID        string                 `json:"toolCallId,omitempty"`
    InvocationMessage *CopilotMessage        `json:"invocationMessage,omitempty"`
    PastTenseMessage  *CopilotMessage        `json:"pastTenseMessage,omitempty"`
    IsComplete        bool                   `json:"isComplete,omitempty"`
    // ... other fields as needed
}

type CopilotVariableData struct {
    Variables []CopilotVariable `json:"variables"`
}

type CopilotVariable struct {
    ID          string                 `json:"id"`
    Name        string                 `json:"name"`
    Value       map[string]interface{} `json:"value"`
    Kind        string                 `json:"kind"`
    IsRoot      bool                   `json:"isRoot"`
    AutoAdded   bool                   `json:"automaticallyAdded"`
}
```

2. Simplify ParseLogFile (remove old line-based logic)
```go
func (a *CopilotAdapter) ParseLogFile(filePath string) ([]*types.AgentEvent, error) {
    // Copilot stores logs as chat session JSON files
    return a.parseChatSessionFile(filePath)
}
```

### Phase 2: Chat Session Parser (2-3 hours)

**Tasks**:
1. Implement `parseChatSessionFile()`
```go
func (a *CopilotAdapter) parseChatSessionFile(filePath string) ([]*types.AgentEvent, error) {
    data, err := os.ReadFile(filePath)
    if err != nil {
        return nil, err
    }
    
    var session CopilotChatSession
    if err := json.Unmarshal(data, &session); err != nil {
        return nil, fmt.Errorf("failed to parse chat session: %w", err)
    }
    
    var events []*types.AgentEvent
    
    // Extract session ID from filename
    sessionID := extractSessionID(filePath)
    a.sessionID = sessionID
    
    for _, request := range session.Requests {
        // Skip canceled requests
        if request.IsCanceled {
            continue
        }
        
        // Extract all events from this request
        requestEvents, err := a.extractEventsFromRequest(&session, &request)
        if err != nil {
            // Log error but continue processing
            continue
        }
        
        events = append(events, requestEvents...)
    }
    
    return events, nil
}
```

2. Implement `extractEventsFromRequest()`
```go
func (a *CopilotAdapter) extractEventsFromRequest(
    session *CopilotChatSession,
    request *CopilotRequest,
) ([]*types.AgentEvent, error) {
    var events []*types.AgentEvent
    
    timestamp, err := time.Parse(time.RFC3339, request.Timestamp)
    if err != nil {
        timestamp = time.Now()
    }
    
    // 1. LLM Request Event
    events = append(events, a.createLLMRequestEvent(session, request, timestamp))
    
    // 2. File Reference Events (from variables)
    for _, variable := range request.VariableData.Variables {
        if event := a.createFileReferenceEvent(request, &variable, timestamp); event != nil {
            events = append(events, event)
        }
    }
    
    // 3. Tool Invocation Events + Response Text
    toolEvents, responseText := a.extractToolAndResponseEvents(request, timestamp)
    events = append(events, toolEvents...)
    
    // 4. LLM Response Event
    events = append(events, a.createLLMResponseEvent(request, responseText, timestamp))
    
    return events, nil
}
```

3. Implement helper methods for each event type
```go
func (a *CopilotAdapter) createLLMRequestEvent(...) *types.AgentEvent
func (a *CopilotAdapter) createLLMResponseEvent(...) *types.AgentEvent
func (a *CopilotAdapter) createFileReferenceEvent(...) *types.AgentEvent
func (a *CopilotAdapter) extractToolAndResponseEvents(...) ([]*types.AgentEvent, string)
```

### Phase 3: Testing (2-3 hours)

**Test Files**:
- `internal/adapters/copilot_adapter_test.go`
- `internal/adapters/copilot_chat_session_test.go` (new)

**Test Cases**:
1. Format detection
   - Detect chat session format correctly
   - Detect line-based format correctly
   - Handle malformed files

2. Chat session parsing
   - Parse real chat session file
   - Extract correct number of events
   - Handle canceled requests
   - Handle missing fields gracefully

3. Event extraction
   - LLM request events have correct data
   - LLM response events combine text correctly
   - Tool invocations extracted properly
   - File references captured
   - Timestamps are reasonable

4. Integration testing
   - Backfill with real chat session files
   - Verify event counts match expectations
   - Check data quality

---

## 📈 Success Metrics

### Quantitative

- [ ] Parse all 657 chat session files without errors
- [ ] Extract >0 events from each file (target: 5-20 events/file)
- [ ] Process 1.4 GB in <60 seconds (target: ~25 MB/s)
- [ ] Memory usage stays <200 MB
- [ ] Test coverage >70%

### Qualitative

- [ ] Events have meaningful, accurate data
- [ ] Timestamps are correctly ordered
- [ ] File references point to real files
- [ ] Tool invocations are complete
- [ ] No duplicate events

**Test Cases**:
1. Chat session parsingcally

### Step 2: Testing (2-3 hours)
- Test with real 657 chat session files
- Verify extracted events make sense
- Fix any parsing issues

### Step 3: Integration (1 hour)
- Update backfill command to use new adapter
- Test end-to-end backfill workflow
- Verify events reach backend correctly
2. Event extraction
### Step 4: Documentation (30 min)
- Update README with new capabilities
- Document chat session format
- Update progress tracking

---
3. Integration testing
## 🔄 Backward Compatibility

The new adapter will support both formats:

1. **Chat session format** (new, primary)
   - Structured JSON files
   - Full conversation history
   - Rich context and tool data

2. **Line-based format** (existing, fallback)
   - One JSON per line
   - Legacy format support
   - Minimal changes to existing code

Detection is automatic based on file content.

---

## 📝 Open Questions

### Q1: How to handle timestamps?
**Answer**: Use `request.timestamp` for request event, estimate response timing based on sequence order (add small increments for tool calls).

### Q2: How to estimate token counts?
**Answer**: Simple heuristic: `tokens ≈ words * 1.3` or use a proper tokenizer library if available in Go.

### Q3: Should we extract MCP server events?
**Answer**: Yes, when `kind == "mcpServersStarting"`, create a `EventTypeToolUse` or new `EventTypeMCPServer` type.
### Step 1: Development (3.5-5 hours)
### Q4: How to handle file URIs?
**Answer**: Parse VS Code URI format `{ "$mid": 1, "path": "...", "scheme": "file" }` and extract the path.

### Q5: Should we store full conversation context?
**Answer**: No for now—extract discrete events. Future enhancement could link events as conversation threads.

---

## 📚 References

### Sample Files
- `/tmp/copilot-investigation/*.json` - Real chat session samples for testing

### Code References
- `internal/adapters/copilot_adapter.go` - Current (broken) implementation
- `internal/adapters/base_adapter.go` - Base adapter interface
- `pkg/types/types.go` - Event type definitions

### External Resources
- VS Code Copilot extension source (for reference)
## 🔄 Breaking Change

The redesigned adapter will **only** support the chat session format:

**Rationale**:
- No evidence that line-based format exists in real Copilot installations
- Simplifies implementation and maintenance
- Focuses on actual user data format
- Avoids complexity of format detection and fallback logic

**Migration**: The old `ParseLogLine()` method will be removed. If line-based formats are discovered in the future, they can be added as a separate adapter.