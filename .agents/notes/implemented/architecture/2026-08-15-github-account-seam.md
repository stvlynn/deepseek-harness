# Agent Note: GitHub account seam for multi-user Web

Status: implemented

English | [中文](2026-08-15-github-account-seam.zh.md)

## Problem

The Web GUI on a non-loopback bind (`--host 0.0.0.0`) previously treated every trusted-host caller as the same operator: conversation lists were shared, privileged configuration RPCs were loopback-only, and there was no GitHub identity to map onto RPC authority. Local-only operator accounts would not satisfy a multi-user LAN or published-origin deployment. ACP, SDK, and stdio clients already authenticate by process ownership and must not start sending HTTP cookies.

## Decision

`ctx.account` is the account capability seam (`@deepseek-ai/dsh-account`). The shipped provider (`@deepseek-ai/dsh-account-better-auth`) authenticates browser operators with GitHub OAuth via better-auth over `node:sqlite`, mounts HTTP at `/api/auth` (a longer prefix than `/api`, so the OAuth callback GET never hits the JSON POST / `sec-fetch-site: cross-site` fence), and stores conversation-log ownership in the same database.

Mode `off` is loopback without GitHub secrets: no ownership enforcement, no `/api/auth` route. Mode `github` reads the session cookie into a request-scoped principal (`runWithPrincipal`). A signed-out GitHub caller sees only unowned conversations; a signed-in caller sees only their own. `allowClaim` is true only on `session.create`. Non-loopback callers without a principal receive **401** except `host.describe`, which the sign-in UI reads while signed out. Privileged RPCs pass when the caller is loopback **or** presents a signed-in GitHub principal on a trusted host.

`dsh web --host 0.0.0.0` is a valid CLI bind. The account provider fails the load without GitHub OAuth config and without `baseURL`. ACP, SDK, and stdio transports stay process-owned.

The Web account UI (`@deepseek-ai/dsh-client-ui-account`) is a feature plugin on existing slots and primitives (`Button`, `Menu`, `OnboardingSurface`, `--dsw-alias-*` tokens). The sign-in overlay shows only for a non-loopback GitHub Host while signed out. The sidebar menu offers GitHub sign-in whenever mode is `github`.

## Verification

Package tests pin mode `off`/`github` load, insert-only ownership, `mayAccessConversation`, `host.describe.account`, list filtering, `session.create` claim, non-loopback 401 except `host.describe`, privileged RPCs with a GitHub principal, and the overlay/menu against slot primitives. The built-bin e2e pins `--host 0.0.0.0` failing without GitHub OAuth.

**Named coverage gap:** no keyless web snapshot of the sign-in overlay. The overlay paints only for a non-loopback GitHub Host while signed out; loopback snapshot e2e cannot show it without GitHub secrets or a test patch that injects `MemoryAccount` in `github` mode with a null principal. ACP, SDK, and stdio stay process-owned and are unchanged.

## Alternatives considered

**Local operator accounts (username/password in `$DSH_HOME`).** Rejected: they do not identify a GitHub user across machines, and they would invent a second identity store beside OAuth.

**Bearer tokens instead of cookies.** Rejected for this change: the browser already sends same-origin cookies on `/api` and `/api/auth`; a second token minting/storage/rotation surface is not required to bind GitHub to RPC authority.

**Mount OAuth under `/api`.** Rejected: GitHub's callback is a cross-site GET that the `/api` JSON and Fetch-Metadata fence would refuse.

**Rewrite `packages/client` to FSD or the Host to DDD.** Rejected: this is incremental 1A work; the account UI reuses the existing slot, locale, and primitive plugins.

**Tailwind, Radix, or shadcn for the account chrome.** Rejected: [web styling](../../../docs/web-styling.md) forbids a second component library.

## Consequences

- A non-loopback Web deployment is multi-user: conversation lists and create/bind follow the GitHub principal.
- Loopback `dsh web` still starts without GitHub secrets (mode `off`).
- Historical unowned conversations remain visible only while signed out; signing in does not inherit them.
- `host.describe.account` is the client-visible snapshot; the UI copies `/api/auth` as a protocol constant so the browser bundle never imports the Host service module.
- The browser-trust fence stays a confused-deputy defense; this seam is the operator authentication that note deferred. See [the api browser-trust boundary](2026-07-28-api-browser-trust-boundary.md).
