# Chorus for GitHub Copilot

Bridge the [Chorus AI-DLC](https://github.com/Chorus-AIDLC/Chorus) platform to GitHub Copilot Chat.

## Features

- **`@chorus` Chat Participant** — natural language interface to Chorus
- **Language Model Tools** — Copilot Agent Mode auto-invokes Chorus tools
- **MCP Bridge** — connects to Chorus server via standard MCP protocol

## Quick Start

1. Install the extension
2. Set `chorus.serverUrl` and `chorus.apiKey` in VS Code Settings
3. Type `@chorus checkin` in Copilot Chat

## Supported Tools

| Tool | Description |
|------|-------------|
| `chorus_checkin` | Check in — get identity, projects, notifications |
| `chorus_list_tasks` | List tasks in a project |
| `chorus_get_available_tasks` | Get claimable (open) tasks |
| `chorus_claim_task` | Claim a task |
| `chorus_report_work` | Report progress on a task |
| `chorus_submit_for_verify` | Submit task for review |

## Architecture

```
Copilot Chat → @chorus participant → ChorusMcpClient → Chorus Server /api/mcp
Copilot Agent Mode → LM Tools → ChorusMcpClient → Chorus Server /api/mcp
```
