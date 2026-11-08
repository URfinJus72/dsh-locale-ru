import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { DIRECTORY_BROWSER_KEYS, NAMESPACES } from './harness-namespaces.mjs'
import { resolveHarnessRoot } from './harness-root.mjs'

const PACKAGE_ID = 'dsh-locale-ru'
const PLURAL_EXTENSION = /^(.*)\.(zero|two|few|many)$/

function placeholders(template) {
  return [...template.matchAll(/\{(\w+)\}/g)].map(match => match[0]).sort()
}

async function loadRussianDictionaries() {
  let definition
  globalThis.window = { __ModuleLoader__: { load(value) { definition = value } } }
  try {
    await import(`../lib/client.js?keys=${Date.now()}`)
  } finally {
    delete globalThis.window
  }
  assert.equal(definition?.id, PACKAGE_ID, 'the built client bundle did not register the expected package id')
  const plugin = definition.factory(() => { throw new Error('the locale bundle must be self-contained') })
  const dictionaries = new Map()
  plugin.apply({
    locale: {
      addLanguage() { return () => {} },
      register(namespace, locale, dictionary) {
        assert.equal(locale, 'ru')
        dictionaries.set(namespace, dictionary)
        return () => {}
      },
    },
    effect(callback) { callback() },
  }, { core: true })
  return dictionaries
}

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

function splitOwner(owner) {
  const match = /^(@[^/]+\/[^/]+)\/(.+)$/.exec(owner)
  if (match === null) throw new Error(`invalid owner module ${owner}`)
  return { packageName: match[1], subpath: match[2] }
}

async function loadOwnerDictionaries(harnessRoot, rows) {
  const directories = await packageDirectories(harnessRoot)
  const imports = []
  const names = []
  for (const [index, row] of rows.entries()) {
    const { packageName, subpath } = splitOwner(row.owner)
    const directory = directories.get(packageName)
    if (directory === undefined) throw new Error(`${row.slug}: Harness package ${packageName} was not found`)
    const source = resolve(directory, subpath).replaceAll('\\', '/')
    const name = `dictionary${index}`
    imports.push(`import { ${row.keyExport} as ${name} } from ${JSON.stringify(source)}`)
    names.push(name)
  }
  const bundled = await build({
    absWorkingDir: harnessRoot,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    write: false,
    stdin: {
      contents: `${imports.join('\n')}\nexport default [${names.join(', ')}]\n`,
      loader: 'ts',
      resolveDir: harnessRoot,
      sourcefile: 'dsh-locale-ru-owner-dictionaries.ts',
    },
  })
  const temporary = await mkdtemp(join(tmpdir(), 'dsh-locale-ru-keys-'))
  const modulePath = join(temporary, 'owners.mjs')
  try {
    await writeFile(modulePath, bundled.outputFiles[0].contents)
    return (await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`)).default
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

function compareKeys(slug, russian, ownerKeys, errors) {
  const russianKeys = Object.keys(russian)
  const baseKeys = russianKeys.filter(key => !PLURAL_EXTENSION.test(key))
  const missing = ownerKeys.filter(key => !baseKeys.includes(key))
  const unexpected = baseKeys.filter(key => !ownerKeys.includes(key))
  if (missing.length > 0) errors.push(`${slug}: missing keys: ${missing.join(', ')}`)
  if (unexpected.length > 0) errors.push(`${slug}: unexpected keys: ${unexpected.join(', ')}`)
  if (missing.length === 0 && unexpected.length === 0 && baseKeys.some((key, index) => key !== ownerKeys[index])) {
    errors.push(`${slug}: key order differs from the Harness owner dictionary`)
  }
  for (const key of russianKeys) {
    const plural = PLURAL_EXTENSION.exec(key)
    if (plural !== null && !ownerKeys.includes(`${plural[1]}.other`)) {
      errors.push(`${slug}: ${key} has no matching .other key in Harness`)
    }
  }
}

const harnessRoot = await resolveHarnessRoot()
const harnessManifest = JSON.parse(await readFile(join(harnessRoot, 'package.json'), 'utf8'))
const russian = await loadRussianDictionaries()
const ownerRows = NAMESPACES.filter(row => row.owner !== undefined)
const ownerDictionaries = await loadOwnerDictionaries(harnessRoot, ownerRows)
const owners = new Map(ownerRows.map((row, index) => [row.ns, ownerDictionaries[index]]))
const errors = []

const expectedNamespaces = NAMESPACES.map(row => row.ns)
for (const namespace of expectedNamespaces) {
  if (!russian.has(namespace)) errors.push(`${namespace}: Russian dictionary is not registered`)
}

/**
 * Plugin namespaces are third-party surfaces owned by installed plugins, not by
 * Harness: their key parity is asserted against `catalogs/plugins/*.json` by
 * tests/plugins.client.spec.ts, so this Harness registry check only rejects
 * namespaces that have no known owner at all.
 */
const pluginCatalogs = await readdir(new URL('../catalogs/plugins/', import.meta.url)).catch(() => [])
const externalNamespaces = new Set(
  await Promise.all(pluginCatalogs
    .filter(name => name.endsWith('.json'))
    .map(async name => JSON.parse(await readFile(new URL(`../catalogs/plugins/${name}`, import.meta.url), 'utf8')).ns)),
)
for (const namespace of russian.keys()) {
  if (!expectedNamespaces.includes(namespace) && !externalNamespaces.has(namespace)) {
    errors.push(`${namespace}: namespace is not listed in the Harness compatibility registry nor in catalogs/plugins`)
  }
}

for (const row of NAMESPACES) {
  const pack = russian.get(row.ns)
  if (pack === undefined) continue
  const source = row.owner === undefined
    ? Object.fromEntries(DIRECTORY_BROWSER_KEYS.map(key => [key, key === 'browser.createIn' ? '{name}' : key]))
    : owners.get(row.ns)
  if (source === undefined) {
    errors.push(`${row.slug}: owner dictionary export is missing`)
    continue
  }
  const ownerKeys = Object.keys(source)
  compareKeys(row.slug, pack, ownerKeys, errors)
  for (const [key, value] of Object.entries(pack)) {
    if (value === '') errors.push(`${row.slug}:${key}: translation is empty`)
    const plural = PLURAL_EXTENSION.exec(key)
    const sourceKey = plural === null ? key : `${plural[1]}.other`
    const sourceValue = source[sourceKey]
    if (sourceValue !== undefined && placeholders(value).join('\0') !== placeholders(sourceValue).join('\0')) {
      errors.push(`${row.slug}:${key}: placeholders differ from Harness (${placeholders(sourceValue).join(', ')})`)
    }
  }
}

if (errors.length > 0) throw new Error(`Harness key compatibility failed:\n- ${errors.join('\n- ')}`)
console.log(`verified ${russian.size} Russian dictionaries against DeepSeek Harness ${harnessManifest.version}`)
