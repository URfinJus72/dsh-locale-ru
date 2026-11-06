/**
 * Russian dictionary for the `settings.permission` namespace owned by
 * `@deepseek-ai/dsh-client-ui-permission-presets`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'settings.permission'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'title': 'Разрешения',
  'description': 'Выбрать режим разрешений по умолчанию для новых сессий',
  'loading': 'Загрузка',
  'unavailable': 'Недоступно',
  'preset.readOnly': 'Только чтение',
  'preset.workspaceWrite': 'Запись в рабочую область',
  'preset.fullAccess': 'Полный доступ',
  'confirm.title': 'Включить полный доступ?',
  'confirm.description': 'Полный доступ сокращает количество подтверждений в новых сессиях и позволяет напрямую выполнять больше действий, включая конфиденциальные операции, изменение файлов и внешние команды. Используйте его, только если доверяете последующим задачам.',
  'confirm.acknowledge': 'Я понимаю риски и хочу продолжить',
  'confirm.cancel': 'Отмена',
  'confirm.enable': 'Включить полный доступ',
}
