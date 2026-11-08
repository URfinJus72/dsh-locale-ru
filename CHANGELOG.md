# Changelog

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.1] — 2026-11-08

Документация приведена в соответствие с Harness `0.2.2-rc.1`. Функциональных изменений нет.

### Changed

- `README.md` / `README.en.md`: сказано, что ядро веб-интерфейса с Harness `0.2.1` локализует сам
  харнесс (все 46 ядровых клиентских пакетов везут `export const ru`); регистрация ядровых словарей
  пакетом — опция `core: true`, а не поведение по умолчанию.
- Зафиксировано известное ограничение: в `0.2.2-rc.1` `tools` отделены от waterfall
  `system-prompt/assemble`, поэтому переводы описаний инструментов (`src/host/ru/tools.json`,
  49 инструментов / 153 параметра) не применяются; секции system prompt переводятся как раньше.
- Обновлены устаревшие ссылки на `0.2.0-rc.2`, статус карточек плагинов (`drift 0`).

## [0.5.0] — 2026-11-08

Ядро интерфейса больше не локализуется пакетом: с DeepSeek Harness `0.2.1` это делает сам харнесс.
**Изменение поведения.**

### Fixed

- **`web boot: 51 entries did not activate`.** В `0.2.2-rc.1` **все 46** ядровых клиентских пакетов
  везут собственный русский (`export const ru` в `locales.ts`) и регистрируют его сами. Наш пакет
  регистрировал те же namespace'ы раньше (бандл идёт сразу после `dsh-web-app`), поэтому владевший
  пакет получал `locale namespace "<ns>" already has locale "ru"` и падал при активации — вместе с
  зависимыми от него (`ui-theme` → `layout` → вся цепочка). Регистрация ядровых словарей теперь
  **выключена по умолчанию**: namespace остаётся хосту, а пакет регистрирует только свои.

### Added

- `LocaleRuClientConfig.core` (по умолчанию `false`) — включает регистрацию ядровых словарей для
  хостов, которые локализуют ядро хуже этого пакета (до `0.2.1`). Проверки `check:harness:keys`
  и смоук-тест запускают пакет в обоих режимах: по умолчанию ядровые namespace'ы не занимаются,
  с `core: true` по-прежнему проверяются все 68 словарей.

### Compatibility

- DeepSeek Harness `0.2.2-rc.1`, `verified 68 Russian dictionaries against DeepSeek Harness 0.2.2-rc.1`
  (в режиме `core: true`), 43/43 тестов.
- Плагинные словари (`@hyzyn/*`, `dshmarket`, `@nanmicoder/dsh-agent-teams`, `@zoria-lind/dsh-token-optimizer`)
  и хост-плоскость работают как раньше.

## [0.4.1] — 2026-11-08

Критическое исправление совместимости с DeepSeek Harness `0.2.1+`: клиентская запись пакета больше
не валит веб-бут, когда хост уже владеет русским языком.

### Fixed

- **`@absolutemikhail/dsh-locale-ru: failed` / `web boot: 1 entry did not activate`.** С Harness
  `0.2.1` хост сам регистрирует язык `ru` (`packages/client/locale`: `['ru', 'Русский']` среди
  базовых) и везёт нативный русский для части namespace'ов (`common`, `settings`, плюс
  `ui-context-menu`, `ui-permission-presets`, `ui-schedule`). `ctx.locale.addLanguage` и
  `ctx.locale.register` **бросают** на дублях, а пакет регистрировал словари одной строгой
  транзакцией — первая же коллизия откатывала всё, запись считалась упавшей, и GUI не загружался.
  Теперь каждая регистрация терпима: namespace, который хост уже локализует, остаётся хосту,
  остальные регистрируются, а незнакомая ошибка логируется вместо падения записи.
- Шим подписей сайдбара (`src/client/sidebar-labels.ts`) обёрнут в такую же защиту: его сбой
  больше не уносит клиентскую запись целиком.

### Added

- Регрессионный тест `client entry survives a host that already owns ru and some namespaces`:
  имитирует хост, который владеет языком `ru` и namespace'ами `common`/`settings`, и требует,
  чтобы пакет зарегистрировал остальное, не уронив запись.

### Compatibility

