/**
 * Batch-translate the snapshotted plugin catalogs into Russian with a local
 * OpenAI-compatible model (llama.cpp + ornith-9b by default).
 *
 * Source of truth is the English dictionary; the Chinese dictionary is passed
 * along as context only. Every response is validated before it can reach the
 * cache (valid JSON object, exact key set, non-empty strings, identical `{x}`
 * placeholder multiset, no CJK), and a failed batch is retried in halves so one
 * bad string cannot poison its neighbours. Successful keys are cached on disk,
 * so a rerun resumes instead of paying for the same translation twice.
 *
 * Usage:
 *   node scripts/translate.mjs --catalogs catalogs/plugins \
 *     --out .cache/translations/plugins --base-url http://127.0.0.1:8080/v1 \
 *     --model ornith-9b --batch 8 --max-tokens 4096 [--only ns[,ns]] [--limit N]
 *
 * The report (`{translated,cached,failed,requests,elapsedMs,...}`) goes to
 * stdout and to `<out>/report.json`; progress and warnings go to stderr.
 *
 * Short batches ask the model to skip its chain of thought
 * (`chat_template_kwargs.enable_thinking = false`): ordinary UI labels need no
 * reasoning and the answer costs ~30 output tokens instead of ~1000. A batch
 * only takes that fast path when every entry is short (en and zh under 80
 * characters, en+zh under 160), because long strings are visibly better with
 * the model's own reasoning left on. Those reasoning batches get an output
 * budget that scales with the batch size (reasoning can eat thousands of
 * tokens), and a single entry that still yields no JSON is retried once with
 * reasoning off before it is reported as a failure.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPOSITORY_ROOT = fileURLToPath(new URL('../', import.meta.url))
const SYSTEM_PROMPT = 'You are a translation function. Do not explain. Do not think out loud. Reply with the JSON object only.'
const PLACEHOLDER = /\{(\w+)\}/g

/** CJK characters, kana and fullwidth forms that must never appear in a ru value. */
const CJK = /[\u2E80-\u2EFF\u3000-\u303F\u3040-\u30FF\u3100-\u312F\u31A0-\u31BF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF]/

/** Object keys a model may use when it wraps a string into an object. */
const TRANSLATION_KEYS = ['ru', 'translation', 'text', 'value']

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

/** Positive integer option with a default. */
function integerOption(options, name, fallback) {
  if (options[name] === undefined) return fallback
  const value = Number(options[name])
  if (!Number.isInteger(value) || value <= 0) throw new Error(`--${name} must be a positive integer`)
  return value
}

/** Sorted `{x}` placeholder multiset, serialised for exact comparison. */
function placeholders(template) {
  return [...template.matchAll(PLACEHOLDER)].map(match => match[0]).sort().join('\0')
}

/** Short content hash of an English source string, used to invalidate stale cache entries. */
function sourceHash(text) {
  return createHash('sha1').update(text).digest('hex').slice(0, 16)
}

/** Accept a plain string or the common `{"ru": "..."}` wrapper models emit. */
function coerceTranslation(value) {
  if (typeof value === 'string') return value
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const keys = Object.keys(value)
  if (keys.length !== 1 || !TRANSLATION_KEYS.includes(keys[0])) return undefined
  return typeof value[keys[0]] === 'string' ? value[keys[0]] : undefined
}

/**
 * Slice the first balanced `{...}` object out of a model answer, skipping
 * string literals so braces inside strings cannot break the balance. Models
 * wrap answers in ```json fences or add prose; both are tolerated here.
 */
function firstJsonObject(text) {
  const start = text.indexOf('{')
  if (start === -1) throw new Error('response contains no JSON object')
  let depth = 0
  for (let index = start; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      index += 1
      while (index < text.length) {
        if (text[index] === '\\') {
          index += 2
          continue
        }
        if (text[index] === '"') break
        index += 1
      }
      continue
    }
    if (character === '{') depth += 1
    else if (character === '}') {
      depth -= 1
      if (depth === 0) return text.slice(start, index + 1)
    }
  }
  throw new Error('response JSON object is not closed')
}

