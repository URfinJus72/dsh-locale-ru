/**
 * Gap report between the Russian dictionaries this pack ships and the
 * dictionaries the pinned Harness revision owns.
 *
 * `check-harness-keys.mjs` answers "is the pack valid?" and stays red until the
 * dictionaries catch up. This script answers "what exactly is missing?" — it
 * walks the same namespace map, loads every owner dictionary pair from the
 * Harness sources with esbuild, loads the built `lib/client.js` the way the web
 * host does, and writes a machine-readable worklist to `catalogs/core/gaps.json`:
 *
 *   { generatedFor: { harness, version },
 *     namespaces: { <ns>: { missing: [{ key, en, zh, verbatim? }],
 *                           obsolete: [key], ruKeys, coreKeys } } }
 *
 * Plural suffixes are normalised away on both sides (`.zero`, `.one`, `.two`,
 * `.few`, `.many`, `.other`), because ru needs `.one/.few/.many` where en/zh
 * need `.one/.other`: `missing` lists base keys, `obsolete` lists base keys the
 * pack still ships that the Harness owner dropped. `en`/`zh` are the Harness
 * source strings of the missing key (the `.other` variant when the owner only
 * ships plural forms); `ruKeys`/`coreKeys` count normalised base keys. A missing
 * key whose English source is empty or whitespace carries `verbatim: true`: the
 * Russian value must be the English source as-is (never translated or invented).
 *
 * Usage: `DSH_HARNESS_ROOT=/tmp/harness-020rc2 node scripts/harness-gaps.mjs
 * [--out catalogs/core/gaps.json]`
 */
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { DIRECTORY_BROWSER_KEYS, NAMESPACES } from './harness-namespaces.mjs'
import { resolveHarnessRoot } from './harness-root.mjs'

const PACKAGE_ID = '@absolutemikhail/dsh-locale-ru'
const REPOSITORY_ROOT = fileURLToPath(new URL('../', import.meta.url))
const PLURAL_SUFFIX = /\.(zero|one|two|few|many|other)$/

/** Map of a dictionary export to its counterpart export in the same file. */
const COUNTERPART_EXPORT = {
  zh: 'en',
  en: 'zh',
  accessZh: 'accessEn',
  accessEn: 'accessZh',
}

/** Parse `--name value` / `--name=value` pairs. */
function parseArguments(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (!argument.startsWith('--')) throw new Error(`unexpected argument: ${argument}`)
    const equals = argument.indexOf('=')
    const flag = equals === -1 ? argument.slice(2) : argument.slice(2, equals)
    const value = equals === -1 ? argv[index + 1] : argument.slice(equals + 1)
    if (value === undefined || value.startsWith('--')) throw new Error(`--${flag} needs a value`)
    if (equals === -1) index += 1
    options[flag] = value
  }
  return options
}

/** Normalised base key: plural suffix stripped so ru and en/zh key sets compare. */
function baseKey(key) {
  return key.replace(PLURAL_SUFFIX, '')
}

/** Locale-independent key order, so the committed report is reproducible. */
function compareKeys(left, right) {
  if (left === right) return 0
  return left < right ? -1 : 1
}

/** Load the built browser bundle and collect every registered ru dictionary. */
async function loadRussianDictionaries() {
  let definition
  globalThis.window = {
    __ModuleLoader__: {
      load(value) {
        definition = value
      },
    },
  }
  try {
    await import(`${pathToFileURL(join(REPOSITORY_ROOT, 'lib/client.js')).href}?gaps=${Date.now()}`)
  } finally {
    delete globalThis.window
  }
  assert.equal(definition?.id, PACKAGE_ID, 'the built client bundle did not register the expected package id')
  const plugin = definition.factory(() => {
    throw new Error('the locale bundle must not require another browser module at runtime')
  })
  const dictionaries = new Map()
  plugin.apply({
    locale: {
      addLanguage() {
        return () => {}
      },
      register(namespace, locale, dictionary) {
        assert.equal(locale, 'ru')
        dictionaries.set(namespace, dictionary)
        return () => {}
      },
    },
    effect(callback) {
      callback()
    },
  })
  return dictionaries
}

/** Index every workspace package of the Harness checkout by package name. */
async function packageDirectories(harnessRoot) {
  const result = new Map()
  const groups = await readdir(join(harnessRoot, 'packages'), { withFileTypes: true })
  for (const group of groups.filter(entry => entry.isDirectory())) {
    const groupPath = join(harnessRoot, 'packages', group.name)
    const packages = await readdir(groupPath, { withFileTypes: true })
    for (const entry of packages.filter(candidate => candidate.isDirectory())) {
      const directory = join(groupPath, entry.name)
      try {
        const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
        if (typeof manifest.name === 'string') result.set(manifest.name, directory)
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error
      }
    }
  }
  return result
}

/** Split `@scope/package/subpath` into the package name and the file subpath. */
function splitOwner(owner) {
  const match = /^(@[^/]+\/[^/]+)\/(.+)$/.exec(owner)
  if (match === null) throw new Error(`invalid owner module ${owner}`)
  return { packageName: match[1], subpath: match[2] }
}

/**
 * Bundle and import both dictionaries of every owner row: the map's
 * `keyExport` and its counterpart (`zh`↔`en`, `accessZh`↔`accessEn`), because a
 * gap entry needs the English source and the Chinese context.
 */
