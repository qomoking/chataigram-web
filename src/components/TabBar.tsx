import { useLocation, useNavigate } from 'react-router-dom'
import { useUnreadCount } from '@chataigram/core'
import './TabBar.css'

const tabs = [
  { key: 'discover', path: '/', label: '发现' },
  { key: 'create', path: '/create', label: '创作' },
  { key: 'plaza', path: '/plaza', label: '广场' },
  { key: 'me', path: '/profile', label: '我的' },
] as const

type TabKey = (typeof tabs)[number]['key']

function TabIcon({ tab, active }: { tab: TabKey; active: boolean }) {
  const stroke = 'currentColor'
  const sw = active ? '2.2' : '1.8'

  switch (tab) {
    case 'discover':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={active ? stroke : 'none'} />
        </svg>
      )
    case 'create':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )
    case 'plaza':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'me':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? stroke : 'none'} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
  }
}

export default function TabBar() {
  const { data: unreadCount = 0 } = useUnreadCount()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const activeTab = (): TabKey => {
    if (pathname === '/' || pathname === '/feed') return 'discover'
    if (pathname.startsWith('/create')) return 'create'
    if (pathname === '/plaza') return 'plaza'
    if (pathname.startsWith('/profile') || pathname === '/works' || pathname === '/inbox' || pathname === '/invites') return 'me'
    return 'discover'
  }

  const current = activeTab()

  return (
    <nav className="tabbar">
      {tabs.map((t) => {
        const active = t.key === current
        return (
          <button
            key={t.key}
            type="button"
            className={`tabbar-item${active ? ' active' : ''}${t.key === 'create' ? ' tabbar-item--create' : ''}`}
            onPointerDown={() => navigate(t.path)}
            aria-label={t.label}
          >
            <span className="tabbar-item-icon">
              <TabIcon tab={t.key} active={active} />
            </span>
            <span className="tabbar-item-label">{t.label}</span>
            {t.key === 'me' && unreadCount > 0 && <span className="tabbar-badge" />}
          </button>
        )
      })}
    </nav>
  )
}
