/**
 * L3: ProfilePage（Me tab 入口页）。
 * Plaza / Inbox 已上移到 Shell 层 TabBar，此页只剩 Works + Invites。
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProfilePage from './ProfilePage'
import { wrapWithProviders } from '../../test-utils/wrapper'

function renderAt() {
  localStorage.setItem(
    'omnient_current_user',
    JSON.stringify({ id: 1, name: 'Test', username: 'test', avatarUrl: null }),
  )
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/login" element={<div data-testid="login-page">LOGIN</div>} />
        <Route path="/works" element={<div data-testid="works">WORKS</div>} />
      </Routes>
    </MemoryRouter>,
    { wrapper: wrapWithProviders() },
  )
}

describe('<ProfilePage> L3', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders remaining entries (works + invites)', () => {
    renderAt()
    expect(screen.getByText('🎨')).toBeTruthy()
    expect(screen.getByText('🎟️')).toBeTruthy()
    // plaza / inbox 已移除
    expect(screen.queryByText('💬')).toBeNull()
    expect(screen.queryByText('🌐')).toBeNull()
  })

  it('clicking works entry navigates to /works', async () => {
    renderAt()
    const entry = screen.getByText('🎨').closest('button')!
    fireEvent.click(entry)
    await waitFor(() => expect(screen.getByTestId('works')).toBeTruthy())
  })

  it('switch account logs out and navigates to /login', async () => {
    renderAt()
    const btn = screen.getByText('切换账户')
    fireEvent.click(btn)
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeTruthy())
    expect(localStorage.getItem('omnient_current_user')).toBeNull()
  })
})
