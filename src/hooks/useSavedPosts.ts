import { useCallback, useEffect, useState } from 'react'

/**
 * web 内部 hook —— 用 localStorage 保存"我收藏的帖子 id 集合"。
 *
 * 这是纯客户端偏好（后端没有 saved 概念），所以归 web。
 * 如果未来要服务端持久化，把这个搬进 core 并接 API 即可。
 */
const STORAGE_KEY = 'chataigram:saved-posts'

function read(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr: unknown = JSON.parse(raw)
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x): x is number => typeof x === 'number'))
  } catch {
    return new Set()
  }
}

function write(set: Set<number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch {
    /* quota or disabled storage — ignore */
  }
}

export function useSavedPosts() {
  const [saved, setSaved] = useState<Set<number>>(() => read())

  // 跨 tab 同步
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSaved(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggle = useCallback((id: number) => {
    setSaved((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      write(next)
      return next
    })
  }, [])

  const isSaved = useCallback((id: number) => saved.has(id), [saved])

  return { saved, isSaved, toggle }
}
