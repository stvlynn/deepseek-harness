# @deepseek-ai/dsh-client-ui-account

[English](README.md) | 中文

Web GUI 的 GitHub 账号界面：在 GitHub 模式下，未登录的非回环 Host 会在 `shell.overlay` 显示登录接管层，并在 `sidebar.footer.action` 提供账号菜单。插件通过 connection 按 generation 生效的快照读取 `host.describe.account`。登录与退出向 Host better-auth 前缀 `/api/auth` 发送 POST；不把 better-auth 客户端打进 bundle。控件使用共享原语（`Button`、`Menu`、`OnboardingSurface`）和 `--dsw-alias-*` token。

回环上不显示接管层：本地 `dsh web` 操作者可以继续使用无主对话，无需 GitHub 账号。侧栏菜单仍提供登录，以便开发者认领新对话。

## 模型体验

无，因为本包只认证浏览器操作者，不注册任何面向模型的内容。

#### KV 缓存效果

无；本包既不组装也不发送提供方请求。

## 已知限制与延后工作

- **OAuth 返回会刷新页面** — Host 主体是请求作用域的，因此退出后客户端会刷新，登录后跟随 GitHub 重定向，而不是补丁式更新实时 RPC 状态。
- **无主的历史对话仍仅限回环** — 登录不会继承未登录时创建的对话。
