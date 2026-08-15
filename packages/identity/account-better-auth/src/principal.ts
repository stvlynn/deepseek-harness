/**
 * Map a better-auth user record onto the account-seam principal.
 * @module @deepseek-ai/dsh-account-better-auth/src/principal
 */

import { accountId, type Principal } from '@deepseek-ai/dsh-account'

/** Fields read from `auth.api.getSession().user`. */
export interface BetterAuthUser {
  /** Durable better-auth user id. */
  id: string
  /** Display name. */
  name: string
  /** Optional avatar URL. */
  image?: string | null | undefined
}

/**
 * Convert one better-auth user into a {@link Principal}.
 * @param user - session user from better-auth.
 * @returns the principal, or `undefined` when the user id is empty.
 */
export function principalFromUser(user: BetterAuthUser): Principal | undefined {
  if (user.id.length === 0) return undefined
  return {
    id: accountId(user.id),
    name: user.name,
    ...user.image === undefined || user.image === null || user.image.length === 0 ? {} : { image: user.image },
  }
}
