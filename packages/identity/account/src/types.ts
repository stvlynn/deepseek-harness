/**
 * Client-safe type surface of the account seam: brands, principal records,
 * the `/api/auth` path constant, and the Cordis event declaration.
 *
 * @module @deepseek-ai/dsh-account/types
 */

import type { Branded } from '@deepseek-ai/dsh-brand'

/** HTTP prefix owned by the account provider (OAuth, session cookie, sign-out). */
export const ACCOUNT_AUTH_PATH = '/api/auth'

/** Nominal id of one authenticated Harness account (better-auth user id). */
export type AccountId = Branded<'AccountId'>

/** Conversation-log id recorded against an account; the same string the session plane uses. */
export type OwnedConversationId = Branded<'OwnedConversationId'>

/** How the account provider authenticates operators. */
export type AccountMode = 'off' | 'github'

/** Signed-in operator facts safe to echo to the Web client. */
export interface Principal {
  /** Durable account id. */
  id: AccountId
  /** Display name from the identity provider. */
  name: string
  /** Optional avatar URL from the identity provider. */
  image?: string
}

/** Snapshot published on `host.describe` and read by the account UI. */
export interface AccountSnapshot {
  /** Active authentication mode. */
  mode: AccountMode
  /** Current request's signed-in principal, or `null` while signed out. */
  principal: Principal | null
}

declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * A conversation-log id was durably bound to an account. Emitted only after
     * the ownership row commits. Listener failures are contained except
     * `INVARIANT`-coded failures, which rethrow after every listener ran.
     * @param accountId - the owning account.
     * @param conversationId - the bound conversation-log id.
     * @mode emit
     */
    'account/conversation-owned'(accountId: AccountId, conversationId: OwnedConversationId): void
  }
}
