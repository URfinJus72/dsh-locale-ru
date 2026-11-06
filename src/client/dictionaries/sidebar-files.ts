/**
 * Russian dictionary for the `sidebarFiles` namespace owned by
 * `@deepseek-ai/dsh-client-ui-sidebar-files`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'sidebarFiles'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'shortcut.noSession': 'Сначала выберите сессию',
  'type.label': 'Файлы',
  'guide.title': 'Файлы рабочей области',
  'guide.description': 'Просмотр файлов рабочей области этой сессии',
  'loading': 'Чтение…',
  'empty': 'Пустая папка',
  'truncated': 'Слишком много элементов, показана только часть.',
  'noWorkspace': 'У этой сессии нет папки рабочей области.',
  'reload': 'Перечитать',
  'autoRefresh': 'Автообновлёние',
  'autoRefresh.enable': 'Включить автообновлёние',
  'autoRefresh.disable': 'Отключить автообновлёние',
  'entry.other': 'Это не файл и не папка, открыть нельзя.',
  'error.notFound': 'Этой папки больше нет. Возможно, она была перемещена или удалена.',
  'error.outsideWorkspace': 'Эта папка находится вне рабочей области, боковая панель не будет её читать.',
  'error.notDirectory': 'Это не папка.',
  'error.unavailable': 'Ошибка чтения: {message}',
}
