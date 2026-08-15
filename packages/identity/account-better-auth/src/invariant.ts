/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-account-better-auth`.
 * @module @deepseek-ai/dsh-account-better-auth/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-account-better-auth'

/** Cordis companion plugin name. */
export const name = 'account-better-auth-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: ownership events and the live `ctx.account` relation
 * are owned by `@deepseek-ai/dsh-account`; this package only supplies the
 * better-auth HTTP adapter and SQLite handle.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
