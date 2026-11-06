/**
 * Russian host-plane overlay: the node half of the locale pack.
 *
 * The browser half translates the Web GUI; the agent-facing half — tool
 * descriptions, their JSON-Schema parameter descriptions, and the prompt
 * sections plugins contribute — is assembled by the Host on every model step.
 * `system-prompt/assemble` is a waterfall over exactly that assembled value, so
 * this plugin subscribes once (globally) and rewrites the assembled strings
 * after every other contributor had its say (`await next()`).
 *
 * ## Why the hash gate
 *
 * The translations in `ru/` were written against a snapshot of the installed
 * plugin bundles (`catalogs/host/*.json`, taken by
 * `src/host/scripts/extract.mjs`). A plugin update can reword a description
 * without changing its name, and a Russian sentence attached to a changed
 * source string would be a silent lie about what the tool does. So every
 * translation carries the SHA-1 of the exact source string it replaces; a
 * mismatch means "version drift" — the entry is skipped with a warning and the
 * plugin's own text is kept.
 *
 * ## Failure behaviour
 *
 * Prompt assembly runs before every request: throwing here would make the
 * session unable to send anything. The listener therefore never throws — any
 * error is reported once and the assembly is returned untouched.
 *
 * @see src/host/ru/README.md for the catalog format.
 */
import { createHash } from 'node:crypto'
import promptCatalog from './ru/prompt.json'
import toolsCatalog from './ru/tools.json'

/** Plugin name reported by the Host. */
export const name = 'dsh-locale-ru'

/** Host services this plugin needs: the event is used through `ctx.on`. */
export const inject: string[] = []

/**
 * Host configuration, as written into `cordis.patch.yml`.
 *
 * `prompt` defaults to "off": only an explicit `'ru'` turns the overlay on,
 * because a bundle that quietly rewrites model-facing text would be hard to
 * audit.
 */
export interface LocaleRuHostConfig {
  /** `'ru'` enables the overlay; every other value leaves the assembly as-is. */
  prompt?: 'ru' | 'en' | 'off'
  /**
   * Catalog override — the place tests plug fixtures in. In production the
   * bundled `ru/tools.json` / `ru/prompt.json` are used.
   */
  catalogs?: HostCatalogs
}

/** Prompt assembly shapes used by the overlay (subset of the Host contract). */
interface ToolSchema {
  name: string
  description: string
  parameters: Record<string, unknown>
  [key: string]: unknown
}

interface AssembledEntry {
  name: string
  text: string
  [key: string]: unknown
}

interface PromptAssembly {
  sections: AssembledEntry[]
  contexts: AssembledEntry[]
  tools: ToolSchema[]
  [key: string]: unknown
}

/**
 * One translated fragment of a section whose text is rebuilt per request.
 *
 * `zh` is the literal as it appears in the source text (once per occurrence —
 * the same literal is replaced everywhere it appears), `hash` gates the
 * snapshot, and the optional `count` is how many occurrences the translator saw
 * when the entry was written. A per-turn text repeats a fragment once per
 * session, so a declared count is a drift check: a different number means the
 * surrounding text changed and the entry is not applied.
 */
interface FragmentTranslation {
  zh: string
  hash: string
  ru: string
  count?: number
}

/** One tool translation: description plus parameter descriptions by schema path. */
interface ToolTranslation {
  hash: string
  ru: string
  params?: Record<string, string>
  paramHashes?: Record<string, string>
}

/** One static section translation, or the fragments of a dynamic one. */
interface SectionTranslation {
  hash?: string
  ru?: string
  fragments?: FragmentTranslation[]
}

/** The two catalogs the overlay reads. */
export interface HostCatalogs {
  tools: Record<string, ToolTranslation>
  sections: Record<string, SectionTranslation>
}

/** Warnings are reported once per key: assembly runs before every request. */
const warned = new Set<string>()

/**
 * Report a condition once per key.
 * @param key - deduplication key.
 * @param message - text appended to the plugin prefix.
 */
function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return
  warned.add(key)
  console.warn(`[dsh-locale-ru] ${message}`)
}

/** The hash gate: SHA-1 of the exact UTF-8 string, as the extractor writes it. */
function hashOf(text: string): string {
  return createHash('sha1').update(text, 'utf8').digest('hex')
}