/** Validate one batch answer against the requested entries and return ru strings. */
function validateAnswer(entries, answer) {
  if (answer === null || typeof answer !== 'object' || Array.isArray(answer)) {
    throw new Error('response is not a JSON object')
  }
  const requested = entries.map(entry => entry.key)
  const extra = Object.keys(answer).filter(key => !requested.includes(key))
  const missing = requested.filter(key => !(key in answer))
  if (missing.length > 0) throw new Error(`missing keys: ${missing.slice(0, 5).join(', ')}`)
  if (extra.length > 0) throw new Error(`unexpected keys: ${extra.slice(0, 5).join(', ')}`)
  const translations = {}
  for (const entry of entries) {
    const value = coerceTranslation(answer[entry.key])
    if (value === undefined) throw new Error(`${entry.key}: translation is not a string`)
    if (value.trim() === '') throw new Error(`${entry.key}: translation is empty`)
    if (CJK.test(value)) throw new Error(`${entry.key}: translation contains CJK characters`)
    const expected = placeholders(entry.en)
    const actual = placeholders(value)
    if (expected !== actual) {
      throw new Error(`${entry.key}: placeholders differ (${JSON.stringify(actual)} != ${JSON.stringify(expected)})`)
    }
    translations[entry.key] = value
  }
  return translations
}

/** Build the user prompt for one batch. */
function buildPrompt(entries, glossary) {
  const input = Object.fromEntries(entries.map(entry => [entry.key, { en: entry.en, zh: entry.zh }]))
  const terms = Object.entries(glossary.terms ?? {}).map(([term, translation]) => `${term} → ${translation}`)
  return [
    'Translate UI strings from English to Russian for the DeepSeek Harness interface.',
    '',
    'Rules:',
    '- Reply with one flat JSON object: each key maps to a Russian string (never a nested object).',
    '- Keep every placeholder exactly as in the source: {name}, {0}, {count}.',
    `- Keep these tokens unchanged: ${(glossary.keep ?? []).join(', ')}.`,
    `- Use the glossary: ${terms.join('; ')}.`,
    '- The Chinese text is context only: never translate or copy it into the answer.',
    '- Keep the short, neutral UI register.',
    '',
    'Example input: {"greeting":{"en":"Hello","zh":"你好"}}',
    'Example output: {"greeting":"Привет"}',
    '',
    'Input JSON:',
    JSON.stringify(input),
  ].join('\n')
}

/** Longest single source string that still qualifies for the fast path. */
const FAST_PATH_STRING_LIMIT = 80
/** Longest en+zh pair that still qualifies for the fast path. */
const FAST_PATH_PAIR_LIMIT = 160

/**
 * Whether a batch may skip the model's chain of thought. Short UI labels are
 * translated just as well without it and cost a fraction of the tokens; long
 * strings keep reasoning on because quality drops without it.
 */
function isShortBatch(entries) {
  let total = 0
  for (const entry of entries) {
    if (entry.en.length >= FAST_PATH_STRING_LIMIT || entry.zh.length >= FAST_PATH_STRING_LIMIT) return false
    total += entry.en.length + entry.zh.length
  }
  return total < FAST_PATH_PAIR_LIMIT
}

/** Hard ceiling for one completion, well inside the server's 65k context. */
const MAX_OUTPUT_TOKENS = 32768
/** Reasoning budget per entry for batches that keep thinking on. */
const REASONING_TOKENS_PER_ENTRY = 2048

/**
 * Output budget for one request: the configured `--max-tokens` for fast
 * batches, and a per-entry reasoning allowance for batches that keep thinking
 * on so long strings cannot be cut off mid-JSON.
 */
function outputBudget(context, entries, fast) {
  if (fast) return context.maxTokens
  return Math.min(MAX_OUTPUT_TOKENS, Math.max(context.maxTokens, REASONING_TOKENS_PER_ENTRY * entries.length))
}

/** Read the glossary, requiring the reviewed baseline. */
async function readGlossary(path) {
  const glossary = JSON.parse(await readFile(path, 'utf8'))
  if (glossary === null || typeof glossary !== 'object' || typeof glossary.terms !== 'object') {
    throw new Error(`${path}: glossary must be an object with a "terms" map`)
  }
  return glossary
}

