import type { Launch } from '../types.ts'

export const PAGE_SIZE = 3
export const BUTTON_PAGE_LIMIT = 10

export type LoadMode = 'button' | 'scroll' | 'complete'

export function loadMode(loadedPages: number, hasNextPage: boolean): LoadMode {
  if (loadedPages > 0 && !hasNextPage) return 'complete'
  if (loadedPages >= BUTTON_PAGE_LIMIT && hasNextPage) return 'scroll'
  return 'button'
}

export function launchCacheKey(rocketId: string | null, page: number): string {
  return `launches:${rocketId ?? 'all'}:date_utc:desc:${PAGE_SIZE}:${page}`
}

export function flattenPages(pages: ReadonlyMap<number, readonly Launch[]>, loadedPages: number): Launch[] {
  const rows: Launch[] = []
  for (let page = 1; page <= loadedPages; page += 1) {
    const docs = pages.get(page)
    if (!docs) continue
    rows.push(...docs)
  }
  return rows
}
