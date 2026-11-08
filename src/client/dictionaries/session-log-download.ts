/**
 * Russian dictionary for the `session-log-download` namespace owned by
 * `@deepseek-ai/dsh-session-log-export`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'session-log-download'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'header.more': 'Другие действия',
  'menu.copyMarkdown': 'Скопировать сессию как Markdown',
  'menu.download': 'Скачать журнал сессии',
  'menu.feedback': 'Обратная связь',
  'toast.copied': 'Сессия скопирована как Markdown.',
  'toast.preparationFailed': 'Не удалось прочитать сессию для копирования. Повторите попытку.',
  'toast.clipboardFailed': 'Не удалось записать в буфер обмена. Проверьте разрешение буфера обмена и повторите попытку.',
  'dialog.preparingTitle': 'Экспорт сессии',
  'dialog.preparingDescription': 'Подготовка ZIP-файла с текущей сессией, её подсессиями и вложениями.',
  'dialog.successTitle': 'Скачивание сессии началось',
  'dialog.successDescription': 'Браузер скачивает ZIP-файл сессии.',
  'dialog.errorTitle': 'Не удалось экспортировать сессию',
  'dialog.close': 'Закрыть',
  'dialog.commandFailed': 'Не удалось запустить экспорт сессии.',
}
