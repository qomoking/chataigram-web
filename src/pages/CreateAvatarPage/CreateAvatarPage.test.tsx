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
  // 锁死中文 locale，避免 i18n 切到英文把断言搞乱
  localStorage.setItem('omnient_lang', 'zh')
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

  it('空态：显示两个按键 + 空卡提示，不再有风格 chip', () => {
    renderAt()
    expect(screen.getByText('确定')).toBeTruthy()
    expect(screen.getByText('Continue')).toBeTruthy()
    expect(screen.getByText(/描述你想要的头像/)).toBeTruthy()
    // 老风格 chip 都不应该存在了
    expect(screen.queryByText('3D')).toBeNull()
    expect(screen.queryByText('动漫')).toBeNull()
    expect(screen.queryByText('赛博')).toBeNull()
  })

  it('Continue 初始禁用（没 lastResultUrl）', () => {
    renderAt()
    expect(screen.getByText('Continue').hasAttribute('disabled')).toBe(true)
  })

  it('直接按确定 → SSE 出图 → 设为我的头像 → /profile + localStorage profile.avatar 被写入', async () => {
    renderAt()
    await new Promise((r) => setTimeout(r, 30))

    fireEvent.click(screen.getByText('确定'))

    const useBtn = await screen.findByRole(
      'button',
      { name: /设为我的头像/ },
      { timeout: 5000 },
    )
    fireEvent.click(useBtn)
    await waitFor(() => expect(screen.getByTestId('profile')).toBeTruthy(), {
      timeout: 3000,
    })

    // me 页面读 localStorage 来立即显示新头像
    const stored = JSON.parse(localStorage.getItem('omnient_profile') ?? '{}')
    expect(stored.avatar).toMatch(/^https?:/)
  }, 10_000)

  it('生成两张后出现翻页按键 1/2 → 2/2，← → 可用', async () => {
    renderAt()
    await new Promise((r) => setTimeout(r, 30))

    // 第一张
    fireEvent.click(screen.getByText('确定'))
    await screen.findByRole('button', { name: /设为我的头像/ }, { timeout: 5000 })

    // 第二张（Continue）
    fireEvent.click(screen.getByText('Continue'))
    await waitFor(() => expect(screen.getByText('2 / 2')).toBeTruthy(), {
      timeout: 5000,
    })

    // 顶层是最新那张 → 翻回第 1 张
    const prevBtn = screen.getByLabelText('上一张')
    const nextBtn = screen.getByLabelText('下一张')
    expect(prevBtn.hasAttribute('disabled')).toBe(false)
    expect(nextBtn.hasAttribute('disabled')).toBe(true)

    fireEvent.click(prevBtn)
    await waitFor(() => expect(screen.getByText('1 / 2')).toBeTruthy())
    expect(screen.getByLabelText('上一张').hasAttribute('disabled')).toBe(true)
    expect(screen.getByLabelText('下一张').hasAttribute('disabled')).toBe(false)
  }, 15_000)
})
