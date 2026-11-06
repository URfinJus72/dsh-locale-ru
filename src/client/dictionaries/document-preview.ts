/**
 * Russian dictionary for the `sidebarDocumentPreview` namespace owned by
 * `@deepseek-ai/dsh-client-ui-sidebar-documentpreview`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'sidebarDocumentPreview'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'loading': 'Чтение…',
  'loadMore': 'Загрузить ещё',
  'changed': 'Файл изменился, показано прежнее содержимое.',
  'reloadNow': 'Перезагрузить',
  'reload': 'Прочитать файл заново',
  'autoRefresh': 'Автообновлёние',
  'autoRefresh.enable': 'Включить автообновлёние',
  'autoRefresh.disable': 'Отключить автообновлёние',
  'wrap.enable': 'Включить перенос строк',
  'wrap.disable': 'Выключить перенос строк',
  'wrap.aria': 'Перенос строк',
  'openWith': 'Открыть в',
  'viewer.text': 'Простой текст',
  'resourceUnavailable': 'Служба файловых ресурсов недоступна.',
  'rendererUnavailable': 'Предпросмотр {name} недоступен.',
  'unsupportedFile': 'Предпросмотр для этого типа файлов пока недоступен.',
  'error.notFound': 'Файл не найден. Возможно, он был перемещён или удалён.',
  'error.tooLarge': 'Содержимое страницы превышает лимит {limit} и не может быть прочитано.',
  'error.notText': 'Предпросмотр для этого типа файлов пока недоступен.',
  'error.notRegularFile': 'Это не обычный файл, отображать нечего.',
  'error.unavailable': 'Ошибка чтения: {message}',
  'retry': 'Повторить',
}
