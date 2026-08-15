# @deepseek-ai/dsh-account-better-auth

English | [中文](README.zh.md)

GitHub OAuth provider for [`dsh-account`](../account/README.md). It resolves an explicit spec from plugin config, then either stays in mode `off` (loopback, no GitHub secrets) or constructs a better-auth instance over `node:sqlite`, mounts `/api/auth` on `ctx.webServer`, and stores conversation ownership in the same database.

## Configuration

| Field | Role |
|---|---|
| `githubClientId` | GitHub OAuth App client id. Empty (and no `GITHUB_CLIENT_ID` env) selects mode `off`. |
| `githubClientSecretRef` | Credential reference for the client secret (default `GITHUB_CLIENT_SECRET`). |
| `secretRef` | Credential reference for the better-auth cookie-signing secret (default `BETTER_AUTH_SECRET`). |
| `baseURL` | Public origin GitHub redirects to. Required when the server binds `0.0.0.0`. |
| `databasePath` | SQLite file; defaults to `$DSH_HOME/account/better-auth.sqlite`. |

GitHub mode fails the plugin load when either secret is unresolved. An all-interfaces bind without GitHub config or without `baseURL` also fails the load. The GitHub OAuth App callback URL is `{baseURL}/api/auth/callback/github`.

## Model Experience

None, as the provider authenticates the browser operator and never enters a model request, prompt, or tool schema.

#### KV Cache effect

None; operator identity is not model-visible context.

## Known Limitations and Deferred Work

- **GitHub is the only identity provider** — additional OAuth vendors would be additive `socialProviders` entries behind new config fields.
- **LAN OAuth needs a public `baseURL`** — GitHub cannot redirect to an arbitrary RFC1918 address unless that origin is the registered callback.
