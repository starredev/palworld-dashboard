import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

process.env.CONFIG_PROFILES_PATH = join(
  mkdtempSync(join(tmpdir(), 'tsuki-profiles-')),
  'config-profiles.json',
)

const { upsertProfile, deleteProfile, getProfiles, createEvent, eventStatus } =
  await import('./config-profiles')

describe('config profiles', () => {
  it('upserts by name (replaces instead of duplicating)', () => {
    const a = upsertProfile({ name: 'Double EXP', body: 'ExpRate=2.000000', announce: 'live!' })
    const b = upsertProfile({ name: 'double exp', body: 'ExpRate=3.000000', announce: '' })
    expect(b.id).toBe(a.id)
    expect(getProfiles()).toHaveLength(1)
    expect(getProfiles()[0].body).toBe('ExpRate=3.000000')
  })

  it('deletes a profile', () => {
    const p = upsertProfile({ name: 'Temp', body: 'ExpRate=1.000000', announce: '' })
    deleteProfile(p.id)
    expect(getProfiles().find((x) => x.id === p.id)).toBeUndefined()
  })
})

describe('eventStatus', () => {
  it('classifies upcoming / active / done', () => {
    const p = upsertProfile({ name: 'Base', body: 'ExpRate=1.000000', announce: '' })
    const event = createEvent({
      name: 'Weekend',
      profileId: p.id,
      revertProfileId: p.id,
      recurrence: 'once',
      startsAt: '2026-08-08T18:00:00.000Z',
      endsAt: '2026-08-11T09:00:00.000Z',
    })
    expect(eventStatus(event, new Date('2026-08-07T00:00:00Z'))).toBe('upcoming')
    expect(eventStatus(event, new Date('2026-08-09T00:00:00Z'))).toBe('active')
    expect(eventStatus(event, new Date('2026-08-12T00:00:00Z'))).toBe('done')
  })

  it('classifies a weekly window (wrapping the week)', () => {
    const p = upsertProfile({ name: 'Base', body: 'ExpRate=1.000000', announce: '' })
    // Fri 18:00 → Mon 06:00 (wraps Sun→Mon)
    const event = createEvent({
      name: 'Weekend',
      profileId: p.id,
      revertProfileId: p.id,
      recurrence: 'weekly',
      startDay: 5,
      startTime: '18:00',
      endDay: 1,
      endTime: '06:00',
    })
    // Sat noon = inside; Wed noon = outside
    expect(eventStatus(event, new Date(2026, 7, 8, 12, 0))).toBe('active') // Sat
    expect(eventStatus(event, new Date(2026, 7, 12, 12, 0))).toBe('upcoming') // Wed
  })
})
