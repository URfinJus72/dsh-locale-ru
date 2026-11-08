# 🇷🇺 dsh-locale-ru

### Нативная русская локализация DeepSeek Harness: веб-интерфейс, китайские плагины и описания инструментов

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek_Harness-0.2.0--rc.2-blue)](https://github.com/deepseek-ai/deepseek-harness)
[![Check](https://github.com/URfinJus72/dsh-locale-ru/actions/workflows/check.yml/badge.svg)](https://github.com/URfinJus72/dsh-locale-ru/actions/workflows/check.yml)

[English](README.en.md)

Форк проекта [AbsoluteMikhail/dsh-locale-ru](https://github.com/AbsoluteMikhail/dsh-locale-ru).

> **Важно с DeepSeek Harness 0.2.1.** Ядро веб-интерфейса харнесс локализует **сам**: все 46 ядровых
> клиентских пакетов везут собственный русский (`export const ru` в `locales.ts`) и регистрируют его
> при активации. Поэтому пакет **по умолчанию не регистрирует ядровые namespace'ы** — иначе он
> занимал бы их первым, а владевшие ими пакеты падали бы с `already has locale "ru"`, унося весь
> веб-бут (`web boot: N entries did not activate`). Ядровые переводы остаются в репозитории и
> включаются флагом `core: true` для хостов, которые локализуют ядро хуже пакета (до `0.2.1`).

Пакет переводит:

- UI китайскоязычных плагинов `@hyzyn/*`, `dshmarket`, `@nanmicoder/dsh-agent-teams` и
  `@zoria-lind/dsh-token-optimizer` — **10 namespace'ов, 2 746 строк**;
- ядро веб-интерфейса — **58 namespace'ов, 2 665 строк** (опционально, `core: true`; с Harness 0.2.1+
  эту работу выполняет сам харнесс);
- описания инструментов плагинов (**49 инструментов, 153 описания параметров**) и **8 записей system prompt**,
  которые плагины добавляют агенту;
- два плагина без системы локалей — `dsh-web-startup-auth` (вкладка «认证» и страница входа) и
  `@zoria-lind/dsh-token-optimizer` (команды `/token-status`, `/token-archive-retry`): их захардкоженный
  китайский переводится **pnpm-патчами**, которые переживают `pnpm install`.

Итого **68 словарей и 5 411 строк** плюс два патча плагинов. Пакет использует публичный API языковых пакетов
и официальный хук `system-prompt/assemble`: не подменяет внутренние методы приложения и не изменяет DOM
после отрисовки. Плагины без локалей правятся официальным механизмом pnpm-патчей, а не редактированием
исходников на месте.

**Базовая локализация:** [AbsoluteMikhail](https://github.com/AbsoluteMikhail) (MIT).
**Форк, локализация плагинов и host-оверлей:** [URfinJus72](https://github.com/URfinJus72).

## Состояние

| Поверхность | Объём | Статус |
|---|---|---|
| Ядро веб-интерфейса | 58 ns / 2 665 ключей | ✅ поставляется самим Harness с `0.2.1`; пакет — только через `core: true` |
| Соответствие Harness `0.2.2-rc.1` | 68 словарей в режиме `core: true` | ✅ `check:harness` зелёный |
| UI китайских плагинов | 10 ns / 2 746 ключей | ✅ выпущено |
| Описания инструментов плагинов | 49 инструментов / 153 параметра | ✅ выпущено |
| Секции system prompt плагинов | 8 записей (5 статических + 3 динамических) | ✅ выпущено |
| Вкладка «Авторизация» (`dsh-web-startup-auth`) | ~62 строки + страница входа | ✅ патч `patches/dsh-web-startup-auth@0.1.14.patch` |
| Меню «/» и вывод команд (`dsh-token-optimizer`) | 100 строк (`/token-status`, `/token-archive-retry`) | ✅ патч `patches/@zoria-lind__dsh-token-optimizer@3.0.0.patch` |
| Карточки плагинов в «Настройки → Плагины» | — | ✅ скрипт `cards:apply`, `drift 0`; после каждого `pnpm install` нужен повторный запуск |
| Рантайм-сообщения плагинов (логи, не UI) | — | ⏭ вне объёма |

### Известное ограничение: описания инструментов в Harness 0.2.2+

С `0.2.2-rc.1` waterfall `system-prompt/assemble` получает `PromptPresentation` — только `sections`,
`contexts`, `variables`. Описания инструментов (`tools`) отделяются **до** waterfall и прикрепляются
к результату уже после него, поэтому хост-оверлей физически не может их переписать через этот хук:
переводы в `src/host/ru/tools.json` (49 инструментов, 153 описания параметров) остаются
неприменёнными, и агент видит китайские описания. Секции system prompt при этом переводятся как
раньше. Для исправления нужен второй шов (например, аккуратное оборачивание `ctx.tools.schemas` с
хеш-гейтом) — это отдельная задача, на интерфейс пользователя не влияет.

Подробный анализ и пофазный план: [`docs/PLUGINS-RU-PLAN.md`](docs/PLUGINS-RU-PLAN.md).
Редакционный глоссарий: [`docs/GLOSSARY.md`](docs/GLOSSARY.md).

## Возможности

- 58 пространств перевода ядра и 2 665 строк интерфейса; всего в пакете 5 364 строки.
- Чат, настройки, рабочие области, плагины, разрешения, терминал, файлы, планы, задания, субагенты,
  траектории, голосовой ввод, ярлыки, аккаунт и служебные панели.
- UI девяти китайских плагинов: Codegraph, MCP, RSS, Loglens, Kit-settings, TTY, Docker, Market, Agent Teams.
- Русские описания 49 инструментов и их параметров для агента — через `system-prompt/assemble`, с проверкой
  SHA-1 исходной строки: при обновлении плагина устаревший перевод не подставляется.
- Русские тексты 8 записей system prompt, которые плагины добавляют агенту, включая динамические фрагменты
  (`rss-digest` — 17, `tty:terminals` — 14).
- Мгновенное переключение языка через **Настройки → Общие настройки → Язык**.
- Сохранение выбранного языка в штатных настройках профиля.
- Русские формы числительных: `1 вызов`, `2 вызова`, `5 вызовов`, `21 вызов`.
- Английский fallback для ключей, которых ещё нет в русском словаре (в том числе сторонних плагинов).
- Терпимая регистрация внешних namespace'ов: если плагин сам добавит `ru`, наш словарь для этого namespace
  пропускается с предупреждением, остальные продолжают работать.
- Автоматическая сверка ключей и плейсхолдеров с Harness и снимками плагинов.
- Установочный smoke-тест на изолированном реальном профиле `web`.

## Локализация китайских плагинов

Плагины `@hyzyn/*`, `dshmarket`, `@nanmicoder/dsh-agent-teams` и `@zoria-lind/dsh-token-optimizer`
поставляют словари `zh` + `en` и не имеют `ru`; при выбранном русском языке их интерфейс показывался на
английском через штатный fallback. Форк добавляет русские словари для их namespace'ов.

Ключи сняты с перечисленных версий; паритет `ru == en` проверяется тестом на этих же снимках
([`catalogs/plugins`](catalogs/plugins), [`catalogs/versions.json`](catalogs/versions.json)):

| Плагин | Версия, с которой сняты ключи | namespace | Ключей | Статус |
|---|---|---:|---:|---|
| @hyzyn/dsh-codegraph | 0.6.20 | `codegraph` | 205 | ✅ |
| @hyzyn/dsh-mcp | 0.3.13 | `mcp` | 73 | ✅ |
| @hyzyn/dsh-rss | 0.4.16 | `rss` | 132 | ✅ |
| @hyzyn/dsh-loglens | 0.1.8 | `loglens` | 205 | ✅ |
| @hyzyn/dsh-kit-settings | 0.2.9 | `kit-settings` | 4 | ✅ |
| @hyzyn/dsh-tty | 0.38.0 | `tty` | 516 | ✅ |
| @hyzyn/dsh-docker | 0.15.0 | `docker` | 564 | ✅ |
| dshmarket | 1.73.12 | `dsh-market` | 783 | ✅ |
| @nanmicoder/dsh-agent-teams | 0.1.29 | `agentTeams` | 217 | ✅ |
| @zoria-lind/dsh-token-optimizer | 3.0.0 | `token-optimizer` | 47 | ✅ (словарь UI настроек) |
| **итого** | — | 10 namespace'ов | **2 746** | — |
| @xbzbing/dsh-git-panel | 1.12.0 | `gitPanel` | 554 | ✅ `ru` уже есть в самом плагине (не наш словарь) |

### Патчи плагинов без системы локалей

Два плагина вообще не используют словари и держат китайский текст прямо в коде. Их UI переводится
pnpm-патчами, которые применяются при установке профиля и **переживают `pnpm install`**:

| Плагин | Что переведено | Патч |
|---|---|---|
| `dsh-web-startup-auth` 0.1.14 | вкладка «认证» → «Авторизация», весь UI вкладки (~62 строки: переключатели, подписи, сообщения) и страница входа | `patches/dsh-web-startup-auth@0.1.14.patch` |
| `@zoria-lind/dsh-token-optimizer` 3.0.0 | команды `/token-status` и `/token-archive-retry` (описания + вывод, 100 строк) и UI настроек сжатия | `patches/@zoria-lind__dsh-token-optimizer@3.0.0.patch` |

Патчи зарегистрированы в `pnpm-workspace.yaml` → `patchedDependencies` каталога профиля
(`~/.dsh/profiles/web`). После обновления версии плагина патч нужно пересобрать:
`pnpm patch <pkg>@<version>` → правки → `pnpm patch-commit <dir>`.

> ⚠️ Команды (`/token-status`, `/token-archive-retry`) регистрируются **хостом при старте**. После установки
> патча русские описания появятся в меню «/» только после перезапуска профиля.

### Описания инструментов и system prompt

Host-половина пакета подписывается на официальный waterfall `system-prompt/assemble` и после всех
участников (`await next()`) заменяет:

| Поверхность | Объём |
|---|---|
| Описания инструментов (`docker_*` 22, `tty_*` 10, `sftp_*` 7, `tunnel_*` 3, `loglens_*` 5, `mcp_*` 2) | 49 инструментов |
| Описания параметров (JSON Schema, рекурсивно) | 153 |
| Статические секции `plugin:dsh-*` (codegraph, mcp-config, loglens, tty, docker) | 5 |
| Динамические записи: `plugin:dsh-rss-digest` (17 фрагментов), `plugin:dsh-tty:terminals` (14 фрагментов) | 2 |
| `plugin:dsh-codegraph:usage` | не переводится: английский текст без китайских литералов |

Каждый перевод несёт SHA-1 исходной строки из [`catalogs/host`](catalogs/host). Если плагин обновился и текст
изменился, хэш не совпадёт — запись пропускается с предупреждением, а агент получает исходный текст плагина
(никаких «переводов-обманов»). Любая ошибка в слушателе возвращает исходную сборку промпта: оверлей никогда
не бросает исключение и не блокирует запрос к модели.

### Как это работает

- Регистрируется язык `ru` (fallback `en`) и словари: `ctx.locale.register(ns, 'ru', dict)`.
- Неизвестные ключи показываются по-английски, а не как сырые идентификаторы.
- Пара `(namespace, locale)` имеет одного владельца: если плагин сам добавит `ru`, наш словарь для этого
  namespace тихо пропускается (без падения всего пакета).
- Три плагина (`@hyzyn/dsh-rss`, `@hyzyn/dsh-tty`, `@hyzyn/dsh-docker`) рисуют свои пункты сайдбара
  императивно и один раз — до подписки на `locale`; их подписи переписывает точечный шим
  (`src/client/sidebar-labels.ts`).
- Карточки плагинов берутся из `locale/*.json` **внутри** пакета, поэтому локализуются не bundle-пакетом, а
  скриптом `scripts/patch-plugin-cards.mjs`: он пишет `locale/en.json` + `locale/ru.json` и добавляет пути в
  `exports` затронутых пакетов. Команды: `pnpm run cards:apply` / `cards:check` / `cards:revert`;
  после переустановки плагинов (`pnpm install`) скрипт нужно запустить повторно.
- Host-оверлей включается конфигом `locale-ru: { prompt: 'ru' }` в [`cordis.patch.yml`](cordis.patch.yml).
- Плагины без словарей (`dsh-web-startup-auth`, `@zoria-lind/dsh-token-optimizer`) правятся pnpm-патчами в
  каталоге профиля: `patches/*.patch` + `patchedDependencies` в `pnpm-workspace.yaml`. Патчи применяются
  при каждом `pnpm install`, поэтому переустановка плагинов не возвращает китайский.

## Установка

### Из GitHub (форк)

```sh
dsh plugin --profile web add github:URfinJus72/dsh-locale-ru
```

Собранные файлы `lib/` хранятся в репозитории. Установка из GitHub не запускает сборочный код
на компьютере пользователя и не требует разрешать install-скрипты.

После установки перезапустите профиль, откройте **Настройки → Общие настройки → Язык** и выберите **Русский**.

### Замена upstream на форк

Если `dsh-locale-ru` уже установлен из upstream, замените источник в `package.json` профиля:

```json
"dsh-locale-ru": "github:URfinJus72/dsh-locale-ru"
```

и выполните `pnpm install` в каталоге профиля (`~/.dsh/profiles/web`).

> ⚠️ Не устанавливайте upstream и форк одновременно: оба регистрируют язык `ru`, и вторая регистрация
> завершится ошибкой. Форк — drop-in замена, имя пакета сохранено.

### Через интерфейс

Откройте **Плагины → Добавить плагин** и вставьте:

```text
github:URfinJus72/dsh-locale-ru
```

## Проверка установки

```sh
dsh --profile web --dump-config
```

В собранной конфигурации должен появиться ряд:

```yaml
- id: locale-ru
  name: 'dsh-locale-ru'
  config:
    prompt: ru
```

## Что переводится

| Раздел | Примеры |
|---|---|
| Общий интерфейс | Кнопки, ошибки, загрузка, подтверждения |
| Чат | Сообщения, статистика, использование токенов, история |
| Настройки | Язык, тема, модели, плагины, аккаунт, ярлыки, голосовой ввод |
| Рабочие области | Сессии, файлы, ветвление, архив, выбор папки |
| Инструменты | Команды, планы, цели, навыки, задания |
| Агенты | Субагенты, команда агентов, пресеты |
| Боковые панели | Браузер, терминал, файлы, документы |
| Документы | Markdown, HTML, PDF, изображения, Office, Excel |
| Плагины | Codegraph, MCP, RSS, Loglens, Kit-settings, TTY, Docker, Market, Agent Teams, Token Optimizer |
| Патчи плагинов | Вкладка «Авторизация» (`dsh-web-startup-auth`), команды `/token-status` и `/token-archive-retry` |
| Промпт агента | Описания 49 инструментов, 153 параметров и 8 записей system prompt |

## Русские числительные

В ядровых словарях предусмотрены категории CLDR `one`, `few`, `many` и `other`. Версии Harness
с расширенной поддержкой числительных автоматически выбирают правильную форму по параметру `count` или `n`.

| Число | Результат |
|---:|---|
| 1 | 1 вызов инструмента |
| 2 | 2 вызова инструмента |
| 5 | 5 вызовов инструментов |
| 21 | 21 вызов инструмента |

В словарях сторонних плагинов категорий числительных нет: там `{n}` подставляется в одну строку,
поэтому счётные строки переводятся нейтральными конструкциями («Файлов: {n}»).

## Совместимость

| Компонент | Версия |
|---|---|
| DeepSeek Harness (целевая) | `0.2.2-rc.1` (тег `dsh-v0.2.2-rc.1`) |
| Закреплённый revision | [`harness-compatibility.json`](harness-compatibility.json) → `639ed01…` |
| Ядровые словари | 58 ns / 2 665 ключей под `0.2.2-rc.1` |
| Словари плагинов | 10 ns / 2 746 ключей |
| Плагины (ключи сняты) | см. [матрицу версий](#локализация-китайских-плагинов) |

Проверка совместимости на `0.2.2-rc.1` **зелёная**:

```text
verified 68 Russian dictionaries against DeepSeek Harness 0.2.2-rc.1
```

Что изменилось относительно базы upstream `0.1.6-alpha.2`:

- удалён namespace `settings.archivedSessions` (архив сессий переехал в `workspace`);
- добавлены `settings.agentLoop`, `settings.shell`, `settings.subagent`, `settings.webSearch`,
  `settings.account`, `shortcuts`, `voice-input`, `sidebarExcel`, `schedule.manager`,
  `settings.sessionLog`, `shortcuts.layout`;
- ключи карточек настроек переехали из `settings.plugins` в новые namespace'ы;
- `chat` и `conversation` получили 91 и 216 новых ключей соответственно — все переведены.

При обновлении Harness состав ключей меняется: выпуск новой совместимой версии русификатора должен
сопровождать такие изменения. Для этого в форке есть тесты паритета, снимки ключей в `catalogs/` и отчёт о
зазорах:

```sh
DSH_HARNESS_ROOT=/path/to/deepseek-harness pnpm run check:harness:gaps
```

Отчёт [`catalogs/core/gaps.json`](catalogs/core/gaps.json) перечисляет отсутствующие и устаревшие ключи по
каждому namespace; после обновления плагинов/ядра он перегенерируется и показывает точный фронт работ.

## Обновление и удаление

```sh
dsh plugin --profile web update dsh-locale-ru
dsh plugin --profile web remove dsh-locale-ru
```

Для GitHub-установки можно закрепить конкретный тег:

```sh
dsh plugin --profile web add github:URfinJus72/dsh-locale-ru#v0.2.0
```

## Разработка

Клиентские словари находятся в [`src/client/dictionaries`](src/client/dictionaries), регистрация языка —
в [`src/client/index.ts`](src/client/index.ts), host-оверлей — в [`src/host`](src/host), установочный слой —
в [`cordis.patch.yml`](cordis.patch.yml).

```sh
pnpm install
pnpm run check
```

`pnpm run check` выполняет сборку, проверяет регистрацию словарей, гоняет паритетные тесты и содержимое
npm-архива. После изменения исходников добавьте обновлённые `lib/index.js` и `lib/client.js` в тот же коммит:
благодаря этому установка из GitHub остаётся безопасной и не запускает локальную сборку.

Полная проверка совместимости требует checkout DeepSeek Harness:

```sh
DSH_HARNESS_ROOT=/path/to/deepseek-harness pnpm run check:harness
```

[`harness-compatibility.json`](harness-compatibility.json) закрепляет Harness `dsh-v0.2.2-rc.1`
(`0.2.2-rc.1`). GitHub Actions выполняет проверки автоматически.

Снимки словарей и карта namespace'ов:

| Что | Где |
|---|---|
| Словари плагинов (zh/en) и матрица версий | `catalogs/plugins/`, `catalogs/versions.json` |
| Зазоры ядра (missing/obsolete) | `catalogs/core/gaps.json` |
| Снимки host-строк (zh + SHA-1) | `catalogs/host/` |
| Карта namespace'ов Harness | `scripts/harness-namespaces.mjs` |
| Перегенерация снимков/зазоров | `pnpm run check:harness:gaps`, `node scripts/plugin-catalogs.mjs` |

## Обратная связь

Нашли неточный перевод или непереведённую строку — [создайте issue](https://github.com/URfinJus72/dsh-locale-ru/issues).
Укажите экран, исходный текст и желаемый вариант перевода.

## Авторство и лицензия

Базовая русская локализация и код пакета созданы и сопровождаются **AbsoluteMikhail** и распространяются
по лицензии [MIT](LICENSE). Форк поддерживается **URfinJus72** и сохраняет исходную лицензию и уведомления.

Переводы строк плагинов `@hyzyn/*` (Apache-2.0) являются производной работой: исходные лицензии и
уведомления сохраняются в [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), изменения отмечаются в
[CHANGELOG.md](CHANGELOG.md).
`dshmarket`, `@nanmicoder/dsh-agent-teams` и `@xbzbing/dsh-git-panel` распространяются по MIT.

DeepSeek Harness — отдельный проект компании DeepSeek. Исходное уведомление об авторских правах и лицензии
сохранено в [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Этот репозиторий является независимым
проектом сообщества и не заявляет об официальной поддержке со стороны DeepSeek.
