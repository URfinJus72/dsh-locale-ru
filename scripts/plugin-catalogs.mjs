/**
 * Snapshot the zh/en dictionaries of every installed DSH plugin whose UI this
 * locale pack translates.
 *
 * Each plugin bundle inlines its dictionaries instead of exporting them, so the
 * snapshots are extracted from the *installed* bundle text (the exact bytes the
 * running GUI loads) rather than from a checkout. The output is the contract
 * every later phase reads:
 *
 * - `catalogs/plugins/<ns>.json` — `{ package, version, ns, en, zh }` with
 *   sorted keys, the translation source (`en`) and the Chinese context (`zh`).
 * - `catalogs/versions.json` — the version matrix the snapshots were taken
 *   from, plus the Harness and locale-pack versions.
 *
 * Extraction is deliberately literal: object literals are sliced by brace
 * balance (string- and comment-aware) and evaluated with `node:vm`, because the
 * hyzyn bundles escape every value as `\uXXXX` and a plain text copy would keep
 * the escapes instead of the characters. Every key must also appear as a
 * literal in the bundle, so a stale snapshot cannot silently pass.
 *
 * Usage: `node scripts/plugin-catalogs.mjs [--plugins <dir>] [--out <dir>]
 * [--versions <file>] [--harness <version>] [--check]`
 */
import assert from 'node:assert/strict'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const REPOSITORY_ROOT = fileURLToPath(new URL('../', import.meta.url))
const DEFAULT_PLUGINS_ROOT = join(homedir(), '.dsh/profiles/web/node_modules')
const DEFAULT_HARNESS_VERSION = '0.2.2-rc.1'

/** CJK characters, kana and fullwidth forms that must never reach a ru value. */
const CJK = /[\u2E80-\u2EFF\u3000-\u303F\u3040-\u30FF\u3100-\u312F\u31A0-\u31BF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF]/

/**
 * One installed plugin and the exact shape of its inlined dictionaries.
 *
 * - `i18n`: `I18N_NS = '<ns>'`, `I18N_ZH = {...}`, `I18N_EN = {...}`.
 * - `minified`: `X = "<ns>", <zh> = {...}, <en> = {...}` on one line.
 * - `const-pair`: a readable `const zh = {...}` / `const en = {...}` pair,
 *   optionally anchored after a namespace declaration.
 * - `locale-map`: `<locales> = { zh: <zh>, en: <en>, ..., ru: <ru> }`, where the
 *   map only names dictionaries that are declared elsewhere in the bundle and
 *   may carry a `ru` dictionary of its own (git-panel).
 */
const PLUGINS = [
  { name: '@hyzyn/dsh-codegraph', ns: 'codegraph', file: 'client.js', kind: 'i18n' },
  { name: '@hyzyn/dsh-mcp', ns: 'mcp', file: 'client.js', kind: 'i18n' },
  { name: '@hyzyn/dsh-rss', ns: 'rss', file: 'client.js', kind: 'i18n' },
  { name: '@hyzyn/dsh-loglens', ns: 'loglens', file: 'client.js', kind: 'i18n' },
  { name: '@hyzyn/dsh-kit-settings', ns: 'kit-settings', file: 'client.js', kind: 'i18n' },
  { name: '@hyzyn/dsh-tty', ns: 'tty', file: 'client.js', kind: 'minified' },
  { name: '@hyzyn/dsh-docker', ns: 'docker', file: 'client.js', kind: 'minified' },
  { name: 'dshmarket', ns: 'dsh-market', file: 'client/client.js', kind: 'const-pair', anchor: 'const zh = {' },
  {
    name: '@nanmicoder/dsh-agent-teams',
    ns: 'agentTeams',
    file: 'lib/client.js',
    kind: 'const-pair',
    anchor: 'AGENT_TEAMS_LOCALE_NAMESPACE = "agentTeams"',
  },
]

/** Key counts of the reviewed version matrix; a drift warning, not a failure. */
const EXPECTED_KEYS = new Map([
  ['codegraph', 205],
  ['mcp', 73],
  ['rss', 132],
  ['loglens', 205],
  ['kit-settings', 4],
  ['tty', 516],
  ['docker', 564],
  ['dsh-market', 788],
  ['agentTeams', 217],
])

