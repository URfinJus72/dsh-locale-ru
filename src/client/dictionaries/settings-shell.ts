/**
 * Russian dictionary for the `settings.shell` namespace owned by
 * `@deepseek-ai/dsh-client-ui-settings-shell`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'settings.shell'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'title': 'Оболочка',
  'description': 'Ограничьте время выполнения каждой команды и объём её вывода.',
  'timeoutMs': 'Тайм-аут команды (мс)',
  'timeoutMsHint': 'Сколько времени одна команда может выполняться до принудительного завершения.',
  'maxOutputBytes': 'Лимит вывода на поток (байт)',
  'maxOutputBytesHint': 'Вывод сверх этого лимита сохраняется во временный файл, а не теряется.',
  'overridden': 'Перекрыто',
  'reset': 'Сбросить к значению по умолчанию',
  'readOnly': 'В этом развёртывании настройки хранятся только для чтения.',
  'unavailable': 'Этот плагин не загружен, поэтому сейчас его нельзя настроить.',
  'save': 'Сохранить',
  'saving': 'Сохранение…',
  'saveFailed': 'Развёртывание не приняло эти значения; они оставлены для исправления.',
  'invalidNumber': 'Введите число или оставьте поле пустым, чтобы использовать значение по умолчанию.',
}
