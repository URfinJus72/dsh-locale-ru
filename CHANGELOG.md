# Changelog

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.3] — 2026-11-07

Русские описания навыков в меню «/» и патчи двух плагинов без системы локалей.

### Added

- Русские `description` для 25 навыков `dsh-mattpocock-skills@0.2.0` (engineering 18, productivity 7) —
  это то, что показывается в меню «/» рядом с именем навыка. Патч `patches/dsh-mattpocock-skills@0.2.0.patch`
  зарегистрирован через `patchedDependencies` и переживает `pnpm install`.
- Русский словарь namespace `token-optimizer` (47 ключей) для `@zoria-lind/dsh-token-optimizer`.
- Патч `@zoria-lind/dsh-token-optimizer`: команды `/token-status` и `/token-archive-retry`
  (описания и вывод, 100 строк) и UI настроек сжатия — плагин не использует систему локалей.
- Патч `dsh-web-startup-auth`: вкладка «认证» → «Авторизация», весь UI вкладки (~62 строки) и страница входа.

### Changed

- `README.md` / `README.en.md`: 68 словарей, 10 плагинных namespace'ов, 5 411 строк; новый раздел
  «Патчи плагинов без системы локалей»; честный статус карточек плагинов (нужен `cards:apply`).
- `catalogs/versions.json` синхронизирован с `catalogs/plugins/token-optimizer.json`.

### Not included

- Тело `SKILL.md` (полные инструкции навыков) остаётся китайским: переведён только frontmatter
  `description`, видимый в меню «/».

## [0.2.2] — 2026-11-06

Русские подписи в императивных пунктах сайдбара, которые плагины строят сами.

### Fixed

- `@hyzyn/dsh-rss`, `@hyzyn/dsh-tty`, `@hyzyn/dsh-docker` создают кнопки в сайдбаре один раз при
  монтировании и берут подпись из китайского fallback **до** подписки на `locale`; перерисовки на смену
  языка у них нет, поэтому в DOM навсегда оставались «今日值得读» / «终端» / «容器».
  Добавлен точечный шим `src/client/sidebar-labels.ts`: переписывает подпись, `aria-label` и `title`
  трёх известных элементов на русский (и на en/zh при переключении), ничего больше в DOM не трогает.
- `tests/sidebar-labels.spec.ts`: юнит-тесты шима на фейковом DOM (ru → en → dispose).

## [0.2.1] — 2026-11-06

Локализация карточек плагинов (display metadata) — последний видимый китайский слой в списке плагинов.

### Added

- `scripts/patch-plugin-cards.mjs`: пишет `locale/en.json` + `locale/ru.json` внутрь установленных пакетов
  девяти плагинов и добавляет пути в их `exports`; `--check` (exit 1 при расхождении), `--revert`, бэкапы
  оригиналов в `.cards-backup/`. Русские названия и описания: «Терминал», «Контейнеры Docker», «RSS-дайджест»,
  «Поиск по журналам», «Конфигурация MCP-серверов», «Codegraph», «Настройки плагинов», «Рынок плагинов»,
  «Команды агентов».
- npm-скрипты `cards:apply` / `cards:check` / `cards:revert`.

### Notes

- Правки живут внутри `node_modules` профиля и сбрасываются переустановкой плагинов — после `pnpm install`
  запустите `pnpm run cards:apply` повторно.

## [0.2.0] — 2026-11-06

Русская локализация китайских плагинов DSH и обновление ядра до Harness `0.2.0-rc.2`.

### Added

- **Ядро под Harness `0.2.0-rc.2`**: 58 namespace'ов / 2 665 ключей (было 48 / 1 679 на `0.1.6-alpha.2`).
  - добавлены namespace'ы `settings.agentLoop`, `settings.shell`, `settings.subagent`, `settings.webSearch`,
    `settings.account`, `shortcuts`, `voice-input`, `sidebarExcel`, `schedule.manager`,
    `settings.sessionLog`, `shortcuts.layout`;
  - удалён `settings.archivedSessions` — архив сессий переехал в `workspace` (добавлены ключи
    `actions.archive/unarchive/pin/unpin`, `archive.confirm.*`, `viewOptions.*`, `row.archived/pinned` и др.);
  - переведены 91 новый ключ `chat` и 216 новых ключей `conversation`, а также `job`, `pluginManager`,
    `schedule.catalog`, `trajectory`, `workspace` и остальные расхождения;
  - для новых счётных строк добавлены формы CLDR `.one/.few/.many/.other`; ключи с пустым английским
    источником оставлены как есть (`verbatim`) без обращения к модели.
