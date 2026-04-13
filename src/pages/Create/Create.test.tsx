/**
 * L3: Create 聊天式生成页。
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Create from './Create'
import { wrapWithProviders } from '../../test-utils/wrapper'

function renderAt() {
  localStorage.setItem(
    'omnient_current_user',
    JSON.stringify({ id: 3, name: 'T', username: 't', avatarUrl: null }),
  )
  return render(
    <MemoryRouter initialEntries={['/create']}>
      <Routes>
        <Route path="/create" element={<Create />} />
      </Routes>
    </MemoryRouter>,
    { wrapper: wrapWithProviders() },
  )
}

describe('<Create> L3', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('shows welcome state + send stays disabled until input', () => {
    renderAt()
    expect(screen.getByText('What will you create?')).toBeTruthy()
    const sendBtn = screen.getByLabelText('send')
    expect((sendBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('typing + send enqueues message + triggers generate', async () => {
    renderAt()
    // 给 useCurrentUser 的异步 query 一点时间落位（handleSend 有 !currentUser 守卫）
    await new Promise((r) => setTimeout(r, 30))

    const ta = screen.getByPlaceholderText('Describe your image...')
    fireEvent.change(ta, { target: { value: '一只猫' } })

    const sendBtn = screen.getByLabelText('send')
    expect((sendBtn as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(sendBtn)

    // user bubble 里能看到原文
    await waitFor(() => expect(screen.getByText('一只猫')).toBeTruthy())
    // AI 气泡最终出现 "Save to Feed" 按钮（mock generate 返回 picsum URL）
    await waitFor(() => expect(screen.getByText('Save to Feed')).toBeTruthy(), {
      timeout: 3000,
    })
  })
})
