/**
 * L3: PlazaPage - WebSocket init + render + disconnected state + Lottie 配额。
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type * as Core from '@chataigram/core'
import PlazaPage from './PlazaPage'
import { wrapWithProviders } from '../../test-utils/wrapper'

// Lottie 在 jsdom 里因为 canvas 相关能力不可用，mock 成一个可计数的占位
vi.mock('lottie-react', () => ({
  default: () => <div data-testid="lottie-rendered" />,
}))

// ── mock usePlazaSocket 方便控制连接 & 消息 ──────────────────
let mockCallbacks: Record<string, (...args: unknown[]) => void> = {}
let mockConnected = false

vi.mock('@chataigram/core', async () => {
  const actual = await vi.importActual<typeof Core>('@chataigram/core')
  return {
    ...actual,
    useCurrentUser: () => ({
      data: { id: 77, name: 'Tester', username: 'tester', avatarUrl: null },
      isLoading: false,
    }),
    usePlazaSocket: (_userId: unknown, cbs: Record<string, unknown>) => {
      mockCallbacks = cbs as Record<string, (...args: unknown[]) => void>
      return { send: vi.fn(), connected: mockConnected }
    },
    prefetchAnimation: vi
      .fn()
      .mockResolvedValue({ v: '5.7', fr: 30, ip: 0, op: 60, layers: [] }),
  }
})

function renderPlaza() {
  return render(
    <MemoryRouter initialEntries={['/plaza']}>
      <Routes>
        <Route path="/plaza" element={<PlazaPage />} />
      </Routes>
    </MemoryRouter>,
    { wrapper: wrapWithProviders() },
  )
}

describe('<PlazaPage> L3', () => {
  beforeEach(() => {
    localStorage.clear()
    mockConnected = false
    mockCallbacks = {}
  })
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  // ── shell render ──────────────────────────────────────────
  it('renders header even when WS is not connected', () => {
    renderPlaza()
    expect(screen.getByText('Plaza')).toBeTruthy()
    expect(screen.getByPlaceholderText('set your status...')).toBeTruthy()
  })

  // ── disconnected state：the bug that caused blank page ────
  it('shows "connecting to plaza..." when WS is not connected', () => {
    mockConnected = false
    renderPlaza()
    expect(screen.getByText(/connecting to plaza/i)).toBeTruthy()
  })

  it('badge shows "connecting..." not "0 online" when disconnected', () => {
    mockConnected = false
    renderPlaza()
    const badge = screen.getByText('connecting...')
    expect(badge.classList.contains('disconnected')).toBe(true)
  })

  // ── connected + init ─────────────────────────────────────
  it('renders users after WS init message', async () => {
    mockConnected = true
    renderPlaza()

    // 模拟服务端推 init
    act(() => {
      mockCallbacks['onInit']?.({
        type: 'init',
        users: [
          { id: 77, name: 'Tester', avatarUrl: null, statusText: null, statusEmoji: null, animationTaskId: null, posX: 200, posY: 200 },
          { id: 9001, name: 'Alice', avatarUrl: null, statusText: '摸鱼', statusEmoji: '🐟', animationTaskId: null, posX: 400, posY: 150 },
        ],
        myPos: { x: 200, y: 200 },
      })
    })

    // avatar-name 里找名字
    const names = screen.getAllByText('Alice')
    expect(names.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Tester')).toBeTruthy()
  })

  // ── status input ──────────────────────────────────────────
  it('status input clears after Enter submit', () => {
    mockConnected = true
    renderPlaza()
    const input = screen.getByPlaceholderText('set your status...') as HTMLInputElement
    fireEvent.change(input, { target: { value: '摸鱼' } })
    expect(input.value).toBe('摸鱼')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input.value).toBe('')
  })

  // ── Lottie 配额：自己 + 最多 7 个其他人 ──────────────────────
  it('renders Lottie for all eligible users when count ≤ 7', async () => {
    mockConnected = true
    renderPlaza()
    act(() => {
      mockCallbacks['onInit']?.({
        type: 'init',
        users: [
          { id: 77, name: 'Me', avatarUrl: null, statusText: null, statusEmoji: null, animationTaskId: 'task-self', posX: 200, posY: 200 },
          { id: 1, name: 'A', avatarUrl: null, statusText: null, statusEmoji: null, animationTaskId: 'task-1', posX: 0, posY: 0 },
          { id: 2, name: 'B', avatarUrl: null, statusText: null, statusEmoji: null, animationTaskId: 'task-2', posX: 0, posY: 0 },
          { id: 3, name: 'C', avatarUrl: null, statusText: null, statusEmoji: null, animationTaskId: 'task-3', posX: 0, posY: 0 },
        ],
        myPos: { x: 200, y: 200 },
        viewerContext: {
          invitedByUserIds: [],
          inviteeUserIds: [],
          interactedUserIds: [],
          interactionTimes: {},
        },
      })
    })
    // self + 3 others = 4 Lotties
    await waitFor(() => {
      expect(screen.getAllByTestId('lottie-rendered').length).toBe(4)
    })
  })

  it('caps Lottie at 7 others + self = 8 when plaza has many users', async () => {
    mockConnected = true
    renderPlaza()
    const others = Array.from({ length: 15 }, (_, i) => ({
      id: i + 100,
      name: `u${i}`,
      avatarUrl: null,
      statusText: null,
      statusEmoji: null,
      animationTaskId: `task-${i + 100}`,
      posX: 0,
      posY: 0,
    }))
    act(() => {
      mockCallbacks['onInit']?.({
        type: 'init',
        users: [
          { id: 77, name: 'Me', avatarUrl: null, statusText: null, statusEmoji: null, animationTaskId: 'task-self', posX: 200, posY: 200 },
          ...others,
        ],
        myPos: { x: 200, y: 200 },
        viewerContext: {
          invitedByUserIds: [],
          inviteeUserIds: [],
          interactedUserIds: [],
          interactionTimes: {},
        },
      })
    })
    // self + 7 others capped = 8
    await waitFor(() => {
      expect(screen.getAllByTestId('lottie-rendered').length).toBe(8)
    })
  })

  it('skips users with null animationTaskId from Lottie slots', async () => {
    mockConnected = true
    renderPlaza()
    act(() => {
      mockCallbacks['onInit']?.({
        type: 'init',
        users: [
          { id: 77, name: 'Me', avatarUrl: null, statusText: null, statusEmoji: null, animationTaskId: 'task-self', posX: 200, posY: 200 },
          { id: 1, name: 'A', avatarUrl: null, statusText: null, statusEmoji: null, animationTaskId: null, posX: 0, posY: 0 },
          { id: 2, name: 'B', avatarUrl: null, statusText: null, statusEmoji: null, animationTaskId: 'task-2', posX: 0, posY: 0 },
        ],
        myPos: { x: 200, y: 200 },
        viewerContext: {
          invitedByUserIds: [],
          inviteeUserIds: [],
          interactedUserIds: [],
          interactionTimes: {},
        },
      })
    })
    // self + B (A has no task) = 2 Lotties
    await waitFor(() => {
      expect(screen.getAllByTestId('lottie-rendered').length).toBe(2)
    })
  })

  it('prioritizes invited users in the 7 slots', async () => {
    mockConnected = true
    renderPlaza()
    // 10 non-invited filler users + 2 invited users
    const fillers = Array.from({ length: 10 }, (_, i) => ({
      id: i + 200,
      name: `f${i}`,
      avatarUrl: null,
      statusText: null,
      statusEmoji: null,
      animationTaskId: `task-${i + 200}`,
      posX: 0,
      posY: 0,
    }))
    const invited = [
      { id: 500, name: 'Inviter', avatarUrl: null, statusText: null, statusEmoji: null, animationTaskId: 'task-500', posX: 0, posY: 0 },
      { id: 501, name: 'Invitee', avatarUrl: null, statusText: null, statusEmoji: null, animationTaskId: 'task-501', posX: 0, posY: 0 },
    ]
    act(() => {
      mockCallbacks['onInit']?.({
        type: 'init',
        users: [
          { id: 77, name: 'Me', avatarUrl: null, statusText: null, statusEmoji: null, animationTaskId: 'task-self', posX: 200, posY: 200 },
          ...fillers,
          ...invited,
        ],
        myPos: { x: 200, y: 200 },
        viewerContext: {
          invitedByUserIds: [500],
          inviteeUserIds: [501],
          interactedUserIds: [],
          interactionTimes: {},
        },
      })
    })
    // Still capped at 8 total (self + 7)
    await waitFor(() => {
      expect(screen.getAllByTestId('lottie-rendered').length).toBe(8)
    })
    // Both invited users must be on screen (their avatar-name nodes render)
    expect(screen.getByText('Inviter')).toBeTruthy()
    expect(screen.getByText('Invitee')).toBeTruthy()
  })

  // ── user leave ────────────────────────────────────────────
  it('removes user on leave event', () => {
    mockConnected = true
    renderPlaza()

    act(() => {
      mockCallbacks['onInit']?.({
        type: 'init',
        users: [
          { id: 77, name: 'Tester', avatarUrl: null, statusText: null, statusEmoji: null, animationTaskId: null, posX: 200, posY: 200 },
          { id: 9001, name: 'Alice', avatarUrl: null, statusText: null, statusEmoji: null, animationTaskId: null, posX: 400, posY: 150 },
        ],
        myPos: { x: 200, y: 200 },
      })
    })

    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)

    act(() => {
      mockCallbacks['onUserLeave']?.(9001)
    })

    expect(screen.queryAllByText('Alice')).toHaveLength(0)
  })
})
