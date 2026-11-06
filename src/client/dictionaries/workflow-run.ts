/**
 * Russian dictionary for the `workflowRun` namespace owned by
 * `@deepseek-ai/dsh-client-ui-workflow-run`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'workflowRun'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'run.title': '{name}',
  'run.members.one': '{count} член',
  'run.members.other': '{count} членов',
  'run.members.few': '{count} члена',
  'run.members.many': '{count} членов',
  'run.empty': 'Члены не запущены',
  'phase.unassigned': 'Вне фаз',
  'phase.empty': 'Пустое название фазы',
  'statusCount.running': 'Выполняется {count}',
  'statusCount.completed': 'Завершено {count}',
  'statusCount.failed': 'Ошибка {count}',
  'statusCount.cancelled': 'Отменено {count}',
  'statusCount.interrupted': 'Прервано {count}',
  'member.empty': 'Пустое имя члена',
  'member.open': 'Открыть {name}',
  'status.running': 'Выполняется',
  'status.completed': 'Завершено',
  'status.failed': 'Ошибка',
  'status.cancelled': 'Отменено',
  'status.interrupted': 'Прервано',
}
