/**
 * Russian dictionary for the `directory-browser` namespace owned by
 * `the shared directory browser`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'directory-browser'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'browser.title': 'Выбор каталога рабочей области',
  'browser.home': 'Домашний каталог',
  'browser.newFolder': 'Новая папка',
  'browser.folderName': 'Имя папки',
  'browser.createIn': 'Новая папка в «{name}»',
  'browser.untitledFolder': 'Папка без названия',
  'browser.create': 'Создать',
  'browser.cancel': 'Отмена',
  'browser.open': 'Открыть',
  'browser.editPath': 'Изменить путь',
  'browser.loading': 'Загрузка…',
  'browser.truncated': 'Слишком много папок; показано только начало списка.',
  'browser.showHidden': 'Показывать скрытые файлы',
}
