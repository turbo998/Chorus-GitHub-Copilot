# PLAN.md — Chorus Copilot Extension: 6 → 83 Tools Expansion

## Requirements

1. **Full tool coverage**: All 83 Chorus MCP tools registered as VS Code Language Model Tools
2. **Modular architecture**: Tool definitions organized by module (public, developer, session, pm, admin, presence)
3. **Schema-driven registration**: Tool metadata in a declarative registry; package.json and runtime registration generated from it
4. **Robust MCP client**: Reconnect, retry with backoff, timeout, error classification
5. **Session lifecycle**: Auto-create Chorus sessions, heartbeat interval, cleanup on deactivate
6. **Smart Chat Participant**: Context injection (current project, session, role)
7. **Configuration**: `chorus.serverUrl`, `chorus.apiKey`, `chorus.autoSession`, `chorus.enabledModules`
8. **Role-based filtering**: Only expose tools relevant to user's role (dev vs PM vs admin)
9. **Testing**: Mock server for all 83 tools, unit tests per module, integration test suite
10. **CI/CD**: GitHub Actions pipeline, devcontainer, VSIX < 100KB
11. **Backward compatibility**: Existing POC usage (6 tools, @chorus commands) still works

## Architecture Decisions

### AD-1: Schema Registry as Single Source of Truth
A `src/schema/tools.ts` file exports an array of `ToolDefinition` objects (name, module, displayName, description, modelDescription, inputSchema, confirmationRequired). A **build script** (`scripts/generate-package-tools.ts`) reads this and patches `package.json`'s `contributes.languageModelTools`. At runtime, the same registry drives `vscode.lm.registerTool()` calls.

**Rationale**: Avoids maintaining 83 entries in two places. Single edit point. Type-safe.

### AD-2: One File Per Module for Tool Metadata
```
src/schema/
  index.ts          — exports allTools[]
  public.ts         — 29 tool defs
  developer.ts      — 5 tool defs
  session.ts        — 8 tool defs
  pm.ts             — 24 tool defs
  admin.ts          — 14 tool defs
  presence.ts       — 3 tool defs
```

### AD-3: Generic ChorusToolHandler (unchanged pattern)
The existing `ChorusToolHandler` class already works generically — it takes `toolName` in constructor and delegates to `mcpClient.callTool()`. This pattern scales to 83 tools with zero changes. `prepareInvocation` uses the schema's `confirmationRequired` field.

### AD-4: MCP Client Enhancements (layered)
```
src/
  mcp/
    transport.ts      — HTTP transport with retry, timeout, reconnect
    session.ts        — MCP session + Chorus session lifecycle + heartbeat
    client.ts         — high-level client (replaces chorus-mcp-client.ts)
    errors.ts         — typed error classes (NetworkError, AuthError, ToolError)
```

### AD-5: Configuration Schema in package.json
Add `contributes.configuration` with all settings. Role-based tool filtering done at registration time — only register tools whose module is in `chorus.enabledModules`.

### AD-6: Chat Participant Enhanced with LLM Tool Delegation
Remove hardcoded command routing. Instead, the chat participant sends the user message + context (project, session) to the LLM and lets Copilot pick tools. Keep a few slash-commands (`/checkin`, `/tasks`, `/session`) for quick access.

### AD-7: Bundle with esbuild (already in POC)
Single-file bundle keeps VSIX small. All 83 tool schemas are tree-shaken into the bundle.

## Implementation Tasks

### Phase 1: Schema Registry & Code Generation

**Task 1.1: Create tool schema types and public module**
- Create `src/schema/types.ts` — `ToolDefinition` interface
- Create `src/schema/public.ts` — 29 tool definitions
- Verify: `tsc --noEmit` passes

**Task 1.2: Remaining module schemas**
- Create `src/schema/developer.ts` (5), `session.ts` (8), `pm.ts` (24), `admin.ts` (14), `presence.ts` (3)
- Create `src/schema/index.ts` — exports `allTools` (length === 83)
- Verify: unit test `allTools.length === 83`, no duplicate names

**Task 1.3: Package.json generator script**
- Create `scripts/generate-package-tools.ts`
- Reads `src/schema/index.ts`, writes `contributes.languageModelTools` into `package.json`
- Verify: run script, `package.json` has 83 tools, `npm run compile` succeeds

