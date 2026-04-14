import { useEffect, useMemo, useState } from 'react'
import { useInbox, useMarkRead, type Notification } from '@chataigram/core'
import CdnImg from '../../components/CdnImg'
import PreviewCard from '../../components/PreviewCard'
import PageHeader from '../../components/PageHeader'
import { ListSkeleton } from '../../components/Skeleton'
import { localizeNotifContent, t, type NotifContent } from '../../utils/i18n'
import './InboxPage.css'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function InboxPage() {
  const { data, isLoading } = useInbox({ limit: 50 })
  const markRead = useMarkRead()
  const [preview, setPreview] = useState<Notification | null>(null)

  const notifications = useMemo(() => data?.notifications ?? [], [data])

  // 进入时标记全部为已读（后台操作，忽略错误）
  useEffect(() => {
    const ids = notifications.filter((n) => !n.isRead).map((n) => n.id)
    if (ids.length > 0) markRead.mutate(ids)
    // intentionally run once per snapshot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length])

  return (
    <div className="inbox-page">
      <PageHeader title={t('profile.inbox')} backTo="/profile" />

      <div className="inbox-scroll">
        {isLoading && <ListSkeleton count={5} />}

        {!isLoading && notifications.length === 0 && (
          <div className="inbox-empty">
            <span className="inbox-empty-icon">💬</span>
            <p>{t('inbox.empty')}</p>
          </div>
        )}

        {notifications.map((notif) => {
          const sender = notif.sender
          const rawContent = (typeof notif.content === 'object'
            ? notif.content
            : null) as NotifContent | null
          const content = localizeNotifContent(rawContent)
          const initial = (sender.name || '?')[0]?.toUpperCase() ?? '?'
          const previewText =
            typeof content['previewText'] === 'string' ? content['previewText'] : null
          const resultUrl =
            typeof content['resultUrl'] === 'string' ? content['resultUrl'] : null

          return (
            <button
              key={notif.id}
              type="button"
              className="inbox-item"
              onClick={() => setPreview(notif)}
            >
              <div className="inbox-avatar">
                {sender.avatarUrl ? (
                  <CdnImg src={sender.avatarUrl} alt="" />
                ) : (
                  <span className="inbox-initial">{initial}</span>
                )}
              </div>
              <div className="inbox-body">
                <div className="inbox-line1">
                  {content.liveText ? (
                    <span className="inbox-live-text">{content.liveText}</span>
                  ) : (
                    <strong>{sender.name}</strong>
                  )}
                  <span className="inbox-time">{timeAgo(notif.createdAt)}</span>
                </div>
                <span className="inbox-hint">
                  {content.liveText ? (
                    <>
                      <span className="inbox-hint-name">{sender.name}</span>
                      {previewText ? ` · ${previewText}` : ''}
                    </>
                  ) : (
                    previewText ?? t('notification.remixedYouHint')
                  )}
                </span>
              </div>
              {resultUrl && <CdnImg src={resultUrl} alt="" className="inbox-thumb" />}
            </button>
          )
        })}
      </div>

      {preview && <PreviewCard notification={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
