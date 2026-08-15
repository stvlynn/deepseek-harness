/**
 * Host better-auth HTTP helpers. The path is the same protocol constant as
 * `ACCOUNT_AUTH_PATH` in `@deepseek-ai/dsh-account`; the client copies it so
 * this bundle stays free of the Host service module.
 */

/** HTTP prefix owned by the Host account provider. */
export const ACCOUNT_AUTH_PATH = '/api/auth'

/**
 * Start GitHub OAuth through the Host better-auth handler.
 * @param callbackURL - origin-relative or absolute URL after GitHub returns.
 * @returns after the Host answers; the browser then navigates to GitHub when a URL is returned.
 */
export async function signInWithGithub(callbackURL: string): Promise<void> {
  const response = await fetch(`${ACCOUNT_AUTH_PATH}/sign-in/social`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'github', callbackURL }),
  })
  if (!response.ok) {
    throw new Error(`GitHub sign-in failed (${String(response.status)})`)
  }
  const payload = (await response.json()) as { url?: string }
  if (typeof payload.url === 'string' && payload.url.length > 0) {
    window.location.assign(payload.url)
  }
}

/**
 * Clear the better-auth session cookie and reload so Host RPC sees signed-out.
 * @returns after the Host clears the cookie; then reloads the page.
 */
export async function signOutAccount(): Promise<void> {
  const response = await fetch(`${ACCOUNT_AUTH_PATH}/sign-out`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  if (!response.ok) {
    throw new Error(`Sign-out failed (${String(response.status)})`)
  }
  window.location.reload()
}
