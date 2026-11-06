/**
 * Точечный шим для пунктов сайдбара, которые плагины строят сами.
 *
 * `@hyzyn/dsh-rss`, `@hyzyn/dsh-tty` и `@hyzyn/dsh-docker` создают кнопку в
 * сайдбаре **один раз** при монтировании и вставляют в неё результат
 * собственного `t()` ещё до того, как подписка на `locale` начнёт работать
 * (динамический `ctx.inject(['locale'])`). Их `t` в этот момент — китайский
 * fallback, а перерисовки на смену языка у них нет, поэтому в DOM навсегда
 * остаётся «终端» / «容器» / «今日值得读».
 *
 * Плагины не наши, правки upstream нежелательны, а слоты здесь не помогут:
 * это не React-слот, а императивный DOM. Поэтому мы точечно переписываем
 * подпись, `aria-label` и `title` у трёх известных элементов, когда активен
 * русский (или английский/китайский — чтобы переключение языка было
 * согласованным). Всё остальное в DOM не трогаем.
 */

/** Один сторонний пункт сайдбара: как найти и чем заменить. */
export interface SidebarLabelEntry {
  /** Селектор контейнера, который создаёт плагин. */
  readonly container: string
  /** Селектор элемента с текстом подписи. */
  readonly label: string
  /** Namespace нашего словаря, откуда берётся русская подпись. */
  readonly namespace: string
  /** Ключ русского словаря. */
  readonly key: string
  /** Исходная китайская подпись плагина. */
  readonly zh: string
  /** Английская подпись плагина. */
  readonly en: string
}

/** Известные императивные пункты сайдбара сторонних плагинов. */
export const SIDEBAR_LABELS: readonly SidebarLabelEntry[] = [
  {
    container: '[data-dsh-rss-entry]',
    label: '.rss_sidebarEntryLabel',
    namespace: 'rss',
    key: 'panel.digest',
    zh: '今日值得读',
    en: 'Today’s picks',
  },
  {
    container: '[data-dsh-tty-entry]',
    label: '.tt_sidebarEntryLabel',
    namespace: 'tty',
    key: 'panel.title',
    zh: '终端',
    en: 'Terminal',
  },
  {
    container: '[data-dsh-docker-entry]',
    label: '.dk_entryLabel',
    namespace: 'docker',
    key: 'panel.containers',
    zh: '容器',
    en: 'Containers',
  },
]

/** Минимальная часть locale-сервиса, нужная шиму. */
export interface SidebarLocaleService {
  getLocale(): { readonly active: string }
  subscribe(listener: () => void): () => void
}

/** Контекст, которого достаточно шиму (Cordis-совместимый). */
export interface SidebarLabelsContext {
  locale: SidebarLocaleService
}

/**
 * Установить шим и вернуть disposer.
 * @param ctx - контекст с locale-сервисом.
 * @param lookup - чтение русского значения из зарегистрированного пака.
 * @returns идемпотентный disposer; no-op вне браузера.
 */
export function installSidebarLabels(
  ctx: SidebarLabelsContext,
  lookup: (namespace: string, key: string) => string | undefined,
): () => void {
  if (typeof document === 'undefined' || document.body === null) return () => {}

  let scheduled = false
  let disposed = false

  const apply = (): void => {
    if (disposed) return
    const active = ctx.locale.getLocale().active
    for (const entry of SIDEBAR_LABELS) {
      const container = document.querySelector(entry.container)
      if (container === null) continue
      const target = active === 'ru'
        ? lookup(entry.namespace, entry.key)
        : active === 'zh'
          ? entry.zh
          : entry.en
      if (target === undefined || target === '') continue
      const label = container.querySelector(entry.label)
      if (label !== null && label.textContent !== target) label.textContent = target
      if (container.getAttribute('aria-label') !== target) container.setAttribute('aria-label', target)
      if (container.hasAttribute('title') && container.getAttribute('title') !== target) {
        container.setAttribute('title', target)
      }
    }
  }

  const schedule = (): void => {
    if (scheduled || disposed) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      try {
        apply()
      } catch {
        // Шим не должен ломать интерфейс: молча пропускаем этот проход.
      }
    })
  }

  const observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true })
  const unsubscribe = ctx.locale.subscribe(schedule)
  schedule()

  return () => {
    disposed = true
    observer.disconnect()
    unsubscribe()
  }
}
