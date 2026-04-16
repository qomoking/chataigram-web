import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUnreadCount } from '@chataigram/core'
import CameraFlow from './CameraFlow'
import './TabBar.css'

type TabKey = 'home' | 'plaza' | 'inbox' | 'me'

type TabDef = {
  key: TabKey
  path: string
  label: string
  icon: ReactNode
}

/**
 * Shell 层 5 键 TabBar —— Home / Plaza / Camera / Inbox / Me。
 * Camera 居中抬高，Inbox 右上角红点提示未读。
 */
export default function TabBar() {
  const { data: unreadCount = 0 } = useUnreadCount()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [showCamera, setShowCamera] = useState(false)

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/' || pathname === '/feed'
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  const tabs: TabDef[] = [
    { key: 'home', path: '/', label: 'Home', icon: <HomeIcon /> },
    { key: 'plaza', path: '/plaza', label: 'Plaza', icon: <PlazaIcon /> },
    { key: 'inbox', path: '/inbox', label: 'Inbox', icon: <InboxIcon /> },
    { key: 'me', path: '/profile', label: 'Me', icon: <MeIcon /> },
  ]

  const renderTab = (tab: TabDef, showBadge = false) => {
    const active = isActive(tab.path)
    return (
      <button
        key={tab.key}
        type="button"
        className={`tabbar-item${active ? ' is-active' : ''}`}
        onClick={() => navigate(tab.path)}
        aria-label={tab.label}
      >
        <span className="tabbar-icon">
          {tab.icon}
          {showBadge && <span className="tabbar-badge" aria-hidden="true" />}
        </span>
        <span className="tabbar-label">{tab.label}</span>
      </button>
    )
  }

  return (
    <>
      <nav className="tabbar" aria-label="primary">
        {renderTab(tabs[0]!)}
        {renderTab(tabs[1]!)}
        <button
          type="button"
          className="tabbar-camera"
          onClick={() => setShowCamera(true)}
          aria-label="open camera"
        >
          <CameraIcon />
        </button>
        {renderTab(tabs[2]!, unreadCount > 0)}
        {renderTab(tabs[3]!)}
      </nav>

      {showCamera && <CameraFlow onClose={() => setShowCamera(false)} />}
    </>
  )
}

// ── Icons ────────────────────────────────────────────────
// 统一 24×24 viewBox, stroke-based, 2px 线宽, round 收尾。

function HomeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

function PlazaIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l1.5-2.2A1 1 0 0 1 9.3 5.4h5.4a1 1 0 0 1 .8.4L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function InboxIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-6l-3 3-3-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
      <path d="M8 10h8" />
      <path d="M8 13h5" />
    </svg>
  )
}

function MeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.5 20c1-3.8 4-6 7.5-6s6.5 2.2 7.5 6" />
    </svg>
  )
}
