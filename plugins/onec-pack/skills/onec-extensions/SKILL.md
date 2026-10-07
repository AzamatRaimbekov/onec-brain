---
name: onec-extensions
description: Mdigital rules for changing vendor 1C configurations (Бухгалтерия, Управление торговлей, ERP, Комплексная автоматизация, ЗУП and others) without losing updatability - extensions first, choosing an extension per task area, the мд_ prefix, borrowing objects, method annotations (&Перед, &После, &Вместо, &ИзменениеИКонтроль), adding attributes and objects in an extension, safe mode and data separation flags, when removing from support is allowed and how to mark changes in vendor code, and the procedure for updating the vendor configuration. Use for any change to a configuration that is on vendor support, or when planning an update. Triggers - "доработать типовую", "доработка", "расширение", "расширение конфигурации", "cfe", "заимствовать", "&Перед", "&После", "&Вместо", "ИзменениеИКонтроль", "снять с поддержки", "на поддержке", "обновить типовую", "обновление конфигурации", "сравнение и объединение", "после обновления сломалось".
---

# Extensions and changes to vendor configurations (Mdigital)

## 1. Default: an extension

Any change to an object that is on vendor support goes into an **extension** (Конфигурация -> Расширения конфигурации). The vendor configuration stays on full support and updates install without merging.

Change the main configuration directly only when an extension can't do it and the team lead agreed, e.g.:

- changing the type of a vendor attribute or the structure of a vendor register
- anything else the extension mechanism does not support on the customer's platform version (check the platform documentation "Расширения конфигурации" for that version before deciding)
- performance fixes inside vendor queries that `&ИзменениеИКонтроль` can't express

Then follow §7.

## 2. Organizing extensions

- One extension per business area or per integration, not one per task and not one "everything" extension: `мд_Продажи`, `мд_ОбменСБэкендом`, `мд_Печать`. Fewer extensions = fewer conflicts, but each must be switchable on its own.
- Extension properties: **Назначение** = `Дополнение` (new functionality) or `Исправление` (bug fixes) or `Адаптация` (customer-specific changes); **Префикс** = `мд_`; set **Безопасный режим** and **Защита от опасных действий** as the customer's admin requires (with safe mode on, the extension can't use files, COM, external components and privileged mode).
- **Режим совместимости** of the extension = that of the main configuration.
- Set "Применять к" / "Использовать в области данных" only if the base runs with data separation (SaaS).

## 3. Naming in extensions

- Every **own** object, attribute, form, command, common module, method, and form element in an extension starts with `мд_`: `Справочник.мд_ТочкиПродаж`, attribute `мд_ВнешнийИд` on a borrowed document, procedure `мд_ПриЗаписиПослеОсновного`.
- Borrowed objects keep their vendor names (the platform matches by name).
- Never name an own object the same as something the vendor might add later; the prefix is what protects us.

## 4. Borrowing and method interception

Borrow only what you change (right click on the object -> Добавить в расширение). For a form, borrow the form, not the whole object, when only the form changes.

Annotations in the extension module (the extension procedure gets a new name with the prefix):

| Annotation | Use for | Notes |
|---|---|---|
| `&Перед("ИмяМетода")` | extra checks or preparation before vendor code | Vendor method still runs |
| `&После("ИмяМетода")` | extra actions after vendor code (filling extra attributes, extra movements) | **Default choice** - least fragile |
| `&ИзменениеИКонтроль("ИмяМетода")` | change a few lines inside a vendor method | Vendor method text is copied, changes marked with `#Вставка ... #КонецВставки` and `#Удаление ... #КонецУдаления`; after each vendor update the platform reports if the original changed - re-check |
| `&Вместо("ИмяМетода")` | replace the method completely | Last resort. Call `ПродолжитьВызов(...)` when the vendor code should still run in some branches. If the vendor changes the method, we silently lose their fix |

```bsl
&После("ОбработкаПроведения")
Процедура мд_ОбработкаПроведенияПосле(Отказ, РежимПроведения)
	Если Отказ Тогда
		Возврат;
	КонецЕсли;
	мд_ПроведениеСервер.ДобавитьДвиженияПоБонусам(ЭтотОбъект, Движения);
КонецПроцедуры
```

- Keep extension module code thin: a one-line call into an extension common module where the logic lives. That makes `&ИзменениеИКонтроль` blocks small and reviews simple.
- Form changes: add elements with the prefix, set event handlers through `&После("ПриСозданииНаСервере")` and code, not by editing vendor elements' properties when it can be avoided.
- Event subscriptions defined in the extension (own `мд_` subscription) are often cleaner than intercepting vendor handlers.

## 5. Data in extensions

- Own attributes on borrowed objects, own tabular sections, own directories, documents, registers - supported. Adding data structures makes the extension "change data structure": it must stay **installed and active**, and deleting it deletes that data. Say so to the developer before adding.
- If the extension stops applying (vendor update renamed something) and the admin disables it, data stays in the base but is not accessible until it is fixed - fix promptly.
- Type changes of vendor attributes are not done in extensions. Adding enum values or predefined items depends on the platform version - check the documentation for the customer's version before planning it.

## 6. Updating the vendor configuration (procedure)

1. Back up: `.dt` of the base and the `.cfe` of every extension (Конфигурация -> Расширения -> Сохранить в файл).
2. Update on a **copy** first: install the update (`.cfu`) through Конфигурация -> Поддержка -> Обновить конфигурацию; run the vendor's update handlers in 1C:Предприятие.
3. For each extension: Конфигурация -> Расширения -> **Проверить применимость**. Fix every error: renamed or removed vendor objects/methods, changed `&ИзменениеИКонтроль` originals (open each, compare with the new vendor text, move our `#Вставка` blocks).
4. Re-test the scenarios that the extensions change (the test list lives with the extension's description).
5. Only then repeat on production in a maintenance window.

Never update the working base first; never update across several vendor releases if the vendor requires intermediate ones (read the release notes `ReadMe` on releases.1c.ru).

## 7. When the main configuration is changed anyway

- Support settings: switch only the affected objects to "Объект поставщика редактируется с сохранением поддержки"; never remove the whole configuration from support.
- Mark every change in vendor code so a merge can find it:

```bsl
// мд_ Начало ЗАДАЧА-123 Проверка лимита кредита.
мд_ПроведениеСервер.ПроверитьЛимитКредита(ЭтотОбъект, Отказ);
// мд_ Конец ЗАДАЧА-123
```

- Keep inserts to one-line calls into own `мд_` common modules.
- Keep a list of changed vendor objects (task, object, reason) next to the project documentation; it is what makes "Сравнение и объединение" during updates possible.

## Checklist

- [ ] Change is in an extension, or the reason for changing the main configuration is agreed and written down
- [ ] Extension area chosen, `мд_` prefix on every own object and method
- [ ] `&После`/`&Перед` preferred; `&Вместо` justified; `&ИзменениеИКонтроль` blocks minimal
- [ ] Data-structure changes announced to the developer
- [ ] Applicability check passes; scenario list updated for the next vendor update
