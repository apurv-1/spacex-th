export function listRockets(rockets) {
  return rockets
    .map((rocket) => ({ id: rocket.id, name: rocket.name }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function queryLaunches(launches, rockets, body = {}) {
  const input = body && typeof body === 'object' ? body : {}
  const query = input.query && typeof input.query === 'object' ? input.query : {}
  const options = input.options && typeof input.options === 'object' ? input.options : {}
  const rocketsById = new Map(rockets.map((rocket) => [rocket.id, rocket]))
  const limit = positiveInt(options.limit, 10)
  const page = positiveInt(options.page, 1)
  const sort = options.sort && typeof options.sort === 'object' ? options.sort : { date_utc: 'desc' }
  const sortField = Object.keys(sort)[0] ?? 'date_utc'
  const direction = sort[sortField] === 'asc' || sort[sortField] === 1 ? 1 : -1

  const filtered = launches.filter((launch) => {
    if (typeof query.rocket === 'string' && query.rocket.length > 0) {
      return launch.rocket === query.rocket
    }
    return true
  })

  const sorted = filtered.slice().sort((left, right) => {
    const leftValue = sortValue(left, sortField)
    const rightValue = sortValue(right, sortField)
    if (leftValue < rightValue) return -1 * direction
    if (leftValue > rightValue) return 1 * direction
    if (left.id < right.id) return -1
    if (left.id > right.id) return 1
    return 0
  })

  const totalDocs = sorted.length
  const start = (page - 1) * limit
  const docs = sorted.slice(start, start + limit).map((launch) => ({
    id: launch.id,
    name: launch.name,
    date_utc: launch.date_utc,
    details: launch.details,
    links: { patch: { small: launch.links?.patch?.small ?? null } },
    rocket: {
      id: launch.rocket,
      name: rocketsById.get(launch.rocket)?.name ?? 'Unknown rocket',
    },
  }))

  const hasNextPage = start + docs.length < totalDocs
  const hasPrevPage = page > 1 && start < totalDocs
  const totalPages = totalDocs === 0 ? 0 : Math.ceil(totalDocs / limit)

  return {
    docs,
    totalDocs,
    limit,
    totalPages,
    page,
    pagingCounter: totalDocs === 0 ? 0 : start + 1,
    hasPrevPage,
    hasNextPage,
    prevPage: hasPrevPage ? page - 1 : null,
    nextPage: hasNextPage ? page + 1 : null,
  }
}

function positiveInt(value, fallback) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1) return fallback
  return number
}

function sortValue(launch, field) {
  if (field === 'date_utc') {
    const time = Date.parse(launch.date_utc)
    return Number.isNaN(time) ? 0 : time
  }
  return launch[field] ?? ''
}
