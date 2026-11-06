/**
 * Russian dictionary for the `settings.subagent` namespace owned by
 * `@deepseek-ai/dsh-client-ui-settings-subagent`. Key parity with the Harness dictionary is
 * asserted by scripts/check-harness-keys.mjs.
 */

/** Registered namespace id. */
export const ns = 'settings.subagent'

/** Russian dictionary. */
export const dict: Record<string, string> = {
  'overridden': 'Перекрыто',
  'reset': 'Сбросить к значению по умолчанию',
  'readOnly': 'В этом развёртывании настройки хранятся только для чтения.',
  'unavailable': 'Этот плагин не загружен, поэтому сейчас его нельзя настроить.',
  'save': 'Сохранить',
  'saving': 'Сохранение…',
  'saveFailed': 'Развёртывание не приняло эти значения; они оставлены для исправления.',
  'subagentTitle': 'Субагент',
  'subagentDescription': 'Настройка глубины рекурсии, количества и моделей субагентов.',
  'subagentLimitsTitle': 'Ограничения',
  'subagentMaxDepth': 'Максимальная глубина рекурсии',
  'subagentDepthHelpLabel': 'О максимальной глубине рекурсии',
  'subagentDepthHelp': 'Ограничивает, сколько уровней субагентов может создать агент.',
  'subagentDepthZero': 'Выключить субагентов',
  'subagentDepthOne': 'Только главный агент может создавать субагентов',
  'subagentDepthOverride': 'Если инструмент задаёт собственную максимальную глубину рекурсии, его настройка имеет приоритет.',
  'subagentMaxActive': 'Предел параллелизма субагентов',
  'subagentCapacityHelpLabel': 'О пределе параллелизма субагентов',
  'subagentCapacityHelp': 'Общее число одновременно живых субагентов под одним главным агентом на всех уровнях рекурсии. Главный агент не учитывается. При достижении предела новые запросы на запуск отклоняются.',
  'subagentDepthInvalid': 'Введите целое число не меньше 0.',
  'subagentCapacityInvalid': 'Введите целое число не меньше 1.',
  'subagentModelSelectionTitle': 'Выбор модели',
  'subagentModelSelectionToggle': 'Разрешить агентам выбирать модели для субагентов',
  'subagentModelSelectionChoose': 'Когда включено, агенты могут выбирать провайдера, модель и интенсивность рассуждений для каждого субагента из авторизованных моделей ниже. Действует только для новых сессий.',
  'subagentModelSelectionAllowed': 'Модели, доступные агентам',
  'subagentModelSelectionLoading': 'Загрузка моделей…',
  'subagentModelSelectionLoadFailed': 'Не удалось загрузить модели.',
  'subagentModelSelectionRetry': 'Повторить',
  'subagentModelSelectionPartial': 'Некоторые провайдеры моделей не загрузились; сохранённые варианты всё ещё можно удалить.',
  'subagentModelSelectionUnavailable': 'Сейчас недоступно',
  'subagentModelSelectionUnavailableGroup': 'Сохранено, но сейчас недоступно',
  'subagentModelSelectionEmpty': 'Сейчас ни один провайдер моделей не объявляет модели.',
  'subagentModelSelectionRequired': 'Перед сохранением выберите хотя бы одну модель.',
  'subagentModelSelectionConflict': 'Настройки изменены в другом месте. Отмените черновик и повторите попытку.',
  'subagentModelSelectionOff': 'Субагент использует заданные по умолчанию модели или наследует модель родительского агента. Сохранённые варианты моделей сохраняются.',
}
