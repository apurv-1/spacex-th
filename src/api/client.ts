import type { Launch, LaunchQueryResult, Rocket } from '../types.ts'

type RawRocket = {
  id?: string
  _id?: string
  name?: string
}

type RawLaunch = {
  id?: string
  _id?: string
  name?: string
  date_utc?: string
  details?: string | null
  rocket?: string | RawRocket
  links?: {
    patch?: {
      small?: string | null
    } | null
  } | null
}

type RawLaunchQuery = {
  docs?: RawLaunch[]
  totalDocs?: number
  page?: number
  hasNextPage?: boolean
}

export function apiBase(): string {
  const configured = import.meta.env.VITE_SPACEX_API_BASE
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.replace(/\/$/, '')
  }
  return '/v4'
}

export function launchQueryBody(rocketId: string | null, page: number, limit: number) {
  return {
    query: rocketId ? { rocket: rocketId } : {},
    options: {
      limit,
      page,
      sort: { date_utc: 'desc' },
      select: ['name', 'date_utc', 'details', 'links', 'rocket'],
      populate: [{ path: 'rocket', select: { name: 1 } }],
    },
  }
}

export function normalizeLaunch(doc: RawLaunch): Launch {
  const rocket = doc.rocket
  const thumbnail = doc.links?.patch?.small
  return {
    id: doc.id ?? doc._id ?? '',
    missionName: doc.name ?? 'Unknown mission',
    rocketName: typeof rocket === 'string' ? 'Unknown rocket' : rocket?.name ?? 'Unknown rocket',
    rocketId: typeof rocket === 'string' ? rocket : rocket?.id ?? rocket?._id ?? '',
    dateUtc: doc.date_utc ?? '',
    details: typeof doc.details === 'string' && doc.details.length > 0 ? doc.details : null,
    thumbnailUrl: typeof thumbnail === 'string' && thumbnail.length > 0 ? thumbnail : null,
  }
}

export function normalizeLaunchQuery(payload: RawLaunchQuery): LaunchQueryResult {
  if (!Array.isArray(payload.docs) || typeof payload.totalDocs !== 'number' || typeof payload.hasNextPage !== 'boolean') {
    throw new Error('Launch query returned an unexpected payload')
  }

  return {
    docs: payload.docs.map(normalizeLaunch),
    totalDocs: payload.totalDocs,
    page: payload.page ?? 1,
    hasNextPage: payload.hasNextPage,
  }
}

export async function fetchRockets(signal?: AbortSignal): Promise<Rocket[]> {
  const response = await fetch(`${apiBase()}/rockets`, { signal, cache: 'no-store' })
  if (!response.ok) throw new Error(`Rocket query failed (${response.status})`)

  const payload: unknown = await response.json()
  if (!Array.isArray(payload)) throw new Error('Rocket query returned an unexpected payload')

  const rockets: Rocket[] = []
  for (const item of payload) {
    if (!item || typeof item !== 'object') continue
    const record = item as { id?: unknown; name?: unknown }
    if (typeof record.id !== 'string' || typeof record.name !== 'string') continue
    rockets.push({ id: record.id, name: record.name })
  }

  rockets.sort((left, right) => left.name.localeCompare(right.name))
  return rockets
}

export async function fetchLaunches(options: {
  rocketId: string | null
  page: number
  limit: number
  signal?: AbortSignal
}): Promise<LaunchQueryResult> {
  const response = await fetch(`${apiBase()}/launches/query`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(launchQueryBody(options.rocketId, options.page, options.limit)),
    signal: options.signal,
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(`Launch query failed (${response.status})`)
  return normalizeLaunchQuery(await response.json())
}
