import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryCache } from './cache.ts'
import { useQuery } from './useQuery.ts'
import type { Rocket } from '../types.ts'

describe('useQuery', () => {
  beforeEach(() => {
    queryCache.clear()
  })

  it('shows the cached value and then replaces it from the network', async () => {
    queryCache.set<Rocket[]>('rockets', [{ id: '1', name: 'Cached' }])
    let resolveFetch: (value: Rocket[]) => void = () => {}
    const fetcher = vi.fn(
      () =>
        new Promise<Rocket[]>((resolve) => {
          resolveFetch = resolve
        }),
    )

    const { result } = renderHook(() => useQuery('rockets', fetcher))

    await waitFor(() => expect(result.current.data).toEqual([{ id: '1', name: 'Cached' }]))
    expect(result.current.refreshing).toBe(true)
    expect(fetcher).toHaveBeenCalled()

    resolveFetch([{ id: '1', name: 'Fresh' }])

    await waitFor(() => expect(result.current.data).toEqual([{ id: '1', name: 'Fresh' }]))
    expect(result.current.refreshing).toBe(false)
    expect(queryCache.get('rockets')).toEqual([{ id: '1', name: 'Fresh' }])
  })

  it('keeps cached data when the refresh fails', async () => {
    queryCache.set<Rocket[]>('rockets', [{ id: '1', name: 'Cached' }])
    const fetcher = vi.fn(() => Promise.reject(new Error('down')))

    const { result } = renderHook(() => useQuery('rockets', fetcher))

    await waitFor(() => expect(result.current.error?.message).toBe('down'))
    expect(result.current.data).toEqual([{ id: '1', name: 'Cached' }])
    expect(result.current.refreshing).toBe(false)
  })

  it('surfaces an error when there is nothing cached', async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error('down')))
    const { result } = renderHook(() => useQuery('rockets', fetcher))

    await waitFor(() => expect(result.current.error?.message).toBe('down'))
    expect(result.current.data).toBeUndefined()
    expect(result.current.loading).toBe(false)
  })
})
