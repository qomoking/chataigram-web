import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CdnImg from '../../components/CdnImg'
import { getProfile, saveProfile, type LocalProfile } from '../../utils/profile-storage'
import './Profile.css'

/**
 * 简单的本地 profile 编辑页（昵称 + 头像），存 localStorage。
 * 后端真实 user 资料编辑在 core 还没 ready；用 LocalProfile 暂存。
 */
export default function Profile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<LocalProfile>(getProfile)
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(profile.name)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = typeof ev.target?.result === 'string' ? ev.target.result : null
      const updated: LocalProfile = { ...profile, avatar: dataUrl }
      setProfile(updated)
      saveProfile(updated)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveName = () => {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    const updated: LocalProfile = { ...profile, name: trimmed }
    setProfile(updated)
    saveProfile(updated)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="back">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="profile-title">Profile</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="profile-body">
        <div className="avatar-section">
          <button
            type="button"
            className="avatar-large-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            {profile.avatar ? (
              <CdnImg src={profile.avatar} alt="avatar" className="avatar-large-img" />
            ) : (
              <div className="avatar-large-placeholder">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="avatar-edit-badge">
              <svg
                width="14"
                height="14"
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
          <p className="avatar-hint">Tap to change avatar</p>
        </div>

        <div className="profile-field">
          <label className="field-label">Display Name</label>
          {editing ? (
            <div className="name-edit-row">
              <input
                className="name-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                autoFocus
                maxLength={30}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              />
              <button type="button" className="save-name-btn" onClick={handleSaveName}>
                Save
              </button>
            </div>
          ) : (
            <div
              className="name-display-row"
              onClick={() => {
                setEditing(true)
                setNameInput(profile.name)
              }}
            >
              <span className="name-display">{profile.name}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ opacity: 0.4 }}
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
          )}
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-num">0</span>
            <span className="stat-label">Photos</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">∞</span>
            <span className="stat-label">Ideas</span>
          </div>
        </div>

        {saved && <div className="saved-toast">Saved!</div>}
      </div>
    </div>
  )
}
