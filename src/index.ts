/**
 * Russian language pack, node half.
 *
 * Two layers live behind this entry:
 *
 * - `cordis.patch.yml` restates the built-in permission preset names in Russian
 *   (a config layer applied when a profile lists this package among its
 *   bundles);
 * - `src/host` (re-exported here) is the runtime overlay that rewrites tool
 *   descriptions, tool parameter descriptions and the prompt sections plugins
 *   contribute, on `system-prompt/assemble`.
 *
 * The browser half (`./client`) is the unrelated Web-GUI contribution.
 */
export { name, inject, apply } from './host/index.ts'
export type { HostCatalogs, LocaleRuHostConfig } from './host/index.ts'
