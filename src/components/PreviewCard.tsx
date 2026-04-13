import type { Notification } from '@chataigram/core'
import CdnImg from './CdnImg'
import { localizeNotifContent, type NotifContent } from '../utils/i18n'

type PreviewCardProps = {
  notification: Notification
  onClose: () => void
  onLike?: (n: Notification) => void
}

/**
 * 点击 Toast 后弹出的通知详情卡。
 * MVP 版：最小可用，点背景关闭；完整版（带结果大图 / 点赞按钮动画）后续补。
 */
export default function PreviewCard({ notification, onClose, onLike }: PreviewCardProps) {
  const raw = (typeof notification.content === 'object' ? notification.content : null) as
    | NotifContent
    | null
  const content = localizeNotifContent(raw)
  const sender = notification.sender
  const resultUrl = typeof content['resultUrl'] === 'string' ? content['resultUrl'] : null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          padding: 20,
          maxWidth: 380,
          width: '100%',
          color: 'var(--text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'var(--accent-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            {sender.avatarUrl ? (
              <CdnImg src={sender.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              sender.name.charAt(0)
            )}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{sender.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {notification.kind}
            </div>
          </div>
        </div>

        {content.liveText && (
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            {content.liveText}
          </div>
        )}

        {content.previewText && (
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
            {content.previewText}
          </div>
        )}

        {resultUrl && (
          <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden' }}>
            <CdnImg
              src={resultUrl}
              alt=""
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          {onLike && (
            <button
              type="button"
              onClick={() => onLike(notification)}
              style={{
                flex: 1,
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                padding: '10px',
                borderRadius: 50,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ❤ 赞
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1.5px solid var(--border)',
              padding: '10px',
              borderRadius: 50,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
