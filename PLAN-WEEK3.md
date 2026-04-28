# Week 3 Plan — State Management, Marketplace Readiness & Documentation

> **Goal:** Make the extension production-grade, publishable, and self-documenting.

---

## 1. Requirements

### P0 — Must Have
- **State machine** for connection + task lifecycle with persistence across restarts
- **Status bar** indicator (connection state + active task)
- **Automatic reconnection** with exponential backoff (reuse MCP client pattern)
- **Marketplace-ready package.json** (publisher, icon, categories, activation events)
- **README.md** with feature list, setup guide, configuration reference
- **CHANGELOG.md** (Weeks 1–3)
- **.vscodeignore** optimized for small VSIX (<500KB target)
- **docs/** getting-started + configuration guides

### P1 — Should Have
- **State persistence** via `globalState` / `workspaceState`
- **Quick pick menus** for claim → work → submit → verify flow
- **Progress notifications** for long MCP operations
- **Telemetry opt-in/opt-out** setting
- **Skills authoring guide** + example skills/hooks
- **License file** (MIT)

### P2 — Nice to Have
- Multi-turn conversation memory
- Tool result formatting (tables, Chorus UI links)
- Webview task dashboard (defer to Week 4 if time-constrained)

---

## 2. Architecture Decisions

### AD-1: State Machine — Flat enum + event emitter (no library)

Two independent state machines sharing one `EventEmitter`:

```
ConnectionState: disconnected → connecting → connected → error → disconnected
TaskState:       idle → claimed → working → submitting → verifying → idle
```

**Why no xstate/statecharts?** Overkill for 2 small machines. A `switch`-based transition function with typed events is testable and zero-dep.

State stored in `ExtensionContext.globalState` (connection prefs) and `workspaceState` (active task ID). On activation, restore last task state and attempt reconnect.

### AD-2: Status Bar — Single item, compound label

Format: `$(plug) Chorus: Connected | Task #42 (working)`
Color-coded: green=connected, yellow=connecting, red=error, grey=disconnected.

### AD-3: Marketplace — Minimal viable listing

Ship with placeholder SVG icon (Chorus "C" logo). Real icon can be swapped pre-publish. Target activation events: `onStartupFinished` + `onCommand:chorus.*` to avoid eager activation.

### AD-4: Documentation — docs/ as markdown, no static site

Keep docs as `.md` files navigable on GitHub. No docusaurus/vitepress overhead.

---

## 3. Implementation Tasks (TDD-ordered)

All tasks follow Red → Green → Refactor. Estimated effort in half-days (0.5d).

### Phase A: State Management (3d)

| # | Task | Tests | Est |
|---|------|-------|-----|
| A1 | `src/state/connection-state.ts` — enum, transition fn, validators | Unit: valid/invalid transitions, error recovery | 0.5d |
| A2 | `src/state/task-state.ts` — enum, transition fn | Unit: full lifecycle, invalid transition throws | 0.5d |
| A3 | `src/state/state-manager.ts` — owns both machines, emits events, persist/restore via globalState/workspaceState | Unit: event emission, persistence round-trip (mock memento) | 1d |
| A4 | `src/state/status-bar.ts` — creates/updates StatusBarItem from state events | Unit: label+color for each state combo | 0.5d |
| A5 | Auto-reconnect logic in `state-manager` — on `error`/`disconnected`, schedule retry with backoff (reuse `mcp/client` backoff params) | Unit: retry scheduling, max attempts, cancel on dispose | 0.5d |

### Phase B: Marketplace Preparation (2d)

| # | Task | Tests | Est |
|---|------|-------|-----|
| B1 | Update `package.json` — publisher, displayName, description, categories (`["Machine Learning", "Chat"]`), keywords, icon path, engines, activation events, contributes.configuration for telemetry | Snapshot: validate required fields exist | 0.5d |
| B2 | `.vscodeignore` — exclude src/, tests/, .github/, docs/, node_modules dev, tsconfig, etc. | CI: `vsce package --no-yarn` size check ≤500KB | 0.5d |
| B3 | `LICENSE` (MIT) + `CHANGELOG.md` | — | 0.25d |
| B4 | `assets/icon.svg` — placeholder 128×128 Chorus logo | — | 0.25d |
| B5 | Telemetry opt-in setting + guard utility `src/telemetry.ts` | Unit: respects setting, no-op when disabled | 0.5d |

### Phase C: Chat Enhancements (1.5d)

| # | Task | Tests | Est |
|---|------|-------|-----|
| C1 | Quick pick command `chorus.quickAction` — claim/submit/verify picker wired to MCP tools | Integration: mock quickPick selection → correct tool call | 0.5d |
| C2 | `src/chat/progress.ts` — wrap long MCP calls in `vscode.window.withProgress` | Unit: progress reported, cancellation token forwarded | 0.5d |
| C3 | Multi-turn memory — `src/chat/memory.ts` stores last N turns per session in Map, injected into ContextBuilder | Unit: stores/retrieves/evicts, respects token budget | 0.5d |

### Phase D: Documentation (1.5d)

| # | Task | Tests | Est |
|---|------|-------|-----|
| D1 | `README.md` rewrite — badges (build, marketplace, license), features, quick start, config table, architecture diagram (mermaid) | — | 0.5d |
| D2 | `docs/getting-started.md` — install, connect, first task walkthrough | — | 0.25d |
| D3 | `docs/configuration.md` — all settings with defaults and descriptions | — | 0.25d |
| D4 | `docs/skills-authoring.md` + `examples/skills/fix-lint.md` | — | 0.25d |
| D5 | `docs/hooks-guide.md` + `examples/hooks/pre-claim-check.sh` | — | 0.25d |

### Phase E: Integration & Wiring (1d)

| # | Task | Tests | Est |
|---|------|-------|-----|
| E1 | Wire StateManager into `extension.ts` activate/deactivate | Integration: activate → status bar shown, deactivate → cleanup | 0.5d |
| E2 | Wire state transitions into MCP client events + task commands | Integration: connect success → state=connected, claim → state=claimed | 0.5d |

**Total: ~9 days / 1 developer ≈ 2 calendar weeks with buffer, or 1 week with 2 devs.**

---

## 4. Risks & Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| State persistence corruption after schema change | Tasks stuck in invalid state | Version the persisted state; migration fn on load; `resetState` command |
| VSIX size bloat from bundled deps | Marketplace rejection (>20MB limit) | esbuild single-bundle, `.vscodeignore`, CI size gate |
| Placeholder icon looks unprofessional | Low install confidence | Ship with clean SVG "C"; swap for designed asset before public launch |
| Multi-turn memory unbounded growth | Memory pressure in long sessions | Cap at 20 turns, FIFO eviction, configurable via setting |
| Webview dashboard deferred | Users lack task overview | Quick pick + status bar covers 80% of use cases; webview → Week 4 |

---

## 5. Definition of Done

- [ ] All new code has tests (target: ≥120 tests total, 0 failures)
- [ ] `vsce package` produces VSIX <500KB with no warnings
- [ ] Status bar reflects live connection + task state
- [ ] Extension survives VS Code restart with state restored
- [ ] README is marketplace-ready (renders correctly on marketplace preview)
- [ ] docs/ has 4 guides, examples/ has ≥1 skill + ≥1 hook
