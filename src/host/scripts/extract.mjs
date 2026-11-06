/**
 * Snapshot the host-plane Russian-locale catalogs out of the *installed* DSH
 * plugin bundles.
 *
 * The host half of this locale pack rewrites `system-prompt/assemble` output:
 * tool descriptions, their JSON-Schema parameter descriptions, and the prompt
 * sections the plugins contribute. Nothing in the running host exposes those
 * strings as data — each plugin inlines its Chinese source text into the
 * compiled bundle — so the snapshot is taken from the exact bytes the running
 * agent loads:
 *
 * - `catalogs/host/tools.json` — one entry per agent tool:
 *   `{ plugin, zh, hash, params: { <json-schema path>: zh }, paramHashes }`.
 * - `catalogs/host/prompt.json` — one entry per contributed prompt section (or
 *   per-turn prompt context): `{ plugin, kind, order, zh, hash }` for a static
 *   text, and `{ dynamic: true, fragments: [{ zh, hash }] }` for text the plugin
 *   rebuilds from live state on every request.
 *
 * `hash` is the SHA-1 (lower-case hex) of the exact string, and it is what makes
 * the runtime overlay safe: a translation is applied only while the source text
 * is still byte-identical to the snapshot, so a plugin update degrades to "left
 * in the source language" instead of "silently mismatched".
 *
 * Extraction is deliberately literal. Object literals are sliced by bracket
 * balance with a string/comment/regex-aware scanner, and the resulting source
 * slices are evaluated with `node:vm` — the source strings are JavaScript
 * literals (often with `\uXXXX` escapes and `'a' + 'b'` concatenation), so text
 * copying would keep escapes and split sentences. A definition whose
 * description cannot be resolved to a plain string is reported as a drift
 * failure instead of being silently skipped.
 *
 * Usage:
 *   node src/host/scripts/extract.mjs [--plugins <node_modules dir>]
 *     [--out <catalogs dir>] [--harness <version>] [--check]
 *
 * `--check` regenerates in memory and compares with the committed files
 * (exit 1 on drift) so CI can notice that an installed plugin no longer matches
 * the snapshot.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const DEFAULT_PLUGINS_ROOT = join(homedir(), '.dsh/profiles/web/node_modules')
const DEFAULT_OUT_DIR = join(REPOSITORY_ROOT, 'catalogs/host')
const DEFAULT_HARNESS_VERSION = '0.2.0-rc.2'

/** Han characters: the only thing that makes a host string worth translating. */
const HAN = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/

/**
 * Bundles that register agent tools, with the reviewed tool count of the
 * installed version (see `catalogs/versions.json`). A different count is
 * reported as version drift: the snapshot must be re-reviewed, not silently
 * updated, because the translators work against these exact strings.
 *
 * The count is the number of *extracted* tools, which is not always the number
 * of `defineTool({...})` sites: a definition registered from a loop is expanded
 * per loop iteration (see {@link extractTools}).
 */
const TOOL_SOURCES = [
  { plugin: '@hyzyn/dsh-docker', file: 'lib/index.js', tools: 22 },
  // 18 literal registrations (tty_* 10, sftp_* 7, tunnel_list) plus the two
  // tools the tunnel loop materializes (tunnel_start / tunnel_stop).
  { plugin: '@hyzyn/dsh-tty', file: 'lib/index.js', tools: 20 },
  { plugin: '@hyzyn/dsh-loglens', file: 'lib/tools.js', tools: 5 },
  { plugin: '@hyzyn/dsh-mcp', file: 'lib/index.js', tools: 2 },
]

/**
 * The eight prompt contributions this pack owns.
 *
 * `kind` is where the host assembles the entry: sections land in
 * `assembly.sections`, contexts (per-turn dynamic blocks) in
 * `assembly.contexts`; both are addressed by `name`, which is why the overlay
 * walks the two arrays with the same rule.
 */
const PROMPT_SOURCES = [
  { name: 'plugin:dsh-codegraph', plugin: '@hyzyn/dsh-codegraph', file: 'lib/index.js', kind: 'section' },
  { name: 'plugin:dsh-codegraph:usage', plugin: '@hyzyn/dsh-codegraph', file: 'lib/index.js', kind: 'section' },
  { name: 'plugin:dsh-mcp-config', plugin: '@hyzyn/dsh-mcp', file: 'lib/index.js', kind: 'section' },
  { name: 'plugin:dsh-rss-digest', plugin: '@hyzyn/dsh-rss', file: 'lib/index.js', kind: 'section' },
  { name: 'plugin:dsh-loglens', plugin: '@hyzyn/dsh-loglens', file: 'lib/index.js', kind: 'section' },
  { name: 'plugin:dsh-tty', plugin: '@hyzyn/dsh-tty', file: 'lib/index.js', kind: 'section' },
  { name: 'plugin:dsh-tty:terminals', plugin: '@hyzyn/dsh-tty', file: 'lib/index.js', kind: 'context' },
  { name: 'plugin:dsh-docker', plugin: '@hyzyn/dsh-docker', file: 'lib/index.js', kind: 'section' },
]

/** Upper bound for a prompt-provider span we are willing to scan for fragments. */
const PROVIDER_SPAN_LIMIT = 8000
/** Upper bound of merged fragments per dynamic section (safety net, not a target). */
const FRAGMENT_LIMIT = 80

/* ------------------------------------------------------------------ *
 * Source scanning
 * ------------------------------------------------------------------ */

/** Regular expression literal heuristics: `/` starts a regex after these. */
const REGEX_PRECEDERS = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^', '/', ''])

const isIdentifierStart = character => /[A-Za-z_$]/.test(character)
const isIdentifierPart = character => /[\w$]/.test(character)

/**
 * Skip one string / template / comment / regex literal starting at `index`.
 * @param source - bundle text.
 * @param index - offset that may start a literal.
 * @param previous - previous significant character, for the regex heuristic.
 * @returns offset just past the literal, or `index` when nothing starts here.
 */
