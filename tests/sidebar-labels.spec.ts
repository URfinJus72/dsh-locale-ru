import assert from 'node:assert/strict'
import test from 'node:test'

/**
 * Юнит-тест шима подписей сайдбара: проверяем на фейковом DOM, что подписи
 * сторонних пунктов (rss / tty / docker) переписываются на русский и
 * переключаются вместе с языком, не трогая ничего лишнего.
 */

interface FakeElement {
  textContent: string
  attributes: Map<string, string>
  querySelector(selector: string): FakeElement | null
  getAttribute(name: string): string | null
  hasAttribute(name: string): boolean
  setAttribute(name: string, value: string): void
}

function element(text = ''): FakeElement {
  const attributes = new Map<string, string>()
  return {
    textContent: text,
    attributes,
    querySelector: () => null,
    getAttribute: name => attributes.get(name) ?? null,
    hasAttribute: name => attributes.has(name),
    setAttribute: (name, value) => { attributes.set(name, value) },
  }
}

/** Контейнер пункта: ищем элемент подписи по классу. */
function container(className: string, text: string): FakeElement {
  const label = element(text)
  const node = element('')
  node.querySelector = selector => (selector === className ? label : null)
  node.attributes.set('aria-label', text)
  node.attributes.set('title', text)
  return node
}

test('sidebar labels: переводятся на ru, переключаются на en, откатываются', async () => {
  const rss = container('.rss_sidebarEntryLabel', '今日值得读')
  const tty = container('.tt_sidebarEntryLabel', '终端')
  const docker = container('.dk_entryLabel', '容器')
  const bySelector: Record<string, FakeElement> = {
    '[data-dsh-rss-entry]': rss,
    '[data-dsh-tty-entry]': tty,
    '[data-dsh-docker-entry]': docker,
  }

  const previousDocument = globalThis.document
  const previousObserver = globalThis.MutationObserver
  let active = 'ru'
  const listeners: (() => void)[] = []
  let observed = 0
  let disconnected = 0

  class FakeObserver {
    observe(): void { observed += 1 }
    disconnect(): void { disconnected += 1 }
  }

  globalThis.document = {
    body: {},
    querySelector: (selector: string) => bySelector[selector] ?? null,
  } as unknown as Document
  globalThis.MutationObserver = FakeObserver as unknown as typeof MutationObserver

  try {
    const { installSidebarLabels, SIDEBAR_LABELS } = await import('../src/client/sidebar-labels.ts')
    const lookup = (namespace: string, key: string): string | undefined =>
      namespace === 'tty' && key === 'panel.title'
        ? 'Терминал'
        : namespace === 'docker' && key === 'panel.containers'
          ? 'Контейнеры'
          : namespace === 'rss' && key === 'panel.digest'
            ? 'Сегодня стоит прочитать'
            : undefined

    assert.equal(SIDEBAR_LABELS.length, 3)

    const dispose = installSidebarLabels(
      { locale: { getLocale: () => ({ active }), subscribe: fn => { listeners.push(fn); return () => { listeners.pop() } } } },
      lookup,
    )
    await Promise.resolve()
    assert.equal(tty.querySelector('.tt_sidebarEntryLabel')?.textContent, 'Терминал')
    assert.equal(docker.querySelector('.dk_entryLabel')?.textContent, 'Контейнеры')
    assert.equal(rss.querySelector('.rss_sidebarEntryLabel')?.textContent, 'Сегодня стоит прочитать')
    assert.equal(tty.getAttribute('aria-label'), 'Терминал')
    assert.equal(tty.getAttribute('title'), 'Терминал')
    assert.equal(observed, 1)

    active = 'en'
    listeners[0]?.()
    await Promise.resolve()
    assert.equal(tty.querySelector('.tt_sidebarEntryLabel')?.textContent, 'Terminal')
    assert.equal(docker.querySelector('.dk_entryLabel')?.textContent, 'Containers')
    assert.equal(rss.querySelector('.rss_sidebarEntryLabel')?.textContent, 'Today’s picks')

    dispose()
    assert.equal(disconnected, 1)
  } finally {
    globalThis.document = previousDocument
    globalThis.MutationObserver = previousObserver
  }
})

test('sidebar labels: вне браузера — no-op', async () => {
  const { installSidebarLabels } = await import('../src/client/sidebar-labels.ts')
  const previousDocument = globalThis.document
  // @ts-expect-error — намеренно убираем DOM, как в node-окружении.
  delete globalThis.document
  try {
    const dispose = installSidebarLabels(
      { locale: { getLocale: () => ({ active: 'ru' }), subscribe: () => () => {} } },
      () => 'x',
    )
    assert.equal(typeof dispose, 'function')
    dispose()
  } finally {
    globalThis.document = previousDocument
  }
})
