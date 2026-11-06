/**
 * Russian dictionary for the `sidebarOffice` namespace owned by
 * `@deepseek-ai/dsh-client-ui-sidebar-documentpreview`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'sidebarOffice'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'title': 'Документ Office',
  'loading': 'Чтение…',
  'retry': 'Повторить',
  'viewMissingFonts': 'Не хватает шрифтов: {count}. Нажмите для просмотра.',
  'missingFontsTitle': 'Отсутствующие шрифты',
  'missingFontsDescription': 'Эти шрифты недоступны для данного предпросмотра. Текст и вёрстка могут отличаться от исходного документа.',
  'missingFontsCount': 'Шрифтов: {count}',
  'closeDetails': 'Закрыть сведения о шрифтах',
  'unavailable': 'Предпросмотр Office недоступен. Включите службу предпросмотра документов на компьютере, где работает DeepSeek Harness.',
  'invalid': 'Не удалось отобразить этот файл Office. Возможно, он повреждён, защищён паролем или имеет неверное расширение.',
  'tooLarge': 'Файл Office или преобразованный PDF превышает лимит размера предпросмотра. Уменьшите файл или измените конфигурацию предпросмотра.',
  'failed': 'Преобразование Office не дало пригодного PDF. Проверьте файл и повторите попытку.',
  'timeout': 'Время преобразования Office истекло. Повторите попытку.',
  'busy': 'Служба предпросмотра Office занята. Повторите попытку позже.',
  'changed': 'Файл изменился во время чтения. Откройте предпросмотр заново.',
}
