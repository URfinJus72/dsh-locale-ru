/**
 * Russian dictionary for the `settings` namespace owned by
 * `@deepseek-ai/dsh-client-ui-settings-general`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'settings'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'trigger': 'Настройки',
  'shortcut.open': 'Открыть настройки',
  'desktop.update.available': 'Новая версия',
  'desktop.update.checking': 'Проверка обновлёний…',
  'desktop.update.progress': '{percent}%…',
  'desktop.update.verifying': 'Проверка файлов обновлёния…',
  'desktop.update.installing': 'Подготовка к перезапуску…',
  'desktop.update.ready': 'Установить и перезапустить',
  'desktop.update.retry': 'Повторить обновлёние',
  'desktop.update.versionDetail': '{label} — V{version}',
  'desktop.update.downloadDetail': 'Загрузка обновлёния: {percent}%\nЦелевая версия: V{version}',
  'desktop.update.checkFailed': 'Не удалось проверить обновлёния, попробуйте позже.',
  'desktop.update.downloadFailed': 'Не удалось загрузить обновлёние, повторите попытку.',
  'desktop.update.installFailed': 'Не удалось установить обновлёние, попробуйте позже.',
  'desktop.update.checkNetworkFailed': 'Не удалось проверить обновлёния, попробуйте позже. Соединение прервано, проверьте сеть и повторите попытку.',
  'desktop.update.downloadNetworkFailed': 'Не удалось загрузить обновлёние, повторите попытку. Соединение прервано, проверьте сеть и повторите попытку.',
  'desktop.update.installNetworkFailed': 'Не удалось установить обновлёние, попробуйте позже. Соединение прервано, проверьте сеть и повторите попытку.',
  'desktop.update.stopFailed': 'Не удалось безопасно остановить задачи, обновлёние не установлено. Попробуйте позже.',
  'desktop.update.tasksChanged': 'Запущены новые задачи, подтвердите обновлёние ещё раз.',
  'desktop.update.tasksUnavailable': 'Не удалось проверить состояние задач, повторите обновлёние, когда рабочая область будет готова.',
  'title': 'Настройки',
  'close': 'Закрыть',
  'openDocument': 'Открыть файл конфигурации',
  'openDocument.error': 'Не удалось открыть файл конфигурации',
  'general.nav': 'Общие настройки',
  'general.currentVersion': 'Текущая версия: {version}',
  'developerTools.title': 'Показать режим программирования',
  'developerTools.error': 'Не удалось сохранить. Попробуйте снова.',
  'developerTools.description': 'Показывает траекторию, различия кода и все предустановки агента',
  'connection.error': 'Сбой подключения, обновите страницу',
  'connection.connecting': 'Переподключение',
  'connection.connected': 'Подключено',
  'connection.reconnect': 'Сбой подключения, нажмите, чтобы переподключиться',
  'connection.restart': 'Подключение прервано, идёт повторная попытка, нажмите, чтобы переподключиться',
}
