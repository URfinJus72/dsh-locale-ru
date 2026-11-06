/**
 * Russian dictionary for the `plan` namespace owned by
 * `@deepseek-ai/dsh-client-ui-plan`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'plan'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'chip.label': 'План',
  'preview.title': 'План',
  'preview.document': 'План · Markdown',
  'preview.action': 'Открыть',
  'preview.open': 'Открыть план в боковой панели',
  'preview.full': 'Открыть план целиком',
  'preview.openNamed': 'Открыть план: {title}',
  'preview.loading': 'Загрузка плана…',
  'preview.failed': 'Не удалось загрузить план',
  'preview.invalidAddress': 'Недопустимый адрес плана',
  'preview.historyUnavailable': 'История сессии недоступна',
  'preview.notFound': 'Этот план не найден',
  'preview.unavailable': 'Предпросмотр плана недоступен',
  'preview.expired': 'Срок действия временного предпросмотра плана истёк. Откройте его заново из карточки, ожидающей разрешения.',
  'chip.on.aria': 'plan mode включён, нажмите, чтобы выключить',
  'chip.on.title': 'plan mode включён — нажмите, чтобы выключить (/plan off)',
  'chip.exitFailed': 'Не удалось выйти из plan mode',
}
