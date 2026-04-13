/**
 * L3: ProfilePage（Me tab 入口页）。
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
        <Route path="/inbox" element={<div data-testid="inbox">INBOX</div>} />
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

  it('renders entries + badge with unread count', async () => {
    renderAt()
    // 4 个入口 emoji
    expect(screen.getByText('💬')).toBeTruthy()
    expect(screen.getByText('🎨')).toBeTruthy()
    expect(screen.getByText('🌐')).toBeTruthy()
    expect(screen.getByText('🎟️')).toBeTruthy()
    // unread badge = 2 （mock 返回 count=2）
    await waitFor(() => expect(screen.getByText('2')).toBeTruthy())
  })

  it('clicking inbox entry navigates to /inbox', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByText('💬')).toBeTruthy())
    // 找 inbox 入口
    const inboxEntry = screen.getByText('💬').closest('button')!
    fireEvent.click(inboxEntry)
    await waitFor(() => expect(screen.getByTestId('inbox')).toBeTruthy())
  })

  it('switch account logs out and navigates to /login', async () => {
    renderAt()
    const btn = screen.getByText('切换账户')
    fireEvent.click(btn)
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeTruthy())
    expect(localStorage.getItem('omnient_current_user')).toBeNull()
  })
})