function skipLiteral(source, index, previous) {
  const character = source[index]
  if (character === "'" || character === '"') {
    for (let cursor = index + 1; cursor < source.length; cursor += 1) {
      if (source[cursor] === '\\') {
        cursor += 1
        continue
      }
      if (source[cursor] === character) return cursor + 1
      if (source[cursor] === '\n') return cursor + 1
    }
    return source.length
  }
  if (character === '`') {
    for (let cursor = index + 1; cursor < source.length; cursor += 1) {
      if (source[cursor] === '\\') {
        cursor += 1
        continue
      }
      if (source[cursor] === '`') return cursor + 1
      if (source[cursor] === '$' && source[cursor + 1] === '{') cursor = scanCode(source, cursor + 2) - 1
    }
    return source.length
  }
  if (character === '/' && source[index + 1] === '/') {
    const end = source.indexOf('\n', index)
    return end === -1 ? source.length : end
  }
  if (character === '/' && source[index + 1] === '*') {
    const end = source.indexOf('*/', index + 2)
    return end === -1 ? source.length : end + 2
  }
  if (character === '/' && REGEX_PRECEDERS.has(previous)) {
    let inClass = false
    for (let cursor = index + 1; cursor < source.length; cursor += 1) {
      const current = source[cursor]
      if (current === '\\') {
        cursor += 1
        continue
      }
      if (current === '\n') return cursor
      if (current === '[') inClass = true
      else if (current === ']') inClass = false
      else if (current === '/' && !inClass) {
        let end = cursor + 1
        while (end < source.length && /[a-z]/.test(source[end])) end += 1
        return end
      }
    }
    return source.length
  }
  return index
}

/**
 * Scan code until the brace that closes the currently open `${` template hole.
 * @param source - bundle text.
 * @param start - offset just past `${`.
 * @returns offset just past the matching `}`.
 */
function scanCode(source, start) {
  let depth = 1
  let previous = '{'
  let cursor = start
  while (cursor < source.length) {
    const character = source[cursor]
    const skipped = skipLiteral(source, cursor, previous)
    if (skipped !== cursor) {
      cursor = skipped
      previous = 'x'
      continue
    }
    if (character === '{') depth += 1
    else if (character === '}') {
      depth -= 1
      if (depth === 0) return cursor + 1
    }
    if (!/\s/.test(character)) previous = character
    cursor += 1
  }
  return source.length
}

/**
 * Match one opening bracket with its closing partner.
 * @param source - bundle text.
 * @param start - offset of `{`, `(` or `[`.
 * @returns offset of the closing bracket, or `source.length` when unbalanced.
 */
function findMatching(source, start) {
  const pairs = { '{': '}', '(': ')', '[': ']' }
  const stack = [pairs[source[start]]]
  let previous = source[start]
  let cursor = start + 1
  while (cursor < source.length) {
    const character = source[cursor]
    const skipped = skipLiteral(source, cursor, previous)
    if (skipped !== cursor) {
      cursor = skipped
      previous = 'x'
      continue
    }
    if (pairs[character] !== undefined) stack.push(pairs[character])
    else if (character === '}' || character === ')' || character === ']') {
      stack.pop()
      if (stack.length === 0) return cursor
    }
    if (!/\s/.test(character)) previous = character
    cursor += 1
  }
  return source.length
}

/**
 * Every bracket span of the file, so an offset can be attributed to the
 * innermost enclosing object literal.
 * @param source - bundle text.
 * @returns array of `{ start, end }` for balanced brackets, in source order.
 */
function collectBracketSpans(source) {
  const spans = []
  const open = []
  let previous = ''
  let cursor = 0
  while (cursor < source.length) {
    const character = source[cursor]
    const skipped = skipLiteral(source, cursor, previous)
    if (skipped !== cursor) {
      cursor = skipped
      previous = 'x'
      continue
    }
    if (character === '{' || character === '(' || character === '[') open.push(cursor)
    else if (character === '}' || character === ')' || character === ']') {
      const start = open.pop()
      if (start !== undefined) spans.push({ start, end: cursor, open: source[start] })
    }
    if (!/\s/.test(character)) previous = character
    cursor += 1
  }
  return spans.sort((left, right) => left.start - right.start)
}

/**
 * Cook the body of one string literal (escapes included) into the value the
 * running host would see.
 * @param body - literal text between the quotes.
 * @param quote - `'`, `"` or `` ` ``.
 * @returns cooked string.
 */
function cookLiteral(body, quote) {
  return vm.runInNewContext(quote + body + quote, Object.create(null), { timeout: 1000 })
}

/**
 * Collect every string literal (and every static chunk of a template literal)
 * inside a source span, in source order.
 * @param source - bundle text.
 * @param start - span start.
 * @param end - span end (exclusive).
 * @returns array of `{ start, end, value }`.
 */
function collectStringLiterals(source, start, end) {
  const literals = []
  let previous = ''
  let cursor = start
  while (cursor < end) {
    const character = source[cursor]
    if (character === "'" || character === '"') {
      const literalEnd = skipLiteral(source, cursor, previous)
      const body = source.slice(cursor + 1, literalEnd - 1)
      props: try {
        literals.push({ start: cursor, end: literalEnd, value: cookLiteral(body, character) })
      } catch {
        break props
      }
      cursor = literalEnd
      previous = 'x'
      continue
    }
    if (character === '`') {
      let chunkStart = cursor + 1
      let inner = cursor + 1
      while (inner < end) {
        if (source[inner] === '\\') {
          inner += 2
          continue
        }
        if (source[inner] === '`') break
        if (source[inner] === '$' && source[inner + 1] === '{') {
          const body = source.slice(chunkStart, inner)
          try {
            literals.push({ start: chunkStart - 1, end: inner, value: cookLiteral(body, '`') })
          } catch {
            /* unparsable chunk: skip */
          }
          inner = scanCode(source, inner + 2)
          chunkStart = inner
          continue
        }
        inner += 1
      }
      if (inner <= end && chunkStart < inner) {
        const body = source.slice(chunkStart, inner)
        try {
          literals.push({ start: chunkStart - 1, end: inner, value: cookLiteral(body, '`') })
        } catch {
          /* unparsable tail: skip */
        }
      }
      cursor = Math.min(inner + 1, end)
      previous = 'x'
      continue
    }
    const skipped = skipLiteral(source, cursor, previous)
    if (skipped !== cursor) {
      cursor = skipped
      previous = 'x'
      continue
    }
    if (!/\s/.test(character)) previous = character
    cursor += 1
  }
  return literals
}

