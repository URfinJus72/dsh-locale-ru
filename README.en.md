# 🇷🇺 dsh-locale-ru

### Native Russian localization for DeepSeek Harness: web UI, Chinese-language plugins and tool descriptions

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek_Harness-0.2.0--rc.2-blue)](https://github.com/deepseek-ai/deepseek-harness)
[![Check](https://github.com/URfinJus72/dsh-locale-ru/actions/workflows/check.yml/badge.svg)](https://github.com/URfinJus72/dsh-locale-ru/actions/workflows/check.yml)

[Русский](README.md)

A fork of [AbsoluteMikhail/dsh-locale-ru](https://github.com/AbsoluteMikhail/dsh-locale-ru).
It adds **Русский** to the built-in DeepSeek Harness language selector and translates:

- the core web interface — **58 namespaces, 2,665 strings**;
- the UI of the Chinese-language plugins `@hyzyn/*`, `dshmarket`, `@nanmicoder/dsh-agent-teams`, and
  `@zoria-lind/dsh-token-optimizer` — **10 namespaces, 2,746 strings**;
- the plugin tool descriptions (**49 tools, 153 parameter descriptions**) and **8 system-prompt entries**
  the plugins contribute to the agent;
- two plugins with no locale system — `dsh-web-startup-auth` (the «认证» tab and the login page) and
  `@zoria-lind/dsh-token-optimizer` (the `/token-status` and `/token-archive-retry` commands): their
  hardcoded Chinese is translated by **pnpm patches** that survive `pnpm install`.

That is **68 dictionaries and 5,411 strings** plus two plugin patches. The package uses the public locale-pack
API and the official `system-prompt/assemble` hook: no application internals are replaced and no rendered DOM
is rewritten. Plugins without locales are fixed through the official pnpm patch mechanism rather than by
editing sources in place.

**Base localization:** [AbsoluteMikhail](https://github.com/AbsoluteMikhail) (MIT).
**Fork, plugin localization and host overlay:** [URfinJus72](https://github.com/URfinJus72).

## Status

| Surface | Size | Status |
|---|---|---|
| Core: web-interface namespaces | 58 ns / 2,665 keys | ✅ working on Harness `0.2.0-rc.2` |
| Core: Harness `0.2.0-rc.2` parity | 68 dictionaries | ✅ `pnpm run check:harness` is green |
| Plugin UI | 10 ns / 2,746 keys | ✅ released |
| Plugin tool descriptions | 49 tools / 153 parameters | ✅ released |
| Plugin system-prompt sections | 8 entries (5 static + 3 dynamic) | ✅ released |
| «Авторизация» tab (`dsh-web-startup-auth`) | ~62 strings + login page | ✅ `patches/dsh-web-startup-auth@0.1.14.patch` |
| Slash menu and command output (`dsh-token-optimizer`) | 100 strings (`/token-status`, `/token-archive-retry`) | ✅ `patches/@zoria-lind__dsh-token-optimizer@3.0.0.patch` |
| Plugin cards in Settings → Plugins | — | ⚠️ `cards:apply` script; re-run after plugin updates (currently drifted for `@hyzyn/dsh-docker` and `dshmarket`) |
| Plugin runtime messages (logs, non-UI) | — | ⏭ out of scope |

Full analysis and phased plan: [`docs/PLUGINS-RU-PLAN.md`](docs/PLUGINS-RU-PLAN.md).
Editorial glossary: [`docs/GLOSSARY.md`](docs/GLOSSARY.md).

## Features

- 58 core translation namespaces and 2,665 interface strings; 5,411 strings in the package overall.
- Coverage for chat, settings, workspaces, plugins, permissions, terminal, files, plans, jobs, subagents,
  trajectories, voice input, shortcuts, account, and utility panels.
- UI of ten Chinese-language plugins: Codegraph, MCP, RSS, Loglens, Kit-settings, TTY, Docker, Market,
  Agent Teams, Token Optimizer.
- Russian UI of two plugins that ship no dictionaries (`dsh-web-startup-auth`, `dsh-token-optimizer`),
  applied as pnpm patches that survive reinstall.
- Russian descriptions of 49 tools and their parameters for the agent — through `system-prompt/assemble`,
  gated by the SHA-1 of the source string: when a plugin updates its text, the stale translation is not used.
- Russian text for the 8 system-prompt entries the plugins contribute, including dynamic fragments
  (`rss-digest` — 17, `tty:terminals` — 14).
- Immediate switching through **Settings → General settings → Language**.
- Persistence through the standard profile settings.
- Russian plural forms such as `1 вызов`, `2 вызова`, `5 вызовов`, and `21 вызов`.
- English fallback for keys the Russian dictionaries do not contain yet, including third-party plugins.
- Tolerant registration of external namespaces: if a plugin ships its own `ru`, our dictionary for that
  namespace is skipped with a warning and the rest keeps working.
- Automated key and placeholder comparison against Harness and the plugin snapshots.
- An installation smoke test using an isolated real `web` profile.

## Localizing Chinese-language plugins

`@hyzyn/*`, `dshmarket`, `@nanmicoder/dsh-agent-teams`, and `@zoria-lind/dsh-token-optimizer` ship `zh` +
`en` dictionaries and no `ru`, so with Russian selected their interface fell back to English. The fork adds
Russian dictionaries for their namespaces.

Keys are taken from the versions below; the `ru == en` key parity is tested against the same snapshots
([`catalogs/plugins`](catalogs/plugins), [`catalogs/versions.json`](catalogs/versions.json)):

| Plugin | Key source version | namespace | Keys | Status |
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
| @zoria-lind/dsh-token-optimizer | 3.0.0 | `token-optimizer` | 47 | ✅ (settings UI dictionary) |
| **total** | — | 10 namespaces | **2,746** | — |
| @xbzbing/dsh-git-panel | 1.12.0 | `gitPanel` | 554 | ✅ `ru` already ships with the plugin (not our dictionary) |

### Patches for plugins without a locale system

Two plugins have no dictionaries at all and keep Chinese text directly in their code. Their UI is translated
by pnpm patches that are applied on install and **survive `pnpm install`**:

| Plugin | What is translated | Patch |
|---|---|---|
| `dsh-web-startup-auth` 0.1.14 | the «认证» tab → «Авторизация», its whole UI (~62 strings: switches, labels, messages) and the login page | `patches/dsh-web-startup-auth@0.1.14.patch` |
| `@zoria-lind/dsh-token-optimizer` 3.0.0 | the `/token-status` and `/token-archive-retry` commands (descriptions + output, 100 strings) and the compression settings UI | `patches/@zoria-lind__dsh-token-optimizer@3.0.0.patch` |

The patches are registered in the profile's `pnpm-workspace.yaml` → `patchedDependencies`
(`~/.dsh/profiles/web`). After a plugin version bump the patch must be rebuilt:
`pnpm patch <pkg>@<version>` → edits → `pnpm patch-commit <dir>`.

> ⚠️ Commands (`/token-status`, `/token-archive-retry`) are registered by the **host at startup**. After
> installing the patch, the Russian descriptions appear in the «/» menu only after the profile is restarted.

### Tool descriptions and the system prompt

The host half of the package subscribes to the official `system-prompt/assemble` waterfall and, after every
other contributor (`await next()`), replaces:

| Surface | Size |
|---|---|
| Tool descriptions (`docker_*` 22, `tty_*` 10, `sftp_*` 7, `tunnel_*` 3, `loglens_*` 5, `mcp_*` 2) | 49 tools |
| Parameter descriptions (JSON Schema, recursively) | 153 |
| Static `plugin:dsh-*` sections (codegraph, mcp-config, loglens, tty, docker) | 5 |
| Dynamic entries: `plugin:dsh-rss-digest` (17 fragments), `plugin:dsh-tty:terminals` (14 fragments) | 2 |
| `plugin:dsh-codegraph:usage` | not translated: English text with no Chinese literals |

Every translation carries the SHA-1 of its source string from [`catalogs/host`](catalogs/host). If a plugin
updates its text, the hash no longer matches — the entry is skipped with a warning and the agent receives the
plugin's own text (no misleading translations). Any listener error returns the original prompt assembly: the
overlay never throws and never blocks a model request.

### How it works

- The pack registers the `ru` language (fallback `en`) and one dictionary per namespace:
  `ctx.locale.register(ns, 'ru', dict)`.
- Unknown keys render in English instead of raw identifiers.
- A `(namespace, locale)` pair has a single owner: if a plugin ever ships its own `ru`, our dictionary for
  that namespace is skipped with a warning instead of crashing the whole pack.
- Three plugins (`@hyzyn/dsh-rss`, `@hyzyn/dsh-tty`, `@hyzyn/dsh-docker`) draw their sidebar entries
  imperatively and once, before the `locale` subscription; a small shim
  (`src/client/sidebar-labels.ts`) rewrites those three labels.
- Plugin cards come from `locale/*.json` **inside** each plugin package, so they are localized by
  `scripts/patch-plugin-cards.mjs` rather than by the bundle: it writes `locale/en.json` + `locale/ru.json` and
  adds the paths to the affected packages' `exports`. Commands: `pnpm run cards:apply` / `cards:check` /
  `cards:revert`; re-run after reinstalling plugins (`pnpm install`).
- The host overlay is enabled by `locale-ru: { prompt: 'ru' }` in [`cordis.patch.yml`](cordis.patch.yml).
- Plugins without dictionaries (`dsh-web-startup-auth`, `@zoria-lind/dsh-token-optimizer`) are fixed by pnpm
  patches in the profile directory: `patches/*.patch` plus `patchedDependencies` in `pnpm-workspace.yaml`.
  The patches are applied on every `pnpm install`, so reinstalling plugins does not bring the Chinese back.

## Installation

### From GitHub (fork)

```sh
dsh plugin --profile web add github:URfinJus72/dsh-locale-ru
```

The compiled `lib/` files are committed to the repository. Installing from GitHub does not execute build code
on the user's computer and does not require install-script approval.

Restart the profile, open **Settings → General settings → Language**, and select **Русский**.

### Replacing the upstream package

If `@absolutemikhail/dsh-locale-ru` is already installed from upstream, change the source in the profile's
`package.json`:

```json
"@absolutemikhail/dsh-locale-ru": "github:URfinJus72/dsh-locale-ru"
```

then run `pnpm install` in the profile directory (`~/.dsh/profiles/web`).

> ⚠️ Do not install upstream and the fork at the same time: both register the `ru` language, and the second
> registration fails. The fork is a drop-in replacement that keeps the package name.

### From the interface

Open **Plugins → Add plugin** and enter:

```text
github:URfinJus72/dsh-locale-ru
```

## Verify the installation

```sh
dsh --profile web --dump-config
```

The assembled configuration should contain:

```yaml
- id: locale-ru
  name: '@absolutemikhail/dsh-locale-ru'
  config:
    prompt: ru
```

## What is translated

| Area | Examples |
|---|---|
| Shared UI | Buttons, errors, loading states, confirmations |
| Chat | Messages, statistics, token usage, history |
| Settings | Language, theme, models, plugins, account, shortcuts, voice input |
| Workspaces | Sessions, files, branching, archive, folder picking |
| Tools | Commands, plans, goals, skills, jobs |
| Agents | Subagents, agent teams, presets |
| Sidebars | Browser, terminal, files, documents |
| Documents | Markdown, HTML, PDF, images, Office, Excel |
| Plugins | Codegraph, MCP, RSS, Loglens, Kit-settings, TTY, Docker, Market, Agent Teams, Token Optimizer |
| Plugin patches | The «Авторизация» tab (`dsh-web-startup-auth`), the `/token-status` and `/token-archive-retry` commands |
| Agent prompt | 49 tool descriptions, 153 parameters and 8 system-prompt entries |

## Russian plurals

Core dictionaries provide the CLDR `one`, `few`, `many`, and `other` categories. Harness versions with
extended plural support pick the right form from the `count` or `n` parameter automatically.

| Number | Result |
|---:|---|
| 1 | 1 вызов инструмента |
| 2 | 2 вызова инструмента |
| 5 | 5 вызовов инструментов |
| 21 | 21 вызов инструмента |

Third-party plugin dictionaries have no plural categories: `{n}` is substituted into a single string, so
counted strings are translated with neutral phrasing ("Файлов: {n}").

## Compatibility

| Component | Version |
|---|---|
| DeepSeek Harness (target) | `0.2.0-rc.2` (tag `dsh-v0.2.0-rc.2`) |
| Pinned revision | [`harness-compatibility.json`](harness-compatibility.json) → `639ed01…` |
| Core dictionaries | 58 ns / 2,665 keys against `0.2.0-rc.2` |
| Plugin dictionaries | 10 ns / 2,746 keys |
| Plugins (key source) | see the [version matrix](#localizing-chinese-language-plugins) |

The compatibility check on `0.2.0-rc.2` is **green**:

```text
verified 68 Russian dictionaries against DeepSeek Harness 0.2.0-rc.2
```

What changed relative to the upstream `0.1.6-alpha.2` base:

- the `settings.archivedSessions` namespace was removed (session archiving moved into `workspace`);
- `settings.agentLoop`, `settings.shell`, `settings.subagent`, `settings.webSearch`, `settings.account`,
  `shortcuts`, `voice-input`, `sidebarExcel`, `schedule.manager`, `settings.sessionLog`, and
  `shortcuts.layout` were added;
- the settings-card keys moved out of `settings.plugins` into the new namespaces;
- `chat` and `conversation` gained 91 and 216 keys respectively — all translated.

Harness updates change the key set; a matching localization release should accompany them. The fork keeps
parity tests, key snapshots in `catalogs/`, and a gap report for this:

```sh
DSH_HARNESS_ROOT=/path/to/deepseek-harness pnpm run check:harness:gaps
```

[`catalogs/core/gaps.json`](catalogs/core/gaps.json) lists the missing and obsolete keys per namespace; after a
Harness or plugin update it is regenerated and shows the exact scope of work.

## Update or remove

```sh
dsh plugin --profile web update @absolutemikhail/dsh-locale-ru
dsh plugin --profile web remove @absolutemikhail/dsh-locale-ru
```

You can pin a GitHub installation to a release tag:

```sh
dsh plugin --profile web add github:URfinJus72/dsh-locale-ru#v0.2.0
```

## Development

Client dictionaries live in [`src/client/dictionaries`](src/client/dictionaries), language registration in
[`src/client/index.ts`](src/client/index.ts), the host overlay in [`src/host`](src/host), and the installation
layer in [`cordis.patch.yml`](cordis.patch.yml).

```sh
pnpm install
pnpm run check
```

`pnpm run check` builds the package, verifies dictionary registration, runs the parity tests, and inspects the
npm archive. Commit updated `lib/index.js` and `lib/client.js` together with source changes so GitHub
installations do not need to run a local build.

The full compatibility check needs a DeepSeek Harness checkout:

```sh
DSH_HARNESS_ROOT=/path/to/deepseek-harness pnpm run check:harness
```

[`harness-compatibility.json`](harness-compatibility.json) pins Harness `dsh-v0.2.0-rc.2` (`0.2.0-rc.2`).
GitHub Actions runs the checks automatically.

Dictionary snapshots and the namespace map:

| What | Where |
|---|---|
| Plugin dictionaries (zh/en) and the version matrix | `catalogs/plugins/`, `catalogs/versions.json` |
| Core gaps (missing/obsolete) | `catalogs/core/gaps.json` |
| Host string snapshots (zh + SHA-1) | `catalogs/host/` |
| Harness namespace map | `scripts/harness-namespaces.mjs` |
| Regenerate snapshots/gaps | `pnpm run check:harness:gaps`, `node scripts/plugin-catalogs.mjs` |

## Feedback

If you find an inaccurate translation or an untranslated string,
[open an issue](https://github.com/URfinJus72/dsh-locale-ru/issues) with the screen, source text, and suggested
wording.

## Authorship and license

The base Russian localization and package code are authored and maintained by **AbsoluteMikhail** and released
under the [MIT License](LICENSE). The fork is maintained by **URfinJus72** and preserves the original license
and notices.

Translations of `@hyzyn/*` strings (Apache-2.0) are derivative work: the original licenses and notices are
preserved in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), and changes are recorded in
[CHANGELOG.md](CHANGELOG.md).
`dshmarket`, `@nanmicoder/dsh-agent-teams`, and `@xbzbing/dsh-git-panel` are MIT-licensed.

DeepSeek Harness is a separate DeepSeek project. Its original copyright and license notice are preserved in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). This repository is an independent community project and does
not claim official endorsement by DeepSeek.
