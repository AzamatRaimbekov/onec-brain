---
name: onec-queries
description: Mdigital rules for the 1C query language and performance - no queries in loops, batch queries with temporary tables and indexes, parameters of virtual register tables instead of WHERE, dereferencing and composite types, OR versus UNION ALL, LIKE, RLS (РАЗРЕШЕННЫЕ), parameters instead of concatenation, query formatting, reading results, managed locks and deadlocks, and how to investigate slowness with the performance measurement and the technological log. Use when writing or reviewing any query text, СКД data set, report, posting that reads registers, or when something is slow. Triggers - "запрос", "текст запроса", "ВЫБРАТЬ", "временная таблица", "виртуальная таблица", "Остатки", "Обороты", "СрезПоследних", "СКД", "отчёт тормозит", "медленно", "долго проводится", "тормозит", "оптимизировать запрос", "запрос в цикле", "блокировка", "взаимоблокировка", "deadlock", "ожидание на блокировке", "таймаут блокировки", "производительность".
---

# 1C queries and performance (Mdigital)

## 1. Never query in a loop

A query, `НайтиПоКоду`, `НайтиПоРеквизиту`, `ПолучитьОбъект()`, `Ссылка.Реквизит` or `ЗначениеРеквизитаОбъекта` inside `Для`/`Для Каждого`/`Пока` = N round trips to the DBMS. Replace with one query over the whole set:

```bsl
// Плохо: запрос на каждую строку.
Для Каждого Строка Из Товары Цикл
	Строка.Цена = ЦенаНоменклатуры(Строка.Номенклатура); // внутри - Запрос.Выполнить()
КонецЦикла;

// Хорошо: один запрос, результат по ключу.
Запрос = Новый Запрос;
Запрос.Текст =
	"ВЫБРАТЬ
	|	Цены.Номенклатура КАК Номенклатура,
	|	Цены.Цена КАК Цена
	|ИЗ
	|	РегистрСведений.ЦеныНоменклатуры.СрезПоследних(&Дата, Номенклатура В (&СписокНоменклатуры)) КАК Цены";
Запрос.УстановитьПараметр("Дата", Дата);
Запрос.УстановитьПараметр("СписокНоменклатуры", Товары.ВыгрузитьКолонку("Номенклатура"));
ЦеныПоНоменклатуре = Новый Соответствие;
Выборка = Запрос.Выполнить().Выбрать();
Пока Выборка.Следующий() Цикл
	ЦеныПоНоменклатуре.Вставить(Выборка.Номенклатура, Выборка.Цена);
КонецЦикла;
```

When the input is a table (value table, tabular section), pass it as a parameter into a temporary table (`ВЫБРАТЬ ... ПОМЕСТИТЬ ВТТовары ИЗ &Товары КАК Товары`) and join on it. The value table needs typed columns (`Новый ОписаниеТипов("СправочникСсылка.Номенклатура")`).

## 2. Batch queries and temporary tables

- Split complex logic into a batch: each step `ПОМЕСТИТЬ ВТ<Имя>`, final `ВЫБРАТЬ`; read with `ВыполнитьПакет()` only if you need intermediate results.
- Never join a **subquery** - put it into a temporary table first. The DBMS cannot estimate subqueries well, plans go bad on real volumes.
- Add `ИНДЕКСИРОВАТЬ ПО <поля соединения>` to a temporary table that is joined later and holds more than a few thousand rows.
- Destroy big temporary tables you don't need (`УНИЧТОЖИТЬ ВТ<Имя>`) when the query manager lives longer than the query.
- `ОБЪЕДИНИТЬ ВСЕ` instead of `ОБЪЕДИНИТЬ` unless duplicates really must be removed.

## 3. Virtual tables of registers

`Остатки`, `Обороты`, `ОстаткиИОбороты`, `СрезПоследних`, `СрезПервых`:

- Put filters into the **table parameters**, not into `ГДЕ`:
  `РегистрНакопления.ТоварыНаСкладах.Остатки(&Дата, Склад = &Склад И Номенклатура В (&Список))`. A condition in `ГДЕ` is applied after the totals are calculated over everything.
- In the parameter condition use only the register's own dimensions; no joins, no dereferencing beyond the first dot.
- `&Дата` is a `Граница` (`Новый Граница(МоментВремени(), ВидГраницы.Исключая)`) when posting needs the balance before the current document.
- `Остатки` without a period on a register with totals enabled reads the current totals table - the fastest way to get current balances.

## 4. Dereferencing and composite types

