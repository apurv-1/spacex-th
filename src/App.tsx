import { useState } from 'react'
import { fetchRockets } from './api/client.ts'
import { useQuery } from './api/useQuery.ts'
import { LaunchTable } from './components/LaunchTable.tsx'
import { RocketFilter } from './components/RocketFilter.tsx'
import { useInfiniteScroll } from './launches/useInfiniteScroll.ts'
import { useLaunchPages } from './launches/useLaunchPages.ts'

const buttonClass =
  'rounded-md bg-ink px-4 py-2 text-sm font-medium text-canvas hover:opacity-90 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

export default function App() {
  const [rocketId, setRocketId] = useState<string | null>(null)
  const rockets = useQuery('rockets', (signal) => fetchRockets(signal))
  const launches = useLaunchPages(rocketId)
  const sentinelRef = useInfiniteScroll(launches.mode === 'scroll', launches.loadMore, launches.loadedPages)
  const showButton = launches.mode === 'button' && launches.loadedPages > 0 && launches.error === null
  const showComplete = launches.mode === 'complete' && launches.loadedPages > 0

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Launches</h1>
        <p className="text-sm text-muted">Newest first. Three records per page.</p>
      </header>

      <RocketFilter
        rockets={rockets.data ?? []}
        value={rocketId}
        onChange={setRocketId}
        disabled={rockets.loading && rockets.data === undefined}
      />

      {rockets.error && rockets.data === undefined ? (
        <p role="alert" className="text-sm text-muted">
          Could not load rockets.
        </p>
      ) : null}

      <p className="text-sm text-muted" role="status">
        {launches.rows.length === 0 && launches.loading
          ? 'Loading launches'
          : `Showing ${launches.rows.length} of ${launches.totalDocs}${launches.refreshing ? ' · Updating' : ''}`}
      </p>

      {launches.error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-panel px-4 py-3 text-sm">
          <p>{launches.error}</p>
          <button type="button" className={buttonClass} onClick={launches.retry} disabled={launches.pending}>
            Retry
          </button>
        </div>
      ) : null}

      {launches.rows.length > 0 ? (
        <LaunchTable launches={launches.rows} />
      ) : !launches.loading ? (
        <p className="text-sm text-muted">No launches for this rocket.</p>
      ) : null}

      {showButton ? (
        <button type="button" className={`${buttonClass} self-start`} onClick={launches.loadMore} disabled={launches.pending}>
          Load more
        </button>
      ) : null}

      {launches.mode === 'scroll' ? (
        <div ref={sentinelRef} className="h-12">
          {launches.pending ? <p className="text-sm text-muted">Loading more launches</p> : null}
        </div>
      ) : null}

      {showComplete ? <p className="text-sm text-muted">All launches loaded</p> : null}
    </main>
  )
}
