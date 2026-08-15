# @deepseek-ai/dsh-account-better-auth

[English](README.md) | 中文

[`dsh-account`](../account/README.md) 的 GitHub OAuth 提供方。它从插件配置解析出一份显式 spec，然后要么保持 `'off'` 模式（回环、无 GitHub 密钥），要么在 `node:sqlite` 上构造 better-auth 实例，把 `/api/auth` 挂到 `ctx.webServer`，并在同一数据库中存储对话所有权。

## 配置

| 字段 | 职责 |
|---|---|
| `githubClientId` | GitHub OAuth App 的 client id。为空（且没有 `GITHUB_CLIENT_ID` 环境变量）时选择 `'off'` 模式。 |
| `githubClientSecretRef` | 客户端密钥的凭据引用（默认 `GITHUB_CLIENT_SECRET`）。 |
| `secretRef` | better-auth cookie 签名密钥的凭据引用（默认 `BETTER_AUTH_SECRET`）。 |
| `baseURL` | GitHub 重定向到的公开 origin。服务器绑定 `0.0.0.0` 时必填。 |
| `databasePath` | SQLite 文件；默认为 `$DSH_HOME/account/better-auth.sqlite`。 |

GitHub 模式下，任一密钥无法解析都会让插件加载失败。全接口绑定在缺少 GitHub 配置或缺少 `baseURL` 时同样会加载失败。GitHub OAuth App 的回调 URL 为 `{baseURL}/api/auth/callback/github`。

## 模型体验

无，因为该提供方只认证浏览器操作者，绝不会进入模型请求、提示词或工具 schema。

#### KV 缓存效果

无；操作者身份不是模型可见上下文。

## 已知限制与延后工作

- **GitHub 是唯一的身份提供方** — 其他 OAuth 厂商需要作为新的配置字段加入 `socialProviders`。
- **局域网 OAuth 需要公开的 `baseURL`** — 除非该 origin 已登记为回调地址，否则 GitHub 不能重定向到任意 RFC1918 地址。
