/**
 * Russian dictionary for the `goal` namespace owned by
 * `@deepseek-ai/dsh-client-ui-goal`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'goal'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'phase.active': 'Активная цель',
  'phase.active.disarmed': 'Неактивная цель',
  'phase.paused': 'Приостановленная цель',
  'phase.blocked': 'Заблокированная цель',
  'objective.aria': 'Содержимое цели',
  'commandInput.aria': 'Ввод команды',
  'action.save': 'Сохранить цель',
  'action.cancel': 'Отменить изменения',
  'action.pause': 'Приостановить цель',
  'action.resume': 'Продолжить цель',
  'action.edit': 'Изменить цель',
  'action.clear': 'Очистить цель',
}
