# Week 4 — Final Sprint Plan

> **Goal:** Ship-ready, polished, <500KB VSIX, zero known bugs.

## Day 1: Fixes & Hardening

### T4.1 — StatusBarController listener cleanup
- **Test:** `status-bar.dispose.test.ts` — verify `dispose()` removes all event listeners, no dangling subscriptions.
- **Fix:** Add missing `disposable.dispose()` calls in `StatusBarController.dispose()`.
- **Green → Refactor → Commit.**

### T4.2 — Quick-action error handling
- **Test:** `quick-action.error.test.ts` — stub `callTool` to throw; verify graceful error message shown, no unhandled rejection.
- **Fix:** Wrap `callTool` invocations in try/catch, surface `vscode.window.showErrorMessage`.
- **Green → Commit.**

### T4.3 — ChatMemory session eviction (LRU)
- **Test:** `chat-memory.eviction.test.ts` — create 6 sessions with `maxSessions=5`; verify oldest untouched session evicted. Verify touch promotes session.
- **Fix:** Add `maxSessions` config (default 10), LRU map in `ChatMemoryManager`.
- **Green → Commit.**

## Day 2: Tool Result Formatting

### T4.4 — Tool result formatter
- **Test:** `tool-format.test.ts`
  - Task list → markdown table (ID | Title | Status | Assignee).
  - Diff payload → fenced code block with `diff` lang.
  - URLs → clickable `[Open in Chorus](url)` links.
  - Unknown shape → pretty JSON fallback.
- **Impl:** `src/format/tool-result-formatter.ts` — detect result shape, dispatch to formatter.
- **Wire:** Integrate into chat participant response rendering.
- **Green → Commit.**

## Day 3–4: Webview Task Dashboard

### T4.5 — TaskDashboardProvider scaffold
- **Test:** `task-dashboard.test.ts` — provider returns valid HTML, `resolveWebviewView` sets options.
- **Impl:** `src/webview/task-dashboard-provider.ts` — `WebviewViewProvider`, registers command `chorus.openTaskDashboard`.
- **Green → Commit.**

### T4.6 — Dashboard data binding
- **Test:** Mock MCP `listTasks` → verify webview receives message with task array. Verify click posts `claimTask` message back.
- **Impl:** Fetch tasks via MCP client, post to webview. Handle `claimTask` message from webview JS. Auto-refresh on 30s interval (disposable).
- **Green → Commit.**

### T4.7 — Dashboard auto-refresh & status sync
- **Test:** Simulate task state change → verify webview updates without manual reload.
- **Impl:** Listen to `TaskStateManager` events, push delta to webview.
- **Green → Commit.**

## Day 5: Integration, Package, Polish

### T4.8 — End-to-end smoke test
- **Test:** `e2e-smoke.test.ts`
  1. Activate extension.
  2. Connect MCP (mock server).
  3. `/checkin` → verify session created.
  4. `/tasks` → verify formatted task list.
  5. Open dashboard → verify webview rendered.
  6. Claim task → verify state transition.
  7. Reviewer agent on mock diff → verify comment posted.
  8. Dispose → verify clean shutdown, no leaks.
- **Green → Commit.**

### T4.9 — VSIX package validation
- Run `vsce package --no-yarn`.
- Assert size <500KB. If over: audit bundled deps, add to `.vscodeignore`.
- Install in clean VS Code instance, verify activation.
- **Commit `.vscodeignore` fixes if needed.**

### T4.10 — README & docs polish
- Feature table with all capabilities.
- Architecture diagram placeholder.
- Badges: CI status, version, license.
- Screenshots section (placeholder images).
- Verify `getting-started.md` links work.
- **Commit.**

---

## Definition of Done
- [ ] All 8 remaining items implemented with tests
- [ ] Total test count ≥ 145
- [ ] `vsce package` succeeds, <500KB
- [ ] Zero `tsc` errors, zero test failures
- [ ] README complete, docs cross-linked
