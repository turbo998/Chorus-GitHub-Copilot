import { SkillFile } from './types.js';

export function parseSkill(content: string, filePath: string = ''): SkillFile {
  const name = filePath ? filePath.replace(/^.*[\\/]/, '').replace(/\.md$/, '') : 'unknown';

  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!fmMatch) {
    return { name, type: '', tags: [], priority: 0, body: content.trim(), filePath };
  }

  const frontmatter = fmMatch[1];
  const body = fmMatch[2].trim();

  const typeMatch = frontmatter.match(/^type:\s*(.+)$/m);
  const type = typeMatch ? typeMatch[1].trim() : '';

  const tagsMatch = frontmatter.match(/^tags:\s*\[([^\]]*)\]$/m);
  const tags = tagsMatch
    ? tagsMatch[1].split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const priorityMatch = frontmatter.match(/^priority:\s*(\d+)$/m);
  const priority = priorityMatch ? parseInt(priorityMatch[1], 10) : 0;

  return { name, type, tags, priority, body, filePath };
}
