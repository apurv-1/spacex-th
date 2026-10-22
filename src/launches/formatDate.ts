const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatLaunchDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  const month = MONTHS[date.getUTCMonth()] ?? '-'
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = String(date.getUTCFullYear())
  return `${month} ${day} ${year}`
}
