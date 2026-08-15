# @deepseek-ai/dsh-client-ui-account

English | [中文](README.zh.md)

GitHub account surfaces for the Web GUI: a `shell.overlay` sign-in takeover for a non-loopback Host in GitHub mode while signed out, and a `sidebar.footer.action` account menu. The plugin reads `host.describe.account` through the connection's generation-scoped snapshot. Sign-in and sign-out POST to the Host better-auth prefix `/api/auth`; they do not bundle the better-auth client. Controls use shared primitives (`Button`, `Menu`, `OnboardingSurface`) and `--dsw-alias-*` tokens.

The overlay does not show on loopback: a local `dsh web` operator can keep using unowned conversations without a GitHub account. The menu still offers sign-in there so a developer can claim new conversations.

## Model Experience

None, as this package authenticates the browser operator and registers nothing model-facing.

#### KV Cache effect

None; the package never assembles or sends provider requests.

## Known Limitations and Deferred Work

- **OAuth return reloads the page** — the Host principal is request-scoped, so the client reloads after sign-out and follows GitHub's redirect after sign-in rather than patching live RPC state.
- **Historical unowned conversations stay loopback-only** — signing in does not inherit conversations created while signed out.
