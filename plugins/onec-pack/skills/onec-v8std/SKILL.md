---
name: onec-v8std
description: Full digest of the official 1C development standards (its.1c.ru/db/v8std, all 321 documents, October 2026) for 1C:Enterprise 8.3 work in the Configurator - metadata objects and naming, data storage, object event handlers, scheduled jobs, queries and query optimization, transactions and locks, module formatting and comments, built-in language constructs, collections, client-server interaction, security, access rights and RLS, data exchange, libraries and БСП update handlers, localization (НСтр), managed forms, list forms, dialogs, interface design for 8.3/8.5/8.2 and the ordinary application. Use whenever the exact wording of a 1C standard matters - "по стандарту", "стандарты 1С", "что говорит стандарт", "std", "v8std", "its.1c.ru", "система стандартов", "методическая рекомендация", "как правильно назвать объект", "синоним", "области модуля", "комментарий к методу", "проверка конфигурации", "права доступа", "RLS", "роль", "обработчик обновления", "НСтр", "локализация", "форма списка", "командный интерфейс", "Такси", "проверь по стандартам", or when another onec-pack skill or agent needs the source rule behind its advice.
---

# 1C development standards - full digest (v8std)

The other `onec-pack` skills hold Mdigital's working rules; this skill holds the **complete official standard** they are based on, restated (not copied) per document with the std number and a link. Use it to check a rule precisely, to cite it in a review, and to cover topics the other skills do not mention.

## How to use

1. Find the document: grep `references/index.md` for the std number (`std652`) or a word from the title; the last column names the digest file.
2. Read that digest section (`### std652 ...`) - every document has its own heading, grep `^### std652` in `references/`.
3. When citing, write `std652` plus the link from the heading. If the wording is decisive (dispute with the customer, borderline case), tell the developer to open the source link - the digest is a retelling.
4. Mandatory standard vs «методическая рекомендация» is marked under each heading. A review flags a violated standard as a defect and a missed recommendation as a suggestion.

## Topic -> file

| Topic | File in `references/` |
|---|---|
| Configuration rules, common modules and their flags/postfixes, session parameters, functional options, naming metadata, settings storage, `ТекущаяДатаСеанса`, Linux/macOS, configuration check, versions | `metadata-configuration-1.md`, `metadata-configuration-2.md` |
| Attributes, synonyms, string/number/composite types, predefined items, register design, register activity, obsolete objects (`Удалить...`), filling checks properties | `metadata-storage.md` |
| `ПередЗаписью`/`ПриЗаписи`/`ОбработкаПроверкиЗаполнения`/`ОбработкаЗаполнения`, `ОбменДанными.Загрузка`, presentations, scheduled jobs | `object-events-scheduled-jobs.md` |
| Query text style, ORDER BY, UNION ALL, LIKE, counting, indexes, virtual tables, dereferencing, subqueries, temp tables, extra indexes | `queries.md` |
| Managed locks, transactions pattern, object locking before change, reading attributes, writing register sets, deadlocks and excess locks | `data-modification-locks.md` |
| Module regions, method comments, names, formatting, parameters, constructor functions, `Отказ` | `code-modules.md` |
| Preprocessor directives, Boolean/type checks, exceptions, error categories, event log, `ДополнительныеСвойства`, creating objects, registers, value tables, collections | `code-language.md` |
| Server calls from forms, `Знач`, cached modules (`ПовтИсп`), portion processing, temporary files, timeouts | `client-server.md` |
| Server methods called bypassing the client, «Вызов сервера», `Выполнить`/`Вычислить`, safe mode, external components, running programs, COM macros, passwords | `security.md` |
| Roles, rights, privileged mode, RLS templates, `ВыполнитьПроверкуПравДоступа` | `access-rights.md` |
| Exchange rules and registration, БСП library design, overridable modules, API versioning, update handlers | `exchange-libraries.md` |
| `НСтр`, `СтрШаблон`, internal identifiers vs presentations, date/number formats, money types, strings saved to the DB | `localization.md` |
| Managed form behaviour, background jobs (`ДлительныеОперации`), modality, list forms, dynamic lists, messages, dialogs, hotkeys, print forms | `ui-forms.md` |
| Interface design 8.5 / 8.3 (Такси): command interface, document forms, elements; 8.2 legacy rules | `ui-design-1.md`, `ui-design-2.md` |
| Ordinary application (thick client) only | `ui-ordinary-app.md` |

`ui-design-2.md` ends with the changelog of the standard (doc 788). When it is out of date, re-crawl: see `references/index.md` header for the date of the snapshot.

## Review checklist - the rules that catch most defects

Code and objects (cite the std in findings):

