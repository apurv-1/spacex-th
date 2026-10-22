import type { Rocket } from '../types.ts'

export function RocketFilter({
  rockets,
  value,
  onChange,
  disabled,
}: {
  rockets: Rocket[]
  value: string | null
  onChange: (rocketId: string | null) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="rocket-filter" className="text-sm text-muted">
        Rocket
      </label>
      <select
        id="rocket-filter"
        className="w-full max-w-xs rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink scheme-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
      >
        <option value="">All rockets</option>
        {rockets.map((rocket) => (
          <option key={rocket.id} value={rocket.id}>
            {rocket.name}
          </option>
        ))}
      </select>
    </div>
  )
}