### Phase 2: MCP Client Hardening

**Task 2.1: Error classification**
- Create `src/mcp/errors.ts` — `McpNetworkError`, `McpAuthError`, `McpToolError`, `McpTimeoutError`
- Verify: unit tests for error construction

**Task 2.2: Transport with retry and timeout**
- Create `src/mcp/transport.ts` — wraps fetch with exponential backoff (3 retries), configurable timeout (30s default), abort controller
- Verify: unit test with mock fetch — retries on 503, no retry on 401, timeout fires

**Task 2.3: Session manager**
- Create `src/mcp/session.ts` — MCP session init + Chorus session (auto-create via `chorus_create_session`, heartbeat via `setInterval`, cleanup)
- Verify: unit test lifecycle (init → heartbeat → close)

**Task 2.4: High-level client**
- Create `src/mcp/client.ts` — replaces `chorus-mcp-client.ts`, uses transport + session manager
- Update `src/extension.ts` to import from new location
- Keep old file as re-export for backward compat
- Verify: existing integration tests still pass

### Phase 3: Extension Registration Refactor

**Task 3.1: Dynamic tool registration from schema**
- Modify `src/extension.ts`: import `allTools` from schema, loop and register all (filtered by `chorus.enabledModules` setting)
- Update `prepareInvocation` to use `tool.confirmationRequired` from schema
- Verify: activate extension in Extension Development Host, all 83 tools appear in LM tool list

**Task 3.2: Configuration schema**
- Add `contributes.configuration` to `package.json`: `chorus.serverUrl`, `chorus.apiKey`, `chorus.autoSession` (bool), `chorus.enabledModules` (array of module names), `chorus.requestTimeout` (number)
- Verify: settings appear in VS Code settings UI

**Task 3.3: Enhanced Chat Participant**
- Refactor `handleChatRequest`: remove hardcoded commands (keep as slash-commands), add context injection (auto-checkin result, current session ID)
- Add slash commands: `/checkin`, `/tasks`, `/session`, `/help`
- Verify: manual test in Extension Development Host

### Phase 4: Testing Infrastructure

**Task 4.1: Comprehensive mock MCP server**
- Expand `test/mock-server.js` → `test/mock-server.ts` to handle all 83 tools (use schema registry to auto-generate stubs returning fixture data)
- Verify: mock server starts, responds to any tool in registry

**Task 4.2: Unit tests per module**
- Create `test/unit/schema.test.ts` — validates schema integrity (no dupes, required fields)
- Create `test/unit/transport.test.ts` — retry/timeout logic
- Create `test/unit/session.test.ts` — lifecycle
- Verify: `npm test` all green

**Task 4.3: Integration tests**
- Expand `test/integration.ts` → test all 6 modules against mock server
- Verify: `npm run test:integration` passes

### Phase 5: DevEx & CI/CD

**Task 5.1: devcontainer.json**
- Create `.devcontainer/devcontainer.json` — Node 20, extensions (ESLint, Prettier), postCreateCommand (`npm install`)
- Verify: opens in Codespaces

**Task 5.2: GitHub Actions workflow**
- Create `.github/workflows/ci.yml` — matrix (Node 20), steps: install, lint, test, build VSIX, upload artifact
- Verify: push triggers green CI

**Task 5.3: Size budget check**
- Add script `scripts/check-size.sh` — fails if `.vsix > 100KB`
- Integrate into CI
- Verify: current build under budget

## Risks and Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| 83 tools in package.json bloats manifest (~40KB JSON) | Slower extension load | Minimal descriptions; measure actual impact; VS Code lazy-loads tool metadata |
| VS Code may limit LM tool count per extension | Tools silently ignored | Test with Insiders; fall back to dynamic registration if needed |
| Schema drift between Chorus server and extension | Tool calls fail | CI job that fetches `tools/list` from staging and diffs against local schema |
| Heartbeat timer leaks if extension crashes | Orphan sessions server-side | Server has session TTL; extension uses `deactivate()` + disposable pattern |
| Zero runtime deps means no `zod` for validation | Less type safety at boundaries | Use TypeScript strict + manual validation in transport layer |
| Role-based filtering hides tools user might need | Frustration | Default: all modules enabled; filtering is opt-in |
| Build script patching package.json | Merge conflicts | Script is idempotent; CI verifies package.json is in sync with schema |
