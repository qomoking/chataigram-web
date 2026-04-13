/**
 * L3: FeedPage 整页渲染 + 真 HTTP 路径（MSW 拦截）+ 用户交互。
 *
 * 覆盖：
 *   • 空/加载/错误/有数据 四态
 *   • 点赞按钮触发 optimistic update，count 立即 +1
 *   • 收藏按钮写 localStorage，persisted 跨 render
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import FeedPage from './FeedPage'
import { server } from '../../test-utils/msw-node'
import { wrapWithProviders } from '../../test-utils/wrapper'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/feed']}>
      <FeedPage />
    </MemoryRouter>,
    { wrapper: wrapWithProviders() },
  )
}

describe('<FeedPage> L3', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('shows loading then renders posts from MSW', async () => {
    renderPage()
    expect(screen.getByText(/loading/i)).toBeTruthy()

    // 默认 handlers 里有 4 条假帖；看到作者名就算渲染了
    await screen.findByText(/赛博朋克风的猫/)
    expect(screen.getByText(/吉卜力风格的森林小屋/)).toBeTruthy()
  })

  it('shows empty state when server returns 0 posts', async () => {
    server.use(
      http.get('/api/feed', () =>
        HttpResponse.json({ ret_code: 200, posts: [], next_offset: null }),
      ),
    )
    renderPage()
    await waitFor(() => expect(screen.getByText(/暂无帖子/)).toBeTruthy())
  })

  it('shows error state when server fails', async () => {
    server.use(http.get('/api/feed', () => HttpResponse.error()))
    renderPage()
    // `HttpResponse.error()` triggers a generic network error; text is environment-dependent
    // —— 验证：不在 loading，无 post 渲染，有 error 文本
    await waitFor(() => {
      expect(screen.queryByText(/赛博朋克/)).toBeNull()
      expect(screen.queryByText(/loading/i)).toBeNull()
      expect(screen.queryByText(/failed|error|fetch/i)).toBeTruthy()
    })
  })

  it('clicking the like overlay optimistically bumps the count', async () => {
    renderPage()

    // 找第一条帖子的 card
    const firstPost = await screen.findByText(/赛博朋克风的猫/)
    const card = firstPost.closest('article')
    expect(card).not.toBeNull()
    // 初始 like_num = 42
    expect(within(card!).getByText('42')).toBeTruthy()

    // 点 card 里的 like 按钮（有两个：overlay + action-row；都触发 mutate）
    const [overlayBtn] = within(card!).getAllByLabelText('like')
    overlayBtn!.click()

    // 乐观更新立即生效
    await waitFor(() => expect(within(card!).getByText('43')).toBeTruthy())
  })

  it('save button persists to localStorage and survives re-render', async () => {
    const { unmount } = renderPage()
    const firstPost = await screen.findByText(/赛博朋克风的猫/)
    const card = firstPost.closest('article')!
    const buttons = within(card).getAllByRole('button')
    // action-row 里的第二个按钮是 bookmark（顺序：like overlay, like count, bookmark）
    const bookmarkBtn = buttons[buttons.length - 1]!
    bookmarkBtn.click()

    // 本地应该持久化了
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('chataigram:saved-posts') ?? '[]')
      expect(saved).toContain(101) // 第一条假帖 id
    })

    unmount()

    // 重新 render：bookmark 状态应该回来
    renderPage()
    const refetched = await screen.findByText(/赛博朋克风的猫/)
    const newCard = refetched.closest('article')!
    const newBtns = within(newCard).getAllByRole('button')
    const newBookmark = newBtns[newBtns.length - 1]!
    // styles.saved 类应该在（通过 class 判断）
    expect(newBookmark.className).toMatch(/saved/)
  })
})