async function loadOwnerDictionaries(harnessRoot, rows) {
  const directories = await packageDirectories(harnessRoot)
  const imports = []
  const names = []
  for (const [index, row] of rows.entries()) {
    const { packageName, subpath } = splitOwner(row.owner)
    const directory = directories.get(packageName)
    if (directory === undefined) throw new Error(`${row.slug}: Harness package ${packageName} was not found`)
    const source = resolve(directory, subpath).replaceAll('\\', '/')
    const counterpart = COUNTERPART_EXPORT[row.keyExport]
    if (counterpart === undefined) throw new Error(`${row.slug}: no counterpart export for ${row.keyExport}`)
    for (const exportName of [row.keyExport, counterpart]) {
      const name = `dictionary${index}_${exportName}`
      imports.push(`import { ${exportName} as ${name} } from ${JSON.stringify(source)}`)
      names.push(name)
    }
  }
  const bundled = await build({
    absWorkingDir: harnessRoot,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    write: false,
    logLevel: 'silent',
    stdin: {
      contents: `${imports.join('\n')}\nexport default [${names.join(', ')}]\n`,
      loader: 'ts',
      resolveDir: harnessRoot,
      sourcefile: 'dsh-locale-ru-gap-dictionaries.ts',
    },
  })
  const temporary = await mkdtemp(join(tmpdir(), 'dsh-locale-ru-gaps-'))
  const modulePath = join(temporary, 'owners.mjs')
  try {
    await writeFile(modulePath, bundled.outputFiles[0].contents)
    const exports = (await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`)).default
    return rows.map((row, index) => {
      const primary = exports[index * 2]
      const counterpart = exports[index * 2 + 1]
      const zh = row.keyExport === 'zh' ? primary : counterpart
      const en = row.keyExport === 'zh' ? counterpart : primary
      return { en, zh }
    })
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

/** Group owner keys by their normalised base key. */
function groupByBaseKey(dictionary) {
  const groups = new Map()
  for (const key of Object.keys(dictionary)) {
    const base = baseKey(key)
    const keys = groups.get(base) ?? []
    keys.push(key)
    groups.set(base, keys)
  }
  return groups
}

/** Pick the source strings of a missing base key: exact, `.other`, `.one`, then first. */
function sourceFor(base, keys, en, zh) {
  const preference = [base, `${base}.other`, `${base}.one`, ...keys.slice().sort()]
  for (const key of preference) {
    if (!keys.includes(key)) continue
    const enValue = en[key]
    const zhValue = zh[key]
    if (typeof enValue === 'string' || typeof zhValue === 'string') {
      return { en: enValue ?? '', zh: zhValue ?? '' }
    }
  }
  return { en: '', zh: '' }
}

/** Compare one namespace and return its gap entry. */
function compareNamespace(ruDictionary, en, zh) {
  const ruBaseKeys = new Set(Object.keys(ruDictionary).map(baseKey))
  const groups = groupByBaseKey(en)
  const missing = []
  for (const [base, keys] of [...groups].sort(([left], [right]) => compareKeys(left, right))) {
    if (ruBaseKeys.has(base)) continue
    const source = sourceFor(base, keys, en, zh)
    const entry = { key: base, ...source }
    if (source.en.trim() === '') entry.verbatim = true
    missing.push(entry)
  }
  const obsolete = [...ruBaseKeys]
    .filter(base => !groups.has(base))
    .sort(compareKeys)
  return { missing, obsolete, ruKeys: ruBaseKeys.size, coreKeys: groups.size }
}

const options = parseArguments(process.argv.slice(2))
const harnessRoot = await resolveHarnessRoot()
const harnessManifest = JSON.parse(await readFile(join(harnessRoot, 'package.json'), 'utf8'))
const compatibility = JSON.parse(await readFile(join(REPOSITORY_ROOT, 'harness-compatibility.json'), 'utf8'))
const outputPath = resolve(REPOSITORY_ROOT, options.out ?? 'catalogs/core/gaps.json')

const russian = await loadRussianDictionaries()
const ownerRows = NAMESPACES.filter(row => row.owner !== undefined)
const ownerDictionaries = await loadOwnerDictionaries(harnessRoot, ownerRows)
const owners = new Map(ownerRows.map((row, index) => [row.ns, ownerDictionaries[index]]))

const namespaces = {}
let totalMissing = 0
let totalObsolete = 0
for (const row of NAMESPACES) {
  const ruDictionary = russian.get(row.ns) ?? {}
  let en
  let zh
  if (row.owner === undefined) {
    // Inline owner keys: the key is the only source string that exists.
    en = Object.fromEntries(DIRECTORY_BROWSER_KEYS.map(key => [key, key === 'browser.createIn' ? '{name}' : key]))
    zh = en
  } else {
    const dictionaries = owners.get(row.ns)
    if (dictionaries === undefined) throw new Error(`${row.slug}: owner dictionary ${row.owner} is missing`)
    ;({ en, zh } = dictionaries)
  }
  const entry = compareNamespace(ruDictionary, en, zh)
  namespaces[row.ns] = entry
  totalMissing += entry.missing.length
  totalObsolete += entry.obsolete.length
  console.log(
    `${row.ns}: ru ${entry.ruKeys} / core ${entry.coreKeys} keys, missing ${entry.missing.length}, obsolete ${entry.obsolete.length}`,
  )
}

const report = {
  generatedFor: { harness: compatibility.ref, version: harnessManifest.version },
  namespaces,
}
await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(
  `${Object.keys(namespaces).length} namespaces, ${totalMissing} missing keys, ${totalObsolete} obsolete keys `
  + `(Harness ${harnessManifest.version}, ${outputPath})`,
)
