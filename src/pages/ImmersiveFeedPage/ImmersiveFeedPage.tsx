import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  useCommentPost,
  useFeed,
  useLikePost,
  usePrankSuggestions,
  useRemixes,
  useRemixPost,
  useUserInfo,
  segmentAndSuggestStream,
  type Post,
  type Notification,
  type SuggestionItem,
  type SegmentPromptItem,
} from '@chataigram/core'
import CdnImg from '../../components/CdnImg'
import TabBar from '../../components/TabBar'
import PreviewCard from '../../components/PreviewCard'
import UnseenBubble from '../../components/UnseenBubble'
import VoiceRemixButton from '../../components/VoiceRemixButton'
import TapBubble, { type TapBubblePhase } from '../../components/TapBubble'
import useUnseenNotifications from '../../hooks/useUnseenNotifications'
import { t } from '../../utils/i18n'
import { timeAgo } from '../../utils/time'
import './ImmersiveFeedPage.css'

const SWIPE_THRESHOLD = 40
const ABSENCE_THRESHOLD_MS = 30 * 60 * 1000
const FEED_VISIT_TS_KEY = 'omnient_feed_visit_ts'
const FEED_VISIT_DAY_KEY = 'omnient_feed_visit_day'

function decideFeedSortMode(): 'chrono' | 'random' {
  const now = Date.now()
  const today = new Date().toDateString()
  const lastTs = Number(localStorage.getItem(FEED_VISIT_TS_KEY) ?? 0)
  const lastDay = localStorage.getItem(FEED_VISIT_DAY_KEY) ?? ''
  localStorage.setItem(FEED_VISIT_TS_KEY, String(now))
  localStorage.setItem(FEED_VISIT_DAY_KEY, today)
  const isFirstVisitToday = lastDay !== today
  const isLongAbsence = lastTs > 0 && now - lastTs > ABSENCE_THRESHOLD_MS
  return isFirstVisitToday || isLongAbsence ? 'chrono' : 'random'
}

function useDrag({
  onSwipeX,
  onSwipeY,
  onTap,
  threshold = 40,
}: {
  onSwipeX?: (dir: 'left' | 'right') => void
  onSwipeY?: (dir: 'up' | 'down') => void
  onTap?: (x: number, y: number) => void
  threshold?: number
}) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const cbRef = useRef({ onSwipeX, onSwipeY, onTap, threshold })
  cbRef.current = { onSwipeX, onSwipeY, onTap, threshold }

  const process = useCallback((dx: number, dy: number, x: number, y: number) => {
    const { onSwipeX, onSwipeY, onTap, threshold } = cbRef.current
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) >= threshold) onSwipeX?.(dx > 0 ? 'right' : 'left')
      else onTap?.(x, y)
    } else {
      if (Math.abs(dy) >= threshold) onSwipeY?.(dy > 0 ? 'down' : 'up')
      else onTap?.(x, y)
    }
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    start.current = { x: e.clientX, y: e.clientY }
  }, [])
  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (!start.current) return
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y
    start.current = null
    process(dx, dy, e.clientX, e.clientY)
  }, [process])
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    if (!t) return
    start.current = { x: t.clientX, y: t.clientY }
  }, [])
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!start.current) return
    const t = e.changedTouches[0]
    if (!t) return
    const dx = t.clientX - start.current.x
    const dy = t.clientY - start.current.y
    start.current = null
    process(dx, dy, t.clientX, t.clientY)
  }, [process])

  return { onMouseDown, onMouseUp, onTouchStart, onTouchEnd }
}

function viewportToImagePixel(
  imgEl: HTMLImageElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = imgEl.getBoundingClientRect()
  const nW = imgEl.naturalWidth || rect.width
  const nH = imgEl.naturalHeight || rect.height
  const scale = Math.max(rect.width / nW, rect.height / nH)
  const offsetX = (rect.width - nW * scale) / 2
  const offsetY = (rect.height - nH * scale) / 2
  return {
    x: Math.max(0, Math.min(nW - 1, Math.round((clientX - rect.left - offsetX) / scale))),
    y: Math.max(0, Math.min(nH - 1, Math.round((clientY - rect.top - offsetY) / scale))),
  }
}

function getPrankFallback(): SuggestionItem[] {
  return [
    { emoji: '😱', label: t('prank.chaos'),    prompt: '一群小动物突然闯入画面，抢走了主角手中的东西，场面彻底失控', desc: t('prank.chaos_desc') },
    { emoji: '😈', label: t('prank.funny'),    prompt: '主角突然发现自己变成了玩偶大小，周围的一切都变得巨大而荒诞', desc: t('prank.funny_desc') },
    { emoji: '🙈', label: t('prank.surprise'), prompt: '天空中突然掉下一个巨大的蛋糕，正好砸在场景正中央，所有人都愣住了', desc: t('prank.surprise_desc') },
  ]
}

type WandPhase = 'idle' | 'summoning' | 'exiting'

