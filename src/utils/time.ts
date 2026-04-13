/**
 * 时间相对表示工具。
 *
 * 对齐原 frontend/FeedPage 的 timeAgo 行为。
 */
import { t } from './i18n'

export function timeAgo(iso: string | number | Date): string {
  const ts = typeof iso === 'string' || iso instanceof Date ? new Date(iso).getTime() : iso
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60_000)
  if (m < 1) return t('feed.justNow')
  if (m < 60) return t('feed.minutesAgo', { m })
  const h = Math.floor(m / 60)
  if (h < 24) return t('feed.hoursAgo', { h })
  return t('feed.daysAgo', { d: Math.floor(h / 24) })
}
