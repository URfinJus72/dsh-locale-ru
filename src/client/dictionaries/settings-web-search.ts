/**
 * Russian dictionary for the `settings.webSearch` namespace owned by
 * `@deepseek-ai/dsh-client-ui-settings-web-search`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'settings.webSearch'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'title': 'Веб-поиск',
  'description': 'Настроить провайдера поиска DeepSeek.',
  'apiKey': 'API-ключ',
  'apiKeyHint': 'Хранится вне файла настроек. Оставьте пустым, чтобы сохранить текущий ключ.',
  'apiKeySet': 'Ключ настроен.',
  'apiKeyUnset': 'API-ключ не настроен; только разговоры с моделью DeepSeek Account могут использовать поиск через стандартный эндпоинт.',
  'baseUrl': 'Конечная точка',
  'baseUrlHint': 'Оставьте пустым, чтобы использовать значение провайдера по умолчанию.',
  'maxUses': 'Максимум поисков на запрос',
  'maxUsesHint': 'Сколько раз один запрос может искать, прежде чем должен ответить.',
  'overridden': 'Перекрыто',
  'reset': 'Сбросить к значению по умолчанию',
  'readOnly': 'В этом развёртывании настройки хранятся только для чтения.',
  'unavailable': 'Этот плагин не загружен, поэтому сейчас его нельзя настроить.',
  'save': 'Сохранить',
  'saving': 'Сохранение…',
  'saveFailed': 'Развёртывание не приняло эти значения; они оставлены для исправления.',
  'invalidNumber': 'Введите число или оставьте поле пустым, чтобы использовать значение по умолчанию.',
}
