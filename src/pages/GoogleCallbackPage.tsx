import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseGoogleCallback, useSetCurrentUser } from '@chataigram/core'

/**
 * Google OAuth 回调页。
 *
 * 后端 OAuth 完成后重定向到 /auth/callback?user_id=&name=&username=&avatar=
 * 这里解析 query，写入登录态，跳回首页。失败跳 /login。
 */
export default function GoogleCallbackPage() {
  const navigate = useNavigate()
  const setCurrentUser = useSetCurrentUser()

  useEffect(() => {
    const user = parseGoogleCallback(window.location.search)
    if (user) {
      setCurrentUser(user)
      navigate('/', { replace: true })
    } else {
      navigate('/login?error=oauth', { replace: true })
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg)',
        color: 'var(--text-secondary)',
        fontSize: 14,
      }}
    >
      Signing in…
    </div>
  )
}