- DeepSeek Harness `0.2.2-rc.1`, `verified 68 Russian dictionaries against DeepSeek Harness 0.2.2-rc.1`.
- Тесты: 43/43.

## [0.4.0] — 2026-11-08

Пакет переименован и перестал представляться пакетом постороннего автора. **Ломающее изменение
для тех, кто ставит пакет по имени.**

### Changed

- Имя пакета: `@absolutemikhail/dsh-locale-ru` → **`dsh-locale-ru`** (без npm-scope). Прежнее имя
  несло scope автора апстрима, хотя это форк; из-за расхождения имён менеджер плагинов однажды
  выполнил `pnpm remove 'github:AbsoluteMikhail/dsh-locale-ru'` по устаревшему состоянию вкладки
  и снёс пакет из профиля — команда упала (exit 1), но манифест и `node_modules` уже очистились.
- `package.json`: `homepage`, `repository`, `bugs` указывали на репозиторий апстрима — теперь на
  форк `URfinJus72/dsh-locale-ru`; `author` — мейнтейнер форка, апстрим сохранён в `contributors`;
  атрибуция в `LICENSE` и `NOTICE` сохранена (требование MIT), в `NOTICE` добавлены сведения о форке.
- Обновлены все внутренние ссылки на имя: `cordis.patch.yml` (запись `locale-ru`), `PACKAGE_ID`
  в `scripts/{build,check-harness-keys,harness-gaps,smoke-install,test}.mjs`, `tests/plugins.client.spec.ts`,
  `README.md`, `README.en.md`.

### Migration

Профиль: заменить ключ зависимости и запись в `bundles` на `dsh-locale-ru`, затем `pnpm install` и,
после инсталляции, `node scripts/patch-plugin-cards.mjs --apply` (установка снова сносит патчи карточек).

### Compatibility

- DeepSeek Harness `0.2.2-rc.1`, `verified 68 Russian dictionaries against DeepSeek Harness 0.2.2-rc.1`.
- Состав словарей и матрица плагинов не менялись относительно `0.3.1`.

## [0.3.1] — 2026-11-08

Редакционная вычитка строк рынка плагинов и унификация терминологии.

### Fixed

- `dsh-market`: `hostIncompatibleHeldButton` / `…ButtonUnknown` — «Ожидание» заменено на
  «Приостановлено»: в интерфейсе это состояние отказа в запуске, а не приглашение подождать.
- `dsh-market`: `hostIncompatibleHeldTarget` / `…TargetUnknown` — переписаны без кальки
  «он всё ещё в периоде ожидания релиза»; сохранены плейсхолдеры `{version}`, `{window}`, `{hours}`.
- `dsh-market`: `restoreSelfPinned` — убрана строчная буква в начале предложения и тяжёлая
  конструкция «замена её в процессе восстановления заменит работающий рынок».
- `dsh-market`: терминология унифицирована — четыре строки `setSelf*` использовали «магазин»
  при 17 остальных вхождениях «рынок» (`setSelfConfirm`, `setSelfPurge`, `setSelfPurgeOff`).

### Compatibility

- DeepSeek Harness `0.2.2-rc.1`: `DSH_HARNESS_ROOT=… node scripts/check-harness-keys.mjs` —
  зелёный, `verified 68 Russian dictionaries against DeepSeek Harness 0.2.2-rc.1`.
- Состав словарей и матрица плагинов не менялись относительно `0.3.0`.

## [0.3.0] — 2026-11-08

Ядро под Harness `0.2.2-rc.1` (тег `dsh-v0.2.2-rc.1`): 341 новый ключ, 61 устаревший, синхронизация
обновившихся плагинов и вывод `@xbzbing/dsh-git-panel` из управляемого набора.

### Added

- **Ядро под Harness `0.2.2-rc.1`**: 341 ключ в 24 namespace'ах — `pluginManager` 103, `schedule.manager` 69,
  `settings.models` 27, `settings.theme` 20, `conversation` 14, `open-in-app` 13, `voice-input` 13, `chat` 10,
  `settings.webSearch` 9, `settings` 8, `trajectory` 8, `workspace` 7, `schedule.catalog` 6,
  `settings.agentPreset` 6, `reference` 4, `session-log-download` 4, `sidebarFiles` 4, `sidebarRight` 4,
  `sidebar` 3, `subagent` 3, `approval` 2, `question` 2, `job` 1, `settings.account` 1.
