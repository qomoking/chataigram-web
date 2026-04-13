/**
 * CDN 地域路由工具（从 frontend/src/utils/cdn.js 迁来）。
 *
 * 思路：
 *   - 后端 /api/cdn-config 返回当前用户所属区域 + 最优 CDN host
 *   - 结果缓存到 sessionStorage，TTL 30min
 *   - `rewriteCdnUrl` 把已知 CDN host 换成当前区域最优
 *   - 图片加载失败 → `getFallbackUrl` 切到备用 host
 */

const STORAGE_KEY = 'cdn_config'
const CACHE_TTL = 30 * 60 * 1000 // 30 min

const KNOWN_CDN_HOSTS = [
  'https://static.wdabuliu.com',
  'https://cdn.aiwaves.tech',
  'https://cloudflare-cdn.wdabuliu.com',
] as const

export type CdnConfig = {
  region: string
  cdn_host: string
  fallback_host: string
  _ts: number
}

let _configPromise: Promise<CdnConfig> | null = null

export function getCdnConfig(): Promise<CdnConfig> {
  if (_configPromise) return _configPromise

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const cached = JSON.parse(raw) as CdnConfig
      if (cached._ts && Date.now() - cached._ts < CACHE_TTL) {
        _configPromise = Promise.resolve(cached)
        return _configPromise
      }
    }
  } catch {
    /* ignore */
  }

  _configPromise = fetchConfig()
  return _configPromise
}

async function fetchConfig(): Promise<CdnConfig> {
  try {
    const res = await fetch('/api/cdn-config')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as Partial<CdnConfig>
    const config: CdnConfig = {
      region: data.region ?? 'default',
      cdn_host: data.cdn_host ?? KNOWN_CDN_HOSTS[1],
      fallback_host: data.fallback_host ?? KNOWN_CDN_HOSTS[1],
      _ts: Date.now(),
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
      /* quota / disabled */
    }
    return config
  } catch {
    // 后端没实现时的默认
    return {
      region: 'default',
      cdn_host: KNOWN_CDN_HOSTS[1],
      fallback_host: KNOWN_CDN_HOSTS[0],
      _ts: Date.now(),
    }
  }
}

export async function rewriteCdnUrl(url: string | null | undefined): Promise<string | null> {
  if (!url || !url.startsWith('http')) return url ?? null
  const config = await getCdnConfig()
  return replaceHost(url, config.cdn_host)
}

/** 同步版 —— 用缓存中的配置，缓存没命中则原样返回。 */
export function rewriteCdnUrlSync(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('http')) return url ?? null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return url
    const config = JSON.parse(raw) as CdnConfig
    return replaceHost(url, config.cdn_host)
  } catch {
    return url
  }
}

/** 图片加载失败时的 fallback URL；已经在 fallback 返回 null 避免死循环。 */
export function getFallbackUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('http')) return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const config = JSON.parse(raw) as CdnConfig
    if (url.startsWith(config.fallback_host)) return null
    return replaceHost(url, config.fallback_host)
  } catch {
    return null
  }
}

function replaceHost(url: string, targetHost: string): string {
  for (const host of KNOWN_CDN_HOSTS) {
    if (url.startsWith(host)) {
      return targetHost + url.slice(host.length)
    }
  }
  return url
}

export function prefetchCdnConfig(): void {
  void getCdnConfig()
}
