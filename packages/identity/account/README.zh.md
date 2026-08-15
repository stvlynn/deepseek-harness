# @deepseek-ai/dsh-account

[English](README.md) | 中文

账号能力缝（`ctx.account`）：已认证的浏览器操作者、对话日志所有权，以及 `/api/auth` HTTP 前缀。该服务表示连接到 Web GUI 的操作者。它不是匿名遥测 id（`dsh-anonymous-user-id`），不是 LLM 提供方密钥（`dsh-credentials`），也不是对话日志会话（`dsh-session`）。

提供方实现 GitHub OAuth（交付实现：[`dsh-account-better-auth`](../account-better-auth/README.md)）或内存测试替身（`MemoryAccount`）。消费方是 `/api` 连接栅栏、API 网关的对话列表/创建路径，以及 Web 账号界面。

## 服务 API

`ctx.account.mode` 为 `'github'` 或 `'off'`。`snapshot()` 是 `host.describe` 载荷。`currentPrincipal()` 读取由 `runWithPrincipal` 安装的请求作用域主体。`readPrincipalFromRequest` 解析认证 cookie。`handleAuthHttp` 拥有 `/api/auth`。`recordConversationOwner` 将对话日志 id 绑定到账号（仅插入；不同所有者会被拒绝）。`mayAccessConversation(id, allowClaim)` 是可见性规则：`'off'` 模式允许所有 id；未登录调用方只能看到无主 id；已登录调用方只能看到自己的，且仅在 `allowClaim` 为 true（创建对话）时才能认领无主 id。

## 组合

Web 组合包挂载 better-auth 提供方。当缺少 GitHub OAuth 配置时，回环 `dsh web` 以 `'off'` 模式启动。全接口绑定要求 GitHub 模式，缺少配置时在加载阶段失败。

## 模型体验

无，因为账号缝只认证浏览器操作者，绝不会进入模型请求、提示词或工具 schema。

#### KV 缓存效果

无；操作者身份不是模型可见上下文。

## 已知限制与延后工作

- **ACP、SDK 与 stdio 客户端保持不变** — 这些传输仍按进程所有权认证；它们不发送 Web 认证 cookie。
- **不提供邮箱/密码登录** — 交付的唯一方式是 GitHub OAuth。
- **无主的历史对话仍仅限回环** — 已登录的 GitHub 用户不会继承未登录时创建的对话。