- `scripts/gaps-to-catalogs.mjs`: мостик `catalogs/core/gaps.json` → каталоги `translate.mjs`
  (`catalogs/core/pending/<ns>.json`, по файлу на namespace; служебные `verbatim.json` / `obsolete.json`
  лежат рядом, но **не** внутри каталога — `translate.mjs` валидирует каждый `*.json` в `--catalogs`).

### Changed

- `@hyzyn/dsh-docker` 0.16.1: словарь подтверждён на 564 ключа, новых нет.
- `dshmarket` 1.73.15: словарь 783 → 788 ключей (`hostIncompatibleHeld*`, `restoreSelfPinned`).
- `token-optimizer` 3.0.0: все 47 ключей сверены со свежим кэшем локальной модели.
- `pluginManager` переработан под 0.2.2 (103 ключа: установка из Git/локального каталога, разрешение
  build-скриптов, детали установки, совместимость версий).
- `schedule.manager` переработан под 0.2.2: 69 новых ключей, интервальный UI (`timing.interval*`,
  `timing.unit.*`, `cronForm.*` — 42 устаревших ключа) заменён cron-формой; для `toast.cleared` добавлены
  русские формы числительных `.one/.few/.many/.other`.
- `scripts/plugin-catalogs.mjs`: извлечение словарей больше не требует отдельного литерала namespace
  (принимает префиксные ключи `"<ns>.<key>"`), резолвит словари, объявленные продолжением `var`-списка
  (`},en={`), сохраняет строки `versions.json` для ручных снимков (`token-optimizer`), а
  `DEFAULT_HARNESS_VERSION` поднят до `0.2.2-rc.1`.
- `harness-compatibility.json`: `0.2.2-rc.1`, revision `66491b0…` (тег `dsh-v0.2.2-rc.1`).
- `catalogs/versions.json`: Harness `0.2.2-rc.1`, `localeRu` `0.3.0`, матрица плагинов переснята.
- Карточки плагинов перепатчены под новые версии (`pnpm run cards:apply`); `pnpm run cards:check` — drift 0.

### Removed

- `@xbzbing/dsh-git-panel` выведен из управляемого набора: с 1.13.2 плагин сам везёт полный русский словарь
  (594 ключа, тот же набор ключей), наш дубль устаревал бы. Удалены снимок `catalogs/plugins/gitPanel.json`,
  строка в `catalogs/versions.json` и запись в `PLUGINS`/`EXPECTED_KEYS`; собственного словаря у пакета не было.
- 61 устаревший ключ: `schedule.manager` 42 (интервальный UI), `settings.theme` 4, `settings.models` 3,
  `settings.pluginInventory` 3, `deliverables` 3, `question` 2, `chat` 1, `plan` 1, `trajectory` 1,
  `pluginManager` 1 (`officialTitle`).

### Fixed

- Плейсхолдеры пяти старых строк приведены к Harness `0.2.2-rc.1`: `pluginManager.restartNotice` и
  `installDoneRestart` получили `{reason}`, `reasonIncompatibleVersion` — `{requirements}` вместо `{peers}`;
  `frequency.cron` / `frequency.cronLocal` в `schedule.catalog` и `schedule.manager` больше не содержат
  выпиленный в ядре `{expression}`.
- Порядок ключей в 27 словарях ядра приведён к порядку Harness-словарей (гейт `check:harness:keys`
  проверяет и порядок); русские формы `.few/.many` стоят сразу за `.other`.

### Compatibility

- DeepSeek Harness `0.2.2-rc.1` (тег `dsh-v0.2.2-rc.1`): `DSH_HARNESS_ROOT=… pnpm run check:harness` —
  зелёный, `verified 68 Russian dictionaries against DeepSeek Harness 0.2.2-rc.1`.
- Node.js `^22.19.0 || >=24.0.0`, pnpm 12.
- Плагины: 9 каталогов / 2 704 ключа; `@xbzbing/dsh-git-panel` в матрице больше нет — русский словарь
  приходит из самого плагина.

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
