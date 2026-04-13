import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useCurrentUser,
  useDeletePost,
  usePublishPost,
  useUserPosts,
  type UserPost,
} from '@chataigram/core'
import CdnImg from '../../components/CdnImg'
import { t } from '../../utils/i18n'
import './WorksPage.css'

type Tab = 'published' | 'drafts'

/**
 * 用户作品页：已发布 / 草稿 两个 tab，masonry 列表，长按出 action sheet，
 * 点击出 lightbox。对齐 frontend/WorksPage.jsx 行为。
 */
export default function WorksPage() {
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()
  const [tab, setTab] = useState<Tab>('published')
  const [lightbox, setLightbox] = useState<(UserPost & { isDraft: boolean }) | null>(null)
  const [actionSheet, setActionSheet] = useState<
    | { item: UserPost; isDraft: boolean }
    | null
  >(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [pressedId, setPressedId] = useState<number | null>(null)

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)

  const publishedQuery = useUserPosts(currentUser?.id ?? null, {
    status: 'published',
    limit: 20,
  })
  const draftsQuery = useUserPosts(currentUser?.id ?? null, {
    status: 'draft',
    limit: 20,
  })

  const publishPost = usePublishPost()
  const deletePost = useDeletePost()

  const items = (tab === 'published' ? publishedQuery.data?.posts : draftsQuery.data?.posts) ?? []
  const loading = tab === 'published' ? publishedQuery.isLoading : draftsQuery.isLoading
  const col1 = items.filter((_, i) => i % 2 === 0)
  const col2 = items.filter((_, i) => i % 2 === 1)

  const closeLightbox = () => setLightbox(null)
  const closeActionSheet = () => {
    setActionSheet(null)
    setConfirmingDelete(false)
  }

  const handleDeletePost = (id: number) => {
    deletePost.mutate(id, {
      onSuccess: () => {
        closeLightbox()
        closeActionSheet()
      },
    })
  }

  const handlePublishDraft = (draft: UserPost) => {
    publishPost.mutate(draft.id, {
      onSuccess: () => {
        closeLightbox()
        closeActionSheet()
      },
    })
  }

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setPressedId(null)
  }

  const handlePressStart = (item: UserPost, isDraft: boolean) => {
    didLongPress.current = false
    setPressedId(item.id)
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      setPressedId(null)
      if (navigator.vibrate) navigator.vibrate(30)
      setActionSheet({ item, isDraft })
      setConfirmingDelete(false)
    }, 500)
  }

  const handleCardClick = (item: UserPost, isDraft: boolean) => {
    if (didLongPress.current) {
      didLongPress.current = false
      return
    }
    setLightbox({ ...item, isDraft })
  }

  const handleActionDelete = () => {
    if (!actionSheet) return
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    handleDeletePost(actionSheet.item.id)
  }

  const renderCard = (item: UserPost, isDraft: boolean) => (
    <div
      key={item.id}
      className={`works-card${pressedId === item.id ? ' pressing' : ''}`}
      onClick={() => handleCardClick(item, isDraft)}
      onTouchStart={() => handlePressStart(item, isDraft)}
      onTouchEnd={clearLongPress}
      onTouchMove={clearLongPress}
      onMouseDown={() => handlePressStart(item, isDraft)}
      onMouseUp={clearLongPress}
      onMouseLeave={clearLongPress}
      onContextMenu={(e) => e.preventDefault()}
    >
      <CdnImg src={item.photoUrl} alt={item.optional ?? ''} className="works-thumb" loading="lazy" />
    </div>
  )

  return (
    <div className="works-page">
      <div className="works-topbar">
        <button type="button" className="works-back" onClick={() => navigate(-1)} aria-label="back">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="works-title">{t('profile.works')}</span>
      </div>

      <div className="works-tabs">
        <button
          type="button"
          className={`works-tab${tab === 'published' ? ' active' : ''}`}
          onClick={() => setTab('published')}
        >
          {t('profile.published')} ({(publishedQuery.data?.posts ?? []).length}
          {publishedQuery.data?.hasMore ? '+' : ''})
        </button>
        <button
          type="button"
          className={`works-tab${tab === 'drafts' ? ' active' : ''}`}
          onClick={() => setTab('drafts')}
        >
          {t('profile.drafts')} ({(draftsQuery.data?.posts ?? []).length}
          {draftsQuery.data?.hasMore ? '+' : ''})
        </button>
      </div>

      <div className="works-scroll">
        {loading ? (
          <div className="works-empty">
            <div className="works-spinner" />
          </div>
        ) : items.length === 0 ? (
          <div className="works-empty">
            <span className="works-empty-icon">{tab === 'published' ? '✦' : '◻'}</span>
            <p>{tab === 'published' ? t('profile.noPublished') : t('profile.noDrafts')}</p>
          </div>
        ) : (
          <div className="works-grid">
            <div className="works-col">{col1.map((item) => renderCard(item, tab === 'drafts'))}</div>
            <div className="works-col">{col2.map((item) => renderCard(item, tab === 'drafts'))}</div>
          </div>
        )}
      </div>

      {lightbox && (
        <div className="works-lb-overlay" onClick={closeLightbox}>
          <div className="works-lb-box" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="works-lb-close"
              onClick={closeLightbox}
              aria-label="close"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <CdnImg
              src={lightbox.photoUrl}
              alt={lightbox.optional ?? ''}
              className="works-lb-img"
            />
            {lightbox.optional && <p className="works-lb-caption">{lightbox.optional}</p>}
            <div className="works-lb-btns">
              {lightbox.isDraft ? (
                <>
                  <button
                    type="button"
                    className="works-lb-publish"
                    onClick={() => handlePublishDraft(lightbox)}
                    disabled={publishPost.isPending}
                  >
                    {t('profile.publishToFeed')}
                  </button>
                  <button
                    type="button"
                    className="works-lb-delete"
                    onClick={() => handleDeletePost(lightbox.id)}
                    disabled={deletePost.isPending}
                  >
                    {t('profile.deleteDraft')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="works-lb-delete"
                  onClick={() => handleDeletePost(lightbox.id)}
                  disabled={deletePost.isPending}
                >
                  {t('profile.deletePost')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {actionSheet && (
        <div className="works-as-overlay" onClick={closeActionSheet}>
          <div className="works-as-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="works-as-preview">
              <CdnImg src={actionSheet.item.photoUrl} alt="" className="works-as-thumb" />
              {actionSheet.item.optional && (
                <p className="works-as-prompt">{actionSheet.item.optional}</p>
              )}
            </div>
            <div className="works-as-actions">
              {actionSheet.isDraft && (
                <button
                  type="button"
                  className="works-as-btn publish"
                  onClick={() => handlePublishDraft(actionSheet.item)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                  {t('profile.publishToFeed')}
                </button>
              )}
              <button
                type="button"
                className={`works-as-btn delete${confirmingDelete ? ' confirming' : ''}`}
                onClick={handleActionDelete}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                {confirmingDelete
                  ? t('profile.confirmDelete')
                  : actionSheet.isDraft
                    ? t('profile.deleteDraft')
                    : t('profile.deletePost')}
              </button>
            </div>
            <button type="button" className="works-as-cancel" onClick={closeActionSheet}>
              {t('profile.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
