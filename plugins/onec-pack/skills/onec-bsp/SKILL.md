---
name: onec-bsp
description: Standard Subsystems Library (1С:БСП, Библиотека стандартных подсистем 3.2.1) for Mdigital 1C work - which subsystem solves a task, the exact recipe to embed it into an own catalog/document/report (defined types, subscriptions, overridable procedures, manager/form module code), the API of all 67 subsystems (2982 exported methods with their original comments) and the rules that keep BSP-based code standard. Use whenever 1C code could use БСП instead of a hand-written helper, or when a task touches printing, attached files, additional attributes, contact information, access rights and RLS, users, change prohibition dates, update handlers, scheduled jobs, long operations, report variants, attachable commands, external processors, data exchange, email/SMS, message templates, e-signature, currencies, calendars, organizations. Triggers - "БСП", "стандартные подсистемы", "ОбщегоНазначения", "ДлительныеОперации", "печатная форма", "команда печати", "присоединенные файлы", "дополнительные реквизиты", "контактная информация", "управление доступом", "RLS", "профиль доступа", "дата запрета", "обработчик обновления", "регламентное задание", "вариант отчета", "подключаемые команды", "внешняя обработка", "обмен данными", "РИБ", "EnterpriseData", "отправить письмо", "SMS", "электронная подпись", "МЧД", "курс валюты", "производственный календарь", "Переопределяемый", "SSL", "Standard Subsystems Library".
---

# БСП - Standard Subsystems Library (Mdigital)

Almost every vendor configuration (БП, УТ, ERP, ЗУП, КА, Документооборот) and our own configurations are built on БСП. The rule is simple: **if БСП has it, use БСП**. A hand-written helper that duplicates БСП is a review defect.

## 1. Find the subsystem and the recipe

| Task | Subsystem | Recipe file in `references/` |
|---|---|---|
| Read attributes by reference, messages to the user, strings, collections, JSON, files, settings, secure storage, event log, call by name, environment checks | БазоваяФункциональность | `base-1.md` |
| Anything longer than a couple of seconds from a form, background job with progress | ДлительныеОперации | `base-1.md` |
| External components, downloading from the internet, proxy | ВнешниеКомпоненты, ПолучениеФайловИзИнтернета | `base-1.md` |
| Commands «Создать на основании», «Заполнить», reports in the object's menu; report on СКД with variants; translations; number prefixes; barcodes; declension | ПодключаемыеКоманды, ВариантыОтчетов, Мультиязычность, ПрефиксацияОбъектов, ГенерацияШтрихкода, СклонениеПредставленийОбъектов | `base-2.md` |
| Users, access groups and profiles, RLS on own objects, external users | Пользователи, УправлениеДоступом | `users-access-1.md` |
| Change prohibition dates, locking key attributes after use, personal data, security profiles, user activity | ДатыЗапретаИзменения, ЗапретРедактированияРеквизитовОбъектов, ЗащитаПерсональныхДанных, ПрофилиБезопасности, КонтрольРаботыПользователей | `users-access-2.md` |
| Infobase update handlers, initial filling, scheduled jobs, external reports and processors (external print forms) | ОбновлениеВерсииИБ, РегламентныеЗадания, ДополнительныеОтчетыИОбработки | `admin-1.md` |
| Current tasks (to-dos), accounting checks, performance measurements, duplicates, deletion of marked objects, users' shutdown, backups, totals | ТекущиеДела, КонтрольВеденияУчета, ОценкаПроизводительности, ... | `admin-2.md` |
| Print forms (MXL, DOCX, template + data), attached files, additional attributes and info | Печать, РаботаСФайлами, Свойства | `service-1.md` |
| Object versions, notes, reminders, full-text search, group change, load from file, subordination structure, document movements report, discussions, originals of documents | ВерсионированиеОбъектов, ... | `service-2.md` |
| E-signature, encryption, machine-readable powers of attorney (МЧД) | ЭлектроннаяПодпись, МашиночитаемыеДоверенности | `signature.md` |
| Contact information (addresses, phones, email) in own catalogs, address classifier | КонтактнаяИнформация, АдресныйКлассификатор | `nsi-1.md` |
| Banks, currencies and rates, calendars and working days, work schedules, organizations | Банки, Валюты, КалендарныеГрафики, ГрафикиРаботы, Организации | `nsi-2.md` |
| Exchange between 1C bases (own plan, РИБ, EnterpriseData) - and when to use our HTTP/outbox instead | ОбменДанными | `integration-1.md` |
| Email, SMS, report mailing, message templates, interactions, surveys, business processes and tasks | РаботаСПочтовымиСообщениями, ОтправкаSMS, РассылкаОтчетов, ШаблоныСообщений, Взаимодействия, Анкетирование, БизнесПроцессыИЗадачи | `integration-2.md` |

## 2. Find the method

1. Grep `references/api-index.md` (one line per method: `Модуль.Метод(параметры)` - purpose - file). Search by the word of the task: «реквизит», «фон», «печат», «файл», «курс», «рабоч».
2. Read the method in `references/api/<Подсистема>[.<Модуль>].md` - the original doc comment with parameters, types and return value.
3. `[П]` in the index marks a procedure of an overridable module (`...Переопределяемый`): an integration point that the configuration fills in, never calls.
4. Check the module's context in the header line (`Сервер`, `Клиент`, `ВызовСервера`, `ПовтИсп`) before calling it - a `Клиент` module is not callable from the server.

