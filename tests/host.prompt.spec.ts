/**
 * Host overlay tests: `system-prompt/assemble` rewriting.
 *
 * The listener is exercised through the built bundle (`lib/index.js`), i.e. the
 * same code a profile mounts, with a fake context that captures the handler.
 * Nothing here needs an installed Harness: the assembly shape, the catalogs and
 * the waterfall are plain data.
 *
 * Run with `node --test tests/host.prompt.spec.ts` (Node 24 strips the types).
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { apply } from '../lib/index.js'

/** The hash gate the extractor and the overlay must agree on. */
const hashOf = (text: string): string => createHash('sha1').update(text, 'utf8').digest('hex')

interface FakeAssembly {
  sections: { name: string; text: string; interpolate?: boolean }[]
  contexts: { name: string; text: string }[]
  tools: { name: string; description: string; parameters: Record<string, unknown> }[]
  variables: Record<string, string>
}

/** One assembly with two tools, two sections and one per-turn context. */
function fixture(): FakeAssembly {
  return {
    sections: [
      { name: 'plugin:dsh-docker', text: 'docker guidance', interpolate: false },
      { name: 'plugin:unrelated', text: 'leave me alone' },
    ],
    contexts: [{ name: 'plugin:dsh-tty:terminals', text: '终端面板会话：sid=1' }],
    tools: [
      {
        name: 'docker_ps',
        description: 'list containers',
        parameters: {
          type: 'object',
          properties: {
            all: { type: 'boolean', description: 'include stopped containers' },
            limit: { type: 'number', description: 'page size' },
            filters: {
              type: 'array',
              items: { type: 'string', description: 'filter expression' },
            },
          },
        },
      },
      { name: 'unrelated_tool', description: 'no translation', parameters: { type: 'object', properties: {} } },
    ],
    variables: { language: 'ru' },
  }
}

/** Catalogs for the fixture above: every source string is hashed for real. */
function catalogs() {
  return {
    tools: {
      docker_ps: {
        hash: hashOf('list containers'),
        ru: 'список контейнеров',
        params: {
          'properties.all.description': 'включая остановленные контейнеры',
          'properties.filters.items.description': 'выражение фильтра',
        },
        paramHashes: {
          'properties.all.description': hashOf('include stopped containers'),
          'properties.filters.items.description': hashOf('filter expression'),
        },
      },
    },
    sections: {
      'plugin:dsh-docker': { hash: hashOf('docker guidance'), ru: 'руководство по docker' },
    },
  }
}

/** Mount the plugin over a fake context and return the captured listener. */
function mount(config: Record<string, unknown>): (assembly: FakeAssembly) => Promise<FakeAssembly> {
  let listener: ((assembly: FakeAssembly, context: unknown, next: () => Promise<FakeAssembly>) => Promise<FakeAssembly>) | undefined
  apply({ on(event: string, handler: typeof listener) {
    assert.equal(event, 'system-prompt/assemble')
    listener = handler
  } } as never, config as never)
  assert.ok(listener, 'the plugin must subscribe to system-prompt/assemble')
  return (assembly: FakeAssembly) => listener!(assembly, {}, async () => assembly)
}

/** Run one request through the overlay, collecting warnings. */
async function run(assembly: FakeAssembly, config: Record<string, unknown>): Promise<{ out: FakeAssembly; warnings: string[] }> {
  const warnings: string[] = []
  const original = console.warn
  console.warn = (...args: unknown[]) => { warnings.push(args.map(String).join(' ')) }
  try {
    const out = await mount(config)(structuredClone(assembly))
    return { out, warnings }
  } finally {
    console.warn = original
  }
}

test('mounting without an event bus does not throw', () => {
  assert.doesNotThrow(() => apply())
})

test('no catalog: the assembly comes back untouched', async () => {
  const assembly = fixture()
  const { out } = await run(assembly, { prompt: 'ru', catalogs: { tools: {}, sections: {} } })
  assert.deepEqual(out, assembly)
})

