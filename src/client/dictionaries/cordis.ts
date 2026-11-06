/**
 * Russian dictionary for the `cordis` namespace owned by
 * `@deepseek-ai/dsh-client-ui-cordis`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'cordis'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'row.defineTitle': 'Зарегистрировать плагин Cordis',
  'a11y.preparing': 'Подготовка вызова инструмента Cordis',
  'row.runTitle': 'Запустить плагин Cordis',
  'row.updateTitle': 'Обновить плагин Cordis',
  'row.stopTitle': 'Остановить плагин Cordis',
  'row.removeTitle': 'Удалить плагин Cordis',
  'purpose.missing': '(назначение не указано)',
  'status.idle': 'Готов',
  'status.awaitingApproval': 'Ожидает разрешения',
  'status.failed': 'Ошибка выполнения',
  'status.clientPending': 'Клиентская часть готова к активации',
  'status.running': 'Выполняется',
  'status.removed': 'Удалён',
  'status.superseded': 'Есть более новый запуск',
  'run.removed': 'Этот пакет больше не существует',
  'run.superseded': 'Ниже доступна более новая карточка запуска',
  'panel.hint': 'Управление запусками находится в панели Cordis над настройками',
  'panel.plugins.aria': 'Плагины Cordis',
  'panel.approvals.aria': 'Разрешения Cordis',
  'panel.trigger': 'Плагины Cordis',
  'panel.runningCount': 'Выполняется: {count}',
  'panel.title': 'Плагины Cordis',
  'panel.empty': 'Плагины ещё не определены',
  'panel.loading': 'Загрузка…',
  'panel.readFailed': 'Не удалось прочитать список плагинов: {message}',
  'panel.group.current': 'Текущая сессия',
  'panel.group.others': 'Другие сессии',
  'panel.version': 'Версия',
  'panel.current': 'Текущий: {packageId}',
  'panel.next': 'К переключению: {packageId}',
  'action.approve': 'Разрешить',
  'action.approveOnce': 'Разрешить только эту версию',
  'action.approvePlugin': 'Разрешить будущие версии этого плагина',
  'action.decline': 'Отклонить',
  'action.run': 'Запустить',
  'action.stop': 'Остановить',
  'action.remove': 'Удалить',
  'action.retry': 'Повторить',
  'action.rollback': 'Откатить',
  'action.inspect': 'Просмотр',
  'render.failedAbdicated': 'Ошибка отрисовки в {slot}; восстановлен стандартный интерфейс:',
  'render.failedHeld': 'Ошибка отрисовки в {slot}:',
  'a11y.defining': 'Определение плагина',
  'a11y.failed': 'Ошибка определения',
  'a11y.stopped': 'Определение прервано',
  'body.source': 'Код плагина',
  'body.hostCode': 'Серверная часть',
  'body.clientCode': 'Клиентская часть',
  'body.output': 'Результат',
  'body.copy': 'Копировать',
  'body.copied': 'Скопировано',
}
