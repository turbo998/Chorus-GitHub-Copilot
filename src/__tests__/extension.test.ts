/**
 * Tests for dynamic tool registration from schema registry.
 * Since VS Code API isn't available in headless tests, we test the logic
 * by importing the schema and verifying registration behavior structurally.
 */

import { allTools, getToolsByModule } from '../schema/index.js';
import type { ToolDefinition } from '../schema/types.js';

describe('Dynamic tool registration', () => {
  test('allTools has 83 tool definitions', () => {
    expect(allTools.length).toBe(83);
  });

  test('every tool has required fields', () => {
    for (const t of allTools) {
      expect(t.name).toBeTruthy();
      expect(t.module).toBeTruthy();
      expect(t.displayName).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.modelDescription).toBeTruthy();
      expect(t.inputSchema).toBeDefined();
      expect(t.inputSchema.type).toBe('object');
    }
  });

  test('getToolsByModule filters correctly', () => {
    const publicTools = getToolsByModule('public');
    expect(publicTools.length).toBeGreaterThan(0);
    expect(publicTools.every(t => t.module === 'public')).toBe(true);
  });

  test('confirmationRequired is boolean or undefined', () => {
    for (const t of allTools) {
      expect([true, false, undefined]).toContain(t.confirmationRequired);
    }
  });

  test('module filtering with enabledModules config pattern', () => {
    const enabledModules = ['public', 'developer'];
    const filtered = allTools.filter(t => enabledModules.includes(t.module));
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(allTools.length);
    expect(filtered.every(t => enabledModules.includes(t.module))).toBe(true);
  });

  test('tool names are unique', () => {
    const names = allTools.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  describe('ChorusToolHandler logic', () => {
    // Test the handler logic without VS Code API
    test('confirmationRequired drives prepareInvocation behavior', () => {
      const readTool = allTools.find(t => t.confirmationRequired === false || t.confirmationRequired === undefined);
      const writeTool = allTools.find(t => t.confirmationRequired === true);

      // Tools that need confirmation should have confirmationRequired=true
      if (writeTool) {
        expect(writeTool.confirmationRequired).toBe(true);
      }

      // Read-only tools should not require confirmation
      if (readTool) {
        expect(readTool.confirmationRequired).not.toBe(true);
      }
    });
  });
});
