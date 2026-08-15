/**
 * GitHub OAuth account provider: better-auth over node:sqlite, `/api/auth` on
 * the WebServer, and a conversation-ownership table in the same database.
 * @module @deepseek-ai/dsh-account-better-auth
 */

import { mkdir, open } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, resolve as resolvePath } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import {
  ACCOUNT_AUTH_PATH,
  AccountService,
  type AccountId,
  type AccountMode,
  type OwnedConversationId,
  type Principal,
} from '@deepseek-ai/dsh-account'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { betterAuth } from 'better-auth'
import { toNodeHandler } from 'better-auth/node'
import { ConversationOwnershipStore } from './ownership.ts'
import { principalFromUser } from './principal.ts'
import { resolve, type Config, type Spec } from './resolve.ts'

export type { Config, Spec } from './resolve.ts'
export { resolve } from './resolve.ts'

/** Services required before this provider can bind `/api/auth`. */
export const inject = ['webServer']

/**
 * Exclusively create a missing database file with owner-only permissions.
 * @param path - absolute sqlite path.
 */
async function createDatabaseFile(path: string): Promise<void> {
  try {
    const handle = await open(path, 'wx', 0o600)
    await handle.close()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }
}

/**
 * Open the account SQLite file, creating a missing parent directory and an
 * owner-only file when needed.
 * @param path - configured database path (`:memory:` allowed).
 * @returns the open handle.
 */
async function openAccountDatabase(path: string): Promise<DatabaseSync> {
  if (path !== ':memory:') {
    const actual = resolvePath(path)
    await mkdir(dirname(actual), { recursive: true, mode: 0o700 })
    await createDatabaseFile(actual)
  }
  const { DatabaseSync } = await import('node:sqlite')
  return new DatabaseSync(path)
}

/**
 * Resolve one credential reference from `ctx.credentials` or the process
 * environment. Missing values fail the load.
 * @param ctx - plugin context.
 * @param ref - credential reference / env name.
 * @returns the non-empty secret.
 */
async function requireSecret(ctx: Context, ref: string): Promise<string> {
  const credentials = ctx.get('credentials')
  if (credentials !== undefined) {
    const hit = await credentials.resolve(credentialRef(ref))
    if (hit !== undefined && hit.value.length > 0) return hit.value
  }
  const fromEnv = process.env[ref]
  if (fromEnv !== undefined && fromEnv.length > 0) return fromEnv
  throw new Error(`account: GitHub mode requires credential ${ref}`)
}

type NodeAuthHandler = ReturnType<typeof toNodeHandler>
type SessionLookup = (headers: Headers) => Promise<Principal | undefined>

/**
 * Account provider. Mode `off` is a no-op principal source so loopback `dsh web`
 * starts without GitHub secrets. Mode `github` mounts better-auth at
 * {@link ACCOUNT_AUTH_PATH}.
 */
export default class AccountBetterAuth extends AccountService {
  static Config: z<Config> = z.object({
    githubClientId: z.string().default(''),
    githubClientSecretRef: z.string().default('GITHUB_CLIENT_SECRET'),
    secretRef: z.string().default('BETTER_AUTH_SECRET'),
    baseURL: z.string().default(''),
    databasePath: z.string().default(''),
  })

  static inject = inject

  private spec!: Spec
  private readSession: SessionLookup | undefined
  private nodeHandler: NodeAuthHandler | undefined
  private db: DatabaseSync | undefined
  private ownership = new ConversationOwnershipStore(undefined)
  private readonly rawConfig: Config

  /**
   * @param ctx - Host context providing `webServer` and optionally `credentials`.
   * @param config - resolved plugin config.
   */
  constructor(ctx: Context, config: Config) {
    super(ctx)
    this.rawConfig = config
  }

  /** Active authentication mode after {@link Service.init}. */
  get mode(): AccountMode {
    return this.spec?.kind ?? 'off'
  }

  /** Open SQLite, construct better-auth, and claim `/api/auth`. */
  async [Service.init](): Promise<void> {
    this.spec = resolve(this.rawConfig, {
      host: this.ctx.webServer.host,
      port: this.ctx.webServer.port,
    })
    if (this.spec.kind === 'off') return

    const githubClientSecret = await requireSecret(this.ctx, this.spec.githubClientSecretRef)
    const secret = await requireSecret(this.ctx, this.spec.secretRef)
    const db = await openAccountDatabase(this.spec.databasePath)
    this.db = db
    this.ownership = new ConversationOwnershipStore(db)
    const auth = betterAuth({
      baseURL: this.spec.baseURL,
      secret,
      database: db,
      trustedOrigins: [this.spec.baseURL],
      emailAndPassword: { enabled: false },
      socialProviders: {
        github: {
          clientId: this.spec.githubClientId,
          clientSecret: githubClientSecret,
        },
      },
    })
    this.nodeHandler = toNodeHandler(auth)
    this.readSession = async (headers) => {
      const session = await auth.api.getSession({ headers })
      const user = session?.user
      if (user === undefined) return undefined
      return principalFromUser(user)
    }
    this.ctx.effect(() => this.ctx.webServer.register({
      kind: 'prefix',
      path: ACCOUNT_AUTH_PATH,
      handler: (req, res) => { void this.handleAuthHttp(req, res) },
    }), 'account-better-auth: /api/auth')
    this.ctx.effect(() => () => { this.db?.close() }, 'account-better-auth: sqlite')
  }

  override async readPrincipalFromRequest(request: Request): Promise<Principal | undefined> {
    if (this.readSession === undefined) return undefined
    return this.readSession(request.headers)
  }

  override handleAuthHttp(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (this.nodeHandler === undefined) {
      res.writeHead(404)
      res.end()
      return Promise.resolve()
    }
    return Promise.resolve(this.nodeHandler(req, res))
  }

  override recordConversationOwner(owner: AccountId, conversationId: OwnedConversationId): Promise<void> {
    this.ownership.record(owner, conversationId)
    this.ctx.emit('account/conversation-owned', owner, conversationId)
    return Promise.resolve()
  }

  override conversationOwner(conversationId: OwnedConversationId): AccountId | undefined {
    return this.ownership.ownerOf(conversationId)
  }

  override conversationIdsOwnedBy(owner: AccountId): readonly OwnedConversationId[] {
    return this.ownership.idsOwnedBy(owner)
  }
}
