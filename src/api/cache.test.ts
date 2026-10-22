import { describe, expect, it } from 'vitest'
import { QueryCache, cacheThenNetwork } from './cache.ts'

describe('cacheThenNetwork', () => {
  it('fetches when the cache is empty', async () => {
    const cache = new QueryCache()
    const published: string[] = []

    const result = await cacheThenNetwork({
      cache,
      key: 'k',
      signal: new AbortController().signal,
      fetcher: async () => 'fresh',
      publish: (data) => published.push(data),
    })

    expect(result).toEqual({ ok: true, aborted: false, hadCache: false })
    expect(published).toEqual(['fresh'])
    expect(cache.get('k')).toBe('fresh')
  })

  it('publishes the cached value before the network result', async () => {
    const cache = new QueryCache()
    cache.set('k', 'saved')
    const published: Array<[string, string]> = []

    const result = await cacheThenNetwork({
      cache,
      key: 'k',
      signal: new AbortController().signal,
      fetcher: async () => 'fresh',
      publish: (data, source) => published.push([source, data]),
    })

    expect(result).toEqual({ ok: true, aborted: false, hadCache: true })
    expect(published).toEqual([
      ['cache', 'saved'],
      ['network', 'fresh'],
    ])
    expect(cache.get('k')).toBe('fresh')
  })

  it('keeps the cached value when the network fails', async () => {
    const cache = new QueryCache()
    cache.set('k', 'saved')
    const published: string[] = []

    const result = await cacheThenNetwork({
      cache,
      key: 'k',
      signal: new AbortController().signal,
      fetcher: async () => {
        throw new Error('down')
      },
      publish: (data) => published.push(data),
    })

    expect(result).toMatchObject({ ok: false, hadCache: true })
    expect(published).toEqual(['saved'])
    expect(cache.get('k')).toBe('saved')
  })

  it('does not store a response after abort', async () => {
    const cache = new QueryCache()
    cache.set('k', 'saved')
    const controller = new AbortController()
    const published: string[] = []

    const pending = cacheThenNetwork({
      cache,
      key: 'k',
      signal: controller.signal,
      fetcher: (signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'))
          })
        }),
      publish: (data) => published.push(data),
    })

    expect(published).toEqual(['saved'])
    controller.abort()

    await expect(pending).resolves.toMatchObject({ ok: true, aborted: true, hadCache: true })
    expect(cache.get('k')).toBe('saved')
    expect(published).toEqual(['saved'])
  })

  it('ignores a late response after abort', async () => {
    const cache = new QueryCache()
    const controller = new AbortController()
    let resolveFetch: (value: string) => void = () => {}

    const pending = cacheThenNetwork({
      cache,
      key: 'k',
      signal: controller.signal,
      fetcher: () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
      publish: () => {},
    })

    controller.abort()
    resolveFetch('late')

    await expect(pending).resolves.toMatchObject({ ok: true, aborted: true, hadCache: false })
    expect(cache.get('k')).toBeUndefined()
  })

  it('keeps keys isolated', () => {
    const cache = new QueryCache()
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBe(2)
    cache.clear()
    expect(cache.get('a')).toBeUndefined()
  })
})
