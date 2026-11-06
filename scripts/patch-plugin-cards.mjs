/**
 * Локализация карточек плагинов (display metadata) в установленном профиле.
 *
 * Плагины кладут в `package.json` китайское `description`, а `readPluginMeta`
 * (dsh-app-boot) читает `locale/en.json` + соседние `locale/<lang>.json`
 * **внутри пакета** и отдаёт клиенту `LocalizedText` с `ru`-ключом. Поэтому
 * карточки в «Настройки → Плагины» и в списке плагинов локализуются только
 * файлами внутри пакета — этот скрипт их и добавляет.
 *
 * Что делает (идемпотентно):
 *  1. для каждого пакета из `catalogs/cards/<lang>.json` пишет
 *     `locale/<lang>.json` = `{ "meta": { "title", "description" } }`;
 *  2. добавляет в `package.json.exports` пути `./locale/en.json` и
 *     `./locale/ru.json`, иначе Node-резолвер не отдаст эти файлы;
 *  3. сохраняет оригиналы в `.cards-backup/` (вне пакетов) для `--revert`.
 *
 * Использование:
 *   node scripts/patch-plugin-cards.mjs --apply   # (по умолчанию)
 *   node scripts/patch-plugin-cards.mjs --check    # только проверить, exit 1 при расхождении
 *   node scripts/patch-plugin-cards.mjs --revert   # откатить
 *   --profile <путь>   профиль DSH (по умолчанию ~/.dsh/profiles/web)
 *
 * Внимание: правки живут в `node_modules` профиля. После переустановки
 * плагинов (`pnpm install`) скрипт нужно запустить повторно; повторный
 * `pnpm update` пакета локализации это не отменяет.
 */
import { createRequire } from 'node:module'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPOSITORY_ROOT = fileURLToPath(new URL('../', import.meta.url))
const BACKUP_ROOT = join(REPOSITORY_ROOT, '.cards-backup')

