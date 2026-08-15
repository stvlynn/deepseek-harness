/**
 * Service Definition for the account capability (`ctx.account`). Providers
 * authenticate browser operators (GitHub OAuth in the shipped implementation)
 * and bind conversation-log ids to those principals. This is not the
 * anonymous telemetry id, not LLM credential references, and not a
 * conversation-log "session".
 * @module @deepseek-ai/dsh-account
 */

export type {
  AccountId,
  AccountMode,
  AccountSnapshot,
  OwnedConversationId,
  Principal,
} from './types.ts'
export { ACCOUNT_AUTH_PATH } from './types.ts'
export { accountId, AccountService, ownedConversationId } from './service.ts'
export { MemoryAccount, type MemoryAccountSeed } from './memory.ts'
export { default } from './service.ts'