## 3. Version check - the customer's БСП may be older

The reference is БСП **3.2.1.541**. Vendor configurations often ship an older БСП (3.1.x). Before relying on a method:

- Ask for or read the БСП version (`СтандартныеПодсистемыСервер.ВерсияБиблиотеки()`, or `Описание.Версия` in `ОбновлениеИнформационнойБазыБСП.ПриДобавленииПодсистемы` in the dump).
- On a dump, grep the configuration's own `CommonModules/<Модуль>/Ext/Module.bsl` for `Функция <Метод>(` - the dump wins over this reference.
- A method missing in the older version: use the older equivalent from the dump, do not copy БСП code into the configuration.

## 4. Rules that keep БСП-based code standard

Code:
- Attributes by reference: `ОбщегоНазначения.ЗначениеРеквизитаОбъекта` / `ЗначенияРеквизитовОбъекта` / `...Объектов` for many references. Not `Ссылка.Реквизит`, not your own query for 1-3 fields.
- Messages: `ОбщегоНазначения.СообщитьПользователю` (bound to the field); many row errors: `ОбщегоНазначенияКлиентСервер.ДобавитьОшибкуПользователю` + `ОбщегоНазначенияКлиентСервер.СообщитьОшибкиПользователю`.
- Strings: `СтроковыеФункцииКлиентСервер` (`ПодставитьПараметрыВСтроку`, `РазложитьСтрокуВМассивПодстрок`, ...). Own string-parsing, transliteration or zero-padding helpers are duplicates.
- Long work from a form: `ДлительныеОперации.ВыполнитьФункцию` / `ВыполнитьПроцедуру` + `ДлительныеОперацииКлиент.ОжидатьЗавершение`; no own `ФоновыеЗадания.Выполнить` with an idle handler. A method run in the background or by name is registered in `ПриОпределенииМетодовРазрешенныхДляВызоваКакПроизвольныйКод`.
- Secrets: `ОбщегоНазначения.ЗаписатьДанныеВБезопасноеХранилище` / `ПрочитатьДанныеИзБезопасногоХранилища` in a short privileged mode.
- Scheduled job handler: first line `ОбщегоНазначения.ПриНачалеВыполненияРегламентногоЗадания(Метаданные.РегламентныеЗадания.<Имя>)`; manage jobs through `РегламентныеЗаданияСервер`, not the platform `РегламентныеЗадания`.
- Library/extension code reaching another subsystem: `ОбщегоНазначения.ПодсистемаСуществует` + `ОбщегоНазначения.ОбщийМодуль`.
- Renaming a metadata object: register it with `ОбщегоНазначения.ДобавитьПереименование` in `ПриДобавленииПереименованийОбъектовМетаданных`.
- Users: `Пользователи.АвторизованныйПользователь()` in shared code, `Пользователи.РолиДоступны` instead of `РольДоступна`.

Embedding (every recipe file has the details):
- Embed through **defined types, event subscriptions, overridable procedures and manager-module procedures**, never by copying БСП code or adding buttons by hand. A missing defined type is the most common reason "БСП does nothing" - the subsystem silently skips the object.
- Form of an object that uses subsystems: the standard calls in `ПриСозданииНаСервере`, `ПриЧтенииНаСервере`, `ПередЗаписьюНаСервере`, `ПослеЗаписиНаСервере`, `ОбработкаПроверкиЗаполненияНаСервере`, and the `Подключаемый_*` client handlers with their exact names.
- Print: commands in `ДобавитьКомандыПечати` of the manager module; templates through `УправлениеПечатью.МакетПечатнойФормы` (names `ПФ_MXL_*`, `ПФ_DOC_*`), not `ПолучитьМакет`.
- Rights: roles are given only through supplied access group profiles; RLS for own objects in `ПриЗаполненииОграниченияДоступа` of the manager module; elements are added to `ВладелецЗначенийКлючейДоступа` defined types.
- Update handlers: data processing in `Отложенно` mode, writing through `ОбновлениеИнформационнойБазы.ЗаписатьДанные`, version bumped together with the handler; initial data declared in `ПриНачальномЗаполненииЭлементов`.
- Vendor configurations: fill the overridable procedures and manager procedures **in the extension** (`onec-extensions`), not in the vendor modules.
- Integration with our own backend: HTTP + outbox (`onec-integrations`); БСП `ОбменДанными` is for 1C-to-1C exchange.

## 5. Precedence and sources

- The customer configuration's dump beats this reference (version differences). The official standard (`onec-v8std`) and БСП agree; where a recipe is stricter than a standard, follow the recipe.
- Sources: БСП 3.2.1.541 source code (© ООО «1С-Софт», CC BY 4.0, mirror github.com/1c-syntax/ssl_3_2). The `api/` files keep the original method comments; the recipe files were written from that source and every method name was checked against it. The official ITS developer guide (its.1c.ru/db/bsp321doc) needs a subscription level our account does not have; when access appears, check the recipes against its chapter 3.
