import { useCallback, useEffect, useRef } from 'react'
import './App.css'
import type { ReactNode } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  useCurrentUser,
  useNotificationSocket,
  type Notification,
} from '@chataigram/core'
import { prefetchFakeLottieOnIdle } from './fakePresence/useFakePresence'

import FeedPage from './pages/FeedPage/FeedPage'
import LoginPage from './pages/LoginPage/LoginPage'
import GoogleCallbackPage from './pages/GoogleCallbackPage'
import InboxPage from './pages/InboxPage/InboxPage'
import InvitePage from './pages/InvitePage/InvitePage'
import ProfilePage from './pages/ProfilePage/ProfilePage'
import Profile from './pages/Profile/Profile'
import WorksPage from './pages/WorksPage/WorksPage'
import Home from './pages/Home/Home'
import Create from './pages/Create/Create'
import CreatePage from './pages/CreatePage/CreatePage'
import CreateAvatarPage from './pages/CreateAvatarPage/CreateAvatarPage'
import PlazaPage from './pages/PlazaPage/PlazaPage'
import ImmersiveFeedPage from './pages/ImmersiveFeedPage/ImmersiveFeedPage'
import FakePresenceDebug from './pages/FakePresenceDebug/FakePresenceDebug'

import NotificationManager, {
  type NotificationManagerHandle,
} from './components/NotificationManager'
import TabBar from './components/TabBar'
import { prefetchCdnConfig } from '@chataigram/core'

// 启动即预热 CDN 配置
prefetchCdnConfig()

/**
 * 登录守卫 —— 未登录 → /login。
 * isLoading 期间 render null，避免闪回。
 */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser()
  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

/**
 * 登录态下的 Shell —— 渲染受保护页面 + 实时通知 socket + toast 队列。
 */
function Shell() {
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()
  const qc = useQueryClient()
  const notifRef = useRef<NotificationManagerHandle>(null)

  const handleNotification = useCallback((n: Notification) => {
    notifRef.current?.enqueue(n)
  }, [])

  useNotificationSocket(currentUser?.id ?? null, handleNotification)

  // 登录后用浏览器空闲时间预下载 plaza 假人 Lottie。chunk 独立、走 idle，不抢首屏。
  useEffect(() => {
    void prefetchFakeLottieOnIdle(qc)
  }, [qc])

  // 未登录兜底（ProtectedRoute 已处理，这里是双保险）
  useEffect(() => {
    if (!currentUser) navigate('/login', { replace: true })
    // only at mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="app-shell">
      <div className="page-area">
        <Routes>
          <Route path="/" element={<ImmersiveFeedPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/home" element={<Home />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/create/simple" element={<Create />} />
          <Route path="/create-avatar" element={<CreateAvatarPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<Profile />} />
          <Route path="/works" element={<WorksPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/invites" element={<InvitePage />} />
          <Route path="/plaza" element={<PlazaPage />} />
          <Route path="/dev/fake-presence" element={<FakePresenceDebug />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <TabBar />
      <NotificationManager ref={notifRef} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<GoogleCallbackPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Shell />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
