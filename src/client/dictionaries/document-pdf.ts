/**
 * Russian dictionary for the `sidebarPdf` namespace owned by
 * `@deepseek-ai/dsh-client-ui-sidebar-documentpreview`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'sidebarPdf'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'zoomControls': 'Управление масштабированием',
  'zoomMenu': 'Выбрать масштаб',
  'zoomOut': 'Отдалить',
  'zoomIn': 'Приблизить',
  'zoomFitWidth': 'Подогнать по ширине',
  'zoomValue': '{percent}%',
  'title': 'PDF',
  'pageImage': 'PDF, страница {page}',
  'loading': 'Чтение…',
  'rendering': 'Отрисовка страницы…',
  'failed': 'Не удалось отобразить PDF: {message}',
  'password': 'Этот PDF защищён паролем; предпросмотр таких файлов не поддерживается.',
  'workerFailed': 'Процесс отрисовки PDF не смог продолжить работу. Повторите попытку.',
  'unsupported': 'Для предпросмотра PDF требуется полное содержимое файла.',
  'retry': 'Повторить',
}
