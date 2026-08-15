# Agent Note: Web 多用户 GitHub 账号缝

Status: implemented

[English](2026-08-15-github-account-seam.md) | 中文

## 问题

非回环绑定（`--host 0.0.0.0`）上的 Web GUI 此前把每个受信任 Host 调用方都当成同一操作者：对话列表共享，特权配置 RPC 仅限回环，也没有可映射到 RPC 权限的 GitHub 身份。仅限本机的操作者账号无法满足多用户局域网或公开 origin 部署。ACP、SDK 与 stdio 客户端已按进程所有权认证，不得开始发送 HTTP cookie。

## 决策

`ctx.account` 是账号能力缝（`@deepseek-ai/dsh-account`）。交付的提供方（`@deepseek-ai/dsh-account-better-auth`）用 better-auth 在 `node:sqlite` 上通过 GitHub OAuth 认证浏览器操作者，把 HTTP 挂在 `/api/auth`（比 `/api` 更长的前缀，因此 OAuth 回调 GET 不会撞上 JSON POST / `sec-fetch-site: cross-site` 栅栏），并在同一数据库中存储对话日志所有权。

`'off'` 模式用于没有 GitHub 密钥的回环：不强制所有权，也没有 `/api/auth` 路由。`'github'` 模式把会话 cookie 读入请求作用域主体（`runWithPrincipal`）。未登录的 GitHub 调用方只能看到无主对话；已登录调用方只能看到自己的。`allowClaim` 仅在 `session.create` 上为 true。没有主体的非回环调用方收到 **401**，但 `host.describe` 除外，登录界面在未登录时读取它。特权 RPC 在调用方为回环 **或** 在受信任 Host 上出示已登录 GitHub 主体时通过。

`dsh web --host 0.0.0.0` 是合法的 CLI 绑定。账号提供方在缺少 GitHub OAuth 配置或缺少 `baseURL` 时加载失败。ACP、SDK 与 stdio 传输仍按进程所有权认证。

Web 账号界面（`@deepseek-ai/dsh-client-ui-account`）是使用现有插槽与原语（`Button`、`Menu`、`OnboardingSurface`、`--dsw-alias-*` token）的功能插件。登录接管层仅在未登录的非回环 GitHub Host 上显示。只要模式为 `'github'`，侧栏菜单就提供 GitHub 登录。

## 验证

包测试固定 `'off'`/`'github'` 加载、仅插入的所有权、`mayAccessConversation`、`host.describe.account`、列表过滤、`session.create` 认领、除 `host.describe` 外的非回环 401、带 GitHub 主体的特权 RPC，以及对照插槽原语的接管层/菜单。built-bin e2e 固定没有 GitHub OAuth 时 `--host 0.0.0.0` 失败。

**已命名的覆盖缺口：** 没有登录接管层的无密钥 Web snapshot。该接管层仅在未登录的非回环 GitHub Host 上绘制；回环 snapshot e2e 在没有 GitHub 密钥、或未注入 `'github'` 模式且主体为 null 的 `MemoryAccount` 测试补丁时无法显示它。ACP、SDK 与 stdio 仍按进程所有权认证，保持不变。

## 曾考虑的替代方案

**本机操作者账号（`$DSH_HOME` 中的用户名/密码）。** 否决：它们不能跨机器标识 GitHub 用户，还会在 OAuth 之外再造一套身份存储。

**用 Bearer token 代替 cookie。** 在本变更中否决：浏览器已经在 `/api` 和 `/api/auth` 上发送同源 cookie；要把 GitHub 绑定到 RPC 权限，不需要第二套令牌签发/存储/轮换面。

**把 OAuth 挂在 `/api` 下。** 否决：GitHub 的回调是跨站 GET，会被 `/api` 的 JSON 与 Fetch-Metadata 栅栏拒绝。

**把 `packages/client` 重写为 FSD，或把 Host 重写为 DDD。** 否决：这是增量 1A 工作；账号界面复用现有的插槽、locale 与原语插件。

**用 Tailwind、Radix 或 shadcn 做账号界面。** 否决：[Web 样式](../../../docs/web-styling.md)禁止第二套组件库。

## 后果

- 非回环 Web 部署是多用户的：对话列表与创建/绑定跟随 GitHub 主体。
- 回环 `dsh web` 仍可在没有 GitHub 密钥时启动（`'off'` 模式）。
- 历史上的无主对话仅在未登录时可见；登录不会继承它们。
- `host.describe.account` 是客户端可见快照；界面把 `/api/auth` 复制为协议常量，使浏览器 bundle 从不导入 Host 服务模块。
- 浏览器信任栅栏仍是混淆代理人防御；本缝是该 Note 延期的操作者认证。见[api 浏览器信任边界](2026-07-28-api-browser-trust-boundary.md)。
