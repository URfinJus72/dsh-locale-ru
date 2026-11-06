#!/usr/bin/env node
/**
 * Core gap translation runner (task t5, phase 0.5).
 *
 * `scripts/translate.mjs` speaks the plugin-catalog format
 * (`{package,version,ns,en,zh}`), while the core worklist is
 * `catalogs/core/gaps.json`. This runner adapts the call instead of touching
 * the script: it rebuilds a temporary catalog per namespace from the gaps
 * report, pre-seeds the ready Russian translations that moved out of
 * `settings.plugins` (catalogs/core/settings-plugins-migration.json), expands
 * plural bases into the four CLDR forms Russian needs, runs
 * `scripts/translate.mjs` over the rest, then validates and merges everything
 * into `.cache/translations/core/<ns>.json`.
 *
 * Rules encoded here:
 * - `verbatim: true` keys never reach the model: the Russian value is the
 *   English source exactly as-is (empty string or a space).
 * - A missing base key whose Harness owner ships plural forms
 *   (`<key>.one` / `<key>.other`) becomes four keys — `.one`, `.few`, `.many`,
 *   `.other` — with the singular English source for `.one` and the plural one
 *   for the rest; the editor reviews the forms in t6.
 * - `moves` and `shared` from the migration report are copied as-is, so the
 *   reviewed translations are not paid for twice; only the four `unmatched`
 *   keys are translated from their new English text.
 *
 * Usage: `node .cache/translations/core/run.mjs` (DSH_HARNESS_ROOT defaults to
 * /tmp/harness-020rc2, model to ornith-9b on 127.0.0.1:8080).
 */
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { NAMESPACES } from '../../../scripts/harness-namespaces.mjs'

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const OUTPUT = join(REPOSITORY_ROOT, '.cache/translations/core')
const GAPS_PATH = join(REPOSITORY_ROOT, 'catalogs/core/gaps.json')
const MIGRATION_PATH = join(REPOSITORY_ROOT, 'catalogs/core/settings-plugins-migration.json')
const HARNESS_ROOT = process.env.DSH_HARNESS_ROOT ?? '/tmp/harness-020rc2'
const BASE_URL = process.env.DSH_TRANSLATE_BASE_URL ?? 'http://127.0.0.1:8080/v1'
const MODEL = process.env.DSH_TRANSLATE_MODEL ?? 'ornith-9b'

const CJK = /[\u2E80-\u2EFF\u3000-\u303F\u3040-\u30FF\u3100-\u312F\u31A0-\u31BF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF]/
const PLACEHOLDER = /\{(\w+)\}/g
const PLURAL_FORMS = ['one', 'few', 'many', 'other']

/** Sorted `{x}` placeholder multiset, serialised for exact comparison. */
function placeholders(template) {
  return [...template.matchAll(PLACEHOLDER)].map(match => match[0]).sort().join('\0')
}

/** Locale-independent key order. */
function compareKeys(left, right) {
  if (left === right) return 0
  return left < right ? -1 : 1
}

/** Sorted object copy. */
function sortedObject(object) {
  return Object.fromEntries(Object.keys(object).sort(compareKeys).map(key => [key, object[key]]))
}

