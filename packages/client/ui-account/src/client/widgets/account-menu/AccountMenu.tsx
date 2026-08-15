import { useCallback, useState, type ReactNode } from 'react'
import { Button, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { AccountInjected } from '../../account-inject.ts'
import { signInWithGithub, signOutAccount } from '../../github-auth.ts'
import { GithubMark } from '../../github-mark.tsx'
import { NS } from '../../locales.ts'
import css from './AccountMenu.module.css'

/** Sidebar-footer owner props plus this menu's injected face and locale. */
export type AccountMenuProps =
  PropsRuntime<'sidebar.footer.action'>
  & PropsLocale<typeof NS>
  & InjectFace<AccountInjected>

/**
 * Leading initials for the avatar fallback.
 * @param name - display name from the identity provider.
 * @returns one or two uppercase letters, or `?` when `name` is blank.
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/u).filter(Boolean)
  const first = parts[0]
  if (first === undefined) return '?'
  const last = parts.length > 1 ? parts[parts.length - 1] : undefined
  return `${first[0] ?? '?'}${last?.[0] ?? ''}`.toUpperCase()
}

/**
 * Sidebar footer control: GitHub sign-in when signed out, avatar menu when
 * signed in. Hidden while Host account mode is not `github`.
 * @param props - footer owner share, locale, and Host description hook.
 * @returns the footer control, or null when GitHub accounts are off.
 */
export function AccountMenu({ wide, useHostDescription, t }: AccountMenuProps): ReactNode {
  const account = useHostDescription(description => description?.account)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<'sign-in' | 'sign-out' | null>(null)

  const onSignIn = useCallback(() => {
    setPending(true)
    setError(null)
    void signInWithGithub(`${window.location.origin}/`).catch(() => {
      setError('sign-in')
      setPending(false)
    })
  }, [])

  const onSignOut = useCallback(() => {
    setPending(true)
    setError(null)
    void signOutAccount().catch(() => {
      setError('sign-out')
      setPending(false)
    })
  }, [])

  if (account === undefined || account.mode !== 'github') return null

  const principal = account.principal
  if (principal === null) {
    return (
      <div className={css.root}>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          icon={<GithubMark />}
          aria-label={t('signInGithub')}
          onClick={onSignIn}
        >
          {wide ? t('signInGithub') : null}
        </Button>
        {error === 'sign-in' ? <p className={css.error} role="alert">{t('signInError')}</p> : null}
      </div>
    )
  }

  const label = principal.name
  const avatar = principal.image === undefined
    ? <span className={css.fallback} aria-hidden="true">{initials(label)}</span>
    : <img className={css.image} src={principal.image} alt="" />

  return (
    <div className={css.root}>
      <Menu
        open={open}
        side="top"
        portal
        onClose={() => { setOpen(false) }}
        onSelect={(id) => {
          setOpen(false)
          if (id === 'sign-out') onSignOut()
        }}
        items={[{ id: 'sign-out', label: t('signOut'), disabled: pending, danger: true }]}
        anchor={(
          <Button
            className={css.trigger}
            size="sm"
            aria-label={t('menuLabel')}
            icon={avatar}
            onClick={() => { setOpen(current => !current) }}
          >
            {wide ? <span className={css.name}>{label}</span> : null}
          </Button>
        )}
      />
      {error === 'sign-out' ? <p className={css.error} role="alert">{t('signOutError')}</p> : null}
    </div>
  )
}
