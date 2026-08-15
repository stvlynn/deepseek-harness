# Agent Note: Web install manifest metadata

Status: implemented

English | [中文](2026-08-06-web-install-manifest.zh.md)

## Problem

The Web build has a document title and favicon but no manifest from which a browser can discover a stable installed identity, launch boundary, or installed presentation. Adding that metadata can also imply capabilities the app does not provide: a service worker suggests an offline contract, while a single language or palette value misrepresents a bilingual UI with resolved light and dark themes.

## Decision

The Web entry links `/manifest.webmanifest`, which Vite copies from `apps/web/public/` into the production build. The manifest names the product `DeepSeek Harness`, gives installed chrome the compact name `DSH`, and fixes `id`, `start_url`, and `scope` at `/`. It requests `display: "fullscreen"` so supporting browsers can give the installed editor-like surface the available display area while leaving ordinary tabs unchanged; browsers may apply user overrides or fall back to another display mode. Its icon entry reuses `/favicon.svg` as an SVG of size `any` and purpose `any`.

This follows code-server's fullscreen choice without copying its `window-controls-overlay` display override. DSH has no custom title bar or layout around native window controls, so such an override would supersede fullscreen without owning the required safe layout.

The manifest deliberately has no `lang`, `theme_color`, or `background_color`. The product surface is bilingual rather than owned by one manifest language, and either static color can disagree with one of the resolved app palettes. Theme metadata therefore remains outside the install manifest.

Install metadata remains this manifest. The service worker, shell precache, and offline fallback are specified by [the Web PWA shell Agent Note](2026-08-15-web-pwa-shell.md); this note does not own that contract. The shipped [`dsh-host-frontend-static`](../../../../packages/host/frontend-static/README.md) fallback recognizes `.webmanifest` as `application/manifest+json` so the same asset is valid through the shipped HTTP composition rather than only in Vite's output directory.

## Verification

The built-Web test parses the emitted manifest and pins the complete metadata object, including the human-visible name, compact name, icon, root identity, launch boundary, and display mode, while also verifying that the production `index.html` retains the link. The `dsh-host-frontend-static` real Loader composition test serves a `.webmanifest` fixture and pins its `application/manifest+json` media type.

## Alternatives considered

**Add a service worker and call the app offline-capable.** Rejected here because caching the shell without defining session transport, invalidation, failure behavior, and upgrade semantics would create a misleading partial offline contract. The later [Web PWA shell](2026-08-15-web-pwa-shell.md) note supplies those semantics for the installable shell only and does not reverse this note's install-metadata decision.

**Declare one `lang`.** Rejected because no single language describes the bilingual product surface; omission avoids claiming that one locale owns the installed experience.

**Choose one static background and theme color.** Rejected because the app resolves light and dark palettes at runtime, so either fixed value is knowingly wrong for one supported state.

**Ship raster and maskable icon variants immediately.** PNG 192 and 512 for Chromium installability are specified by [the Web PWA shell note](2026-08-15-web-pwa-shell.md). Maskable variants remain additive until a supported installation target requires a safe-zone asset the current icons cannot meet.

**Assert only root and display fields in the built artifact.** Rejected because dropping or changing the product name, compact name, or icon is also a shipped install regression. The test intentionally requires an explicit edit whenever any manifest metadata changes.

## Consequences

Supporting browsers can discover a stable root-scoped installed identity and fullscreen preference without the application promising offline behavior. Deploying this build below a path prefix requires revisiting the absolute link, identity, launch, scope, and icon URLs together. Browser-specific icon requirements may add variants later, and every intentional metadata change updates the exact built-artifact contract.
