/**
 * Russian dictionary for the `sidebarBrowser` namespace owned by
 * `@deepseek-ai/dsh-client-ui-sidebar-browser`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'sidebarBrowser'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'type.label': 'Браузер',
  'guide.title': 'Браузер',
  'guide.description': 'Просмотр HTTP(S) страниц',
  'shortcut.noSession': 'Откройте сессию сначала',
  'address.placeholder': 'Введите HTTP(S) адрес',
  'address.changed': 'URL изменился',
  'back': 'Назад',
  'forward': 'Вперёд',
  'reload': 'Обновить',
  'go': 'Перейти',
  'external': 'Открыть в системном браузере',
  'sandbox.disable': 'Отключить ограничения песочницы',
  'sandbox.enable': 'Восстановить ограничения песочницы',
  'sandbox.warning': 'Ограничения песочницы отключены; страница может перенаправлять приложение верхнего уровня и использовать загрузки, модальные диалоги и блокировку ввода.',
  'start': 'Введите HTTP(S) адрес, чтобы начать просмотр',
  'loading': 'Открытие…',
  'restore.previous': 'Открыто ранее',
  'restore.action': 'Восстановить страницу',
  'error.empty': 'Введите адрес.',
  'error.invalid': 'Этот адрес недействителен или слишком длинный.',
  'error.protocol': 'Поддерживаются только адреса HTTP и HTTPS; для локальных файлов используйте предпросмотр документа.',
  'error.credentials': 'Адрес не может содержать имя пользователя или пароль.',
  'error.application-origin': 'Во встроенном браузере нельзя открыть само приложение DSH.',
  'load.failed': 'Страницу не удалось загрузить; обновите или откройте её в системном браузере.',
  'load.failed.detail': 'Ошибка загрузки страницы ({code}): {description}',
  'address.unknown': 'Страница перешла; данный хост не может прочитать новый URL.',
}
