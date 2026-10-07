---
name: onec-code-standards
description: Mdigital rules for writing BSL (1C:Enterprise 8.3 built-in language) code, based on the official 1C development standards - module structure and regions, naming, formatting, client-server interaction and compile directives, minimizing server calls, transactions and managed locks, exception handling and the event log, user messages, asynchronous dialogs instead of modal windows, background jobs, security (Выполнить, privileged mode, external data), and using БСП instead of hand-written helpers. Use when writing, fixing, refactoring or reviewing any BSL code - object, manager, form, common module, posting, handlers. Triggers - "напиши процедуру", "напиши функцию", "обработчик", "проведение", "ПриЗаписи", "ПередЗаписью", "ОбработкаПроведения", "модуль формы", "общий модуль", "&НаСервере", "&НаКлиенте", "транзакция", "блокировка", "исключение", "Попытка", "Сообщить", "Вопрос", "модальное окно", "фоновое задание", "стандарты 1С", "как правильно в 1С", "BSL".
---

# 1C code standards (Mdigital)

Apply to every BSL procedure you write or change. Based on its.1c.ru/db/v8std; where this file is shorter than the standard, the standard applies - its full digest per document (std number, rule, link) is the `onec-v8std` skill.

## 1. Module structure

Every module is split into regions in this order (omit empty ones):

| Module | Regions |
|---|---|
| Object module | `ОписаниеПеременных`, `ПрограммныйИнтерфейс`, `ОбработчикиСобытий`, `СлужебныйПрограммныйИнтерфейс`, `СлужебныеПроцедурыИФункции`, `Инициализация` |
| Manager module | `ПрограммныйИнтерфейс`, `СлужебныйПрограммныйИнтерфейс`, `ОбработчикиСобытий`, `СлужебныеПроцедурыИФункции` |
| Form module | `ОписаниеПеременных`, `ОбработчикиСобытийФормы`, `ОбработчикиСобытийЭлементовШапкиФормы`, `ОбработчикиСобытийЭлементовТаблицыФормы<ИмяТаблицы>`, `ОбработчикиКомандФормы`, `СлужебныеПроцедурыИФункции` |
| Common module | `ПрограммныйИнтерфейс`, `СлужебныйПрограммныйИнтерфейс`, `СлужебныеПроцедурыИФункции` |

```bsl
#Область ПрограммныйИнтерфейс
...
#КонецОбласти
```

- `ПрограммныйИнтерфейс` holds exported methods other subsystems may call; each has a doc comment (description, `Параметры:`, `Возвращаемое значение:`).
- Object/manager module code that must not run on the client is wrapped in `#Если Сервер Или ТолстыйКлиентОбычноеПриложение Или ВнешнееСоединение Тогда ... #Иначе ВызватьИсключение НСтр("ru = 'Недопустимый вызов объекта на клиенте.'"); #КонецЕсли` - copy the pattern used in the configuration.
- No module-level code except in `Инициализация`. No global variables in common modules (they are not allowed); use parameters or `ПараметрыСеанса` / cached modules.

## 2. Names and formatting

- Names in CamelCase from full Russian words: `СуммаДокумента`, `ПолучитьОстаткиТоваров`. No abbreviations (`Спр`, `Док`, `ТЗ`), no single letters except loop counters, no `Тмп`, `Врем`, `Масс1`.
- Functions are named for what they return (`ОстаткиТоваровНаСкладе`), procedures for what they do (`ЗаполнитьТабличнуюЧасть`).
- Boolean variables and parameters read as statements: `ЕстьОшибки`, `ЭтоНовый`, `ПроверятьОстатки`.
- Our own objects and methods in a vendor configuration or extension get the company prefix `мд_` (see `onec-extensions`).
- Line length up to 120 characters; break long expressions after an operator, aligning continuation lines.
- Keywords and built-in functions in standard casing (`Если`, `Тогда`, `КонецЕсли`, `НРег`). One statement per line. Tabs for indentation, as the Configurator does.
- Strings shown to users go through `НСтр("ru = '...'")`; use `СтрШаблон(НСтр("ru = 'Документ %1 не проведен'"), Документ)` instead of concatenation.
- Max ~3 levels of nesting in a method; extract a method or use early `Возврат` instead.
- Max 7 parameters; pass a `Структура` of options beyond that.
- No commented-out code. No `// Добавил Иванов 01.02` - history is not the code's job. Changes in vendor code are marked as described in `onec-extensions`.

