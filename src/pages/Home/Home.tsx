import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useCurrentUser,
  useDeletePost,
  useUserPosts,
  type UserPost,
} from '@chataigram/core'
import CdnImg from '../../components/CdnImg'
import { getProfile } from '../../utils/profile-storage'
import './Home.css'

/**
 * 用户主页（自己的作品 masonry + 发布/删除入口）。
 *
 * 和原 Home.jsx 不同：原版 getPhotos 是 localStorage 本地相册，
 * 新版用 useUserPosts 拉服务端已发布帖子。删除走 useDeletePost。
 */
export default function Home() {
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()
  const [lightbox, setLightbox] = useState<UserPost | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const touchStartY = useRef(0)
  const touchStartX = useRef(0)

  const { data: postsData } = useUserPosts(currentUser?.id ?? null, { limit: 30 })
  const deletePost = useDeletePost()
  const posts = postsData?.posts ?? []

  const profile = getProfile() // 本地昵称 / 头像显示

  const handleDelete = (id: number) => {
    deletePost.mutate(id, {
      onSuccess: () => {
        setLightbox(null)
        setConfirmDelete(null)
      },
    })
  }

  const handleLightboxSwipe = (e: React.TouchEvent) => {
    const t = e.changedTouches[0]
    if (!t) return
    const dx = touchStartX.current - t.clientX
    const dy = touchStartY.current - t.clientY
    if (Math.abs(dy) > Math.abs(dx) && dy > 60) {
      setLightbox(null)
    }
  }

  return (
    <div className="home">
      <div className="home-topbar">
        <button
          type="button"
          className="avatar-btn"
          onClick={() => navigate('/profile')}
          aria-label="profile"
        >
          {profile.avatar ? (
            <CdnImg src={profile.avatar} alt="avatar" className="avatar-img" />
          ) : (
            <div className="avatar-placeholder">{profile.name.charAt(0).toUpperCase()}</div>
          )}
        </button>

        <span className="home-logo">ChatAigram</span>

        <button
          type="button"
          className="add-btn"
          onClick={() => navigate('/create')}
          aria-label="create"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div className="feed-scroll">
        {posts.length === 0 ? (
          <div className="feed-empty">
            <div className="feed-empty-icon">
              <svg
                width="56"
                height="56"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M3 9l4.5-4.5a2 2 0 0 1 2.83 0L21 15" />
                <circle cx="8.5" cy="8.5" r="1.5" />
              </svg>
            </div>
            <p className="feed-empty-title">Your feed is empty</p>
            <p className="feed-empty-sub">
              Tap <strong>+</strong> to generate your first image
            </p>
          </div>
        ) : (
          <div className="masonry-grid">
            {posts.map((post) => (
              <div key={post.id} className="masonry-item" onClick={() => setLightbox(post)}>
                <CdnImg
                  src={post.photoUrl}
                  alt={post.optional ?? ''}
                  loading="lazy"
                  className="masonry-img"
                />
                {post.optional && <div className="masonry-caption">{post.optional}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightbox(null)}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? 0
            touchStartY.current = e.touches[0]?.clientY ?? 0
          }}
          onTouchEnd={handleLightboxSwipe}
        >
          <div className="lightbox-header" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setLightbox(null)}
              aria-label="close"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              className="lightbox-delete"
              onClick={() => setConfirmDelete(lightbox.id)}
              aria-label="delete"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          </div>

          <CdnImg
            src={lightbox.photoUrl}
            alt={lightbox.optional ?? ''}
            className="lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />

          {lightbox.optional && (
            <div className="lightbox-prompt" onClick={(e) => e.stopPropagation()}>
              {lightbox.optional}
            </div>
          )}
        </div>
      )}

      {confirmDelete != null && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-title">Delete this photo?</p>
            <p className="confirm-sub">This action cannot be undone.</p>
            <button
              type="button"
              className="confirm-delete-btn"
              onClick={() => handleDelete(confirmDelete)}
              disabled={deletePost.isPending}
            >
              {deletePost.isPending ? 'Deleting…' : 'Delete'}
            </button>
            <button
              type="button"
              className="confirm-cancel-btn"
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
