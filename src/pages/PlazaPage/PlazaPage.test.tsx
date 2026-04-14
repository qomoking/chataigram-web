/**
 * L3: PlazaPage - WebSocket init + render + disconnected state.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PlazaPage from './PlazaPage'
import { wrapWithProviders } from '../../test-utils/wrapper'

// Lottie 在 jsdom 里因为 canvas 相关能力不可用，mock 掉
vi.mock('lottie-react', () => ({
  default: () => null,
}))

// ── mock usePlazaSocket 方便控制连接 & 消息 ──────────────────
let mockCallbacks: Record<string, (...args: unknown[]) => void> = {}
let mockConnected = false

vi.mock('@chataigram/core', async () => {
  const actual = await vi.importActual<typeof import('@chataigram/core')>('@chataigram/core')
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
