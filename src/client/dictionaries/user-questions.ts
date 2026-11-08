/**
 * Russian dictionary for the `question` namespace owned by
 * `@deepseek-ai/dsh-client-ui-user-questions`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'question'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'error.incomplete': 'Сначала завершите этот вопрос.',
  'error.unanswered': 'Выберите вариант или введите свой ответ.',
  'error.unavailable': 'Отправить сейчас нельзя; повторите попытку через мгновение.',
  'error.resubmit': 'Ответ не был доставлен до начала работы; отправьте его снова.',
  'status.sent': 'Ответ отправлен; панель не удалось закрыть.',
  'wait.takeTime': 'Возьмите время',
  'wait.countdown': 'Продолжение через {seconds} с',
  'wait.paused': 'Пауза · осталось {seconds}с',
  'wait.held': 'Ожидание вашего ответа',
  'wait.continued': 'Работа продолжена — вы всё ещё можете ответить',
  'review.status': 'Отвечено',
  'review.skipped': 'Этот вопрос был пропущен.',
  'reply.label': 'Ответить на ранее ожидающие вопросы',
  'reply.answerLabel': 'Ответ: ',
  'reply.skipped': 'Пропущено',
  'nav.prev': 'Предыдущий вопрос',
  'nav.next': 'Следующий вопрос',
  'nav.minimize': 'Свернуть карточку вопросов',
  'nav.maximize': 'Развернуть карточку вопросов',
  'nav.cancel': 'Отменить все вопросы',
  'nav.close': 'Закрыть панель — открыть её из вызова инструмента',
  'text.expand': 'Развернуть',
  'text.collapse': 'Свернуть',
  'option.recommended': 'Рекомендуется',
  'custom.placeholder': 'Введите свой ответ',
  'action.skip': 'Пропустить',
  'action.next': 'Далее',
  'plan.header': 'Проверка плана',
  'plan.approve': 'Разрешить',
  'plan.decline': 'Отклонить',
  'plan.discuss': 'Запросить изменения',
}
