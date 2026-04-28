import * as vscode from 'vscode';

/**
 * Check whether telemetry is enabled via the `chorus.telemetry.enabled` setting.
 * Defaults to **false** (opt-in).
 */
export function isTelemetryEnabled(): boolean {
  const config = vscode.workspace.getConfiguration('chorus');
  return config.get<boolean>('telemetry.enabled', false);
}

/**
 * Track a named event with optional properties.
 * No-ops when telemetry is disabled.
 */
export function trackEvent(name: string, properties?: Record<string, string>): void {
  if (!isTelemetryEnabled()) {
    return;
  }
  // Future: send to telemetry endpoint
  console.debug(`[chorus-telemetry] ${name}`, properties ?? {});
}
