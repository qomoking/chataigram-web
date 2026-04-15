import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PlazaUser, PlazaViewerContext } from '@chataigram/core'
import {
  LOTTIE_SLOTS_RECENT,
  LOTTIE_SLOTS_TIER_II,
  useLottieSlots,
} from './useLottieSlots'

function mkUser(id: number, animationTaskId: string | null = `task-${id}`): PlazaUser {
  return {
    id,
    name: `u${id}`,
    avatarUrl: null,
    statusText: null,
    statusEmoji: null,
    animationTaskId,
    posX: 0,
    posY: 0,
  }
}

function emptyCtx(): PlazaViewerContext {
  return {
    invitedByUserIds: [],
    inviteeUserIds: [],
    interactedUserIds: [],
    interactionTimes: {},
  }
}

describe('useLottieSlots', () => {
  it('excludes self from the result', () => {
    const users = [mkUser(1), mkUser(2), mkUser(3)]
    const joinedAt = { 1: 1000, 2: 2000, 3: 3000 }
    const { result } = renderHook(() =>
      useLottieSlots({
        users,
        viewerContext: emptyCtx(),
        currentUserId: 1,
        joinedAt,
      }),
    )
    expect(result.current.has(1)).toBe(false)
    expect(result.current.has(2)).toBe(true)
    expect(result.current.has(3)).toBe(true)
  })

  it('excludes users with null animationTaskId', () => {
    const users = [mkUser(2, null), mkUser(3)]
    const { result } = renderHook(() =>
      useLottieSlots({
        users,
        viewerContext: emptyCtx(),
        currentUserId: 1,
        joinedAt: { 2: 1000, 3: 2000 },
      }),
    )
    expect(result.current.has(2)).toBe(false)
    expect(result.current.has(3)).toBe(true)
  })

  it('caps at 7 (tier II 5 + recent 2)', () => {
    const users = Array.from({ length: 20 }, (_, i) => mkUser(i + 2))
    const joinedAt = Object.fromEntries(users.map((u, i) => [u.id, 1000 + i]))
    const { result } = renderHook(() =>
      useLottieSlots({
        users,
        viewerContext: emptyCtx(),
        currentUserId: 1,
        joinedAt,
      }),
    )
    expect(result.current.size).toBe(LOTTIE_SLOTS_TIER_II + LOTTIE_SLOTS_RECENT)
  })

  it('prioritizes invited users over interacted over other in tier II', () => {
    const users = [
      mkUser(10), // other
      mkUser(11), // other
      mkUser(20), // interacted
      mkUser(21), // interacted
      mkUser(30), // invited
      mkUser(31), // invited
    ]
    const ctx: PlazaViewerContext = {
      invitedByUserIds: [30],
      inviteeUserIds: [31],
      interactedUserIds: [20, 21],
      interactionTimes: {
        '20': '2026-04-10T00:00:00Z',
        '21': '2026-04-12T00:00:00Z',
      },
    }
    const joinedAt = { 10: 100, 11: 200, 20: 300, 21: 400, 30: 500, 31: 600 }
    const { result } = renderHook(() =>
      useLottieSlots({
        users,
        viewerContext: ctx,
        currentUserId: 1,
        joinedAt,
      }),
    )
    // First 5 slots (tier II) should be the 2 invited + 2 interacted + 1 other
    expect(result.current.has(30)).toBe(true) // invited
    expect(result.current.has(31)).toBe(true) // invited
    expect(result.current.has(20)).toBe(true) // interacted
    expect(result.current.has(21)).toBe(true) // interacted
    // the remaining 2 "other" users fill tier II slot 5 + recent slot 1;
    // recent slot 2 has no candidate left (only 6 eligible users total)
    const otherInTier = [10, 11].filter((id) => result.current.has(id))
    expect(otherInTier.length).toBe(2)
    expect(result.current.size).toBe(6)
  })

  it('orders interacted tier by interaction recency desc', () => {
    const users = Array.from({ length: 7 }, (_, i) => mkUser(i + 10))
    const ctx: PlazaViewerContext = {
      invitedByUserIds: [],
      inviteeUserIds: [],
      interactedUserIds: [10, 11, 12, 13, 14, 15, 16],
      interactionTimes: {
        '10': '2026-04-01T00:00:00Z',
        '11': '2026-04-05T00:00:00Z',
        '12': '2026-04-10T00:00:00Z',
        '13': '2026-04-12T00:00:00Z',
        '14': '2026-04-13T00:00:00Z',
        '15': '2026-04-14T00:00:00Z',
        '16': '2026-04-15T00:00:00Z',
      },
    }
    const joinedAt = Object.fromEntries(users.map((u) => [u.id, 1000]))
    const { result } = renderHook(() =>
      useLottieSlots({
        users,
        viewerContext: ctx,
        currentUserId: 1,
        joinedAt,
      }),
    )
    // Tier II 5 slots = top 5 by interaction time → 12,13,14,15,16
    // Recent 2 slots from remaining = 10,11 by joinedAt (tied, both picked)
    expect(result.current.has(16)).toBe(true)
    expect(result.current.has(15)).toBe(true)
    expect(result.current.has(14)).toBe(true)
    expect(result.current.has(13)).toBe(true)
    expect(result.current.has(12)).toBe(true)
    expect(result.current.size).toBe(7)
  })

  it('"other" tier sorts by joinedAt desc', () => {
    const users = Array.from({ length: 10 }, (_, i) => mkUser(i + 10))
    const joinedAt = Object.fromEntries(users.map((u, i) => [u.id, 1000 + i]))
    const { result } = renderHook(() =>
      useLottieSlots({
        users,
        viewerContext: emptyCtx(),
        currentUserId: 1,
        joinedAt,
      }),
    )
    // Should include the 7 most recent joiners: ids 13..19
    for (const id of [13, 14, 15, 16, 17, 18, 19]) {
      expect(result.current.has(id)).toBe(true)
    }
    for (const id of [10, 11, 12]) {
      expect(result.current.has(id)).toBe(false)
    }
  })

  it('recent category does not double-count users already in tier II', () => {
    const users = [mkUser(10), mkUser(11), mkUser(12)]
    const ctx: PlazaViewerContext = {
      invitedByUserIds: [10, 11, 12],
      inviteeUserIds: [],
      interactedUserIds: [],
      interactionTimes: {},
    }
    const joinedAt = { 10: 100, 11: 200, 12: 300 }
    const { result } = renderHook(() =>
      useLottieSlots({
        users,
        viewerContext: ctx,
        currentUserId: 1,
        joinedAt,
      }),
    )
    // All 3 are invited → fill tier II (up to 5), recent has 0 candidates left
    expect(result.current.size).toBe(3)
    expect(result.current.has(10)).toBe(true)
    expect(result.current.has(11)).toBe(true)
    expect(result.current.has(12)).toBe(true)
  })

  it('null viewer context falls back to joinedAt-only ordering', () => {
    const users = Array.from({ length: 10 }, (_, i) => mkUser(i + 10))
    const joinedAt = Object.fromEntries(users.map((u, i) => [u.id, 1000 + i]))
    const { result } = renderHook(() =>
      useLottieSlots({
        users,
        viewerContext: null,
        currentUserId: 1,
        joinedAt,
      }),
    )
    expect(result.current.size).toBe(7)
    // Most recent joiners: 13..19
    for (const id of [13, 14, 15, 16, 17, 18, 19]) {
      expect(result.current.has(id)).toBe(true)
    }
  })

  it('empty users yields empty set', () => {
    const { result } = renderHook(() =>
      useLottieSlots({
        users: [],
        viewerContext: emptyCtx(),
        currentUserId: 1,
        joinedAt: {},
      }),
    )
    expect(result.current.size).toBe(0)
  })
})
