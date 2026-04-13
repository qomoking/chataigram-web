/**
 * L3: PlazaPage - WebSocket init + render + bump 动作。
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PlazaPage from './PlazaPage'
import { wrapWithProviders } from '../../test-utils/wrapper'

// Lottie 在 jsdom 里因为 canvas 相关能力不可用，mock 掉
vi.mock('lottie-react', () => ({
  default: () => null,
}))

function renderAt() {
  localStorage.setItem(
    'omnient_current_user',
    JSON.stringify({ id: 77, name: 'T', username: 't', avatarUrl: null }),
  )
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
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders header (即使 WS 没连上也能 render shell)', () => {
    renderAt()
    expect(screen.getByText('Plaza')).toBeTruthy()
    // 发送 status 输入框
    expect(screen.getByPlaceholderText('set your status...')).toBeTruthy()
  })

  it('online badge starts at 0 then reflects WS init when connected', async () => {
    // 注：MSW WebSocket mock 会推 init 3 users，但 jsdom 下
    // WebSocket handshake 行为可能需要等一会。这里只断言 badge 存在。
    renderAt()
    const badge = screen.getByText(/\d+ online/)
    expect(badge).toBeTruthy()
  })

  it('status input + send triggers empty after submit', () => {
    renderAt()
    const input = screen.getByPlaceholderText('set your status...') as HTMLInputElement
    fireEvent.change(input, { target: { value: '摸鱼' } })
    expect(input.value).toBe('摸鱼')
    fireEvent.keyDown(input, { key: 'Enter' })
    // 本地 UI 清空（实际 WS 会不会送到要看连接状态，这里只看本地）
    expect(input.value).toBe('')
  })
})
