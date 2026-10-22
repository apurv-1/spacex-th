import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryCache } from '../api/cache.ts'
import type { Launch, LaunchQueryResult } from '../types.ts'
import { launchCacheKey } from './paging.ts'

vi.mock('../api/client.ts', () => ({
  fetchLaunches: vi.fn(),
}))

import { fetchLaunches } from '../api/client.ts'
import { useLaunchPages } from './useLaunchPages.ts'

function makeLaunch(index: number, rocketId = 'falcon9'): Launch {
  return {
    id: `${rocketId}-${index}`,
    missionName: `Mission ${index}`,
    rocketName: rocketId,
    rocketId,
    dateUtc: '2020-01-15T00:00:00.000Z',
    details: index % 4 === 0 ? null : `Details ${index}`,
    thumbnailUrl: null,
  }
}

function pageOf(launches: Launch[], page: number, limit: number, rocketId: string | null): LaunchQueryResult {
  const filtered = rocketId ? launches.filter((launch) => launch.rocketId === rocketId) : launches
  const start = (page - 1) * limit
  return {
    docs: filtered.slice(start, start + limit),
    totalDocs: filtered.length,
    page,
    hasNextPage: start + limit < filtered.length,
  }
}

function install(launches: Launch[]) {
  vi.mocked(fetchLaunches).mockImplementation(async ({ rocketId, page, limit }) =>
    pageOf(launches, page, limit, rocketId),
  )
}

describe('useLaunchPages', () => {
  beforeEach(() => {
    queryCache.clear()
    vi.mocked(fetchLaunches).mockReset()
  })

  it('uses the load-more path through page 10, then scroll mode', async () => {
    install(Array.from({ length: 33 }, (_, index) => makeLaunch(index)))
    const { result } = renderHook(() => useLaunchPages(null))

    await waitFor(() => expect(result.current.loadedPages).toBe(1))
    expect(result.current.mode).toBe('button')
    expect(result.current.rows).toHaveLength(3)

    for (let page = 2; page <= 10; page += 1) {
      act(() => {
        result.current.loadMore()
      })
      await waitFor(() => {
        expect(result.current.loadedPages).toBe(page)
        expect(result.current.pending).toBe(false)
      })
      expect(result.current.mode).toBe(page < 10 ? 'button' : 'scroll')
    }

    expect(result.current.rows).toHaveLength(30)

    act(() => {
      result.current.loadMore()
    })
    await waitFor(() => expect(result.current.loadedPages).toBe(11))
    expect(result.current.rows).toHaveLength(33)
    expect(result.current.mode).toBe('complete')
  })

  it('renders a cached page before the network returns', async () => {
    const cached = makeLaunch(0)
    cached.missionName = 'Cached mission'
    queryCache.set(launchCacheKey(null, 1), {
      docs: [cached],
      totalDocs: 1,
      page: 1,
      hasNextPage: false,
    })

    let resolveFetch: (value: LaunchQueryResult) => void = () => {}
    vi.mocked(fetchLaunches).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )

    const { result } = renderHook(() => useLaunchPages(null))

    await waitFor(() => expect(result.current.rows[0]?.missionName).toBe('Cached mission'))
    expect(result.current.refreshing).toBe(true)
    expect(fetchLaunches).toHaveBeenCalled()

    const fresh = makeLaunch(0)
    fresh.missionName = 'Fresh mission'
    resolveFetch({ docs: [fresh], totalDocs: 1, page: 1, hasNextPage: false })

    await waitFor(() => expect(result.current.rows[0]?.missionName).toBe('Fresh mission'))
    expect(result.current.refreshing).toBe(false)
  })

  it('keeps cached rows when the refresh fails', async () => {
    queryCache.set(launchCacheKey(null, 1), {
      docs: [makeLaunch(0)],
      totalDocs: 1,
      page: 1,
      hasNextPage: false,
    })
    vi.mocked(fetchLaunches).mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useLaunchPages(null))

    await waitFor(() => expect(result.current.error).toBe('Could not refresh launches. Showing saved results.'))
    expect(result.current.rows).toHaveLength(1)
  })

  it('retries a failed first page', async () => {
    const launches = [makeLaunch(0), makeLaunch(1), makeLaunch(2)]
    let attempts = 0
    vi.mocked(fetchLaunches).mockImplementation(async ({ page, limit, rocketId }) => {
      attempts += 1
      if (attempts === 1) throw new Error('network down')
      return pageOf(launches, page, limit, rocketId)
    })

    const { result } = renderHook(() => useLaunchPages(null))
    await waitFor(() => expect(result.current.error).toBe('network down'))

    act(() => {
      result.current.retry()
    })

    await waitFor(() => expect(result.current.rows).toHaveLength(3))
    expect(result.current.error).toBeNull()
  })

  it('resets to the first page when the rocket changes', async () => {
    const launches = [
      ...Array.from({ length: 4 }, (_, index) => makeLaunch(index, 'falcon9')),
      ...Array.from({ length: 2 }, (_, index) => makeLaunch(index, 'heavy')),
    ]
    install(launches)

    const { result, rerender } = renderHook(
      ({ rocketId }: { rocketId: string | null }) => useLaunchPages(rocketId),
      { initialProps: { rocketId: null as string | null } },
    )

    await waitFor(() => expect(result.current.rows).toHaveLength(3))
    rerender({ rocketId: 'heavy' })

    await waitFor(() => expect(result.current.rows).toHaveLength(2))
    expect(result.current.rows.every((row) => row.rocketId === 'heavy')).toBe(true)
    expect(result.current.loadedPages).toBe(1)
    expect(result.current.mode).toBe('complete')
  })
})