function parseArgs(argv) {
  const mode = argv.includes('--check')
    ? 'check'
    : argv.includes('--revert')
      ? 'revert'
      : 'apply'
  const profileIndex = argv.indexOf('--profile')
  const profile = profileIndex >= 0
    ? resolve(argv[profileIndex + 1])
    : resolve(homedir(), '.dsh/profiles/web')
  return { mode, profile }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

async function readOptional(file) {
  try {
    return await readFile(file, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined
    throw error
  }
}

async function loadCatalogs() {
  const dir = join(REPOSITORY_ROOT, 'catalogs/cards')
  return {
    en: await readJson(join(dir, 'en.json')),
    ru: await readJson(join(dir, 'ru.json')),
  }
}

/** Имя каталога бэкапа: scope-safe, без слешей. */
function backupDirFor(packageName) {
  return join(BACKUP_ROOT, packageName.replace('/', '__'))
}

async function backupOnce(packageName, packageDir, file) {
  const target = join(backupDirFor(packageName), relative(packageDir, file))
  if (existsSync(target)) return
  const contents = await readOptional(file)
  await mkdir(dirname(target), { recursive: true })
  if (contents === undefined) {
    // Отмечаем, что файла не было: при откате его нужно удалить.
    await writeFile(`${target}.absent`, '', 'utf8')
    return
  }
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, contents, 'utf8')
}

function localeEntries() {
  return {
    './locale/en.json': './locale/en.json',
    './locale/ru.json': './locale/ru.json',
  }
}

function withLocaleExports(exportsField) {
  const base = typeof exportsField === 'string'
    ? { '.': exportsField }
    : exportsField !== null && typeof exportsField === 'object'
      ? { ...exportsField }
      : {}
  for (const [key, value] of Object.entries(localeEntries())) {
    if (base[key] === undefined) base[key] = value
  }
  return base
}

function localeDocument(text) {
  return `${JSON.stringify({ meta: { title: text.title, description: text.description } }, null, 2)}\n`
}

async function main() {
  const { mode, profile } = parseArgs(process.argv.slice(2))
  const catalogs = await loadCatalogs()
  const require = createRequire(join(profile, 'package.json'))
  const report = { mode, profile, packages: [] }

  for (const packageName of Object.keys(catalogs.ru)) {
    const manifestPath = require.resolve(`${packageName}/package.json`)
    const packageDir = dirname(manifestPath)
    const entry = { package: packageName, status: 'ok', actions: [] }

    const manifestRaw = await readFile(manifestPath, 'utf8')
    const manifest = JSON.parse(manifestRaw)
    const locales = { en: catalogs.en[packageName], ru: catalogs.ru[packageName] }
    const expected = Object.fromEntries(
      Object.entries(locales).map(([lang, text]) => [lang, localeDocument(text)]),
    )
    const exportsNext = withLocaleExports(manifest.exports)
    const exportsChanged = JSON.stringify(exportsNext) !== JSON.stringify(manifest.exports ?? {})

    if (mode === 'revert') {
      const backupDir = backupDirFor(packageName)
      if (!existsSync(backupDir)) {
        entry.status = 'skipped'
        report.packages.push(entry)
        continue
      }
      const manifestBackup = join(backupDir, 'package.json')
      if (existsSync(manifestBackup)) {
        await cp(manifestBackup, manifestPath)
        entry.actions.push('restore package.json')
      }
      for (const lang of Object.keys(locales)) {
        const file = join(packageDir, 'locale', `${lang}.json`)
        const backup = join(backupDir, 'locale', `${lang}.json`)
        if (existsSync(`${backup}.absent`)) {
          await rm(file, { force: true })
          entry.actions.push(`remove locale/${lang}.json`)
        } else if (existsSync(backup)) {
          await mkdir(dirname(file), { recursive: true })
          await cp(backup, file)
          entry.actions.push(`restore locale/${lang}.json`)
        }
      }
      await rm(backupDir, { recursive: true, force: true })
      report.packages.push(entry)
      continue
    }

    // Проверяем и (в apply) приводим файлы к ожидаемому виду.
    const problems = []
    if (exportsChanged) problems.push('package.json exports without locale paths')
    for (const [lang, text] of Object.entries(expected)) {
      const file = join(packageDir, 'locale', `${lang}.json`)
      const current = await readOptional(file)
      if (current !== text) problems.push(`locale/${lang}.json differs`)
    }

    if (mode === 'check') {
      entry.status = problems.length === 0 ? 'ok' : 'drift'
      entry.problems = problems
      report.packages.push(entry)
      continue
    }

    if (problems.length === 0) {
      entry.status = 'current'
      report.packages.push(entry)
      continue
    }

    await backupOnce(packageName, packageDir, manifestPath)
    for (const lang of Object.keys(locales)) {
      await backupOnce(packageName, packageDir, join(packageDir, 'locale', `${lang}.json`))
    }
    if (exportsChanged) {
      manifest.exports = exportsNext
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
      entry.actions.push('package.json exports += ./locale/{en,ru}.json')
    }
    for (const [lang, text] of Object.entries(expected)) {
      const file = join(packageDir, 'locale', `${lang}.json`)
      const current = await readOptional(file)
      if (current === text) continue
      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, text, 'utf8')
      entry.actions.push(`write locale/${lang}.json`)
    }
    entry.status = 'patched'
    report.packages.push(entry)
  }

  const summary = {
    patched: report.packages.filter(entry => entry.status === 'patched').length,
    current: report.packages.filter(entry => entry.status === 'current').length,
    drift: report.packages.filter(entry => entry.status === 'drift').length,
    skipped: report.packages.filter(entry => entry.status === 'skipped').length,
  }
  console.log(JSON.stringify({ ...report, summary }, null, 2))

  if (mode === 'check' && summary.drift > 0) process.exitCode = 1
}

await main()