test('hash match: description, nested parameter descriptions, section and context are replaced', async () => {
  const assembly = fixture()
  const { out } = await run(assembly, { prompt: 'ru', catalogs: catalogs() })
  const docker = out.tools.find(tool => tool.name === 'docker_ps')
  assert.equal(docker?.description, 'список контейнеров')
  const parameters = docker?.parameters as { properties: Record<string, { description?: string; items?: { description?: string } }> }
  assert.equal(parameters.properties.all.description, 'включая остановленные контейнеры')
  assert.equal(parameters.properties.filters.items?.description, 'выражение фильтра')
  // A parameter without a catalog entry keeps its source text.
  assert.equal(parameters.properties.limit.description, 'page size')
  assert.equal(out.tools.find(tool => tool.name === 'unrelated_tool')?.description, 'no translation')
  assert.equal(out.sections[0].text, 'руководство по docker')
  assert.equal(out.sections[0].interpolate, false)
  assert.equal(out.sections[1].text, 'leave me alone')
  // The original assembly is not mutated in place.
  assert.equal(assembly.tools[0].description, 'list containers')
})

test('hash mismatch: the source string is kept and a warning is reported', async () => {
  const assembly = fixture()
  assembly.tools[0].description = 'list containers (updated upstream)'
  const stale = catalogs()
  stale.tools.docker_ps.paramHashes['properties.all.description'] = hashOf('was: include stopped containers')
  const { out, warnings } = await run(assembly, { prompt: 'ru', catalogs: stale })
  assert.equal(out.tools[0].description, 'list containers (updated upstream)')
  const parameters = out.tools[0].parameters as { properties: Record<string, { description?: string }> }
  assert.equal(parameters.properties.all.description, 'include stopped containers')
  assert.ok(warnings.some(line => line.includes('changed since the snapshot')), `expected a drift warning, got ${JSON.stringify(warnings)}`)
  // The unaffected parameter of the same tool is still translated.
  assert.equal((out.tools[0].parameters as { properties: Record<string, { description?: string }> }).properties.all.description, 'include stopped containers')
})

test('config.prompt = en: the assembly comes back untouched', async () => {
  const assembly = fixture()
  const { out } = await run(assembly, { prompt: 'en', catalogs: catalogs() })
  assert.deepEqual(out, assembly)
})

test('a throwing listener returns the original assembly instead of failing the request', async () => {
  const assembly = fixture()
  const hostile = {
    get tools(): never {
      throw new Error('catalog exploded')
    },
    sections: {},
  }
  const { out, warnings } = await run(assembly, { prompt: 'ru', catalogs: hostile })
  assert.deepEqual(out, assembly)
  assert.ok(out === assembly || JSON.stringify(out) === JSON.stringify(assembly))
  assert.ok(warnings.some(line => line.includes('catalog exploded')), `expected the failure to be reported, got ${JSON.stringify(warnings)}`)
})

test('dynamic sections are translated fragment by fragment', async () => {
  const assembly = fixture()
  const dynamic = catalogs() as Record<string, unknown>
  dynamic.sections = {
    'plugin:dsh-tty:terminals': {
      fragments: [
        { zh: '终端面板会话：', hash: hashOf('终端面板会话：'), ru: 'Сессии терминала: ' },
        { zh: '会话', hash: hashOf('会话'), ru: 'сессия' },
      ],
    },
  }
  const { out } = await run(assembly, { prompt: 'ru', catalogs: dynamic })
  // `会话` occurs zero times after the longer fragment took its place; the
  // longer fragment is the one that is applied.
  assert.equal(out.contexts[0].text, 'Сессии терминала: sid=1')
  // No section catalog entry for this name: sections stay as they are.
  assert.equal(out.sections[0].text, 'docker guidance')
})

