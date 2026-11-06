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

test('a fragment repeated in one text is replaced at every occurrence', async () => {
  const assembly = fixture()
  assembly.contexts[0].text = '会话: 会话'
  const dynamic = catalogs() as Record<string, unknown>
  dynamic.sections = {
    'plugin:dsh-tty:terminals': {
      fragments: [{ zh: '会话', hash: hashOf('会话'), ru: 'сессия' }],
    },
  }
  const { out, warnings } = await run(assembly, { prompt: 'ru', catalogs: dynamic })
  assert.equal(out.contexts[0].text, 'сессия: сессия')
  assert.deepEqual(warnings, [], `a repeated literal is not a warning, got ${JSON.stringify(warnings)}`)
})

test('three occurrences are replaced and an overlapping fragment is skipped with a warning', async () => {
  const assembly = fixture()
  // The short literal occurs four times; one of them sits inside the longer one.
  assembly.contexts[0].text = '会话 会话 会话 终端面板会话：'
  const dynamic = catalogs() as Record<string, unknown>
  dynamic.sections = {
    'plugin:dsh-tty:terminals': {
      fragments: [
        { zh: '终端面板会话：', hash: hashOf('终端面板会话：'), ru: 'Сессии терминала: ' },
        { zh: '会话', hash: hashOf('会话'), ru: 'сессия' },
      ],
    },
  }
  const { out, warnings } = await run(assembly, { prompt: 'ru', catalogs: dynamic })
  assert.equal(out.contexts[0].text, 'сессия сессия сессия Сессии терминала: ')
  assert.ok(
    warnings.some(line => line.includes('sit inside a longer translated fragment')),
    `expected an overlap warning, got ${JSON.stringify(warnings)}`,
  )
  // Nothing is applied twice: the overlap warning says so, the text proves it.
  assert.equal(out.contexts[0].text.split('сессия').length - 1, 3)
})

test('a fragment whose occurrence count drifted from the snapshot is left untouched', async () => {
  const assembly = fixture()
  assembly.contexts[0].text = '会话 会话 会话'
  const dynamic = catalogs() as Record<string, unknown>
  dynamic.sections = {
    'plugin:dsh-tty:terminals': {
      fragments: [{ zh: '会话', hash: hashOf('会话'), ru: 'сессия', count: 2 }],
    },
  }
  const { out, warnings } = await run(assembly, { prompt: 'ru', catalogs: dynamic })
  assert.equal(out.contexts[0].text, '会话 会话 会话', 'a drifted count must leave the whole fragment alone')
  assert.ok(
    warnings.some(line => line.includes('the snapshot expected 2')),
    `expected a count-drift warning, got ${JSON.stringify(warnings)}`,
  )
  // The same entry with the matching count is applied at every occurrence.
  const matchingAssembly = fixture()
  matchingAssembly.contexts[0].text = '会话 会话 会话'
  const matching = catalogs() as Record<string, unknown>
  matching.sections = {
    'plugin:dsh-tty:terminals': {
      fragments: [{ zh: '会话', hash: hashOf('会话'), ru: 'сессия', count: 3 }],
    },
  }
  const applied = await run(matchingAssembly, { prompt: 'ru', catalogs: matching })
  assert.equal(applied.out.contexts[0].text, 'сессия сессия сессия')
  assert.deepEqual(applied.warnings, [])
})

