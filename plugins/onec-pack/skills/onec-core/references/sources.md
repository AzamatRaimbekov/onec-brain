# Sources

The skills of `onec-pack` are based on these official and community sources (October 2026). When a rule here disagrees with the current text of the 1C standard, the standard wins - update the skill.

## 1C official

- Система стандартов и методик разработки конфигураций - https://its.1c.ru/db/v8std (code conventions, module structure, queries, transactions, client-server interaction, security, extensions, integrations)
- Библиотека стандартных подсистем, документация разработчика - https://its.1c.ru/db/bsp (ОбщегоНазначения, ДлительныеОперации, безопасное хранилище, журнал регистрации, обновление ИБ)
- Документация платформы 1С:Предприятие 8.3 - https://its.1c.ru/db/v83doc (встроенный язык, язык запросов, HTTP-сервисы, расширения, пакетный режим конфигуратора)
- Синтакс-помощник in the Configurator - the authority on method signatures for the installed platform version

БСП: skill `onec-bsp`, built from the БСП 3.2.1.541 source code (© ООО «1С-Софт», CC BY 4.0; mirror https://github.com/1c-syntax/ssl_3_2). The ITS developer guide its.1c.ru/db/bsp321doc is closed for our subscription level (only the title page is available) - when it opens, check the recipes against its chapter 3.

Digest of the whole standard: skill `onec-v8std` (321 documents, crawled 2026-10-07 from an ITS subscription, retold per document - not a copy; re-crawl when the changelog doc 788 shows new sections).

## Community

- BSL Language Server diagnostics - https://1c-syntax.github.io/bsl-language-server/diagnostics/ (machine-checkable versions of many standards)
- Infostart and forum articles are not sources of rules; use them only for ideas and always check against the standard.
