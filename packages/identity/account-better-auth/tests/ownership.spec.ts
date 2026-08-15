import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, expect, it } from 'vitest'
import { accountId, ownedConversationId } from '@deepseek-ai/dsh-account'
import { ConversationOwnershipStore } from '../src/ownership.ts'

let dir: string | undefined

afterEach(async () => {
  if (dir !== undefined) await rm(dir, { recursive: true, force: true })
  dir = undefined
})

describe('ConversationOwnershipStore', () => {
  it('records insert-only in memory', () => {
    const store = new ConversationOwnershipStore(undefined)
    const conversation = ownedConversationId('s1')
    store.record(accountId('alice'), conversation)
    store.record(accountId('alice'), conversation)
    expect(() => store.record(accountId('bob'), conversation)).toThrow('owned by another account')
    expect(store.ownerOf(conversation)).toBe('alice')
    expect(store.idsOwnedBy(accountId('alice'))).toEqual([conversation])
    store.record(accountId('bob'), ownedConversationId('s2'))
    expect(store.idsOwnedBy(accountId('alice'))).toEqual([conversation])
    expect(store.idsOwnedBy(accountId('bob'))).toEqual([ownedConversationId('s2')])
  })

  it('reloads durable rows', async () => {
    dir = await mkdtemp(join(tmpdir(), 'dsh-account-own-'))
    const path = join(dir, 'own.sqlite')
    const db = new DatabaseSync(path)
    const store = new ConversationOwnershipStore(db)
    store.record(accountId('alice'), ownedConversationId('s1'))
    db.close()
    const reopened = new DatabaseSync(path)
    const reloaded = new ConversationOwnershipStore(reopened)
    expect(reloaded.ownerOf(ownedConversationId('s1'))).toBe('alice')
    reopened.close()
  })
})
