---
name: onec-integrations
description: Mdigital rules for integrating 1C:Enterprise 8.3 with our backends, sites, mobile apps and banks - choosing the pattern (1C calls out, backend calls 1C, queue), outgoing HTTP with HTTPСоединение (TLS, timeouts, retries), incoming HTTP services, JSON serialization, the outbox queue for real-time exchange instead of hourly batches, idempotency, error handling and logging, authentication and secrets, scheduled jobs, and the API contract with the backend team. Use when building or fixing any exchange between 1C and another system. Triggers - "интеграция", "обмен", "обмен с бэкендом", "синхронизация с 1С", "в реальном времени", "раз в час", "HTTP-сервис", "http сервис", "REST", "API", "JSON", "webhook", "вебхук", "отправить в бэкенд", "получить из бэкенда", "HTTPСоединение", "регламентное задание", "очередь", "OData", "обмен с банком", "обмен с сайтом".
---

# 1C integrations (Mdigital)

## 1. Pick the pattern

| Need | Pattern |
|---|---|
| Backend needs data from 1C on request (prices, balances, statuses) | **HTTP service in 1C** (§4), backend calls it |
| Backend must learn about changes in 1C quickly (new/changed documents, directories) | **Outbox queue in 1C** (§3) + background sender, 1C pushes to backend API |
| 1C must receive changes from backend (orders, payments, users) | Backend calls **HTTP service in 1C** that writes into an inbox, or 1C pulls on a schedule if the backend can't push |
| Bulk / reference data, rare | Scheduled job pulling or pushing in portions |
| Standard OData read access for BI | Built-in OData interface (`Администрирование -> Настройки синхронизации`, publish selected objects), read-only, separate user |

"Real time" means seconds, not "inside the posting transaction". Never call an external system from `ОбработкаПроведения`, `ПриЗаписи` or any transaction: if the backend is slow, users wait and locks are held; if it is down, posting fails; if the transaction rolls back after the call, the backend has data that does not exist in 1C.

## 2. API contract first

Before coding, agree with the backend team and write down (in the task or the repo of the backend):

- endpoints, methods, JSON schemas with field types, required fields, example payloads
- identifiers: 1C sends `УникальныйИдентификатор()` of the reference (`Ссылка.УникальныйИдентификатор()`) as `id` - stable, unlike codes and numbers; the backend's ids are stored in 1C in an information register `мд_ВнешниеИдентификаторы` (Объект, Система, ВнешнийИд)
- dates in ISO 8601 with timezone, money as strings or decimals with fixed scale, enums as string codes
- error format and HTTP codes, idempotency key, versioning (`/api/v1/...`)
- auth method and who stores the secret

## 3. Outbox queue (1C -> backend in near real time)

1. Information register `мд_ОчередьОтправки`: dimensions `Объект` (composite ref type), `Система`; resources `ДатаДобавления`, `Попыток`, `ПоследняяОшибка`, `СледующаяПопытка`.
2. In `ПриЗаписи` of the object (or in a subscription `ПриЗаписи`, skipping `ОбменДанными.Загрузка`), add a record - this is a plain write inside the same transaction, cheap and atomic with the change:

```bsl
Процедура мд_ПоставитьВОчередьПриЗаписи(Источник, Отказ) Экспорт
	Если Источник.ОбменДанными.Загрузка Тогда
		Возврат;
	КонецЕсли;
	мд_ОбменСБэкендом.ПоставитьВОчередь(Источник.Ссылка);
КонецПроцедуры
```

3. A scheduled job `мд_ОтправкаВБэкенд` runs every 60 s (minimum for scheduled jobs), takes a portion (`ВЫБРАТЬ ПЕРВЫЕ 100 ... ГДЕ СледующаяПопытка <= &Сейчас УПОРЯДОЧИТЬ ПО ДатаДобавления`), sends each object, deletes the record on success, on failure increments `Попыток` and sets `СледующаяПопытка` with backoff (1, 5, 15, 60 min), and logs the error.
4. Need faster than 60 s: after the user's write, start a background job (`ФоновыеЗадания.Выполнить` / БСП `ДлительныеОперации`) that processes the queue once; the scheduled job remains the safety net.
5. Send the **current state** of the object at send time, not the state at queue time - so repeated changes collapse into one send and order does not matter.

Same idea in reverse (inbox): the HTTP service only validates and stores the payload into `мд_ОчередьЗагрузки`, returns `202`, a job processes it with normal posting and locks.

## 4. Incoming HTTP service

Metadata: HTTP service `мд_API` (root URL `api`), URL templates `/v1/orders/{id}`, methods. Published on the web server by the admin; a separate 1C user with a dedicated role holding only the needed rights - not "Полные права".

```bsl
Функция ЗаказыPOST(Запрос)
	Попытка
		Данные = мд_ОбменСБэкендом.ПрочитатьJSONСтроку(Запрос.ПолучитьТелоКакСтроку());
		Ошибки = мд_ОбменСБэкендом.ПроверитьЗаказ(Данные);
		Если Ошибки.Количество() > 0 Тогда
			Возврат мд_ОбменСБэкендом.ОтветJSON(400, Новый Структура("errors", Ошибки));
		КонецЕсли;
		мд_ОбменСБэкендом.ПоставитьВОчередьЗагрузки(Данные, Запрос.Заголовки.Получить("Idempotency-Key"));
		Возврат мд_ОбменСБэкендом.ОтветJSON(202, Новый Структура("status", "accepted"));
	Исключение
		ЗаписьЖурналаРегистрации("мд_API.Заказы", УровеньЖурналаРегистрации.Ошибка, , ,
			ОбработкаОшибок.ПодробноеПредставлениеОшибки(ИнформацияОбОшибке()));
		Возврат мд_ОбменСБэкендом.ОтветJSON(500, Новый Структура("error", "internal_error"));
	КонецПопытки;
КонецФункции
```

