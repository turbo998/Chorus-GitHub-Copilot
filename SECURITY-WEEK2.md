# Security Review — Week 2 Modules

**Date:** 2026-04-28  
**Scope:** `src/skills/`, `src/hooks/`, `src/reviewer/`, `src/context/`, `src/extension.ts`

---

## HIGH Severity

### 1. Command Injection via `child_process.exec` in Hook Runner

**File:** `src/hooks/runner.ts:10`  
**Issue:** `exec(scriptPath, ...)` passes the script path directly to a shell. If `scriptPath` contains shell metacharacters (`;`, `|`, `$()`, backticks), arbitrary commands execute. The `HookResolver` constructs the path from `hookName` (a string enum) + workspace root, but:

- The `hookName` type (`HookName`) constrains valid names, but `workspaceRoot` is user-controlled (workspace folder path).
- A malicious `.chorus/hooks/` filename with shell metacharacters on disk would execute arbitrary code.
- More critically, `exec` interprets the entire string as a shell command — even a legitimate `.sh` script path with spaces or special chars in the workspace path breaks or injects.

**Recommendation:**  
Replace `exec` with `execFile` (already used correctly in `git-diff.ts`). For `.sh` scripts, use `execFile('/bin/sh', [scriptPath], ...)`. For `.js`/`.ts`, use `execFile('node', [scriptPath], ...)`. This avoids shell interpretation entirely.

### 2. Arbitrary File Read via Skills Loader (Path Traversal)

**File:** `src/skills/loader.ts:13`, `src/skills/service.ts:27`  
**Issue:** `SkillLoader.loadFromDir()` reads all `.md` files from a directory using `fs.readdir` + `path.join`. The directory comes from `workspaceRoot` which is the VS Code workspace folder — this is safe by itself. However:

- `SkillsService` passes `this.workspaceRoot` directly (not `.chorus/skills/`). On line 27: `loadFromDir(this.workspaceRoot)` reads **all** `.md` files from the entire workspace root, not just the skills directory. This is likely a **bug** in addition to a security issue — it loads every markdown file in the repo as a "skill."
- If `globalDir` is ever sourced from user config, it could point anywhere on disk.
- No symlink resolution — a symlink in `.chorus/skills/` → `/etc/` would read arbitrary files.

**Recommendation:**  
1. Fix path: should be `path.join(this.workspaceRoot, '.chorus', 'skills')`.
2. Validate resolved paths stay within expected directory using `path.resolve()` + prefix check.
3. Use `fs.lstat` to reject symlinks, or use `fs.realpath` to resolve and re-validate.

---

## MEDIUM Severity

### 3. Diff Content Sent to External MCP Server (Data Leakage)

**File:** `src/reviewer/agent.ts:28-31`, `src/reviewer/agent.ts:38-41`  
**Issue:** `ReviewerAgent.postReview()` sends the review summary (which includes diff metadata) to the MCP server via `chorus_add_comment`. The diff itself isn't sent directly, but the summary includes diff length. More importantly, `postReview` auto-verifies tasks (`chorus_admin_verify_task`) when `approved=true`, and approval is based solely on `diff.length > 0` — any non-empty diff auto-approves. This is a logic flaw that could be exploited.

**Recommendation:**  
- Don't auto-approve based solely on diff existence. Require actual review criteria evaluation.
- Consider whether diff content should be sanitized before inclusion in summaries sent externally.

### 4. Environment Variable Passthrough in Hook Runner

**File:** `src/hooks/runner.ts:7`  
**Issue:** `{ ...process.env, ...(opts?.env ?? {}) }` passes the full parent process environment to hook scripts. This includes potentially sensitive variables like `CHORUS_API_KEY`, auth tokens, cloud credentials, etc. Hooks are workspace-provided scripts (untrusted code from the repo).

**Recommendation:**  
Allowlist environment variables passed to hooks. Only pass explicitly needed variables plus the hook-specific `context` env vars.

### 5. Overly Broad File Watcher

**File:** `src/extension.ts:277`  
**Issue:** The file watcher pattern `**/*.md` triggers skill reload on **any** `.md` file change in the entire workspace. Combined with issue #2 (loading all `.md` from workspace root), this means every markdown edit triggers a full reload of all markdown files as skills.

**Recommendation:**  
Narrow pattern to `.chorus/skills/**/*.md`.

---

## LOW Severity

### 6. Session ID Exposure in Context

**File:** `src/context/session-provider.ts:11`  
**Issue:** The Chorus session ID is included in the LLM context string. While not a direct secret, session IDs sent to the LLM could be logged or leaked in completions.

**Recommendation:**  
Evaluate whether session IDs need to be in the LLM context. If only for display, keep them out of the model prompt.

### 7. No Input Validation on `taskId` in Reviewer

**File:** `src/reviewer/agent.ts:20,36`  
**Issue:** `taskId` is passed unsanitized to MCP tool calls and string interpolation in the summary. While MCP should handle its own input validation, injection into the summary string could affect downstream consumers.

**Recommendation:**  
Validate `taskId` format (UUID pattern) before use.

### 8. Silent Error Swallowing in Skills Loader

**File:** `src/skills/loader.ts:18-20`  
**Issue:** All errors are caught and silently return `[]`. This hides permission errors, path issues, and potential security-relevant failures.

**Recommendation:**  
Log errors. Distinguish expected "directory doesn't exist" from unexpected failures.

---

## Summary

| # | Issue | Severity | File |
|---|-------|----------|------|
| 1 | Command injection via `exec()` | **HIGH** | hooks/runner.ts |
| 2 | Path traversal / wrong directory in skills loader | **HIGH** | skills/loader.ts, skills/service.ts |
| 3 | Auto-approval logic flaw in reviewer | MEDIUM | reviewer/agent.ts |
| 4 | Full env passthrough to untrusted hooks | MEDIUM | hooks/runner.ts |
| 5 | Overly broad file watcher | MEDIUM | extension.ts |
| 6 | Session ID in LLM context | LOW | context/session-provider.ts |
| 7 | No taskId validation | LOW | reviewer/agent.ts |
| 8 | Silent error swallowing | LOW | skills/loader.ts |
