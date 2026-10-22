import { useState } from 'react'
import { formatLaunchDate } from '../launches/formatDate.ts'
import type { Launch } from '../types.ts'

export function LaunchTable({ launches }: { launches: Launch[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <caption className="sr-only">SpaceX launches</caption>
        <thead className="bg-panel text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Mission Name</th>
            <th scope="col" className="px-4 py-3 font-medium">Rocket Name</th>
            <th scope="col" className="px-4 py-3 font-medium">Launch Date</th>
            <th scope="col" className="px-4 py-3 font-medium">Details</th>
            <th scope="col" className="px-4 py-3 font-medium">Patch</th>
          </tr>
        </thead>
        <tbody>
          {launches.map((launch) => (
            <tr key={launch.id} data-date={launch.dateUtc} className="border-t border-line align-top">
              <td className="px-4 py-3 font-medium">{launch.missionName}</td>
              <td className="px-4 py-3 whitespace-nowrap">{launch.rocketName}</td>
              <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatLaunchDate(launch.dateUtc)}</td>
              <td className="px-4 py-3">
                {launch.details ? (
                  <p className="line-clamp-3 max-w-md text-muted" title={launch.details}>
                    {launch.details}
                  </p>
                ) : (
                  <span className="text-muted">-</span>
                )}
              </td>
              <td className="px-4 py-3">
                <Patch key={launch.thumbnailUrl ?? launch.id} url={launch.thumbnailUrl} name={launch.missionName} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Patch({ url, name }: { url: string | null; name: string }) {
  const [failed, setFailed] = useState(false)
  if (!url || failed) return <span className="text-muted">-</span>

  return (
    <img
      src={url}
      alt={`${name} patch`}
      width={40}
      height={40}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-10 w-10 rounded-sm bg-canvas object-contain"
    />
  )
}
