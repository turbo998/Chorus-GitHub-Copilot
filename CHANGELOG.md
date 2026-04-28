# Changelog

All notable changes to **Chorus for GitHub Copilot** will be documented here.

## [0.1.0] — Week 3 (2025-06-20)

### Added
- Marketplace preparation: icon, LICENSE, CHANGELOG, README rewrite
- Telemetry guard (`chorus.telemetry.enabled`, default off)
- Documentation: getting-started, configuration, skills-authoring, hooks-guide
- Example skill and hook files

## [0.0.2] — Week 2 (2025-06-13)

### Added
- Skills injection system with YAML frontmatter parser
- Hook lifecycle management (pre/post events)
- Automated code review agent with configurable criteria
- Context builder with session, task, and skills providers

## [0.0.1] — Week 1 (2025-06-06)

### Added
- Initial extension scaffold with chat participant `@chorus`
- 83 language-model tools generated from Chorus OpenAPI schema
- MCP client with SSE transport and session management
- Basic commands: `/checkin`, `/tasks`, `/session`, `/help`
- Configuration: `chorus.serverUrl`, `chorus.apiKey`, `chorus.autoSession`
