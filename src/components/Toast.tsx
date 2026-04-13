import { useEffect, useRef } from 'react'
import type { Notification } from '@chataigram/core'
import CdnImg from './CdnImg'
import { localizeNotifContent } from '../utils/i18n'
import type { NotifContent } from '../utils/i18n'
import './Toast.css'

type ToastProps = {
  notification: Notification
  onTap: () => void
  onDismiss: () => void
}

/**
 * 通知 Toast —— 顶部滑入，6 秒自动消失，上滑手势手动消失。
 * `content.liveText` 存在 → live activity 布局；否则 → 经典布局。
 */
export default function Toast({ notification, onTap, onDismiss }: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startY = useRef<number | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(), 6000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onDismiss])

  const sender = notification.sender
  const raw = (typeof notification.content === 'object' ? notification.content : null) as
    | NotifContent
    | null
  const content = localizeNotifContent(raw)
  const avatar = sender.avatarUrl
  const initial = (sender.name || '?')[0]?.toUpperCase() ?? '?'
  const isLive = Boolean(content.liveText)
  const resultUrl = typeof content['resultUrl'] === 'string' ? content['resultUrl'] : null

  function handleTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0]?.clientY ?? null
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const end = e.changedTouches[0]?.clientY
    if (startY.current != null && end != null) {
      if (end - startY.current < -30) onDismiss()
    }
    startY.current = null
  }

  if (isLive) {
    return (
      <div
        className="notif-toast notif-toast--live"
        onClick={onTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="notif-toast-live-avatar-wrap">
          <div className="notif-toast-avatar notif-toast-avatar--sm">
            {avatar ? (
              <CdnImg src={avatar} alt="" />
            ) : (
              <span className="notif-toast-initial">{initial}</span>
            )}
          </div>
          <div className="notif-toast-live-dot" aria-hidden="true" />
        </div>

        <div className="notif-toast-body">
          <div className="notif-toast-live-text">{content.liveText}</div>
          <div className="notif-toast-live-sender">
            {sender.name && (
              <span className="notif-toast-live-name">{sender.name}</span>
            )}
            {content.previewText && (
              <span className="notif-toast-live-sub">{content.previewText}</span>
            )}
          </div>
        </div>

        {resultUrl && (
          <div className="notif-toast-thumb">
            <CdnImg src={resultUrl} alt="" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="notif-toast"
      onClick={onTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="notif-toast-avatar">
        {avatar ? (
          <CdnImg src={avatar} alt="" />
        ) : (
          <span className="notif-toast-initial">{initial}</span>
        )}
      </div>
      <div className="notif-toast-body">
        <div className="notif-toast-title">
          <strong>{sender.name}</strong>
        </div>
        {content.previewText && (
          <div className="notif-toast-preview">{content.previewText}</div>
        )}
      </div>
      {resultUrl && (
        <div className="notif-toast-thumb">
          <CdnImg src={resultUrl} alt="" />
        </div>
      )}
    </div>
  )
}
