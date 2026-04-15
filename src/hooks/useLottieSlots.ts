import { useMemo } from 'react'
import type { PlazaUser, PlazaViewerContext } from '@chataigram/core'

/**
 * Lottie 渲染配额，单设备同屏 Lottie 数硬上限。
 * 自己的头像永远渲染 Lottie，**不占**下面这 7 个配额。
 *
 * 7 个配额分配：
 *   - 5 个：tier II（邀请链 → 互动 → 最近加入，逐层填满）
 *   - 2 个：最近加入 plaza 的新用户
 *   - 3 个：starred（预留，UI 未上线，留空不填）
 */
export const LOTTIE_SLOTS_TIER_II = 5
export const LOTTIE_SLOTS_RECENT = 2
export const LOTTIE_SLOTS_STARRED_RESERVED = 3
export const LOTTIE_SLOTS_TOTAL =
  LOTTIE_SLOTS_TIER_II + LOTTIE_SLOTS_RECENT + LOTTIE_SLOTS_STARRED_RESERVED

type Rank = 'invited' | 'interacted' | 'other'

function classify(
  userId: number,
  ctx: PlazaViewerContext | null,
): Rank {
  if (!ctx) return 'other'
  if (
    ctx.invitedByUserIds.includes(userId) ||
    ctx.inviteeUserIds.includes(userId)
  ) {
    return 'invited'
  }
  if (ctx.interactedUserIds.includes(userId)) return 'interacted'
  return 'other'
}

function scoreFor(
  userId: number,
  ctx: PlazaViewerContext | null,
  joinedAt: Record<number, number>,
): number {
  const interactionIso = ctx?.interactionTimes[String(userId)]
  const interactionMs = interactionIso ? Date.parse(interactionIso) : NaN
  if (Number.isFinite(interactionMs)) return interactionMs
  return joinedAt[userId] ?? 0
}

export type UseLottieSlotsArgs = {
  users: PlazaUser[]
  viewerContext: PlazaViewerContext | null
  currentUserId: number | null
  /** userId → ms timestamp 表示"在本 session 出现在 plaza 的时间" */
  joinedAt: Record<number, number>
}

/**
 * 从 plaza 在线用户里挑出应该渲染 Lottie 的那几个 user id。
 *
 * 规则（自己永远 Lottie，**不经过**这里）：
 *   1. 过滤：排除自己、排除没 animationTaskId 的用户
 *   2. Tier II 选 5 个：
 *      - 层 1（invited）按 score 降序
 *      - 层 2（interacted）按 score 降序
 *      - 层 3（other）按 joinedAt 降序
 *   3. 最近加入 2 个：剩余候选里按 joinedAt 降序
 *   4. starred 3 个预留空位，当前版本不填
 *
 * 返回 Set 便于 O(1) 命中判断。
 */
export function useLottieSlots({
  users,
  viewerContext,
  currentUserId,
  joinedAt,
}: UseLottieSlotsArgs): Set<number> {
  return useMemo(() => {
    const candidates = users.filter(
      (u) => u.id !== currentUserId && u.animationTaskId != null,
    )

    const invited: PlazaUser[] = []
    const interacted: PlazaUser[] = []
    const other: PlazaUser[] = []

    for (const u of candidates) {
      const rank = classify(u.id, viewerContext)
      if (rank === 'invited') invited.push(u)
      else if (rank === 'interacted') interacted.push(u)
      else other.push(u)
    }

    const byScoreDesc = (a: PlazaUser, b: PlazaUser) =>
      scoreFor(b.id, viewerContext, joinedAt) -
      scoreFor(a.id, viewerContext, joinedAt)
    const byJoinedDesc = (a: PlazaUser, b: PlazaUser) =>
      (joinedAt[b.id] ?? 0) - (joinedAt[a.id] ?? 0)

    invited.sort(byScoreDesc)
    interacted.sort(byScoreDesc)
    other.sort(byJoinedDesc)

    const picked = new Set<number>()

    const tierOrder = [...invited, ...interacted, ...other]
    for (const u of tierOrder) {
      if (picked.size >= LOTTIE_SLOTS_TIER_II) break
      picked.add(u.id)
    }

    const remaining = candidates
      .filter((u) => !picked.has(u.id))
      .sort(byJoinedDesc)
    for (const u of remaining) {
      if (picked.size >= LOTTIE_SLOTS_TIER_II + LOTTIE_SLOTS_RECENT) break
      picked.add(u.id)
    }

    return picked
  }, [users, viewerContext, currentUserId, joinedAt])
}
