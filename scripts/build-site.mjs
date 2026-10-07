#!/usr/bin/env node
// Builds site/data/brain.json from the plugin files, so the site always shows what the plugin really contains.
// Usage: node scripts/build-site.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN = join(ROOT, 'plugins', 'onec-pack');
const V8STD = join(PLUGIN, 'skills', 'onec-v8std', 'references');
const BSP = join(PLUGIN, 'skills', 'onec-bsp', 'references');
const read = (p) => readFileSync(p, 'utf8');

// Digest file of the standard -> brain zone.
const ZONE_OF_FILE = {
  'metadata-configuration-1': 'meta', 'metadata-configuration-2': 'meta', 'metadata-storage': 'meta',
  'object-events-scheduled-jobs': 'events', queries: 'queries', 'data-modification-locks': 'locks',
  'code-modules': 'code', 'code-language': 'code', 'client-server': 'cs', security: 'sec', 'access-rights': 'sec',
  'exchange-libraries': 'lib', localization: 'lib',
  'ui-forms': 'ui', 'ui-design-1': 'ui', 'ui-design-2': 'ui', 'ui-ordinary-app': 'ui',
};
const BSP_GROUPS = {
  base: 'Технологические механизмы', users: 'Пользователи и права', admin: 'Администрирование', service: 'Сервисные',
  signature: 'Электронная подпись', nsi: 'НСИ и классификаторы', integration: 'Интеграция и прикладные',
};

function standards() {
  const rows = [];
  const re = /^\| \[((?:std|doc)\d+)\]\(https:\/\/its\.1c\.ru\/db\/v8std\/content\/(\d+)\/hdoc\) \| (.*?) \| (.*?) \| (.*?) \|$/gm;
  for (const m of read(join(V8STD, 'index.md')).matchAll(re)) {
    const file = m[5].split(',')[0].trim().replace(/\.md$/, '');
    if (!ZONE_OF_FILE[file]) throw new Error(`Unknown digest file ${file} for ${m[1]}`);
    rows.push({ id: m[1], its: Number(m[2]), title: m[3], section: m[4], zone: ZONE_OF_FILE[file], file });
  }
  return rows;
}

function bspSubsystems() {
  const methods = {};
  for (const f of readdirSync(join(BSP, 'api'))) {
    const text = read(join(BSP, 'api', f));
    const sub = (text.match(/^Подсистема: (.+)$/m) || [])[1];
    methods[sub] = (methods[sub] || 0) + (text.match(/^### /gm) || []).length;
  }
  const recipes = readdirSync(BSP).filter((f) => f.endsWith('.md') && f !== 'api-index.md')
    .map((f) => ({ file: f.replace(/\.md$/, ''), text: read(join(BSP, f)) }));
  return Object.keys(methods).sort().map((name) => {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let hit = null;
    for (const r of recipes) {
      const m = r.text.match(new RegExp(`^##\\s+(?:\\d+\\.\\s*)?${esc}(?![\\wА-Яа-яЁё])(.*)$`, 'm'));
      if (m) { hit = { file: r.file, purpose: m[1].replace(/^[\s\-—:·]+/, '').trim() }; break; }
    }
    if (!hit) hit = { file: recipes.find((r) => r.text.includes(name))?.file || 'base-1', purpose: '' };
    return { name, methods: methods[name], recipe: hit.file, purpose: hit.purpose, group: BSP_GROUPS[hit.file.split('-')[0]] };
  });
}

function frontmatter(path) {
  const t = read(path);
  const fm = (t.match(/^---\n([\s\S]*?)\n---/) || [])[1] || '';
  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*(.*)$`, 'm')) || [])[1]?.trim() || '';
  return { name: get('name'), description: get('description'), model: get('model'), lines: t.split('\n').length };
}

function dirStats(dir) {
  let files = 0, bytes = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { const s = dirStats(p); files += s.files; bytes += s.bytes; } else { files++; bytes += statSync(p).size; }
  }
  return { files, bytes };
}

const plugin = JSON.parse(read(join(PLUGIN, '.claude-plugin', 'plugin.json')));
const skillsDir = join(PLUGIN, 'skills');
const skills = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory()).map((d) => {
  const refs = join(skillsDir, d, 'references');
  let refStats = { files: 0, bytes: 0 };
  try { refStats = dirStats(refs); } catch { /* skill without references */ }
  return { ...frontmatter(join(skillsDir, d, 'SKILL.md')), path: `plugins/onec-pack/skills/${d}/SKILL.md`, references: refStats };
});
const agents = readdirSync(join(PLUGIN, 'agents')).map((f) => ({ ...frontmatter(join(PLUGIN, 'agents', f)), path: `plugins/onec-pack/agents/${f}` }));
const std = standards();
const bsp = bspSubsystems();
const data = {
  plugin: { name: plugin.name, version: plugin.version, description: plugin.description },
  builtAt: new Date().toISOString().slice(0, 10),
  counts: { standards: std.length, bspSubsystems: bsp.length, bspMethods: bsp.reduce((a, b) => a + b.methods, 0),
    skills: skills.length, agents: agents.length, ...dirStats(PLUGIN) },
  skills, agents, std, bsp,
};
if (data.counts.standards < 300 || data.counts.bspSubsystems < 60) throw new Error('Plugin data looks incomplete');
mkdirSync(join(ROOT, 'site', 'data'), { recursive: true });
writeFileSync(join(ROOT, 'site', 'data', 'brain.json'), JSON.stringify(data));
console.log(`site/data/brain.json: ${std.length} standards, ${bsp.length} БСП subsystems, ${data.counts.bspMethods} methods, ${skills.length} skills, ${agents.length} agents`);