- Handlers stay thin: parse, validate, delegate to a common module, build the response. No business logic in the HTTP service module.
- Path params: `Запрос.ПараметрыURL["id"]`; query string: `Запрос.ПараметрыЗапроса["page"]`.
- Never return the exception text to the caller (it leaks internals) - log it, return a code.
- Idempotency: store the `Idempotency-Key` (or the external id) and return the previous result on repeat instead of creating a duplicate document.

## 5. Outgoing HTTP

```bsl
Функция ОтправитьЗапрос(Метод, Адрес, Тело = Неопределено) Экспорт
	Настройки = мд_ОбменСБэкендом.НастройкиПодключения(); // хост, порт, токен из безопасного хранилища
	ЗащищенноеСоединение = Новый ЗащищенноеСоединениеOpenSSL(, Новый СертификатыУдостоверяющихЦентровОС);
	Соединение = Новый HTTPСоединение(Настройки.Хост, 443, , , , 30, ЗащищенноеСоединение);

	Запрос = Новый HTTPЗапрос(Адрес);
	Запрос.Заголовки.Вставить("Content-Type", "application/json; charset=utf-8");
	Запрос.Заголовки.Вставить("Authorization", "Bearer " + Настройки.Токен);
	Если Тело <> Неопределено Тогда
		Запрос.УстановитьТелоИзСтроки(мд_ОбменСБэкендом.ЗаписатьJSONСтроку(Тело),
			КодировкаТекста.UTF8, ИспользованиеByteOrderMark.НеИспользовать);
	КонецЕсли;

	Ответ = Соединение.ВызватьHTTPМетод(Метод, Запрос);
	Возврат Новый Структура("Код, Тело", Ответ.КодСостояния, Ответ.ПолучитьТелоКакСтроку());
КонецФункции
```

- Always a **timeout** (6th parameter, seconds). Without it a hung backend hangs the job or the user session.
- HTTPS with OS certificate store (`СертификатыУдостоверяющихЦентровОС`); never disable certificate checks in production.
- No BOM in the body (`ИспользованиеByteOrderMark.НеИспользовать`) - many backends reject it.
- Treat 2xx as success, 4xx as a permanent error (log, mark the queue record, don't retry endlessly), 5xx / timeout / connection error as temporary (retry with backoff).
- Proxy settings via БСП `ПолучениеФайловИзИнтернета` settings if the customer uses a proxy.

## 6. JSON

```bsl
Функция ЗаписатьJSONСтроку(Значение) Экспорт
	Запись = Новый ЗаписьJSON;
	Запись.УстановитьСтроку();
	ЗаписатьJSON(Запись, Значение);
	Возврат Запись.Закрыть();
КонецФункции

Функция ПрочитатьJSONСтроку(Текст) Экспорт
	Чтение = Новый ЧтениеJSON;
	Чтение.УстановитьСтроку(Текст);
	Результат = ПрочитатьJSON(Чтение, Истина); // Соответствие - ключи могут быть не идентификаторами 1С
	Чтение.Закрыть();
	Возврат Результат;
КонецФункции
```

- Build outgoing payloads explicitly from `Структура`/`Массив` with the contract's field names; never serialize 1C objects with `СериализаторXDTO` for an external API.
- Dates: `ЗаписатьJSON` with `Новый НастройкиСериализацииJSON` (`ФорматСериализацииДаты = ФорматДатыJSON.ISO`, `ВариантЗаписиДаты = ВариантЗаписиДатыJSON.УниверсальнаяДата`) or convert explicitly. Agree on the timezone.
- Validate incoming data: required keys exist, types are right, references found by external id. Unknown id -> error in the response, not an empty reference written silently.

## 7. Settings, secrets, observability

- Host, port, base path, enabled flag: constants or an information register of settings `мд_НастройкиИнтеграций`; token/password: БСП safe storage (`onec-code-standards` §9).
- Every exchange operation writes to the event log with event name `мд_Обмен.<Система>.<Операция>`: what was sent (object, id), result code, duration. Bodies only at the debug level and without personal data.
- Give the support team a way to see the queue: a list form of `мд_ОчередьОтправки` with errors and a "повторить" command.
- Scheduled jobs check an "enabled" setting so the exchange can be switched off without changing the configuration, and do nothing in a copy of the base, so test copies never send data to production backends. On БСП 3.x mark the scheduled job as working with external resources (БСП subsystem "Блокировка работы с внешними ресурсами" stops such jobs when the base is moved or copied); otherwise keep the backend address only in the production base's settings.

## Checklist

- [ ] Contract written with the backend team; stable ids (UUID) on both sides
- [ ] No HTTP calls inside transactions or posting; outbox/inbox queues used
- [ ] Timeout, HTTPS, no BOM, 4xx vs 5xx handling, retries with backoff and a limit
- [ ] Idempotency on incoming requests
- [ ] Secrets in safe storage; dedicated integration user with minimal rights
- [ ] Event log entries and a visible queue for support; switch-off setting; copies don't send
