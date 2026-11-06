import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'

const PACKAGE_ID = '@absolutemikhail/dsh-locale-ru'
/** Core namespaces the pack has always owned; the plugin packs add more. */
const CORE_DICTIONARIES = 48
/** Namespaces declared by the plugin dictionaries that exist in this checkout. */
const pluginDir = new URL('../src/client/dictionaries/plugins/', import.meta.url)
const pluginFiles = await readdir(pluginDir).catch(() => [])
const pluginNamespaces = []
for (const file of pluginFiles.filter(name => name.endsWith('.ts')).sort()) {
  const source = await readFile(new URL(file, pluginDir), 'utf8')
  const ns = /export const ns\s*=\s*'([^']+)'/.exec(source)?.[1]
  if (ns !== undefined) pluginNamespaces.push(ns)
}
let definition
globalThis.window = {
  __ModuleLoader__: {
    load(value) {
      definition = value
    },
  },
}

await import(`../lib/client.js?test=${Date.now()}`)
assert.equal(definition?.id, PACKAGE_ID)
const plugin = definition.factory(() => {
  throw new Error('The locale bundle must not require another browser module at runtime')
})
assert.deepEqual(plugin.inject, ['locale'])

let language
const effectDisposers = []
const dictionaries = new Map()
const disposed = []
const ctx = {
  locale: {
    addLanguage(value) {
      language = value
      return () => { disposed.push('language') }
    },
    register(namespace, locale, dictionary) {
      assert.equal(locale, 'ru')
      dictionaries.set(namespace, dictionary)
      return () => { disposed.push(namespace) }
    },
  },
  effect(callback) {
    effectDisposers.push(callback())
  },
}
plugin.apply(ctx)

assert.deepEqual(language, { id: 'ru', label: 'Русский', fallback: 'en' })
assert.ok(dictionaries.size >= CORE_DICTIONARIES, `expected the core ${CORE_DICTIONARIES} dictionaries, got ${dictionaries.size}`)
assert.equal(dictionaries.get('settings')?.title, 'Настройки')
assert.equal(dictionaries.get('chat')?.['message.turnProcess.toolCalls.few'], '{count} вызова инструмента')
assert.equal(dictionaries.get('chat')?.['message.turnProcess.toolCalls.many'], '{count} вызовов инструментов')
for (const ns of pluginNamespaces) {
  assert.ok(dictionaries.has(ns), `plugin dictionary "${ns}" is declared in src but missing from the bundle`)
}

for (const dispose of effectDisposers) dispose()
assert.equal(disposed.length, dictionaries.size + 1)

const host = await import('../lib/index.js')
assert.equal(typeof host.apply, 'function')
host.apply()

const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
assert.match(patch, /id: locale-ru\s+name: '@absolutemikhail\/dsh-locale-ru'/)

console.log(`verified ${dictionaries.size} Russian dictionaries and the installable bundle layer`)