/**
 * Read the top-level `key: value` pairs of one object literal.
 * @param source - bundle text.
 * @param objectStart - offset of `{`.
 * @returns map of key to `{ valueStart, valueEnd, keyStart }`.
 */
function objectFields(source, objectStart) {
  const objectEnd = findMatching(source, objectStart)
  const fields = new Map()
  let cursor = objectStart + 1
  let previous = '{'
  /** Skip separators, whitespace and comments between two members. */
  const skipTrivia = (index, end) => {
    let position = index
    while (position < end) {
      if (/[\s,]/.test(source[position])) {
        position += 1
        continue
      }
      if (source[position] === '/' && (source[position + 1] === '/' || source[position + 1] === '*')) {
        position = skipLiteral(source, position, '/')
        continue
      }
      break
    }
    return position
  }
  /** Step over one member that is not a plain `key: value` pair. */
  const skipMember = from => {
    let index = from
    let depth = 0
    let before = ''
    while (index < objectEnd) {
      const character = source[index]
      const skipped = skipLiteral(source, index, before)
      if (skipped !== index) {
        index = skipped
        before = 'x'
        continue
      }
      if (character === '{' || character === '(' || character === '[') depth += 1
      else if (character === '}' || character === ')' || character === ']') {
        if (depth === 0) return index
        depth -= 1
      } else if (character === ',' && depth === 0) return index
      if (!/\s/.test(character)) before = character
      index += 1
    }
    return objectEnd
  }
  while (cursor < objectEnd) {
    cursor = skipTrivia(cursor, objectEnd)
    if (cursor >= objectEnd) break
    let key
    let keyStart = cursor
    if (source[cursor] === "'" || source[cursor] === '"') {
      const end = skipLiteral(source, cursor, previous)
      key = cookLiteral(source.slice(cursor + 1, end - 1), source[cursor])
      cursor = end
    } else if (isIdentifierStart(source[cursor])) {
      let end = cursor
      while (end < objectEnd && isIdentifierPart(source[end])) end += 1
      key = source.slice(cursor, end)
      cursor = end
    } else {
      // Spread, computed key, or a stray token: step over the whole member.
      const next = skipMember(cursor)
      cursor = next >= cursor ? next + 1 : cursor + 1
      continue
    }
    cursor = skipTrivia(cursor, objectEnd)
    if (source[cursor] === ',' || source[cursor] === '}' || source[cursor] === undefined) {
      // Shorthand property (`{ text }`): the value is the binding of the same name.
      fields.set(key, { keyStart, valueStart: keyStart, valueEnd: keyStart + key.length })
      continue
    }
    if (source[cursor] !== ':') {
      // Method shorthand (`async execute(args) {...}`) or a getter: not a field,
      // but its body must not be read as one either (nested `name:` would leak).
      const next = skipMember(keyStart)
      cursor = next >= cursor ? next + 1 : cursor + 1
      continue
    }
    cursor += 1
    cursor = skipTrivia(cursor, objectEnd)
    const valueStart = cursor
    let depth = 0
    previous = ':'
    while (cursor < objectEnd) {
      const character = source[cursor]
      const skipped = skipLiteral(source, cursor, previous)
      if (skipped !== cursor) {
        cursor = skipped
        previous = 'x'
        continue
      }
      if (character === '{' || character === '(' || character === '[') depth += 1
      else if (character === '}' || character === ')' || character === ']') {
        if (depth === 0) break
        depth -= 1
      } else if (character === ',' && depth === 0) break
      if (!/\s/.test(character)) previous = character
      cursor += 1
    }
    let valueEnd = cursor
    while (valueEnd > valueStart && /\s/.test(source[valueEnd - 1])) valueEnd -= 1
    fields.set(key, { keyStart, valueStart, valueEnd })
    cursor += 1
  }
  return fields
}

/* ------------------------------------------------------------------ *
 * Literal evaluation
 * ------------------------------------------------------------------ */

const UNRESOLVED = Symbol('unresolved')
const UNEVALUABLE = /\b(?:function|class|import|require|process|globalThis|await|this)\b|=>/

/**
 * Harvest `const|let|var NAME = <expr>` and `function NAME(...) {...}`
 * declarations with their spans, so an identifier or a call can be resolved
 * back to the literal (or the function body) it denotes.
 * @param source - bundle text.
 * @param codeMask - 1 for offsets inside code, 0 inside strings/comments.
 * @returns declarations in source order.
 */
function harvestDeclarations(source, codeMask) {
  const declarations = []
  const declarationPattern = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g
  for (const match of source.matchAll(declarationPattern)) {
    const at = match.index
    if (codeMask[at] !== 1) continue
    const valueStart = at + match[0].length
    let cursor = valueStart
    let depth = 0
    let previous = '='
    while (cursor < source.length) {
      const character = source[cursor]
      const skipped = skipLiteral(source, cursor, previous)
      if (skipped !== cursor) {
        cursor = skipped
        previous = 'x'
        continue
      }
      if (character === '{' || character === '(' || character === '[') depth += 1
      else if (character === '}' || character === ')' || character === ']') depth -= 1
      else if (character === ';' && depth === 0) break
      else if (character === '\n' && depth === 0 && cursor - valueStart > 0) {
        // Automatic semicolon insertion in hand-written plugin sources.
        const rest = source.slice(cursor + 1)
        if (/^\s*(?:const|let|var|function|export|import|\/\/|\/\*|$)/.test(rest)) break
      }
      if (!/\s/.test(character)) previous = character
      cursor += 1
    }
    const valueEnd = cursor
    const expression = source.slice(valueStart, valueEnd).trim()
    if (expression === '' || expression.length > PROVIDER_SPAN_LIMIT) continue
    declarations.push({
      name: match[1],
      keyword: 'binding',
      start: at,
      valueStart,
      valueEnd,
      expression,
    })
  }
  const functionPattern = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g
  for (const match of source.matchAll(functionPattern)) {
    const at = match.index
    if (codeMask[at] !== 1) continue
    const parenStart = at + match[0].length - 1
    const parenEnd = findMatching(source, parenStart)
    const bodyStart = source.indexOf('{', parenEnd)
    if (bodyStart === -1) continue
    const bodyEnd = findMatching(source, bodyStart)
    declarations.push({
      name: match[1],
      keyword: 'function',
      start: at,
      valueStart: at,
      valueEnd: bodyEnd + 1,
      expression: source.slice(at, bodyEnd + 1),
    })
  }
  return declarations.sort((left, right) => left.start - right.start)
}

