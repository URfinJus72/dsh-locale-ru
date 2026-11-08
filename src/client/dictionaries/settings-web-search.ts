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
  'useSearchApi': 'Использовать новый API веб-поиска',
  'useSearchApiHint': 'По умолчанию отключено: поиск выполняется через DeepSeek Messages. Для новых функций и тарифов Web Search API см.',
  'searchGuide': 'Руководство по поиску и получению',
  'searchGuideUrl': 'https://api-docs.deepseek.com/guides/search',
  'apiKey': 'API-ключ',
  'apiKeyHint': 'Хранится вне файла настроек. Оставьте пустым, чтобы сохранить текущий ключ.',
  'apiKeySet': 'Ключ настроен.',
  'apiKeyUnset': 'API-ключ не настроен; только разговоры с моделью DeepSeek Account могут использовать поиск через стандартный эндпоинт.',
  'baseUrl': 'Конечная точка',
  'baseUrlHint': 'Оставьте пустым, чтобы использовать значение провайдера по умолчанию.',
  'searchApiBaseUrl': 'Базовый URL API поиска / получения',
  'searchApiBaseUrlHint': 'Укажите префикс API, например https://api.deepseek.com/v1/tools. Провайдер добавит /search или /fetch. Оставьте пустым для восстановления значения по умолчанию.',
  'maxUses': 'Максимум поисков на запрос',
  'maxUsesHint': 'Сколько раз один запрос может искать, прежде чем должен ответить.',
  'count': 'Результатов на поиск',
  'countHint': 'Возвращаемых результатов на запрос: целое число от 1 до 50, по умолчанию 10. Это контролирует количество результатов, а не количество поисковых запросов. web_search возвращает не более источников, чем его собственный лимит.',
  'overridden': 'Перекрыто',
  'reset': 'Сбросить к значению по умолчанию',
  'readOnly': 'В этом развёртывании настройки хранятся только для чтения.',
  'unavailable': 'Этот плагин не загружен, поэтому сейчас его нельзя настроить.',
  'save': 'Сохранить',
  'saving': 'Сохранение…',
  'saveFailed': 'Развёртывание не приняло эти значения; они оставлены для исправления.',
  'invalidNumber': 'Введите число или оставьте поле пустым, чтобы использовать значение по умолчанию.',
  'invalidCount': 'Введите целое число от 1 до 50 или оставьте пустым для использования значения по умолчанию.',
}
