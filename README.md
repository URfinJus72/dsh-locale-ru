# 🇷🇺 dsh-locale-ru

### Нативная русская локализация DeepSeek Harness: веб-интерфейс, китайские плагины и описания инструментов

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek_Harness-0.2.0--rc.2-blue)](https://github.com/deepseek-ai/deepseek-harness)
[![Check](https://github.com/URfinJus72/dsh-locale-ru/actions/workflows/check.yml/badge.svg)](https://github.com/URfinJus72/dsh-locale-ru/actions/workflows/check.yml)

[English](README.en.md)

Форк проекта [AbsoluteMikhail/dsh-locale-ru](https://github.com/AbsoluteMikhail/dsh-locale-ru).
Добавляет язык **Русский** в штатный переключатель DeepSeek Harness и переводит:

- интерфейс ядра — **58 namespace'ов, 2 665 строк**;
- UI китайскоязычных плагинов `@hyzyn/*`, `dshmarket` и `@nanmicoder/dsh-agent-teams` —
  **9 namespace'ов, 2 699 строк**;
- описания инструментов плагинов (**49 инструментов, 153 описания параметров**) и **8 записей system prompt**,
  которые плагины добавляют агенту.

Итого **67 словарей и 5 364 строки**. Пакет использует публичный API языковых пакетов и официальный хук
`system-prompt/assemble`: не подменяет внутренние методы приложения, не изменяет DOM после отрисовки и не
форкает upstream-плагины.

**Базовая локализация:** [AbsoluteMikhail](https://github.com/AbsoluteMikhail) (MIT).
**Форк, локализация плагинов и host-оверлей:** [URfinJus72](https://github.com/URfinJus72).

## Состояние

| Поверхность | Объём | Статус |
|---|---|---|
| Ядро: namespace'ы веб-интерфейса | 58 ns / 2 665 ключей | ✅ работает на Harness `0.2.0-rc.2` |
| Ядро: соответствие Harness `0.2.0-rc.2` | 67 словарей | ✅ `pnpm run check:harness` зелёный |
| UI китайских плагинов | 9 ns / 2 699 ключей | ✅ выпущено |
| Описания инструментов плагинов | 49 инструментов / 153 параметра | ✅ выпущено |
| Секции system prompt плагинов | 8 записей (5 статических + 3 динамических) | ✅ выпущено |
| Карточки плагинов в «Настройки → Плагины» | — | ✅ локализуются скриптом `cards:apply` (файлы внутри установленных пакетов) |
| Рантайм-сообщения плагинов (не UI) | — | ⏭ вне объёма |

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

Плагины `@hyzyn/*`, `dshmarket` и `@nanmicoder/dsh-agent-teams` поставляют словари `zh` + `en` и не имеют
`ru`; при выбранном русском языке их интерфейс показывался на английском через штатный fallback. Форк
добавляет русские словари для их namespace'ов.

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
| **итого** | — | 9 namespace'ов | **2 699** | — |
| @xbzbing/dsh-git-panel | 1.12.0 | `gitPanel` | 554 | ✅ `ru` уже есть в самом плагине (не наш словарь) |

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

## Установка

### Из GitHub (форк)

```sh
dsh plugin --profile web add github:URfinJus72/dsh-locale-ru
```

Собранные файлы `lib/` хранятся в репозитории. Установка из GitHub не запускает сборочный код
на компьютере пользователя и не требует разрешать install-скрипты.

После установки перезапустите профиль, откройте **Настройки → Общие настройки → Язык** и выберите **Русский**.

### Замена upstream на форк

Если `@absolutemikhail/dsh-locale-ru` уже установлен из upstream, замените источник в `package.json` профиля:

```json
"@absolutemikhail/dsh-locale-ru": "github:URfinJus72/dsh-locale-ru"
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
  name: '@absolutemikhail/dsh-locale-ru'
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
| Плагины | Codegraph, MCP, RSS, Loglens, Kit-settings, TTY, Docker, Market, Agent Teams |
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
| DeepSeek Harness (целевая) | `0.2.0-rc.2` (тег `dsh-v0.2.0-rc.2`) |
| Закреплённый revision | [`harness-compatibility.json`](harness-compatibility.json) → `639ed01…` |
| Ядровые словари | 58 ns / 2 665 ключей под `0.2.0-rc.2` |
| Словари плагинов | 9 ns / 2 699 ключей |
| Плагины (ключи сняты) | см. [матрицу версий](#локализация-китайских-плагинов) |

Проверка совместимости на `0.2.0-rc.2` **зелёная**:

```text
verified 67 Russian dictionaries against DeepSeek Harness 0.2.0-rc.2
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
dsh plugin --profile web update @absolutemikhail/dsh-locale-ru
dsh plugin --profile web remove @absolutemikhail/dsh-locale-ru
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

[`harness-compatibility.json`](harness-compatibility.json) закрепляет Harness `dsh-v0.2.0-rc.2`
(`0.2.0-rc.2`). GitHub Actions выполняет проверки автоматически.

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