test('a fragment that occurs twice is not replaced', async () => {
  const assembly = fixture()
  assembly.contexts[0].text = '会话: 会话'
  const dynamic = catalogs() as Record<string, unknown>
  dynamic.sections = {
    'plugin:dsh-tty:terminals': {
      fragments: [{ zh: '会话', hash: hashOf('会话'), ru: 'сессия' }],
    },
  }
  const { out, warnings } = await run(assembly, { prompt: 'ru', catalogs: dynamic })
  assert.equal(out.contexts[0].text, '会话: 会话')
  assert.ok(warnings.some(line => line.includes('occurs more than once')), `expected an ambiguity warning, got ${JSON.stringify(warnings)}`)
})

test('the bundled catalogs are a well-formed translation contract', () => {
  const tools = JSON.parse(readFileSync(new URL('../src/host/ru/tools.json', import.meta.url), 'utf8')) as {
    tools?: Record<string, { hash?: string; ru?: string; params?: Record<string, string>; paramHashes?: Record<string, string> }>
  }
  const prompt = JSON.parse(readFileSync(new URL('../src/host/ru/prompt.json', import.meta.url), 'utf8')) as {
    sections?: Record<string, { hash?: string; ru?: string; fragments?: { zh?: string; hash?: string; ru?: string }[] }>
  }
  assert.equal(typeof tools, 'object')
  assert.equal(typeof prompt, 'object')
  for (const [toolName, entry] of Object.entries(tools.tools ?? {})) {
    assert.match(entry.hash ?? '', /^[0-9a-f]{40}$/, `${toolName}: hash must be a sha1 hex`)
    assert.equal(typeof entry.ru, 'string', `${toolName}: ru must be a string`)
    const params = entry.params ?? {}
    const hashes = entry.paramHashes ?? {}
    assert.deepEqual(Object.keys(params).sort(), Object.keys(hashes).sort(), `${toolName}: params and paramHashes must address the same paths`)
    for (const [path, hash] of Object.entries(hashes)) assert.match(hash, /^[0-9a-f]{40}$/, `${toolName} ${path}: hash must be a sha1 hex`)
  }
  for (const [sectionName, entry] of Object.entries(prompt.sections ?? {})) {
    if (entry.fragments !== undefined) {
      for (const fragment of entry.fragments) {
        assert.equal(typeof fragment.zh, 'string', `${sectionName}: a fragment needs its source text`)
        assert.match(fragment.hash ?? '', /^[0-9a-f]{40}$/, `${sectionName}: fragment hash must be a sha1 hex`)
        assert.equal(typeof fragment.ru, 'string', `${sectionName}: a fragment needs its translation`)
      }
      continue
    }
    assert.match(entry.hash ?? '', /^[0-9a-f]{40}$/, `${sectionName}: hash must be a sha1 hex`)
    assert.equal(typeof entry.ru, 'string', `${sectionName}: ru must be a string`)
  }
})

/** Han characters: a Russian translation must not keep any. */
const HAN = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/

