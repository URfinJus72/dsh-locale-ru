# 🇷🇺 dsh-locale-ru

### Native Russian localization for the DeepSeek Harness web interface (+ Chinese-language plugins)

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek_Harness-0.2.0--rc.2-blue)](https://github.com/deepseek-ai/deepseek-harness)
[![Check](https://github.com/URfinJus72/dsh-locale-ru/actions/workflows/check.yml/badge.svg)](https://github.com/URfinJus72/dsh-locale-ru/actions/workflows/check.yml)

[Русский](README.md)

A fork of [AbsoluteMikhail/dsh-locale-ru](https://github.com/AbsoluteMikhail/dsh-locale-ru).
It adds **Русский** to the built-in DeepSeek Harness language selector, translates the core web interface,
and (in progress) localizes the Chinese-language plugins `@hyzyn/*`, `dshmarket`, and
`@nanmicoder/dsh-agent-teams`.

It uses the public locale-pack API: no application internals are replaced, no rendered DOM is rewritten,
and no upstream plugin is forked.

**Base localization:** [AbsoluteMikhail](https://github.com/AbsoluteMikhail) (MIT).
**Fork and plugin localization:** [URfinJus72](https://github.com/URfinJus72).

## Status

| Surface | Status |
|---|---|
| Core: 48 web-interface namespaces | ✅ working (built against Harness `0.1.6-alpha.2`) |
| Core: Harness `0.2.0-rc.2` parity | ⏳ in progress (see [Compatibility](#compatibility)) |
| Plugin UI: 9 namespaces, 2 699 keys | ⏳ planned — [version matrix](#localizing-chinese-language-plugins) |
| Plugin tool descriptions and system-prompt sections | ⏳ planned |
| Plugin cards in Settings → Plugins | ⏳ optional (requires files inside each package) |

Full analysis and phased plan: [`docs/PLUGINS-RU-PLAN.md`](docs/PLUGINS-RU-PLAN.md).

## Features

- 48 translation namespaces and more than 1,600 core interface strings.
- Coverage for chat, settings, workspaces, plugins, permissions, terminal, files, plans, jobs, subagents,
  and utility panels.
- Immediate switching through **Settings → General settings → Language**.
- Persistence through the standard profile settings.
- Russian plural forms such as `1 вызов`, `2 вызова`, `5 вызовов`, and `21 вызов`.
- English fallback for keys that the Russian dictionaries do not contain yet, including third-party plugins.
- Localized names for the built-in permission modes.
- Automated key and placeholder comparison against Harness.
- An installation smoke test using an isolated real `web` profile.

## Localizing Chinese-language plugins

`@hyzyn/*`, `dshmarket`, and `@nanmicoder/dsh-agent-teams` ship `zh` + `en` dictionaries and no `ru`, so with
Russian selected their interface falls back to English. The fork adds Russian dictionaries for their namespaces.

Keys are taken from the versions below; every version gets a `ru == en` key-parity test in the fork:

| Plugin | Key source version | namespace | Keys | Status |
|---|---|---:|---:|---|
| @hyzyn/dsh-codegraph | 0.6.20 | `codegraph` | 205 | ⏳ planned |
| @hyzyn/dsh-mcp | 0.3.13 | `mcp` | 73 | ⏳ planned |
| @hyzyn/dsh-rss | 0.4.16 | `rss` | 132 | ⏳ planned |
| @hyzyn/dsh-loglens | 0.1.8 | `loglens` | 205 | ⏳ planned |
| @hyzyn/dsh-kit-settings | 0.2.9 | `kit-settings` | 4 | ⏳ planned |
| @hyzyn/dsh-tty | 0.38.0 | `tty` | 516 | ⏳ planned |
| @hyzyn/dsh-docker | 0.15.0 | `docker` | 564 | ⏳ planned |
| dshmarket | 1.73.12 | `dsh-market` | 783 | ⏳ planned |
| @nanmicoder/dsh-agent-teams | 0.1.29 | `agentTeams` | 217 | ⏳ planned |
| **total** | — | 9 namespaces | **2 699** | — |
| @xbzbing/dsh-git-panel | 1.12.0 | `gitPanel` | 554 | ✅ `ru` already ships with the plugin |

Also planned: 47 tool descriptions (`docker_*` — 22, `tty_*`/`sftp_*`/`tunnel_list` — 18, `loglens_*` — 5,
`mcp_*` — 2), their parameter descriptions, and 8 `plugin:dsh-*` system-prompt sections. They are rewritten
through the official `system-prompt/assemble` hook without touching upstream plugins.

### How it works

- The pack registers the `ru` language (fallback `en`) and one dictionary per namespace:
  `ctx.locale.register(ns, 'ru', dict)`.
- Unknown keys render in English instead of raw identifiers.
- A `(namespace, locale)` pair has a single owner: if a plugin ever ships its own `ru`, our dictionary for
  that namespace is skipped with a warning instead of crashing the whole pack.
- Plugin cards in Settings → Plugins come from `locale/*.json` **inside** each plugin package, so their
  localization is a separate optional step (patching installed packages), not part of the bundle.

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
```

## What is translated

| Area | Examples |
|---|---|
| Shared UI | Buttons, errors, loading states, confirmations |
| Chat | Messages, statistics, token usage, history |
| Settings | Language, theme, models, plugins, archived sessions |
| Workspaces | Sessions, files, branching, folder picking |
| Tools | Commands, plans, goals, skills, jobs |
| Agents | Subagents, agent teams, presets |
| Sidebars | Browser, terminal, files, documents |
| Documents | Markdown, HTML, PDF, images, Office |
| Plugins (in progress) | Codegraph, MCP, RSS, Loglens, Kit-settings, TTY, Docker, Market, Agent Teams |

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
| DeepSeek Harness (target) | `0.2.0-rc.2` |
| Core dictionary base (upstream 0.1.0) | `0.1.6-alpha.2` |
| Plugins (key source) | see the [version matrix](#localizing-chinese-language-plugins) |

The 0.1.0 core dictionaries were built against Harness `0.1.6-alpha.2`. On `0.2.0-rc.2` some keys are already
renamed or added: for example `chat` is missing 91 keys and `conversation` 216; the `settings.archivedSessions`
namespace was removed, while `settings.agentLoop`, `settings.shell`, `settings.subagent`, and
`settings.webSearch` appeared. That is why the stock `pnpm run check:harness` currently **fails** on
`0.2.0-rc.2` — the namespace map is being updated (plan phase 0.5); afterwards the core dictionaries will be
extended and the check will pass.

Until then, some core strings on `0.2.0-rc.2` fall back to English. That is a version mismatch, not a
regression of the localization.

The `.few` and `.many` plural categories require a `LocaleRuntime` version with extended CLDR support.
Harness updates change the key set; a matching localization release should accompany them (the fork keeps
parity tests and key snapshots for this).

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

Dictionaries live in [`src/client/dictionaries`](src/client/dictionaries), language registration in
[`src/client/index.ts`](src/client/index.ts), and the installation layer in [`cordis.patch.yml`](cordis.patch.yml).

```sh
pnpm install
pnpm run check
```

`pnpm run check` builds the package, verifies dictionary registration, and inspects the npm archive.
Commit updated `lib/index.js` and `lib/client.js` together with source changes so GitHub installations do not
need to run a local build.

The full compatibility check needs a DeepSeek Harness checkout:

```sh
DSH_HARNESS_ROOT=/path/to/deepseek-harness pnpm run check:harness
```

[`harness-compatibility.json`](harness-compatibility.json) currently pins Harness `0.1.6-alpha.2` (the upstream
base); the fork's target is `dsh-v0.2.0-rc.2`, and re-pinning is part of plan phase 0.5. GitHub Actions runs
the checks automatically.

Plugin version matrices and key snapshots will live in `catalogs/` (plan phase 0).

## Feedback

If you find an inaccurate translation or an untranslated string,
[open an issue](https://github.com/URfinJus72/dsh-locale-ru/issues) with the screen, source text, and suggested
wording.

## Authorship and license

The base Russian localization and package code are authored and maintained by **AbsoluteMikhail** and released
under the [MIT License](LICENSE). The fork is maintained by **URfinJus72** and preserves the original license
and notices.

Translations of `@hyzyn/*` strings (Apache-2.0) are derivative work: the original licenses and notices are
preserved in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), and changes are recorded in CHANGELOG.
`dshmarket`, `@nanmicoder/dsh-agent-teams`, and `@xbzbing/dsh-git-panel` are MIT-licensed.

DeepSeek Harness is a separate DeepSeek project. Its original copyright and license notice are preserved in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). This repository is an independent community project and does
not claim official endorsement by DeepSeek.
