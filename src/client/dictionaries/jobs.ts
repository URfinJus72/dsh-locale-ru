/**
 * Russian dictionary for the `job` namespace owned by
 * `@deepseek-ai/dsh-client-ui-jobs`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'job'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'count.live.one': '{count} фоновая задача выполняется',
  'count.live.other': '{count} фоновых задач выполняется',
  'count.live.few': '{count} фоновые задачи выполняются',
  'count.live.many': '{count} фоновых задач выполняются',
  'count.idle.one': '{count} фоновая задача',
  'count.idle.other': '{count} фоновых задач',
  'count.idle.few': '{count} фоновые задачи',
  'count.idle.many': '{count} фоновых задач',
  'list.aria': 'Фоновые задачи',
  'section.live': 'Выполняется',
  'section.settledCount': 'Завершено {count}',
  'section.clear': 'Очистить',
  'row.expandAria': 'Показать вывод {label}',
  'row.collapseAria': 'Скрыть вывод {label}',
  'kill.stop': 'Остановить задачу {label}',
  'kill.confirm': 'Нажмите ещё раз для подтверждения',
  'kill.confirmAction': 'Подтвердить остановку',
  'kill.failed': 'Не удалось остановить',
  'status.running': 'выполняется',
  'status.stopping': 'останавливается',
  'status.completed': 'завершено',
  'status.killed': 'отменено',
  'status.failed': 'ошибка',
  'duration.seconds': '{seconds} с',
  'duration.minutes': '{minutes} мин {seconds} с',
  'duration.hours': '{hours} ч {minutes} мин',
  'duration.title.live': 'Выполняется {duration}',
  'duration.title.done': 'Заняло {duration}',
  'output.gap': '… ранее пропущенный вывод …',
  'output.error': 'Поток вывода прерван: {error}',
  'terminal.signal': 'сигнал {signal}',
  'terminal.exitCode': 'код {code}',
  'terminal.noExitCode': 'нет кода выхода',
  'terminal.commandLine': 'Командная строка {n}',
  'terminal.running': 'запущен',
  'terminal.failed': 'ошибка',
  'terminal.done': 'завершено',
  'terminal.copy': 'Копировать',
  'terminal.copied': 'Скопировано',
  'terminal.noOutput': '(нет вывода)',
  'terminal.collapse': 'Свернуть',
  'terminal.collapseAria': 'Свернуть вывод',
  'terminal.expand': 'Показать ещё строк: {n}',
  'terminal.expandAria': 'Развернуть свёрнутые строки вывода ({n})',
}