export default function ImmersiveFeedPage() {
  const [sortMode] = useState(decideFeedSortMode)
  const { data, isLoading, error } = useFeed({ limit: 30, sortMode })
  const like = useLikePost()
  const { unseenList, dismissAll } = useUnseenNotifications()


  const [activeIdx, setActiveIdx] = useState(0)
  const [remixIdx, setRemixIdx] = useState(0)
  const [preview, setPreview] = useState<Notification | null>(null)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [prankPanel, setPrankPanel] = useState<SuggestionItem[] | null>(null)
  const [prankLoading, setPrankLoading] = useState(false)
  const [prankLabel, setPrankLabel] = useState('')
  const [prankClickedIdx, setPrankClickedIdx] = useState(-1)

  // 魔法棒动画阶段
  const [wandPhase, setWandPhase] = useState<WandPhase>('idle')
  const [wandOffset, setWandOffset] = useState({ x: 0, y: 0 })

  // TapBubble 状态
  const [bubblePhase, setBubblePhase] = useState<TapBubblePhase>(null)
  const [bubbleLabel, setBubbleLabel] = useState('')
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 })

  const commentInputRef = useRef<HTMLInputElement>(null)
  const activeImgRef = useRef<HTMLImageElement>(null)
  const lastTapPointRef = useRef<{ x: number; y: number } | null>(null)
  const segAbortRef = useRef<AbortController | null>(null)
  const prankLoadingRef = useRef(false)
  const wandRef = useRef<HTMLDivElement>(null)

  const comment = useCommentPost()
  const prank = usePrankSuggestions()
  const remix = useRemixPost()

  const posts: Post[] = data?.posts ?? []
  const rootPost = posts[activeIdx] ?? null
  const { data: remixes } = useRemixes(rootPost?.id ?? null)

  const visiblePost = useMemo<Post | null>(() => {
    if (!rootPost) return null
    if (remixIdx === 0) return rootPost
    const r = (remixes ?? [])[remixIdx - 1]
    return r ?? rootPost
  }, [rootPost, remixIdx, remixes])

  const { data: authorInfo } = useUserInfo(visiblePost?.authorId ?? null)
  const displayName =
    authorInfo?.username || authorInfo?.name || `user_${String(visiblePost?.authorId ?? '').slice(-4)}`
  const avatarUrl = authorInfo?.avatarUrl ?? null
  const avatarInitial = displayName.charAt(0).toUpperCase()

  const remixTotal = 1 + (remixes?.length ?? 0)

  // 切换帖子时重置 tap 状态
  useEffect(() => {
    lastTapPointRef.current = null
    setBubblePhase(null)
    setBubbleLabel('')
    segAbortRef.current?.abort()
    segAbortRef.current = null
    prankLoadingRef.current = false
  }, [activeIdx, remixIdx])

  const swipeUp = useCallback(() => {
    setActiveIdx((i) => Math.min(i + 1, Math.max(posts.length - 1, 0)))
    setRemixIdx(0)
  }, [posts.length])
  const swipeDown = useCallback(() => {
    setActiveIdx((i) => Math.max(i - 1, 0))
    setRemixIdx(0)
  }, [])
  const swipeLeft = useCallback(() => {
    setRemixIdx((i) => Math.min(i + 1, remixTotal - 1))
  }, [remixTotal])
  const swipeRight = useCallback(() => {
    setRemixIdx((i) => Math.max(i - 1, 0))
  }, [])

  const closePrankPanel = useCallback(() => {
    setPrankPanel(null)
    setPrankLoading(false)
    setPrankLabel('')
    setPrankClickedIdx(-1)
    setBubblePhase(null)
    setWandPhase('idle')
    lastTapPointRef.current = null
    segAbortRef.current?.abort()
  }, [])

  // ── 双击：魔法棒动画 + prank 面板（对齐原版 handleDoubleTap）──────────────
  const handleDoubleTap = useCallback(() => {
    // 已展示 prank 面板 → 关闭
    if (prankPanel) {
      closePrankPanel()
      setWandPhase('idle')
      return
    }
    if (prankLoadingRef.current || !visiblePost?.photoUrl) return

    // 计算魔法棒到容器中心的偏移，用于 summoning 动画飞入
    if (wandRef.current) {
      const root = document.getElementById('root')
      if (root) {
        const rr = root.getBoundingClientRect()
        const wr = wandRef.current.getBoundingClientRect()
        setWandOffset({
          x: rr.left + rr.width / 2 - (wr.left + wr.width / 2),
          y: rr.top + rr.height / 2 - (wr.top + wr.height / 2),
        })
      }
    }

    setWandPhase('summoning')
    prankLoadingRef.current = true
    setPrankPanel([])   // show panel immediately (loading state)
    setPrankLoading(true)
    setPrankLabel('')
    setPrankClickedIdx(-1)

    prank.mutate(
      { imageUrl: visiblePost.photoUrl, prompt: visiblePost.optional ?? '' },
      {
        onSuccess: (items) => {
          setPrankPanel(items.length > 0 ? items.slice(0, 3) : getPrankFallback())
          setPrankLoading(false)
        },
        onError: () => {
          setPrankPanel(getPrankFallback())
          setPrankLoading(false)
        },
        onSettled: () => {
          prankLoadingRef.current = false
          setWandPhase('exiting')
          setTimeout(() => setWandPhase('idle'), 550)
        },
      },
    )
  }, [prankPanel, visiblePost, prank, closePrankPanel])

  // ── 单击：SAM 分割 + prompt 建议 ──────────────────────────────────────────
  const handleTap = useCallback(
    async (clientX: number, clientY: number) => {
      if (prankPanel || prankLoadingRef.current || bubblePhase) return

      const imgEl = activeImgRef.current
      if (!imgEl || !visiblePost?.photoUrl) return

      const newPoint = viewportToImagePixel(imgEl, clientX, clientY)
      const prev = lastTapPointRef.current
      const points = prev ? [prev, newPoint] : [newPoint]
      const mode = prev ? 'box' : 'single'
      lastTapPointRef.current = newPoint

      segAbortRef.current?.abort()
      const ac = new AbortController()
      segAbortRef.current = ac

      setBubblePos({ x: clientX, y: clientY })
      setBubbleLabel('')
      setBubblePhase('waiting')
      prankLoadingRef.current = true

      let capturedLabel = ''

      try {
        await segmentAndSuggestStream({
          imageUrl: visiblePost.photoUrl,
          points,
          mode,
          signal: ac.signal,
          onLabel: (lbl: string) => {
            if (ac.signal.aborted) return
            capturedLabel = lbl
            setBubbleLabel(lbl)
            setBubblePhase('label')
          },
          onPrompts: (prompts: SegmentPromptItem[]) => {
            if (ac.signal.aborted) return
            setBubblePhase('done')
            setPrankLabel(capturedLabel)
            setPrankClickedIdx(-1)
            setPrankPanel(
              prompts.map((p) => ({
                emoji: p.icon ?? '✨',
                label: p.text,
                prompt: p.prompt,
                desc: null,
              })),
            )
            prankLoadingRef.current = false
          },
          onError: () => {
            if (ac.signal.aborted) return
            setBubblePhase(null)
            setPrankPanel(getPrankFallback())
            prankLoadingRef.current = false
          },
        })
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        setBubblePhase(null)
        setPrankPanel(getPrankFallback())
        prankLoadingRef.current = false
      }

      if (capturedLabel) {
        setTimeout(() => setBubblePhase(null), 600)
      }
    },
    [prankPanel, bubblePhase, visiblePost],
  )

  const dragHandlers = useDrag({
    onSwipeX: (dir) => (dir === 'left' ? swipeLeft() : swipeRight()),
    onSwipeY: (dir) => (dir === 'up' ? swipeUp() : swipeDown()),
    onTap: handleTap,
    threshold: SWIPE_THRESHOLD,
  })

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

  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 20) return
    if (e.deltaY > 0) swipeUp()
    else swipeDown()
  }

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!visiblePost) return
    like.mutate(visiblePost.id)
  }



  const handleVoiceRemix = useCallback(
    (text: string) => {
      if (!visiblePost) return
      remix.mutate({
        authorId: visiblePost.authorId,
        parentPostId: visiblePost.id,
        instruction: text,
        mode: 'draw-back',
      })
    },
    [visiblePost, remix],
  )

  const handlePrankPick = (item: SuggestionItem, idx: number) => {
    if (!visiblePost || prankClickedIdx >= 0) return
    setPrankClickedIdx(idx)
    remix.mutate(
      {
        authorId: visiblePost.authorId,
        parentPostId: visiblePost.id,
        instruction: item.prompt,
        mode: 'draw-back',
      },
      {
        onSettled: () => {
          closePrankPanel()
        },
      },
    )
  }

  const handleCommentOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCommentOpen(true)
    setTimeout(() => commentInputRef.current?.focus(), 50)
  }

  const handleCommentSend = () => {
    if (!visiblePost || comment.isPending) return
    const text = commentText.trim()
    if (!text) return
    comment.mutate(
      { postId: visiblePost.id, text },
      {
        onSuccess: () => {
          setCommentText('')
          setCommentOpen(false)
        },
      },
    )
  }

  if (isLoading) {
    return (
      <div className="imf-page">
        <div className="imf-loading"><div className="imf-spinner" /></div>
        <TabBar />
      </div>
    )
  }
  if (error) {
    return (
      <div className="imf-page">
        <div className="imf-empty">
          <div>{t('feed.loadError')}</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>{String(error)}</div>
        </div>
        <TabBar />
      </div>
    )
  }
  if (!visiblePost) {
    return (
      <div className="imf-page">
        <div className="imf-empty">
          <div className="imf-empty-icon">✦</div>
          <p>{t('feed.noPostsHint')}</p>
        </div>
        <TabBar />
      </div>
    )
  }

  const isRemixView = remixIdx > 0
  const root = document.getElementById('root')

  return (
    <div
      className="imf-page"
      {...dragHandlers}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleTap}
    >
      {/* 主图区域 */}
      <div className="imf-image-wrap" key={`${visiblePost.id}-${remixIdx}`}>
        {visiblePost.photoUrl ? (
          <CdnImg
            ref={activeImgRef}
            src={visiblePost.photoUrl}
            alt={visiblePost.content ?? ''}
            className="imf-image"
            draggable={false}
          />
        ) : (
          <div className="imf-image-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}

        {/* 顶部渐变 + 用户信息 */}
        <div className="imf-gradient-top" />
        <div className="imf-overlay-top">
          <div className="imf-user-info">
            <span className="imf-username">@{displayName}</span>
            {visiblePost.content && <p className="imf-content">{visiblePost.content}</p>}
          </div>
          <div className="imf-avatar-wrap">
            {avatarUrl ? (
              <CdnImg src={avatarUrl} alt={displayName} className="imf-avatar-img" />
            ) : (
              <div className="imf-avatar-placeholder">
                {!authorInfo ? <div className="imf-avatar-spin" /> : avatarInitial}
              </div>
            )}
          </div>
        </div>

        {/* remix breadcrumb */}
        {(remixTotal > 1 || isRemixView) && (
          <div className="imf-remix-crumb">
            {isRemixView ? (
              <>
                <span className="imf-remix-label">REMIX · {remixIdx}/{remixTotal - 1}</span>
                <button type="button" className="imf-crumb-back"
                  onClick={(e) => { e.stopPropagation(); swipeRight() }}>
                  {t('feed.backToOriginal')}
                </button>
              </>
            ) : (
              rootPost?.hasRemixes && (
                <span className="imf-remix-hint">{t('feed.remixHint', { n: remixTotal - 1 })}</span>
              )
            )}
          </div>
        )}

        {/* 底部渐变 + 互动数据 */}
        <div className="imf-gradient-bottom" />
        <div className="imf-overlay-bottom">
          <div className="imf-stats">
            <span className="imf-stat">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              {visiblePost.relayCount}
            </span>
            <button type="button" className="imf-stat-btn" onClick={handleCommentOpen}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {visiblePost.commentCount >= 1000
                ? `${(visiblePost.commentCount / 1000).toFixed(1)}K`
                : visiblePost.commentCount}
            </button>
            <button type="button" className="imf-stat-btn" aria-label="like" onClick={handleLike}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {visiblePost.likeCount >= 1000
                ? `${(visiblePost.likeCount / 1000).toFixed(1)}K`
                : visiblePost.likeCount}
            </button>
          </div>
          {visiblePost.createdAt && (
            <span className="imf-time">{timeAgo(visiblePost.createdAt)}</span>
          )}
        </div>
      </div>

      {/* TapBubble */}
      <TapBubble phase={bubblePhase} label={bubbleLabel} clientX={bubblePos.x} clientY={bubblePos.y} />

      {/* 垂直分页指示 */}
      <div className="imf-pagination">
        {posts.slice(Math.max(0, activeIdx - 2), activeIdx + 3).map((_, rel) => {
          const abs = Math.max(0, activeIdx - 2) + rel
          return <div key={abs} className={`imf-dot${abs === activeIdx ? ' active' : ''}`} />
        })}
      </div>

      {remixTotal > 1 && (
        <div className="imf-remix-dots">
          {Array.from({ length: remixTotal }).map((_, i) => (
            <div key={i} className={`imf-remix-dot${i === remixIdx ? ' active' : ''}`} />
          ))}
        </div>
      )}

      {unseenList.length > 0 && (
        <UnseenBubble notifications={unseenList} onDismiss={dismissAll} onOpenPreview={(n) => setPreview(n)} />
      )}
      {preview && <PreviewCard notification={preview} onClose={() => setPreview(null)} />}

      {/* ── 语音按钮 —— 固定居中下方，portal 到 #root ── */}
      {root && !prankPanel && !remix.isPending && createPortal(
        <div style={{
          position: 'fixed', bottom: 140, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999,
        }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
          <VoiceRemixButton onRemix={handleVoiceRemix} disabled={remix.isPending} />
        </div>,
        root,
      )}

      {/* ── 魔法棒 —— 固定右下，summoning 时飞向屏幕中心，portal 到 #root ── */}
      {root && (wandPhase !== 'idle' || !prankPanel) && !remix.isPending && createPortal(
        <div
          ref={wandRef}
          style={{
            position: 'fixed',
            right: 16,
            bottom: 140,
            zIndex: 9999,
            pointerEvents: wandPhase === 'idle' ? 'auto' : 'none',
            transition: wandPhase === 'summoning'
              ? 'transform 0.75s cubic-bezier(0.34,1.56,0.64,1)'
              : 'none',
            transform: (wandPhase === 'summoning' || wandPhase === 'exiting')
              ? `translate(${wandOffset.x}px,${wandOffset.y}px)`
              : 'none',
          }}
        >
          <style>{`
            @keyframes wandBreathe {
              0%,100%{filter:drop-shadow(0 0 6px rgba(168,85,247,0.5)) drop-shadow(0 0 20px rgba(168,85,247,0.15));transform:scale(0.95);opacity:0.7;}
              50%{filter:drop-shadow(0 0 22px rgba(200,100,255,1)) drop-shadow(0 0 48px rgba(168,85,247,0.8)) drop-shadow(0 0 8px rgba(255,255,255,1));transform:scale(1.08);opacity:1;}
            }
            @keyframes wandShakeGrow {
              0%{transform:scale(1) rotate(0deg);filter:drop-shadow(0 0 6px rgba(168,85,247,0.5));}
              6%{transform:scale(1.12) rotate(-16deg);filter:drop-shadow(0 0 14px rgba(200,100,255,0.9));}
              13%{transform:scale(1.28) rotate(16deg);filter:drop-shadow(0 0 22px rgba(200,100,255,1));}
              21%{transform:scale(1.42) rotate(-14deg);filter:drop-shadow(0 0 28px rgba(200,100,255,1));}
              30%{transform:scale(1.55) rotate(12deg);filter:drop-shadow(0 0 34px rgba(220,120,255,1));}
              40%{transform:scale(1.65) rotate(-10deg);filter:drop-shadow(0 0 40px rgba(220,120,255,1));}
              52%{transform:scale(1.74) rotate(8deg);filter:drop-shadow(0 0 46px rgba(168,85,247,1));}
              65%{transform:scale(1.82) rotate(-5deg);filter:drop-shadow(0 0 48px rgba(168,85,247,1));}
              78%{transform:scale(1.88) rotate(3deg);filter:drop-shadow(0 0 44px rgba(168,85,247,0.95));}
              90%{transform:scale(1.92) rotate(-1deg);filter:drop-shadow(0 0 40px rgba(168,85,247,0.9));}
              100%{transform:scale(1.95) rotate(0deg);filter:drop-shadow(0 0 38px rgba(168,85,247,0.9));}
            }
            @keyframes wandPulseCenter {
              0%,100%{transform:scale(1.95) rotate(0deg);filter:drop-shadow(0 0 38px rgba(168,85,247,0.9));}
              50%{transform:scale(2.15) rotate(7deg);filter:drop-shadow(0 0 60px rgba(200,100,255,1)) drop-shadow(0 0 24px rgba(255,255,255,0.5));}
            }
            @keyframes wandExit {
              0%{transform:scale(1.95) rotate(0deg);opacity:1;}
              20%{transform:scale(2.2) rotate(-15deg);opacity:0.95;}
              100%{transform:scale(0) rotate(50deg);opacity:0;}
            }
            @keyframes sparkle1{0%,100%{opacity:0;transform:scale(0);}50%{opacity:1;transform:scale(1);}}
            @keyframes sparkle2{0%,100%{opacity:0;transform:scale(0);}40%{opacity:0.8;transform:scale(1.2);}}
            @keyframes sparkle3{0%,100%{opacity:0;transform:scale(0);}60%{opacity:0.9;transform:scale(0.9);}}
            @keyframes burstParticle0{0%{opacity:1;transform:translate(0,0) scale(1);}100%{opacity:0;transform:translate(-28px,-36px) scale(0);}}
            @keyframes burstParticle1{0%{opacity:1;transform:translate(0,0) scale(1);}100%{opacity:0;transform:translate(32px,-30px) scale(0);}}
            @keyframes burstParticle2{0%{opacity:1;transform:translate(0,0) scale(1);}100%{opacity:0;transform:translate(-35px,20px) scale(0);}}
            @keyframes burstParticle3{0%{opacity:1;transform:translate(0,0) scale(1);}100%{opacity:0;transform:translate(30px,28px) scale(0);}}
            @keyframes burstParticle4{0%{opacity:1;transform:translate(0,0) scale(1);}100%{opacity:0;transform:translate(-12px,-42px) scale(0);}}
            @keyframes burstParticle5{0%{opacity:1;transform:translate(0,0) scale(1);}100%{opacity:0;transform:translate(38px,-8px) scale(0);}}
            @keyframes burstParticle6{0%{opacity:1;transform:translate(0,0) scale(1);}100%{opacity:0;transform:translate(-8px,40px) scale(0);}}
            @keyframes burstParticle7{0%{opacity:1;transform:translate(0,0) scale(1);}100%{opacity:0;transform:translate(20px,35px) scale(0);}}
            @keyframes orbitRing{0%{transform:rotate(0deg);opacity:0;}15%{opacity:1;}100%{transform:rotate(720deg);opacity:0;}}
            @keyframes magicRipple{0%{transform:scale(0.5);opacity:0.8;border-width:3px;}100%{transform:scale(3.5);opacity:0;border-width:0.5px;}}
            @keyframes orbitDot{0%{transform:rotate(0deg) translateX(34px) scale(0.6);opacity:0;}10%{opacity:1;}90%{opacity:1;}100%{transform:rotate(360deg) translateX(34px) scale(0.6);opacity:0.8;}}
            @keyframes floatStar0{0%{opacity:0;transform:translate(0,0) scale(0.5);}15%{opacity:1;transform:translate(-4px,-8px) scale(1);}100%{opacity:0;transform:translate(-10px,-48px) scale(0.3);}}
            @keyframes floatStar1{0%{opacity:0;transform:translate(0,0) scale(0.5);}20%{opacity:0.9;transform:translate(6px,-10px) scale(1.1);}100%{opacity:0;transform:translate(14px,-52px) scale(0.2);}}
            @keyframes floatStar2{0%{opacity:0;transform:translate(0,0) scale(0.5);}18%{opacity:1;transform:translate(-2px,-6px) scale(0.9);}100%{opacity:0;transform:translate(-8px,-44px) scale(0.3);}}
            @keyframes floatStar3{0%{opacity:0;transform:translate(0,0) scale(0.5);}12%{opacity:0.8;transform:translate(3px,-5px) scale(1);}100%{opacity:0;transform:translate(10px,-50px) scale(0.2);}}
            @keyframes floatStar4{0%{opacity:0;transform:translate(0,0) scale(0.5);}22%{opacity:1;transform:translate(-6px,-12px) scale(1.2);}100%{opacity:0;transform:translate(-14px,-46px) scale(0.3);}}
            @keyframes magicCircleSpin{0%{transform:rotate(0deg);opacity:0;}20%{opacity:0.7;}100%{transform:rotate(360deg);opacity:0.7;}}
          `}</style>
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); handleDoubleTap() }}
            onClick={(e) => { e.stopPropagation(); handleDoubleTap() }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            style={{
              width: 64, height: 64, border: 'none', borderRadius: 14,
              touchAction: 'none', background: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative',
            }}
          >
            {/* 魔法光波 */}
            {wandPhase === 'summoning' && [0, 1, 2].map(i => (
              <div key={`ripple-${i}`} style={{
                position: 'absolute', top: '50%', left: '50%',
                width: 40, height: 40, marginTop: -20, marginLeft: -20,
                borderRadius: '50%', border: '2px solid rgba(200,100,255,0.7)',
                animation: `magicRipple 0.9s ${i * 0.15}s ease-out forwards`,
                pointerEvents: 'none',
              }} />
            ))}
            {/* 粒子爆发 */}
            {wandPhase === 'summoning' && [0,1,2,3,4,5,6,7].map(i => (
              <div key={`burst-${i}`} style={{
                position: 'absolute', top: '50%', left: '50%',
                width: i % 3 === 0 ? 6 : 4, height: i % 3 === 0 ? 6 : 4,
                marginTop: i % 3 === 0 ? -3 : -2, marginLeft: i % 3 === 0 ? -3 : -2,
                borderRadius: '50%',
                background: i % 2 === 0
                  ? 'radial-gradient(circle,rgba(255,255,255,1),rgba(200,100,255,0.8))'
                  : 'radial-gradient(circle,rgba(255,220,255,1),rgba(168,85,247,0.8))',
                animation: `burstParticle${i} ${0.5 + i * 0.05}s ${i * 0.03}s ease-out forwards`,
                pointerEvents: 'none',
              }} />
            ))}
            {/* 螺旋光环 */}
            {wandPhase === 'summoning' && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                width: 56, height: 56, marginTop: -28, marginLeft: -28,
                borderRadius: '50%', border: '2px solid transparent',
                borderTopColor: 'rgba(200,100,255,0.9)',
                borderRightColor: 'rgba(168,85,247,0.5)',
                animation: 'orbitRing 0.85s cubic-bezier(0.34,1.56,0.64,1) forwards',
                pointerEvents: 'none',
              }} />
            )}
            {/* 环绕公转光点 */}
            {wandPhase === 'summoning' && [0, 1, 2].map(i => (
              <div key={`orbit-${i}`} style={{
                position: 'absolute', top: '50%', left: '50%',
                width: 0, height: 0,
                animation: `orbitDot 1.6s ${0.7 + i * 0.2}s linear infinite`,
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: 5, height: 5, marginTop: -2.5, marginLeft: -2.5,
                  borderRadius: '50%',
                  background: i === 0
                    ? 'radial-gradient(circle,white,rgba(200,100,255,0.9))'
                    : i === 1
                      ? 'radial-gradient(circle,rgba(255,240,255,1),rgba(168,85,247,0.9))'
                      : 'radial-gradient(circle,rgba(255,255,255,1),rgba(220,120,255,0.9))',
                  boxShadow: '0 0 6px rgba(200,100,255,0.8)',
                }} />
              </div>
            ))}
            {/* 持续冒星 */}
            {wandPhase === 'summoning' && [0,1,2,3,4].map(i => (
              <div key={`fstar-${i}`} style={{
                position: 'absolute',
                bottom: `${10 + (i % 3) * 6}px`,
                left: `${20 + i * 7 - 8}px`,
                width: i % 2 === 0 ? 4 : 3, height: i % 2 === 0 ? 4 : 3,
                borderRadius: '50%',
                background: 'radial-gradient(circle,white,rgba(200,100,255,0.7))',
                animation: `floatStar${i} ${1.2 + i * 0.15}s ${0.8 + i * 0.3}s ease-out infinite`,
                pointerEvents: 'none',
              }} />
            ))}
            {/* 魔法光圈 */}
            {wandPhase === 'summoning' && (
              <svg style={{
                position: 'absolute', top: '50%', left: '50%',
                width: 72, height: 72, marginTop: -36, marginLeft: -36,
                animation: 'magicCircleSpin 3s 0.8s linear infinite',
                pointerEvents: 'none',
              }} viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="33" fill="none" stroke="rgba(200,100,255,0.35)"
                  strokeWidth="1" strokeDasharray="4 6" strokeLinecap="round"/>
                <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(168,85,247,0.2)"
                  strokeWidth="0.5" strokeDasharray="2 8" strokeLinecap="round"/>
              </svg>
            )}
            {/* 星尘闪烁（idle） */}
            {wandPhase === 'idle' && [
              { x: -6, y: -10, delay: '0s', dur: '1.8s', anim: 'sparkle1', size: 4 },
              { x: 20, y: -8, delay: '0.6s', dur: '2.2s', anim: 'sparkle2', size: 3 },
              { x: 24, y: 14, delay: '1.2s', dur: '2s', anim: 'sparkle3', size: 3.5 },
              { x: -4, y: 18, delay: '0.3s', dur: '2.4s', anim: 'sparkle1', size: 2.5 },
              { x: 10, y: -14, delay: '0.9s', dur: '1.6s', anim: 'sparkle2', size: 3 },
            ].map((s, i) => (
              <div key={`sparkle-${i}`} style={{
                position: 'absolute',
                top: `calc(50% + ${s.y}px)`, left: `calc(50% + ${s.x}px)`,
                width: s.size, height: s.size,
                background: 'radial-gradient(circle,white,rgba(200,100,255,0.8))',
                borderRadius: '50%',
                animation: `${s.anim} ${s.dur} ${s.delay} ease-in-out infinite`,
                pointerEvents: 'none',
              }} />
            ))}
            {/* 魔法棒 SVG（树杈绿叶版） */}
            <svg width="52" height="52" viewBox="-1 -1 30 30"
              style={{
                animation: wandPhase === 'exiting'
                  ? 'wandExit 0.5s ease forwards'
                  : wandPhase === 'summoning'
                    ? 'wandShakeGrow 0.85s cubic-bezier(0.34,1.56,0.64,1) forwards, wandPulseCenter 1.5s 0.85s ease-in-out infinite'
                    : 'wandBreathe 2.5s ease-in-out infinite',
              }}>
              <path d="M2.5,27 C3,22 4.5,18 7,13.5 S11.5,6 14.5,4.5"
                stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
              <path d="M5.8,16.5 C7.5,14.5 10,13 13.5,13.5"
                stroke="white" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
              <path d="M13.5,13.5 C14.5,12 16,12.5 14.5,14 C13.5,15 12.5,14.5 13.5,13.5 Z"
                fill="rgba(160,220,180,0.8)"/>
              <path d="M10,10 C8,8.5 5.5,7.5 3.5,7"
                stroke="white" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
              <g transform="translate(2.8,6.2)">
                <path d="M0,-1 C-1.8,-3.5 -0.5,-5.5 0,-3.5 C0.5,-5.5 1.8,-3.5 0,-1 Z"
                  fill="rgba(120,200,140,0.9)" transform="rotate(-20)"/>
                <path d="M0,-1 C-1.5,-3.2 -0.3,-5 0,-3 C0.3,-5 1.5,-3.2 0,-1 Z"
                  fill="rgba(100,190,120,0.85)" transform="rotate(25)"/>
                <path d="M0,-0.5 C-1.2,-2.8 -0.2,-4.2 0,-2.5 C0.2,-4.2 1.2,-2.8 0,-0.5 Z"
                  fill="rgba(140,215,155,0.8)" transform="rotate(-55)"/>
              </g>
              <path d="M1,10.5 C0.2,9 1.5,8.5 1.2,9.8 C1.8,8.8 2.2,10 1,10.5 Z"
                fill="rgba(120,200,140,0.45)" transform="rotate(-30,1,10.5)"/>
              <path d="M5.5,12 C5,11 6,10.5 5.8,11.5 C6.2,10.8 6.5,12 5.5,12 Z"
                fill="rgba(100,190,120,0.35)" transform="rotate(20,5.5,12)"/>
              <path d="M4,20 C4.8,19 5.5,19.5 4.5,20.5 C3.8,21 3.5,20.5 4,20 Z"
                fill="rgba(120,200,140,0.65)"/>
              <path d="M9.5,13.8 C8.8,12.5 10.2,12 10,13 C10.5,12.2 10.8,13.5 9.5,13.8 Z"
                fill="rgba(140,215,155,0.6)"/>
              <path d="M18.5,1.5 Q19,3.5 21,4 Q19,4.5 18.5,6.5 Q18,4.5 16,4 Q18,3.5 18.5,1.5 Z"
                fill="white"/>
              <path d="M22.5,0.5 Q22.8,1.7 23.8,2 Q22.8,2.3 22.5,3.5 Q22.2,2.3 21.2,2 Q22.2,1.7 22.5,0.5 Z"
                fill="white" opacity="0.8"/>
              <circle cx="24.5" cy="6.5" r="1" fill="white" opacity="0.6"/>
            </svg>
          </button>
        </div>,
        root,
      )}

      {/* 恶搞面板 — portal 到 #root */}
      {root && prankPanel !== null && createPortal(
        <>
          <style>{`
            @keyframes prankCardEnter {
              0%   { opacity: 0; transform: translateY(30px) scale(0.92); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes cardHopToCenter0 {
              0%   { transform: translateX(0) translateY(0) scale(1); }
              20%  { transform: translateX(calc(35% + 3px)) translateY(-22px) scale(1.05); }
              40%  { transform: translateX(calc(70% + 5px)) translateY(0) scale(1.0); }
              55%  { transform: translateX(calc(85% + 6px)) translateY(-10px) scale(1.03); }
              70%  { transform: translateX(calc(95% + 7px)) translateY(0) scale(1.0); }
              85%  { transform: translateX(calc(100% + 8px)) translateY(-4px) scale(1.02); }
              100% { transform: translateX(calc(100% + 8px)) translateY(0) scale(1.02); }
            }
            @keyframes cardHopToCenter1 {
              0%   { transform: translateY(0) scale(1); }
              25%  { transform: translateY(-20px) scale(1.06); }
              50%  { transform: translateY(0) scale(1.0); }
              70%  { transform: translateY(-8px) scale(1.03); }
              100% { transform: translateY(0) scale(1.02); }
            }
            @keyframes cardHopToCenter2 {
              0%   { transform: translateX(0) translateY(0) scale(1); }
              20%  { transform: translateX(calc(-35% - 3px)) translateY(-22px) scale(1.05); }
              40%  { transform: translateX(calc(-70% - 5px)) translateY(0) scale(1.0); }
              55%  { transform: translateX(calc(-85% - 6px)) translateY(-10px) scale(1.03); }
              70%  { transform: translateX(calc(-95% - 7px)) translateY(0) scale(1.0); }
              85%  { transform: translateX(calc(-100% - 8px)) translateY(-4px) scale(1.02); }
              100% { transform: translateX(calc(-100% - 8px)) translateY(0) scale(1.02); }
            }
            @keyframes cardFlyLeft {
              0%   { transform: translateX(0) scale(1); opacity: 1; }
              100% { transform: translateX(-180%) scale(0.6) rotate(-12deg); opacity: 0; }
            }
            @keyframes cardFlyRight {
              0%   { transform: translateX(0) scale(1); opacity: 1; }
              100% { transform: translateX(180%) scale(0.6) rotate(12deg); opacity: 0; }
            }
            @keyframes prankShimmer {
              0%   { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
            @keyframes prankCardGlow {
              0%, 100% { box-shadow: 0 0 16px rgba(168,85,247,0.4), inset 0 1px 0 rgba(255,255,255,0.12); }
              50%      { box-shadow: 0 0 32px rgba(168,85,247,0.7), 0 0 64px rgba(168,85,247,0.2), inset 0 1px 0 rgba(255,255,255,0.18); }
            }
          `}</style>

          {/* 背景遮罩，点击关闭（loading 期间或已选卡片时不可关闭）*/}
          <div
            onClick={() => {
              if (!prankLoading && prankClickedIdx === -1) closePrankPanel()
            }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'transparent',
              backdropFilter: 'blur(0.5px)',
              WebkitBackdropFilter: 'blur(0.5px)',
            }}
          />

          {/* Loading spinner（仅魔法棒双击触发时显示）*/}
          {prankLoading && (
            <div style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.15)',
                borderTopColor: 'rgba(168,85,247,0.9)',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500 }}>
                {t('drawback.analyzing') || '识别中…'}
              </span>
            </div>
          )}

          {/* 三张选项卡 */}
          {!prankLoading && (
            <div style={{
              position: 'fixed',
              top: '68%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'calc(100% - 32px)',
              maxWidth: 400,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              zIndex: 9999,
            }}>
              {/* 区域标签头 */}
              {prankLabel && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(168,85,247,0.18)',
                  border: '1px solid rgba(168,85,247,0.4)',
                  borderRadius: 20,
                  padding: '5px 14px',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{t('prank.tappedPrefix')}</span>
                  <span style={{ fontSize: 13, color: '#e0b4ff', fontWeight: 700 }}>{prankLabel}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{t('prank.tappedSuffix')}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                {prankPanel.map((item, i) => {
                  const isClicked = prankClickedIdx === i
                  const isOther = prankClickedIdx >= 0 && !isClicked
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={prankClickedIdx >= 0}
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePrankPick(item, i)
                      }}
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        position: 'relative',
                        height: 130,
                        background: isClicked ? 'rgba(108,92,231,0.25)' : 'rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(28px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                        border: isClicked
                          ? '1px solid rgba(168,85,247,0.8)'
                          : '1px solid rgba(255,255,255,0.18)',
                        borderRadius: 16,
                        padding: '12px 8px 14px',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 8,
                        cursor: prankClickedIdx >= 0 ? 'default' : 'pointer',
                        textAlign: 'center',
                        boxShadow: isClicked
                          ? '0 0 20px rgba(168,85,247,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'
                          : '0 4px 16px rgba(0,0,0,0.2)',
                        animation: prankClickedIdx === -1
                          ? `prankCardEnter 0.35s cubic-bezier(0.34,1.56,0.64,1) ${i * 80}ms both`
                          : isClicked
                            ? `cardHopToCenter${i} 0.65s cubic-bezier(0.22,1,0.36,1) forwards, prankCardGlow 2s 0.65s ease-in-out infinite`
                            : isOther && i < prankClickedIdx
                              ? 'cardFlyLeft 0.35s ease forwards'
                              : 'cardFlyRight 0.35s ease forwards',
                        transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
                      }}
                    >
                      <span style={{ fontSize: 30, lineHeight: 1 }}>{item.emoji ?? '🎭'}</span>
                      <span style={{
                        color: '#fff', fontWeight: 700, fontSize: 14,
                        lineHeight: 1.4, display: 'block', wordBreak: 'keep-all',
                      }}>
                        {item.label}
                      </span>
                      {isClicked && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                            <div style={{
                              width: 13, height: 13, borderRadius: '50%',
                              border: '2px solid rgba(255,255,255,0.15)',
                              borderTopColor: 'rgba(168,85,247,0.9)',
                              animation: 'spin 0.8s linear infinite',
                            }} />
                            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10.5, fontWeight: 600 }}>
                              {t('remix.creating')}
                            </span>
                          </div>
                          {/* 底部流光进度条 */}
                          <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                            borderRadius: '0 0 16px 16px', overflow: 'hidden',
                          }}>
                            <div style={{
                              width: '100%', height: '100%',
                              background: 'linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.85) 50%, transparent 100%)',
                              backgroundSize: '50% 100%',
                              animation: 'prankShimmer 1.5s ease-in-out infinite',
                            }} />
                          </div>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>,
        root,
      )}

      {/* 评论输入框 */}
      {commentOpen && (
        <div className="imf-comment-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setCommentOpen(false) }}>
          <div className="imf-comment-bar" onClick={(e) => e.stopPropagation()}>
            <input ref={commentInputRef} className="imf-comment-input"
              placeholder={t('feed.commentPlaceholder')} value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommentSend()
                if (e.key === 'Escape') setCommentOpen(false)
              }}
              maxLength={200}
            />
            <button type="button"
              className={`imf-comment-send ${commentText.trim() && !comment.isPending ? 'active' : ''}`}
              onClick={handleCommentSend}
              disabled={!commentText.trim() || comment.isPending}
              aria-label="send comment">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <TabBar />
    </div>
  )
}