/** Join one schema path segment, keeping the root path free of a leading dot. */
function joinPath(path: string, segment: string): string {
  return path === '' ? segment : `${path}.${segment}`
}

/** Narrow `unknown` to a plain JSON object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Message of an unknown thrown value. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Read the bundled catalogs unless a caller supplied its own.
 * @param config - plugin configuration.
 * @returns catalogs to apply.
 */
function resolveCatalogs(config: LocaleRuHostConfig): HostCatalogs {
  if (config.catalogs !== undefined) return config.catalogs
  return {
    tools: isRecord(toolsCatalog.tools) ? (toolsCatalog.tools as Record<string, ToolTranslation>) : {},
    sections: isRecord(promptCatalog.sections) ? (promptCatalog.sections as Record<string, SectionTranslation>) : {},
  }
}

/**
 * Walk a tool's JSON Schema and replace the descriptions a catalog addresses.
 *
 * Paths are the ones the Host's own compiler produces — `properties.<name>`,
 * `properties.<name>.items`, `properties.<name>.properties.<child>`,
 * `properties.<name>.oneOf.<index>` — with `.description` as the leaf. A path
 * that no longer exists at runtime simply never matches.
 * @param parameters - the assembled schema (left untouched).
 * @param translation - catalog entry of this tool.
 * @param toolName - tool name, for the warning text.
 * @returns the replaced schema, or the original when nothing matched.
 */
function translateParameters(
  parameters: Record<string, unknown>,
  translation: ToolTranslation,
  toolName: string,
): Record<string, unknown> {
  const values = translation.params
  const hashes = translation.paramHashes
  if (!isRecord(values) || Object.keys(values).length === 0) return parameters
  /** Address one description holder of the schema (`path` excludes `.description`). */
  const walk = (root: unknown, visit: (holder: Record<string, unknown>, path: string) => void): void => {
    const step = (node: unknown, path: string): void => {
      if (Array.isArray(node)) {
        node.forEach((entry, index) => step(entry, joinPath(path, String(index))))
        return
      }
      if (!isRecord(node)) return
      if (typeof node.description === 'string') visit(node, path)
      if (node.items !== undefined) step(node.items, joinPath(path, 'items'))
      if (isRecord(node.properties)) {
        for (const [childName, child] of Object.entries(node.properties)) step(child, joinPath(path, `properties.${childName}`))
      }
      for (const keyword of ['oneOf', 'anyOf', 'allOf']) {
        if (!Array.isArray(node[keyword])) continue
        node[keyword].forEach((child, index) => step(child, joinPath(path, `${keyword}.${String(index)}`)))
      }
    }
    step(root, '')
  }
  // Pass one verifies the snapshot; a schema is only cloned when something matched.
  const replacements = new Map<string, string>()
  walk(parameters, (holder, path) => {
    const key = joinPath(path, 'description')
    const ru = values[key]
    if (typeof ru !== 'string' || ru === '') return
    const expected = isRecord(hashes) ? hashes[key] : undefined
    if (typeof expected !== 'string') {
      warnOnce(`param:${toolName}:${key}:nohash`, `${toolName} ${key}: no source hash in the catalog — left unchanged`)
      return
    }
    if (hashOf(holder.description as string) !== expected) {
      warnOnce(`param:${toolName}:${key}:drift`, `${toolName} ${key}: source text changed since the snapshot — left unchanged`)
      return
    }
    replacements.set(key, ru)
  })
  if (replacements.size === 0) return parameters
  const clone = structuredClone(parameters)
  walk(clone, (holder, path) => {
    const ru = replacements.get(joinPath(path, 'description'))
    if (ru !== undefined) holder.description = ru
  })
  return clone
}

/**
 * Translate one assembled tool.
 * @param tool - the assembled tool schema.
 * @param catalog - tool catalog.
 * @returns the translated tool, or `undefined` when nothing was replaced.
 */
