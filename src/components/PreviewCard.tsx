import type { Notification } from '@chataigram/core'
import CdnImg from './CdnImg'
import { localizeNotifContent, t, type NotifContent } from '../utils/i18n'
import './PreviewCard.css'

type PreviewCardProps = {
  notification: Notification
  onClose: () => void
  onLike?: (n: Notification) => void
}

export default function PreviewCard({ notification, onClose, onLike }: PreviewCardProps) {
  const raw = (typeof notification.content === 'object' ? notification.content : null) as
    | NotifContent
    | null
  const content = localizeNotifContent(raw)
  const sender = notification.sender
  const resultUrl = typeof content['resultUrl'] === 'string' ? content['resultUrl'] : null

  return (
    <div className="preview-backdrop" onClick={onClose}>
      <div className="preview-card" onClick={(e) => e.stopPropagation()}>
        <div className="preview-sender">
          <div className="preview-avatar">
            {sender.avatarUrl ? (
              <CdnImg src={sender.avatarUrl} alt="" />
            ) : (
              sender.name.charAt(0)
            )}
          </div>
          <div>
            <div className="preview-name">{sender.name}</div>
            <div className="preview-kind">{notification.kind}</div>
          </div>
        </div>

        {content.liveText && <div className="preview-live">{content.liveText}</div>}
        {content.previewText && <div className="preview-text">{content.previewText}</div>}

        {resultUrl && (
          <div className="preview-image">
            <CdnImg src={resultUrl} alt="" />
          </div>
        )}

        <div className="preview-actions">
          {onLike && (
            <button type="button" className="preview-btn-like" onClick={() => onLike(notification)}>
              {t('notification.like')}
            </button>
          )}
          <button type="button" className="preview-btn-close" onClick={onClose}>
            {t('profile.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
