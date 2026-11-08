/**
 * Host tools seam: DeepSeek Harness 0.2.2 detaches tool schemas from the
 * `system-prompt/assemble` waterfall, so the overlay reaches them through
 * `ctx.tools.definitions()` instead. These tests exercise that wrapper through
 * the built bundle with a fake registry and the real catalogs.
 *
 * Run with `node --test tests/host.tools.spec.ts`.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { apply } from '../lib/index.js'

interface HostSnapshot {
  tools: Record<string, { zh: string; hash: string; params?: Record<string, string> }>
}

interface RuCatalog {
  tools: Record<string, { hash: string; ru: string; params?: Record<string, string>; paramHashes?: Record<string, string> }>
}

const snapshot = JSON.parse(
  readFileSync(new URL('../catalogs/host/tools.json', import.meta.url), 'utf8'),
) as HostSnapshot
const ru = JSON.parse(
  readFileSync(new URL('../src/host/ru/tools.json', import.meta.url), 'utf8'),
) as RuCatalog

/** Build a nested JSON-schema object from `properties.x.description` paths. */
function parametersFrom(paths: Record<string, string>): Record<string, unknown> {
  const root: Record<string, unknown> = {}
  for (const [path, value] of Object.entries(paths)) {
    const parts = path.split('.')
    let cursor: Record<string, unknown> = root
    for (const part of parts.slice(0, -1)) {
      const next = cursor[part]
      if (typeof next !== 'object' || next === null) cursor[part] = {}
      cursor = cursor[part] as Record<string, unknown>
    }
    cursor[parts[parts.length - 1]!] = value
  }
  return root
}

/** Mount the plugin over a fake registry and return its definitions(). */
function mount(definition: unknown, config: Record<string, unknown> = { prompt: 'ru' }): () => readonly any[] {
  const registry = {
    definitions(): readonly unknown[] {
      return [definition]
    },
  }
  let read: (() => readonly any[]) | undefined
  const ctx = {
    on() { return () => {} },
    tools: registry,
    effect() { return () => {} },
  }
  apply(ctx as never, config as never)
  read = () => registry.definitions()
  assert.ok(read !== undefined)
  return read
}

test('tool description and parameter descriptions are translated in place', () => {
  const name = 'docker_action'
  const source = snapshot.tools[name]!
  const target = ru.tools[name]
  assert.ok(target !== undefined, `${name}: no Russian translation in the catalog`)

  const read = mount({
    name,
    description: source.zh,
    parameters: parametersFrom(source.params ?? {}),
    execute: () => 'kept',
  })
  const [definition] = read()
  assert.equal(definition.description, target.ru)
  assert.equal(definition.execute?.(), 'kept', 'execution callbacks must survive the rewrite')
  for (const [path, sourceText] of Object.entries(source.params ?? {})) {
    const expected = target.params?.[path]
    if (expected === undefined) continue
    const parts = path.split('.')
    let cursor: any = definition.parameters
    for (const part of parts) cursor = cursor?.[part]
    assert.equal(cursor, expected, `${name}: parameter "${path}" was not translated (source: ${sourceText.slice(0, 40)}…)`)
  }
})

test('a changed source description is left in the source language', () => {
  const name = 'docker_action'
  const read = mount({ name, description: 'описание, которого не было в снимке', parameters: {} })
  const [definition] = read()
  assert.equal(definition.description, 'описание, которого не было в снимке')
})

test('unknown tools pass through untouched', () => {
  const definition = { name: 'some_future_tool', description: 'unchanged text', parameters: {} }
  const read = mount(definition)
  assert.deepEqual(read()[0], definition)
})

test('config.prompt !== "ru" disables the seam', () => {
  const name = 'docker_action'
  const source = snapshot.tools[name]!
  const definition = { name, description: source.zh, parameters: {} }
  const read = mount(definition, { prompt: 'off' })
  assert.equal(read()[0].description, source.zh)
})

test('a registry without definitions is tolerated (old hosts)', () => {
  assert.doesNotThrow(() => {
    apply({ on() { return () => {} } } as never, { prompt: 'ru' } as never)
  })
})
