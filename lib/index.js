// src/host/index.ts
import { createHash } from "node:crypto";

// src/host/ru/prompt.json
var prompt_default = {
  sections: {}
};

// src/host/ru/tools.json
var tools_default = {
  tools: {}
};

// src/host/index.ts
var name = "dsh-locale-ru";
var inject = [];
var warned = /* @__PURE__ */ new Set();
function warnOnce(key, message) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[dsh-locale-ru] ${message}`);
}
function hashOf(text) {
  return createHash("sha1").update(text, "utf8").digest("hex");
}
function joinPath(path, segment) {
  return path === "" ? segment : `${path}.${segment}`;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
function resolveCatalogs(config) {
  if (config.catalogs !== void 0) return config.catalogs;
  return {
    tools: isRecord(tools_default.tools) ? tools_default.tools : {},
    sections: isRecord(prompt_default.sections) ? prompt_default.sections : {}
  };
}
function translateParameters(parameters, translation, toolName) {
  const values = translation.params;
  const hashes = translation.paramHashes;
  if (!isRecord(values) || Object.keys(values).length === 0) return parameters;
  const walk = (root, visit) => {
    const step = (node, path) => {
      if (Array.isArray(node)) {
        node.forEach((entry, index) => step(entry, joinPath(path, String(index))));
        return;
      }
      if (!isRecord(node)) return;
      if (typeof node.description === "string") visit(node, path);
      if (node.items !== void 0) step(node.items, joinPath(path, "items"));
      if (isRecord(node.properties)) {
        for (const [childName, child] of Object.entries(node.properties)) step(child, joinPath(path, `properties.${childName}`));
      }
      for (const keyword of ["oneOf", "anyOf", "allOf"]) {
        if (!Array.isArray(node[keyword])) continue;
        node[keyword].forEach((child, index) => step(child, joinPath(path, `${keyword}.${String(index)}`)));
      }
    };
    step(root, "");
  };
  const replacements = /* @__PURE__ */ new Map();
  walk(parameters, (holder, path) => {
    const key = joinPath(path, "description");
    const ru = values[key];
    if (typeof ru !== "string" || ru === "") return;
    const expected = isRecord(hashes) ? hashes[key] : void 0;
    if (typeof expected !== "string") {
      warnOnce(`param:${toolName}:${key}:nohash`, `${toolName} ${key}: no source hash in the catalog \u2014 left unchanged`);
      return;
    }
    if (hashOf(holder.description) !== expected) {
      warnOnce(`param:${toolName}:${key}:drift`, `${toolName} ${key}: source text changed since the snapshot \u2014 left unchanged`);
      return;
    }
    replacements.set(key, ru);
  });
  if (replacements.size === 0) return parameters;
  const clone = structuredClone(parameters);
  walk(clone, (holder, path) => {
    const ru = replacements.get(joinPath(path, "description"));
    if (ru !== void 0) holder.description = ru;
  });
  return clone;
}
function translateTool(tool, catalog) {
  const translation = catalog[tool.name];
  if (!isRecord(translation)) return void 0;
  let changed = false;
  let description = tool.description;
  if (typeof translation.ru === "string" && translation.ru !== "" && typeof translation.hash === "string") {
    if (hashOf(tool.description) === translation.hash) {
      description = translation.ru;
      changed = true;
    } else {
      warnOnce(`tool:${tool.name}:drift`, `tool ${tool.name}: source description changed since the snapshot \u2014 left unchanged`);
    }
  }
  const parameters = isRecord(tool.parameters) ? translateParameters(tool.parameters, translation, tool.name) : tool.parameters;
  if (parameters !== tool.parameters) changed = true;
  if (!changed) return void 0;
  return { ...tool, description, parameters };
}
function translateFragments(text, fragments, sectionName) {
  const matches = [];
  for (const entry of fragments) {
    if (!isRecord(entry)) continue;
    const zh = entry.zh;
    const ru = entry.ru;
    const expected = entry.hash;
    if (typeof zh !== "string" || zh === "" || typeof ru !== "string" || ru === "") continue;
    if (typeof expected !== "string" || hashOf(zh) !== expected) {
      warnOnce(`fragment:${sectionName}:${zh}:drift`, `section ${sectionName}: fragment snapshot changed \u2014 left unchanged`);
      continue;
    }
    const start = text.indexOf(zh);
    if (start === -1) continue;
    if (text.indexOf(zh, start + 1) !== -1) {
      warnOnce(`fragment:${sectionName}:${zh}:ambiguous`, `section ${sectionName}: a fragment occurs more than once \u2014 left unchanged`);
      continue;
    }
    matches.push({ start, end: start + zh.length, ru });
  }
  if (matches.length === 0) return void 0;
  matches.sort((left, right) => right.end - right.start - (left.end - left.start));
  const kept = [];
  for (const match of matches) {
    if (kept.some((other) => match.start < other.end && other.start < match.end)) continue;
    kept.push(match);
  }
  kept.sort((left, right) => right.start - left.start);
  let result = text;
  for (const match of kept) result = result.slice(0, match.start) + match.ru + result.slice(match.end);
  return result;
}
function translateSection(entry, catalog) {
  const translation = catalog[entry.name];
  if (!isRecord(translation)) return void 0;
  if (typeof translation.ru === "string" && translation.ru !== "" && typeof translation.hash === "string") {
    if (hashOf(entry.text) === translation.hash) return { ...entry, text: translation.ru };
    warnOnce(`section:${entry.name}:drift`, `section ${entry.name}: source text changed since the snapshot \u2014 left unchanged`);
    return void 0;
  }
  if (!Array.isArray(translation.fragments)) return void 0;
  const text = translateFragments(entry.text, translation.fragments, entry.name);
  return text === void 0 ? void 0 : { ...entry, text };
}
function overlayAssembly(assembly, catalogs) {
  let changed = false;
  const tools = Array.isArray(assembly.tools) ? assembly.tools.map((tool) => {
    if (!isRecord(tool) || typeof tool.name !== "string") return tool;
    const translated = translateTool(tool, catalogs.tools);
    if (translated === void 0) return tool;
    changed = true;
    return translated;
  }) : assembly.tools;
  const mapEntries = (entries) => {
    if (!Array.isArray(entries)) return entries;
    return entries.map((entry) => {
      if (!isRecord(entry) || typeof entry.name !== "string" || typeof entry.text !== "string") return entry;
      const translated = translateSection(entry, catalogs.sections);
      if (translated === void 0) return entry;
      changed = true;
      return translated;
    });
  };
  const sections = mapEntries(assembly.sections);
  const contexts = mapEntries(assembly.contexts);
  if (!changed) return assembly;
  return { ...assembly, tools, sections, contexts };
}
function apply(ctx, config = {}) {
  if (ctx === void 0 || ctx === null || typeof ctx.on !== "function") return;
  const catalogs = resolveCatalogs(config);
  ctx.on("system-prompt/assemble", async (assembly, _context, next) => {
    try {
      const out = await next();
      if (config.prompt !== "ru") return out;
      return overlayAssembly(out, catalogs);
    } catch (error) {
      warnOnce("assemble", `system-prompt overlay skipped: ${messageOf(error)}`);
      return assembly;
    }
  });
}
export {
  apply,
  inject,
  name
};
