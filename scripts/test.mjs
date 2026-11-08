import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'

const PACKAGE_ID = 'dsh-locale-ru'
/** Core namespaces the pack has always owned; the plugin packs add more. */
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

// Core namespaces are intentionally not registered: DeepSeek Harness 0.2.1+
// ships first-party Russian for every core UI package and registers it itself.
// The pack registering first would make those packages throw and fail to
// activate ("web boot: N entries did not activate").
assert.equal(dictionaries.has('settings'), false, 'default mode must not squat a host-owned core namespace')
assert.equal(dictionaries.has('chat'), false, 'default mode must not squat a host-owned core namespace')
for (const ns of pluginNamespaces) {
  assert.ok(dictionaries.has(ns), `plugin dictionary "${ns}" is declared in src but missing from the bundle`)
}

for (const dispose of effectDisposers) dispose()
assert.equal(disposed.length, dictionaries.size + 1)

// Opt-in mode still ships the core dictionaries for pre-0.2.1 hosts.
const coreDictionaries = new Map()
plugin.apply({
  locale: {
    addLanguage() { return () => {} },
    register(namespace, locale, dictionary) {
      assert.equal(locale, 'ru')
      coreDictionaries.set(namespace, dictionary)
      return () => {}
    },
  },
  effect(callback) { callback() },
}, { core: true })
assert.ok(coreDictionaries.size > dictionaries.size, 'core:true must register more dictionaries than the default mode')
assert.equal(coreDictionaries.get('settings')?.title, 'Настройки')
assert.equal(coreDictionaries.get('chat')?.['message.turnProcess.toolCalls.few'], '{count} вызова инструмента')
assert.equal(coreDictionaries.get('chat')?.['message.turnProcess.toolCalls.many'], '{count} вызовов инструментов')

const host = await import('../lib/index.js')
assert.equal(typeof host.apply, 'function')
host.apply()

const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
assert.match(patch, /id: locale-ru\s+name: 'dsh-locale-ru'/)

console.log(`verified ${dictionaries.size} Russian dictionaries and the installable bundle layer`)
