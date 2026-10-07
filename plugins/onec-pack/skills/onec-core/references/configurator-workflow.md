# Configurator workflow

## Dump the configuration to files (so Claude can read it)

Interactive: Конфигуратор -> Конфигурация -> **Выгрузить конфигурацию в файлы...** -> choose an empty folder, format **Иерархический**. For an extension: Конфигурация -> Расширения конфигурации -> select extension -> Конфигурация -> Выгрузить конфигурацию в файлы.

Batch mode (Windows, adjust paths; the base must not be locked by an open Configurator):

```bat
"C:\Program Files\1cv8\8.3.xx.xxxx\bin\1cv8.exe" DESIGNER /F"D:\Bases\TestCopy" /N"Администратор" /P"" /DumpConfigToFiles "D:\dump\config" -Format Hierarchical /Out "D:\dump\dump.log"
```

- Server base: `/S"server\basename"` instead of `/F"path"`.
- Extension: add `-Extension мд_Доработки`.
- Incremental dump of changes only: `-update -configDumpInfoForChanges "D:\dump\config\ConfigDumpInfo.xml"`.
- Never put the password into files committed anywhere or into chat; the developer runs the command themselves.

Layout of the dump (what to grep):

```
Catalogs/<Имя>.xml                   metadata: attributes, tabular sections, types
Catalogs/<Имя>/Ext/ObjectModule.bsl  module of the object
Catalogs/<Имя>/Ext/ManagerModule.bsl manager module
Catalogs/<Имя>/Forms/<Форма>/Ext/Form/Module.bsl   form module
Catalogs/<Имя>/Forms/<Форма>/Ext/Form.xml          form elements and attributes
CommonModules/<Имя>.xml              flags: Server, ClientManagedApplication, ServerCall, Privileged, Global
CommonModules/<Имя>/Ext/Module.bsl
Documents/..., InformationRegisters/..., AccumulationRegisters/..., HTTPServices/..., ScheduledJobs/...
```

Folder names are English metadata classes; object names stay Russian.

## Load back (only on a copy, only when asked)

`/LoadConfigFromFiles "D:\dump\config"` then `/UpdateDBCfg`. Loading files replaces the configuration of the base; on a base with vendor support it can break the support settings. Default team flow is copy-paste through the Configurator, not loading.

## Syntax and configuration check

Конфигурация -> **Проверить конфигурацию** with at least:

- Логическая целостность конфигурации
- Поиск некорректных ссылок
- Проверка синтаксиса встроенного языка, режимы: Тонкий клиент, Веб-клиент, Сервер, Внешнее соединение (the ones the configuration uses)
- Поиск неиспользуемых процедур и функций (on demand)
- Проверка использования синхронных вызовов / модальности (if the configuration's mode forbids them)

For an extension, run the same check with the extension selected, and also "Проверить применимость" (Конфигурация -> Расширения -> Проверить применимость) after every update of the main configuration.

## Test base

Every change is tested on a copy: Администрирование -> Выгрузить информационную базу (`.dt`) -> load into a new base, or a dedicated test base refreshed from production by the admin. Data-changing processors, mass re-posting, register corrections - only on the copy first.

## Performance tools

- **Замер производительности** (Отладка -> Замер производительности in the debugger): which lines take time and how many times they run. First tool for "медленно проводится".
- **Технологический журнал** (`logcfg.xml` in `bin\conf`): `DBMSSQL`/`DBPOSTGRS` events with duration > N, `TLOCK`, `TTIMEOUT`, `TDEADLOCK` for locks. Set up by the admin, turned off after the investigation.
- **Консоль запросов** (from ИТС / БСП tools or the built-in one in newer platforms) to run a query on the test base and see its plan.
- **Static analysis (optional)**: BSL Language Server (github.com/1c-syntax/bsl-language-server) can analyze a dump: `java -jar bsl-language-server.jar --analyze --srcDir D:\dump\config --reporter console`. Its diagnostics follow the same 1C standards.
