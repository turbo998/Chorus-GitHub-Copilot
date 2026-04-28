# Week 2 Code Review — Chorus Copilot Extension

**Date:** 2026-04-28  
**Modules reviewed:** `src/skills/`, `src/hooks/`, `src/reviewer/`, `src/context/`

---

## 🔴 Critical: No Integration with extension.ts

**None of the four Week 2 modules are imported or wired into `extension.ts`.** The extension still only uses `ChorusMcpClient` and `schema/`. The new modules are fully standalone — they compile and pass tests but have zero runtime effect.

**What's needed:**
- `SkillsService` should be instantiated in `activate()` and loaded
- `ContextBuilder` should inject context into chat participant requests
- `HookLifecycle` should fire pre/post hooks around tool invocations (checkin, tasks)
- `ReviewerAgent` should be accessible via a new slash command or tool

---

## 1. Unused Imports

| File | Issue |
|------|-------|
| `hooks/runner.ts` | `child` variable from `exec()` is assigned but never used (no cleanup/kill logic) |
| `hooks/index.ts` | Exports use bare specifiers (`'./types'`) while other modules use `'./types.js'` — inconsistent, may break ESM |
| `context/index.ts` | Same: bare specifiers vs `.js` extensions |

---

## 2. Type Safety Gaps

| Location | Issue | Severity |
|----------|-------|----------|
| `hooks/runner.ts:11,17` | `(error as any).killed`, `(error as any).code` — uses `any` cast instead of `ExecException` which has `killed` and `code` properties | Medium |
| `context/task-provider.ts:9` | `result: any` — no type narrowing on MCP response; `JSON.parse` can throw on malformed text | High |
| `reviewer/agent.ts:10` | `SkillsServiceLike` duplicates `SkillFile` shape inline instead of importing `SkillFile` (already imported in criteria.ts) | Low |
| `skills/service.ts:45` | `require('vscode')` dynamic require bypasses type checking entirely | Medium |

---

## 3. Error Handling Gaps

| Location | Issue | Severity |
|----------|-------|----------|
| `skills/loader.ts:18` | `catch {}` silently swallows all errors (permission denied, encoding errors) — should at least log | Medium |
| `context/task-provider.ts:11` | `JSON.parse()` has no try/catch — will throw on invalid JSON and bubble up as unhandled | High |
| `reviewer/agent.ts:37-46` | `postReview` has no error handling — if `chorus_add_comment` fails, `chorus_admin_verify_task` is never called; if verify fails, no rollback or notification | High |
| `reviewer/git-diff.ts:9` | Silently returns empty string on git errors — caller can't distinguish "no changes" from "git not installed" | Medium |
| `skills/service.ts:54` | `catch {}` in `watch()` silently swallows errors | Low |
| `hooks/runner.ts` | No validation that `scriptPath` exists before exec — will produce cryptic ENOENT error | Low |

---

## 4. Missing Edge Cases

| Location | Issue |
|----------|-------|
| `skills/parser.ts` | No handling for Windows-style CRLF in frontmatter beyond `\r?\n` — `tags: [a, b]\r` would include trailing `\r` in last tag |
| `skills/skillIndex.ts` | `match([])` with empty tags returns empty (correct) but `match` with a tag that no skill has silently returns `[]` — no way to know if tags were valid |
| `hooks/resolver.ts` | Resolves `.ts` files but `HookRunner.exec()` runs them with `exec()` — `.ts` files won't execute without `ts-node` or similar; no warning given |
| `reviewer/agent.ts:28` | `approved: hasChanges` — auto-approves any task with a diff regardless of content. This is a stub but dangerous if accidentally used in production |
| `context/task-provider.ts:14` | Always picks `tasks[0]` — no logic to pick the active/claimed task vs any task in the list |
| `skills/service.ts:42-57` | `watch()` creates a file watcher but never disposes it — memory leak if called multiple times; watcher not added to extension subscriptions |
| `skills/loader.ts` | Only reads top-level `.md` files; doesn't recurse into subdirectories |

---

## 5. Module Consistency Issues

| Issue | Details |
|-------|---------|
| **Import extensions** | `hooks/` and `context/` use bare `'./types'`; `skills/` and `reviewer/` use `'./types.js'`. Should be consistent (`.js` for ESM). |
| **MCP client reference** | `extension.ts` uses `ChorusMcpClient` from `./chorus-mcp-client`; `context/task-provider.ts` imports from `../mcp/client`. These may be different classes. |
| **No dispose pattern** | Week 2 modules create resources (file watchers, potential child processes) but don't implement `Disposable` for cleanup in `deactivate()` |

---

## Summary

The Week 2 code is well-structured and well-tested in isolation, but **completely disconnected from the running extension**. The highest priority items are:

1. **Wire modules into `extension.ts`** — without this, Week 2 has no user-visible effect
2. **Add try/catch around `JSON.parse` in `TaskContextProvider`**
3. **Add error handling to `ReviewerAgent.postReview`**
4. **Fix inconsistent import extensions** (bare vs `.js`)
5. **Implement dispose/cleanup** for `SkillsService.watch()` and hook child processes
6. **Verify `ChorusMcpClient` import path consistency** between extension.ts and context/task-provider.ts
