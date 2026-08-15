/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-account`.
 * @module @deepseek-ai/dsh-account/invariant
 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantFailure, InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-account'

/** Cordis companion plugin name. */
export const name = 'account-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * Install the ownership-event lifecycle contract: `account/conversation-owned`
 * names a committed bind, so it can only fire while an account service is live.
 */
const install: InvariantInstaller = (ctx: Context, fail: InvariantFailure) => {
  ctx.on('account/conversation-owned', (accountId, conversationId) => {
    if (ctx.get('account') === undefined) {
      fail(`account/conversation-owned for "${accountId}" / "${conversationId}" emitted without a live account service`)
    }
  })
}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