test('the ru catalogs cover the snapshot (strict once they are filled)', (t) => {
  const snapshot = JSON.parse(readFileSync(new URL('../catalogs/host/tools.json', import.meta.url), 'utf8')) as {
    tools: Record<string, { hash: string; params?: Record<string, string>; paramHashes?: Record<string, string> }>
  }
  const prompt = JSON.parse(readFileSync(new URL('../catalogs/host/prompt.json', import.meta.url), 'utf8')) as {
    sections: Record<string, { zh: string | null; hash: string | null; dynamic?: boolean; fragments?: { zh: string; hash: string }[] }>
  }
  const ruTools = (JSON.parse(readFileSync(new URL('../src/host/ru/tools.json', import.meta.url), 'utf8')) as {
    tools?: Record<string, { hash: string; ru: string; params?: Record<string, string>; paramHashes?: Record<string, string> }>
  }).tools ?? {}
  const ruSections = (JSON.parse(readFileSync(new URL('../src/host/ru/prompt.json', import.meta.url), 'utf8')) as {
    sections?: Record<string, { hash?: string; ru?: string; fragments?: { zh: string; hash: string; ru: string }[] }>
  }).sections ?? {}

  assert.equal(Object.keys(snapshot.tools).length, 49, 'the reviewed matrix is 49 tools')
  assert.equal(
    Object.values(snapshot.tools).reduce((total, tool) => total + Object.keys(tool.params ?? {}).length, 0),
    153,
    'the reviewed matrix is 153 parameter descriptions',
  )
  if (Object.keys(ruTools).length === 0) {
    t.skip('src/host/ru/tools.json is empty — the host translations are not written yet')
    return
  }
  assert.deepEqual(
    Object.keys(ruTools).sort(),
    Object.keys(snapshot.tools).sort(),
    'every snapshotted tool needs exactly one translation',
  )
  for (const [toolName, entry] of Object.entries(ruTools)) {
    const source = snapshot.tools[toolName]
    assert.equal(entry.hash, source.hash, `${toolName}: the hash must be copied from the snapshot verbatim`)
    assert.deepEqual(
      Object.keys(entry.params ?? {}).sort(),
      Object.keys(source.params ?? {}).sort(),
      `${toolName}: every parameter description of the snapshot needs a translation`,
    )
    for (const [path, hash] of Object.entries(entry.paramHashes ?? {})) {
      assert.equal(hash, source.paramHashes?.[path], `${toolName} ${path}: the hash must be copied from the snapshot verbatim`)
    }
    assert.ok(!HAN.test(entry.ru), `${toolName}: the translation still has Chinese characters`)
    for (const [path, ru] of Object.entries(entry.params ?? {})) {
      assert.ok(!HAN.test(ru), `${toolName} ${path}: the translation still has Chinese characters`)
    }
  }
  for (const [sectionName, source] of Object.entries(prompt.sections)) {
    const entry = ruSections[sectionName]
    if (source.dynamic === true) {
      if (entry === undefined) continue
      assert.ok(Array.isArray(entry.fragments) && entry.fragments.length > 0, `${sectionName}: a dynamic section is translated by fragments`)
      for (const fragment of entry.fragments ?? []) {
        const snapshotFragment = source.fragments?.find(candidate => candidate.zh === fragment.zh)
        assert.ok(snapshotFragment !== undefined, `${sectionName}: fragment ${JSON.stringify(fragment.zh)} is not in the snapshot`)
        assert.equal(fragment.hash, snapshotFragment?.hash, `${sectionName}: the fragment hash must be copied from the snapshot verbatim`)
        assert.ok(!HAN.test(fragment.ru), `${sectionName}: a fragment translation still has Chinese characters`)
      }
      continue
    }
    assert.ok(entry !== undefined, `${sectionName}: a static section needs a translation`)
    assert.equal(entry.hash, source.hash, `${sectionName}: the hash must be copied from the snapshot verbatim`)
    assert.ok(!HAN.test(entry.ru ?? ''), `${sectionName}: the translation still has Chinese characters`)
  }
  t.diagnostic(`tools: ${String(Object.keys(ruTools).length)}/${String(Object.keys(snapshot.tools).length)}, sections: ${String(Object.keys(ruSections).length)}/${String(Object.keys(prompt.sections).length)}`)
})

/**
 * Build a JSON Schema whose `description` leaves sit at exactly the given
 * paths, so the extractor's path syntax and the overlay's walker are tested
 * against each other.
 */