function translateTool(tool: ToolSchema, catalog: Record<string, ToolTranslation>): ToolSchema | undefined {
  const translation = catalog[tool.name]
  if (!isRecord(translation)) return undefined
  let changed = false
  let description = tool.description
  if (typeof translation.ru === 'string' && translation.ru !== '' && typeof translation.hash === 'string') {
    if (hashOf(tool.description) === translation.hash) {
      description = translation.ru
      changed = true
    } else {
      warnOnce(`tool:${tool.name}:drift`, `tool ${tool.name}: source description changed since the snapshot — left unchanged`)
    }
  }
  const parameters = isRecord(tool.parameters)
    ? translateParameters(tool.parameters, translation, tool.name)
    : tool.parameters
  if (parameters !== tool.parameters) changed = true
  if (!changed) return undefined
  return { ...tool, description, parameters }
}

/** One replaceable occurrence of a fragment inside a section text. */
interface FragmentOccurrence {
  start: number
  end: number
  ru: string
}

/** One catalog fragment prepared for matching. */
interface FragmentCandidate {
  zh: string
  ru: string
  hash: unknown
  count: number | undefined
  order: number
}

/**
 * Replace the fragments of a section whose text the plugin rebuilds per request.
 *
 * A per-turn section repeats the same sentence once per live session (the tty
 * terminal list is the reason this exists), so a literal has to be replaced at
 * *every* occurrence, not just at the first or the only one.
 *
 * Replacement is atomic per fragment: when the catalog declares how many
 * occurrences the snapshot had (`count`) and the live text disagrees, that
 * fragment is left untouched and reported — half a translation (one session in
 * Russian, the next in Chinese) reads worse than the source language.
 *
 * Overlaps are resolved in favour of the longer literal (then the earlier
 * catalog entry): a fragment that sits inside a longer translated fragment is
 * not replaced twice, and its free occurrences are still translated.
 * @param text - the assembled text.
 * @param fragments - catalog fragments of this section.
 * @param sectionName - section name, for warnings.
 * @returns the replaced text, or `undefined` when nothing was replaced.
 */
function translateFragments(
  text: string,
  fragments: unknown[],
  sectionName: string,
): string | undefined {
  // The same literal may be listed twice (alternative phrasings share a tail);
  // keep the first entry — its hash is the one that gets verified.
  const candidates: FragmentCandidate[] = []
  const seen = new Set<string>()
  for (const [order, entry] of fragments.entries()) {
    if (!isRecord(entry)) continue
    const { zh, ru } = entry
    if (typeof zh !== 'string' || zh === '' || typeof ru !== 'string' || ru === '') continue
    if (seen.has(zh)) continue
    seen.add(zh)
    candidates.push({
      zh,
      ru,
      hash: entry.hash,
      count: typeof entry.count === 'number' && Number.isSafeInteger(entry.count) && entry.count > 0
        ? entry.count
        : undefined,
      order,
    })
  }
  // Longer literals first: `[состояние команды неизвестно — ` wins its span over
  // a shorter literal that happens to start at the same offset.
  candidates.sort((left, right) => right.zh.length - left.zh.length || left.order - right.order)
  const occupied: { start: number; end: number }[] = []
  const replacements: FragmentOccurrence[] = []
  for (const candidate of candidates) {
    if (typeof candidate.hash !== 'string' || hashOf(candidate.zh) !== candidate.hash) {
      warnOnce(`fragment:${sectionName}:${candidate.zh}:drift`, `section ${sectionName}: fragment snapshot changed — left unchanged`)
      continue
    }
    const spans: { start: number; end: number }[] = []
    // Non-overlapping scan of one literal: a hit advances by its own length.
    for (let at = text.indexOf(candidate.zh); at !== -1; at = text.indexOf(candidate.zh, at + candidate.zh.length)) {
      spans.push({ start: at, end: at + candidate.zh.length })
    }
    if (spans.length === 0) continue
    if (candidate.count !== undefined && spans.length !== candidate.count) {
      warnOnce(
        `fragment:${sectionName}:${candidate.zh}:count`,
        `section ${sectionName}: fragment ${JSON.stringify(candidate.zh)} occurs ${String(spans.length)} time(s), the snapshot expected ${String(candidate.count)} — left unchanged`,
      )
      continue
    }
    const free = spans.filter(span => !occupied.some(other => span.start < other.end && other.start < span.end))
    if (free.length === 0) {
      warnOnce(
        `fragment:${sectionName}:${candidate.zh}:shadowed`,
        `section ${sectionName}: every occurrence of ${JSON.stringify(candidate.zh)} sits inside a longer translated fragment — left as part of it`,
      )
      continue
    }
    if (free.length < spans.length) {
      warnOnce(
        `fragment:${sectionName}:${candidate.zh}:partial`,
        `section ${sectionName}: ${String(spans.length - free.length)} of ${String(spans.length)} occurrence(s) of ${JSON.stringify(candidate.zh)} sit inside a longer translated fragment and stay as part of it`,
      )
    }
    for (const span of free) {
      occupied.push(span)
      replacements.push({ ...span, ru: candidate.ru })
    }
  }
  if (replacements.length === 0) return undefined
  replacements.sort((left, right) => right.start - left.start)
  let result = text
  for (const occurrence of replacements) {
    result = result.slice(0, occurrence.start) + occurrence.ru + result.slice(occurrence.end)
  }
  return result
}

