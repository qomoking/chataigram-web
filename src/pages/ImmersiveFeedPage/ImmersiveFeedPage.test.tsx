/**
 * L3: ImmersiveFeedPage。
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ImmersiveFeedPage from './ImmersiveFeedPage'
import { wrapWithProviders } from '../../test-utils/wrapper'

function renderAt() {
  localStorage.setItem(
    'omnient_current_user',
    JSON.stringify({ id: 1, name: 'T', username: 't', avatarUrl: null }),
  )
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ImmersiveFeedPage />} />
        <Route path="/create" element={<div data-testid="create">CREATE</div>} />
      </Routes>
    </MemoryRouter>,
    { wrapper: wrapWithProviders() },
  )
}

describe('<ImmersiveFeedPage> L3', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders first post from MSW', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByText(/赛博朋克风的猫/)).toBeTruthy())
    // 右侧 3 个 action 按钮
    expect(screen.getByLabelText('like')).toBeTruthy()
    expect(screen.getByLabelText('save')).toBeTruthy()
    expect(screen.getByLabelText('remix')).toBeTruthy()
  })

  it('ArrowDown keyboard advances to next post', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByText(/赛博朋克风的猫/)).toBeTruthy())
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    await waitFor(() => expect(screen.getByText(/吉卜力风格的森林小屋/)).toBeTruthy())
  })

  it('like click bumps like count (42 → 43)', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByText(/赛博朋克风的猫/)).toBeTruthy())
    const likeBtn = screen.getByLabelText('like')
    // 初始 42
    expect(likeBtn.textContent).toContain('42')
    fireEvent.click(likeBtn)
    await waitFor(() => expect(likeBtn.textContent).toContain('43'))
  })
})