function schemaFromPaths(paths: string[]): Record<string, unknown> {
  const root: Record<string, any> = { type: 'object', properties: {} }
  for (const path of paths) {
    const segments = path.split('.')
    let node = root
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]
      if (segment === 'description') {
        node.description = `zh:${path}`
        break
      }
      if (segment === 'properties') {
        const propertyName = segments[index + 1]
        node.properties ??= {}
        node.properties[propertyName] ??= { type: 'object' }
        node = node.properties[propertyName]
        index += 1
        continue
      }
      if (segment === 'items') {
        node.items ??= { type: 'array' }
        node = node.items
        continue
      }
      if (segment === 'oneOf' || segment === 'anyOf' || segment === 'allOf') {
        const branch = Number(segments[index + 1])
        node[segment] ??= []
        node[segment][branch] ??= { type: 'string' }
        node = node[segment][branch]
        index += 1
        continue
      }
      throw new Error(`unexpected schema path segment ${JSON.stringify(segment)} in ${path}`)
    }
  }
  return root
}

test('every path of the snapshot is addressable by the overlay', async () => {
  const snapshot = JSON.parse(readFileSync(new URL('../catalogs/host/tools.json', import.meta.url), 'utf8')) as {
    tools: Record<string, { zh: string; hash: string; params?: Record<string, string>; paramHashes?: Record<string, string> }>
  }
  const tools = Object.entries(snapshot.tools).map(([toolName, entry]) => ({
    name: toolName,
    description: entry.zh,
    parameters: schemaFromPaths(Object.keys(entry.params ?? {})),
  }))
  // Identity translations: what the overlay is expected to substitute is the
  // source string prefixed, so a path the walker does not reach stays visible.
  const translations = {
    tools: Object.fromEntries(Object.entries(snapshot.tools).map(([toolName, entry]) => [toolName, {
      hash: entry.hash,
      ru: `ru:${toolName}`,
      params: Object.fromEntries(Object.keys(entry.params ?? {}).map(path => [path, `ru:${path}`])),
      // The synthetic schema carries `zh:<path>` as its description, so the
      // hash is derived from that text, not from the real snapshot value.
      paramHashes: Object.fromEntries(Object.keys(entry.params ?? {}).map(path => [path, hashOf(`zh:${path}`)])),
    }])),
    sections: {},
  }
  const { out, warnings } = await run({ sections: [], contexts: [], tools, variables: {} }, { prompt: 'ru', catalogs: translations })
  assert.deepEqual(warnings, [], `the snapshot must match itself, got ${JSON.stringify(warnings)}`)
  for (const tool of out.tools as { name: string; description: string; parameters: Record<string, any> }[]) {
    assert.equal(tool.description, `ru:${tool.name}`, `${tool.name}: description path was not replaced`)
    const descriptions: string[] = []
    const collect = (node: unknown): void => {
      if (Array.isArray(node)) {
        node.forEach(collect)
        return
      }
      if (node === null || typeof node !== 'object') return
      const holder = node as Record<string, any>
      if (typeof holder.description === 'string') descriptions.push(holder.description)
      if (holder.items !== undefined) collect(holder.items)
      if (holder.properties !== undefined) Object.values(holder.properties).forEach(collect)
      for (const keyword of ['oneOf', 'anyOf', 'allOf']) if (Array.isArray(holder[keyword])) holder[keyword].forEach(collect)
    }
    collect(tool.parameters)
    assert.ok(descriptions.every(text => text.startsWith('ru:')), `${tool.name}: an unreached parameter path stays in the source text: ${JSON.stringify(descriptions.filter(text => !text.startsWith('ru:')))}`)
  }
})

