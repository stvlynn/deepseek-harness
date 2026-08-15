/**
 * Production PWA shell: emit `/sw.js` after Vite writes dist so the worker
 * precaches hashed assets, the install manifest, icons, and `offline.html`.
 * `/api` (including `/api/auth`) and unlisted plugin-module URLs stay
 * network-only. Document navigations fall back to `offline.html`.
 */
import { createHash } from 'node:crypto'
import { readdir, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import type { Plugin } from 'vite'

const SKIP_EXT = new Set(['.map'])

/**
 * Recursively list dist files that belong in the shell precache.
 * @param dir - directory to walk.
 * @param root - dist root used to form URL paths.
 * @returns slash-prefixed URL paths, sorted.
 */
async function listPrecacheUrls(dir: string, root: string): Promise<string[]> {
  const urls: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      urls.push(...await listPrecacheUrls(full, root))
      continue
    }
    if (entry.name === 'sw.js') continue
    if (SKIP_EXT.has(extnameOf(entry.name))) continue
    const rel = relative(root, full).split(sep).join('/')
    urls.push(`/${rel}`)
  }
  return urls.sort()
}

/**
 * File extension including the leading dot, or empty when the name has none.
 * @param name - basename.
 * @returns the extension.
 */
function extnameOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot <= 0 ? '' : name.slice(dot)
}

/**
 * Service-worker source. Precache URLs and cache name are substituted at emit.
 * @param cacheName - unique cache id for this build.
 * @param precache - slash-prefixed same-origin URLs.
 * @returns the worker source.
 */
function serviceWorkerSource(cacheName: string, precache: readonly string[]): string {
  return `/* dsh PWA shell — generated; do not edit */
const CACHE = ${JSON.stringify(cacheName)};
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        const offline = await caches.match('/offline.html');
        return offline ?? Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    return cached ?? fetch(request);
  })());
});
`
}

/**
 * Vite plugin: after the production bundle is written, emit `/sw.js` with a
 * content-hashed cache name covering every copied shell asset.
 * @returns the plugin.
 */
export function pwaShell(): Plugin {
  let outDir = 'dist'
  return {
    name: 'dsh-pwa-shell',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    async closeBundle() {
      const urls = await listPrecacheUrls(outDir, outDir)
      const cacheName = `dsh-shell-${createHash('sha256').update(urls.join('\n')).digest('hex').slice(0, 12)}`
      await writeFile(join(outDir, 'sw.js'), serviceWorkerSource(cacheName, urls))
    },
  }
}
