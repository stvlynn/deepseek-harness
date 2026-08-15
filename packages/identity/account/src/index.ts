/**
 * Service Definition for the account capability (`ctx.account`). Providers
 * authenticate browser operators (GitHub OAuth in the shipped implementation)
 * and bind conversation-log ids to those principals. This is not the
 * anonymous telemetry id, not LLM credential references, and not a
 * conversation-log "session".
 * @module @deepseek-ai/dsh-account
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Context, Service } from '@deepseek-ai/cordis'
import type {
  AccountId,
  AccountMode,
  AccountSnapshot,
  OwnedConversationId,
  Principal,
} from './types.ts'

export type {
  AccountId,
  AccountMode,
  AccountSnapshot,
  OwnedConversationId,
  Principal,
} from './types.ts'
export { ACCOUNT_AUTH_PATH } from './types.ts'
export { MemoryAccount, type MemoryAccountSeed } from './memory.ts'

const principalStorage = new AsyncLocalStorage<Principal | undefined>()

declare module '@deepseek-ai/cordis' {
  interface Context {
    account: AccountService
  }
}

/**
 * Brand a raw string as an {@link AccountId}.
 * @param value - durable account id from the identity provider.
 * @returns the branded id.
 */
export function accountId(value: string): AccountId {
  return value as AccountId
}

/**
 * Brand a conversation-log id for ownership records.
 * @param value - the session plane's conversation id string.
 * @returns the branded conversation id.
 */
export function ownedConversationId(value: string): OwnedConversationId {
  return value as OwnedConversationId
}

/**
 * Abstract account service. Providers implement HTTP auth, cookie principals,
 * and conversation ownership. `currentPrincipal` reads the request-scoped
 * AsyncLocalStorage slot that {@link runWithPrincipal} installs; it is empty
 * outside that scope.
 */
export abstract class AccountService extends Service {
  /**
   * @param ctx - Host context that receives `ctx.account`.
   */
  constructor(ctx: Context) {
    super(ctx, 'account')
  }

  /** Active authentication mode for this process. */
  abstract readonly mode: AccountMode

  /**
   * Snapshot for `host.describe` and the account UI. `principal` is the
   * current request-scoped value, or `null` when signed out / mode `off`.
   * @returns the public account snapshot.
   */
  snapshot(): AccountSnapshot {
    return {
      mode: this.mode,
      principal: this.currentPrincipal() ?? null,
    }
  }

  /**
   * Principal installed by {@link runWithPrincipal} for this async context.
   * @returns the principal, or `undefined` outside a request scope or when signed out.
   */
  currentPrincipal(): Principal | undefined {
    return principalStorage.getStore()
  }

  /**
   * Run `fn` with `principal` as {@link currentPrincipal} for the async
   * continuation. Nested calls replace the slot for their duration.
   * @param principal - signed-in operator, or `undefined` when signed out.
   * @param fn - work that may read {@link currentPrincipal}.
   * @returns `fn`'s return value.
   */
  runWithPrincipal<T>(principal: Principal | undefined, fn: () => T): T {
    return principalStorage.run(principal, fn)
  }

  /**
   * Resolve a signed-in principal from one Fetch request's cookies.
   * @param request - same-origin `/api` request that may carry the auth cookie.
   * @returns the principal, or `undefined` when signed out or mode is `off`.
   */
  abstract readPrincipalFromRequest(request: Request): Promise<Principal | undefined>

  /**
   * Handle one node:http request under {@link ACCOUNT_AUTH_PATH}.
   * @param req - incoming HTTP request.
   * @param res - HTTP response the provider owns to completion.
   * @returns after the response is written.
   */
  abstract handleAuthHttp(req: IncomingMessage, res: ServerResponse): Promise<void>

  /**
   * Durably bind a conversation-log id to `accountId`. A matching existing
   * row is a no-op. A row owned by a different account is refused.
   * @param owner - the account that may see this conversation.
   * @param conversationId - conversation-log id to bind.
   * @returns after the ownership row commits.
   */
  abstract recordConversationOwner(owner: AccountId, conversationId: OwnedConversationId): Promise<void>

  /**
   * Owner of one conversation-log id.
   * @param conversationId - conversation-log id to look up.
   * @returns the owning account, or `undefined` when unowned.
   */
  abstract conversationOwner(conversationId: OwnedConversationId): AccountId | undefined

  /**
   * Conversation-log ids bound to one account.
   * @param owner - the account whose conversations to list.
   * @returns the bound ids in insertion order.
   */
  abstract conversationIdsOwnedBy(owner: AccountId): readonly OwnedConversationId[]

  /**
   * Whether `principal` may use `conversationId`. Unowned conversations are
   * visible only while signed out. Signed-in operators see only their own.
   * Mode `off` allows every id.
   * @param conversationId - conversation-log id under consideration.
   * @param allowClaim - when true, a signed-in operator may bind an unowned id.
   * @returns whether the current principal may proceed.
   */
  mayAccessConversation(conversationId: OwnedConversationId, allowClaim: boolean): boolean {
    if (this.mode === 'off') return true
    const principal = this.currentPrincipal()
    const owner = this.conversationOwner(conversationId)
    if (principal === undefined) return owner === undefined
    if (owner === principal.id) return true
    return allowClaim && owner === undefined
  }
}

export default AccountService
