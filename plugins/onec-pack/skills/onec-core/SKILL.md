---
name: onec-core
description: Entry point and router for every 1C:Enterprise 8.3 task at Mdigital - writing or fixing BSL code, queries, integrations with our backend, extensions and changes to vendor configurations (БП, УТ, ERP, ЗУП, КА, own configurations on БСП). Holds the shared working rules for a team that develops in the Configurator without Git - how code gets to Claude (pasted or dumped to files), how Claude hands code back, what to ask before writing, and precedence. Use whenever the request mentions 1С, BSL, a configuration, a metadata object, a module, a form, a query or an exchange with 1С. Triggers - "1С", "1C", "1с", "одинэс", "конфигуратор", "конфигурация", "типовая", "БСП", "модуль", "общий модуль", "модуль объекта", "модуль менеджера", "форма", "справочник", "документ", "регистр", "проведение", "обработка", "отчёт", "СКД", "запрос", "регламентное задание", "расширение", "доработка", "BSL", "1C:Enterprise".
---

# 1C core (Mdigital)

Every 1C request starts here. Collect the context once per task, pick the route, load the target skill, then hand the result back in a form a developer can paste into the Configurator.

## 1. Route the request

| Request | Load |
|---|---|
| Write / fix / refactor a procedure, module, form handler, posting, object handler | `onec-code-standards` |
| Query text, report on СКД, "тормозит", "долго проводится", locks, deadlocks, "ожидание на блокировке" | `onec-queries` (+ `onec-code-standards` for the surrounding code) |
| Exchange with the backend, site, bank, mobile app: HTTP service, REST, JSON, webhook, "в реальном времени", queue, регламентное задание for sync | `onec-integrations` |
| Change a vendor configuration (БП, УТ, ERP, ЗУП, КА...), "доработать типовую", "расширение", "обновление типовой", "снять с поддержки" | `onec-extensions` |
| Plan a new feature or a non-trivial change before coding | agent `onec-architect` |
| "проверь код", "сделай ревью", before handing code to the customer or loading it into the working base | agent `onec-reviewer` |
| Printing, attached files, additional attributes, contact information, access rights/RLS, users, update handlers, scheduled jobs, long operations, report variants, attachable commands, external processors, email/SMS, e-signature, currencies, calendars - or any helper БСП may already have | `onec-bsp` (recipes + API of БСП 3.2.1) |
| "что говорит стандарт", a std number, metadata naming/synonyms/types, roles and RLS, update handlers, localization, form and interface design, or any topic the skills above don't cover | `onec-v8std` (full digest of all 321 its.1c.ru/db/v8std documents) |

Most tasks need two skills: the topic skill plus `onec-code-standards`. Load both. When the configuration is on БСП (§2.3), also load `onec-bsp` before writing any helper.

## 2. Context to collect before writing code

Ask only what is missing, in one message. Never guess metadata.

1. **Configuration and version**: which configuration (vendor name + version, e.g. "Бухгалтерия предприятия 3.0.160", or own), **platform version** (8.3.x) and **compatibility mode** (Конфигурация -> Свойства -> Режим совместимости). The compatibility mode decides which language features exist (`Асинх`/`Ждать` need 8.3.18+, `ОбработкаОшибок` needs 8.3.17+).
2. **Is the object on vendor support** (Конфигурация -> Поддержка -> Настройка поддержки). On support -> changes go to an extension (`onec-extensions`) unless the team already removed it from support.
3. **БСП present?** Almost all vendor configurations and our own ones are built on the Standard Subsystems Library. If yes, use its API (`ОбщегоНазначения`, `ДлительныеОперации`, `ОбновлениеИнформационнойБазы`, ...) instead of writing helpers. Version: Справка -> О программе, or the `СтандартныеПодсистемыСервер.ВерсияБиблиотеки()` result.
4. **Exact metadata names** the code touches: objects, attributes, tabular sections, register dimensions/resources, enum values. Take them from the pasted code, from the dumped files, or ask. A wrong attribute name compiles in a string query and fails only at runtime.
5. **Where the code lives**: object module, manager module, form module (and which form), common module (with its flags: Сервер / Клиент / Вызов сервера / Привилегированный), HTTP service module, extension module.
6. **Client type**: thin client / web client / mobile. Web client forbids modal windows and synchronous file/extension calls.
7. **DBMS**: file base, MS SQL or PostgreSQL. It changes query advice (see `onec-queries`).

## 3. How code reaches Claude (Configurator, no Git)

Prefer real files over memory and over guesses.

- **Small task**: the developer pastes the module or the procedure. Ask for the whole module when you need its regions, variables or neighbouring procedures.
- **Medium / large task, review, "разберись в конфигурации"**: ask the developer to dump the configuration (or the extension) to files and open that folder in Claude Code. Commands: `references/configurator-workflow.md`. Then use Read/Grep over `*.bsl` and the metadata `*.xml` - that is the only reliable way to know exact names, types and module flags.
- Dumped files are a **read-only snapshot**. Never tell the developer to load edited files back into the working base (`/LoadConfigFromFiles`) unless they asked for that flow and have a copy of the base. Normal flow: Claude edits or writes the code, the developer pastes it into the Configurator, updates the DB configuration, tests.

## 4. How Claude hands code back

For every change give:

1. **Where**: `Объект -> Модуль` path, e.g. `Документ.РеализацияТоваровУслуг -> Модуль объекта -> область ОбработчикиСобытий`, or `Расширение мд_Доработки -> Общий модуль мд_ОбменСБэкендом (Сервер, Вызов сервера: нет)`.
2. **What**: the complete procedure or function (never a fragment with "..."), with its compile directive (`&НаСервере`, `&НаКлиенте`, `&НаСервереБезКонтекста`) and export flag. For a new common module or metadata object - its properties as a short list.
3. **Metadata to create by hand**: new attributes, tabular sections, registers, roles, HTTP services, scheduled jobs - name, type, synonym, and the role rights they need. The Configurator does not create them from code.
4. **How to check**: Конфигурация -> Проверить конфигурацию (syntax + the boxes in `references/configurator-workflow.md`), then the manual test scenario in 1C:Предприятие (what to open, what to enter, what result to expect).

When files are dumped and the developer asked Claude to edit them, edit the `.bsl` files directly - the `check-bsl` hook of this plugin then checks them - and list the changed modules so the developer can carry them over.

## 5. Precedence

1. **Official 1C standards** (its.1c.ru/db/v8std) and the rules in this plugin are the baseline. Mdigital has no stricter in-house standard yet; when one appears it overrides these skills.
2. **БСП API beats hand-written helpers.** If БСП has it (messages, attribute reading, background jobs, safe storage, event log, scheduled jobs, print forms), use it.
3. **Vendor configurations stay updatable.** Extensions first; changing objects removed from support is the exception that needs the team lead's decision (`onec-extensions`).
4. **The customer's working base is never a test bed.** Changes go to a copy or a test base first. Claude never suggests running code, data processors or queries that modify data in the working base without the developer explicitly confirming it is a copy or that they accept the change.

## 6. Answer language

Answer in Russian. BSL code, metadata names, comments and messages in Russian (the configuration's language). Comments in code explain why, not what.

## References

- `references/configurator-workflow.md` - dump/load to files, syntax check settings, test base, performance measurement tools
- `references/sources.md` - official sources these skills are based on
- skill `onec-bsp` - БСП 3.2.1 embedding recipes and the API of all subsystems
- skill `onec-v8std` - per-document digest of the whole official standard with std numbers and links
