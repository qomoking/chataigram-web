import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useFeed,
  useLikePost,
  useRemixes,
  type Post,
  type Notification,
} from '@chataigram/core'
import CdnImg from '../../components/CdnImg'
import TabBar from '../../components/TabBar'
import PreviewCard from '../../components/PreviewCard'
import UnseenBubble from '../../components/UnseenBubble'
import useUnseenNotifications from '../../hooks/useUnseenNotifications'
import { useSavedPosts } from '../../hooks/useSavedPosts'
import { HeartIcon, BookmarkIcon } from '../../components/icons'
import './ImmersiveFeedPage.css'

const SWIPE_THRESHOLD = 40

/**
 * 沉浸式 feed —— 一条帖子占满屏。
 *
 * - 纵向 swipe / wheel / ArrowDown/Up：切换主 feed 里的下一条
 * - 横向 swipe / ArrowLeft/Right：切换当前帖的 remix 子树（parentId → 回到根）
 * - 点赞 / 收藏 / remix 按钮（remix 跳 /create?ref=）
 */
export default function ImmersiveFeedPage() {
  const { data, isLoading, error } = useFeed({ limit: 30 })
  const like = useLikePost()
  const { isSaved, toggle: toggleSave } = useSavedPosts()
  const { unseenList, dismissAll } = useUnseenNotifications()
  const navigate = useNavigate()

  const [activeIdx, setActiveIdx] = useState(0)
  const [remixIdx, setRemixIdx] = useState(0) // 0 = 根帖；>0 = 第 N 个 remix
  const [preview, setPreview] = useState<Notification | null>(null)
  const startY = useRef<number | null>(null)
  const startX = useRef<number | null>(null)

  const posts: Post[] = data?.posts ?? []
  const rootPost = posts[activeIdx] ?? null
  const { data: remixes } = useRemixes(rootPost?.id ?? null)

  // 当前实际展示的帖子（根 or 某个 remix）
  const visiblePost = useMemo<Post | null>(() => {
    if (!rootPost) return null
    if (remixIdx === 0) return rootPost
    const r = (remixes ?? [])[remixIdx - 1]
    return r ?? rootPost
  }, [rootPost, remixIdx, remixes])

  const remixTotal = 1 + (remixes?.length ?? 0) // 根 + N remixes

  const swipeUp = useCallback(() => {
    setActiveIdx((i) => Math.min(i + 1, Math.max(posts.length - 1, 0)))
    setRemixIdx(0)
  }, [posts.length])
  const swipeDown = useCallback(() => {
    setActiveIdx((i) => Math.max(i - 1, 0))
    setRemixIdx(0)
  }, [])
  const swipeLeft = useCallback(() => {
    // 向左：看下一个 remix
    setRemixIdx((i) => Math.min(i + 1, remixTotal - 1))
  }, [remixTotal])
  const swipeRight = useCallback(() => {
    setRemixIdx((i) => Math.max(i - 1, 0))
  }, [])

  // 键盘（桌面测试友好）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') swipeDown()
      else if (e.key === 'ArrowDown' || e.key === ' ') swipeUp()
      else if (e.key === 'ArrowLeft') swipeRight()
      else if (e.key === 'ArrowRight') swipeLeft()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [swipeUp, swipeDown, swipeLeft, swipeRight])

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0]?.clientY ?? null
    startX.current = e.touches[0]?.clientX ?? null
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const endY = e.changedTouches[0]?.clientY
    const endX = e.changedTouches[0]?.clientX
    if (startY.current == null || startX.current == null || endY == null || endX == null) {
      startY.current = startX.current = null
      return
    }
    const dy = endY - startY.current
    const dx = endX - startX.current
    startY.current = startX.current = null

    // 以主轴方向判断纵向 vs 横向
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) < SWIPE_THRESHOLD) return
      if (dx < 0) swipeLeft()
      else swipeRight()
    } else {
      if (Math.abs(dy) < SWIPE_THRESHOLD) return
      if (dy < 0) swipeUp()
      else swipeDown()
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 20) return
    if (e.deltaY > 0) swipeUp()
    else swipeDown()
  }

  const handleLike = () => {
    if (!visiblePost) return
    like.mutate(visiblePost.id)
  }

  const handleNewPost = () => navigate('/create')

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
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>{String(error)}</div>
        </div>
        <TabBar onCamera={handleNewPost} />
      </div>
    )
  }
  if (!visiblePost) {
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

  const saved = isSaved(visiblePost.id)
  const isRemixView = remixIdx > 0

  return (
    <div
      className="imf-page"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* 主图 */}
      <div className="imf-image-wrap" key={`${visiblePost.id}-${remixIdx}`}>
        {visiblePost.photoUrl ? (
          <CdnImg
            src={visiblePost.photoUrl}
            alt={visiblePost.content ?? ''}
            className="imf-image"
          />
        ) : (
          <div className="imf-image-placeholder">无图</div>
        )}

        {/* 顶部 remix 面包屑 */}
        {(remixTotal > 1 || isRemixView) && (
          <div className="imf-remix-crumb">
            {isRemixView ? (
              <>
                <span className="imf-remix-label">REMIX · {remixIdx}/{remixTotal - 1}</span>
                <button
                  type="button"
                  className="imf-crumb-back"
                  onClick={swipeRight}
                  aria-label="back to root"
                >
                  ← 回到原帖
                </button>
              </>
            ) : (
              rootPost?.hasRemixes && (
                <span className="imf-remix-hint">
                  → 右滑看 {remixTotal - 1} 条 remix
                </span>
              )
            )}
          </div>
        )}

        {/* 底部浮层：作者 + 文案 */}
        <div className="imf-gradient-bottom" />
        <div className="imf-overlay-bottom">
          <div className="imf-author">
            <div
              className="imf-author-dot"
              style={{ background: pickColor(visiblePost.authorId) }}
            >
              {String(visiblePost.authorId).slice(-1)}
            </div>
            <span>user-{visiblePost.authorId}</span>
          </div>
          {visiblePost.content && <p className="imf-content">{visiblePost.content}</p>}
          {visiblePost.optional && (
            <p className="imf-prompt">"{visiblePost.optional}"</p>
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
            <span>{visiblePost.likeCount}</span>
          </button>
          <button
            type="button"
            className={`imf-action-btn ${saved ? 'active' : ''}`}
            onClick={() => toggleSave(visiblePost.id)}
            aria-label="save"
          >
            <BookmarkIcon size={24} filled={saved} />
          </button>
          <button
            type="button"
            className="imf-action-btn"
            onClick={() => navigate(`/create?ref=${visiblePost.id}`)}
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
            return <div key={abs} className={`imf-dot${isActive ? ' active' : ''}`} />
          })}
      </div>

      {/* 底部横向 remix 指示器 */}
      {remixTotal > 1 && (
        <div className="imf-remix-dots">
          {Array.from({ length: remixTotal }).map((_, i) => (
            <div
              key={i}
              className={`imf-remix-dot${i === remixIdx ? ' active' : ''}`}
            />
          ))}
        </div>
      )}

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
