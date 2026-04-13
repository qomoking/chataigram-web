import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import type { Notification } from '@chataigram/core'
import { useMarkRead } from '@chataigram/core'
import Toast from './Toast'
import PreviewCard from './PreviewCard'

export type NotificationManagerHandle = {
  enqueue: (notification: Notification) => void
}

type NotificationManagerProps = {
  /** 用户正在打字 / 生成时延迟 toast 显示 */
  isUserActive?: boolean
  /** 父组件可以挂钩 PreviewCard 点赞 */
  onLike?: (n: Notification) => void
  /** 父组件订阅系统消息，用于把通知注入聊天流等场景 */
  onSystemMessage?: (n: Notification) => void
}

/**
 * 通知队列 + Toast + PreviewCard 的调度器。
 * 父组件通过 ref 调 `enqueue(notification)` 入队，内部按 toast 生命周期逐条展示。
 *
 * 迁自 frontend/src/components/NotificationManager.jsx。
 */
const NotificationManager = forwardRef<NotificationManagerHandle, NotificationManagerProps>(
  function NotificationManager({ isUserActive = false, onLike, onSystemMessage }, ref) {
    const [queue, setQueue] = useState<Notification[]>([])
    const [activeToast, setActiveToast] = useState<Notification | null>(null)
    const [previewCard, setPreviewCard] = useState<Notification | null>(null)
    const markRead = useMarkRead()

    useImperativeHandle(ref, () => ({
      enqueue(notification) {
        setQueue((q) => [...q, notification])
        onSystemMessage?.(notification)
        // 兼容原 frontend 的事件广播（CreatePage 等监听）
        window.dispatchEvent(
          new CustomEvent('omnient:system-notification', { detail: notification }),
        )
      },
    }))

    // 监听来自其他位置的 "open preview" 事件
    useEffect(() => {
      function handleOpenPreview(e: Event) {
        const ce = e as CustomEvent<Notification>
        if (ce.detail) setPreviewCard(ce.detail)
      }
      window.addEventListener('omnient:open-preview', handleOpenPreview)
      return () => window.removeEventListener('omnient:open-preview', handleOpenPreview)
    }, [])

    // 从队列弹下一条
    useEffect(() => {
      if (activeToast || queue.length === 0 || isUserActive) return
      const next = queue[0]
      if (!next) return
      setQueue((q) => q.slice(1))
      setActiveToast(next)
    }, [queue, activeToast, isUserActive])

    const handleToastDismiss = useCallback(() => setActiveToast(null), [])

    const handleToastTap = useCallback(() => {
      const notif = activeToast
      setActiveToast(null)
      if (notif) {
        setPreviewCard(notif)
        markRead.mutate([notif.id])
      }
    }, [activeToast, markRead])

    const handlePreviewClose = useCallback(() => setPreviewCard(null), [])

    const handleLike = useCallback(
      (n: Notification) => {
        onLike?.(n)
        setTimeout(() => setPreviewCard(null), 800)
      },
      [onLike],
    )

    return (
      <>
        {activeToast && (
          <Toast
            notification={activeToast}
            onTap={handleToastTap}
            onDismiss={handleToastDismiss}
          />
        )}
        {previewCard && (
          <PreviewCard
            notification={previewCard}
            onClose={handlePreviewClose}
            onLike={handleLike}
          />
        )}
      </>
    )
  },
)

export default NotificationManager
