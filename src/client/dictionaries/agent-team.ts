/**
 * Russian dictionary for the `agent-team` namespace owned by
 * `@deepseek-ai/dsh-experimental-client-ui-agent-team`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'agent-team'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'trigger': 'Команда агентов',
  'loading': 'Загрузка команды…',
  'unavailable': 'Команда недоступна',
  'failure': 'Неверная сохранённая запись команды: {message}',
  'empty': 'Общих задач пока нет',
  'roster': 'Участники',
  'tasks': 'Общие задачи',
  'model': 'Модель',
  'open': 'Открыть диалог с участником',
  'current': 'Текущий чат',
  'owner': 'Владелец',
  'unowned': 'Не назначен',
  'blockedBy': 'Зависит от',
  'writeScopes': 'Области записи',
  'ready': 'Готова',
  'blocked': 'Заблокирована зависимостями',
  'task.expand': 'Показать больше',
  'task.collapse': 'Показать меньше',
  'memberStatus.running': 'Выполняется',
  'memberStatus.inactive': 'Не запущен',
  'memberStatus.provisioning': 'Подготовка',
  'memberStatus.failed': 'Ошибка',
  'status.pending': 'Ожидает',
  'status.in_progress': 'В работе',
  'status.completed': 'Завершена',
}
