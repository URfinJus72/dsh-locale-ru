/**
 * Russian dictionary for the `subagent` namespace owned by
 * `@deepseek-ai/dsh-client-ui-subagent`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'subagent'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'duration.seconds': '{seconds} с',
  'duration.minutes': '{minutes} мин {seconds} с',
  'duration.hours': '{hours} ч {minutes} мин {seconds} с',
  'duration.days': '{days} д',
  'duration.daysHours': '{days} д {hours} ч',
  'duration.months': '~{months} мес.',
  'duration.monthsDays': '~{months} мес. {days} д',
  'duration.years': '~{years} г.',
  'duration.yearsMonths': '~{years} г. {months} мес.',
  'duration.exactDays': '{days} д {hours} ч {minutes} мин {seconds} с',
  'duration.exactTitle': 'Общая активная длительность: {duration}',
  'tokens.thousand': '{value}K',
  'tokens.million': '{value}M',
  'tokens.total': 'Токены: {value}',
  'loading.label': 'Загрузка субагентов…',
  'load.error': 'Не удалось загрузить субагентов',
  'retry': 'Повторить',
  'mode.oneShot': 'одноразовый',
  'mode.continuable': 'продолжаемый',
  'mode.unknown': 'неизвестный режим',
  'readonly.unknown.body': 'Прочитайте дочернюю сессию, чтобы определить, можно ли её продолжить.',
  'activity.running': 'выполняется',
  'activity.completed': 'завершено',
  'activity.inactive': 'не выполняется',
  'branch.collapse': 'Свернуть дочерние субагенты {label}',
  'branch.expand': 'Развернуть дочерние субагенты {label}',
  'count.total.one': '{count} субагент',
  'count.total.other': '{count} субагентов',
  'count.total.few': '{count} субагента',
  'count.total.many': '{count} субагентов',
  'count.running.one': '{count} субагент выполняется',
  'count.running.other': '{count} субагентов выполняются',
  'count.running.few': '{count} субагента выполняются',
  'count.running.many': '{count} субагентов выполняются',
  'switcher.aria': 'Переключить субагента: {title}',
  'tree.aria': 'Сессии субагентов',
  'open.sidebar': 'Открыть в боковой панели',
  'open.sidebar.aria': 'Открыть {label} в боковой панели',
  'sidebar.chat': 'Чат',
  'readonly.oneShot.title': 'Запись одноразового субагента',
  'readonly.title': 'Этот субагент пока доступен только для чтения',
  'readonly.oneShot.body': 'Одноразовые задачи не принимают последующих сообщений; здесь можно просмотреть полную запись выполнения.',
  'readonly.body': 'Родительская сессия не в сети; откройте её заново, чтобы продолжить отправку сообщений.',
}
