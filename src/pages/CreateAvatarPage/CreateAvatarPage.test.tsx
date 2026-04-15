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

  it('renders 6 style chips + 确定/Continue 按键', () => {
    renderAt()
    expect(screen.getByText('3D')).toBeTruthy()
    expect(screen.getByText('动漫')).toBeTruthy()
    expect(screen.getByText('赛博')).toBeTruthy()
    expect(screen.getByText('油画')).toBeTruthy()
    expect(screen.getByText('水彩')).toBeTruthy()
    expect(screen.getByText('像素')).toBeTruthy()
    expect(screen.getByText('确定')).toBeTruthy()
    expect(screen.getByText('Continue')).toBeTruthy()
  })

  it('Continue 在没生成过结果时禁用', () => {
    renderAt()
    expect(screen.getByText('Continue').hasAttribute('disabled')).toBe(true)
  })

  it('选 chip + 确定 → SSE 出图 → 气泡里选用这张 → /profile', async () => {
    renderAt()
    await new Promise((r) => setTimeout(r, 30))

    fireEvent.click(screen.getByText('3D'))
    fireEvent.click(screen.getByText('确定'))

    // 等 SSE 跑完，结果气泡出现"用这张"按键
    const useBtn = await screen.findByRole('button', { name: /用这张/ }, { timeout: 5000 })
    expect(screen.getByRole('button', { name: '再改改' })).toBeTruthy()

    fireEvent.click(useBtn)
    await waitFor(() => expect(screen.getByTestId('profile')).toBeTruthy(), {
      timeout: 3000,
    })
  }, 10_000)

  it('再改改 → 隐藏该气泡的选择，但保留图，Continue 仍可用', async () => {
    renderAt()
    await new Promise((r) => setTimeout(r, 30))

    fireEvent.click(screen.getByText('动漫'))
    fireEvent.click(screen.getByText('确定'))
    await waitFor(() => expect(screen.getByText('再改改')).toBeTruthy(), {
      timeout: 5000,
    })

    fireEvent.click(screen.getByText('再改改'))
    expect(screen.queryByText('再改改')).toBeNull()
    expect(screen.queryByText(/用这张/)).toBeNull()
    expect(screen.getByText('Continue').hasAttribute('disabled')).toBe(false)
  })
})
