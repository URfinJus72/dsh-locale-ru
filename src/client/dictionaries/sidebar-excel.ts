/**
 * Russian dictionary for the `sidebarExcel` namespace owned by
 * `@deepseek-ai/dsh-client-ui-sidebar-documentpreview`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'sidebarExcel'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'title': 'Таблица',
  'language': 'ru',
  'loading': 'Отображение документа…',
  'invalid': 'Не удалось открыть эту таблицу. Проверьте её формат, содержимое или защиту паролем.',
  'tooLarge': 'Размер этого файла превышает лимит предпросмотра.',
  'timeout': 'Открытие файла завершилось по таймауту. Попробуйте более мелкий файл.',
  'encoding': 'Не удалось прочитать кодировку этого текста. Сохраните файл как UTF-8 или UTF-16 с BOM и повторите попытку.',
  'formulaWarning': 'Эта книга содержит формулы. Отображаемые результаты могут отсутствовать или быть неточными.',
  'unsupportedNotice': 'Этот предпросмотр не поддерживает {features} в этом файле. Откройте его в системном приложении для полного опыта.',
  'charts': 'Диаграммы',
  'images': 'Изображения',
  'shapes': 'Формы',
  'conditionalFormatting': 'Условное форматирование',
  'featureSeparator': ', ',
  'retry': 'Повторить',
}
