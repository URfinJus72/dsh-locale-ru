/**
 * Russian dictionary for the `sidebarTerminal` namespace owned by
 * `@deepseek-ai/dsh-client-ui-sidebar-terminal`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'sidebarTerminal'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'shortcut.noSession': 'Сначала выберите сессию',
  'recoveryFailed': 'Не удалось восстановить терминал: {message}',
  'retryRecovery': 'Повторить восстановление терминала',
  'shell': 'Выбрать командную оболочку',
  'shellLoading': 'Чтение списка оболочек…',
  'shellEmpty': 'Нет доступных командных оболочек',
  'description': 'Запуск команд в рабочей области сессии',
  'title': 'Терминал',
  'new': 'Создать терминал',
  'loading': 'Чтение окружения терминала…',
  'creating': 'Запуск…',
  'connecting': 'Подключение…',
  'disconnected': 'Подключение разорвано.',
  'reconnect': 'Переподключить',
  'readonly': 'Эта страница сейчас доступна только для чтения.',
  'control': 'Перехватить ввод',
  'closed': 'Терминал закрыт.',
  'exited': 'Процесс завершён ({code})',
  'failed': 'Ошибка терминала: {message}',
  'rename': 'Имя терминала',
  'unavailable': 'Недоступно',
  'retry': 'Повторить',
  'cleanupFailed': 'Не удалось завершить терминал «{title}»: {message}',
  'missingTerminal': 'Этого терминала больше нет, создайте новый терминал.',
  'inputFull': 'Буфер ввода заполнен, переподключитесь и повторите попытку.',
  'attachmentEnded': 'Подключение к терминалу завершено, переподключитесь.',
  'invalidOutput': 'Передача экрана терминала нарушена, переподключитесь.',
  'terminalLimit': 'Достигнут предел количества терминалов. Закройте неиспользуемые терминалы и повторите попытку. Завершённые терминалы также учитываются.',
}