## 3. Client-server interaction

- Every form method has a compile directive. Choose the cheapest:
  `&НаКлиенте` -> `&НаСервереБезКонтекста` (no form data sent) -> `&НаСервере` (form data is serialized both ways).
- **One server call per user action.** Collect everything the client needs in one `&НаСервереБезКонтекста` function returning a `Структура`; never call the server in a loop on the client.
- Don't read reference attributes on the client through a dot (`Объект.Контрагент.ИНН` on the client = server call). Get them on the server.
- Common modules: "Вызов сервера" only for modules designed as the client's entry point; business logic lives in server modules without that flag.
- Caching: data that rarely changes and is read often goes to a common module with "Повторное использование возвращаемых значений" (на время вызова / на время сеанса). Never cache data that the user can change during the session.

## 4. Reading data

- No queries, `НайтиПоКоду`/`НайтиПоНаименованию` or object reads inside a loop - see `onec-queries`.
- A few attributes of a reference: `ОбщегоНазначения.ЗначениеРеквизитаОбъекта(Ссылка, "ИНН")` / `ЗначенияРеквизитовОбъекта(Ссылка, "ИНН, КПП")` (БСП), not `Ссылка.ИНН` and not `Ссылка.ПолучитьОбъект()` - a dot reads the whole object into the cache.
- `ПолучитьОбъект()` only when you are going to change and write the object.

## 5. Transactions and locks

Use explicit transactions only when several writes must succeed or fail together. Write them exactly like this:

```bsl
НачатьТранзакцию();
Попытка
	Блокировка = Новый БлокировкаДанных;
	ЭлементБлокировки = Блокировка.Добавить("РегистрНакопления.ОстаткиТоваров");
	ЭлементБлокировки.УстановитьЗначение("Склад", Склад);
	ЭлементБлокировки.Режим = РежимБлокировкиДанных.Исключительный;
	Блокировка.Заблокировать();

	// Чтение и запись данных.

	ЗафиксироватьТранзакцию();
Исключение
	ОтменитьТранзакцию();
	ЗаписьЖурналаРегистрации(НСтр("ru = 'Обмен.ЗагрузкаЗаказа'", ОбщегоНазначения.КодОсновногоЯзыка()),
		УровеньЖурналаРегистрации.Ошибка, , ,
		ОбработкаОшибок.ПодробноеПредставлениеОшибки(ИнформацияОбОшибке()));
	ВызватьИсключение;
КонецПопытки;
```

- `НачатьТранзакцию()` directly before `Попытка`; `ЗафиксироватьТранзакцию()` is the last statement inside `Попытка`; `ОтменитьТранзакцию()` first statement in `Исключение`; then re-raise.
- Managed lock mode: lock **before** reading the data you will change. `ДЛЯ ИЗМЕНЕНИЯ` in queries does nothing in managed mode.
- Lock the narrowest set (by dimension values, not the whole register) and always in the same order across the configuration to avoid deadlocks.
- No user interaction, HTTP calls, file IO or long calculations inside a transaction. Posting (`ОбработкаПроведения`) already runs in a transaction - don't open another one, and don't call external services from it (`onec-integrations`).
- Platform < 8.3.17 / compatibility mode below it: use `ПодробноеПредставлениеОшибки(ИнформацияОбОшибке())` instead of `ОбработкаОшибок.ПодробноеПредставлениеОшибки`.

## 6. Errors, logging, messages

