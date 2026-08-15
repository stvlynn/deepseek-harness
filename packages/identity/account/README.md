# @deepseek-ai/dsh-account

English | [中文](README.zh.md)

Account capability seam (`ctx.account`): authenticated browser operators, conversation-log ownership, and the `/api/auth` HTTP prefix. This service is the operator connecting to the Web GUI. It is not the anonymous telemetry id (`dsh-anonymous-user-id`), not LLM provider secrets (`dsh-credentials`), and not a conversation-log session (`dsh-session`).

Providers implement GitHub OAuth (shipped: [`dsh-account-better-auth`](../account-better-auth/README.md)) or an in-memory test double (`MemoryAccount`). Consumers are the `/api` connection fence, the API gateway's conversation list/create path, and the Web account UI.

## Service API

`ctx.account.mode` is `'github'` or `'off'`. `snapshot()` is the `host.describe` payload. `currentPrincipal()` reads the request-scoped principal installed by `runWithPrincipal`. `readPrincipalFromRequest` resolves the auth cookie. `handleAuthHttp` owns `/api/auth`. `recordConversationOwner` binds a conversation-log id to an account (insert-only; a different owner is refused). `mayAccessConversation(id, allowClaim)` is the visibility rule: mode `'off'` allows every id; signed-out callers see only unowned ids; signed-in callers see their own, and may claim an unowned id only when `allowClaim` is true (conversation create).

## Composition

The Web bundle mounts the better-auth provider. Loopback `dsh web` starts with mode `'off'` when GitHub OAuth config is absent. An all-interfaces bind requires GitHub mode and fails at load without it.

## Model Experience

None, as the account seam authenticates the browser operator and never enters a model request, prompt, or tool schema.

#### KV Cache effect

None; operator identity is not model-visible context.

## Known Limitations and Deferred Work

- **ACP, SDK, and stdio clients are unchanged** — those transports still authenticate by process ownership; they do not send the Web auth cookie.
- **Email/password sign-in is absent** — GitHub OAuth is the only shipped method.
- **Unowned historical conversations stay loopback-only** — a signed-in GitHub user does not inherit conversations created while signed out.