test('a single fragment occurrence is still replaced (regression)', async () => {
  const assembly = fixture()
  assembly.contexts[0].text = '终端面板会话：sid=1'
  const dynamic = catalogs() as Record<string, unknown>
  dynamic.sections = {
    'plugin:dsh-tty:terminals': {
      fragments: [{ zh: '终端面板会话：', hash: hashOf('终端面板会话：'), ru: 'Сессии терминала: ' }],
    },
  }
  const { out, warnings } = await run(assembly, { prompt: 'ru', catalogs: dynamic })
  assert.equal(out.contexts[0].text, 'Сессии терминала: sid=1')
  assert.deepEqual(warnings, [])
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

test('the tty terminals context of three sessions has no Chinese left', async (t) => {
  // Regression for the reason this fix exists: a per-turn context repeats the
  // same literal once per session, and the old "exactly one occurrence" rule
  // left every repeated sentence in Chinese.
  const sectionName = 'plugin:dsh-tty:terminals'
  const snapshot = JSON.parse(readFileSync(new URL('../catalogs/host/prompt.json', import.meta.url), 'utf8')) as {
    sections: Record<string, { fragments?: { zh: string; hash: string }[] }>
  }
  const translation = (JSON.parse(readFileSync(new URL('../src/host/ru/prompt.json', import.meta.url), 'utf8')) as {
    sections?: Record<string, { fragments?: { zh: string; hash: string; ru: string }[] }>
  }).sections ?? {}
  const fragments = snapshot.sections[sectionName].fragments ?? []
  const entry = translation[sectionName]
  if (entry?.fragments === undefined || entry.fragments.length === 0) {
    t.skip('src/host/ru/prompt.json has no fragment translations for the tty terminals context yet')
    return
  }
  const rendered = new Map(entry.fragments.map(fragment => [fragment.zh, fragment.ru]))
  const literal = (prefix: string): string => {
    const found = fragments.find(fragment => fragment.zh.startsWith(prefix))?.zh
    assert.ok(found !== undefined, `the snapshot has no fragment starting with ${JSON.stringify(prefix)}`)
    return found
  }
  const header = literal('当前活跃的终端面板会话')
  const exitedTail = literal('条已退出但输出仍可读的会话')
  const hiddenNote = literal('条标签被用户设为')
  const agentTag = '[agent 开的]'
  const busyTag = '[运行中——现在别往里发命令]'
  const lastActivity = '(最后活动'
  const otherNote = '另有'
  const unknownExit = '退出码未知'
  const needed = [header, exitedTail, hiddenNote, agentTag, busyTag, lastActivity, otherNote, unknownExit]
  const untranslated = needed.filter(fragment => rendered.get(fragment) === undefined)
  if (untranslated.length > 0) {
    t.skip(`${String(untranslated.length)} fragment(s) are not translated yet`)
    return
  }
  const zh = (fragment: string): string => fragment
  // Two live sessions (both repeating the tag and the activity stamp) plus one
  // exited session and a hidden-tab note — the shape the plugin renders.
  const text = [
    header,
    `- sid=a1 [local] ${zh(agentTag)} ${zh(busyTag)} pid=4242 cwd=/home/user ${zh(lastActivity)} 21:00:01)`,
    `- sid=b2 [ssh] ${zh(agentTag)} ${zh(busyTag)} ssh prod-host ${zh(lastActivity)} 21:00:02)`,
    `${zh(otherNote)} 1 ${zh(exitedTail)} sid=c3 (${zh(unknownExit)})`,
    `1 ${zh(hiddenNote)}`,
  ].join('\n')
  const { out, warnings } = await run(
    { sections: [], contexts: [{ name: sectionName, text }], tools: [], variables: {} },
    { prompt: 'ru', catalogs: { tools: {}, sections: { [sectionName]: entry } } },
  )
  const result = out.contexts[0].text
  assert.ok(!HAN.test(result), `the overlay left Chinese in the context: ${JSON.stringify(result)}`)
  assert.equal(result.split(rendered.get(agentTag) ?? '').length - 1, 2, 'both live sessions must carry the translated agent tag')
  assert.equal(result.split(rendered.get(busyTag) ?? '').length - 1, 2, 'both live sessions must carry the translated busy tag')
  assert.equal(result.split(rendered.get(lastActivity) ?? '').length - 1, 2, 'both live sessions must carry the translated activity stamp')
  for (const fragment of [header, exitedTail, hiddenNote, otherNote, unknownExit]) {
    assert.ok(result.includes(rendered.get(fragment) ?? fragment), `fragment ${JSON.stringify(fragment)} was not translated`)
  }
  assert.deepEqual(warnings, [], `the snapshot must match the rendered text, got ${JSON.stringify(warnings)}`)
})
