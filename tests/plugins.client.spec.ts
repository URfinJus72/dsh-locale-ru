/**
 * Parity test for the plugin dictionaries this pack ships.
 *
 * The source of truth is the snapshot set in `catalogs/plugins/<ns>.json`
 * (`en` is the translation source, `zh` the Chinese context). The built
 * `lib/client.js` is loaded exactly like the web host does and every registered
 * ru dictionary is compared against its snapshot: identical key set, identical
 * `{x}` placeholder multiset, no CJK characters, no empty value where the
 * source has text.
 *
 * Until `src/client/dictionaries/plugins/` ships its first dictionary the
 * parity subtests are skipped with a diagnostic — the snapshot and
 * `catalogs/versions.json` consistency checks still run, so drift in the
 * installed plugins is caught before the translation phase.
 *
 * Run with `node --test tests/plugins.client.spec.ts` (after `pnpm run build`).
 */
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const PACKAGE_ID = 'dsh-locale-ru'

/** CJK characters, kana and fullwidth forms that must never appear in a ru value. */
const CJK = /[\u2E80-\u2EFF\u3000-\u303F\u3040-\u30FF\u3100-\u312F\u31A0-\u31BF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF]/
const PLACEHOLDER = /\{(\w+)\}/g

/** Repository root, resolved from this file's location. */
const REPOSITORY_ROOT = fileURLToPath(new URL('../', import.meta.url))
const CATALOG_DIRECTORY = join(REPOSITORY_ROOT, 'catalogs/plugins')
const VERSIONS_PATH = join(REPOSITORY_ROOT, 'catalogs/versions.json')
const PLUGINS_DIRECTORY = join(REPOSITORY_ROOT, 'src/client/dictionaries/plugins')

/** One plugin catalog snapshot written by scripts/plugin-catalogs.mjs. */
interface Catalog {
  package: string
  version: string
  ns: string
  en: Record<string, string>
  zh: Record<string, string>
}

/** One row of catalogs/versions.json. */
interface VersionRow {
  name: string
  version: string
  ns: string
  keys: number
  hasRu: boolean
}

/** Sorted `{x}` placeholder multiset, serialised for exact comparison. */
function placeholders(template: string): string {
  return [...template.matchAll(PLACEHOLDER)].map(match => match[0]).sort().join('\0')
}

/** Read every catalog snapshot, ordered by namespace. */
async function readCatalogs(): Promise<Catalog[]> {
  const files = (await readdir(CATALOG_DIRECTORY)).filter(file => file.endsWith('.json')).sort()
  assert.ok(files.length > 0, `${CATALOG_DIRECTORY}: no catalog snapshots — run scripts/plugin-catalogs.mjs`)
  return Promise.all(files.map(async file => JSON.parse(await readFile(join(CATALOG_DIRECTORY, file), 'utf8')) as Catalog))
}

/** Read the version matrix. */
async function readVersions(): Promise<{ harness: string; localeRu: string; plugins: VersionRow[] }> {
  return JSON.parse(await readFile(VERSIONS_PATH, 'utf8'))
}

