/**
 * L3: InboxPage 列表渲染 + 点击打开 PreviewCard。
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import InboxPage from './InboxPage'
import { wrapWithProviders } from '../../test-utils/wrapper'

function renderAt() {
  return render(
    <MemoryRouter initialEntries={['/inbox']}>
      <Routes>
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="*" element={<div>OTHER</div>} />
      </Routes>
    </MemoryRouter>,
    { wrapper: wrapWithProviders() },
  )
}

describe('<InboxPage> L3', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders 3 seed notifications from MSW', async () => {
    renderAt()
    // mock 3 条：Alice like / Bob remix / Carol comment
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())
    expect(screen.getByText('Bob')).toBeTruthy()
    expect(screen.getByText('Carol')).toBeTruthy()
  })

  it('clicking a notification opens PreviewCard', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())

    // 找到 Alice 的 inbox-item 并点击
    const aliceRow = screen.getByText('Alice').closest('button')
    expect(aliceRow).not.toBeNull()
    fireEvent.click(aliceRow!)

    // PreviewCard 有"关闭"按钮
    await waitFor(() => expect(screen.getByText('关闭')).toBeTruthy())
  })
})
