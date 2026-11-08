import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { resolveHarnessRoot } from './harness-root.mjs'

const execute = promisify(execFile)
const REPOSITORY_ROOT = fileURLToPath(new URL('../', import.meta.url))
const PACKAGE_ID = 'dsh-locale-ru'

async function run(command, args, options) {
  try {
    return await execute(command, args, { ...options, maxBuffer: 4 * 1024 * 1024, timeout: 120_000 })
  } catch (error) {
    const stdout = error?.stdout ?? ''
    const stderr = error?.stderr ?? ''
    throw new Error(`${command} ${args.join(' ')} failed\n${stdout}${stderr}`, { cause: error })
  }
}

const harnessRoot = await resolveHarnessRoot()
const temporary = await mkdtemp(join(tmpdir(), 'dsh-locale-ru-install-'))
const dshHome = join(temporary, 'home')
const archiveDirectory = join(temporary, 'archive')
const cli = join(harnessRoot, 'apps/cli/src/bin.ts')
const environment = {
  ...process.env,
  DSH_HOME: dshHome,
  CI: '1',
  NO_COLOR: '1',
  npm_config_cache: join(temporary, 'npm-cache'),
}

try {
  await mkdir(archiveDirectory)
  const npmCommand = process.platform === 'win32' ? process.execPath : 'npm'
  const npmPrefix = process.platform === 'win32'
    ? [join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')]
    : []
  const packed = await run(npmCommand, [...npmPrefix, 'pack', '--ignore-scripts', '--json', '--pack-destination', archiveDirectory], {
    cwd: REPOSITORY_ROOT,
    env: environment,
  })
  const packReport = JSON.parse(packed.stdout)
  assert.equal(packReport.length, 1)
  const archive = resolve(archiveDirectory, packReport[0].filename)

  await run(process.execPath, ['--import', 'tsx/esm', cli, 'plugin', '--profile', 'web', 'add', archive], {
    cwd: harnessRoot,
    env: environment,
  })

  const profile = join(dshHome, 'profiles', 'web')
  const profileManifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
  assert.ok(profileManifest.dependencies?.[PACKAGE_ID], 'the real web profile does not list the installed package')
  const installedManifest = JSON.parse(await readFile(join(profile, 'node_modules', ...PACKAGE_ID.split('/'), 'package.json'), 'utf8'))
  assert.equal(installedManifest.name, PACKAGE_ID)
  assert.equal(installedManifest.dsh?.bundle?.patch, './cordis.patch.yml')

  const config = await run(process.execPath, ['--import', 'tsx/esm', cli, '--profile', 'web', '--dump-config'], {
    cwd: harnessRoot,
    env: environment,
  })
  assert.match(config.stdout, /id: locale-ru\s+name: 'dsh-locale-ru'/)
  console.log(`installed ${PACKAGE_ID} into an isolated real web profile and composed its locale-ru row`)
} finally {
  await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}
