import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

process.env.AUDIT_LOG_PATH = join(mkdtempSync(join(tmpdir(), 'tsuki-audit-')), 'audit.json')

const { recordAudit, listAudit, describeAction } = await import('./audit')

describe('describeAction', () => {
  it('maps a known mutating route to a slug + summary', () => {
    expect(describeAction('POST', '/api/server/config/apply')).toEqual({
      action: 'config.apply',
      summary: 'Applied config & restarted',
    })
  })

  it('ignores unmapped routes', () => {
    expect(describeAction('GET', '/api/players')).toBeNull()
    expect(describeAction('POST', '/api/unknown')).toBeNull()
  })
})

describe('audit log', () => {
  it('records entries and lists them newest first', () => {
    recordAudit({ actorId: 'a', actorName: 'Ann', action: 'server.save', summary: 'Saved' })
    recordAudit({ actorId: 'b', actorName: 'Bob', action: 'server.shutdown', summary: 'Restarted' })
    const entries = listAudit(10)
    expect(entries).toHaveLength(2)
    expect(entries[0].actorName).toBe('Bob')
    expect(entries[1].actorName).toBe('Ann')
    expect(entries[0].id).toBeTruthy()
    expect(entries[0].at).toBeTruthy()
  })
})
