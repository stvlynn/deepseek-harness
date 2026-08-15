# identity/ — shared identity

English | [中文](README.zh.md)

Identity values shared across product domains.

| Package | Role | ctx key |
|---|---|---|
| [`anonymous-user-id/`](anonymous-user-id/README.md) | Persists one anonymous Harness-home correlation id for telemetry, feedback, and DeepSeek requests | — |
| [`account/`](account/README.md) | Account capability seam: GitHub-authenticated browser operators and conversation-log ownership | `account` |
| [`account-better-auth/`](account-better-auth/README.md) | GitHub OAuth provider (better-auth + node:sqlite) for `ctx.account` | `account` |
