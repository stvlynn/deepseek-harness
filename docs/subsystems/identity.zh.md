# 账号

[English](identity.md) | 中文

[dsh-account](../../packages/identity/account) 的账号缝认证浏览器操作者，并把对话日志 id 绑定到这些主体。它不是匿名遥测 id（[dsh-anonymous-user-id](../../packages/identity/anonymous-user-id)），不是 LLM 提供方密钥（[dsh-credentials](../../packages/credentials/credentials)），也不是对话日志会话（[dsh-session](../../packages/core/session)）。交付的提供方是 [dsh-account-better-auth](../../packages/identity/account-better-auth)（better-auth 在 `node:sqlite` 上的 GitHub OAuth）。决策记录：[GitHub 账号缝 Agent Note](../../.agents/notes/implemented/architecture/2026-08-15-github-account-seam.md)。

源码：[`packages/identity/account/src/types.ts`](../../packages/identity/account/src/types.ts)、[`packages/identity/account/src/index.ts`](../../packages/identity/account/src/index.ts)

## 标识

账号 id 是持久的 better-auth 用户 id。记录在账号上的对话日志 id 与会话平面使用的字符串相同。

```ts type-equiv
/** Nominal id of one authenticated Harness account (better-auth user id). */
type AccountId = Branded<'AccountId'>
```

```ts type-equiv
/** Conversation-log id recorded against an account; the same string the session plane uses. */
type OwnedConversationId = Branded<'OwnedConversationId'>
```

## 模式与快照

`'off'` 模式用于没有 GitHub 密钥的回环，不强制所有权。`'github'` 模式把会话 cookie 读入请求作用域主体。`host.describe.account` 回显该快照。

```ts type-equiv
/** How the account provider authenticates operators. */
type AccountMode = 'off' | 'github'
```

```ts type-equiv
/** Signed-in operator facts safe to echo to the Web client. */
interface Principal {
  /** Durable account id. */
  id: AccountId
  /** Display name from the identity provider. */
  name: string
  /** Optional avatar URL from the identity provider. */
  image?: string
}
```

```ts type-equiv
/** Snapshot published on `host.describe` and read by the account UI. */
interface AccountSnapshot {
  /** Active authentication mode. */
  mode: AccountMode
  /** Current request's signed-in principal, or `null` while signed out. */
  principal: Principal | null
}
```

## 可见性

`mayAccessConversation(id, allowClaim)` 是可见性规则：`'off'` 模式允许所有 id；未登录调用方只能看到无主 id；已登录调用方只能看到自己的，且仅在 `allowClaim` 为 true（`session.create`）时才能认领无主 id。HTTP 认证挂在 WebServer 的 `/api/auth` 上，该前缀比 `/api` 更长，因此 OAuth 回调 GET 不会撞上 JSON POST 栅栏（[HTTP 服务器](web-server.md)）。

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — this section is byte-identical in both language sides of the page. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxaccount--accountservice-abstract-seam"></a>

### `ctx.account` — `AccountService` (abstract seam)

Abstract account service. Providers implement HTTP auth, cookie principals, and conversation ownership. `currentPrincipal` reads the request-scoped AsyncLocalStorage slot that runWithPrincipal installs; it is empty outside that scope.

```ts cordis-catalog
/**
 * Snapshot for `host.describe` and the account UI. `principal` is the
 * current request-scoped value, or `null` when signed out / mode `off`.
 * @returns the public account snapshot.
 */
snapshot(): AccountSnapshot

/**
 * Principal installed by {@link runWithPrincipal} for this async context.
 * @returns the principal, or `undefined` outside a request scope or when signed out.
 */
currentPrincipal(): Principal | undefined

/**
 * Run `fn` with `principal` as {@link currentPrincipal} for the async
 * continuation. Nested calls replace the slot for their duration.
 * @param principal - signed-in operator, or `undefined` when signed out.
 * @param fn - work that may read {@link currentPrincipal}.
 * @returns `fn`'s return value.
 */
runWithPrincipal<T>(principal: Principal | undefined, fn: () => T): T

/**
 * Resolve a signed-in principal from one Fetch request's cookies.
 * @param request - same-origin `/api` request that may carry the auth cookie.
 * @returns the principal, or `undefined` when signed out or mode is `off`.
 */
abstract readPrincipalFromRequest(request: Request): Promise<Principal | undefined>

/**
 * Handle one node:http request under {@link ACCOUNT_AUTH_PATH}.
 * @param req - incoming HTTP request.
 * @param res - HTTP response the provider owns to completion.
 * @returns after the response is written.
 */
abstract handleAuthHttp(req: IncomingMessage, res: ServerResponse): Promise<void>

/**
 * Durably bind a conversation-log id to `accountId`. A matching existing
 * row is a no-op. A row owned by a different account is refused.
 * @param owner - the account that may see this conversation.
 * @param conversationId - conversation-log id to bind.
 * @returns after the ownership row commits.
 */
abstract recordConversationOwner(owner: AccountId, conversationId: OwnedConversationId): Promise<void>

/**
 * Owner of one conversation-log id.
 * @param conversationId - conversation-log id to look up.
 * @returns the owning account, or `undefined` when unowned.
 */
abstract conversationOwner(conversationId: OwnedConversationId): AccountId | undefined

/**
 * Conversation-log ids bound to one account.
 * @param owner - the account whose conversations to list.
 * @returns the bound ids in insertion order.
 */
abstract conversationIdsOwnedBy(owner: AccountId): readonly OwnedConversationId[]

/**
 * Whether `principal` may use `conversationId`. Unowned conversations are
 * visible only while signed out. Signed-in operators see only their own.
 * Mode `off` allows every id.
 * @param conversationId - conversation-log id under consideration.
 * @param allowClaim - when true, a signed-in operator may bind an unowned id.
 * @returns whether the current principal may proceed.
 */
mayAccessConversation(conversationId: OwnedConversationId, allowClaim: boolean): boolean
```

Source: [`packages/identity/account/src/index.ts:63`](../../packages/identity/account/src/index.ts)

<a id="account-events"></a>

### `account/*` events

<a id="accountconversation-owned--emit"></a>

#### `account/conversation-owned` — emit

A conversation-log id was durably bound to an account. Emitted only after the ownership row commits. Listener failures are contained except `INVARIANT`-coded failures, which rethrow after every listener ran.

```ts cordis-catalog
/**
 * A conversation-log id was durably bound to an account. Emitted only after
 * the ownership row commits. Listener failures are contained except
 * `INVARIANT`-coded failures, which rethrow after every listener ran.
 * @param accountId - the owning account.
 * @param conversationId - the bound conversation-log id.
 * @mode emit
 */
'account/conversation-owned'(accountId: AccountId, conversationId: OwnedConversationId): void
```

Source: [`packages/identity/account/src/types.ts:50`](../../packages/identity/account/src/types.ts)
<!-- END GENERATED cordis-surface -->
