import { useLayoutEffect, useRef, useState } from 'react'
import { cacheThenNetwork, queryCache } from '../api/cache.ts'
import { fetchLaunches } from '../api/client.ts'
import { flattenPages, launchCacheKey, loadMode, PAGE_SIZE, type LoadMode } from './paging.ts'
import type { Launch, LaunchQueryResult } from '../types.ts'

export function useLaunchPages(rocketId: string | null) {
  const [pages, setPages] = useState<Map<number, Launch[]>>(() => new Map())
  const [loadedPages, setLoadedPages] = useState(0)
  const [totalDocs, setTotalDocs] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failedPage, setFailedPage] = useState<number | null>(null)

  const [activeRocket, setActiveRocket] = useState(rocketId)
  const book = useRef({
    gen: 0,
    highest: 0,
    loadedPages: 0,
    hasNext: false,
    pending: false,
    refreshCount: 0,
    controllers: new Set<AbortController>(),
  })

  if (activeRocket !== rocketId) {
    setActiveRocket(rocketId)
    setPages(new Map())
    setLoadedPages(0)
    setTotalDocs(0)
    setHasNextPage(false)
    setLoading(true)
    setRefreshing(false)
    setPending(false)
    setError(null)
    setFailedPage(null)
  }

  function ingest(page: number, result: LaunchQueryResult) {
    setPages((current) => {
      const next = new Map(current)
      next.set(page, result.docs)
      return next
    })
    book.current.loadedPages = Math.max(book.current.loadedPages, page)
    setLoadedPages(book.current.loadedPages)
    if (page >= book.current.highest) {
      book.current.highest = page
      book.current.hasNext = result.hasNextPage
      setHasNextPage(result.hasNextPage)
      setTotalDocs(result.totalDocs)
    }
    setLoading(false)
  }

  async function request(page: number, rocket: string | null, gen: number, signal: AbortSignal) {
    const result = await cacheThenNetwork({
      cache: queryCache,
      key: launchCacheKey(rocket, page),
      signal,
      fetcher: (nextSignal) =>
        fetchLaunches({
          rocketId: rocket,
          page,
          limit: PAGE_SIZE,
          signal: nextSignal,
        }),
      publish: (data, source) => {
        if (gen !== book.current.gen) return
        ingest(page, data)
        if (source === 'cache') {
          book.current.refreshCount += 1
          setRefreshing(true)
        } else {
          book.current.refreshCount = Math.max(0, book.current.refreshCount - 1)
          setRefreshing(book.current.refreshCount > 0)
          setError(null)
          setFailedPage(null)
        }
      },
    })

    if (gen !== book.current.gen || result.aborted) return

    if (!result.ok) {
      if (result.hadCache) {
        book.current.refreshCount = Math.max(0, book.current.refreshCount - 1)
        setRefreshing(book.current.refreshCount > 0)
        setError('Could not refresh launches. Showing saved results.')
      } else {
        setRefreshing(false)
        setLoading(false)
        setError(result.error.message)
      }
      setFailedPage(page)
    }
  }

  useLayoutEffect(() => {
    const state = book.current
    state.gen += 1
    const gen = state.gen
    state.highest = 0
    state.loadedPages = 0
    state.hasNext = false
    state.pending = false
    state.refreshCount = 0

    const controller = new AbortController()
    state.controllers.add(controller)
    void request(1, rocketId, gen, controller.signal)

    return () => {
      state.gen += 1
      for (const current of state.controllers) current.abort()
      state.controllers.clear()
    }
  }, [rocketId])

  function start(page: number) {
    const state = book.current
    if (state.pending || page < 1) return
    const gen = state.gen
    state.pending = true
    setPending(true)
    const controller = new AbortController()
    state.controllers.add(controller)
    void request(page, rocketId, gen, controller.signal).finally(() => {
      state.controllers.delete(controller)
      if (gen !== state.gen) return
      state.pending = false
      setPending(false)
    })
  }

  function loadMore() {
    const state = book.current
    const modeNow = loadMode(state.loadedPages, state.hasNext)
    if (modeNow === 'complete' || state.loadedPages === 0) return
    start(state.loadedPages + 1)
  }

  function retry() {
    if (failedPage === null) return
    start(failedPage)
  }

  const mode: LoadMode = loadMode(loadedPages, hasNextPage)

  return {
    rows: flattenPages(pages, loadedPages),
    totalDocs,
    loadedPages,
    loading,
    refreshing,
    pending,
    error,
    mode,
    loadMore,
    retry,
  }
}
