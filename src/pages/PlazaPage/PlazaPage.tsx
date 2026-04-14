import {
  Component,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import Lottie from 'lottie-react'
import {
  useCurrentUser,
  usePlazaSocket,
  type PlazaBumpTarget,
  type PlazaUser,
} from '@chataigram/core'
import CdnImg from '../../components/CdnImg'
import TabBar from '../../components/TabBar'
import { rewriteCdnUrlSync } from '../../utils/cdn'
import { fetchAnimationData } from '../../utils/animationCache'
import './PlazaPage.css'

const TAP_THRESHOLD = 8
const BUMP_DURATION = 1500
const TOAST_DURATION = 2200

type BumpEffect = {
  id: number
  x: number
  y: number
  fromName: string
}

/**
 * Plaza —— 2D 在线画布，看谁在线、互相 bump、设置 status。
 *
 * 迁自 frontend/PlazaPage.jsx（484 行）。取舍：
 *   ✅ 保留 pan/drag、选中 action sheet、bump 特效、off-screen 指示器、status 输入
 *   ⏸️ Lottie 头像动画延后（替换成 CdnImg / 首字母）—— TODO(anim)
 *   ⏸️ Animation 预取用 animationCache，但不渲染 Lottie（等引入 lottie-react）
 */
export default function PlazaPage() {
  const { data: currentUser } = useCurrentUser()
  const myId = currentUser?.id ?? null

  const [users, setUsers] = useState<PlazaUser[]>([])
  const [myPos, setMyPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedUser, setSelectedUser] = useState<PlazaUser | null>(null)
  const [bumpEffects, setBumpEffects] = useState<BumpEffect[]>([])
  const [bumpToast, setBumpToast] = useState<string | null>(null)
  const [bumpedUid, setBumpedUid] = useState<number | null>(null)
  const [statusInput, setStatusInput] = useState('')
  const [panVersion, setPanVersion] = useState(0)
  // user_id → Lottie JSON，拉到就进；PlazaPage 渲染时检查
  const [animations, setAnimations] = useState<Record<number, object>>({})
  const animationsRef = useRef(animations)
  animationsRef.current = animations

  const panRef = useRef({ x: 0, y: 0 })
  const worldRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  })

  // ── 拉取某个用户的 Lottie 动画 ───────────────────────────────
  const fetchAnimation = useCallback(
    async (userId: number, taskId: string | null) => {
      if (!taskId || animationsRef.current[userId]) return
      const lottie = await fetchAnimationData(userId, taskId)
      if (lottie) {
        setAnimations((prev) => ({ ...prev, [userId]: lottie as object }))
      }
    },
    [],
  )

  const centerOn = useCallback((posX: number, posY: number) => {
    const vp = viewportRef.current
    if (!vp) return
    const cx = vp.clientWidth / 2
    const cy = vp.clientHeight / 2
    panRef.current = { x: cx - posX, y: cy - posY }
    if (worldRef.current) {
      worldRef.current.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px)`
    }
    setPanVersion((v) => v + 1)
  }, [])

  // ── WebSocket callbacks ───────────────────────────────────────
  const onInit = useCallback(
    (msg: Parameters<NonNullable<Parameters<typeof usePlazaSocket>[1]['onInit']>>[0]) => {
      setUsers(msg.users)
      if (msg.myPos) {
        setMyPos(msg.myPos)
        setTimeout(() => centerOn(msg.myPos!.x, msg.myPos!.y), 50)
      }
      // 预取所有已在广场的用户的 Lottie
      for (const u of msg.users) {
        if (u.animationTaskId) void fetchAnimation(u.id, u.animationTaskId)
      }
    },
    [centerOn, fetchAnimation],
  )

  const onUserJoin = useCallback(
    (user: PlazaUser) => {
      setUsers((prev) => {
        const existing = prev.find((u) => u.id === user.id)
        if (existing) return prev.map((u) => (u.id === user.id ? user : u))
        return [...prev, user]
      })
      if (user.animationTaskId) void fetchAnimation(user.id, user.animationTaskId)
    },
    [fetchAnimation],
  )

  const onAnimationReady = useCallback(
    (userId: number, taskId: string) => {
      void fetchAnimation(userId, taskId)
    },
    [fetchAnimation],
  )

  const onUserLeave = useCallback((userId: number) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId))
  }, [])

  const onBump = useCallback(
    (from: { id: number; name: string }, to: PlazaBumpTarget) => {
      const id = Date.now() + Math.random()
      setBumpEffects((prev) => [
        ...prev,
        { id, x: to.posX, y: to.posY, fromName: from.name },
      ])
      setTimeout(() => {
        setBumpEffects((prev) => prev.filter((e) => e.id !== id))
      }, BUMP_DURATION)

      setBumpedUid(to.userId)
      setTimeout(() => setBumpedUid(null), 600)

      if (to.userId === myId) {
        setBumpToast(`${from.name} 碰了你一下`)
        setTimeout(() => setBumpToast(null), TOAST_DURATION)
        if (navigator.vibrate) navigator.vibrate(100)
      }
    },
    [myId],
  )

  const onStatusUpdate = useCallback(
    (userId: number, statusText: string | null, statusEmoji: string | null) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, statusText, statusEmoji } : u,
        ),
      )
    },
    [],
  )

  const { send, connected } = usePlazaSocket(myId, {
    onInit,
    onUserJoin,
    onUserLeave,
    onBump,
    onStatusUpdate,
    onAnimationReady,
  })

  // ── Pan handling ──────────────────────────────────────────────
  const getEventPos = (e: React.TouchEvent | React.MouseEvent) => {
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: t?.clientX ?? 0, y: t?.clientY ?? 0 }
    }
    return { x: e.clientX, y: e.clientY }
  }

  const handlePointerDown = (e: React.TouchEvent | React.MouseEvent) => {
    if ('touches' in e && e.touches.length > 1) return
    const pos = getEventPos(e)
    dragState.current = {
      dragging: false,
      startX: pos.x,
      startY: pos.y,
      startPanX: panRef.current.x,
      startPanY: panRef.current.y,
    }
  }

  const handlePointerMove = (e: React.TouchEvent | React.MouseEvent) => {
    const ds = dragState.current
    if (ds.startX === 0 && ds.startY === 0) return
    const pos = getEventPos(e)
    const dx = pos.x - ds.startX
    const dy = pos.y - ds.startY

    if (!ds.dragging && Math.abs(dx) + Math.abs(dy) > TAP_THRESHOLD) {
      ds.dragging = true
    }

    if (ds.dragging) {
      panRef.current = { x: ds.startPanX + dx, y: ds.startPanY + dy }
      if (worldRef.current) {
        worldRef.current.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px)`
      }
    }
  }

  const handleTap = useCallback(
    (tapPos: { x: number; y: number }) => {
      const pan = panRef.current
      const worldX = tapPos.x - pan.x
      const worldY = tapPos.y - pan.y
      const HIT_RADIUS = 40
      let closest: PlazaUser | null = null
      let closestDist = Infinity
      for (const u of users) {
        if (u.id === myId) continue
        const dx = worldX - u.posX
        const dy = worldY - u.posY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < HIT_RADIUS && dist < closestDist) {
          closest = u
          closestDist = dist
        }
      }
      setSelectedUser(closest)
    },
    [users, myId],
  )

  const handlePointerUp = (e: React.TouchEvent | React.MouseEvent) => {
    const ds = dragState.current
    if (!ds.dragging) {
      const tapPos =
        'changedTouches' in e
          ? {
              x: e.changedTouches[0]?.clientX ?? 0,
              y: e.changedTouches[0]?.clientY ?? 0,
            }
          : { x: e.clientX, y: e.clientY }
      handleTap(tapPos)
    }
    dragState.current = { dragging: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 }
    setPanVersion((v) => v + 1)
  }

  // ── Actions ───────────────────────────────────────────────────
  const handleBump = (targetUserId: number) => {
    send({ type: 'bump', targetUserId })
    setSelectedUser(null)
  }

  const handleStatusSubmit = () => {
    const text = statusInput.trim()
    if (!text) return
    send({ type: 'status_update', statusText: text, statusEmoji: null })
    setStatusInput('')
  }

  const handleLocateMe = () => {
    if (myPos) centerOn(myPos.x, myPos.y)
  }

  // ── Off-screen indicators ─────────────────────────────────────
  const offScreenIndicators = useMemo(() => {
    const vp = viewportRef.current
    if (!vp || users.length === 0) return []
    const vpW = vp.clientWidth
    const vpH = vp.clientHeight
    const pan = panRef.current
    const result: { user: PlazaUser; x: number; y: number }[] = []

    for (const u of users) {
      if (u.id === myId) continue
      const sx = u.posX + pan.x
      const sy = u.posY + pan.y
      if (sx >= -30 && sx <= vpW + 30 && sy >= -30 && sy <= vpH + 30) continue

      const cx = vpW / 2
      const cy = vpH / 2
      const dx = sx - cx
      const dy = sy - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist === 0) continue

      const ndx = dx / dist
      const ndy = dy / dist
      let t = Infinity
      if (ndx > 0) t = Math.min(t, (vpW - 36 - cx) / ndx)
      else if (ndx < 0) t = Math.min(t, (36 - cx) / ndx)
      if (ndy > 0) t = Math.min(t, (vpH - 140 - cy) / ndy)
      else if (ndy < 0) t = Math.min(t, (80 - cy) / ndy)

      result.push({ user: u, x: cx + ndx * t, y: cy + ndy * t })
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panVersion, users, myId])

  const otherCount = users.filter((u) => u.id !== myId).length

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="plaza-page">
      <div className="plaza-header">
        <span className="plaza-title">Plaza</span>
        <span className={`plaza-online-badge${connected ? '' : ' disconnected'}`}>
          {connected ? `${users.length} online` : 'connecting...'}
        </span>
        <button
          type="button"
          className="plaza-locate-btn"
          onClick={handleLocateMe}
          aria-label="locate me"
        >
          <LocateIcon />
        </button>
      </div>

      <div
        className="plaza-viewport"
        ref={viewportRef}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={() => {
          dragState.current.dragging = false
        }}
      >
        <div className="plaza-world" ref={worldRef}>
          {users.map((u) => (
            <div
              key={u.id}
              className={`avatar-marker${u.id === myId ? ' is-me' : ''}${
                bumpedUid === u.id ? ' bumped' : ''
              }`}
              style={{ left: u.posX, top: u.posY } as CSSProperties}
            >
              <div className="avatar-card">
                <div
                  className={`avatar-img-wrap${animations[u.id] ? '' : ' floating'}`}
                >
                  {animations[u.id] ? (
                    <LottieBoundary
                      fallback={
                        u.avatarUrl ? (
                          <CdnImg src={u.avatarUrl} alt={u.name} className="avatar-img" />
                        ) : (
                          <div className="avatar-fallback">{(u.name || '?')[0]}</div>
                        )
                      }
                    >
                      <Lottie
                        animationData={animations[u.id]}
                        loop
                        autoplay
                        style={{ width: 56, height: 56, borderRadius: '50%' }}
                      />
                    </LottieBoundary>
                  ) : u.avatarUrl ? (
                    <CdnImg src={u.avatarUrl} alt={u.name} className="avatar-img" />
                  ) : (
                    <div className="avatar-fallback">{(u.name || '?')[0]}</div>
                  )}
                  {u.id === myId && <div className="avatar-me-dot">me</div>}
                </div>
                <div className="avatar-name">{u.name}</div>
                {u.statusText ? (
                  <div className="avatar-status">
                    {u.statusEmoji ? `${u.statusEmoji} ` : ''}
                    {u.statusText}
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {bumpEffects.map((e) => (
            <div
              key={e.id}
              className="bump-effect"
              style={{ left: e.x, top: e.y } as CSSProperties}
            >
              <div className="bump-ripple" />
              <div className="bump-ripple-2" />
              <div className="bump-text">{e.fromName}</div>
            </div>
          ))}
        </div>

        {offScreenIndicators.map((ind) => (
          <div
            key={ind.user.id}
            className="offscreen-indicator"
            style={{ left: ind.x, top: ind.y } as CSSProperties}
            onTouchStart={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => centerOn(ind.user.posX, ind.user.posY)}
          >
            <div className="offscreen-avatar">
              {ind.user.avatarUrl ? (
                <img src={rewriteCdnUrlSync(ind.user.avatarUrl) ?? ''} alt="" />
              ) : (
                <span>{(ind.user.name || '?')[0]}</span>
              )}
            </div>
            <div className="offscreen-name">{ind.user.name}</div>
          </div>
        ))}

        {!connected && users.length === 0 && (
          <div className="plaza-empty">
            <div className="plaza-empty-icon">~</div>
            <div className="plaza-empty-text">
              connecting to plaza...
            </div>
          </div>
        )}

        {connected && otherCount === 0 && myPos && (
          <div className="plaza-empty">
            <div className="plaza-empty-icon">~</div>
            <div className="plaza-empty-text">
              just you, for now
              <br />
              others will appear here
            </div>
          </div>
        )}
      </div>

      {bumpToast && <div className="bump-toast">{bumpToast}</div>}

      {selectedUser && (
        <div className="plaza-action-overlay" onClick={() => setSelectedUser(null)}>
          <div className="plaza-action-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="action-user-info">
              {selectedUser.avatarUrl ? (
                <CdnImg
                  className="action-user-avatar"
                  src={selectedUser.avatarUrl}
                  alt=""
                />
              ) : (
                <div className="action-user-avatar-fallback">
                  {(selectedUser.name || '?')[0]}
                </div>
              )}
              <div>
                <div className="action-user-name">{selectedUser.name}</div>
                {selectedUser.statusText && (
                  <div className="action-user-status">
                    {selectedUser.statusEmoji} {selectedUser.statusText}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              className="action-bump-btn"
              onClick={() => handleBump(selectedUser.id)}
            >
              碰一碰
            </button>
            <button
              type="button"
              className="action-cancel-btn"
              onClick={() => setSelectedUser(null)}
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="plaza-status-bar">
        <div className="plaza-status-input-wrap">
          <input
            className="plaza-status-input"
            placeholder="set your status..."
            value={statusInput}
            onChange={(e) => setStatusInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleStatusSubmit()
            }}
            maxLength={40}
          />
          <button
            type="button"
            className="plaza-status-send"
            onClick={handleStatusSubmit}
            disabled={!statusInput.trim()}
            aria-label="send status"
          >
            <ArrowUpIcon />
          </button>
        </div>
      </div>

      <TabBar />
    </div>
  )
}

/** Lottie error boundary — 出错时回退到静态头像，不炸掉整个页面 */
class LottieBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // silent — 已回退到 fallback
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

function LocateIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function ArrowUpIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  )
}
