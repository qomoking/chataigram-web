import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { PlazaUser } from '@chataigram/core'
import {
  FAKE_USERS,
  fakeMetaToPlazaUser,
  type FakeUserMeta,
} from './fakeUsers'

/** 真人（不含自己）数 < 这个阈值才补假人。 */
export const FAKE_FLOOR = 4
const FAKE_MIN = 3
const FAKE_MAX = 5

// 每个 .json 一个独立 chunk，进 idle 阶段才下载。
const lottieLoaders = import.meta.glob<object>('./lottie/*.json', {
  import: 'default',
})

function loaderKey(meta: FakeUserMeta) {
  return `./lottie/${meta.archetype}-${meta.gender}.json`
}

// ── 模块级状态：prefetch 全局只跑一次，所有 hook 实例共享。 ─────
let prefetchPromise: Promise<void> | null = null
let prefetchDone = false
const readySubscribers = new Set<() => void>()

function notifyReady() {
  prefetchDone = true
  readySubscribers.forEach((fn) => fn())
}

/**
 * 登录后调一次：在浏览器空闲时把 10 份假人 Lottie 灌进 react-query cache。
 *
 * 实现细节：
 * - 用 `requestIdleCallback`，5s timeout 兜底；不支持的环境 fallback `setTimeout(1500ms)`。
 * - 每份 JSON 是独立 chunk（`import.meta.glob` 默认 lazy），不进主 bundle。
 * - 灌入 cache 用 `setQueryData(['animation', userId, taskId], lottie)`，
 *   PlazaPage 调 `prefetchAnimation` 时会命中，**不发 HTTP**。
 *
 * 多次调用幂等。
 */
export function prefetchFakeLottieOnIdle(qc: QueryClient): Promise<void> {
  if (prefetchPromise) return prefetchPromise
  prefetchPromise = new Promise<void>((resolve) => {
    const run = async () => {
      await Promise.all(
        FAKE_USERS.map(async (meta) => {
          const loader = lottieLoaders[loaderKey(meta)]
          if (!loader) {
            // 文件名没对上：开发期 console 提示，避免静默漏 archetype。
            console.warn('[fakePresence] missing lottie for', meta.animationTaskId)
            return
          }
          try {
            const lottie = await loader()
            qc.setQueryData(['animation', meta.id, meta.animationTaskId], lottie)
          } catch (err) {
            console.warn('[fakePresence] load failed', meta.animationTaskId, err)
          }
        }),
      )
      notifyReady()
      resolve()
    }
    if (typeof window === 'undefined') {
      // SSR/node：直接 resolve，不预取
      resolve()
      return
    }
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(() => void run(), { timeout: 5000 })
    } else {
      setTimeout(() => void run(), 1500)
    }
  })
  return prefetchPromise
}

// ── pick 算法 ────────────────────────────────────────────────────

function pickFakes(realOtherCount: number): FakeUserMeta[] {
  if (realOtherCount >= FAKE_FLOOR) return []
  // 目标在场（含真人）人数：3-5 之间
  const target = FAKE_MIN + Math.floor(Math.random() * (FAKE_MAX - FAKE_MIN + 1))
  const need = Math.max(0, target - realOtherCount)
  if (need === 0) return []
  // 不放回随机抽样（Fisher-Yates）
  const pool: FakeUserMeta[] = [...FAKE_USERS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = pool[i]!
    const b = pool[j]!
    pool[i] = b
    pool[j] = a
  }
  return pool.slice(0, need)
}

/**
 * 在自己周围撒：半径 220-380 的环上等角分布 + 微抖动。
 * 同一 slotIndex 给同一 meta 稳定的位置（一次性算定，不每帧动）。
 */
function fakePosition(
  slotIndex: number,
  total: number,
  myPos: { x: number; y: number } | null,
  seed: number,
): { x: number; y: number } {
  const cx = myPos?.x ?? 0
  const cy = myPos?.y ?? 0
  // 简单确定性 jitter：基于 seed (id) 取小偏移，避免每次 mount 抖动
  const angle = (slotIndex / Math.max(1, total)) * Math.PI * 2 + (seed % 7) * 0.18
  const radius = 240 + ((seed * 13) % 140)
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  }
}

// ── hook ─────────────────────────────────────────────────────────

export type UseFakePresenceArgs = {
  realUsers: PlazaUser[]
  currentUserId: number | null
  myPos: { x: number; y: number } | null
  /** PlazaPage 的 onInit 已触发（用于判断"现在的真人数是真实的"）。 */
  initialized: boolean
}

export type FakePresenceResult = {
  /** realUsers + 选中的假人；渲染、useLottieSlots 都用这个。 */
  displayUsers: PlazaUser[]
  /** 选中假人的 joinedAt（id → ms）；merge 进 PlazaPage 的 joinedAt 后再喂 useLottieSlots。 */
  fakeJoinedAt: Record<number, number>
}

/**
 * 把假人混进真用户列表。
 *
 * 时机：
 *   1. 等 `initialized=true`（onInit 已到，真人数可信）
 *   2. 等 `prefetchDone=true`（10 份 Lottie 已进 cache，渲染时 PlazaPage 能直接画 Lottie）
 *   3. 真人数 < FAKE_FLOOR（不含自己）→ 抽 (3-5)-realCount 个补
 *
 * 选定后**不再变**：避免突然进出造成画面跳。
 */
export function useFakePresence({
  realUsers,
  currentUserId,
  myPos,
  initialized,
}: UseFakePresenceArgs): FakePresenceResult {
  const qc = useQueryClient()
  const [ready, setReady] = useState(prefetchDone)
  const [picks, setPicks] = useState<FakeUserMeta[] | null>(null)
  const decidedRef = useRef(false)

  // 订阅 ready 通知：prefetchOnIdle 完成后所有 hook 实例都 setReady(true)
  useEffect(() => {
    if (prefetchDone) {
      setReady(true)
      return
    }
    const fn = () => setReady(true)
    readySubscribers.add(fn)
    return () => {
      readySubscribers.delete(fn)
    }
  }, [])

  // PlazaPage mount 时如果还没人调过 prefetch（比如直接深链进 plaza），兜底触发
  useEffect(() => {
    void prefetchFakeLottieOnIdle(qc)
  }, [qc])

  // 决策：ready + initialized 双满足时一次性定下补谁
  useEffect(() => {
    if (decidedRef.current) return
    if (!ready || !initialized) return
    const realOthers = realUsers.filter((u) => u.id !== currentUserId).length
    decidedRef.current = true
    setPicks(pickFakes(realOthers))
  }, [ready, initialized, realUsers, currentUserId])

  return useMemo<FakePresenceResult>(() => {
    if (!picks || picks.length === 0) {
      return { displayUsers: realUsers, fakeJoinedAt: {} }
    }
    const fakeUsers: PlazaUser[] = picks.map((meta, i) => {
      const pos = fakePosition(i, picks.length, myPos, Math.abs(meta.id))
      return fakeMetaToPlazaUser(meta, pos.x, pos.y)
    })
    const now = Date.now()
    const fakeJoinedAt: Record<number, number> = {}
    // 假人统一标"刚加入"，让 useLottieSlots 的 Recent tier 能挑到
    for (const u of fakeUsers) fakeJoinedAt[u.id] = now
    return {
      displayUsers: [...realUsers, ...fakeUsers],
      fakeJoinedAt,
    }
  }, [picks, realUsers, myPos])
}
