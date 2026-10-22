import { describe, expect, it } from 'vitest'
import { formatLaunchDate } from './formatDate.ts'

describe('formatLaunchDate', () => {
  it('formats in UTC so early-morning launches keep the UTC day', () => {
    expect(formatLaunchDate('2014-09-07T02:00:00.000Z')).toBe('Sep 07 2014')
    expect(formatLaunchDate('not-a-date')).toBe('-')
  })
})