/** Parse `--name value` / `--name=value` / `--flag` pairs. */
function parseArguments(argv) {
  const options = { check: false }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (!argument.startsWith('--')) throw new Error(`unexpected argument: ${argument}`)
    const [flag, inline] = argument.slice(2).split('=', 2)
    if (flag === 'check') {
      options.check = true
      continue
    }
    const value = inline ?? argv[index + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`--${flag} needs a value`)
    if (inline === undefined) index += 1
    options[flag] = value
  }
  return options
}

/** Escape a literal for use inside a regular expression. */
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Slice one balanced `{...}` object literal starting at `start`, skipping
 * string literals (with escapes) and comments so braces inside values cannot
 * shift the balance.
 */
function extractObjectLiteral(source, start) {
  if (source[start] !== '{') throw new Error(`expected an object literal at offset ${start}`)
  let depth = 0
  for (let index = start; index < source.length; index += 1) {
    const character = source[index]
    if (character === '"' || character === "'" || character === '`') {
      const quote = character
      index += 1
      while (index < source.length) {
        if (source[index] === '\\') {
          index += 2
          continue
        }
        if (source[index] === quote) break
        index += 1
      }
      continue
    }
    if (character === '/' && source[index + 1] === '/') {
      while (index < source.length && source[index] !== '\n') index += 1
      continue
    }
    if (character === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2)
      if (end === -1) throw new Error('unterminated block comment')
      index = end + 1
      continue
    }
    if (character === '{') depth += 1
    else if (character === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, index + 1)
    }
  }
  throw new Error(`unterminated object literal starting at offset ${start}`)
}

/** Evaluate an object-literal slice, decoding `\uXXXX` escapes exactly like the bundle does. */
function evaluateObjectLiteral(text, label) {
  try {
    const value = vm.runInNewContext(`(${text})`, undefined, { timeout: 1000 })
    assert.equal(typeof value, 'object')
    assert.notEqual(value, null)
    return value
  } catch (error) {
    throw new Error(`${label}: cannot evaluate the dictionary literal (${error.message})`)
  }
}

/** Find `marker = {` and return the evaluated object literal. */
function extractAfterAssignment(source, marker, label) {
  const pattern = new RegExp(`${escapeRegExp(marker)}\\s*=\\s*\\{`)
  const match = pattern.exec(source)
  if (match === null) throw new Error(`${label}: ${marker} = {...} was not found`)
  const start = match.index + match[0].lastIndexOf('{')
  return evaluateObjectLiteral(extractObjectLiteral(source, start), label)
}

/** `I18N_NS = '<ns>'` / `I18N_ZH` / `I18N_EN` bundles (hyzyn, kit). */
function extractI18nPair(source, spec) {
  const ns = new RegExp(`I18N_NS\\s*=\\s*(['"])${escapeRegExp(spec.ns)}\\1`)
  if (!ns.test(source)) throw new Error(`${spec.ns}: I18N_NS = '${spec.ns}' was not found`)
  return {
    zh: extractAfterAssignment(source, 'I18N_ZH', spec.ns),
    en: extractAfterAssignment(source, 'I18N_EN', spec.ns),
  }
}

