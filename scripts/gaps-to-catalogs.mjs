/**
 * Bridge the Harness key diff (`catalogs/core/gaps.json`) into the catalog shape
 * `scripts/translate.mjs` consumes.
 *
 * `gaps.json` groups keys per Harness namespace:
 *   { generatedFor, namespaces: { <ns>: { missing: [{ key, en, zh, verbatim? }], obsolete: [key] } } }
 * `translate.mjs` reads `--catalogs` as a flat directory and validates *every*
 * `*.json` in it before `--only` is applied, so a service file dropped next to
 * the catalogs (`_verbatim.json`, `_obsolete.json`) would abort every batch with
 * `not a plugin catalog snapshot`. The bridge therefore writes one `<ns>.json`
 * catalog per namespace into `catalogs/core/pending/` and keeps the two service
 * lists beside that directory, in `catalogs/core/`.
 *
 * Keys flagged `verbatim: true` are not translated (they are copied as-is), so
 * they are listed in `verbatim.json` instead of getting a catalog; obsolete keys
 * are listed in `obsolete.json` for the cleanup phase.
 *
 * Usage: `node scripts/gaps-to-catalogs.mjs [--gaps <file>] [--out <dir>]`
 */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Owner of every Harness dictionary in the translation matrix. */
const PACKAGE = '@deepseek-ai/dsh'

const REPOSITORY_ROOT = fileURLToPath(new URL('../', import.meta.url))

/** Parse `--name value` / `--name=value` pairs. */
function parseArguments(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (!argument.startsWith('--')) throw new Error(`unexpected argument: ${argument}`)
    const [flag, inline] = argument.slice(2).split('=', 2)
    const value = inline ?? argv[index + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`--${flag} needs a value`)
    if (inline === undefined) index += 1
    options[flag] = value
  }
  return options
}

/** Read and shape-check `gaps.json`. */
async function readGaps(gapsPath) {
  const gaps = JSON.parse(await readFile(gapsPath, 'utf8'))
  const version = gaps.generatedFor?.version
  if (typeof version !== 'string') throw new Error(`${gapsPath}: generatedFor.version is missing`)
  if (typeof gaps.namespaces !== 'object' || gaps.namespaces === null) {
    throw new Error(`${gapsPath}: namespaces is not an object`)
  }
  return { version, namespaces: gaps.namespaces }
}

/** Validate one `missing` row and return its `{ key, en, zh, verbatim }` shape. */
function missingRow(ns, row) {
  if (typeof row?.key !== 'string' || row.key === '') throw new Error(`${ns}: a missing row has no key`)
  if (typeof row.en !== 'string') throw new Error(`${ns}:${row.key}: en is not a string`)
  if (typeof row.zh !== 'string') throw new Error(`${ns}:${row.key}: zh is not a string`)
  return { key: row.key, en: row.en, zh: row.zh, verbatim: row.verbatim === true }
}

/** Split the diff into catalogs plus the verbatim and obsolete key lists. */
function buildCatalogs(namespaces, version) {
  const catalogs = []
  const verbatim = {}
  const obsolete = {}
  for (const [ns, entry] of Object.entries(namespaces)) {
    const en = new Map()
    const zh = new Map()
    const verbatimKeys = []
    for (const row of entry.missing ?? []) {
      const missing = missingRow(ns, row)
      if (missing.verbatim) {
        verbatimKeys.push(missing.key)
        continue
      }
      en.set(missing.key, missing.en)
      zh.set(missing.key, missing.zh)
    }
    if (verbatimKeys.length > 0) verbatim[ns] = verbatimKeys.sort()
    const obsoleteKeys = [...(entry.obsolete ?? [])]
    if (obsoleteKeys.some(key => typeof key !== 'string')) {
      throw new Error(`${ns}: obsolete keys must be strings`)
    }
    if (obsoleteKeys.length > 0) obsolete[ns] = obsoleteKeys.sort()
    if (en.size === 0) continue
    const keys = [...en.keys()].sort()
    catalogs.push({
      file: `${ns}.json`,
      catalog: {
        package: PACKAGE,
        version,
        ns,
        en: Object.fromEntries(keys.map(key => [key, en.get(key)])),
        zh: Object.fromEntries(keys.map(key => [key, zh.get(key)])),
      },
    })
  }
  return { catalogs, verbatim, obsolete }
}

/** Remove every `*.json` left in the output directory by a previous run. */
async function clearCatalogs(directory) {
  await mkdir(directory, { recursive: true })
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    await rm(join(directory, entry.name), { force: true })
  }
}

/** Write one JSON file with the repository's 2-space, trailing-newline style. */
async function emitJson(path, value) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

const options = parseArguments(process.argv.slice(2))
const gapsPath = resolve(REPOSITORY_ROOT, options.gaps ?? 'catalogs/core/gaps.json')
const outDirectory = resolve(REPOSITORY_ROOT, options.out ?? 'catalogs/core/pending')
// The service lists always live next to the default catalog directory, never in
// it: `translate.mjs` validates every `*.json` it finds in `--catalogs`.
const serviceDirectory = resolve(REPOSITORY_ROOT, 'catalogs/core')

const { version, namespaces } = await readGaps(gapsPath)
const { catalogs, verbatim, obsolete } = buildCatalogs(namespaces, version)

await clearCatalogs(outDirectory)
for (const { file, catalog } of catalogs) {
  await emitJson(join(outDirectory, file), catalog)
}
await emitJson(join(serviceDirectory, 'verbatim.json'), verbatim)
await emitJson(join(serviceDirectory, 'obsolete.json'), obsolete)

const totalKeys = catalogs.reduce((sum, { catalog }) => sum + Object.keys(catalog.en).length, 0)
const verbatimKeys = Object.values(verbatim).reduce((sum, keys) => sum + keys.length, 0)
const obsoleteKeys = Object.values(obsolete).reduce((sum, keys) => sum + keys.length, 0)
console.log(
  `${catalogs.length} catalogs, ${totalKeys} keys, ${verbatimKeys} verbatim, ${obsoleteKeys} obsolete`,
)
