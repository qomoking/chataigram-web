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

  it('renders 6 style chips + send button', () => {
    renderAt()
    expect(screen.getByText('3D')).toBeTruthy()
    expect(screen.getByText('动漫')).toBeTruthy()
    expect(screen.getByText('赛博')).toBeTruthy()
    expect(screen.getByText('油画')).toBeTruthy()
    expect(screen.getByText('水彩')).toBeTruthy()
    expect(screen.getByText('像素')).toBeTruthy()
    expect(screen.getByLabelText('send')).toBeTruthy()
  })

  it('select chip + send generates + suggestions appear, then use as avatar → /profile', async () => {
    renderAt()
    await new Promise((r) => setTimeout(r, 30))

    fireEvent.click(screen.getByText('3D'))
    fireEvent.click(screen.getByLabelText('send'))

    // 生成完成后显示建议 chips
    await waitFor(
      () => {
        // MSW /api/suggestion 返回 '太空版' '水彩风'
        expect(screen.getByText('太空版')).toBeTruthy()
      },
      { timeout: 5000 },
    )

    // 点"用作头像" → navigate /profile
    await waitFor(() => expect(screen.getByText(/用作头像/)).toBeTruthy())
    fireEvent.click(screen.getByText(/用作头像/))
    await waitFor(() => expect(screen.getByTestId('profile')).toBeTruthy())
  })
})
