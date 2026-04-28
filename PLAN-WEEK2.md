# Week 2 Plan — Chorus-GitHub-Copilot Extension

## Requirements

### R1: Skills Injection Framework
- Load skill files (markdown) from `.chorus/skills/` (workspace) and `~/.chorus/skills/` (global)
- Index skills by metadata (task type, tags) for relevance matching
- Inject matched skills into Copilot LLM context when handling tasks
- Watch for file changes and re-index

### R2: Reviewer Agent
- Trigger automated code review when `chorus_submit_for_verify` is called
- Compute git diff of current changes
- Load applicable review skills/criteria
- Generate review feedback, post via `chorus_add_comment`
- Approve/reject via `chorus_admin_verify_task`

### R3: Hooks System
- Execute lifecycle hooks: pre-claim, post-claim, pre-submit, post-verify
- Hooks are scripts/commands defined in `.chorus/hooks/{hookName}.{sh,ts,js}`
- Runner with configurable timeout, stdout/stderr capture, error handling
- Hook failure blocks the lifecycle step (except post-verify)

### R4: Context-Aware Chat
- Auto-inject project context (from active session/checkin) into chat
- Auto-inject current claimed task details
- Auto-inject relevant skills based on task type/tags
- Show task progress indicators in responses
- Support streaming responses

---

## Architecture Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| AD1 | Skills stored as markdown with YAML frontmatter (`type`, `tags`, `priority`) | Simple, human-editable, parseable with `gray-matter` |
| AD2 | Skills index is in-memory Map, rebuilt on workspace open + file watch | No DB dependency; skills are small (<100 files typical) |
| AD3 | Reviewer Agent is a service class, not a separate process | Keeps extension lightweight; uses existing MCP client |
| AD4 | Hooks run as child processes (`cp.exec`) with timeout kill | Language-agnostic; same model as git hooks |
| AD5 | Context assembly uses a `ContextBuilder` pattern (chain of providers) | Composable, testable, each provider is independent |
| AD6 | Hook definitions use a manifest `.chorus/hooks.json` OR convention-based filenames | Convention-first (filename = hook name), optional manifest for args/timeout override |
| AD7 | Reviewer Agent runs async after submit; does not block the submit call | UX: user gets immediate feedback; review posts asynchronously |

---

## Implementation Tasks

Each task = one TDD cycle (test → implement → refactor).

### Phase 1: Skills Injection Framework

| # | Task | Test Focus |
|---|------|------------|
| 1.1 | `SkillFile` type + `parseSkill(content: string): SkillFile` | Parses YAML frontmatter + body from markdown string |
| 1.2 | `SkillLoader.loadFromDir(dirPath): SkillFile[]` | Reads `.md` files from dir, returns parsed skills; handles missing dir |
| 1.3 | `SkillIndex` class: `add(skill)`, `match(tags: string[]): SkillFile[]` | Indexes by tags/type, returns ranked matches |
| 1.4 | `SkillsService` — orchestrates loader for workspace + global dirs | Loads both dirs, merges (workspace overrides global by name) |
| 1.5 | `SkillsService.watch()` — FileSystemWatcher integration | Re-indexes on file create/change/delete (mock vscode.workspace) |
| 1.6 | `SkillsService.getContextSnippet(tags): string` | Returns formatted skill content ready for LLM injection |

### Phase 2: Hooks System

| # | Task | Test Focus |
|---|------|------------|
| 2.1 | `HookRunner.exec(script, opts): HookResult` | Runs a script with timeout; returns stdout/stderr/exitCode |
| 2.2 | `HookRunner` timeout + kill behavior | Process killed after timeout; result has `timedOut: true` |
| 2.3 | `HookResolver.resolve(hookName): string|null` | Finds hook file by convention (`.chorus/hooks/{name}.sh` etc.) |
| 2.4 | `HookLifecycle` class — registers hooks, fires at lifecycle points | `fire('pre-claim', context)` → resolves + runs; returns pass/fail |
| 2.5 | `HookLifecycle` blocking vs non-blocking semantics | pre-claim/pre-submit block (fail = abort); post-* are fire-and-forget |
| 2.6 | Integration: wire `HookLifecycle` into MCP tool invocations | Intercept claim/submit/verify tool calls; fire hooks around them |

### Phase 3: Reviewer Agent

| # | Task | Test Focus |
|---|------|------------|
| 3.1 | `GitDiffService.getDiff(): string` | Shells out to `git diff`; returns diff string; handles no-repo |
| 3.2 | `ReviewCriteria.fromSkills(skills): string` | Builds review prompt/criteria from loaded review skills |
| 3.3 | `ReviewerAgent.review(taskId, diff, criteria): ReviewResult` | Orchestrates: formats prompt, returns structured review |
| 3.4 | `ReviewerAgent.postReview(taskId, result)` | Calls `chorus_add_comment` + `chorus_admin_verify_task` via MCP client |
| 3.5 | `ReviewerAgent` trigger wiring — listens for submit_for_verify | Auto-triggers on successful submit; async, no blocking |

### Phase 4: Context-Aware Chat

| # | Task | Test Focus |
|---|------|------------|
| 4.1 | `ContextProvider` interface + `SessionContextProvider` | Returns project/session info from SessionManager |
| 4.2 | `TaskContextProvider` | Returns current claimed task details (calls `chorus_get_my_tasks`) |
| 4.3 | `SkillsContextProvider` | Returns relevant skills based on current task tags |
| 4.4 | `ContextBuilder.build(): string` | Chains providers, assembles full context string |
| 4.5 | Integrate `ContextBuilder` into chat participant handler | Prepend context to user message before LLM call |
| 4.6 | Streaming response support in chat participant | Use `response.markdown()` streaming API; test chunked output |
| 4.7 | Task progress rendering in chat responses | Format task status/progress as markdown in responses |

---

## Risk & Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Skills index grows large with many files | Slow matching | Cap at 200 files; warn user; lazy-load body |
| Hook scripts hang (infinite loop) | Extension blocked | Hard timeout (default 30s) + process.kill SIGKILL |
| Git diff too large for LLM context | Review fails / truncated | Truncate to 8K chars; summarize file-level changes for overflow |
| Reviewer Agent hallucinated approvals | Bad code merged | Always require human confirmation for approve (use `confirmationRequired`) |
| FileSystemWatcher not reliable on all OS | Stale index | Provide `/skills reload` command as manual fallback |
| Streaming API differences across VS Code versions | Runtime errors | Feature-detect `response.markdown` streaming; fallback to batch |
| Hooks running untrusted code | Security | Document trust model; hooks only run from workspace owner's files |
