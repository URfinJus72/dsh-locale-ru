/**
 * Russian dictionary for the `skill` namespace owned by
 * `@deepseek-ai/dsh-client-ui-skill`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'skill'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'row.title': 'Навык',
  'row.running': 'Загрузка навыка',
  'row.preparing': 'Подготовка к загрузке навыка',
  'row.failed': 'Не удалось загрузить навык',
  'row.stopped': 'Загрузка навыка остановлена',
  'row.instructions': 'Инструкции',
  'row.inspect': 'Просмотр',
  'menu.userOnly': 'только для пользователя',
}
