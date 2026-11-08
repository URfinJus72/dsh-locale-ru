/**
 * Russian dictionary for the `approval` namespace owned by
 * `@deepseek-ai/dsh-client-ui-approval`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'approval'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'waiting': 'Ожидание разрешения',
  'detail.aria': 'Сведения о разрешении',
  'escalation': 'Инструмент {toolName} запрашивает выполнение с повышенными правами',
  'reject': 'Отклонить',
  'allow': 'Разрешить',
  'allowOnce': 'Разрешить один раз',
  'allowAlways': 'Всегда разрешать',
}
