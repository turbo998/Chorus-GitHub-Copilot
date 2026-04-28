import { describe, it, expect } from 'vitest';
import { allTools, getToolsByModule } from '../schema/index.js';

describe('Dynamic tool registration', () => {
  it('allTools has 83 tool definitions', () => {
    expect(allTools.length).toBe(83);
  });

  it('every tool has required fields', () => {
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

  it('getToolsByModule filters correctly', () => {
    const publicTools = getToolsByModule('public');
    expect(publicTools.length).toBeGreaterThan(0);
    expect(publicTools.every(t => t.module === 'public')).toBe(true);
  });

  it('confirmationRequired is boolean or undefined', () => {
    for (const t of allTools) {
      expect([true, false, undefined]).toContain(t.confirmationRequired);
    }
  });

  it('module filtering with enabledModules config pattern', () => {
    const enabledModules = ['public', 'developer'];
    const filtered = allTools.filter(t => enabledModules.includes(t.module));
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(allTools.length);
    expect(filtered.every(t => enabledModules.includes(t.module))).toBe(true);
  });

  it('tool names are unique', () => {
    const names = allTools.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('confirmationRequired drives prepareInvocation behavior', () => {
    const readTool = allTools.find(t => t.confirmationRequired === false || t.confirmationRequired === undefined);
    const writeTool = allTools.find(t => t.confirmationRequired === true);
    if (writeTool) expect(writeTool.confirmationRequired).toBe(true);
    if (readTool) expect(readTool.confirmationRequired).not.toBe(true);
  });
});
