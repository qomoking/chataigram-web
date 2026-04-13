import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Notification } from '@chataigram/core'
import { useMarkRead } from '@chataigram/core'
import { t, type NotifContent } from '../utils/i18n'
import CdnImg from './CdnImg'
import './UnseenBubble.css'

const MAX_DISPLAY = 3

function getHintText(notification: Notification): string {
  const kind = notification.kind || 'mention'
  if (kind === 'remix') return t('notification.remixedYouHint')
  if (kind === 'like' || kind === 'reaction') return t('notification.reactedYouHint')
  return t('notification.mentionedYouHint')
}

type UnseenBubbleProps = {
  notifications: Notification[]
  onDismiss: () => void
  onOpenPreview?: (n: Notification) => void
}

/**
 * 沉浸式 feed 上悬浮的"有新消息"气泡。
 * 收起：只显示头像叠堆 + 数字；展开：显示最多 3 条；再多 → 「查看全部 → /inbox」
 */
export default function UnseenBubble({
  notifications,
  onDismiss,
  onOpenPreview,
}: UnseenBubbleProps) {
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const startY = useRef<number | null>(null)
  const navigate = useNavigate()
  const markRead = useMarkRead()

  const count = notifications.length
  const displayList = notifications.slice(0, MAX_DISPLAY)

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    setTimeout(() => onDismiss(), 300)
  }, [onDismiss])

  const handleBubbleTap = useCallback(() => {
    if (expanded) return
    setExpanded(true)
  }, [expanded])

  const handleItemTap = useCallback(
    (notif: Notification) => {
      markRead.mutate([notif.id])
      if (onOpenPreview) {
        onOpenPreview(notif)
        handleDismiss()
      }
    },
    [onOpenPreview, handleDismiss, markRead],
  )

  const handleViewAll = useCallback(() => {
    handleDismiss()
    navigate('/inbox')
  }, [handleDismiss, navigate])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0]?.clientY ?? null
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const end = e.changedTouches[0]?.clientY
      if (startY.current != null && end != null && end - startY.current < -30) {
        handleDismiss()
      }
      startY.current = null
    },
    [handleDismiss],
  )

  if (dismissed || count === 0) return null

  // 取最多 3 个唯一 sender 作为头像栈
  const senders: Notification['sender'][] = []
  const seen = new Set<number>()
  for (const n of notifications) {
    if (seen.has(n.sender.id)) continue
    seen.add(n.sender.id)
    senders.push(n.sender)
    if (senders.length >= 3) break
  }

  const label = count === 1 ? t('unseen.newMessage') : t('unseen.newMessages', { n: count })

  return (
    <div
      className={`unseen-bubble-wrap${expanded ? ' expanded' : ''}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {!expanded && (
        <div className="unseen-pill" onClick={handleBubbleTap}>
          <div className="unseen-pill-avatars">
            {senders.map((s, i) => (
              <div
                key={s.id}
                className="unseen-pill-avatar"
                style={{ zIndex: 3 - i }}
              >
                {s.avatarUrl ? (
                  <CdnImg src={s.avatarUrl} alt="" />
                ) : (
                  <span className="unseen-pill-initial">
                    {(s.name || '?')[0]?.toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>
          <span className="unseen-pill-label">{label}</span>
          <span className="unseen-pill-arrow">›</span>
        </div>
      )}

      {expanded && (
        <div
          className="unseen-list-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleDismiss()
          }}
        >
          <div className="unseen-list">
            <div className="unseen-list-handle" />
            {displayList.map((notif) => {
              const sender = notif.sender
              const content = (typeof notif.content === 'object'
                ? notif.content
                : null) as NotifContent | null
              const avatar = sender.avatarUrl
              const initial = (sender.name || '?')[0]?.toUpperCase() ?? '?'
              const previewText =
                typeof content?.['previewText'] === 'string' ? content['previewText'] : null
              const resultUrl =
                typeof content?.['resultUrl'] === 'string' ? content['resultUrl'] : null
              return (
                <div
                  key={notif.id}
                  className="unseen-list-item"
                  onClick={() => handleItemTap(notif)}
                >
                  <div className="unseen-list-avatar">
                    {avatar ? (
                      <CdnImg src={avatar} alt="" />
                    ) : (
                      <span className="unseen-list-initial">{initial}</span>
                    )}
                  </div>
                  <div className="unseen-list-body">
                    <div className="unseen-list-title">
                      <strong>{sender.name}</strong>
                      <span className="unseen-list-hint">{getHintText(notif)}</span>
                    </div>
                    {previewText && <div className="unseen-list-preview">{previewText}</div>}
                  </div>
                  {resultUrl && (
                    <div className="unseen-list-thumb">
                      <CdnImg src={resultUrl} alt="" />
                    </div>
                  )}
                </div>
              )
            })}
            {count > MAX_DISPLAY && (
              <button type="button" className="unseen-list-viewall" onClick={handleViewAll}>
                {t('unseen.viewAll')} ({count})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
