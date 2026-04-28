# Hooks Guide

Hooks let you run scripts at specific lifecycle events in the Chorus workflow.

## Hook Events

| Event | Trigger |
|---|---|
| `pre-submit` | Before submitting a check-in or proposal |
| `post-submit` | After successful submission |
| `pre-review` | Before automated code review runs |
| `post-review` | After review completes |

## Hook Location

Place executable scripts in `.chorus/hooks/` in your workspace root:

```
.chorus/hooks/
├── pre-submit-lint.sh
├── post-submit-notify.sh
└── pre-review-build.sh
```

## Hook Contract

- Scripts receive context via environment variables (`CHORUS_PROJECT_UUID`, `CHORUS_TASK_UUID`, etc.)
- Exit code `0` = success, non-zero = abort the action (for `pre-*` hooks)
- stdout/stderr is captured and shown in the output channel

## Example

See [`examples/hooks/pre-submit-lint.sh`](../examples/hooks/pre-submit-lint.sh).