/** One chat-completion request; returns the raw answer object. */
async function requestTranslations(context, entries, { forceThinkingOff = false } = {}) {
  context.report.requests += 1
  const endpoint = `${context.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const fast = forceThinkingOff || isShortBatch(entries)
  if (fast) context.report.requestsThinkingOff += 1
  else context.report.requestsThinkingOn += 1
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal: AbortSignal.timeout(context.timeout),
    body: JSON.stringify({
      model: context.model,
      temperature: context.temperature,
      max_tokens: outputBudget(context, entries, fast),
      stream: false,
      response_format: { type: 'json_object' },
      ...(fast ? { chat_template_kwargs: { enable_thinking: false } } : {}),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(entries, context.glossary) },
      ],
    }),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`HTTP ${response.status} from ${endpoint}: ${body.slice(0, 200)}`)
  }
  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content ?? payload?.choices?.[0]?.text
  if (typeof content !== 'string') throw new Error('response has no assistant content')
  return JSON.parse(firstJsonObject(content))
}

/**
 * Translate a batch, splitting it in halves on any failure so a single bad
 * entry cannot take its neighbours down. A one-entry batch that still fails is
 * recorded in `report.failures` instead of throwing.
 */
async function translateBatch(context, entries) {
  if (entries.length === 0) return
  try {
    const translations = validateAnswer(entries, await requestTranslations(context, entries))
    for (const [key, value] of Object.entries(translations)) context.resolved.set(key, value)
    context.report.translated += entries.length
    await writeCache(context)
  } catch (error) {
    if (entries.length > 1) {
      const middle = Math.ceil(entries.length / 2)
      console.warn(`warning: ${context.ns}: batch of ${entries.length} failed (${error.message}); retrying in halves`)
      await translateBatch(context, entries.slice(0, middle))
      await translateBatch(context, entries.slice(middle))
      return
    }
    const entry = entries[0]
    try {
      const translations = validateAnswer(entries, await requestTranslations(context, entries, { forceThinkingOff: true }))
      for (const [key, value] of Object.entries(translations)) context.resolved.set(key, value)
      context.report.translated += entries.length
      await writeCache(context)
      console.warn(`warning: ${context.ns}:${entry.key} needed the thinking-off fallback`)
      return
    } catch (fallbackError) {
      context.report.failed += 1
      context.report.failures.push({
        ns: context.ns,
        key: entry.key,
        reason: `${error.message}; thinking-off retry: ${fallbackError.message}`,
      })
      console.warn(`warning: ${context.ns}:${entry.key} failed: ${error.message}; fallback: ${fallbackError.message}`)
    }
  }
}

/** Persist the resolved part of the ru dictionary plus source hashes so a rerun resumes. */
async function writeCache(context) {
  const ru = {}
  const hashes = {}
  for (const key of Object.keys(context.catalog.en)) {
    if (!context.resolved.has(key)) continue
    ru[key] = context.resolved.get(key)
    hashes[key] = sourceHash(context.catalog.en[key])
  }
  const sorted = Object.fromEntries(Object.keys(ru).sort().map(key => [key, ru[key]]))
  const sortedHashes = Object.fromEntries(Object.keys(hashes).sort().map(key => [key, hashes[key]]))
  await writeFile(context.cachePath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')
  await writeFile(context.metaPath, `${JSON.stringify({
    package: context.catalog.package,
    version: context.catalog.version,
    model: context.model,
    hashes: sortedHashes,
  }, null, 2)}\n`, 'utf8')
}

/** A cached value is reusable only if it passes the same checks as a fresh one. */
function isReusable(value, entry) {
  if (typeof value !== 'string' || value.trim() === '') return false
  if (CJK.test(value)) return false
  return placeholders(value) === placeholders(entry.en)
}

/** Translate one catalog, resuming from its cache file. */
async function translateCatalog(context, catalog) {
  const catalogContext = {
    ...context,
    catalog,
    ns: catalog.ns,
    cachePath: join(context.outDirectory, `${catalog.ns}.json`),
    metaPath: join(context.outDirectory, `${catalog.ns}.meta.json`),
    resolved: new Map(),
  }
  const cached = JSON.parse(await readFile(catalogContext.cachePath, 'utf8').catch(() => '{}'))
  const meta = JSON.parse(await readFile(catalogContext.metaPath, 'utf8').catch(() => 'null'))
  const hashes = typeof meta?.hashes === 'object' && meta.hashes !== null ? meta.hashes : undefined
  const pending = []
  let cachedCount = 0
  let skipped = 0
  for (const [key, en] of Object.entries(catalog.en)) {
    if (en.trim() === '') {
      // Nothing to translate: the source itself is empty (zh is empty too).
      catalogContext.resolved.set(key, '')
      skipped += 1
      continue
    }
    const entry = { key, en, zh: catalog.zh[key] ?? '' }
    const fresh = hashes === undefined || hashes[key] === sourceHash(en)
    if (fresh && isReusable(cached[key], entry)) {
      catalogContext.resolved.set(key, cached[key])
      cachedCount += 1
      continue
    }
    pending.push(entry)
  }
  const limited = context.limit === undefined ? pending : pending.slice(0, context.limit)
  context.report.cached += cachedCount
  context.report.skipped += skipped
  if (limited.length < pending.length) {
    console.warn(`warning: ${catalog.ns}: --limit keeps ${limited.length} of ${pending.length} pending keys`)
  }
  const translatedBefore = context.report.translated
  for (let index = 0; index < limited.length; index += context.batch) {
    await translateBatch(catalogContext, limited.slice(index, index + context.batch))
  }
  await writeCache(catalogContext)
  const translated = context.report.translated - translatedBefore
  context.report.catalogs.push({
    ns: catalog.ns,
    translated,
    cached: cachedCount,
    skipped,
    failed: context.report.failures.filter(failure => failure.ns === catalog.ns).length,
    pending: pending.length,
  })
  console.error(`${catalog.ns}: ${translated} translated, ${cachedCount} cached, ${skipped} empty-source`)
}

const options = parseArguments(process.argv.slice(2))
const catalogDirectory = resolve(REPOSITORY_ROOT, options.catalogs ?? 'catalogs/plugins')
const outDirectory = resolve(REPOSITORY_ROOT, options.out ?? '.cache/translations/plugins')
const glossaryPath = resolve(REPOSITORY_ROOT, options.glossary ?? 'catalogs/glossary.ru.json')
const baseUrl = options['base-url'] ?? 'http://127.0.0.1:8080/v1'
const model = options.model ?? 'ornith-9b'
const batch = integerOption(options, 'batch', 8)
const maxTokens = integerOption(options, 'max-tokens', 4096)
const timeout = integerOption(options, 'timeout', 180_000)
const limit = options.limit === undefined ? undefined : integerOption(options, 'limit', Number.POSITIVE_INFINITY)
const temperature = options.temperature === undefined ? 0 : Number(options.temperature)
if (!Number.isFinite(temperature) || temperature < 0) throw new Error('--temperature must be a non-negative number')

const only = options.only === undefined
  ? undefined
  : new Set(options.only.split(',').map(value => value.trim()).filter(Boolean))

const started = Date.now()
await mkdir(outDirectory, { recursive: true })
const glossary = await readGlossary(glossaryPath)
const context = {
  baseUrl,
  model,
  maxTokens,
  timeout,
  temperature,
  batch,
  limit,
  glossary,
  outDirectory,
  report: {
    translated: 0,
    cached: 0,
    failed: 0,
    skipped: 0,
    requests: 0,
    requestsThinkingOff: 0,
    requestsThinkingOn: 0,
    elapsedMs: 0,
    catalogs: [],
    failures: [],
  },
}

const files = (await readdir(catalogDirectory)).filter(file => file.endsWith('.json')).sort()
for (const file of files) {
  const catalog = JSON.parse(await readFile(join(catalogDirectory, file), 'utf8'))
  if (typeof catalog.ns !== 'string' || typeof catalog.en !== 'object' || typeof catalog.zh !== 'object') {
    throw new Error(`${file}: not a plugin catalog snapshot`)
  }
  if (only !== undefined && !only.has(catalog.ns)) continue
  await translateCatalog(context, catalog)
}
if (only !== undefined && context.report.catalogs.length === 0) {
  throw new Error(`--only ${[...only].join(',')}: no matching catalog in ${catalogDirectory}`)
}

context.report.elapsedMs = Date.now() - started
const report = {
  translated: context.report.translated,
  cached: context.report.cached,
  failed: context.report.failed,
  requests: context.report.requests,
  requestsThinkingOff: context.report.requestsThinkingOff,
  requestsThinkingOn: context.report.requestsThinkingOn,
  elapsedMs: context.report.elapsedMs,
  skipped: context.report.skipped,
  model,
  baseUrl,
  catalogs: context.report.catalogs,
  failures: context.report.failures,
}
await writeFile(join(outDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report, null, 2))
if (report.failed > 0) process.exitCode = 1
