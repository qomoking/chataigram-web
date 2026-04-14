import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  googleAuthUrl,
  useCheckUsername,
  useCurrentUser,
  useLogin,
  useRegister,
  useUserInfo,
} from '@chataigram/core'
import CdnImg from '../../components/CdnImg'
import { prefetchAnimation } from '../../utils/animationCache'
import './LoginPage.css'

/**
 * LoginPage —— 对应原 frontend/src/pages/LoginPage.jsx。
 *
 * 保留三种模式：
 *   1. cards 模式：选预设用户 + 输密码登录
 *   2. username 模式：输用户名 + 密码登录
 *   3. register sheet：注册，带用户名可用性检查
 * 加 Google OAuth 按钮。
 *
 * 未迁移（按 AGENTS.md 场景 1 处理）：
 *   • prefetchAnimation（动画缓存预取）—— 后续补
 *   • 预设用户的后端实时信息（useUserInfo 批量调用）—— MVP 用静态数据
 *   • i18n —— 暂硬编码中文
 */

const PRESET_USERS = [
  { id: 618336286, username: 'ghostpixel', name: 'GhostPixel', color: '#8b5cf6' },
  { id: 5941868819, username: 'jenny', name: 'Jenny', color: '#ec4899' },
  { id: 7096800017, username: 'aigram', name: 'AIgram', color: '#06b6d4' },
  { id: 8119626806, username: 'kingx', name: 'King X', color: '#f59e0b' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: currentUser } = useCurrentUser()

  const loginMutation = useLogin()
  const registerMutation = useRegister()

  // ── shared ──
  const [error, setError] = useState('')

  // ── card mode ──
  const [selected, setSelected] = useState<number | null>(null)
  const [cardPassword, setCardPassword] = useState('')

  // ── username mode ──
  const [mode, setMode] = useState<'cards' | 'username'>('cards')
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // ── register sheet ──
  const [showRegister, setShowRegister] = useState(false)
  const [regName, setRegName] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regInviteCode, setRegInviteCode] = useState('')
  const [debouncedUsername, setDebouncedUsername] = useState('')

  // ── more section ──
  const [showMore, setShowMore] = useState(false)

  const cardPwRef = useRef<HTMLInputElement>(null)
  const usernamePwRef = useRef<HTMLInputElement>(null)
  const regNameRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 已登录 → 跳首页
  useEffect(() => {
    if (currentUser) navigate('/', { replace: true })
  }, [currentUser, navigate])

  // OAuth 错误提示（仅 mount 时读一次）
  useEffect(() => {
    const oauthError = searchParams.get('error')
    if (oauthError) setError('Google 登录失败，请重试')
    // only once at mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 选了卡片 → 清密码 + 聚焦
  useEffect(() => {
    if (selected != null) {
      setCardPassword('')
      setError('')
      setTimeout(() => cardPwRef.current?.focus(), 200)
    }
  }, [selected])

  // ── username availability check (debounced) ──
  // 用户名 input 变化 → 400ms 后把它赋给 debouncedUsername；
  // useCheckUsername 监听 debouncedUsername 出结果。
  const checkUsernameAvailability = useCallback((val: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    const clean = val.trim().toLowerCase()
    if (clean.length < 2 || !/^[a-z0-9_]+$/.test(clean)) {
      setDebouncedUsername('')
      return
    }
    debounceTimer.current = setTimeout(() => setDebouncedUsername(clean), 400)
  }, [])

  const { data: regAvailable, isFetching: regChecking } = useCheckUsername(debouncedUsername)

  // ── card login ──
  const handleCardLogin = () => {
    if (selected == null || !cardPassword || loginMutation.isPending) return
    const preset = PRESET_USERS.find((u) => u.id === selected)
    if (!preset) return
    setError('')
    loginMutation.mutate(
      { username: preset.username, password: cardPassword },
      {
        onSuccess: ({ user, animationTaskId }) => {
          prefetchAnimation(user.id, animationTaskId)
          navigate('/', { replace: true })
        },
        onError: () => setError('密码错误'),
      },
    )
  }

  // ── username login ──
  const handleUsernameLogin = () => {
    if (!loginUsername.trim() || !loginPassword || loginMutation.isPending) return
    setError('')
    loginMutation.mutate(
      { username: loginUsername.trim(), password: loginPassword },
      {
        onSuccess: ({ user, animationTaskId }) => {
          prefetchAnimation(user.id, animationTaskId)
          navigate('/', { replace: true })
        },
        onError: () => setError('密码错误'),
      },
    )
  }

  // ── register ──
  const handleRegister = () => {
    if (registerMutation.isPending) return
    const name = regName.trim()
    const username = regUsername.trim().toLowerCase()
    if (!name || !username || !regPassword) return
    if (regPassword !== regConfirm) {
      setError('两次密码不一致')
      return
    }
    if (regPassword.length < 6) {
      setError('密码至少 6 位')
      return
    }
    if (regAvailable === false) return

    setError('')
    registerMutation.mutate(
      { name, username, password: regPassword, inviteCode: regInviteCode.trim() },
      {
        onSuccess: ({ user, animationTaskId }) => {
          prefetchAnimation(user.id, animationTaskId)
          navigate('/', { replace: true })
        },
        onError: (err) => setError(err.message || '注册失败'),
      },
    )
  }

  const openRegisterSheet = () => {
    setShowRegister(true)
    setError('')
    setTimeout(() => regNameRef.current?.focus(), 200)
  }

  const regValid =
    Boolean(regName.trim()) &&
    regUsername.trim().length >= 2 &&
    regPassword.length >= 6 &&
    regPassword === regConfirm &&
    regAvailable !== false &&
    !registerMutation.isPending

  const cardLogging = loginMutation.isPending && selected != null
  const usernameLogging = loginMutation.isPending && mode === 'username'

  const MoreActions = (
    <div className="more-panel fadeUp">
      <div className="divider">
        <span>或</span>
      </div>
      <button
        type="button"
        className="google-btn"
        onClick={() => {
          window.location.href = googleAuthUrl
        }}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        Continue with Google
      </button>
      <button type="button" className="new-user-btn" onClick={openRegisterSheet}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        注册新账号
      </button>
    </div>
  )

  return (
    <div className="login-root">
      <div className="login-select select-in">
        <div className="select-header">
          <div className="select-logo">ChatAigram</div>
          <div className="select-title">{mode === 'cards' ? '选择账号' : '登录'}</div>
        </div>

        {/* ═══ Card mode ═══ */}
        {mode === 'cards' && (
          <>
            <div className="user-list">
              {PRESET_USERS.map((user, i) => (
                <PresetUserCard
                  key={user.id}
                  preset={user}
                  index={i}
                  selected={selected === user.id}
                  onSelect={() =>
                    setSelected((prev) => (prev === user.id ? null : user.id))
                  }
                />
              ))}
            </div>

            {selected != null && (
              <div className="card-auth fadeUp">
                <input
                  ref={cardPwRef}
                  className="auth-input"
                  type="password"
                  placeholder="密码"
                  value={cardPassword}
                  onChange={(e) => {
                    setCardPassword(e.target.value)
                    setError('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCardLogin()}
                />
                {error && <div className="auth-error shake">{error}</div>}
                <button
                  type="button"
                  className={`auth-btn ${cardPassword && !cardLogging ? 'auth-btn--active' : ''} ${cardLogging ? 'auth-btn--loading' : ''}`}
                  onClick={handleCardLogin}
                  disabled={!cardPassword || cardLogging}
                >
                  {cardLogging ? '登录中…' : '登录'}
                </button>
              </div>
            )}

            <div className="invite-section">
              <div className="invite-row">
                <input
                  className="auth-input"
                  placeholder="邀请码"
                  value={regInviteCode}
                  onChange={(e) => setRegInviteCode(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && regInviteCode.trim() && openRegisterSheet()
                  }
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <button
                  type="button"
                  className={`invite-arrow ${regInviteCode.trim() ? 'invite-arrow--active' : ''}`}
                  onClick={() => regInviteCode.trim() && openRegisterSheet()}
                  aria-label="继续注册"
                >
                  →
                </button>
              </div>
            </div>

            <button
              type="button"
              className="text-link"
              onClick={() => {
                setMode('username')
                setError('')
                setTimeout(() => usernamePwRef.current?.focus(), 100)
              }}
            >
              用户名登录 →
            </button>

            <button type="button" className="more-toggle" onClick={() => setShowMore((p) => !p)}>
              {showMore ? '收起 ↑' : '更多 ···'}
            </button>
            {showMore && MoreActions}
          </>
        )}

        {/* ═══ Username mode ═══ */}
        {mode === 'username' && (
          <div className="username-form fadeUp">
            <input
              className="auth-input"
              type="text"
              placeholder="@用户名"
              value={loginUsername}
              onChange={(e) => {
                setLoginUsername(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && usernamePwRef.current?.focus()}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <input
              ref={usernamePwRef}
              className="auth-input"
              type="password"
              placeholder="密码"
              value={loginPassword}
              onChange={(e) => {
                setLoginPassword(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleUsernameLogin()}
            />
            {error && <div className="auth-error shake">{error}</div>}
            <button
              type="button"
              className={`auth-btn ${loginUsername.trim() && loginPassword && !usernameLogging ? 'auth-btn--active' : ''} ${usernameLogging ? 'auth-btn--loading' : ''}`}
              onClick={handleUsernameLogin}
              disabled={!loginUsername.trim() || !loginPassword || usernameLogging}
            >
              {usernameLogging ? '登录中…' : '登录'}
            </button>

            <button
              type="button"
              className="text-link"
              onClick={() => {
                setMode('cards')
                setError('')
              }}
            >
              返回账号选择
            </button>

            <div className="invite-section">
              <div className="invite-row">
                <input
                  className="auth-input"
                  placeholder="邀请码"
                  value={regInviteCode}
                  onChange={(e) => setRegInviteCode(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && regInviteCode.trim() && openRegisterSheet()
                  }
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <button
                  type="button"
                  className={`invite-arrow ${regInviteCode.trim() ? 'invite-arrow--active' : ''}`}
                  onClick={() => regInviteCode.trim() && openRegisterSheet()}
                  aria-label="继续注册"
                >
                  →
                </button>
              </div>
            </div>

            <button type="button" className="more-toggle" onClick={() => setShowMore((p) => !p)}>
              {showMore ? '收起 ↑' : '更多 ···'}
            </button>
            {showMore && MoreActions}
          </div>
        )}
      </div>

      {/* ═══ Register bottom sheet ═══ */}
      {showRegister && (
        <div
          className="sheet-backdrop"
          onClick={() => {
            setShowRegister(false)
            setError('')
          }}
        >
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">注册</div>

            <input
              className="sheet-input"
              placeholder="邀请码"
              value={regInviteCode}
              onChange={(e) => setRegInviteCode(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />

            <input
              ref={regNameRef}
              className="sheet-input"
              placeholder="昵称"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              maxLength={20}
            />
            <div className="sheet-field">
              <input
                className="sheet-input"
                placeholder="@用户名（仅字母/数字/下划线）"
                value={regUsername}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)
                  setRegUsername(v)
                  checkUsernameAvailability(v)
                }}
                autoCapitalize="none"
                autoCorrect="off"
                maxLength={20}
              />
              {regUsername.trim().length >= 2 && !regChecking && regAvailable !== undefined && (
                <div
                  className={`field-hint ${regAvailable ? 'field-hint--ok' : 'field-hint--err'}`}
                >
                  {regAvailable ? '✓ 用户名可用' : '✗ 用户名已被占用'}
                </div>
              )}
              {regChecking && <div className="field-hint field-hint--checking">…</div>}
            </div>

            <input
              className="sheet-input"
              type="password"
              placeholder="密码（至少 6 位）"
              value={regPassword}
              onChange={(e) => {
                setRegPassword(e.target.value)
                setError('')
              }}
            />
            <input
              className="sheet-input"
              type="password"
              placeholder="确认密码"
              value={regConfirm}
              onChange={(e) => {
                setRegConfirm(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
            />

            {regConfirm && regPassword !== regConfirm && (
              <div className="auth-error">两次密码不一致</div>
            )}
            {error && <div className="auth-error shake">{error}</div>}

            <button
              type="button"
              className={`sheet-confirm ${regValid ? 'sheet-confirm--active' : ''} ${registerMutation.isPending ? 'sheet-confirm--loading' : ''}`}
              onClick={handleRegister}
              disabled={!regValid}
            >
              {registerMutation.isPending ? '创建中…' : '创建账号'}
            </button>

            <button
              type="button"
              className="text-link"
              onClick={() => {
                setShowRegister(false)
                setError('')
              }}
            >
              已有账号？去登录 →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  PresetUserCard —— 一张预设用户卡片，独立组件以便各自跑 useUserInfo
// ─────────────────────────────────────────────────────────────

type PresetUser = {
  id: number
  username: string
  name: string
  color: string
}

function PresetUserCard({
  preset,
  index,
  selected,
  onSelect,
}: {
  preset: PresetUser
  index: number
  selected: boolean
  onSelect: () => void
}) {
  const { data: info } = useUserInfo(preset.id)

  const displayName = info?.name || preset.name
  const displayUsername = info?.username || preset.username
  const avatar = info?.avatarUrl ?? null

  return (
    <button
      type="button"
      className={`user-card ${selected ? 'user-card--selected' : ''}`}
      style={
        {
          animationDelay: `${index * 80}ms`,
          '--user-color': preset.color,
        } as React.CSSProperties
      }
      onClick={onSelect}
    >
      <div className="user-avatar" style={{ background: preset.color }}>
        {avatar ? (
          <CdnImg src={avatar} alt={displayName} className="user-avatar-img" />
        ) : (
          displayName.charAt(0)
        )}
      </div>
      <div className="user-info">
        <span className="user-name">{displayName}</span>
        <span className="user-id">@{displayUsername}</span>
      </div>
      {selected && (
        <svg
          className="user-check"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  )
}
