/**
 * L3: WorksPage（作品集）。
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import WorksPage from './WorksPage'
import { wrapWithProviders } from '../../test-utils/wrapper'

function renderAt() {
  localStorage.setItem(
    'omnient_current_user',
    JSON.stringify({ id: 7, name: 'T', username: 't', avatarUrl: null }),
  )
  return render(
    <MemoryRouter initialEntries={['/works']}>
      <Routes>
        <Route path="/works" element={<WorksPage />} />
      </Routes>
    </MemoryRouter>,
    { wrapper: wrapWithProviders() },
  )
}

describe('<WorksPage> L3', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders tabs + published items on mount', async () => {
    renderAt()
    // mock /api/user-posts 返回 3 条 for telegram_id=7
    // masonry thumbs render as img.works-thumb
    await waitFor(() =>
      expect(document.querySelectorAll('img.works-thumb').length).toBeGreaterThan(0),
    )
    // 两个 tab 按钮都在
    expect(screen.getByText(/已发布/)).toBeTruthy()
    expect(screen.getByText(/草稿/)).toBeTruthy()
  })

  it('switches to drafts tab', async () => {
    renderAt()
    await waitFor(() =>
      expect(document.querySelectorAll('img.works-thumb').length).toBeGreaterThan(0),
    )
    const draftTab = screen.getByText(/草稿/)
    fireEvent.click(draftTab)
    // 重新拉 → 再次出现 thumbs（mock 对任何 status 都返回 3 条）
    await waitFor(() =>
      expect(document.querySelectorAll('img.works-thumb').length).toBeGreaterThan(0),
    )
  })
})
