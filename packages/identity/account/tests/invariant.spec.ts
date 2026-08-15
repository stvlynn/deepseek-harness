import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import * as AccountInvariant from '@deepseek-ai/dsh-account/invariant'
import { accountId, ownedConversationId } from '../src/index.ts'
import { MemoryAccount } from '../src/memory.ts'

describe('invariant companion', () => {
  it('registers package ownership', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    await expect(ctx.plugin(AccountInvariant).await()).resolves.toBeDefined()
  })

  it('fails when conversation-owned fires without a live service', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    await ctx.plugin(AccountInvariant).await()
    expect(() => ctx.emit('account/conversation-owned', accountId('a'), ownedConversationId('s')))
      .toThrow(/without a live account service/)
  })

  it('allows conversation-owned while the service is live', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    await ctx.plugin(AccountInvariant).await()
    const account = new MemoryAccount(ctx)
    await account.recordConversationOwner(accountId('a'), ownedConversationId('s'))
  })
})
