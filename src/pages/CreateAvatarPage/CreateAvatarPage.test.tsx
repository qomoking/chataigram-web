/**
 * L3: CreateAvatarPage 简化版。
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CreateAvatarPage from './CreateAvatarPage'
import { wrapWithProviders } from '../../test-utils/wrapper'

function renderAt() {
  localStorage.setItem(
    'omnient_current_user',
    JSON.stringify({ id: 9, name: 'T', username: 't', avatarUrl: null }),
  )
  return render(
    <MemoryRouter initialEntries={['/create-avatar']}>
      <Routes>
        <Route path="/create-avatar" element={<CreateAvatarPage />} />
        <Route path="/profile" element={<div data-testid="profile">PROFILE</div>} />
      </Routes>
    </MemoryRouter>,
    { wrapper: wrapWithProviders() },
  )
}

describe('<CreateAvatarPage> L3', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders 6 style chips + generate button', () => {
    renderAt()
    expect(screen.getByText('3D')).toBeTruthy()
    expect(screen.getByText('动漫')).toBeTruthy()
    expect(screen.getByText('赛博')).toBeTruthy()
    expect(screen.getByText('油画')).toBeTruthy()
    expect(screen.getByText('水彩')).toBeTruthy()
    expect(screen.getByText('像素')).toBeTruthy()
    expect(screen.getByRole('button', { name: '生成头像' })).toBeTruthy()
  })

  it('generate → show result → 用作头像 → 跳 /profile', async () => {
    renderAt()
    // 等 useCurrentUser 异步 query 落位（handleGenerate 里 !currentUser 守卫）
    await new Promise((r) => setTimeout(r, 30))
    fireEvent.click(screen.getByText('3D'))
    fireEvent.click(screen.getByRole('button', { name: '生成头像' }))
    await waitFor(() => expect(screen.getByText('用作头像')).toBeTruthy(), {
      timeout: 3000,
    })
    fireEvent.click(screen.getByText('用作头像'))
    await waitFor(() => expect(screen.getByTestId('profile')).toBeTruthy())
    // 本地 profile 存了新头像
    const stored = JSON.parse(localStorage.getItem('omnient_profile')!)
    expect(stored.avatar).toMatch(/picsum/)
  })
})
