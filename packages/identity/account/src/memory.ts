/**
 * In-memory account provider for tests and compositions that need the seam
 * without GitHub OAuth. Mode is `github` so ownership and request-scoping
 * match the shipped provider; HTTP auth is a 404.
 * @module @deepseek-ai/dsh-account/src/memory
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { AccountService } from './index.ts'
import type { AccountId, AccountMode, OwnedConversationId, Principal } from './types.ts'

/** Seed one in-memory principal that `readPrincipalFromRequest` returns when the cookie matches. */
export interface MemoryAccountSeed {
  /** Cookie value that selects this principal (`dsh-account-test=<id>`). */
  principal: Principal
}

/**
 * In-memory {@link AccountService} with optional cookie-selected principals
 * and a Map-backed ownership table.
 */
export class MemoryAccount extends AccountService {
  readonly mode: AccountMode
  private readonly principals = new Map<string, Principal>()
  private readonly owners = new Map<string, AccountId>()

  /**
   * @param ctx - Cordis context that receives `ctx.account`.
   * @param seed - principals addressable by the test cookie.
   * @param mode - authentication mode (default `github` so ownership matches the shipped provider).
   */
  constructor(ctx: Context, seed: MemoryAccountSeed[] = [], mode: AccountMode = 'github') {
    super(ctx)
    this.mode = mode
    for (const row of seed) this.principals.set(row.principal.id, row.principal)
  }

  override readPrincipalFromRequest(request: Request): Promise<Principal | undefined> {
    const cookie = request.headers.get('cookie') ?? ''
    const match = /(?:^|;\s*)dsh-account-test=([^;]+)/.exec(cookie)
    const token = match?.[1]
    if (token === undefined) return Promise.resolve(undefined)
    return Promise.resolve(this.principals.get(decodeURIComponent(token)))
  }

  override handleAuthHttp(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.writeHead(404)
    res.end()
    return Promise.resolve()
  }

  override recordConversationOwner(owner: AccountId, conversationId: OwnedConversationId): Promise<void> {
    const existing = this.owners.get(conversationId)
    if (existing !== undefined && existing !== owner) {
      return Promise.reject(new Error(`account: conversation ${conversationId} is owned by another account`))
    }
    if (existing === owner) return Promise.resolve()
    this.owners.set(conversationId, owner)
    this.ctx.emit('account/conversation-owned', owner, conversationId)
    return Promise.resolve()
  }

  override conversationOwner(conversationId: OwnedConversationId): AccountId | undefined {
    return this.owners.get(conversationId)
  }

  override conversationIdsOwnedBy(owner: AccountId): readonly OwnedConversationId[] {
    const ids: OwnedConversationId[] = []
    for (const [id, account] of this.owners) {
      if (account === owner) ids.push(id as OwnedConversationId)
    }
    return ids
  }
}
