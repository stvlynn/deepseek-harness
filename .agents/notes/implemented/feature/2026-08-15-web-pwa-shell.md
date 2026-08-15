# Agent Note: Web PWA shell (service worker, PNG icons, offline fallback)

Status: implemented

English | [中文](2026-08-15-web-pwa-shell.zh.md)

## Problem

The Web install manifest named the product and requested fullscreen chrome, but supporting browsers still treat a complete PWA as requiring PNG icons, a service worker, and a defined offline document. Shipping a worker without those semantics would imply conversation-offline behavior the Host RPC transport does not provide. [The install-manifest note](2026-08-06-web-install-manifest.md) therefore left the worker unspecified until this contract existed.

## Decision

The production Vite build emits `/sw.js` from `apps/web/pwa-shell-plugin.ts` after the dist directory is written. The plugin resolves `outDir` against the Vite root and skips emit when that directory is absent. The worker:

- precaches the shell only: `index.html`, hashed JS/CSS, `favicon.svg`, PNG icons, `manifest.webmanifest`, and `offline.html`;
- does not intercept `/api` (including `/api/auth`), so RPC and OAuth stay network-only;
- answers other same-origin fetches from the precache when present, otherwise from the network, without writing extra entries — client-plugin module URLs are therefore not an offline product;
- uses `offline.html` as the document-navigation fallback when the network fails;
- calls `skipWaiting` on install, `clients.claim` on activate, and deletes caches whose names do not match this build's content hash.

`apps/web/index.html` registers `/sw.js`. The manifest adds 192×192 and 512×512 PNG icons under `/icons/` beside the existing SVG favicon. `dsh-host-frontend-static` serves `.png` as `image/png` and `.webmanifest` as `application/manifest+json`. Offline copy states that conversations are not available without the Host.

This note specifies the worker, precache, invalidation, and upgrade contract. Install identity (`id`, `start_url`, `scope`, `display`, names) remains owned by [the install-manifest note](2026-08-06-web-install-manifest.md).

## Verification

The built-Web test pins the manifest object (including PNG icon entries), the production `index.html` service-worker registration, the emitted `/sw.js` precache of `offline.html` and the PNG icons, the `/api` network-only branch, and the absence of `cache.put` for runtime responses. `dsh-host-frontend-static` pins `.png` and `.webmanifest` media types.

## Alternatives considered

**vite-plugin-pwa / Workbox generateSW.** Rejected: the shell is not a standalone Vite app (`window.__DSH_BOOT__` is injected by the Host). Default Workbox navigateFallback and runtime caching would pull `/api` or client-plugin module URLs into an offline cache this product does not define.

**Cache conversations or plugin modules for offline use.** Rejected: session transport is Host RPC; an offline transcript would be a second, stale store.

**Keep SVG-only icons.** Rejected for Chromium installability, which requires 192 and 512 PNG. The SVG favicon remains the scalable `any` entry.

**Claim the app is fully offline-capable in the manifest.** Rejected: `offline.html` is a defined shell fallback, not conversation replay.

## Consequences

- Installing the Web build gets PNG icons, a worker, and a network-failure document without promising offline conversations.
- A new production build hashes a new cache name, claims clients, and drops the previous shell cache.
- This note partially supersedes only the "no service worker" alternative in [the install-manifest note](2026-08-06-web-install-manifest.md); it does not reverse that note's install-metadata decision.
