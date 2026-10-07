#!/usr/bin/env node
// Heuristic checks of 1C BSL modules against the onec-pack standards.
// Usage:
//   node check-bsl.mjs [dir-or-file ...]   scan .bsl files (default: .), exit 1 on findings
//   node check-bsl.mjs --hook              read a Claude Code PostToolUse payload from stdin;
//                                          reports only findings on lines the edit introduced
// Disable the hook per project with MDIGITAL_BSL_CHECK=off.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const MAX_LINE = 120;
const TAB_WIDTH = 4;
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'ConfigDumpInfo']);
const call = (names) => new RegExp(`(^|[^.\\wА-Яа-яЁё])(${names})\\s*\\(`, 'i');

// JS \b is ASCII-only, so Cyrillic keywords are delimited with explicit lookarounds.
const LOOP_START = /^\s*(Для|Пока|For|While)(?=[\s(]).*[\s)](Цикл|Do)\s*$/i;
const LOOP_END = /^\s*(КонецЦикла|EndDo)\s*;?\s*$/i;
const IN_LOOP = [
  [/\.(Выполнить|ВыполнитьПакет|Execute|ExecuteBatch)\s*\(\s*\)/i, 'запрос выполняется в цикле - соберите данные одним запросом (onec-queries §1)'],
  [/\.(НайтиПоКоду|НайтиПоНаименованию|НайтиПоРеквизиту|НайтиПоНомеру)\s*\(/i, 'поиск в базе в цикле - один запрос по всему набору (onec-queries §1)'],
  [/\.ПолучитьОбъект\s*\(/i, 'ПолучитьОбъект() в цикле - читается весь объект на каждой итерации (onec-queries §1)'],
  [/(ЗначениеРеквизитаОбъекта|ЗначенияРеквизитовОбъекта)(?![а-яё])/i, 'чтение реквизитов в цикле - используйте ЗначениеРеквизитаОбъектов или запрос (onec-queries §1)'],
];
const ANYWHERE = [
  [call('Сообщить|Message'), 'Сообщить() - используйте ОбщегоНазначения.СообщитьПользователю (onec-code-standards §6)'],
  [call('Вопрос|Предупреждение|ОткрытьФормуМодально|ВвестиЗначение|ВвестиЧисло|ВвестиСтроку|ВвестиДату|DoQueryBox|DoMessageBox|OpenFormModal'), 'модальный вызов - используйте ...Асинх + Ждать или Показать... с ОписаниеОповещения (onec-code-standards §7)'],
  [call('Выполнить|Вычислить|Execute|Eval'), 'Выполнить/Вычислить - запрещено на внешних данных, используйте ОбщегоНазначения.ВыполнитьМетодКонфигурации (onec-code-standards §9)'],
];

// Blanks out string literals and comments so keywords inside query texts don't match.
function codeLines(text) {
  let inString = false;
  return text.split(/\r?\n/).map((raw) => {
    let out = '';
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (inString) {
        if (ch === '"') {
          if (raw[i + 1] === '"') i++;
          else inString = false;
        }
        out += ' ';
      } else if (ch === '"') {
        inString = true;
        out += ' ';
      } else if (ch === '/' && raw[i + 1] === '/') {
        break;
      } else {
        out += ch;
      }
    }
    return { raw, code: out };
  });
}

function check(text) {
  const lines = codeLines(text.replace(/^﻿/, ''));
  const found = [];
  const add = (i, message) => found.push({ line: i + 1, text: lines[i].raw, message });
  let loopDepth = 0;

  lines.forEach(({ raw, code }, i) => {
    if (LOOP_END.test(code)) loopDepth = Math.max(0, loopDepth - 1);
    if (loopDepth > 0) for (const [re, msg] of IN_LOOP) if (re.test(code)) add(i, msg);
    if (LOOP_START.test(code)) loopDepth++;
    for (const [re, msg] of ANYWHERE) if (re.test(code)) add(i, msg);

    if (call('НачатьТранзакцию|BeginTransaction').test(code)) {
      const next = lines.slice(i + 1).find((l) => l.code.trim() !== '');
      if (!next || !/^\s*(Попытка|Try)\s*$/i.test(next.code)) {
        add(i, 'после НачатьТранзакцию() сразу должна идти Попытка (onec-code-standards §5)');
      }
    }
    if (/^\s*(Исключение|Except)\s*$/i.test(code)) {
      const rest = lines.slice(i + 1);
      const end = rest.findIndex((l) => /^\s*(КонецПопытки|EndTry)\s*;?\s*$/i.test(l.code));
      const body = end === -1 ? rest : rest.slice(0, end);
      if (body.every((l) => l.code.trim() === '')) {
        add(i, 'пустой блок Исключение - залогируйте и обработайте или ВызватьИсключение (onec-code-standards §6)');
      }
    }
    const width = raw.replace(/\t/g, ' '.repeat(TAB_WIDTH)).length;
    if (width > MAX_LINE) add(i, `строка ${width} символов (максимум ${MAX_LINE})`);
  });
  return found;
}

function collect(path, out) {
  if (!existsSync(path)) return out;
  const stat = statSync(path);
  if (stat.isFile()) {
    if (extname(path).toLowerCase() === '.bsl') out.push(path);
    return out;
  }
  for (const entry of readdirSync(path)) {
    if (!IGNORED_DIRS.has(entry)) collect(join(path, entry), out);
  }
  return out;
}

// Lines the tool call wrote: the whole file for Write, new_string for Edit/MultiEdit.
function introducedLines(input) {
  const chunks = typeof input.content === 'string'
    ? [input.content]
    : (Array.isArray(input.edits) ? input.edits : [input]).map((e) => e.new_string ?? '');
  return new Set(chunks.flatMap((c) => c.split(/\r?\n/)).map((l) => l.trim()).filter(Boolean));
}

function runHook() {
  if (process.env.MDIGITAL_BSL_CHECK === 'off') process.exit(0);
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    process.exit(0);
  }
  const input = payload?.tool_input ?? {};
  const file = input.file_path;
  if (!file || extname(file).toLowerCase() !== '.bsl' || !existsSync(file)) process.exit(0);
  const fresh = introducedLines(input);
  const found = check(readFileSync(file, 'utf8')).filter((f) => fresh.has(f.text.trim()));
  if (!found.length) process.exit(0);
  process.stderr.write(
    `${file}: нарушения стандартов 1С в изменённых строках:\n` +
      found.map((f) => `  ${f.line}: ${f.message}\n      ${f.text.trim()}`).join('\n') +
      '\nИсправьте по скиллам onec-pack или объясните пользователю, почему это исключение.\n',
  );
  process.exit(2); // exit code 2 feeds stderr back to Claude
}

function runScan(paths) {
  const files = (paths.length ? paths : ['.']).flatMap((p) => collect(p, []));
  let total = 0;
  for (const file of files) {
    for (const f of check(readFileSync(file, 'utf8'))) {
      console.log(`${file}:${f.line}\t${f.message}`);
      total++;
    }
  }
  if (!total) {
    console.log(`OK: ${files.length} .bsl file(s), no findings.`);
    return;
  }
  console.log(`\n${total} finding(s) in ${files.length} .bsl file(s). Heuristic - confirm each by reading the code.`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args[0] === '--hook') runHook();
else runScan(args);