/** Dictionary modules shipped by this pack; an empty list means "not yet". */
async function pluginDictionaryFiles(): Promise<string[]> {
  try {
    return (await readdir(PLUGINS_DIRECTORY)).filter(file => file.endsWith('.ts')).sort()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

/**
 * Load the built browser bundle the way the web host does and collect every
 * registered ru dictionary.
 *
 * `hostOwnsRu` / `hostNamespaces` simulate DeepSeek Harness 0.2.1+: the host
 * registers the `ru` language itself and ships native Russian for a few core
 * namespaces. The real `locale` service throws on both duplicates, so the pack
 * must degrade instead of losing the whole client entry.
 */
async function loadRussianDictionaries(
  owner: { hostOwnsRu?: boolean; hostNamespaces?: string[] } = {},
): Promise<Map<string, Record<string, string>>> {
  const hostNamespaces = new Set(owner.hostNamespaces ?? [])
  let definition: { id?: string; factory: (require: (id: string) => unknown) => { apply: (ctx: unknown) => void } } | undefined
  const scope = globalThis as { window?: unknown }
  scope.window = {
    __ModuleLoader__: {
      load(value: typeof definition) {
        definition = value
      },
    },
  }
  try {
    await import(`${pathToFileURL(join(REPOSITORY_ROOT, 'lib/client.js')).href}?plugins=${Date.now()}`)
  } finally {
    delete scope.window
  }
  assert.ok(definition !== undefined, 'the built client bundle did not call window.__ModuleLoader__.load')
  assert.equal(definition.id, PACKAGE_ID, 'the built client bundle did not register the expected package id')
  const plugin = definition.factory(() => {
    throw new Error('the locale bundle must not require another browser module at runtime')
  })
  const dictionaries = new Map<string, Record<string, string>>()
  plugin.apply({
    locale: {
      addLanguage() {
        if (owner.hostOwnsRu === true) throw new Error('locale "ru" is already registered')
        return () => {}
      },
      register(namespace: string, locale: string, dictionary: Record<string, string>) {
        assert.equal(locale, 'ru')
        if (hostNamespaces.has(namespace)) {
          throw new Error(`locale namespace "${namespace}" already has locale "ru"`)
        }
        dictionaries.set(namespace, dictionary)
        return () => {}
      },
    },
    effect(callback: () => () => void) {
      callback()
    },
  })
  return dictionaries
}

/** Assert one ru dictionary against its catalog snapshot. */
function assertDictionary(catalog: Catalog, dictionary: Record<string, string>): void {
  const enKeys = Object.keys(catalog.en).sort()
  const ruKeys = Object.keys(dictionary).sort()
  const missing = enKeys.filter(key => !ruKeys.includes(key))
  const unexpected = ruKeys.filter(key => !enKeys.includes(key))
  assert.deepEqual(missing, [], `${catalog.ns}: keys missing from the ru dictionary`)
  assert.deepEqual(unexpected, [], `${catalog.ns}: keys not present in the plugin snapshot`)

  for (const key of enKeys) {
    const value = dictionary[key]
    const source = catalog.en[key] ?? ''
    const context = catalog.zh[key] ?? ''
    assert.equal(typeof value, 'string', `${catalog.ns}:${key}: translation is not a string`)
    if (source.trim() !== '') {
      assert.ok(value.trim() !== '', `${catalog.ns}:${key}: translation is empty`)
    }
    assert.ok(!CJK.test(value), `${catalog.ns}:${key}: translation contains CJK characters: ${JSON.stringify(value)}`)
    const expected = placeholders(source) || placeholders(context)
    assert.equal(placeholders(value), expected, `${catalog.ns}:${key}: placeholders differ from the source`)
  }
}

test('plugin catalog snapshots are internally consistent', async t => {
  const catalogs = await readCatalogs()
  assert.equal(new Set(catalogs.map(catalog => catalog.ns)).size, catalogs.length, 'duplicate catalog namespaces')
  for (const catalog of catalogs) {
    await t.test(catalog.ns, () => {
      assert.equal(typeof catalog.package, 'string', `${catalog.ns}: catalog has no package`)
      assert.equal(typeof catalog.version, 'string', `${catalog.ns}: catalog has no version`)
      assert.deepEqual(
        Object.keys(catalog.en).sort(),
        Object.keys(catalog.zh).sort(),
        `${catalog.ns}: en and zh snapshots disagree on the key set`,
      )
      assert.deepEqual(Object.keys(catalog.en), Object.keys(catalog.en).sort(), `${catalog.ns}: en keys are not sorted`)
      for (const [key, value] of Object.entries(catalog.en)) {
        assert.equal(typeof value, 'string', `${catalog.ns}: en.${key} is not a string`)
      }
    })
  }
  t.diagnostic(`${catalogs.length} plugin catalogs, ${catalogs.reduce((sum, catalog) => sum + Object.keys(catalog.en).length, 0)} keys`)
})

test('catalogs/versions.json matches the plugin snapshots', async () => {
  const versions = await readVersions()
  const catalogs = await readCatalogs()
  const localeManifest = JSON.parse(await readFile(join(REPOSITORY_ROOT, 'package.json'), 'utf8'))
  assert.equal(versions.localeRu, localeManifest.version, 'versions.json localeRu differs from package.json')
  assert.match(versions.harness, /^\d+\.\d+\.\d+(-rc\.\d+)?$/, 'versions.json harness is not a version')

  const byNamespace = new Map(catalogs.map(catalog => [catalog.ns, catalog]))
  const translated = versions.plugins.filter(row => !row.hasRu)
  assert.deepEqual(
    translated.map(row => row.ns).sort(),
    [...byNamespace.keys()].sort(),
    'versions.json and catalogs/plugins/ disagree on the translated namespaces',
  )
  for (const row of versions.plugins) {
    if (row.hasRu) {
      assert.ok(!byNamespace.has(row.ns), `${row.ns}: ships ru, so it must not be a translation catalog`)
      assert.ok(row.keys > 0, `${row.ns}: hasRu row records no keys`)
      continue
    }
    const catalog = byNamespace.get(row.ns)
    assert.ok(catalog !== undefined, `${row.ns}: catalog snapshot is missing`)
    assert.equal(catalog.package, row.name, `${row.ns}: package name drifted`)
    assert.equal(catalog.version, row.version, `${row.ns}: version drifted`)
    assert.equal(Object.keys(catalog.en).length, row.keys, `${row.ns}: key count drifted`)
  }
})

test('plugin ru dictionaries stay in parity with the snapshots', async t => {
  const catalogs = await readCatalogs()
  const strict = (await pluginDictionaryFiles()).length > 0
  if (!strict) {
    t.diagnostic('src/client/dictionaries/plugins/ is empty — parity checks are skipped until the dictionaries ship')
  }
  const dictionaries = await loadRussianDictionaries()
  for (const catalog of catalogs) {
    await t.test(catalog.ns, { skip: strict ? false : 'ru dictionary not shipped yet' }, () => {
      const dictionary = dictionaries.get(catalog.ns)
      assert.ok(dictionary !== undefined, `${catalog.ns}: ru dictionary is not registered by lib/client.js`)
      assertDictionary(catalog, dictionary)
    })
  }
})

// DeepSeek Harness 0.2.1 started registering `ru` itself and shipping native
// Russian for a few core namespaces. Both `addLanguage` and `register` throw on
// duplicates, and the host treats a failed client entry as fatal ("web boot: N
// entry did not activate"), so a single collision must never take the pack down.
test('client entry survives a host that already owns ru and some namespaces', async () => {
  const owned = ['common', 'settings']
  const dictionaries = await loadRussianDictionaries({ hostOwnsRu: true, hostNamespaces: owned })
  assert.ok(dictionaries.size > 0, 'the pack registered nothing when the host already owned ru')
  for (const ns of owned) {
    assert.equal(dictionaries.has(ns), false, `${ns}: the pack must leave a host-owned namespace to the host`)
  }
})
