/**
 * Russian dictionary for the `feedback` namespace owned by
 * `@deepseek-ai/dsh-client-ui-message-feedback`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'feedback'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'action.like': 'Хороший ответ',
  'action.likeActive': 'Убрать оценку',
  'action.dislike': 'Проблемный ответ',
  'action.dislikeActive': 'Убрать оценку',
  'dialog.title': 'Отправить отзыв',
  'dialog.categories': 'Категория отзыва',
  'dialog.detail': 'Подробности отзыва',
  'dialog.hint': 'Добавьте подробности, чтобы помочь нам улучшить продукт. К отправке будет приложен журнал текущего диалога.',
  'category.task-result': 'Результат задачи',
  'category.instruction-following': 'Понимание и соблюдение инструкций',
  'category.product-interaction': 'Функции и взаимодействие с продуктом',
  'category.service-stability': 'Стабильность и скорость',
  'category.resource-cost': 'Использование ресурсов и стоимость',
  'category.security-privacy-permission': 'Безопасность, конфиденциальность и разрешения',
  'category.other': 'Другое',
  'toast.recorded': 'Спасибо за ваш отзыв',
  'error.conflict': 'Этот отзыв был изменён в другом месте; показано актуальное состояние',
  'error.load': 'Не удалось загрузить отзыв',
  'error.generic': 'Не удалось сохранить отзыв',
  'error.noteTooLarge': 'Описание слишком длинное; сократите его и отправьте снова',
}