/** Index every workspace package of the Harness checkout by package name. */
async function packageDirectories(harnessRoot) {
  const result = new Map()
  for (const group of await readdir(join(harnessRoot, 'packages'), { withFileTypes: true })) {
    if (!group.isDirectory()) continue
    for (const entry of await readdir(join(harnessRoot, 'packages', group.name), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const directory = join(harnessRoot, 'packages', group.name, entry.name)
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

/** Bundle and import both dictionaries of every owner row (same sources as harness-gaps). */
async function loadOwnerDictionaries(rows) {
  const directories = await packageDirectories(HARNESS_ROOT)
  const imports = []
  const names = []
  for (const [index, row] of rows.entries()) {
    const match = /^(@[^/]+\/[^/]+)\/(.+)$/.exec(row.owner)
    if (match === null) throw new Error(`invalid owner module ${row.owner}`)
    const directory = directories.get(match[1])
    if (directory === undefined) throw new Error(`${row.slug}: Harness package ${match[1]} was not found`)
    const source = resolve(directory, match[2]).replaceAll('\\', '/')
    const counterpart = { zh: 'en', en: 'zh', accessZh: 'accessEn', accessEn: 'accessZh' }[row.keyExport]
    for (const exportName of [row.keyExport, counterpart]) {
      const name = `dictionary${index}_${exportName}`
      imports.push(`import { ${exportName} as ${name} } from ${JSON.stringify(source)}`)
      names.push(name)
    }
  }
  const bundled = await build({
    absWorkingDir: HARNESS_ROOT,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    write: false,
    logLevel: 'silent',
    stdin: {
      contents: `${imports.join('\n')}\nexport default [${names.join(', ')}]\n`,
      loader: 'ts',
      resolveDir: HARNESS_ROOT,
      sourcefile: 'dsh-locale-ru-core-dictionaries.ts',
    },
  })
  const temporary = await mkdtemp(join(tmpdir(), 'dsh-locale-ru-core-'))
  const modulePath = join(temporary, 'owners.mjs')
  try {
    await writeFile(modulePath, bundled.outputFiles[0].contents)
    const exports = (await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`)).default
    return new Map(rows.map((row, index) => {
      const primary = exports[index * 2]
      const counterpart = exports[index * 2 + 1]
      const zh = row.keyExport === 'zh' ? primary : counterpart
      const en = row.keyExport === 'zh' ? counterpart : primary
      return [row.ns, { en, zh }]
    }))
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

/** Run scripts/translate.mjs over the prepared catalogs, streaming into a log. */
async function runTranslator() {
  const logPath = join(OUTPUT, 'translate.log')
  const args = [
    join(REPOSITORY_ROOT, 'scripts/translate.mjs'),
    '--catalogs', join(OUTPUT, 'catalogs'),
    '--out', join(OUTPUT, 'out'),
    '--base-url', BASE_URL,
    '--model', MODEL,
    '--batch', '8',
    '--max-tokens', '4096',
  ]
  const child = spawn(process.execPath, args, { cwd: REPOSITORY_ROOT, stdio: ['ignore', 'pipe', 'pipe'] })
  let log = ''
  child.stdout.on('data', chunk => { log += chunk })
  child.stderr.on('data', chunk => { log += chunk })
  const code = await new Promise(resolvePromise => child.on('close', resolvePromise))
  await writeFile(logPath, log, 'utf8')
  console.log(`translate.mjs exited with ${code} (log: ${logPath})`)
  return code
}

await mkdir(join(OUTPUT, 'catalogs'), { recursive: true })
await mkdir(join(OUTPUT, 'out'), { recursive: true })

const gaps = JSON.parse(await readFile(GAPS_PATH, 'utf8'))
const migration = JSON.parse(await readFile(MIGRATION_PATH, 'utf8'))
const owners = await loadOwnerDictionaries(NAMESPACES.filter(row => row.owner !== undefined))

// 1. Ready translations that moved out of settings.plugins.
const preseeded = {}
const preseedKey = (ns, key, value) => {
  preseeded[ns] ??= {}
  if (typeof value === 'string' && value.trim() !== '') preseeded[ns][key] = value
}
for (const move of migration.moves) preseedKey(move.ns, move.key, move.ru)
for (const shared of migration.shared) {
  for (const target of shared.targets) preseedKey(target.ns, target.key, shared.ru)
}

// 2. Per-namespace worklist: verbatim keys, plural expansions and single keys.
const worklist = {}
const catalogs = {}
let verbatimKeys = 0
let pluralBases = 0
let modelKeys = 0
for (const [ns, entry] of Object.entries(gaps.namespaces)) {
  const en = {}
  const zh = {}
  const plan = {}
  const owner = owners.get(ns)
  for (const missing of entry.missing) {
    const base = missing.key
    if (missing.verbatim) {
      plan[base] = { kind: 'verbatim', en: missing.en }
      verbatimKeys += 1
      continue
    }
    const ownerEn = owner?.en ?? {}
    const ownerZh = owner?.zh ?? {}
    const hasPlural = PLURAL_FORMS.some(form => `${base}.${form}` in ownerEn)
    if (hasPlural) {
      pluralBases += 1
      const singularEn = ownerEn[`${base}.one`] ?? missing.en
      const singularZh = ownerZh[`${base}.one`] ?? missing.zh
      const pluralEn = ownerEn[`${base}.other`] ?? ownerEn[`${base}.many`] ?? missing.en
      const pluralZh = ownerZh[`${base}.other`] ?? ownerZh[`${base}.many`] ?? missing.zh
      for (const form of PLURAL_FORMS) {
        const key = `${base}.${form}`
        const source = form === 'one' ? singularEn : pluralEn
        const context = form === 'one' ? singularZh : pluralZh
        plan[key] = { kind: 'plural', base, form, en: source }
        if (!(key in (preseeded[ns] ?? {}))) {
          en[key] = source
          zh[key] = context
        }
      }
      continue
    }
    plan[base] = { kind: 'single', en: missing.en }
    if (!(base in (preseeded[ns] ?? {}))) {
      en[base] = missing.en
      zh[base] = missing.zh
    }
  }
  worklist[ns] = plan
  modelKeys += Object.keys(en).length
  if (Object.keys(en).length > 0) {
    catalogs[ns] = { package: 'deepseek-ai/deepseek-harness', version: gaps.generatedFor.version, ns, en: sortedObject(en), zh: sortedObject(zh) }
  }
}

for (const [ns, catalog] of Object.entries(catalogs)) {
  await writeFile(join(OUTPUT, 'catalogs', `${ns}.json`), `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
}
await writeFile(join(OUTPUT, 'preseeded.json'), `${JSON.stringify(sortedObject(preseeded), null, 2)}\n`, 'utf8')
const orphanPreseeded = []
for (const [ns, dictionary] of Object.entries(preseeded)) {
  for (const key of Object.keys(dictionary)) {
    if (!(key in (worklist[ns] ?? {}))) orphanPreseeded.push(`${ns}:${key}`)
  }
}
if (orphanPreseeded.length > 0) {
  console.warn(`warning: ${orphanPreseeded.length} pre-seeded keys are not in the gap worklist: ${orphanPreseeded.join(', ')}`)
}
console.log(`worklist: ${Object.keys(worklist).length} namespaces, ${modelKeys} keys for the model, `
  + `${Object.keys(preseeded).reduce((sum, ns) => sum + Object.keys(preseeded[ns]).length, 0)} pre-seeded, `
  + `${verbatimKeys} verbatim, ${pluralBases} plural bases`)
await writeFile(join(OUTPUT, 'worklist.json'), `${JSON.stringify({ worklist, pluralBases, modelKeys, verbatimKeys }, null, 2)}\n`, 'utf8')
if (process.env.DSH_CORE_DRY === '1') {
  console.log('dry run: catalogs/worklist/preseeded written, translator skipped')
  process.exit(0)
}

// 3. Translate whatever is not pre-seeded.
const exitCode = await runTranslator()

// 4. Merge, validate, write the final dictionaries.
const translateReport = JSON.parse(await readFile(join(OUTPUT, 'out/report.json'), 'utf8').catch(() => '{}'))
const translated = {}
for (const ns of Object.keys(worklist)) {
  translated[ns] = JSON.parse(await readFile(join(OUTPUT, 'out', `${ns}.json`), 'utf8').catch(() => '{}'))
}

const validation = { namespaces: {}, totals: { expected: 0, missing: 0, extra: 0, cjk: 0, placeholders: 0, empty: 0, verbatim: 0, escape: 0 } }
const failures = []
for (const [ns, plan] of Object.entries(worklist)) {
  const merged = {}
  for (const [key, item] of Object.entries(plan)) {
    if (item.kind === 'verbatim') {
      merged[key] = item.en
      validation.totals.verbatim += 1
      continue
    }
    const value = preseeded[ns]?.[key] ?? translated[ns]?.[key]
    if (typeof value !== 'string') {
      failures.push({ ns, key, reason: 'no translation' })
      continue
    }
    merged[key] = value
  }
  const expectedKeys = Object.keys(plan)
  const ruKeys = Object.keys(merged)
  const missing = expectedKeys.filter(key => !(key in merged))
  const extra = ruKeys.filter(key => !(key in plan))
  let cjk = 0
  let placeholderMismatches = 0
  let empty = 0
  let escape = 0
  for (const key of expectedKeys) {
    const value = merged[key]
    if (typeof value !== 'string') continue
    if (CJK.test(value)) cjk += 1
    if (value.includes('\\u')) escape += 1
    const source = plan[key].kind === 'verbatim' ? plan[key].en : (catalogs[ns]?.en[key] ?? '')
    if (plan[key].kind !== 'verbatim' && source.trim() !== '' && value.trim() === '') empty += 1
    if (plan[key].kind !== 'verbatim' && source !== '' && placeholders(value) !== placeholders(source)) placeholderMismatches += 1
  }
  const row = {
    expected: expectedKeys.length,
    missing: missing.length,
    extra: extra.length,
    cjk,
    placeholders: placeholderMismatches,
    empty,
    escape,
    preseeded: Object.keys(preseeded[ns] ?? {}).length,
  }
  validation.namespaces[ns] = row
  for (const [metric, value] of Object.entries(row)) {
    if (metric === 'preseeded' || metric === 'expected') continue
    validation.totals[metric] = (validation.totals[metric] ?? 0) + value
  }
  validation.totals.expected += expectedKeys.length
  if (Object.keys(merged).length > 0) {
    await writeFile(join(OUTPUT, `${ns}.json`), `${JSON.stringify(sortedObject(merged), null, 2)}\n`, 'utf8')
  }
}

const report = {
  generatedFor: gaps.generatedFor,
  model: MODEL,
  baseUrl: BASE_URL,
  counts: {
    namespaces: Object.keys(worklist).length,
    missingBaseKeys: Object.values(gaps.namespaces).reduce((sum, entry) => sum + entry.missing.length, 0),
    expectedKeys: validation.totals.expected,
    modelKeys,
    preseeded: Object.keys(preseeded).reduce((sum, ns) => sum + Object.keys(preseeded[ns]).length, 0),
    verbatim: validation.totals.verbatim,
    pluralBases,
    translated: translateReport.translated ?? 0,
    cached: translateReport.cached ?? 0,
    failed: translateReport.failed ?? 0,
    requests: translateReport.requests ?? 0,
  },
  translateExitCode: exitCode,
  failures: [...failures, ...(translateReport.failures ?? [])],
}
await writeFile(join(OUTPUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
await writeFile(join(OUTPUT, 'validation.json'), `${JSON.stringify(validation, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report.counts))
console.log('validation totals:', JSON.stringify(validation.totals))
if (validation.totals.missing > 0 || validation.totals.extra > 0 || validation.totals.cjk > 0
  || validation.totals.placeholders > 0 || validation.totals.empty > 0 || report.failures.length > 0) {
  process.exitCode = 1
}