- `Документ.Контрагент.ИНН` in a query = an implicit join. One level is fine; two or more levels or fields of a **composite type** (`Регистратор`, `Субконто1`, `Объект` of several types) join every type in the composite. Narrow with `ВЫРАЗИТЬ(Таблица.Регистратор КАК Документ.РеализацияТоваровУслуг).Номер`.
- `ССЫЛКА` checks: `Таблица.Регистратор ССЫЛКА Документ.РеализацияТоваровУслуг`.
- `ПРЕДСТАВЛЕНИЕ()` only in the final selection for display; never in conditions or joins.

## 5. Conditions

- `ИЛИ` on different fields in `ГДЕ` or in a join condition often prevents index use (MS SQL especially) -> split into two queries joined with `ОБЪЕДИНИТЬ ВСЕ`.
- `ПОДОБНО "%текст%"` (leading `%`) scans the table - acceptable only on small tables or with an extra selective condition. For search on big directories use full-text search or `ПОДОБНО "текст%"`.
- Conditions on fields that are indexed (dimensions in order, attributes with "Индексировать") first; functions over a field (`ГОД(Дата) = 2026`, `ПОДСТРОКА`) kill the index - rewrite as a range: `Дата МЕЖДУ &Начало И &Конец`.
- `В (&Список)` with a list over ~1000 values -> temporary table + join.
- `ЕСТЬNULL` for left-join results used in arithmetic or comparisons.

## 6. Parameters, rights, form

- **Always parameters**, never concatenate values into the text: `Запрос.УстановитьПараметр("Склад", Склад)`. Concatenation breaks on quotes, opens injection, and defeats plan caching. Building the text conditionally from **fixed fragments** (e.g. adding `И Склад = &Склад` if a filter is set) is fine.
- `ВЫБРАТЬ РАЗРЕШЕННЫЕ` in queries that run under user rights when the configuration uses RLS (record-level restrictions); without it a user with restrictions gets an error instead of a filtered result.
- `ВЫБРАТЬ ПЕРВЫЕ 1` for existence checks instead of reading all rows; `ПЕРВЫЕ N` for previews.
- Select only the fields you use; no `ВЫБРАТЬ *`. Every field has an alias `КАК`.
- Format query text like the Query Builder does: keywords in upper case, one field per line, tab indentation, `|` at line starts. The Query Builder output is acceptable as is.

## 7. Reading results

- Iterate with `Выбрать()` + `Следующий()`; `Выгрузить()` only when you really need a value table (sorting, passing to a form, `НайтиСтроки`).
- `РезультатЗапроса.Пустой()` before processing.
- Hierarchical/grouped walk: `Выбрать(ОбходРезультатаЗапроса.ПоГруппировкам)`.
- Don't load a whole huge directory into memory - portions with `ПЕРВЫЕ N` + `Ссылка > &ПоследняяСсылка` ordered by `Ссылка`.

## 8. Locks and deadlocks

- Managed lock mode in all our configurations. Lock with `БлокировкаДанных` **before** reading data you will change (`onec-code-standards` §5), in the same transaction.
- In posting: lock the register balances by the dimensions of the document rows (`Блокировка.Добавить(...).ИсточникДанных = ТаблицаТоваров; ИспользоватьИзИсточникаДанных("Номенклатура", "Номенклатура")`), then read balances, then write movements.
- Deadlock causes: different lock order in two places; reading under a shared lock and then escalating to exclusive; long transactions. Fixes: same order everywhere, exclusive lock up front, shorter transactions, data in portions.
- "Ожидание на блокировке" timeouts: find who holds the lock (технологический журнал `TLOCK`, `TTIMEOUT`), usually a long transaction or a lock on the whole register without filters.

## 9. Investigating slowness

1. Reproduce on a copy with realistic data.
2. **Замер производительности** around the slow action: find the lines with the biggest total time and call count. High call count = query/read in a loop (§1). One heavy line = the query itself.
3. For a heavy query: check virtual table parameters (§3), subquery joins (§2), `ИЛИ`/functions in conditions (§5), deep dereferencing (§4). Get the DBMS plan via the technological log (`<plansql/>`) or the DBA.
4. Missing index on a frequently filtered attribute -> "Индексировать" on the attribute (metadata change, needs restructuring - plan with the team lead on vendor configs).
5. Re-measure after the fix and report before/after numbers.

Never "optimize" by turning off locks, catching lock errors in a retry loop without a limit, or moving work into privileged mode.

## DBMS notes

- **File base**: no real parallelism, whole-table locks; temp-table indexes matter less, but queries in loops hurt just the same.
- **PostgreSQL**: `ПОДОБНО` with a leading `%` is especially slow; check `ИЛИ` conditions the same way as on MS SQL.
- **MS SQL**: `ИЛИ` across fields and functions over fields are the most common reasons for scans.
