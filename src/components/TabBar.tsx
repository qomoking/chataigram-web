import { useState, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUnreadCount } from '@chataigram/core'
import CameraFlow from './CameraFlow'
import type { Post } from '@chataigram/core'

type TabBarProps = {
  onCamera?: (post: Post) => void
}

/**
 * 底部 3 键 TabBar —— Main / Camera / Me。
 * 和 frontend TabBar.jsx 行为对齐，未读用小红点提示。
 */
export default function TabBar({ onCamera }: TabBarProps) {
  const { data: unreadCount = 0 } = useUnreadCount()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [showCamera, setShowCamera] = useState(false)

  const isMain = pathname === '/'
  const isMe = pathname === '/profile'

  const barStyle: CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 68,
    background: 'rgba(0,0,0,0.9)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 100,
    borderTop: '1px solid rgba(255,255,255,0.08)',
  }

  const textBtn = (active: boolean): CSSProperties => ({
    background: 'none',
    border: 'none',
    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    padding: '8px 24px',
    position: 'relative',
  })

  const cameraBtn: CSSProperties = {
    width: 52,
    height: 52,
    borderRadius: '50%',
    border: '3px solid #fff',
    background: 'linear-gradient(135deg, #ff6b35, #f7c59f)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
    flexShrink: 0,
    padding: 0,
  }

  const dot: CSSProperties = {
    position: 'absolute',
    top: 4,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#ff3b30',
    border: '1.5px solid rgba(0,0,0,0.9)',
  }

  return (
    <>
      <div style={barStyle}>
        <button type="button" style={textBtn(isMain)} onClick={() => navigate('/')}>
          Main
        </button>

        <button
          type="button"
          style={cameraBtn}
          onClick={() => setShowCamera(true)}
          aria-label="open camera"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>

        <button type="button" style={textBtn(isMe)} onClick={() => navigate('/profile')}>
          Me
          {unreadCount > 0 && <span style={dot} />}
        </button>
      </div>

      {showCamera && (
        <CameraFlow
          onPost={(post) => {
            onCamera?.(post)
            setShowCamera(false)
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  )
}
