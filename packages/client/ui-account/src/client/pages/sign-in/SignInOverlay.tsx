import { useCallback, useState, type ReactNode } from 'react'
import { Button, OnboardingSurface } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { AccountInjected } from '../../account-inject.ts'
import { signInWithGithub } from '../../github-auth.ts'
import { GithubMark } from '../../github-mark.tsx'
import { NS } from '../../locales.ts'
import css from './SignInOverlay.module.css'

/** Coordinator owner props plus this overlay's injected face and locale. */
export type SignInOverlayProps =
  PropsRuntime<'shell.overlay'>
  & PropsLocale<typeof NS>
  & InjectFace<AccountInjected>

/**
 * Full-viewport GitHub sign-in takeover for a non-loopback Host in GitHub
 * mode while signed out. Returns null in every other Host description state.
 * @param props - overlay runtime share, locale, and Host description hook.
 * @returns the onboarding surface, or null when sign-in is not required.
 */
export function SignInOverlay({ isLoopback, useHostDescription, t }: SignInOverlayProps): ReactNode {
  const account = useHostDescription(description => description?.account)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  const onSignIn = useCallback(() => {
    setPending(true)
    setError(false)
    void signInWithGithub(`${window.location.origin}/`).catch(() => {
      setError(true)
      setPending(false)
    })
  }, [])

  if (account === undefined || account.mode !== 'github' || account.principal !== null || isLoopback) {
    return null
  }

  return (
    <OnboardingSurface>
      <div className={css.card} role="dialog" aria-labelledby="account-sign-in-title">
        <h1 className={css.title} id="account-sign-in-title">{t('signInTitle')}</h1>
        <p className={css.lead}>{t('signInLead')}</p>
        <Button variant="primary" disabled={pending} icon={<GithubMark />} onClick={onSignIn}>
          {t('signInGithub')}
        </Button>
        {error ? <p className={css.error} role="alert">{t('signInError')}</p> : null}
      </div>
    </OnboardingSurface>
  )
}
