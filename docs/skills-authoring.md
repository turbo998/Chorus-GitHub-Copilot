# Skills Authoring Guide

Skills are Markdown files with YAML frontmatter that get injected into the Copilot context, giving the AI specialized knowledge and instructions.

## Skill File Format

```markdown
---
name: my-skill
description: Short description of what this skill does
triggers:
  - keyword1
  - keyword2
priority: 10
---

# Skill Content

Instructions and context that will be injected into the Copilot prompt...
```

## Frontmatter Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | Unique skill identifier |
| `description` | `string` | ✅ | Human-readable description |
| `triggers` | `string[]` | ❌ | Keywords that activate this skill |
| `priority` | `number` | ❌ | Higher = injected first (default: 0) |

## Skill Locations

Place skill files in:
- `.chorus/skills/` in your workspace root
- Global skills directory (configured via settings)

## Example

See [`examples/skills/review-security.md`](../examples/skills/review-security.md) for a complete example.
