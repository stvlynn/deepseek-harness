# identity/ — 共享身份

[English](README.md) | 中文

跨产品领域共享的身份值。

| 包 | 职责 | ctx key |
|---|---|---|
| [`anonymous-user-id/`](anonymous-user-id/README.md) | 为遥测、反馈和 DeepSeek 请求持久化一个限定于 Harness home 的匿名关联 id | — |
| [`account/`](account/README.md) | 账号能力缝：经 GitHub 认证的浏览器操作者与对话日志所有权 | `account` |
| [`account-better-auth/`](account-better-auth/README.md) | `ctx.account` 的 GitHub OAuth 提供方（better-auth + node:sqlite） | `account` |
