/**
 * Feature flags。和原 frontend/src/utils/featureFlags.js 行为一致。
 *
 * 优先级：localStorage 覆盖 > 环境变量 > 默认 false
 */

const ENGRAM_FLAG_KEY = 'omnient_engram_enabled'

export function isEngramEnabled(): boolean {
  try {
    const override = localStorage.getItem(ENGRAM_FLAG_KEY)
    if (override !== null) return override === 'true'
  } catch {
    /* storage disabled */
  }
  return import.meta.env.VITE_ENGRAM_ENABLED === 'true'
}

export function setEngramEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(ENGRAM_FLAG_KEY, String(enabled))
  } catch {
    /* ignore */
  }
}

export function resetEngramFlag(): void {
  try {
    localStorage.removeItem(ENGRAM_FLAG_KEY)
  } catch {
    /* ignore */
  }
}
