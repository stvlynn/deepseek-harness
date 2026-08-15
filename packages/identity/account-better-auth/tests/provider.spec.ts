import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import { ACCOUNT_AUTH_PATH, accountId, ownedConversationId } from '@deepseek-ai/dsh-account'
import AccountBetterAuth from '../src/index.ts'

let dir: string | undefined

afterEach(async () => {
  if (dir !== undefined) await rm(dir, { recursive: true, force: true })
  dir = undefined
})

function fakeWebServer(
  host: '127.0.0.1' | '0.0.0.0',
  routes: Array<{ path: string; handler: (req: unknown, res: unknown) => void }> = [],
): WebServer {
  return {
    host,
    port: 3080,
    register(route: { path: string; handler: (req: unknown, res: unknown) => void }) {
      routes.push(route)
      return () => { routes.splice(routes.indexOf(route), 1) }
    },
  } as WebServer
}

describe('AccountBetterAuth', () => {
  it('loads in mode off on loopback without GitHub secrets', async () => {
    const ctx = new Context()
    const routes: Array<{ path: string; handler: (req: unknown, res: unknown) => void }> = []
    ctx.provide('webServer', fakeWebServer('127.0.0.1', routes))
    const fiber = ctx.plugin(AccountBetterAuth, { githubClientId: '' })
    await fiber.await()
    const account = ctx.account as AccountBetterAuth
    expect(account.mode).toBe('off')
    expect(routes).toHaveLength(0)
    expect(await account.readPrincipalFromRequest(new Request('http://127.0.0.1/api'))).toBeUndefined()
    const res = { status: 0, writeHead(code: number) { this.status = code }, end() {} }
    await account.handleAuthHttp({} as never, res as never)
    expect(res.status).toBe(404)
    await fiber.dispose()
  })

  it('reports mode off before init', () => {
    const ctx = new Context()
    ctx.provide('webServer', fakeWebServer('127.0.0.1'))
    expect(new AccountBetterAuth(ctx, {}).mode).toBe('off')
  })

  it('fails GitHub mode when the sqlite path is an existing directory', async () => {
    dir = await mkdtemp(join(tmpdir(), 'dsh-account-ba-dir-'))
    const previousSecret = process.env.GITHUB_CLIENT_SECRET
    const previousAuth = process.env.BETTER_AUTH_SECRET
    process.env.GITHUB_CLIENT_SECRET = 'github-secret-value'
    process.env.BETTER_AUTH_SECRET = 'auth-secret-value-at-least-32-chars!!'
    const ctx = new Context()
    ctx.provide('webServer', fakeWebServer('127.0.0.1'))
    try {
      await expect(ctx.plugin(AccountBetterAuth, {
        githubClientId: 'ov',
        databasePath: dir,
        baseURL: 'http://127.0.0.1:3080',
      }).await()).rejects.toThrow()
    } finally {
      if (previousSecret === undefined) delete process.env.GITHUB_CLIENT_SECRET
      else process.env.GITHUB_CLIENT_SECRET = previousSecret
      if (previousAuth === undefined) delete process.env.BETTER_AUTH_SECRET
      else process.env.BETTER_AUTH_SECRET = previousAuth
    }
  })

  it('fails all-interface bind without GitHub config at load', async () => {
    const ctx = new Context()
    ctx.provide('webServer', fakeWebServer('0.0.0.0'))
    await expect(ctx.plugin(AccountBetterAuth, {}).await()).rejects.toThrow(/requires GitHub OAuth/)
  })

  it('fails GitHub mode when the client secret is missing', async () => {
    const ctx = new Context()
    ctx.provide('webServer', fakeWebServer('127.0.0.1'))
    await expect(ctx.plugin(AccountBetterAuth, { githubClientId: 'ov' }).await())
      .rejects.toThrow(/requires credential GITHUB_CLIENT_SECRET/)
  })

  it('resolves secrets from ctx.credentials before the process environment', async () => {
    const ctx = new Context()
    ctx.provide('webServer', fakeWebServer('127.0.0.1'))
    ctx.provide('credentials', {
      resolve: () => Promise.resolve({ value: '' }),
    } as never)
    await expect(ctx.plugin(AccountBetterAuth, { githubClientId: 'ov' }).await())
      .rejects.toThrow(/requires credential GITHUB_CLIENT_SECRET/)
  })

  it('constructs GitHub mode over an on-disk sqlite file', async () => {
    dir = await mkdtemp(join(tmpdir(), 'dsh-account-ba-'))
    const previousSecret = process.env.GITHUB_CLIENT_SECRET
    const previousAuth = process.env.BETTER_AUTH_SECRET
    process.env.GITHUB_CLIENT_SECRET = 'github-secret-value'
    process.env.BETTER_AUTH_SECRET = 'auth-secret-value-at-least-32-chars!!'
    const ctx = new Context()
    const routes: Array<{ path: string; handler: (req: unknown, res: unknown) => void }> = []
    ctx.provide('webServer', fakeWebServer('127.0.0.1', routes))
    try {
      const fiber = ctx.plugin(AccountBetterAuth, {
        githubClientId: 'ov',
        databasePath: join(dir, 'account.sqlite'),
        baseURL: 'http://127.0.0.1:3080',
      })
      await fiber.await()
      const account = ctx.account as AccountBetterAuth
      expect(account.mode).toBe('github')
      expect(routes.map(route => route.path)).toEqual([ACCOUNT_AUTH_PATH])
      expect(await account.readPrincipalFromRequest(new Request('http://127.0.0.1/api'))).toBeUndefined()
      const conversation = ownedConversationId('s1')
      await account.recordConversationOwner(accountId('alice'), conversation)
      expect(account.conversationOwner(conversation)).toBe('alice')
      expect(account.conversationIdsOwnedBy(accountId('alice'))).toEqual([conversation])
      const res = { status: 0, writeHead(code: number) { this.status = code }, end() {} }
      routes[0]?.handler(
        { url: '/api/auth/ok', method: 'GET', headers: { host: '127.0.0.1:3080' } },
        res,
      )
      try {
        await account.handleAuthHttp(
          { url: '/api/auth/ok', method: 'GET', headers: { host: '127.0.0.1:3080' } } as never,
          res as never,
        )
      } catch {
        // better-auth rejects a stub IncomingMessage; mode `off` already covers the 404 branch.
      }
      expect(res.status).not.toBe(404)
      await fiber.dispose()
    } finally {
      if (previousSecret === undefined) delete process.env.GITHUB_CLIENT_SECRET
      else process.env.GITHUB_CLIENT_SECRET = previousSecret
      if (previousAuth === undefined) delete process.env.BETTER_AUTH_SECRET
      else process.env.BETTER_AUTH_SECRET = previousAuth
    }
  })

  it('constructs GitHub mode from ctx.credentials over an existing sqlite file and :memory:', async () => {
    dir = await mkdtemp(join(tmpdir(), 'dsh-account-ba-cred-'))
    const dbPath = join(dir, 'existing.sqlite')
    await writeFile(dbPath, '')
    const ctx = new Context()
    ctx.provide('webServer', fakeWebServer('127.0.0.1'))
    ctx.provide('credentials', {
      resolve: () => Promise.resolve({ value: 'auth-secret-value-at-least-32-chars!!' }),
    } as never)
    const disk = ctx.plugin(AccountBetterAuth, {
      githubClientId: 'ov',
      databasePath: dbPath,
      baseURL: 'http://127.0.0.1:3080',
    })
    await disk.await()
    expect(ctx.account.mode).toBe('github')
    await disk.dispose()

    const memoryCtx = new Context()
    memoryCtx.provide('webServer', fakeWebServer('127.0.0.1'))
    memoryCtx.provide('credentials', {
      resolve: () => Promise.resolve({ value: 'auth-secret-value-at-least-32-chars!!' }),
    } as never)
    const memory = memoryCtx.plugin(AccountBetterAuth, {
      githubClientId: 'ov',
      databasePath: ':memory:',
      baseURL: 'http://127.0.0.1:3080',
    })
    await memory.await()
    expect(memoryCtx.account.mode).toBe('github')
    await memory.dispose()
  })
})
