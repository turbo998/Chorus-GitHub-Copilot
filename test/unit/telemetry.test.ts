import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock vscode before importing module under test
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
  },
}));

import * as vscode from 'vscode';
import { isTelemetryEnabled, trackEvent } from '../../src/telemetry';

describe('telemetry', () => {
  const mockGet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.workspace.getConfiguration as ReturnType<typeof vi.fn>).mockReturnValue({
      get: mockGet,
    });
  });

  describe('isTelemetryEnabled', () => {
    it('returns false when setting is false', () => {
      mockGet.mockReturnValue(false);
      expect(isTelemetryEnabled()).toBe(false);
    });

    it('returns true when setting is true', () => {
      mockGet.mockReturnValue(true);
      expect(isTelemetryEnabled()).toBe(true);
    });

    it('defaults to false', () => {
      mockGet.mockImplementation((_key: string, defaultValue: boolean) => defaultValue);
      expect(isTelemetryEnabled()).toBe(false);
    });
  });

  describe('trackEvent', () => {
    it('no-ops when telemetry is disabled', () => {
      mockGet.mockReturnValue(false);
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      trackEvent('test.event', { foo: 'bar' });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('logs when telemetry is enabled', () => {
      mockGet.mockReturnValue(true);
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      trackEvent('test.event', { foo: 'bar' });
      expect(spy).toHaveBeenCalledWith('[chorus-telemetry] test.event', { foo: 'bar' });
      spy.mockRestore();
    });
  });
});
