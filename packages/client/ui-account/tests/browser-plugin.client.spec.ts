/**
 * ui-account plugin halves: dictionary and slot registrations against the
 * real SlotRegistry (fiber teardown proves HMR safety), the inert node
 * entry, and the invariant companion's ownership reservation.
 */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { apply as applyLocale, inject as localeInject } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as applyNode } from '../src/index.ts'
import * as AccountInvariant from '../src/invariant.ts'
import { en, NS, zh } from '../src/client/locales.ts'

function overlayIds(ctx: Context): (string | undefined)[] {
  return ctx.slots.entries('shell.overlay').map(entry => entry.options.id)
}

function footerIds(ctx: Context): (string | undefined)[] {
  return ctx.slots.entries('sidebar.footer.action').map(entry => entry.options.id)
}

async function bench(): Promise<{ ctx: Context; fiber: ReturnType<Context['plugin']> }> {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'shell.overlay': { kind: 'list', scope: 'root' },
      'sidebar.footer.action': { kind: 'list', scope: 'root' },
    },
  } as never, () => null)
  ctx.provide('connection', {
    api: { settings: {} },
    isLoopback: false,
    hostDescription: { getSnapshot: () => undefined, subscribe: () => () => {} },
  } as never)
  ctx.provide('remote', { $on: () => () => {} } as never)
  ctx.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
  await ctx.plugin({ inject: localeInject, apply: applyLocale }).await()
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, fiber }
}

describe('ui-account browser half', () => {
  it('declares the services it binds', () => {
    expect(inject).toEqual(['slots', 'locale', 'connection'])
  })

  it('registers overlay and footer entries, and fiber teardown removes them', async () => {
    const { ctx, fiber } = await bench()
    expect(overlayIds(ctx)).toContain('account-sign-in')
    expect(footerIds(ctx)).toContain('account-menu')
    await fiber.dispose()
    expect(overlayIds(ctx)).not.toContain('account-sign-in')
    expect(footerIds(ctx)).not.toContain('account-menu')
  })

  it('registers both dictionaries under its own namespace and releases them with the fiber', async () => {
    const { ctx, fiber } = await bench()
    const translate = ctx.locale.bind(NS)
    expect(translate('signInGithub')).toBe(zh.signInGithub)
    ctx.locale.setLocale('en')
    expect(translate('signInGithub')).toBe(en.signInGithub)
    await fiber.dispose()
    expect(translate('signInGithub')).not.toBe(en.signInGithub)
  })

  it('keeps the English dictionary key-identical to the Chinese source of truth', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })
})

describe('ui-account node half', () => {
  it('contributes no host behavior', () => {
    expect(applyNode).not.toThrow()
  })
})

describe('ui-account invariant companion', () => {
  it('reserves package ownership under its declared companion name', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    const fiber = ctx.plugin(AccountInvariant)
    await fiber.await()
    expect(AccountInvariant.name).toBe('client-ui-account-invariant')
    expect(AccountInvariant.inject).toEqual(['invariants'])
    expect(() => { (ctx.emit as (event: string) => void)('slots/changed') }).not.toThrow()
    await fiber.dispose()
  })
})
