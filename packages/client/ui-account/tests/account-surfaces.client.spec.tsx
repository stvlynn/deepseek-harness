// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { HostDescription } from '@deepseek-ai/dsh-client-connection/client'
import { SignInOverlay, type SignInOverlayProps } from '../src/client/pages/sign-in/SignInOverlay.tsx'
import { AccountMenu, initials, type AccountMenuProps } from '../src/client/widgets/account-menu/AccountMenu.tsx'
import { ACCOUNT_AUTH_PATH, signInWithGithub, signOutAccount } from '../src/client/github-auth.ts'
import { GithubMark } from '../src/client/github-mark.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const t = makeTranslate(zh)

function host(account?: HostDescription['account']): HostDescription {
  return {
    version: '0',
    cwd: '/',
    attachedSessions: 0,
    canOpenPath: false,
    ...account === undefined ? {} : { account },
  }
}

function overlayProps(over: {
  isLoopback?: boolean
  account?: HostDescription['account']
  missing?: boolean
}): SignInOverlayProps {
  const description = over.missing === true ? undefined : host(over.account)
  return {
    isLoopback: over.isLoopback ?? false,
    useHostDescription: selector => selector(description),
    t,
  } as unknown as SignInOverlayProps
}

function menuProps(over: {
  wide?: boolean
  account?: HostDescription['account']
  missing?: boolean
}): AccountMenuProps {
  const description = over.missing === true ? undefined : host(over.account)
  return {
    wide: over.wide ?? true,
    isLoopback: true,
    useHostDescription: selector => selector(description),
    t,
  } as unknown as AccountMenuProps
}

describe('SignInOverlay', () => {
  it('renders nothing without a GitHub signed-out non-loopback Host', () => {
    expect(render(<SignInOverlay {...overlayProps({ missing: true })} />).container.innerHTML).toBe('')
    cleanup()
    expect(render(<SignInOverlay {...overlayProps({ account: { mode: 'off', principal: null } })} />).container.innerHTML).toBe('')
    cleanup()
    expect(render(<SignInOverlay {...overlayProps({
      account: { mode: 'github', principal: { id: 'u', name: 'Ada' } },
    })} />).container.innerHTML).toBe('')
    cleanup()
    expect(render(<SignInOverlay {...overlayProps({
      isLoopback: true,
      account: { mode: 'github', principal: null },
    })} />).container.innerHTML).toBe('')
  })

  it('shows the GitHub takeover and reports a failed start', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)
    render(<SignInOverlay {...overlayProps({ account: { mode: 'github', principal: null } })} />)
    expect(screen.getByRole('dialog', { name: zh.signInTitle })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: zh.signInGithub }))
    expect((await screen.findByRole('alert')).textContent).toBe(zh.signInError)
    expect(fetchMock).toHaveBeenCalledWith(
      `${ACCOUNT_AUTH_PATH}/sign-in/social`,
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

describe('AccountMenu', () => {
  it('renders nothing when GitHub accounts are off', () => {
    expect(render(<AccountMenu {...menuProps({ missing: true })} />).container.innerHTML).toBe('')
    cleanup()
    expect(render(<AccountMenu {...menuProps({ account: { mode: 'off', principal: null } })} />).container.innerHTML).toBe('')
  })

  it('offers GitHub sign-in while signed out, including the compact rail', () => {
    render(<AccountMenu {...menuProps({ account: { mode: 'github', principal: null } })} />)
    expect(screen.getByRole('button', { name: zh.signInGithub }).textContent).toBe(zh.signInGithub)
    cleanup()
    render(<AccountMenu {...menuProps({ wide: false, account: { mode: 'github', principal: null } })} />)
    expect(screen.getByRole('button', { name: zh.signInGithub }).textContent).toBe('')
  })

  it('reports a failed GitHub sign-in from the signed-out menu', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)
    render(<AccountMenu {...menuProps({ account: { mode: 'github', principal: null } })} />)
    fireEvent.click(screen.getByRole('button', { name: zh.signInGithub }))
    expect((await screen.findByRole('alert')).textContent).toBe(zh.signInError)
  })

  it('opens the signed-in menu and reports a failed sign-out', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)
    render(<AccountMenu {...menuProps({
      account: { mode: 'github', principal: { id: 'u', name: 'Ada Lovelace', image: 'http://avatar.test/a.png' } },
    })} />)
    fireEvent.click(screen.getByRole('button', { name: zh.menuLabel }))
    expect(screen.getByRole('menu')).toBeDefined()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: zh.menuLabel }))
    fireEvent.click(screen.getByText(zh.signOut))
    expect((await screen.findByRole('alert')).textContent).toBe(zh.signOutError)
  })

  it('falls back to initials when the principal has no avatar', () => {
    render(<AccountMenu {...menuProps({
      wide: false,
      account: { mode: 'github', principal: { id: 'u', name: 'Ada' } },
    })} />)
    expect(screen.getByRole('button', { name: zh.menuLabel }).textContent).toBe('A')
  })
})

describe('initials', () => {
  it('uses one or two letters from the display name', () => {
    expect(initials('')).toBe('?')
    expect(initials('   ')).toBe('?')
    expect(initials('Ada')).toBe('A')
    expect(initials('Ada Lovelace')).toBe('AL')
  })
})

describe('github-auth', () => {
  it('assigns the OAuth URL from a successful social sign-in', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { origin: 'http://dsh.test', assign, reload: vi.fn() })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://github.com/login' }),
    }))
    await signInWithGithub('http://dsh.test/')
    expect(assign).toHaveBeenCalledWith('https://github.com/login')
  })

  it('does not navigate when the handler omits a URL', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { origin: 'http://dsh.test', assign, reload: vi.fn() })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }))
    await signInWithGithub('/')
    expect(assign).not.toHaveBeenCalled()
  })

  it('rejects a failed social sign-in', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    await expect(signInWithGithub('/')).rejects.toThrow('401')
  })

  it('reloads after a successful sign-out', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { origin: 'http://dsh.test', assign: vi.fn(), reload })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    await signOutAccount()
    expect(reload).toHaveBeenCalled()
  })

  it('rejects a failed sign-out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(signOutAccount()).rejects.toThrow('500')
  })
})

describe('GithubMark', () => {
  it('renders an svg at the requested size', () => {
    const { container } = render(<GithubMark size={24} className="mark" />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('24')
    expect(svg?.getAttribute('class')).toBe('mark')
  })
})
