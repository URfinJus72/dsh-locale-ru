/**
 * Russian dictionary for the `permission.access` namespace owned by
 * `@deepseek-ai/dsh-client-ui-permission-presets`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'permission.access'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'mode': 'Режим доступа, текущий: {name}',
  'close': 'Закрыть',
  'preset.readOnly': 'Только чтение',
  'preset.workspaceWrite': 'Запись в рабочую область',
  'preset.fullAccess': 'Полный доступ',
  'confirm.title': 'Включить полный доступ?',
  'confirm.description': 'Полный доступ сокращает количество подтверждений и позволяет агенту напрямую выполнять больше действий, включая конфиденциальные операции, изменение файлов и внешние команды. Используйте его, только если доверяете текущей задаче.',
  'confirm.acknowledge': 'Я понимаю риски и хочу продолжить',
  'confirm.cancel': 'Отмена',
  'confirm.enable': 'Включить полный доступ',
  'auto.label': 'Автопроверка',
  'auto.badge': 'ЭКСП.',
  'auto.description': 'Запуск без песочницы с экспериментальной проверкой той же моделью каждого вызова нативного инструмента и внутреннего вызова PTC.',
  'auto.confirm.title': 'Включить автопроверку (экспериментально)?',
  'auto.confirm.description': 'Автопроверка работает без песочницы. Перед каждым вызовом нативного инструмента и внутренним вызовом PTC та же модель, что и у текущего агента, проверяет, разрешить ли его. Функция экспериментальная: она может ошибочно разрешить или запретить действия и расходует дополнительные токены.',
  'auto.confirm.acknowledge': 'Я понимаю эти риски и хочу продолжить',
  'auto.confirm.enable': 'Включить автопроверку',
}
