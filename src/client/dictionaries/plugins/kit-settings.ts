/**
 * Russian dictionary for the `kit-settings` namespace owned by
 * `@hyzyn/dsh-kit-settings`. Key parity with the plugin snapshot is asserted by
 * tests/plugins.client.spec.ts.
 */

/** Registered namespace id. */
export const ns = 'kit-settings'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'error.render': 'Не удалось отрендерить запись конфигурации: ',
  'list.empty': 'Доступных записей конфигурации нет — сначала установите хотя бы один плагин kit.',
  'section.intro': 'Записи конфигурации для семейства dsh-plugin-kit: env, журналы, MCP, Prompt, Profile, RSS, Codegraph, Docker и панель терминала.',
  'section.title': 'Конфигурация плагинов',
}
