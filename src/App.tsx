import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useCurrentUser } from '@chataigram/core'
import FeedPage from './pages/FeedPage/FeedPage'
import LoginPage from './pages/LoginPage/LoginPage'
import GoogleCallbackPage from './pages/GoogleCallbackPage'

/**
 * 路由守卫：未登录 → /login。
 * isLoading 时不 redirect（避免跳闪），直接 render nothing 一瞬。
 */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser()
  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <FeedPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<GoogleCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
