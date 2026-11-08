/**
 * Russian dictionary for the `settings.theme` namespace owned by
 * `@deepseek-ai/dsh-client-ui-theme`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'settings.theme'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'appearance.title': 'Внешний вид',
  'appearance.light': 'Светлая',
  'appearance.dark': 'Тёмная',
  'appearance.system': 'Системная',
  'fontSize.text.title': 'Размер шрифта',
  'fontSize.text.description': 'Влияет только на содержимое диалога',
  'fontSize.text.increase': 'Увеличить размер шрифта',
  'fontSize.text.decrease': 'Уменьшить размер шрифта',
  'fontSize.code.title': 'Размер шрифта кода',
  'fontSize.code.description': 'Используется для блоков кода, строчного кода и вывода инструментов',
  'fontSize.code.increase': 'Увеличить размер шрифта кода',
  'fontSize.code.decrease': 'Уменьшить размер шрифта кода',
  'fontSize.terminal.title': 'Размер шрифта терминала',
  'fontSize.terminal.description': 'Используется для терминала боковой панели',
  'fontSize.terminal.increase': 'Увеличить размер шрифта терминала',
  'fontSize.terminal.decrease': 'Уменьшить размер шрифта терминала',
  'fontSize.unit': 'px',
  'fontFamily.text.title': 'Шрифт текста',
  'fontFamily.text.description': 'Используется для интерфейса и текста разговора. Разделяйте шрифты запятыми; оставьте пустым для использования по умолчанию',
  'fontFamily.code.title': 'Шрифт кода',
  'fontFamily.code.description': 'Используется для блоков кода, вставленного кода и вывода инструментов. Разделяйте шрифты запятыми; оставьте пустым для использования по умолчанию',
  'fontFamily.terminal.title': 'Шрифт терминала',
  'fontFamily.terminal.description': 'Используется для терминала в боковой панели. Разделяйте шрифты запятыми; оставьте пустым для использования по умолчанию',
  'fontFamily.placeholder': 'По умолчанию',
  'fontSize.more': 'Больше настроек шрифта',
}
