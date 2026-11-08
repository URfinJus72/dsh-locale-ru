/**
 * Russian dictionary for the `settings.pluginInventory` namespace owned by
 * `@deepseek-ai/dsh-client-ui-settings-plugin-inventory`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'settings.pluginInventory'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'tab': 'Список плагинов',
  'loading': 'Чтение плагинов…',
  'clientSyncing': 'Синхронизация плагинов этой страницы…',
  'clientSyncFailed': 'Плагины этой страницы не удалось синхронизировать; состояние включения на сервере не изменилось.',
  'clientSyncRetry': 'Повторить синхронизацию страницы',
  'error': 'Плагины временно недоступны.',
  'metadataError': 'Ошибка метаданных пакета: {error}',
  'retry': 'Повторить',
  'search': 'Поиск плагинов',
  'empty': 'Плагинов нет.',
  'emptySearch': 'Нет подходящих плагинов.',
  'presetTitle': 'Плагины сессии',
  'presetSubtitle': 'Составляются для каждой сессии пресетами агента',
  'switcherLabel': 'Выберите пресет агента для просмотра',
  'presetOptionDefault': '{name} (по умолчанию)',
  'presetOptionBroken': '{name} (ошибка загрузки)',
  'globalTitle': 'Глобальные плагины',
  'globalSubtitle': 'Общие для системы и всех сессий',
  'presetProvidedDetail': 'Отключён глобально, пресеты агента предоставляют его для каждой сессии',
  'enabledIn': 'Включён в',
  'matchesInOtherPresets': 'Ещё {count} совпадений в других пресетах: ',
  'enabledTag': 'Включён',
  'disabledTag': 'Отключён',
  'conditionalTag': 'Условно',
  'presetEnabledTag': 'Включён в пресетах',
  'failedTag': 'Ошибка запуска',
  'moduleLabel': 'Полное имя',
  'fromPreset': 'Из',
  'condition': 'Условие отключения',
  'configuration': 'Состояние конфигурации',
  'runtime': 'Состояние выполнения',
  'unobserved': 'Не запущен',
  'pending': 'Ожидание зависимостей',
  'loadingPhase': 'Загрузка',
  'active': 'Работает',
  'failed': 'Ошибка запуска',
  'unloading': 'Выгрузка',
}
