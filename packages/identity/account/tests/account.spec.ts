import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { AccountService, accountId, ownedConversationId } from '../src/index.ts'
import { MemoryAccount } from '../src/memory.ts'
import type { Principal } from '../src/types.ts'

const alice: Principal = { id: accountId('alice'), name: 'Alice' }
const bob: Principal = { id: accountId('bob'), name: 'Bob' }

describe('MemoryAccount', () => {
  it('scopes the principal to runWithPrincipal', async () => {
    const ctx = new Context()
    const account = new MemoryAccount(ctx, [{ principal: alice }])
    expect(account.currentPrincipal()).toBeUndefined()
    expect(account.runWithPrincipal(alice, () => account.currentPrincipal()?.id)).toBe(alice.id)
    expect(account.currentPrincipal()).toBeUndefined()
  })

  it('resolves the test cookie to a seeded principal', async () => {
    const ctx = new Context()
    const account = new MemoryAccount(ctx, [{ principal: alice }])
    const missing = await account.readPrincipalFromRequest(new Request('http://127.0.0.1/api/session.list'))
    expect(missing).toBeUndefined()
    const hit = await account.readPrincipalFromRequest(new Request('http://127.0.0.1/api/session.list', {
      headers: { cookie: 'dsh-account-test=alice' },
    }))
    expect(hit).toEqual(alice)
  })

  it('binds conversation ownership insert-only', async () => {
    const ctx = new Context()
    const account = new MemoryAccount(ctx)
    const conversation = ownedConversationId('session-1')
    const owned: Array<[string, string]> = []
    ctx.on('account/conversation-owned', (accountId, conversationId) => {
      owned.push([accountId, conversationId])
    })
    await account.recordConversationOwner(alice.id, conversation)
    await account.recordConversationOwner(alice.id, conversation)
    await expect(account.recordConversationOwner(bob.id, conversation))
      .rejects.toThrow('owned by another account')
    expect(account.conversationOwner(conversation)).toBe(alice.id)
    expect(account.conversationIdsOwnedBy(alice.id)).toEqual([conversation])
    expect(account.conversationIdsOwnedBy(bob.id)).toEqual([])
    expect(owned).toEqual([[alice.id, conversation]])
  })

  it('applies signed-in and signed-out visibility', () => {
    const ctx = new Context()
    const account = new MemoryAccount(ctx)
    const owned = ownedConversationId('owned')
    const free = ownedConversationId('free')
    void account.recordConversationOwner(alice.id, owned)
    expect(account.mayAccessConversation(free, false)).toBe(true)
    expect(account.mayAccessConversation(owned, false)).toBe(false)
    account.runWithPrincipal(alice, () => {
      expect(account.mayAccessConversation(owned, false)).toBe(true)
      expect(account.mayAccessConversation(free, false)).toBe(false)
      expect(account.mayAccessConversation(free, true)).toBe(true)
    })
    account.runWithPrincipal(bob, () => {
      expect(account.mayAccessConversation(owned, true)).toBe(false)
    })
  })

  it('allows every conversation in mode off', () => {
    const ctx = new Context()
    const account = new MemoryAccount(ctx, [], 'off')
    const owned = ownedConversationId('owned')
    void account.recordConversationOwner(alice.id, owned)
    expect(account.mode).toBe('off')
    expect(account.mayAccessConversation(owned, false)).toBe(true)
    account.runWithPrincipal(bob, () => {
      expect(account.mayAccessConversation(owned, false)).toBe(true)
    })
  })

  it('answers 404 for auth HTTP', async () => {
    const ctx = new Context()
    const account = new MemoryAccount(ctx)
    const res = {
      status: 0,
      writeHead(code: number) { this.status = code },
      end() {},
    }
    await account.handleAuthHttp({} as never, res as never)
    expect(res.status).toBe(404)
  })
})

describe('AccountService.snapshot', () => {
  it('reports github mode and the request principal', () => {
    const ctx = new Context()
    const account = new MemoryAccount(ctx)
    expect(account.snapshot()).toEqual({ mode: 'github', principal: null })
    account.runWithPrincipal(alice, () => {
      expect(account.snapshot()).toEqual({ mode: 'github', principal: alice })
    })
  })

  it('reports off mode without a principal', () => {
    const ctx = new Context()
    const account = new MemoryAccount(ctx, [], 'off')
    expect(account.snapshot()).toEqual({ mode: 'off', principal: null })
  })

  it('is the account service on ctx', () => {
    const ctx = new Context()
    const account = new MemoryAccount(ctx)
    expect(account).toBeInstanceOf(AccountService)
  })
})