/**
 * Translate one assembled section or context.
 * @param entry - assembled section/context.
 * @param catalog - section catalog.
 * @returns the translated entry, or `undefined` when nothing was replaced.
 */
function translateSection(
  entry: AssembledEntry,
  catalog: Record<string, SectionTranslation>,
): AssembledEntry | undefined {
  const translation = catalog[entry.name]
  if (!isRecord(translation)) return undefined
  if (typeof translation.ru === 'string' && translation.ru !== '' && typeof translation.hash === 'string') {
    if (hashOf(entry.text) === translation.hash) return { ...entry, text: translation.ru }
    warnOnce(`section:${entry.name}:drift`, `section ${entry.name}: source text changed since the snapshot — left unchanged`)
    return undefined
  }
  if (!Array.isArray(translation.fragments)) return undefined
  const text = translateFragments(entry.text, translation.fragments, entry.name)
  return text === undefined ? undefined : { ...entry, text }
}

/**
 * Apply the catalogs to one assembly.
 * @param assembly - the assembly returned by the waterfall.
 * @param catalogs - translations to apply.
 * @returns a new assembly with the matched strings replaced.
 */
function overlayAssembly(assembly: PromptAssembly, catalogs: HostCatalogs): PromptAssembly {
  let changed = false
  const tools = Array.isArray(assembly.tools)
    ? assembly.tools.map((tool) => {
      if (!isRecord(tool) || typeof tool.name !== 'string') return tool
      const translated = translateTool(tool as ToolSchema, catalogs.tools)
      if (translated === undefined) return tool
      changed = true
      return translated
    })
    : assembly.tools
  /** Translate one section/context array. */
  const mapEntries = (entries: AssembledEntry[] | undefined): AssembledEntry[] | undefined => {
    if (!Array.isArray(entries)) return entries
    return entries.map((entry) => {
      if (!isRecord(entry) || typeof entry.name !== 'string' || typeof entry.text !== 'string') return entry
      const translated = translateSection(entry as AssembledEntry, catalogs.sections)
      if (translated === undefined) return entry
      changed = true
      return translated
    })
  }
  const sections = mapEntries(assembly.sections)
  const contexts = mapEntries(assembly.contexts)
  if (!changed) return assembly
  return { ...assembly, tools, sections, contexts } as PromptAssembly
}

/**
 * Mount the host half.
 *
 * Subscribes globally to `system-prompt/assemble`; the returned assembly is the
 * authoritative one, so the overlay has to run after every other contributor.
 * @param ctx - plugin context (needs `on`).
 * @param config - plugin configuration.
 */
export function apply(ctx: { on(event: string, listener: (...args: any[]) => any): unknown }, config: LocaleRuHostConfig = {}): void {
  // The bundle smoke test imports the entry and calls `apply()` to prove the
  // node half mounts; without an event bus there is nothing to subscribe to.
  if (ctx === undefined || ctx === null || typeof ctx.on !== 'function') return
  const catalogs = resolveCatalogs(config)
  ctx.on('system-prompt/assemble', async (assembly: PromptAssembly, _context: unknown, next: () => Promise<PromptAssembly>) => {
    try {
      const out = await next()
      if (config.prompt !== 'ru') return out
      return overlayAssembly(out, catalogs)
    } catch (error) {
      warnOnce('assemble', `system-prompt overlay skipped: ${messageOf(error)}`)
      return assembly
    }
  })
}
