import { describe, expect, it } from 'vitest'
import { BUTTON_PAGE_LIMIT, PAGE_SIZE, flattenPages, launchCacheKey, loadMode } from './paging.ts'
import type { Launch } from '../types.ts'

function launch(id: string): Launch {
  return {
    id,
    missionName: id,
    rocketName: 'Falcon 9',
    rocketId: 'falcon9',
    dateUtc: '2020-01-01T00:00:00.000Z',
    details: null,
    thumbnailUrl: null,
  }
}

describe('loadMode', () => {
  it('uses the button for the first ten pages and scroll after that', () => {
    expect(PAGE_SIZE).toBe(3)
    expect(BUTTON_PAGE_LIMIT).toBe(10)
    expect(loadMode(0, true)).toBe('button')
    expect(loadMode(1, true)).toBe('button')
    expect(loadMode(9, true)).toBe('button')
    expect(loadMode(10, true)).toBe('scroll')
    expect(loadMode(11, true)).toBe('scroll')
    expect(loadMode(4, false)).toBe('complete')
    expect(loadMode(10, false)).toBe('complete')
  })
})

describe('flattenPages', () => {
  it('concatenates loaded pages in order and skips a gap', () => {
    const pages = new Map<number, Launch[]>([
      [2, [launch('b')]],
      [1, [launch('a')]],
    ])
    expect(flattenPages(pages, 2).map((row) => row.id)).toEqual(['a', 'b'])
    expect(flattenPages(pages, 1).map((row) => row.id)).toEqual(['a'])
  })
})

describe('launchCacheKey', () => {
  it('includes the rocket and the page', () => {
    expect(launchCacheKey(null, 1)).toBe('launches:all:date_utc:desc:3:1')
    expect(launchCacheKey('heavy', 4)).toBe('launches:heavy:date_utc:desc:3:4')
  })
})
