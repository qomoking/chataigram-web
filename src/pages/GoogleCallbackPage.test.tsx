/**
 * L3: GoogleCallback 页解析 query → 写 user → 跳首页；缺参 → 跳 /login。
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import GoogleCallbackPage from './GoogleCallbackPage'
import { wrapWithProviders } from '../test-utils/wrapper'

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/callback${search}`]}>
      <Routes>
        <Route path="/auth/callback" element={<GoogleCallbackPage />} />
        <Route path="/" element={<div data-testid="home">HOME</div>} />
        <Route path="/login" element={<div data-testid="login-page">LOGIN</div>} />
      </Routes>
    </MemoryRouter>,
    { wrapper: wrapWithProviders() },
  )
}

describe('<GoogleCallbackPage> L3', () => {
  beforeEach(() => {
    localStorage.clear()
    // jsdom: reset window.location.search per test
    window.history.replaceState({}, '', '/')
  })
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('with valid params: stores user and navigates to /', async () => {
    window.history.replaceState({}, '', '/auth/callback?user_id=42&name=Alice&username=alice')
    renderAt('?user_id=42&name=Alice&username=alice')

    await waitFor(() => expect(screen.getByTestId('home')).toBeTruthy())
    const stored = JSON.parse(localStorage.getItem('omnient_current_user')!)
    expect(stored).toEqual({
      id: 42,
      name: 'Alice',
      username: 'alice',
      avatarUrl: null,
    })
  })

  it('without params: navigates to /login?error=oauth', async () => {
    window.history.replaceState({}, '', '/auth/callback')
    renderAt('')
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeTruthy())
    expect(localStorage.getItem('omnient_current_user')).toBeNull()
  })
})