test('every fragment of the snapshot is addressable by the overlay', async () => {
  const snapshot = JSON.parse(readFileSync(new URL('../catalogs/host/prompt.json', import.meta.url), 'utf8')) as {
    sections: Record<string, { fragments?: { zh: string; hash: string }[] }>
  }
  const dynamic = Object.entries(snapshot.sections).filter(([, entry]) => (entry.fragments ?? []).length > 0)
  assert.ok(dynamic.length > 0, 'the snapshot must contain at least one dynamic section with fragments')
  // One request per fragment: fragments of one section may overlap (alternative
  // phrasings of the same sentence), so they are verified in isolation.
  let checked = 0
  for (const [sectionName, entry] of dynamic) {
    for (const [index, fragment] of (entry.fragments ?? []).entries()) {
      const marker = `⁣${String(index)}⁣`
      const translated = `ru:${sectionName}:${String(index)}`
      const { out, warnings } = await run(
        { sections: [{ name: sectionName, text: `before${fragment.zh}after` }], contexts: [], tools: [], variables: {} },
        {
          prompt: 'ru',
          catalogs: { tools: {}, sections: { [sectionName]: { fragments: [{ zh: fragment.zh, hash: fragment.hash, ru: translated }] } } },
        },
      )
      assert.deepEqual(warnings, [], `${sectionName}: the snapshot must match itself, got ${JSON.stringify(warnings)}`)
      assert.equal(out.sections[0].text, `before${translated}after`, `${sectionName}: fragment ${String(index)} was not replaced (${marker})`)
      checked += 1
    }
  }
  assert.ok(checked > 0)
})

test('the snapshot covers 49 tools, including the loop-generated tunnel tools', async () => {
  const snapshot = JSON.parse(readFileSync(new URL('../catalogs/host/tools.json', import.meta.url), 'utf8')) as {
    counts: { tools: number; parameters: number }
    tools: Record<string, { plugin: string; zh: string; hash: string; params?: Record<string, string>; paramHashes?: Record<string, string> }>
  }
  const names = Object.keys(snapshot.tools)
  assert.equal(names.length, 49)
  assert.equal(snapshot.counts.tools, 49)
  assert.equal(snapshot.counts.parameters, 153)
  assert.equal(
    names.reduce((total, name) => total + Object.keys(snapshot.tools[name].params ?? {}).length, 0),
    153,
  )
  // The two tools registered from `for (const [toolName, enable, verb] of [...])`
  // have no literal `name:` in the bundle; the extractor materializes the loop
  // tuple, so both the name and the `${verb}` description hole must be concrete.
  for (const [toolName, verb] of [['tunnel_start', '启动'], ['tunnel_stop', '停止']] as const) {
    const entry = snapshot.tools[toolName]
    assert.ok(entry !== undefined, `${toolName} must be extracted from the registration loop`)
    assert.equal(entry.plugin, '@hyzyn/dsh-tty')
    assert.ok(
      entry.zh.startsWith(`${verb}一条端口转发隧道`),
      `${toolName}: the template hole must be materialized, got ${JSON.stringify(entry.zh.slice(0, 24))}`,
    )
    assert.deepEqual(Object.keys(entry.params ?? {}), ['properties.name.description'])
    assert.equal(entry.hash, hashOf(entry.zh))
    assert.equal(entry.paramHashes?.['properties.name.description'], hashOf(entry.params?.['properties.name.description'] ?? ''))
  }
  // The `name` parameter of a loop-generated tool is addressed like any other.
  for (const toolName of ['tunnel_start', 'tunnel_stop'] as const) {
    const entry = snapshot.tools[toolName]
    const { out, warnings } = await run(
      { sections: [], contexts: [], tools: [{ name: toolName, description: entry.zh, parameters: schemaFromPaths(Object.keys(entry.params ?? {})) }], variables: {} },
      {
        prompt: 'ru',
        catalogs: {
          tools: {
            [toolName]: {
              hash: entry.hash,
              ru: `ru:${toolName}`,
              params: { 'properties.name.description': 'ru:name' },
              paramHashes: { 'properties.name.description': hashOf('zh:properties.name.description') },
            },
          },
          sections: {},
        },
      },
    )
    assert.deepEqual(warnings, [], `${toolName}: the snapshot must match itself, got ${JSON.stringify(warnings)}`)
    assert.equal(out.tools[0].description, `ru:${toolName}`)
    const parameters = out.tools[0].parameters as { properties: Record<string, { description?: string }> }
    assert.equal(parameters.properties.name.description, 'ru:name', `${toolName}: its name parameter must be addressable`)
  }
})
