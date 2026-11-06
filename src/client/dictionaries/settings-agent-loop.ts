/**
 * Russian dictionary for the `settings.agentLoop` namespace owned by
 * `@deepseek-ai/dsh-client-ui-settings-agent-loop`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'settings.agentLoop'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'title': 'Цикл агента',
  'description': 'Управление тем, как агент выполняет вызовы инструментов.',
  'maxParallel': 'Параллельные вызовы инструментов',
  'maxParallelHint': 'Верхняя граница одновременно выполняемых безопасных для параллелизма вызовов в одном шаге.',
  'overridden': 'Перекрыто',
  'reset': 'Сбросить к значению по умолчанию',
  'readOnly': 'В этом развёртывании настройки хранятся только для чтения.',
  'unavailable': 'Этот плагин не загружен, поэтому сейчас его нельзя настроить.',
  'save': 'Сохранить',
  'saving': 'Сохранение…',
  'saveFailed': 'Развёртывание не приняло эти значения; они оставлены для исправления.',
  'invalidNumber': 'Введите число или оставьте поле пустым, чтобы использовать значение по умолчанию.',
}
