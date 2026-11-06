/**
 * Russian dictionary for the `command` namespace owned by
 * `@deepseek-ai/dsh-client-ui-commands`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'command'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'section.add': 'Добавить',
  'section.commands': 'Команды',
  'label.goal': 'Цель',
  'label.plan': 'План',
  'label.feedback': 'Отзыв',
  'label.compact': 'Сжатие',
  'label.permission': 'Разрешения',
  'label.export': 'Экспорт',
  'description.goal': 'Задать или просмотреть цель длительной задачи',
  'description.plan': 'Войти в режим планирования или выйти из него',
  'description.feedback': 'Отправить отзыв об этой сессии',
  'description.compact': 'Сжать предыдущую историю диалога',
  'description.permission': 'Переключить пресет разрешений (режим песочницы и политика подтверждений)',
  'description.export': 'Скачать журнал этой сессии в виде ZIP-архива',
  'token.goal': 'цель',
  'token.plan': 'план',
  'token.feedback': 'отзыв',
  'token.compact': 'сжатие',
  'token.permission': 'разрешения',
  'token.export': 'экспорт',
  'search.placeholder': 'Поиск…',
  'search.aria': 'Фильтровать варианты',
  'status.loading': 'Загрузка вариантов…',
  'status.applying': 'Применение…',
  'status.empty': 'Ничего не найдено',
  'overlay.aria': 'Варианты /{command}',
  'listbox.aria': 'Совпадения /{command}',
  'notice.attachmentsUnsupported': '/{command} не принимает вложения; сначала удалите их',
}
