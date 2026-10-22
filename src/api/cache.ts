export type CacheSource = 'cache' | 'network'

export type CacheThenNetworkResult =
  | { ok: true; aborted: boolean; hadCache: boolean }
  | { ok: false; aborted: false; hadCache: boolean; error: Error }

type CacheThenNetworkOptions<T> = {
  cache: QueryCache
  key: string
  signal: AbortSignal
  fetcher: (signal: AbortSignal) => Promise<T>
  publish: (data: T, source: CacheSource) => void
}

export class QueryCache {
  private readonly entries = new Map<string, unknown>()

  get<T>(key: string): T | undefined {
    if (!this.entries.has(key)) return undefined
    return this.entries.get(key) as T
  }

  set<T>(key: string, value: T): void {
    this.entries.set(key, value)
  }

  clear(): void {
    this.entries.clear()
  }
}

export const queryCache = new QueryCache()

export async function cacheThenNetwork<T>(
  options: CacheThenNetworkOptions<T>,
): Promise<CacheThenNetworkResult> {
  const cached = options.cache.get<T>(options.key)
  const hadCache = cached !== undefined
  if (cached !== undefined) options.publish(cached, 'cache')

  try {
    const fresh = await options.fetcher(options.signal)
    if (options.signal.aborted) return { ok: true, aborted: true, hadCache }
    options.cache.set(options.key, fresh)
    options.publish(fresh, 'network')
    return { ok: true, aborted: false, hadCache }
  } catch (error) {
    if (options.signal.aborted || isAbortError(error)) {
      return { ok: true, aborted: true, hadCache }
    }
    return { ok: false, aborted: false, hadCache, error: toError(error) }
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error('Failed to load')
}
