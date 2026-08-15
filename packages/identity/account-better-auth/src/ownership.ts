/**
 * SQLite conversation-ownership table beside better-auth's user tables.
 * @module @deepseek-ai/dsh-account-better-auth/src/ownership
 */

import type { DatabaseSync } from 'node:sqlite'
import type { AccountId, OwnedConversationId } from '@deepseek-ai/dsh-account'

/** In-memory plus durable ownership index keyed by conversation-log id. */
export class ConversationOwnershipStore {
  private readonly owners = new Map<string, AccountId>()

  /**
   * @param db - open SQLite handle shared with better-auth, or `undefined` for memory-only (mode `off`).
   */
  constructor(private readonly db: DatabaseSync | undefined) {
    this.db?.exec(
      'CREATE TABLE IF NOT EXISTS conversation_owner (session_id TEXT PRIMARY KEY NOT NULL, account_id TEXT NOT NULL)',
    )
    if (this.db !== undefined) {
      const rows = this.db.prepare('SELECT session_id, account_id FROM conversation_owner').all() as Array<{
        session_id: string
        account_id: string
      }>
      for (const row of rows) this.owners.set(row.session_id, row.account_id as AccountId)
    }
  }

  /**
   * Insert-only bind. A matching row is a no-op; a different owner is refused.
   * @param owner - owning account.
   * @param conversationId - conversation-log id.
   */
  record(owner: AccountId, conversationId: OwnedConversationId): void {
    const existing = this.owners.get(conversationId)
    if (existing !== undefined && existing !== owner) {
      throw new Error(`account: conversation ${conversationId} is owned by another account`)
    }
    if (existing === owner) return
    this.db?.prepare('INSERT INTO conversation_owner (session_id, account_id) VALUES (?, ?)').run(conversationId, owner)
    this.owners.set(conversationId, owner)
  }

  /**
   * Owner of one conversation-log id.
   * @param conversationId - conversation-log id.
   * @returns the owning account, or `undefined` when unowned.
   */
  ownerOf(conversationId: OwnedConversationId): AccountId | undefined {
    return this.owners.get(conversationId)
  }

  /**
   * Conversation-log ids bound to one account.
   * @param owner - owning account.
   * @returns ids in Map insertion order.
   */
  idsOwnedBy(owner: AccountId): readonly OwnedConversationId[] {
    const ids: OwnedConversationId[] = []
    for (const [id, account] of this.owners) {
      if (account === owner) ids.push(id as OwnedConversationId)
    }
    return ids
  }
}
