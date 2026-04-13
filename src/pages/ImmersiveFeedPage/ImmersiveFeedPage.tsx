import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useFeed,
  useLikePost,
  type Post,
} from '@chataigram/core'
import CdnImg from '../../components/CdnImg'
import TabBar from '../../components/TabBar'
import PreviewCard from '../../components/PreviewCard'
import UnseenBubble from '../../components/UnseenBubble'
import useUnseenNotifications from '../../hooks/useUnseenNotifications'
import { useSavedPosts } from '../../hooks/useSavedPosts'
import { HeartIcon, BookmarkIcon } from '../../components/icons'
import type { Notification } from '@chataigram/core'
import './ImmersiveFeedPage.css'

const SWIPE_THRESHOLD = 40

/**
 * 沉浸式 feed —— 一条帖子占满屏，纵向滑动切换。
 *
 * 简化版自 frontend/ImmersiveFeedPage.jsx（1808 行 → ~280 行）。
 * 对齐的：纵向 swipe / 全屏图 / 点赞乐观更新 / 收藏 / UnseenBubble / TabBar
 * 未对齐（TODO）：
 *   - 横向 swipe 看 remix 子树
 *   - 双击 prank suggestions
 *   - 语音 remix
 *   - 评论输入
 */
export default function ImmersiveFeedPage() {
  const { data, isLoading, error } = useFeed({ limit: 30 })
  const like = useLikePost()
  const { isSaved, toggle: toggleSave } = useSavedPosts()
  const { unseenList, dismissAll } = useUnseenNotifications()
  const navigate = useNavigate()
  const [activeIdx, setActiveIdx] = useState(0)
  const [preview, setPreview] = useState<Notification | null>(null)
  const startY = useRef<number | null>(null)

  const posts: Post[] = data?.posts ?? []
  const activePost = posts[activeIdx] ?? null

  const swipeUp = useCallback(() => {
    setActiveIdx((i) => Math.min(i + 1, Math.max(posts.length - 1, 0)))
  }, [posts.length])
  const swipeDown = useCallback(() => {
    setActiveIdx((i) => Math.max(i - 1, 0))
  }, [])

  // 键盘方向键也切（桌面测试友好）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') swipeDown()
      if (e.key === 'ArrowDown' || e.key === ' ') swipeUp()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [swipeUp, swipeDown])

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0]?.clientY ?? null
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startY.current == null) return
    const end = e.changedTouches[0]?.clientY
    if (end == null) return
    const dy = end - startY.current
    startY.current = null
    if (Math.abs(dy) < SWIPE_THRESHOLD) return
    if (dy < 0) swipeUp()
    else swipeDown()
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 20) return
    if (e.deltaY > 0) swipeUp()
    else swipeDown()
  }

  const handleLike = () => {
    if (!activePost) return
    like.mutate(activePost.id)
  }

  const handleNewPost = () => {
    navigate('/create')
  }

  if (isLoading) {
    return (
      <div className="imf-page">
        <div className="imf-loading">Loading…</div>
        <TabBar onCamera={handleNewPost} />
      </div>
    )
  }
  if (error) {
    return (
      <div className="imf-page">
        <div className="imf-empty">
          <div>加载失败</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
            {String(error)}
          </div>
        </div>
        <TabBar onCamera={handleNewPost} />
      </div>
    )
  }
  if (!activePost) {
    return (
      <div className="imf-page">
        <div className="imf-empty">
          <div className="imf-empty-icon">✦</div>
          <p>暂无帖子，去创建一个吧</p>
        </div>
        <TabBar onCamera={handleNewPost} />
      </div>
    )
  }

  const saved = isSaved(activePost.id)

  return (
    <div
      className="imf-page"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* 主图 */}
      <div className="imf-image-wrap" key={activePost.id}>
        {activePost.photoUrl ? (
          <CdnImg
            src={activePost.photoUrl}
            alt={activePost.content ?? ''}
            className="imf-image"
          />
        ) : (
          <div className="imf-image-placeholder">无图</div>
        )}

        {/* 底部浮层：作者 + 文案 */}
        <div className="imf-gradient-bottom" />
        <div className="imf-overlay-bottom">
          <div className="imf-author">
            <div
              className="imf-author-dot"
              style={{ background: pickColor(activePost.authorId) }}
            >
              {String(activePost.authorId).slice(-1)}
            </div>
            <span>user-{activePost.authorId}</span>
          </div>
          {activePost.content && <p className="imf-content">{activePost.content}</p>}
          {activePost.optional && (
            <p className="imf-prompt">"{activePost.optional}"</p>
          )}
        </div>

        {/* 右侧交互按钮 */}
        <div className="imf-actions">
          <button
            type="button"
            className="imf-action-btn"
            onClick={handleLike}
            aria-label="like"
          >
            <HeartIcon size={26} />
            <span>{activePost.likeCount}</span>
          </button>
          <button
            type="button"
            className={`imf-action-btn ${saved ? 'active' : ''}`}
            onClick={() => toggleSave(activePost.id)}
            aria-label="save"
          >
            <BookmarkIcon size={24} filled={saved} />
          </button>
          <button
            type="button"
            className="imf-action-btn"
            onClick={() => navigate(`/create?ref=${activePost.id}`)}
            aria-label="remix"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* 右上索引指示器 */}
      <div className="imf-pagination">
        {posts
          .slice(Math.max(0, activeIdx - 2), activeIdx + 3)
          .map((_, rel) => {
            const abs = Math.max(0, activeIdx - 2) + rel
            const isActive = abs === activeIdx
            return (
              <div
                key={abs}
                className={`imf-dot${isActive ? ' active' : ''}`}
              />
            )
          })}
      </div>

      {unseenList.length > 0 && (
        <UnseenBubble
          notifications={unseenList}
          onDismiss={dismissAll}
          onOpenPreview={(n) => setPreview(n)}
        />
      )}

      {preview && <PreviewCard notification={preview} onClose={() => setPreview(null)} />}

      <TabBar onCamera={handleNewPost} />
    </div>
  )
}

function pickColor(seed: number): string {
  const palette = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']
  return palette[Math.abs(seed) % palette.length] ?? palette[0]!
}
