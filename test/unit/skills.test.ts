import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { parseSkill } from '../../src/skills/parser.js';
import { SkillLoader } from '../../src/skills/loader.js';
import { SkillIndex } from '../../src/skills/skillIndex.js';
import { SkillsService } from '../../src/skills/service.js';
import * as os from 'node:os';

describe('parseSkill', () => {
  it('parses valid frontmatter', () => {
    const content = `---\ntype: review\ntags: [security, performance]\npriority: 1\n---\n# Body here`;
    const skill = parseSkill(content, '/skills/my-skill.md');
    expect(skill.name).toBe('my-skill');
    expect(skill.type).toBe('review');
    expect(skill.tags).toEqual(['security', 'performance']);
    expect(skill.priority).toBe(1);
    expect(skill.body).toBe('# Body here');
    expect(skill.filePath).toBe('/skills/my-skill.md');
  });

  it('handles no frontmatter', () => {
    const skill = parseSkill('Just a body', '/x/test.md');
    expect(skill.type).toBe('');
    expect(skill.tags).toEqual([]);
    expect(skill.priority).toBe(0);
    expect(skill.body).toBe('Just a body');
  });

  it('handles empty string', () => {
    const skill = parseSkill('');
    expect(skill.body).toBe('');
    expect(skill.tags).toEqual([]);
  });

  it('handles missing fields in frontmatter', () => {
    const content = `---\ntype: guide\n---\nSome body`;
    const skill = parseSkill(content, '/a.md');
    expect(skill.type).toBe('guide');
    expect(skill.tags).toEqual([]);
    expect(skill.priority).toBe(0);
  });
});

describe('SkillLoader', () => {
  let tmpDir: string;
  const loader = new SkillLoader();

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('loads .md files from dir', async () => {
    await fs.writeFile(path.join(tmpDir, 'a.md'), '---\ntype: t\ntags: [x]\npriority: 1\n---\nbody a');
    await fs.writeFile(path.join(tmpDir, 'b.md'), 'body b');
    const skills = await loader.loadFromDir(tmpDir);
    expect(skills).toHaveLength(2);
  });

  it('handles missing dir', async () => {
    const skills = await loader.loadFromDir('/nonexistent-dir-12345');
    expect(skills).toEqual([]);
  });

  it('ignores non-.md files', async () => {
    await fs.writeFile(path.join(tmpDir, 'a.md'), 'body');
    await fs.writeFile(path.join(tmpDir, 'b.txt'), 'ignore');
    const skills = await loader.loadFromDir(tmpDir);
    expect(skills).toHaveLength(1);
  });
});

describe('SkillIndex', () => {
  it('add + match by tags', () => {
    const idx = new SkillIndex();
    idx.add({ name: 's1', type: '', tags: ['security'], priority: 1, body: '', filePath: '' });
    idx.add({ name: 's2', type: '', tags: ['perf'], priority: 2, body: '', filePath: '' });
    expect(idx.match(['security'])).toHaveLength(1);
    expect(idx.match(['security'])[0].name).toBe('s1');
  });

  it('sorts by priority desc', () => {
    const idx = new SkillIndex();
    idx.add({ name: 'low', type: '', tags: ['a'], priority: 1, body: '', filePath: '' });
    idx.add({ name: 'high', type: '', tags: ['a'], priority: 10, body: '', filePath: '' });
    const matched = idx.match(['a']);
    expect(matched[0].name).toBe('high');
    expect(matched[1].name).toBe('low');
  });

  it('no match returns []', () => {
    const idx = new SkillIndex();
    idx.add({ name: 's', type: '', tags: ['x'], priority: 1, body: '', filePath: '' });
    expect(idx.match(['z'])).toEqual([]);
  });

  it('remove works', () => {
    const idx = new SkillIndex();
    idx.add({ name: 's1', type: '', tags: ['a'], priority: 1, body: '', filePath: '' });
    idx.remove('s1');
    expect(idx.match(['a'])).toEqual([]);
  });
});

describe('SkillsService', () => {
  let globalDir: string;
  let wsDir: string;

  beforeEach(async () => {
    globalDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-global-'));
    wsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-ws-'));
  });

  afterEach(async () => {
    await fs.rm(globalDir, { recursive: true, force: true });
    await fs.rm(wsDir, { recursive: true, force: true });
  });

  it('loads workspace + global', async () => {
    const gSkills = path.join(globalDir, '.chorus', 'skills');
    const wSkills = path.join(wsDir, '.chorus', 'skills');
    await fs.mkdir(gSkills, { recursive: true });
    await fs.mkdir(wSkills, { recursive: true });
    await fs.writeFile(path.join(gSkills, 'g.md'), '---\ntags: [a]\npriority: 1\n---\nglobal');
    await fs.writeFile(path.join(wSkills, 'w.md'), '---\ntags: [b]\npriority: 2\n---\nworkspace');
    const svc = new SkillsService(wsDir, globalDir);
    await svc.load();
    expect(svc.getMatchedSkills(['a'])).toHaveLength(1);
    expect(svc.getMatchedSkills(['b'])).toHaveLength(1);
  });

  it('workspace overrides global by name', async () => {
    const gSkills = path.join(globalDir, '.chorus', 'skills');
    const wSkills = path.join(wsDir, '.chorus', 'skills');
    await fs.mkdir(gSkills, { recursive: true });
    await fs.mkdir(wSkills, { recursive: true });
    await fs.writeFile(path.join(gSkills, 'shared.md'), '---\ntags: [a]\npriority: 1\n---\nglobal version');
    await fs.writeFile(path.join(wSkills, 'shared.md'), '---\ntags: [a]\npriority: 2\n---\nws version');
    const svc = new SkillsService(wsDir, globalDir);
    await svc.load();
    const matched = svc.getMatchedSkills(['a']);
    expect(matched).toHaveLength(1);
    expect(matched[0].body).toBe('ws version');
    expect(matched[0].priority).toBe(2);
  });

  it('getContextSnippet formats correctly', async () => {
    const wSkills = path.join(wsDir, '.chorus', 'skills');
    await fs.mkdir(wSkills, { recursive: true });
    await fs.writeFile(path.join(wSkills, 'tip.md'), '---\ntags: [review]\npriority: 1\n---\nCheck for bugs');
    const svc = new SkillsService(wsDir);
    await svc.load();
    const snippet = svc.getContextSnippet(['review']);
    expect(snippet).toContain('## tip');
    expect(snippet).toContain('Check for bugs');
  });

  it('getContextSnippet returns empty for no matches', async () => {
    const svc = new SkillsService(wsDir);
    await svc.load();
    expect(svc.getContextSnippet(['nope'])).toBe('');
  });
});
