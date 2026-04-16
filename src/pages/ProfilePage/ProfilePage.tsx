import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCurrentUser, useLogout, useUnreadCount } from '@chataigram/core'
import CdnImg from '../../components/CdnImg'
import { getProfile, saveProfile, type LocalProfile } from '../../utils/profile-storage'
import { t } from '../../utils/i18n'
import './ProfilePage.css'

type LocationState = { avatarJustSet?: boolean } | null

function getInitialProfile(currentUser: { name: string; avatarUrl: string | null } | null): LocalProfile {
  const stored = getProfile()
  if (stored.name !== 'You' || stored.avatar) return stored
  if (currentUser) {
    return { name: currentUser.name || stored.name, avatar: currentUser.avatarUrl ?? stored.avatar }
  }
  return stored
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state: LocationState }
  const { data: currentUser } = useCurrentUser()
  const logout = useLogout()
  const { data: unread = 0 } = useUnreadCount()

  const [profile, setProfile] = useState<LocalProfile>(() =>
    getInitialProfile(currentUser ?? null),
  )
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(profile.name)
  const [avatarCelebrate, setAvatarCelebrate] = useState(false)

  // 从 CreateAvatarPage 回来时庆祝动画
  useEffect(() => {
    if (state?.avatarJustSet) {
      setProfile(getProfile())
      setAvatarCelebrate(true)
      const timer = setTimeout(() => setAvatarCelebrate(false), 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [state])

  const handleSaveName = useCallback(() => {
    const name = nameInput.trim() || profile.name
    const updated: LocalProfile = { ...profile, name }
    setProfile(updated)
    saveProfile(updated)
    setEditingName(false)
  }, [nameInput, profile])

  const handleSwitchAccount = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate('/login', { replace: true }),
    })
  }

  return (
    <div className="profile-page">
      <div className="profile-topbar">
        <span className="profile-topbar-title">{t('profile.me')}</span>
        <button type="button" className="switch-account-btn" onClick={handleSwitchAccount}>
          {t('profile.switchAccount')}
        </button>
      </div>

      <div className="profile-scroll">
        <div className="profile-hero">
          <button
            type="button"
            className={`avatar-wrap${avatarCelebrate ? ' celebrate' : ''}`}
            onClick={() => navigate('/create-avatar')}
          >
            {avatarCelebrate && (
              <div className="avatar-sparkles">
                {[...Array(6)].map((_, i) => (
                  <span key={i} />
                ))}
              </div>
            )}
            {profile.avatar ? (
              <CdnImg src={profile.avatar} alt="avatar" className="avatar-img" />
            ) : (
              <div className="avatar-fallback">{profile.name.charAt(0).toUpperCase()}</div>
            )}
            <div className="avatar-edit">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
          </button>

          {editingName ? (
            <div className="name-edit-row">
              <input
                className="name-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                autoFocus
                maxLength={30}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              />
              <button type="button" className="name-save-btn" onClick={handleSaveName}>
                {t('profile.save')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="name-display"
              onClick={() => {
                setEditingName(true)
                setNameInput(profile.name)
              }}
            >
              {profile.name}
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ marginLeft: 6, opacity: 0.4 }}
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          )}
        </div>

        <div className="profile-entries">
          <Entry
            icon="💬"
            label={t('profile.inbox')}
            onClick={() => navigate('/inbox')}
            badge={unread > 0 ? (unread > 99 ? '99+' : String(unread)) : null}
          />
          <Entry icon="🎨" label={t('profile.works')} onClick={() => navigate('/works')} />
          <Entry icon="🎟️" label={t('profile.invites')} onClick={() => navigate('/invites')} />
        </div>
      </div>
    </div>
  )
}

function Entry({
  icon,
  label,
  onClick,
  badge,
}: {
  icon: string
  label: string
  onClick: () => void
  badge?: string | null
}) {
  return (
    <button type="button" className="entry-card" onClick={onClick}>
      <div className="entry-left">
        <span className="entry-icon">{icon}</span>
        <span className="entry-label">{label}</span>
      </div>
      <div className="entry-right">
        {badge && <span className="entry-badge">{badge}</span>}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  )
}
