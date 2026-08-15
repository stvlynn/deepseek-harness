/**
 * Account surface plugin, browser half: GitHub sign-in overlay on
 * `shell.overlay` and the sidebar-footer account menu. Host description
 * arrives through the connection's observable snapshot; the overlay paints
 * only for a non-loopback GitHub Host while signed out.
 */
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { SignInOverlay } from './pages/sign-in/SignInOverlay.tsx'
import { AccountMenu } from './widgets/account-menu/AccountMenu.tsx'
import { en, NS, zh, type AccountKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** GitHub sign-in overlay and account-menu copy. */
    'account': AccountKey
  }
}

export type { AccountInjected } from './account-inject.ts'
export type { SignInOverlayProps } from './pages/sign-in/SignInOverlay.tsx'
export type { AccountMenuProps } from './widgets/account-menu/AccountMenu.tsx'

/** Required services for locale registration and the two slot contributions. */
export const inject = ['slots', 'locale', 'connection']

/**
 * Client plugin body: register dictionaries, the sign-in overlay, and the
 * sidebar account menu. Both entries stay registered in mode `off` and render
 * nothing until `host.describe` reports GitHub mode.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const connection = ctx.get('connection') as ConnectionHandle
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-account: dictionaries')
  const injected = (): import('./account-inject.ts').AccountInjected => ({
    isLoopback: connection.isLoopback,
    hooks: { hostDescription: connection.hostDescription },
  })
  ctx.slots.inject(
    'shell.overlay',
    () => ctx.slots.register({
      name: 'shell.overlay',
      id: 'account-sign-in',
      order: 50,
      locale: NS,
      inject: injected,
    }, SignInOverlay),
  )
  ctx.slots.inject(
    'sidebar.footer.action',
    () => ctx.slots.register({
      name: 'sidebar.footer.action',
      id: 'account-menu',
      order: 20,
      locale: NS,
      inject: injected,
    }, AccountMenu),
  )
}
