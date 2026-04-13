import { useEffect, useRef, useState } from 'react'
import { useInbox, type Notification } from '@chataigram/core'

const EXPOSED_KEY = 'omnient_notifications_exposed'
const SHOWN_KEY = 'omnient_unseen_shown'

function getExposedIds(): Set<number> {
  try {
    const raw = localStorage.getItem(EXPOSED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x): x is number => typeof x === 'number'))
  } catch {
    return new Set()
  }
}

function markExposed(ids: number[]): void {
  try {
    const set = getExposedIds()
    for (const id of ids) set.add(id)
    const arr = [...set].slice(-500)
    localStorage.setItem(EXPOSED_KEY, JSON.stringify(arr))
  } catch {
    /* ignore */
  }
}

/**
 * 拉一次通知 → 过滤掉本机见过的 → 返回 unseen list。
 * 每个 browser session 只触发一次（sessionStorage 守卫）。
 * 迁自 frontend/hooks/useUnseenNotifications.js。
 */
export default function useUnseenNotifications({
  limit = 20,
  delay = 1500,
}: { limit?: number; delay?: number } = {}) {
  const [unseenList, setUnseenList] = useState<Notification[]>([])
  const fired = useRef(false)
  const { data } = useInbox({ limit })

  useEffect(() => {
    if (fired.current) return
    try {
      if (sessionStorage.getItem(SHOWN_KEY)) return
    } catch {
      /* session storage disabled */
    }
    if (!data?.notifications) return
    fired.current = true

    const timer = setTimeout(() => {
      const exposed = getExposedIds()
      const unseen = data.notifications.filter((n) => !exposed.has(n.id))
      if (unseen.length > 0) {
        setUnseenList(unseen)
        try {
          sessionStorage.setItem(SHOWN_KEY, '1')
        } catch {
          /* ignore */
        }
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [data, delay])

  const dismissAll = () => {
    if (unseenList.length > 0) {
      markExposed(unseenList.map((n) => n.id))
    }
    setUnseenList([])
  }

  return { unseenList, dismissAll }
}
