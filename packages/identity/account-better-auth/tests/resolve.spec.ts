import { describe, expect, it } from 'vitest'
import { resolve } from '../src/resolve.ts'

const loopback = { host: '127.0.0.1' as const, port: 3080 }

describe('resolve', () => {
  it('selects off when GitHub client id is absent on loopback', () => {
    expect(resolve({}, loopback, {})).toEqual({ kind: 'off' })
    expect(resolve({ githubClientId: '  ' }, loopback, {})).toEqual({ kind: 'off' })
  })

  it('refuses all-interface bind without GitHub config', () => {
    expect(() => resolve({}, { host: '0.0.0.0', port: 3080 }, {}))
      .toThrow(/requires GitHub OAuth/)
  })

  it('refuses all-interface GitHub mode without baseURL', () => {
    expect(() => resolve({ githubClientId: 'ov' }, { host: '0.0.0.0', port: 3080 }, {}))
      .toThrow(/requires baseURL/)
  })

  it('builds a github spec with defaults', () => {
    const spec = resolve({ githubClientId: 'ov' }, loopback, {})
    expect(spec).toMatchObject({
      kind: 'github',
      githubClientId: 'ov',
      githubClientSecretRef: 'GITHUB_CLIENT_SECRET',
      secretRef: 'BETTER_AUTH_SECRET',
      baseURL: 'http://127.0.0.1:3080',
    })
    if (spec.kind === 'github') expect(spec.databasePath).toMatch(/account\/better-auth\.sqlite$/)
  })

  it('reads GITHUB_CLIENT_ID from env when config omits it', () => {
    const spec = resolve({}, loopback, { GITHUB_CLIENT_ID: 'from-env' })
    expect(spec).toMatchObject({ kind: 'github', githubClientId: 'from-env' })
  })

  it('strips a trailing slash from baseURL', () => {
    const spec = resolve({ githubClientId: 'ov', baseURL: 'https://dsh.example/' }, loopback, {})
    expect(spec).toMatchObject({ kind: 'github', baseURL: 'https://dsh.example' })
  })
})
