# Agent Note: Web PWA 外壳（service worker、PNG 图标、离线回退）

Status: implemented

[English](2026-08-15-web-pwa-shell.md) | 中文

## 问题

Web 安装 manifest 已命名产品并请求全屏界面，但支持 PWA 的浏览器仍把完整 PWA 视为需要 PNG 图标、service worker 和已定义的离线文档。在没有这些语义的情况下交付 worker，会暗示 Host RPC 传输并不提供的「对话可离线」行为。[安装 manifest Note](2026-08-06-web-install-manifest.md) 因此把 worker 留到本约定存在之后再规定。

## 决策

生产 Vite 构建在 dist 目录写入之后由 `apps/web/pwa-shell-plugin.ts` 生成 `/sw.js`。插件相对 Vite root 解析 `outDir`，目录不存在时跳过写出。该 worker：

- 只预缓存外壳：`index.html`、带哈希的 JS/CSS、`favicon.svg`、PNG 图标、`manifest.webmanifest` 和 `offline.html`；
- 不拦截 `/api`（含 `/api/auth`），因此 RPC 与 OAuth 保持仅网络；
- 对其他同源 fetch：预缓存命中则返回缓存，否则走网络，且不写入额外条目——客户端插件模块 URL 因此不是离线产品；
- 网络失败时，把 `offline.html` 作为文档导航回退；
- 在 install 时调用 `skipWaiting`，在 activate 时 `clients.claim`，并删除名称与本次构建内容哈希不符的缓存。

`apps/web/index.html` 注册 `/sw.js`。manifest 在现有 SVG favicon 之外增加 `/icons/` 下的 192×192 与 512×512 PNG 图标。`dsh-host-frontend-static` 将 `.png` 作为 `image/png`、将 `.webmanifest` 作为 `application/manifest+json` 提供。离线文案写明没有 Host 时对话不可用。

本 Note 规定 worker、预缓存、失效与升级约定。安装身份（`id`、`start_url`、`scope`、`display`、名称）仍由[安装 manifest Note](2026-08-06-web-install-manifest.md) 拥有。

## 验证

Web 构建产物测试固定完整 manifest 对象（含 PNG 图标条目）、生产 `index.html` 的 service worker 注册、生成的 `/sw.js` 对 `offline.html` 与 PNG 图标的预缓存、`/api` 仅网络分支，以及运行时响应没有 `cache.put`。`dsh-host-frontend-static` 固定 `.png` 与 `.webmanifest` 的媒体类型。

## 曾考虑的替代方案

**vite-plugin-pwa / Workbox generateSW。** 否决：外壳不是独立的 Vite 应用（`window.__DSH_BOOT__` 由 Host 注入）。Workbox 默认的 navigateFallback 与运行时缓存会把 `/api` 或客户端插件模块 URL 拉进本产品未定义的离线缓存。

**把对话或插件模块缓存为离线产品。** 否决：会话传输是 Host RPC；离线 transcript 会变成第二份过期存储。

**只保留 SVG 图标。** 因 Chromium 安装资格需要 192 与 512 PNG 而否决。SVG favicon 仍作为可缩放的 `any` 条目。

**在 manifest 中宣称应用完全可离线。** 否决：`offline.html` 是已定义的外壳回退，不是对话回放。

## 后果

- 安装 Web 构建可得到 PNG 图标、worker 和网络失败文档，而无需承诺离线对话。
- 新的生产构建会哈希新的缓存名、认领 clients，并丢弃上一份外壳缓存。
- 本 Note 仅部分取代[安装 manifest Note](2026-08-06-web-install-manifest.md) 中「不上 service worker」的替代方案；不推翻该 Note 的安装元数据决策。
