import { mkdir, writeFile } from 'node:fs/promises'
import { build } from 'esbuild'

const PACKAGE_ID = 'dsh-locale-ru'

await mkdir('lib', { recursive: true })

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  legalComments: 'none',
})

const client = await build({
  entryPoints: ['src/client/index.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  legalComments: 'none',
  write: false,
})
const lines = client.outputFiles[0].text.trimEnd().split('\n')
if (lines[0]?.trim() === '"use strict";') lines.shift()
const body = lines
  .map(line => line.length === 0 ? '' : `    ${line}`)
  .join('\n')
const output = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(PACKAGE_ID)},
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
${body}
    return module.exports;
  },
});
`
await writeFile('lib/client.js', output, 'utf8')
