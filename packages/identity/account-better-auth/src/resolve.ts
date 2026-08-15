/**
 * Explicit request → spec step for the better-auth account provider.
 * Defaulting happens here, never inside `run` / request handling.
 * @module @deepseek-ai/dsh-account-better-auth/src/resolve
 */

import { join } from 'node:path'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'

/** Plugin config: GitHub OAuth and cookie-signing material. */
export interface Config {
  /** GitHub OAuth App client id; empty / omitted selects mode `off`. */
  githubClientId?: string
  /** Credential reference for the GitHub client secret (default `GITHUB_CLIENT_SECRET`). */
  githubClientSecretRef?: string
  /** Credential reference for the better-auth signing secret (default `BETTER_AUTH_SECRET`). */
  secretRef?: string
  /**
   * Public origin GitHub redirects to (`https://host:port`). Required when the
   * HTTP server binds all interfaces; loopback defaults to the bound socket.
   */
  baseURL?: string
  /** SQLite path; defaults to `$DSH_HOME/account/better-auth.sqlite`. */
  databasePath?: string
}

/** Loopback bind facts used to default `baseURL`. */
export interface BindFacts {
  /** `webServer.host`. */
  host: '127.0.0.1' | '0.0.0.0'
  /** `webServer.port`. */
  port: number
}

/** Resolved runtime spec: GitHub mode or local-anonymous off. */
export type Spec =
  | { kind: 'off' }
  | {
    kind: 'github'
    githubClientId: string
    githubClientSecretRef: string
    secretRef: string
    baseURL: string
    databasePath: string
  }

function nonempty(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed
}

/**
 * Resolve plugin config into a closed spec. An empty client id is mode `off`.
 * All-interface binds in GitHub mode require an explicit `baseURL`.
 * @param config - raw plugin config.
 * @param bind - listening socket facts.
 * @param env - environment consulted for `GITHUB_CLIENT_ID` when config omits it.
 * @returns the resolved spec.
 */
export function resolve(config: Config, bind: BindFacts, env: NodeJS.ProcessEnv = process.env): Spec {
  const githubClientId = nonempty(config.githubClientId) ?? nonempty(env.GITHUB_CLIENT_ID)
  if (githubClientId === undefined) {
    if (bind.host === '0.0.0.0') {
      throw new Error(
        'account: --host 0.0.0.0 requires GitHub OAuth (set githubClientId or GITHUB_CLIENT_ID)',
      )
    }
    return { kind: 'off' }
  }
  const baseURL = nonempty(config.baseURL)
  if (bind.host === '0.0.0.0' && baseURL === undefined) {
    throw new Error('account: --host 0.0.0.0 requires baseURL for GitHub OAuth callbacks')
  }
  return {
    kind: 'github',
    githubClientId,
    githubClientSecretRef: nonempty(config.githubClientSecretRef) ?? 'GITHUB_CLIENT_SECRET',
    secretRef: nonempty(config.secretRef) ?? 'BETTER_AUTH_SECRET',
    baseURL: (baseURL ?? `http://127.0.0.1:${String(bind.port)}`).replace(/\/$/, ''),
    databasePath: nonempty(config.databasePath) ?? join(resolveDshHome(), 'account', 'better-auth.sqlite'),
  }
}
