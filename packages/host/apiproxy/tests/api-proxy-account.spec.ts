/**
 * Conversation ownership: `host.describe` echoes the account snapshot, list
 * hides other accounts' conversations, and create binds or refuses by owner.
 */
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import SessionStore from '@deepseek-ai/dsh-session'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import { MemoryAccount, accountId } from '@deepseek-ai/dsh-account'
import type { ApiProxy, RpcRequest } from '@deepseek-ai/dsh-host-apiproxy/api'
import { RpcId } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { createApiProxy } from '@deepseek-ai/dsh-host-apiproxy'

let nextRpc = 1
function request<P>(payload: P): RpcRequest<P> {
  return { rpcId: RpcId(`account-${String(nextRpc++)}`), payload }
}

const alice = { id: accountId('alice'), name: 'Alice' }
const bob = { id: accountId('bob'), name: 'Bob' }

async function harness(account?: MemoryAccount): Promise<{ ctx: Context; api: ApiProxy }> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(AgentRegistry)
  if (account === undefined) {
    /* no account plugin */
  }
  return {
    ctx,
    api: createApiProxy(ctx, { defaultModelSelection: () => ({ provider: 'p', model: 'm' }), cwd: '/tmp' }),
  }
}

describe('api proxy account ownership', () => {
  it('omits account from host.describe when the seam is absent', async () => {
    const { api } = await harness()
    const described = await api.host.describe(request({}))
    expect(described.result.ok).toBe(true)
    if (!described.result.ok) throw new Error('unreachable')
    expect(described.result.value.account).toBeUndefined()
  })

  it('echoes the request-scoped snapshot from host.describe', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(UserQuestionService)
    await ctx.plugin(AgentRegistry)
    const account = new MemoryAccount(ctx, [{ principal: alice }])
    const api = createApiProxy(ctx, { defaultModelSelection: () => ({ provider: 'p', model: 'm' }), cwd: '/tmp' })
    const signedOut = await api.host.describe(request({}))
    expect(signedOut.result.ok).toBe(true)
    if (!signedOut.result.ok) throw new Error('unreachable')
    expect(signedOut.result.value.account).toEqual({ mode: 'github', principal: null })
    const signedIn = account.runWithPrincipal(alice, () => api.host.describe(request({})))
    const described = await signedIn
    expect(described.result.ok).toBe(true)
    if (!described.result.ok) throw new Error('unreachable')
    expect(described.result.value.account).toEqual({ mode: 'github', principal: alice })
  })

  it('lists only conversations the current principal may see', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(UserQuestionService)
    await ctx.plugin(AgentRegistry)
    const account = new MemoryAccount(ctx)
    const api = createApiProxy(ctx, { defaultModelSelection: () => ({ provider: 'p', model: 'm' }), cwd: '/tmp' })
    const owned = ctx.sessions.create()
    const free = ctx.sessions.create()
    ctx.agents.register({ id: owned.id, session: owned, status: 'idle', ctx } as Agent)
    ctx.agents.register({ id: free.id, session: free, status: 'idle', ctx } as Agent)
    await account.recordConversationOwner(alice.id, owned.id as never)
    const signedOut = await api.sessions.list(request({}))
    expect(signedOut.result.ok).toBe(true)
    if (!signedOut.result.ok) throw new Error('unreachable')
    expect(signedOut.result.value.items.map(item => item.sessionId)).toEqual([free.id])
    const signedIn = await account.runWithPrincipal(alice, () => api.sessions.list(request({})))
    expect(signedIn.result.ok).toBe(true)
    if (!signedIn.result.ok) throw new Error('unreachable')
    expect(signedIn.result.value.items.map(item => item.sessionId)).toEqual([owned.id])
  })

  it('binds a created conversation to the signed-in principal', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(UserQuestionService)
    await ctx.plugin(AgentRegistry)
    const account = new MemoryAccount(ctx)
    const api = createApiProxy(ctx, { defaultModelSelection: () => ({ provider: 'p', model: 'm' }), cwd: '/tmp' })
    const session = ctx.sessions.create(undefined, { meta: { cwd: '/tmp' } })
    ctx.agents.register({ id: session.id, session, status: 'idle', ctx } as Agent)
    const created = await account.runWithPrincipal(alice, () => api.sessions.create(request({
      sessionId: session.id,
      cwd: '/tmp',
    })))
    expect(created.result.ok).toBe(true)
    if (!created.result.ok) throw new Error('unreachable')
    expect(account.conversationOwner(created.result.value.sessionId as never)).toBe(alice.id)
  })

  it('hides another account\'s conversation id behind session-not-found', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(UserQuestionService)
    await ctx.plugin(AgentRegistry)
    const account = new MemoryAccount(ctx)
    const api = createApiProxy(ctx, { defaultModelSelection: () => ({ provider: 'p', model: 'm' }), cwd: '/tmp' })
    const session = ctx.sessions.create()
    await account.recordConversationOwner(alice.id, session.id as never)
    const asBob = await account.runWithPrincipal(bob, () => api.sessions.create(request({ sessionId: session.id })))
    expect(asBob.result.ok).toBe(false)
    if (asBob.result.ok) throw new Error('unreachable')
    expect(asBob.result.error.code).toBe('session-not-found')
    const signedOut = await api.sessions.create(request({ sessionId: session.id }))
    expect(signedOut.result.ok).toBe(false)
    if (signedOut.result.ok) throw new Error('unreachable')
    expect(signedOut.result.error.code).toBe('session-not-found')
  })

  it('maps an ensureSession ownership miss to session-not-found', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(UserQuestionService)
    await ctx.plugin(AgentRegistry)
    class SilentRecord extends MemoryAccount {
      override recordConversationOwner(): Promise<void> {
        return Promise.resolve()
      }
    }
    const account = new SilentRecord(ctx)
    const api = createApiProxy(ctx, { defaultModelSelection: () => ({ provider: 'p', model: 'm' }), cwd: '/tmp' })
    const created = await account.runWithPrincipal(alice, () => api.sessions.create(request({})))
    expect(created.result.ok).toBe(false)
    if (created.result.ok) throw new Error('unreachable')
    expect(created.result.error.code).toBe('session-not-found')
  })
})