- Never an empty `Исключение ... КонецПопытки`. Either handle (log + user-facing message + safe fallback) or re-raise with `ВызватьИсключение;`.
- `Попытка` only around code that can fail for external reasons (IO, HTTP, COM, conversion of external data). Don't use it for flow control; check conditions first.
- Log technical details to the event log (`ЗаписьЖурналаРегистрации` with an event name `"<Подсистема>.<Действие>"`); show the user a short, actionable text without stack traces.
- Messages to the user: `ОбщегоНазначения.СообщитьПользователю(Текст, Объект, "Объект.Поле")` (БСП) so the message is bound to the field. `Сообщить()` is not used in new code.
- Filling checks in `ОбработкаПроверкиЗаполнения` (set `Отказ = Истина` and report), not by raising exceptions in `ПередЗаписью`.

## 7. Dialogs - no modal windows

- `Вопрос`, `Предупреждение`, `ОткрытьФормуМодально`, `ВвестиЗначение`, `ПоместитьФайл` synchronous forms are forbidden (web client, mobile client, "Режим использования модальности = Не использовать").
- Compatibility mode 8.3.18+: `Асинх` + `Ждать`:

```bsl
&НаКлиенте
Асинх Процедура Удалить(Команда)
	Ответ = Ждать ВопросАсинх(НСтр("ru = 'Удалить выбранные строки?'"), РежимДиалогаВопрос.ДаНет);
	Если Ответ <> КодВозвратаДиалога.Да Тогда
		Возврат;
	КонецЕсли;
	УдалитьНаСервере();
КонецПроцедуры
```

- Older modes: `ПоказатьВопрос(Новый ОписаниеОповещения("ПослеОтветаНаВопрос", ЭтотОбъект), ...)` with an exported handler procedure.

## 8. Long operations

Anything that can run longer than ~8 seconds for the user (mass processing, big reports, exchange) runs in a background job via БСП `ДлительныеОперации.ВыполнитьФункцию` / `ВыполнитьПроцедуру` (БСП 3.2 marks `ВыполнитьВФоне` as replaced by these two) with `ДлительныеОперацииКлиент.ОжидатьЗавершение` on the client. Process data in portions (e.g. 1000 rows), each portion in its own short transaction.

## 9. Security

- `Выполнить()` and `Вычислить()` are forbidden on any text that can come from users, files, HTTP or the database. To call a method by name use `ОбщегоНазначения.ВыполнитьМетодКонфигурации` (БСП checks the name).
- Privileged mode (`УстановитьПривилегированныйРежим(Истина)` or a privileged common module) only for a narrowly defined operation, switched off right after, with a comment explaining why the user's rights are not enough. Never wrap whole handlers.
- Query texts are never built by concatenating user input - use parameters (`onec-queries`).
- Passwords, tokens and keys are never in code, constants or plain attributes: БСП `ОбщегоНазначения.ЗаписатьДанныеВБезопасноеХранилище` / `ПрочитатьДанныеИзБезопасногоХранилища`.
- New metadata needs rights in the roles: add them to the right БСП profile/role, never give users "Полные права" to make something work.

## 10. Reuse

- Check БСП and the configuration's own common modules before writing a helper (`ОбщегоНазначения`, `ОбщегоНазначенияКлиентСервер`, `СтроковыеФункцииКлиентСервер`, `ОбщегоНазначенияКлиент`, `РаботаСФайлами`, `ПечатьОбъектов`...). Grep the dump for the method name.
- Code repeated in 3+ places goes to a common module with the right flags. Business logic of one object lives in its manager module, not in a common module.

## Checklist before handing code back

- [ ] Regions and compile directives in place; exported methods documented
- [ ] No query / object read / `НайтиПо...` in a loop; no `Ссылка.Реквизит` reads in bulk code
- [ ] One server call per user action
- [ ] Transactions in the standard pattern, lock before read, no external calls inside
- [ ] No empty `Исключение`, errors go to the event log
- [ ] No `Сообщить`, no modal calls, user strings through `НСтр`
- [ ] No `Выполнить` on external text, no secrets in code, privileged mode justified
- [ ] Metadata to create and role rights listed for the developer