- **UI китайских плагинов**: 9 namespace'ов / 2 699 ключей — `@hyzyn/dsh-codegraph` 0.6.20,
  `@hyzyn/dsh-mcp` 0.3.13, `@hyzyn/dsh-rss` 0.4.16, `@hyzyn/dsh-loglens` 0.1.8,
  `@hyzyn/dsh-kit-settings` 0.2.9, `@hyzyn/dsh-tty` 0.38.0, `@hyzyn/dsh-docker` 0.15.0,
  `dshmarket` 1.73.12, `@nanmicoder/dsh-agent-teams` 0.1.29.
- **Host-оверлей на `system-prompt/assemble`**: русские описания 49 инструментов и 153 описаний параметров,
  а также 8 записей system prompt (5 статических секций + `rss-digest` из 17 фрагментов +
  `tty:terminals` из 14 фрагментов; `codegraph:usage` не переводится — английский текст без китайских
  литералов). Включается конфигом `locale-ru: { prompt: 'ru' }` в `cordis.patch.yml`.
- **Снимки и отчёты в `catalogs/`**: `catalogs/plugins/` (zh/en-словари установленных плагинов),
  `catalogs/versions.json` (матрица версий), `catalogs/core/gaps.json` (missing/obsolete по ядру),
  `catalogs/core/settings-plugins-migration.json` (перенос ключей карточек), `catalogs/host/` (zh-строки
  host-поверхностей с SHA-1).
- **Скрипты**: `scripts/plugin-catalogs.mjs` (снятие словарей из установленных бандлов),
  `scripts/translate.mjs` (батч-перевод локальной моделью с валидацией и resume-кэшем),
  `scripts/harness-gaps.mjs` (отчёт о зазорах; `pnpm run check:harness:gaps`).
- **Тесты**: паритет `ru == en` для словарей плагинов (ключи, плейсхолдеры, отсутствие CJK), host-оверлей
  (замена по хэшу, fail-open, динамические фрагменты, дрейф `count`), производные счётчики словарей от
  исходников.
- `docs/GLOSSARY.md` — редакционный глоссарий и правила перевода.

### Changed

- `harness-compatibility.json` закреплён на `dsh-v0.2.0-rc.2` (`0.2.0-rc.2`, revision `639ed01…`).
- Версия пакета — `0.2.0`; описание охватывает плагины и host-поверхности.
- Добавлена локализация карточек плагинов (`scripts/patch-plugin-cards.mjs`, `pnpm run cards:apply`): русские
  названия/описания девяти плагинов в списке и в «Настройки → Плагины».
- `README.md` / `README.en.md` переписаны под фактические объёмы и статусы; карточки плагинов отмечены как
  пропущенные по решению.
- `THIRD_PARTY_NOTICES.md` дополнен разделами по `@hyzyn/*` (Apache-2.0, переводы — производная работа)
  и MIT-плагинам (`dshmarket`, `@nanmicoder/dsh-agent-teams`, `@xbzbing/dsh-git-panel`).

### Fixed

- Терпимая регистрация внешних namespace'ов: конфликт `(ns, ru)` больше не откатывает весь пакет — словарь
  пропускается с предупреждением, остальные работают.
- Динамические фрагменты system prompt заменяются во **всех** вхождениях (`tty:terminals` при 2+ сессиях);
  объявленный `count` работает как дрейф-гейт.
- `check:harness:keys` больше не считает namespace'ы плагинов чужими.

### Compatibility

- DeepSeek Harness `0.2.0-rc.2` (тег `dsh-v0.2.0-rc.2`): `DSH_HARNESS_ROOT=… pnpm run check:harness` —
  зелёный, `verified 67 Russian dictionaries against DeepSeek Harness 0.2.0-rc.2`.
- Node.js `^22.19.0 || >=24.0.0`, pnpm 12.
- Плагины: ключи сняты с версий из матрицы выше; паритет проверяется тестом на снимках.

### Known limitations

- **Карточки плагинов** в «Настройки → Плагины» не локализованы: они читаются из `locale/*.json` **внутри**
  пакета плагина, поэтому требуют патча установленных пакетов, а не bundle-пакета. Пропущено по решению.
- **Рантайм-сообщения плагинов** (не UI: сообщения инструментов, ошибки выполнения) — вне объёма.
- Переводы плагинов и ядра — черновики локальной модели с редакционной вычиткой; неточности принимаются
  как issues.
- При обновлении Harness или плагинов хэш-гейт пропускает изменённые строки с предупреждением, пока
  снимки `catalogs/` и переводы не будут обновлены (для этого есть `check:harness:gaps`).
- `plugin:dsh-codegraph:usage` остаётся на английском: в источнике нет китайских литералов.

## [0.1.0]

Базовая версия форка: ядровые словари для Harness `0.1.6-alpha.2` (48 namespace'ов), язык `ru` с fallback
`en`, русские формы числительных, установочный слой `cordis.patch.yml`.
