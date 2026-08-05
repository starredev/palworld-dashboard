import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { restartScheduleSchema } from '@tsuki/types'

// Point persistence at a temp file BEFORE the service (and thus loadEnv) runs.
process.env.RESTART_SCHEDULE_PATH = join(
  mkdtempSync(join(tmpdir(), 'tsuki-sched-')),
  'restart-schedule.json',
)

const { computeNextRun, getSchedule, saveSchedule } = await import('./restart-schedule')

describe('computeNextRun', () => {
  it('returns null when disabled', () => {
    const schedule = restartScheduleSchema.parse({ enabled: false, time: '04:00' })
    expect(computeNextRun(schedule, new Date('2026-08-05T10:00:00'))).toBeNull()
  })

  it('picks today when the time is still ahead', () => {
    const schedule = restartScheduleSchema.parse({ enabled: true, time: '22:00' })
    const next = computeNextRun(schedule, new Date('2026-08-05T10:00:00'))
    expect(next?.getDate()).toBe(5)
    expect(next?.getHours()).toBe(22)
  })

  it('rolls over to tomorrow when the time has passed', () => {
    const schedule = restartScheduleSchema.parse({ enabled: true, time: '04:00' })
    const next = computeNextRun(schedule, new Date('2026-08-05T10:00:00'))
    expect(next?.getDate()).toBe(6)
    expect(next?.getHours()).toBe(4)
  })
})

describe('schedule persistence', () => {
  it('defaults to disabled and round-trips a saved schedule', () => {
    expect(getSchedule().enabled).toBe(false)
    const saved = saveSchedule(
      restartScheduleSchema.parse({ enabled: true, time: '03:30', warnMinutes: 10 }),
    )
    expect(saved).toMatchObject({ enabled: true, time: '03:30', warnMinutes: 10 })
    expect(getSchedule()).toMatchObject({ enabled: true, time: '03:30' })
  })
})
