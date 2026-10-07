#!/usr/bin/env node
// Repository checks: the check-bsl hook, plugin manifests, reference integrity and the site build.
// Usage: node scripts/test.mjs  (exit 1 on the first failed group)
import { readFileSync, readdirSync, existsSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN = join(ROOT, 'plugins', 'onec-pack');
const CHECK = join(PLUGIN, 'scripts', 'check-bsl.mjs');
const FIX = join(ROOT, 'tests', 'fixtures');
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const run = (args, opts = {}) => spawnSync(process.execPath, args, { encoding: 'utf8', ...opts });

const tests = {
  'check-bsl finds violations in bad.bsl'() {
    const r = run([CHECK, join(FIX, 'bad.bsl')]);
    assert.equal(r.status, 1);
    for (const s of ['запрос выполняется в цикле', 'Сообщить()', 'после НачатьТранзакцию()', 'пустой блок Исключение']) assert.ok(r.stdout.includes(s), s);
  },
  'check-bsl passes good.bsl'() {
    const r = run([CHECK, join(FIX, 'good.bsl')]);
    assert.equal(r.status, 0, r.stdout);
  },
  'check-bsl hook reports only lines the edit introduced'() {
    const dir = mkdtempSync(join(tmpdir(), 'onec-brain-'));
    try {
      const file = join(dir, 'Module.bsl');
      copyFileSync(join(FIX, 'bad.bsl'), file);
      const payload = (newString) => JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: file, old_string: 'x', new_string: newString } });
      const hit = run([CHECK, '--hook'], { input: payload('\tСообщить("Готово");') });
      assert.equal(hit.status, 2);
      assert.ok(hit.stderr.includes('Сообщить()') && !hit.stderr.includes('запрос выполняется в цикле'), hit.stderr);
      assert.equal(run([CHECK, '--hook'], { input: payload('// комментарий') }).status, 0);
      assert.equal(run([CHECK, '--hook'], { input: payload('\tСообщить("Готово");'), env: { ...process.env, MDIGITAL_BSL_CHECK: 'off' } }).status, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
  'manifests are consistent'() {
    const plugin = json(join(PLUGIN, '.claude-plugin', 'plugin.json'));
    const market = json(join(ROOT, '.claude-plugin', 'marketplace.json'));
    const entry = market.plugins.find((p) => p.name === plugin.name);
    assert.ok(entry, 'plugin listed in marketplace');
    assert.equal(entry.version, plugin.version);
    assert.ok(existsSync(join(ROOT, entry.source, '.claude-plugin', 'plugin.json')));
    assert.equal(json(join(ROOT, 'package.json')).version, plugin.version);
    const hooks = JSON.stringify(json(join(PLUGIN, 'hooks', 'hooks.json')));
    assert.ok(hooks.includes('scripts/check-bsl.mjs') && existsSync(CHECK));
  },
  'every skill and agent has frontmatter'() {
    for (const d of readdirSync(join(PLUGIN, 'skills'))) {
      const t = readFileSync(join(PLUGIN, 'skills', d, 'SKILL.md'), 'utf8');
      assert.match(t, new RegExp(`^---\\nname: ${d}\\ndescription: .{50,}`), d);
    }
    for (const f of readdirSync(join(PLUGIN, 'agents'))) assert.match(readFileSync(join(PLUGIN, 'agents', f), 'utf8'), /^---\nname: [\w-]+\ndescription: /, f);
  },
  'every standard in the index has a digest section'() {
    const refs = join(PLUGIN, 'skills', 'onec-v8std', 'references');
    const rows = [...readFileSync(join(refs, 'index.md'), 'utf8').matchAll(/^\| \[((?:std|doc)\d+)\].*\| ([\w-]+)\.md(?:, [\w-.]+)* \|$/gm)];
    assert.ok(rows.length >= 300, `index rows: ${rows.length}`);
    const missing = rows.filter(([, id, file]) => !new RegExp(`^### ${id}(?![0-9])`, 'm').test(readFileSync(join(refs, `${file}.md`), 'utf8')));
    assert.deepEqual(missing.map((m) => m[1]), []);
  },
  'БСП API files name their subsystem'() {
    const api = join(PLUGIN, 'skills', 'onec-bsp', 'references', 'api');
    const bad = readdirSync(api).filter((f) => !/^Подсистема: .+$/m.test(readFileSync(join(api, f), 'utf8')));
    assert.deepEqual(bad, []);
  },
  'site builds with full data'() {
    const r = run([join(ROOT, 'scripts', 'build-site.mjs')]);
    assert.equal(r.status, 0, r.stderr);
    const d = json(join(ROOT, 'site', 'data', 'brain.json'));
    assert.equal(d.counts.standards, 321);
    assert.equal(d.counts.bspSubsystems, 67);
    assert.equal(d.counts.bspMethods, 2982);
    assert.ok(d.bsp.every((b) => b.purpose && b.recipe && b.group), 'every БСП subsystem has a purpose and a recipe');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message.split('\n').join('\n     ')}`); }
}
console.log(failed ? `\n${failed} failed` : `\nall ${Object.keys(tests).length} passed`);
process.exit(failed ? 1 : 0);
