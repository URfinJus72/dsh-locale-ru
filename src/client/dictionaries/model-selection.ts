/**
 * Russian dictionary for the `model` namespace owned by
 * `@deepseek-ai/dsh-client-ui-model-selection`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'model'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'provider.account': 'Аккаунт DeepSeek',
  'command.label': 'Модель',
  'command.description': 'Выбрать модель для этой беседы',
  'option.loadError': 'Не удалось загрузить каталог: {message}',
  'trigger.fallback': 'Выбрать модель',
  'trigger.loading': 'Загрузка моделей…',
  'trigger.selectAria': 'Выбрать модель',
  'trigger.aria': 'Выбрать модель, текущая {model}',
  'trigger.ariaEffort': 'Выбрать модель, текущая {model}, уровень рассуждения {effort}',
  'menu.aria': 'Модель и уровень рассуждения',
  'menu.model': 'Модель',
  'menu.effort': 'Уровень рассуждения',
  'effort.providerDefault': 'По умолчанию',
  'status.loading': 'Обновлёние списка моделей…',
  'error.action': 'Операция с моделью не удалась: {message}',
  'error.sessionInUse': 'Эта сессия уже занята, возможно, другим запущенным экземпляром DSH (например, dsh web или настольным приложением). Завершите другие запущенные экземпляры DSH и повторите попытку.',
  'action.reload': 'Перезагрузить',
  'warning.groupLoad': 'Не удалось загрузить {name}: {message}',
  'search.placeholder': 'Поиск моделей…',
  'search.clear': 'Очистить поиск',
  'search.empty': 'Нет подходящих моделей.',
  'empty.models': 'Нет доступных моделей.',
  'empty.efforts': 'Эта модель не предоставляет уровней рассуждения.',
}
