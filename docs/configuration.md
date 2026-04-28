# Configuration Reference

All settings are under the `chorus.*` namespace.

## Settings

### `chorus.serverUrl`
- **Type:** `string`
- **Default:** `""`
- Chorus server base URL (e.g., `https://chorus.example.com`)

### `chorus.apiKey`
- **Type:** `string`
- **Default:** `""`
- API key for authenticating with the Chorus server

### `chorus.autoSession`
- **Type:** `boolean`
- **Default:** `true`
- Automatically start an MCP session when the extension activates

### `chorus.enabledModules`
- **Type:** `array`
- **Default:** `["pm", "developer", "session", "public", "admin", "presence"]`
- Which tool modules to register. Remove modules to reduce the tool set exposed to Copilot.

### `chorus.requestTimeout`
- **Type:** `number`
- **Default:** `30000`
- HTTP request timeout in milliseconds

### `chorus.telemetry.enabled`
- **Type:** `boolean`
- **Default:** `false`
- Opt-in anonymous telemetry. No data is sent when disabled.

### `chorus.heartbeatInterval`
- **Type:** `number`
- **Default:** `60000`
- Interval (ms) for sending session heartbeats to keep the MCP connection alive