/** `X = "<ns>", <zh> = {...}, <en> = {...}` bundles (tty, docker). */
function extractMinifiedPair(source, spec) {
  const anchor = new RegExp(
    `[A-Za-z_$][\\w$]*\\s*=\\s*"${escapeRegExp(spec.ns)}"\\s*,\\s*([A-Za-z_$][\\w$]*)\\s*=\\s*\\{`,
  )
  const match = anchor.exec(source)
  if (match === null) throw new Error(`${spec.ns}: the minified namespace anchor was not found`)
  const zhStart = match.index + match[0].lastIndexOf('{')
  const zhText = extractObjectLiteral(source, zhStart)
  const afterZh = zhStart + zhText.length
  const enPattern = /^\s*,\s*[A-Za-z_$][\w$]*\s*=\s*\{/
  const enMatch = enPattern.exec(source.slice(afterZh))
  if (enMatch === null) throw new Error(`${spec.ns}: the en dictionary was not found after zh`)
  const enStart = afterZh + enMatch.index + enMatch[0].lastIndexOf('{')
  return {
    zh: evaluateObjectLiteral(zhText, spec.ns),
    en: evaluateObjectLiteral(extractObjectLiteral(source, enStart), spec.ns),
  }
}

/** Readable `const zh = {...}` / `const en = {...}` pair (market, agent-teams). */
function extractConstPair(source, spec) {
  const from = spec.anchor === undefined ? 0 : source.indexOf(spec.anchor)
  if (from === -1) throw new Error(`${spec.ns}: anchor ${JSON.stringify(spec.anchor)} was not found`)
  const zhPattern = /(?:const|let|var)\s+zh\s*=\s*\{/
  const zhMatch = zhPattern.exec(source.slice(from))
  if (zhMatch === null) throw new Error(`${spec.ns}: const zh = {...} was not found`)
  const zhStart = from + zhMatch.index + zhMatch[0].lastIndexOf('{')
  const zhText = extractObjectLiteral(source, zhStart)
  const afterZh = zhStart + zhText.length
  const enPattern = /(?:const|let|var)\s+en\s*=\s*\{/
  const enMatch = enPattern.exec(source.slice(afterZh))
  if (enMatch === null) throw new Error(`${spec.ns}: const en = {...} was not found after zh`)
  const enStart = afterZh + enMatch.index + enMatch[0].lastIndexOf('{')
  return {
    zh: evaluateObjectLiteral(zhText, spec.ns),
    en: evaluateObjectLiteral(extractObjectLiteral(source, enStart), spec.ns),
  }
}

/**
 * Assert that the bundle belongs to `spec.ns`. Minified bundles do not always
 * spell the namespace as a standalone literal: one may only carry namespaced
 * message ids (`"gitPanel.file"`) or a prefixed variant (`"git-panel.file"`),
 * so any of those anchors is accepted and the failure lists what was searched.
 */
function assertNamespaceLiteral(source, spec) {
  const standalone = [`"${spec.ns}"`, `'${spec.ns}'`]
  const prefixed = [`"${spec.ns}.`, `'${spec.ns}.`]
  if ([...standalone, ...prefixed].some(anchor => source.includes(anchor))) return
  const described = [...standalone, `"${spec.ns}.<key>"`, `'${spec.ns}.<key>'`].join(', ')
  throw new Error(
    `${spec.ns}: namespace literal was not found in ${spec.file} `
    + `(searched for ${described}; the bundle may have renamed its namespace)`,
  )
}

/**
 * Resolve dictionary identifier `<name> = {...}` to its evaluated object.
 *
 * Bundlers write the declarations in every shape: `var en = {...}`, a
 * continuation of the previous declaration (`}, en = {...}`) or `const en = {...}`.
 */
function extractNamedLiteral(source, name, spec) {
  const patterns = [
    new RegExp(`(?:var|let|const)\\s+${escapeRegExp(name)}\\s*=\\s*\\{`),
    new RegExp(`[,;]\\s*${escapeRegExp(name)}\\s*=\\s*\\{`),
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(source)
    if (match === null) continue
    const start = match.index + match[0].lastIndexOf('{')
    return evaluateObjectLiteral(extractObjectLiteral(source, start), spec.ns)
  }
  throw new Error(
    `${spec.ns}: dictionary ${name} was not found in ${spec.file} `
    + '(neither a var/let/const declaration nor a continuation of one)',
  )
}

/**
 * `<locales> = { zh: <zh>, en: <en>, ..., ru: <ru> }` bundle (git-panel).
 *
 * The map only names dictionaries declared elsewhere in the bundle. `ru` is
 * optional: when the plugin ships one, its size is compared against the
 * snapshot so a partial translation cannot pass unnoticed.
 */
function extractLocaleMap(source, spec) {
  assertNamespaceLiteral(source, spec)
  const mapPattern = /[A-Za-z_$][\w$]*\s*=\s*\{\s*zh\s*:\s*([A-Za-z_$][\w$]*)\s*,\s*en\s*:\s*([A-Za-z_$][\w$]*)/g
  const maps = [...source.matchAll(mapPattern)]
  if (maps.length === 0) throw new Error(`${spec.ns}: the locale map { zh: <zh>, en: <en> } was not found in ${spec.file}`)
  if (maps.length > 1) {
    throw new Error(
      `${spec.ns}: ${maps.length} locale maps found in ${spec.file} `
      + `(offsets ${maps.map(match => match.index).join(', ')}); the plugin selector needs an explicit marker`,
    )
  }
  const [match] = maps
  const mapStart = match.index + match[0].lastIndexOf('{')
  const mapText = extractObjectLiteral(source, mapStart)
  const ruName = /\bru\s*:\s*([A-Za-z_$][\w$]*)/.exec(mapText)
  return {
    zh: extractNamedLiteral(source, match[1], spec),
    en: extractNamedLiteral(source, match[2], spec),
    ru: ruName === null ? undefined : extractNamedLiteral(source, ruName[1], spec),
  }
}

/** Pick the extractor for `spec.kind`, failing loudly on an unknown one. */
function extractDictionaries(source, spec) {
  switch (spec.kind) {
    case 'i18n':
      return extractI18nPair(source, spec)
    case 'minified':
      return extractMinifiedPair(source, spec)
    case 'const-pair':
      return extractConstPair(source, spec)
    case 'locale-map':
      return extractLocaleMap(source, spec)
    default:
      throw new Error(`${spec.ns}: unknown dictionary kind ${JSON.stringify(spec.kind)}`)
  }
}

/** Assert that every dictionary key exists as a literal in the bundle. */
function validateLiterals(spec, keys, source) {
  const identifiers = new Set([...source.matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].map(match => match[1]))
  const missing = keys.filter(key => !source.includes(`'${key}'`)
    && !source.includes(`"${key}"`)
    && !identifiers.has(key))
  if (missing.length > 0) {
    throw new Error(`${spec.ns}: keys not found as literals in ${spec.file}: ${missing.slice(0, 10).join(', ')}`)
  }
}

/** Sort an object's keys and rebuild it, so snapshots diff cleanly. */
function sortedObject(object) {
  return Object.fromEntries(Object.keys(object).sort().map(key => [key, object[key]]))
}

/** Assert that both dictionaries carry the same string-valued key set. */
function validatePair(spec, en, zh) {
  const errors = []
  const enKeys = Object.keys(en).sort()
  const zhKeys = Object.keys(zh).sort()
  const missingInZh = enKeys.filter(key => !zhKeys.includes(key))
  const missingInEn = zhKeys.filter(key => !enKeys.includes(key))
  if (missingInZh.length > 0) errors.push(`${spec.ns}: zh is missing keys: ${missingInZh.join(', ')}`)
  if (missingInEn.length > 0) errors.push(`${spec.ns}: en is missing keys: ${missingInEn.join(', ')}`)
  for (const [locale, dictionary] of [['en', en], ['zh', zh]]) {
    for (const [key, value] of Object.entries(dictionary)) {
      if (typeof value !== 'string') errors.push(`${spec.ns}: ${locale}.${key} is not a string`)
    }
  }
  const withCjk = enKeys.filter(key => CJK.test(en[key]))
  if (withCjk.length > 0) {
    console.warn(`warning: ${spec.ns}: en carries CJK for ${withCjk.length} key(s), first: ${withCjk[0]}`)
  }
  if (errors.length > 0) throw new Error(errors.join('\n'))
  return enKeys
}

/** Read and validate a plugin manifest, returning its version. */
async function pluginVersion(pluginsRoot, spec) {
  const manifestPath = join(pluginsRoot, spec.name, 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.name !== spec.name) {
    throw new Error(`${spec.name}: manifest at ${manifestPath} is ${JSON.stringify(manifest.name)}`)
  }
  if (typeof manifest.version !== 'string') throw new Error(`${spec.name}: manifest has no version`)
  return manifest.version
}

/** Snapshot one plugin: en/zh pair plus versions.json row. */
async function snapshotPair(pluginsRoot, spec) {
  const source = await readFile(join(pluginsRoot, spec.name, spec.file), 'utf8')
  const pair = extractDictionaries(source, spec)
  const keys = validatePair(spec, pair.en, pair.zh)
  validateLiterals(spec, keys, source)
  if (pair.ru !== undefined && Object.keys(pair.ru).length !== keys.length) {
    console.warn(
      `warning: ${spec.ns}: the plugin ships ru for ${Object.keys(pair.ru).length} of ${keys.length} keys`,
    )
  }
  const version = await pluginVersion(pluginsRoot, spec)
  return {
    catalog: {
      package: spec.name,
      version,
      ns: spec.ns,
      en: sortedObject(pair.en),
      zh: sortedObject(pair.zh),
    },
    row: { name: spec.name, version, ns: spec.ns, keys: keys.length, hasRu: false },
  }
}

/**
 * Rows for snapshots this script does not extract.
 *
 * One plugin keeps its strings hardcoded inside the bundle instead of a
 * dictionary literal, so its snapshot is maintained by hand; its row is derived
 * from that snapshot instead of silently disappearing from the version matrix.
 */
async function unmanagedRows(directory, managedNamespaces) {
  const files = (await readdir(directory).catch(() => [])).filter(file => file.endsWith('.json'))
  const rows = []
  for (const file of files) {
    const catalog = JSON.parse(await readFile(join(directory, file), 'utf8'))
    if (managedNamespaces.has(catalog.ns)) continue
    if (typeof catalog.package !== 'string' || typeof catalog.en !== 'object') {
      throw new Error(`${file}: not a plugin catalog snapshot`)
    }
    rows.push({
      name: catalog.package,
      version: catalog.version,
      ns: catalog.ns,
      keys: Object.keys(catalog.en).length,
      hasRu: false,
    })
  }
  return rows
}

/** Read/write one JSON file, honouring `--check` (compare, never write). */
async function emitJson(path, value, check) {
  const text = `${JSON.stringify(value, null, 2)}\n`
  if (check) {
    const current = await readFile(path, 'utf8').catch(() => undefined)
    if (current !== text) throw new Error(`${path} is stale: re-run scripts/plugin-catalogs.mjs`)
    return
  }
  await mkdir(resolve(path, '..'), { recursive: true })
  await writeFile(path, text, 'utf8')
}

const options = parseArguments(process.argv.slice(2))
const pluginsRoot = resolve(options.plugins ?? DEFAULT_PLUGINS_ROOT)
const catalogDirectory = resolve(REPOSITORY_ROOT, options.out ?? 'catalogs/plugins')
const versionsPath = resolve(REPOSITORY_ROOT, options.versions ?? 'catalogs/versions.json')
const harnessVersion = options.harness ?? DEFAULT_HARNESS_VERSION

const localeManifest = JSON.parse(await readFile(join(REPOSITORY_ROOT, 'package.json'), 'utf8'))
const catalogs = []
const rows = []
const warnings = []

for (const spec of PLUGINS) {
  const { catalog, row } = await snapshotPair(pluginsRoot, spec)
  catalogs.push(catalog)
  rows.push(row)
}
rows.push(...await unmanagedRows(catalogDirectory, new Set(PLUGINS.map(spec => spec.ns))))

for (const row of rows) {
  const expected = EXPECTED_KEYS.get(row.ns)
  if (expected !== undefined && expected !== row.keys) {
    warnings.push(`${row.ns}: expected ${expected} keys, found ${row.keys} (plugin drift)`)
  }
}

for (const catalog of catalogs) {
  await emitJson(join(catalogDirectory, `${catalog.ns}.json`), catalog, options.check)
  console.log(`${catalog.ns}: ${Object.keys(catalog.en).length} keys (${catalog.package}@${catalog.version})`)
}
await emitJson(versionsPath, {
  harness: harnessVersion,
  localeRu: localeManifest.version,
  plugins: rows,
}, options.check)

for (const warning of warnings) console.warn(`warning: ${warning}`)
const totalKeys = catalogs.reduce((sum, catalog) => sum + Object.keys(catalog.en).length, 0)
console.log(
  `${catalogs.length} plugin catalogs, ${totalKeys} keys to translate; `
  + `Harness ${harnessVersion}, locale-ru ${localeManifest.version}`,
)