/**
 * Build the evaluation context of one bundle: every declaration whose value
 * evaluates to plain data becomes a global, so a description written as
 * `TARGET_PARAM` or `'a' + 'b'` resolves to the string the host would see.
 * @param source - bundle text.
 * @param declarations - harvested declarations.
 * @returns `{ context, resolve }`.
 */
function createEvaluator(source, declarations, imports = new Map(), loadImported = () => undefined) {
  const context = vm.createContext(Object.create(null))
  const evaluate = expression => {
    if (expression.length > PROVIDER_SPAN_LIMIT || UNEVALUABLE.test(expression)) return UNRESOLVED
    try {
      return vm.runInContext('( ' + expression + ' )', context, { timeout: 2000 })
    } catch {
      return UNRESOLVED
    }
  }
  for (const declaration of declarations) {
    if (declaration.keyword !== 'binding') continue
    const value = evaluate(declaration.expression)
    if (value === UNRESOLVED) continue
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean' && typeof value !== 'object') continue
    try {
      context[declaration.name] = value
    } catch {
      /* a name the context refuses: keep it unresolved */
    }
  }
  /**
   * Resolve an expression to plain data, following identifiers and calls back
   * to their declarations (bounded, so a chain of aliases cannot recurse away).
   * @param expression - source slice from the bundle.
   * @param position - offset the expression was read at (scope anchor).
   * @returns the value, or {@link UNRESOLVED}.
   */
  const resolve = (expression, position) => {
    const trimmed = expression.trim()
    const direct = evaluate(trimmed)
    if (direct !== UNRESOLVED) return direct
    if (trimmed.startsWith('`')) {
      const templated = resolveTemplate(trimmed, position)
      if (templated !== UNRESOLVED) return templated
    }
    const identifier = /^([A-Za-z_$][\w$]*)$/.exec(trimmed)
    const call = /^([A-Za-z_$][\w$]*)\s*\(/.exec(trimmed)
    const name = identifier?.[1] ?? call?.[1]
    if (name === undefined) return UNRESOLVED
    const declaration = [...declarations].reverse().find(entry => entry.name === name && entry.start < position)
    if (declaration !== undefined) {
      if (declaration.keyword === 'function') return UNRESOLVED
      return resolve(declaration.expression, declaration.start)
    }
    // A description can be assembled from a constant of a sibling module
    // (`import { KEY_VOCABULARY } from './keys.js'`); follow it once.
    const specifier = imports.get(name)
    if (specifier === undefined) return UNRESOLVED
    const imported = loadImported(specifier)
    if (imported?.evaluator === undefined) return UNRESOLVED
    return imported.evaluator.resolveName(name)
  }
  /**
   * Resolve a template literal whose holes hold resolvable values (a bundle
   * inlines e.g. `${String(MAX_RESULT_LINES)}` in a description).
   */
  function resolveTemplate(trimmed, position) {
    const parsed = parseTemplate(trimmed)
    if (parsed === undefined) return UNRESOLVED
    let text = ''
    for (let index = 0; index < parsed.chunks.length; index += 1) {
      text += parsed.chunks[index]
      const hole = parsed.holes[index]
      if (hole === undefined) continue
      const value = resolve(hole, position)
      if (value === UNRESOLVED || value === null || typeof value === 'object') return UNRESOLVED
      text += String(value)
    }
    return text
  }
  /**
   * Resolve an expression that may be an object/array literal holding nested
   * templates or identifiers. Fields that stay unresolved are reported instead
   * of silently dropped.
   * @param expression - source slice.
   * @param position - offset of the slice (scope anchor).
   * @param issues - collector for unresolved nested paths.
   * @param depth - recursion guard.
   * @returns plain data, or {@link UNRESOLVED}.
   */
  const resolveDeep = (expression, position, issues, depth = 0) => {
    const value = resolve(expression, position)
    if (value !== UNRESOLVED) return value
    if (depth > 4) return UNRESOLVED
    const trimmed = expression.trim()
    if (trimmed.startsWith('{') && findMatching(trimmed, 0) === trimmed.length - 1) {
      const resolved = {}
      for (const [key, span] of objectFields(trimmed, 0)) {
        const nested = resolveDeep(trimmed.slice(span.valueStart, span.valueEnd), position + span.valueStart, issues, depth + 1)
        if (nested === UNRESOLVED) {
          issues.push(key)
          continue
        }
        resolved[key] = nested
      }
      return resolved
    }
    if (trimmed.startsWith('[') && findMatching(trimmed, 0) === trimmed.length - 1) {
      const resolved = []
      for (const element of topLevelElements(trimmed)) {
        const nested = resolveDeep(element, position, issues, depth + 1)
        if (nested === UNRESOLVED) {
          issues.push(`[${String(resolved.length)}]`)
          continue
        }
        resolved.push(nested)
      }
      return resolved
    }
    return UNRESOLVED
  }
  return { context, resolve, resolveDeep, resolveName: name => resolve(name, Number.POSITIVE_INFINITY) }
}

/**
 * Read the import map of one module (`import { a, b as c } from './x.js'`).
 * @param source - module text.
 * @param codeMask - 1 for offsets inside code.
 * @returns map of local binding name to module specifier.
 */
function harvestImports(source, codeMask) {
  const imports = new Map()
  const pattern = /\bimport\s+(?:([A-Za-z_$][\w$]*)\s*,?\s*)?(?:\{([^}]*)\}|\*\s+as\s+([A-Za-z_$][\w$]*))?\s*from\s*(['"])([^'"]+)\4/g
  for (const match of source.matchAll(pattern)) {
    if (codeMask[match.index] !== 1) continue
    const specifier = match[5]
    if (!specifier.startsWith('.')) continue
    if (match[1] !== undefined) imports.set(match[1], specifier)
    if (match[3] !== undefined) imports.set(match[3], specifier)
    if (match[2] === undefined) continue
    for (const part of match[2].split(',')) {
      const trimmed = part.trim()
      if (trimmed === '') continue
      const alias = /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(trimmed)
      if (alias === null) continue
      imports.set(alias[2] ?? alias[1], specifier)
    }
  }
  return imports
}

/**
 * Split the top-level elements of an array literal.
 * @param literal - array literal text, starting with `[`.
 * @returns element source slices.
 */
function topLevelElements(literal) {
  const end = findMatching(literal, 0)
  const elements = []
  let cursor = 1
  let depth = 0
  let previous = '['
  let elementStart = 1
  while (cursor < end) {
    const character = literal[cursor]
    const skipped = skipLiteral(literal, cursor, previous)
    if (skipped !== cursor) {
      cursor = skipped
      previous = 'x'
      continue
    }
    if (character === '{' || character === '(' || character === '[') depth += 1
    else if (character === '}' || character === ')' || character === ']') depth -= 1
    else if (character === ',' && depth === 0) {
      elements.push(literal.slice(elementStart, cursor).trim())
      elementStart = cursor + 1
    }
    if (!/\s/.test(character)) previous = character
    cursor += 1
  }
  const tail = literal.slice(elementStart, end).trim()
  if (tail !== '') elements.push(tail)
  return elements
}

/**
 * Split a template literal into its cooked static chunks and hole expressions.
 * @param literal - template literal text, starting with a backtick.
 * @returns `{ chunks, holes }`, or `undefined` when the text is not one literal.
 */
function parseTemplate(literal) {
  if (literal[0] !== '`') return undefined
  const chunks = []
  const holes = []
  let chunkStart = 1
  let cursor = 1
  while (cursor < literal.length) {
    if (literal[cursor] === '\\') {
      cursor += 2
      continue
    }
    if (literal[cursor] === '`') {
      if (cursor !== literal.length - 1) return undefined
      chunks.push(cookLiteral(literal.slice(chunkStart, cursor), '`'))
      return { chunks, holes }
    }
    if (literal[cursor] === '$' && literal[cursor + 1] === '{') {
      chunks.push(cookLiteral(literal.slice(chunkStart, cursor), '`'))
      const holeEnd = scanCode(literal, cursor + 2)
      holes.push(literal.slice(cursor + 2, holeEnd - 1).trim())
      cursor = holeEnd
      chunkStart = holeEnd
      continue
    }
    cursor += 1
  }
  return undefined
}

/* ------------------------------------------------------------------ *
 * Tool catalog
 * ------------------------------------------------------------------ */

/**
 * Derive the runtime JSON-Schema path of every parameter description.
 *
 * `defineTool` compiles the author shorthand (`{ limit: { type, description } }`)
 * into an implicit open object root, so the runtime paths the overlay walks are
 * `properties.<name>.description`, `properties.<name>.items.description`, and so
 * on. Keeping the exact same shape here is what lets the overlay address a
 * description by a stable path.
 * @param spec - author-facing parameter schema.
 * @returns ordered map of path to source string.
 */
function parameterDescriptions(spec) {
  const collected = new Map()
  const walk = (node, path) => {
    if (node === null || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach((entry, index) => walk(entry, `${path}.${String(index)}`))
      return
    }
    if (typeof node.description === 'string' && node.description !== '') {
      collected.set(`${path}.description`, node.description)
    }
    if (node.items !== undefined) walk(node.items, `${path}.items`)
    if (node.properties !== undefined && typeof node.properties === 'object') {
      for (const [name, child] of Object.entries(node.properties)) walk(child, `${path}.properties.${name}`)
    }
    for (const keyword of ['oneOf', 'anyOf', 'allOf']) {
      if (!Array.isArray(node[keyword])) continue
      node[keyword].forEach((child, index) => walk(child, `${path}.${keyword}.${String(index)}`))
    }
  }
  if (spec === null || typeof spec !== 'object') return collected
  for (const [name, node] of Object.entries(spec)) walk(node, `properties.${name}`)
  return collected
}

/**
 * Extract every `defineTool({...})` of one bundle.
 * @param source - bundle text.
 * @param evaluator - literal evaluator of the bundle.
 * @param options - extraction result collector.
 * @returns array of tool entries.
 */
function extractTools(source, evaluator, options) {
  const mask = options.mask
  const tools = []
  /** Build one tool entry from an already-located `defineTool({...})` object. */
  const buildEntry = (fields, offset, label) => {
    const nameField = fields.get('name')
    if (nameField === undefined) return undefined
    const name = evaluator.resolve(source.slice(nameField.valueStart, nameField.valueEnd), nameField.valueStart)
    if (typeof name !== 'string' || name === '') {
      options.failures.push(`tool at offset ${String(offset)}: name is not a plain string${label === undefined ? '' : ` (${label})`}`)
      return undefined
    }
    const descriptionField = fields.get('description')
    const description = descriptionField === undefined
      ? UNRESOLVED
      : evaluator.resolve(source.slice(descriptionField.valueStart, descriptionField.valueEnd), descriptionField.valueStart)
    if (typeof description !== 'string' || description === '') {
      options.failures.push(`tool ${name}: description is not a plain string${label === undefined ? '' : ` (${label})`}`)
      return undefined
    }
    const parameterField = fields.get('parameters')
    const unresolvedParams = []
    const spec = parameterField === undefined
      ? {}
      : evaluator.resolveDeep(
        source.slice(parameterField.valueStart, parameterField.valueEnd),
        parameterField.valueStart,
        unresolvedParams,
      )
    if (spec === UNRESOLVED) {
      options.failures.push(`tool ${name}: parameters are not a plain object${label === undefined ? '' : ` (${label})`}`)
      return undefined
    }
    if (unresolvedParams.length > 0) {
      options.failures.push(`tool ${name}: unresolved parameter entries: ${unresolvedParams.join(', ')}`)
      return undefined
    }
    const descriptions = parameterDescriptions(spec)
    const params = {}
    const paramHashes = {}
    for (const [path, text] of descriptions) {
      params[path] = text
      paramHashes[path] = hash(text)
    }
    return {
      name,
      entry: {
        zh: description,
        hash: hash(description),
        params: sortObject(params),
        ...(Object.keys(paramHashes).length === 0 ? {} : { paramHashes: sortObject(paramHashes) }),
      },
    }
  }
  const pattern = /\bdefineTool\s*\(/g
  for (const match of source.matchAll(pattern)) {
    if (mask !== undefined && mask[match.index] !== 1) continue
    const openParen = match.index + match[0].length - 1
    const closeParen = findMatching(source, openParen)
    const objectStart = source.indexOf('{', openParen)
    if (objectStart === -1 || objectStart > closeParen) continue
    const fields = objectFields(source, objectStart)
    const nameField = fields.get('name')
    if (nameField === undefined) continue
    const name = evaluator.resolve(source.slice(nameField.valueStart, nameField.valueEnd), nameField.valueStart)
    if (typeof name === 'string' && name !== '') {
      const built = buildEntry(fields, match.index)
      if (built !== undefined) tools.push(built)
      continue
    }
    /*
     * A definition registered from a loop — `for (const [toolName, enable, verb]
     * of [['tunnel_start', true, '启动'], ['tunnel_stop', false, '停止']]) { …
     * defineTool({ name: toolName, description: `${verb}…` }) }` — has no literal
     * name at the registration site. The loop tuple is the only place the real
     * strings live, so each iteration is materialized by binding the tuple names
     * into the evaluation context and re-resolving the same object.
     */
    const iterations = loopBindings(source, match.index, evaluator, mask)
    if (iterations.length === 0) {
      options.skipped.push(`offset ${String(match.index)}: ${JSON.stringify(source.slice(objectStart, objectStart + 80))}`)
      continue
    }
    for (const bindings of iterations) {
      const built = withBindings(evaluator, bindings, () => buildEntry(fields, match.index, Object.values(bindings).join(',')))
      if (built !== undefined) tools.push(built)
    }
  }
  return tools
}

/** Sentinel for "this name was not bound before the temporary binding". */
const UNBOUND = Symbol('unbound')

/**
 * Run `callback` with extra identifier bindings visible to the module evaluator.
 *
 * Loop-produced tool definitions substitute their tuple into a template
 * (`` `${verb}一条…` ``); the evaluator resolves identifiers through the vm
 * context, so the tuple is installed there for the duration of one iteration and
 * restored afterwards.
 * @param evaluator - evaluator of the module.
 * @param bindings - identifier values of one iteration.
 * @param callback - resolution work of one iteration.
 * @returns the callback result.
 */
function withBindings(evaluator, bindings, callback) {
  const context = evaluator.context
  const previous = new Map()
  for (const [key, value] of Object.entries(bindings)) {
    previous.set(key, Object.hasOwn(context, key) ? context[key] : UNBOUND)
    context[key] = value
  }
  try {
    return callback()
  } finally {
    for (const [key, value] of previous) {
      if (value === UNBOUND) delete context[key]
      else context[key] = value
    }
  }
}

/**
 * Materialize the iterations of the `for (const [a, b] of [ [..], [..] ])` loop
 * that encloses a definition site.
 * @param source - bundle text.
 * @param offset - offset of the definition inside the loop body.
 * @param evaluator - evaluator of the module.
 * @param mask - 1 for offsets inside code.
 * @returns one binding map per iteration; empty when the site is not a loop.
 */
function loopBindings(source, offset, evaluator, mask) {
  let best
  for (const match of source.matchAll(/\bfor\s*\(/g)) {
    if (mask !== undefined && mask[match.index] !== 1) continue
    const parenStart = match.index + match[0].length - 1
    const parenEnd = findMatching(source, parenStart)
    // The definition lives in the loop *body*; a brace-less body is not a
    // shape a tool registration uses (it needs a statement block).
    let bodyStart = parenEnd + 1
    while (bodyStart < source.length && /\s/.test(source[bodyStart])) bodyStart += 1
    if (source[bodyStart] !== '{') continue
    const bodyEnd = findMatching(source, bodyStart)
    if (bodyStart > offset || offset > bodyEnd) continue
    if (best === undefined || bodyEnd - bodyStart < best.bodyEnd - best.bodyStart) {
      best = { parenStart, parenEnd, bodyStart, bodyEnd }
    }
  }
  if (best === undefined) return []
  const header = source.slice(best.parenStart + 1, best.parenEnd)
  const parsed = /^\s*(?:const|let|var)\s+(\[[^\]]*\]|[A-Za-z_$][\w$]*)\s+of\s+([\s\S]+)$/.exec(header)
  if (parsed === null) return []
  const names = parsed[1].startsWith('[')
    ? parsed[1].slice(1, -1).split(',').map(entry => entry.trim()).filter(entry => entry !== '')
    : [parsed[1]]
  const iterable = evaluator.resolve(parsed[2], best.parenStart)
  if (!Array.isArray(iterable)) return []
  const iterations = []
  for (const entry of iterable) {
    const values = Array.isArray(entry) ? entry : [entry]
    const bindings = {}
    let complete = true
    names.forEach((name, index) => {
      if (values[index] === undefined) {
        complete = false
        return
      }
      bindings[name] = values[index]
    })
    if (complete) iterations.push(bindings)
  }
  return iterations
}

/* ------------------------------------------------------------------ *
 * Prompt catalog
 * ------------------------------------------------------------------ */

/**
 * Resolve the source span a prompt entry's text is computed in, so a dynamic
 * entry can still contribute its static sentences as fragments.
 * @param source - bundle text.
 * @param expression - the `text` value expression.
 * @param position - offset of the expression.
 * @param declarations - harvested declarations of the bundle.
 * @param depth - recursion guard for alias chains.
 * @returns `{ start, end }` or `undefined`.
 */
function providerSpan(expression, position, declarations, depth = 0) {
  if (depth > 3) return undefined
  const trimmed = expression.trim()
  if (trimmed.startsWith('{') === false && trimmed.includes('{')) {
    // Inline arrow function or a call: its own span is the provider.
    return { start: position, end: position + trimmed.length }
  }
  const identifier = /^([A-Za-z_$][\w$]*)$/.exec(trimmed)
  const call = /^([A-Za-z_$][\w$]*)\s*\(/.exec(trimmed)
  const name = identifier?.[1] ?? call?.[1]
  if (name === undefined) return { start: position, end: position + trimmed.length }
  const declaration = [...declarations].reverse().find(entry => entry.name === name && entry.start < position)
  if (declaration === undefined) return undefined
  if (call !== null) {
    const inner = providerSpan(declaration.expression, declaration.start, declarations, depth + 1)
    if (inner !== undefined) return inner
  }
  const span = { start: declaration.valueStart, end: declaration.valueEnd }
  if (span.end - span.start > PROVIDER_SPAN_LIMIT) return undefined
  return span
}

/**
 * Collect the static sentences of a dynamic prompt provider: the cooked chunks
 * of its own string and template literals, plus the literals of the small
 * helper functions it calls (a per-turn provider is assembled from both).
 * @param source - bundle text.
 * @param span - provider span.
 * @param declarations - declarations of the bundle.
 * @returns fragments in source order, deduplicated.
 */
function fragmentsOf(source, span, declarations) {
  const spans = [{ start: span.start, end: span.end }]
  const body = source.slice(span.start, span.end)
  const referenced = new Set(body.match(/[A-Za-z_$][\w$]*/g) ?? [])
  for (const declaration of declarations) {
    if (!referenced.has(declaration.name)) continue
    if (declaration.keyword !== 'function') continue
    const size = declaration.valueEnd - declaration.valueStart
    if (size > 4000) continue
    spans.push({ start: declaration.valueStart, end: declaration.valueEnd })
    if (spans.length > 6) break
  }
  const seen = new Set()
  const fragments = []
  for (const current of spans) {
    for (const literal of collectStringLiterals(source, current.start, current.end)) {
      const value = literal.value.trim()
      if (value === '' || !HAN.test(value)) continue
      if (seen.has(value)) continue
      seen.add(value)
      fragments.push({ zh: value, hash: hash(value) })
      if (fragments.length >= FRAGMENT_LIMIT) return fragments
    }
  }
  return fragments
}

/**
 * Extract the eight prompt contributions and how their text is computed.
 * @param source - bundle text.
 * @param evaluator - literal evaluator of the bundle.
 * @param declarations - declarations of the bundle.
 * @param options - extraction result collector.
 * @param spec - the prompt source declaration.
 * @returns prompt entry.
 */
function extractPromptEntry(source, evaluator, declarations, options, spec) {
  const spans = collectBracketSpans(source)
  const needle = `name: '${spec.name}'`
  const needleDouble = `name: "${spec.name}"`
  const at = source.indexOf(needle) === -1 ? source.indexOf(needleDouble) : source.indexOf(needle)
  if (at === -1) {
    options.failures.push(`prompt ${spec.name}: registration not found in ${spec.file}`)
    return undefined
  }
  const enclosing = spans
    .filter(span => span.open === '{' && span.start < at && span.end > at)
    .sort((left, right) => (left.end - left.start) - (right.end - right.start))[0]
  if (enclosing === undefined) {
    options.failures.push(`prompt ${spec.name}: no enclosing object literal`)
    return undefined
  }
  const fields = objectFields(source, enclosing.start)
  const textField = fields.get('text')
  if (textField === undefined) {
    options.failures.push(`prompt ${spec.name}: no text field`)
    return undefined
  }
  const orderField = fields.get('order')
  const order = orderField === undefined
    ? undefined
    : evaluator.resolve(source.slice(orderField.valueStart, orderField.valueEnd), orderField.valueStart)
  const expression = source.slice(textField.valueStart, textField.valueEnd)
  const value = evaluator.resolve(expression, textField.valueStart)
  const base = {
    plugin: spec.plugin,
    kind: spec.kind,
    ...(typeof order === 'number' ? { order } : {}),
  }
  if (typeof value === 'string' && value !== '') {
    return { [spec.name]: { ...base, zh: value, hash: hash(value) } }
  }
  const span = providerSpan(expression, textField.valueStart, declarations)
  const fragments = span === undefined ? [] : fragmentsOf(source, span, declarations)
  return {
    [spec.name]: {
      ...base,
      dynamic: true,
      translatable: fragments.length > 0,
      zh: null,
      hash: null,
      note: fragments.length === 0
        ? 'text is assembled per request and holds no Chinese literal to translate'
        : 'text is rebuilt per request; translate fragments[] instead — each fragment is replaced at the one place it occurs',
      fragments,
    },
  }
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** SHA-1 of the exact string, lower-case hex: the overlay's only safety gate. */
function hash(text) {
  return createHash('sha1').update(text, 'utf8').digest('hex')
}

/** Sort an object's keys so a snapshot is diffable and `--check` is stable. */
function sortObject(object) {
  return Object.fromEntries(Object.entries(object).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)))
}

/** Parse `--name value` / `--name=value` / `--flag` pairs. */
function parseArguments(argv) {
  const options = { check: false }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (!argument.startsWith('--')) throw new Error(`unexpected argument: ${argument}`)
    const [flag, inline] = argument.slice(2).split('=', 2)
    if (flag === 'check') {
      options.check = true
      continue
    }
    const value = inline ?? argv[index + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`--${flag} needs a value`)
    if (inline === undefined) index += 1
    options[flag] = value
  }
  return options
}

/** Read one plugin version out of its installed `package.json`. */
async function pluginVersion(pluginsRoot, name) {
  const manifest = JSON.parse(await readFile(join(pluginsRoot, name, 'package.json'), 'utf8'))
  return typeof manifest.version === 'string' ? manifest.version : 'unknown'
}

/** Build the 0/1 code mask used to reject regex hits inside strings/comments. */
function codeMaskOf(source) {
  const mask = new Uint8Array(source.length)
  let previous = ''
  let cursor = 0
  while (cursor < source.length) {
    const skipped = skipLiteral(source, cursor, previous)
    if (skipped !== cursor) {
      cursor = skipped
      previous = 'x'
      continue
    }
    mask[cursor] = 1
    if (!/\s/.test(source[cursor])) previous = source[cursor]
    cursor += 1
  }
  return mask
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

/**
 * Build both catalogs from the installed bundles.
 * @param options - `{ pluginsRoot, harness }`.
 * @returns `{ tools, prompt, plugins, counts, warnings, failures }`.
 */
export async function buildCatalogs(options) {
  const pluginsRoot = options.pluginsRoot ?? DEFAULT_PLUGINS_ROOT
  const warnings = []
  const failures = []
  const sourceCache = new Map()
  const versions = new Map()

  /**
   * Load one module of the installed plugin tree and build its evaluator.
   * Sibling modules are followed by `import` so a constant defined next to a
   * tool (a key vocabulary, a result-line budget) still resolves.
   */
  const loadFile = absolutePath => {
    const cached = sourceCache.get(absolutePath)
    if (cached !== undefined) return cached
    const source = readFileSync(absolutePath, 'utf8')
    const mask = codeMaskOf(source)
    const declarations = harvestDeclarations(source, mask)
    const imports = harvestImports(source, mask)
    const module = { source, mask, declarations, imports, evaluator: undefined }
    sourceCache.set(absolutePath, module)
    module.evaluator = createEvaluator(source, declarations, imports, specifier => {
      const target = resolve(absolutePath, '..', specifier)
      try {
        return loadFile(target)
      } catch {
        return undefined
      }
    })
    // Imported constants participate in template holes (`${String(MAX_RESULT_LINES)}`),
    // so expose their resolved values to the module's own evaluation sandbox.
    for (const [name, specifier] of imports) {
      try {
        const imported = loadFile(resolve(absolutePath, '..', specifier))
        if (imported.evaluator === undefined) continue
        const value = imported.evaluator.resolveName(name)
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          module.evaluator.context[name] = value
        }
      } catch {
        /* an import that cannot be resolved stays unbound */
      }
    }
    return module
  }
  const load = async (relativeFile) => loadFile(join(pluginsRoot, relativeFile))

  const tools = {}
  const skipped = []
  for (const spec of TOOL_SOURCES) {
    versions.set(spec.plugin, await pluginVersion(pluginsRoot, spec.plugin))
    const bundle = await load(join(spec.plugin, spec.file))
    const found = extractTools(bundle.source, bundle.evaluator, { failures, skipped, mask: bundle.mask })
    if (found.length !== spec.tools) {
      warnings.push(`${spec.plugin}: ${String(found.length)} tools found, ${String(spec.tools)} expected (version drift?)`)
    }
    for (const tool of found) {
      if (tools[tool.name] !== undefined) {
        failures.push(`duplicate tool name ${tool.name}`)
        continue
      }
      tools[tool.name] = sortObject({ plugin: spec.plugin, ...tool.entry })
    }
  }

  const sections = {}
  for (const spec of PROMPT_SOURCES) {
    versions.set(spec.plugin, await pluginVersion(pluginsRoot, spec.plugin))
    const bundle = await load(join(spec.plugin, spec.file))
    const entry = extractPromptEntry(bundle.source, bundle.evaluator, bundle.declarations, { failures }, spec)
    if (entry === undefined) continue
    Object.assign(sections, entry)
  }
  if (Object.keys(sections).length !== PROMPT_SOURCES.length) {
    failures.push(`only ${String(Object.keys(sections).length)} of ${String(PROMPT_SOURCES.length)} prompt entries extracted`)
  }

  const plugins = [...versions.entries()]
    .map(([name, version]) => ({ name, version }))
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
  const parameterCount = Object.values(tools).reduce(
    (total, tool) => total + Object.keys(tool.params ?? {}).length,
    0,
  )

  const toolsCatalog = {
    harness: options.harness ?? DEFAULT_HARNESS_VERSION,
    plugins,
    counts: { tools: Object.keys(tools).length, parameters: parameterCount },
    tools: sortObject(tools),
  }
  const promptCatalog = {
    harness: options.harness ?? DEFAULT_HARNESS_VERSION,
    plugins,
    counts: { sections: Object.keys(sections).length },
    sections: sortObject(sections),
  }
  for (const entry of skipped) warnings.push(`skipped a generated tool definition (no literal name): ${entry}`)
  return { toolsCatalog, promptCatalog, warnings, failures, skipped }
}

/** Write (or check) one catalog file. */
async function emit(file, value, check) {
  const serialized = JSON.stringify(value, null, 2) + '\n'
  if (check) {
    let current
    try {
      current = await readFile(file, 'utf8')
    } catch {
      return `${file}: missing`
    }
    return current === serialized ? undefined : `${file}: differs from the installed bundles`
  }
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, serialized, 'utf8')
  return undefined
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  const pluginsRoot = resolve(options.plugins ?? DEFAULT_PLUGINS_ROOT)
  const outDir = resolve(options.out ?? DEFAULT_OUT_DIR)
  const result = await buildCatalogs({
    pluginsRoot,
    harness: options.harness ?? DEFAULT_HARNESS_VERSION,
  })
  for (const warning of result.warnings) console.warn(`warning: ${warning}`)
  if (result.failures.length > 0) {
    for (const failure of result.failures) console.error(`error: ${failure}`)
    throw new Error(`extraction failed with ${String(result.failures.length)} error(s)`)
  }
  const drift = [
    await emit(join(outDir, 'tools.json'), result.toolsCatalog, options.check),
    await emit(join(outDir, 'prompt.json'), result.promptCatalog, options.check),
  ].filter(value => value !== undefined)
  if (options.check && drift.length > 0) {
    for (const entry of drift) console.error(`drift: ${entry}`)
    process.exitCode = 1
    return
  }
  console.log(
    `${options.check ? 'verified' : 'wrote'} ${String(result.toolsCatalog.counts.tools)} tool descriptions ` +
    `(${String(result.toolsCatalog.counts.parameters)} parameter descriptions) and ` +
    `${String(result.promptCatalog.counts.sections)} prompt entries from ${String(result.toolsCatalog.plugins.length)} plugins`,
  )
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
