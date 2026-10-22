import { describe, expect, it } from 'vitest'
import { launchQueryBody, normalizeLaunch, normalizeLaunchQuery } from './client.ts'

describe('launch query mapping', () => {
  it('builds the v4 query body', () => {
    expect(launchQueryBody('abc', 2, 3)).toEqual({
      query: { rocket: 'abc' },
      options: {
        limit: 3,
        page: 2,
        sort: { date_utc: 'desc' },
        select: ['name', 'date_utc', 'details', 'links', 'rocket'],
        populate: [{ path: 'rocket', select: { name: 1 } }],
      },
    })
    expect(launchQueryBody(null, 1, 3).query).toEqual({})
  })

  it('maps a populated launch and a bare rocket id', () => {
    expect(
      normalizeLaunch({
        id: '1',
        name: 'CRS-1',
        date_utc: '2012-10-08T00:35:00.000Z',
        details: null,
        rocket: { id: 'r1', name: 'Falcon 9' },
        links: { patch: { small: 'https://example.com/patch.png' } },
      }),
    ).toEqual({
      id: '1',
      missionName: 'CRS-1',
      rocketName: 'Falcon 9',
      rocketId: 'r1',
      dateUtc: '2012-10-08T00:35:00.000Z',
      details: null,
      thumbnailUrl: 'https://example.com/patch.png',
    })

    expect(
      normalizeLaunch({
        _id: '2',
        name: 'FalconSat-2',
        date_utc: '2006-03-24T22:30:00.000Z',
        rocket: 'r-falcon-1',
        links: { patch: { small: null } },
      }),
    ).toMatchObject({
      id: '2',
      rocketId: 'r-falcon-1',
      rocketName: 'Unknown rocket',
      thumbnailUrl: null,
      details: null,
    })
  })

  it('rejects a payload without the page fields', () => {
    expect(() => normalizeLaunchQuery({})).toThrow(/unexpected payload/)
    expect(
      normalizeLaunchQuery({
        docs: [],
        totalDocs: 0,
        page: 1,
        hasNextPage: false,
      }),
    ).toEqual({ docs: [], totalDocs: 0, page: 1, hasNextPage: false })
  })
})
