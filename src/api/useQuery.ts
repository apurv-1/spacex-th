import { useLayoutEffect, useRef, useState } from 'react'
import { cacheThenNetwork, queryCache } from './cache.ts'

export type QueryState<T> = {
  data: T | undefined
  loading: boolean
  refreshing: boolean
  error: Error | null
}

function readCache<T>(key: string): QueryState<T> {
  const cached = queryCache.get<T>(key)
  return {
    data: cached,
    loading: cached === undefined,
    refreshing: cached !== undefined,
    error: null,
  }
}

export function useQuery<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>): QueryState<T> {
  const fetcherRef = useRef(fetcher)
  const genRef = useRef(0)
  const [trackedKey, setTrackedKey] = useState(key)
  const [state, setState] = useState<QueryState<T>>(() => readCache(key))

  if (trackedKey !== key) {
    setTrackedKey(key)
    setState(readCache(key))
  }

  useLayoutEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  useLayoutEffect(() => {
    const generation = genRef.current + 1
    genRef.current = generation
    const controller = new AbortController()

    void cacheThenNetwork({
      cache: queryCache,
      key,
      signal: controller.signal,
      fetcher: (signal) => fetcherRef.current(signal),
      publish: (data, source) => {
        if (generation !== genRef.current || source === 'cache') return
        setState({
          data,
          loading: false,
          refreshing: false,
          error: null,
        })
      },
    }).then((result) => {
      if (generation !== genRef.current || result.aborted || result.ok) return
      setState((current) => ({
        data: current.data,
        loading: false,
        refreshing: false,
        error: result.error,
      }))
    })

    return () => {
      genRef.current += 1
      controller.abort()
    }
  }, [key])

  return state
}
