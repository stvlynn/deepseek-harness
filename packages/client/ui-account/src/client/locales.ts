/** `account` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'account'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  signInTitle: '登录',
  signInLead: '使用 GitHub 登录后即可从网络访问此 Host。',
  signInGithub: '使用 GitHub 登录',
  signInError: 'GitHub 登录失败，请重试。',
  signOut: '退出登录',
  signOutError: '退出登录失败，请重试。',
  menuLabel: '账户',
} as const

/** English dictionary, key-identical to the Chinese source of truth. */
export const en: Record<AccountKey, string> = {
  signInTitle: 'Sign in',
  signInLead: 'Sign in with GitHub to use this Host from the network.',
  signInGithub: 'Sign in with GitHub',
  signInError: 'GitHub sign-in failed. Try again.',
  signOut: 'Sign out',
  signOutError: 'Sign-out failed. Try again.',
  menuLabel: 'Account',
}

/** Key domain of the `account` namespace (zh is the source of truth). */
export type AccountKey = keyof typeof zh