- std455/453: regions in the standard order, no empty regions; every exported API method has a doc comment (`Параметры:`, `Возвращаемое значение:`).
- std456: no commented-out or debug code, no `TODO`, no author names, no «ё»; tabs; lines <= 120; one statement per line.
- std454/647/640: full meaningful names; functions named for the result, procedures for the action; optional parameters last, <= 7 parameters.
- std641/693: structure parameters made by a constructor function with all properties; no `Свойство()` probing.
- std686: never assign `Отказ = Ложь`; `Отказ = Истина` always comes with a message to the user.
- std441/442: no comparison with `Истина`/`Ложь`; type checks only via `ТипЗнч(...) = Тип(...)`.
- std499/790/498: no empty `Исключение`; catch locally and re-raise; `ПодробноеПредставлениеОшибки`; event log name «Группа.Событие».
- std643: `ТекущаяДатаСеанса()` not `ТекущаяДата()`, once per procedure.
- std680/439: object/manager module code inside `#Если Сервер Или ТолстыйКлиентОбычноеПриложение Или ВнешнееСоединение Тогда`; compile directives only in form and command modules.
- std469: common module kind, flags and postfix match (`ВызовСервера`, `Клиент`, `КлиентСервер`, `ПовтИсп`, `Переопределяемый`, ...); `ВызовСервера` methods don't take or return `...Объект`.
- std773: `Если ОбменДанными.Загрузка Тогда Возврат; КонецЕсли;` first in write/delete handlers and subscriptions.
- std465/463/478: don't change the object in `ПриЗаписи`; conditional mandatory attributes by removing from `ПроверяемыеРеквизиты`; mandatory attributes use «Проверка заполнения = Выдавать ошибку».
- std450/447/792: no explicit `Записать()` of movement sets in `ОбработкаПроведения`; information registers read by query, written by record sets, not in a loop.
- std451/639: objects created through the manager then `Заполнить`; pass parameters to an object through `ДополнительныеСвойства`.

Queries and data:

- std436/496: no queries, attribute reads or `ПолучитьОбъект()` in a loop; `ЗначенияРеквизитовОбъекта(ов)` instead of `Ссылка.Реквизит`.
- std437/412/434/438/787: keywords uppercase, multiline; `УПОРЯДОЧИТЬ ПО` when order matters, `ЕСТЬNULL`; `ОБЪЕДИНИТЬ ВСЕ` by default; `Пустой()`; `КОЛИЧЕСТВО`.
- std657/658/652: virtual table conditions in parameters; index-friendly conditions (no functions over fields, `ИЛИ` only on one field).
- std654/655/656/777: no dereferencing of composite fields, no joins with subqueries, temp tables indexed by join fields when large.
- std726: `ПОДОБНО` pattern only from a literal or a parameter, user input escaped (`СПЕЦСИМВОЛ`).
- std460/648/783: managed locks; `БлокировкаДанных` before reading; `НачатьТранзакцию` right before `Попытка`, commit last, rollback first in `Исключение`; no external calls and < 20 s inside.
- std490: `Заблокировать()` an existing object before changing it from code.
- std728/432: composite types only of reference types in joins/filters; strings of limited length, `ВЫРАЗИТЬ КАК СТРОКА(N)` for comparison.

Client-server, UI, security:

- std487/636: no server calls in client `ПриОткрытии`; at most one server call per form command; `Знач` parameters; `&НаСервереБезКонтекста` where possible; never pass form data collections to the server by value.
- std642/703: anything > 8 s on the server runs in a background job (`ДлительныеОперации`); no modal windows or synchronous calls.
- std800/537: change and write the object only on an explicit user action; commands that change data have «Изменяет данные».
- std418/761/764: `ОбщегоНазначения.СообщитьПользователю`, never `Сообщить`; user text only via `НСтр` literal + `СтрШаблон`; internal identifiers without `НСтр`.
- std724/725/748/542: cached modules return fixed values; process unlimited selections in portions; timeouts on every `HTTPСоединение`/`FTPСоединение`/WS proxy; temporary files via `ПолучитьИмяВременногоФайла` and deleted.
- std678/679/485: form server methods re-check rights; «Вызов сервера» only for client entry modules; privileged mode switched on narrowly, never unconditionally in exported methods.
- std770/801/669/740: no `Выполнить`/`Вычислить` on external text (safe mode via БСП if unavoidable); external components only through БСП; no passwords in attributes (secure storage).
- std690/553/644: update handlers idempotent, write through `ОбновлениеИнформационнойБазы.ЗаписатьДанные`; never call `...Переопределяемый` modules from application code; library API only grows.

## Precedence

Mdigital rules in `onec-core`, `onec-code-standards`, `onec-queries`, `onec-integrations`, `onec-extensions` are stricter or more concrete in places (e.g. `мд_` prefix, outbox pattern) - follow them. Where they are silent, this digest applies. Where the digest disagrees with the live text on its.1c.ru, the site wins and the digest must be updated.
