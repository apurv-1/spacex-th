import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listRockets, queryLaunches } from './paginate.mjs'

type FixtureLaunch = {
  id: string
  name: string
  date_utc: string
  details: string | null
  rocket: string
  links: { patch: { small: string | null } }
}

type FixtureRocket = {
  id: string
  name: string
}

const launches = JSON.parse(
  readFileSync(join(process.cwd(), 'server/fixtures/launches.json'), 'utf8'),
) as FixtureLaunch[]

const rockets = JSON.parse(
  readFileSync(join(process.cwd(), 'server/fixtures/rockets.json'), 'utf8'),
) as FixtureRocket[]

describe('queryLaunches', () => {
  it('pages the snapshot newest first in threes', () => {
    expect(launches.length).toBeGreaterThan(33)

    const first = queryLaunches(launches, rockets, {
      options: { limit: 3, page: 1, sort: { date_utc: 'desc' } },
    })

    expect(first.docs).toHaveLength(3)
    expect(first.totalDocs).toBe(launches.length)
    expect(first.hasNextPage).toBe(true)
    expect(first.docs[0].rocket.name).toEqual(expect.any(String))
    expect(Date.parse(first.docs[0].date_utc)).toBeGreaterThanOrEqual(Date.parse(first.docs[1].date_utc))
    expect(Date.parse(first.docs[1].date_utc)).toBeGreaterThanOrEqual(Date.parse(first.docs[2].date_utc))

    const page10 = queryLaunches(launches, rockets, { options: { limit: 3, page: 10 } })
    expect(page10.docs).toHaveLength(3)
    expect(page10.hasNextPage).toBe(true)

    const page11 = queryLaunches(launches, rockets, { options: { limit: 3, page: 11 } })
    expect(page11.docs).toHaveLength(3)
    expect(page11.hasNextPage).toBe(true)
  })

  it('filters by rocket id', () => {
    const falcon1 = rockets.find((rocket) => rocket.name === 'Falcon 1')
    expect(falcon1).toBeDefined()

    const filtered = queryLaunches(launches, rockets, {
      query: { rocket: falcon1?.id },
      options: { limit: 3, page: 1, sort: { date_utc: 'desc' } },
    })

    expect(filtered.totalDocs).toBe(5)
    expect(filtered.docs).toHaveLength(3)
    expect(filtered.docs.every((doc) => doc.rocket.name === 'Falcon 1')).toBe(true)
    expect(filtered.docs[0].name).toBe('RazakSAT')
  })

  it('sorts ascending when asked', () => {
    const rows = [
      {
        id: 'b',
        name: 'B',
        date_utc: '2020-01-02T00:00:00.000Z',
        details: null,
        rocket: 'r',
        links: { patch: { small: null } },
      },
      {
        id: 'a',
        name: 'A',
        date_utc: '2020-01-01T00:00:00.000Z',
        details: null,
        rocket: 'r',
        links: { patch: { small: null } },
      },
    ]

    const result = queryLaunches(rows, [{ id: 'r', name: 'Falcon 9' }], {
      options: { limit: 10, page: 1, sort: { date_utc: 'asc' } },
    })

    expect(result.docs.map((doc) => doc.name)).toEqual(['A', 'B'])
  })

  it('returns an empty page past the end and names unknown rockets', () => {
    const past = queryLaunches(launches, rockets, { options: { limit: 3, page: 99 } })
    expect(past.docs).toEqual([])
    expect(past.hasNextPage).toBe(false)
    expect(past.totalDocs).toBe(launches.length)

    const unknown = queryLaunches(
      [
        {
          id: 'a',
          name: 'A',
          date_utc: '2020-01-01T00:00:00.000Z',
          details: 'Hi',
          rocket: 'missing',
          links: { patch: { small: null } },
        },
      ],
      [],
      { options: { limit: 3, page: 1 } },
    )

    expect(unknown.docs[0].rocket).toEqual({ id: 'missing', name: 'Unknown rocket' })
  })
})

describe('listRockets', () => {
  it('returns rocket names in alphabetical order', () => {
    expect(listRockets(rockets).map((rocket) => rocket.name)).toEqual([
      'Falcon 1',
      'Falcon 9',
      'Falcon Heavy',
      'Starship',
    ])
  })
})
