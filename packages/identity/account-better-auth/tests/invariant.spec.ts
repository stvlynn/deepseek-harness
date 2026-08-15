import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import * as AccountBetterAuthInvariant from '@deepseek-ai/dsh-account-better-auth/invariant'

describe('invariant companion', () => {
  it('registers package ownership with an empty installer', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    await expect(ctx.plugin(AccountBetterAuthInvariant).await()).resolves.toBeDefined()
  })
})
