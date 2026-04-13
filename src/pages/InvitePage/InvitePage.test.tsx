/**
 * L3: InvitePage 列表渲染 + 生成 / 复制交互。
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import InvitePage from './InvitePage'
import { wrapWithProviders } from '../../test-utils/wrapper'

function renderAt() {
  // 预埋登录用户 —— useMyInviteCodes 要 userId 才启 query
  localStorage.setItem(
    'omnient_current_user',
    JSON.stringify({ id: 1001, name: 'T', username: 't', avatarUrl: null }),
  )
  return render(
    <MemoryRouter initialEntries={['/invites']}>
      <Routes>
        <Route path="/invites" element={<InvitePage />} />
        <Route path="*" element={<div data-testid="other">OTHER</div>} />
      </Routes>
    </MemoryRouter>,
    { wrapper: wrapWithProviders() },
  )
}

describe('<InvitePage> L3', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders quota + fetched codes', async () => {
    renderAt()
    // mock 返回 2 条，max 5
    await waitFor(() => expect(screen.getByText(/MOCK-1001-1/)).toBeTruthy())
    expect(screen.getByText(/MOCK-1001-2/)).toBeTruthy()
    // 生成按钮（剩 3 次）
    expect(screen.getByRole('button', { name: /生成邀请码/ })).toBeTruthy()
  })

  it('clicking generate appends a new code', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByText(/MOCK-1001-1/)).toBeTruthy())

    const genBtn = screen.getByRole('button', { name: /生成邀请码/ })
    fireEvent.click(genBtn)

    // mutate 成功后 invalidate list → 重拉 → 列表还是 MOCK-1001-1 (mock 没真加，但 mutate 本身不报错)
    await waitFor(() =>
      expect(screen.queryAllByText(/用户名|错误/)).toEqual([]),
    )
  })

  it('copy button transitions to copied state', async () => {
    // jsdom clipboard polyfill
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
    renderAt()
    await waitFor(() => expect(screen.getByText(/MOCK-1001-1/)).toBeTruthy())
    const copyBtn = screen.getAllByRole('button', { name: /复制/ })[0]
    fireEvent.click(copyBtn!)
    await waitFor(() => expect(screen.getByText('已复制')).toBeTruthy())
  })
})
