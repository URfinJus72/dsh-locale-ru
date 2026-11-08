/**
 * Russian dictionary for the `reference` namespace owned by
 * `@deepseek-ai/dsh-client-ui-reference`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'reference'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'section.files': 'Файлы и папки',
  'section.subagents': 'Субагенты',
  'section.sessions': 'Сессии',
  'candidate.noCwd': '(нет рабочего каталога)',
  'crumb.root': 'Рабочая область',
  'fileOpen.title': 'Не удалось открыть файл',
  'fileOpen.failed': 'Не удалось открыть «{path}». Попробуйте снова или закройте это сообщение.',
  'fileOpen.close': 'Закрыть',
  'fileOpen.retry': 'Повторить',
  'time.now': 'сейчас',
  'time.minutes': '{n} мин',
  'time.hours': '{n} ч',
  'time.days': '{n} дн.',
  'time.months': '{n} мес.',
  'time.years': '{n} г.',
}
