/**
 * L3: LoginPage 三种模式的关键路径。
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LoginPage from './LoginPage'
import { server } from '../../test-utils/msw-node'
import { wrapWithProviders } from '../../test-utils/wrapper'

// ProtectedRoute 的简化版，拿来跑登录后跳转验证
function renderAt(path = '/login') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div data-testid="home">HOME</div>} />
      </Routes>
    </MemoryRouter>,
    { wrapper: wrapWithProviders() },
  )
}

describe('<LoginPage> L3', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders preset user cards in cards mode', async () => {
    renderAt()
    expect(screen.getByText('选择账号')).toBeTruthy()
    expect(screen.getByText('GhostPixel')).toBeTruthy()
    expect(screen.getByText('Jenny')).toBeTruthy()
    expect(screen.getByText('AIgram')).toBeTruthy()
    expect(screen.getByText('King X')).toBeTruthy()
  })

  it('clicking a user card reveals password input', () => {
    renderAt()
    const card = screen.getByText('Jenny').closest('button')!
    fireEvent.click(card)
    expect(screen.getByPlaceholderText('密码')).toBeTruthy()
  })

  it('successful card login navigates to home', async () => {
    renderAt()
    fireEvent.click(screen.getByText('GhostPixel').closest('button')!)

    const pw = screen.getByPlaceholderText('密码') as HTMLInputElement
    fireEvent.change(pw, { target: { value: 'any-password' } })

    // 登录按钮变 active
    const loginBtn = screen.getByRole('button', { name: '登录' })
    fireEvent.click(loginBtn)

    await waitFor(() => expect(screen.getByTestId('home')).toBeTruthy())
    // 登录成功后 localStorage 应该有用户
    expect(localStorage.getItem('omnient_current_user')).not.toBeNull()
  })

  it('failed login shows "密码错误"', async () => {
    server.use(
      http.post('/api/login', () =>
        HttpResponse.json({ ret_code: 401, error: 'wrong password' }),
      ),
    )
    renderAt()
    fireEvent.click(screen.getByText('GhostPixel').closest('button')!)
    fireEvent.change(screen.getByPlaceholderText('密码'), {
      target: { value: 'nope' },
    })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => expect(screen.getByText('密码错误')).toBeTruthy())
    // 没跳转
    expect(screen.queryByTestId('home')).toBeNull()
    expect(localStorage.getItem('omnient_current_user')).toBeNull()
  })

  it('toggles to username mode and back', () => {
    renderAt()
    fireEvent.click(screen.getByText('用户名登录 →'))
    // 进入 username 模式的特征：出现 @用户名 input
    expect(screen.getByPlaceholderText('@用户名')).toBeTruthy()
    expect(screen.queryByText('选择账号')).toBeNull()

    fireEvent.click(screen.getByText('返回账号选择'))
    expect(screen.getByText('选择账号')).toBeTruthy()
    expect(screen.queryByPlaceholderText('@用户名')).toBeNull()
  })

  it('username mode login works', async () => {
    renderAt()
    fireEvent.click(screen.getByText('用户名登录 →'))

    fireEvent.change(screen.getByPlaceholderText('@用户名'), {
      target: { value: 'alice' },
    })
    fireEvent.change(screen.getByPlaceholderText('密码'), {
      target: { value: 'pw' },
    })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => expect(screen.getByTestId('home')).toBeTruthy())
  })

  it('already-logged-in users are redirected to home', async () => {
    // Seed storage with a user
    localStorage.setItem(
      'omnient_current_user',
      JSON.stringify({ id: 1, name: 'Seeded', username: 'seed', avatarUrl: null }),
    )
    renderAt()
    await waitFor(() => expect(screen.getByTestId('home')).toBeTruthy())
  })

  it('opens register sheet via invite code arrow', () => {
    renderAt()
    const inviteInput = screen.getByPlaceholderText('邀请码')
    fireEvent.change(inviteInput, { target: { value: 'INVITE123' } })
    const arrow = screen.getByRole('button', { name: '继续注册' })
    fireEvent.click(arrow)

    // Sheet 里有"创建账号"按钮
    expect(screen.getByText('创建账号')).toBeTruthy()
  })
})
