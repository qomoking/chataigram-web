import { useNavigate } from 'react-router-dom'
import type { Post } from '@chataigram/core'

type CameraFlowProps = {
  onPost?: (post: Post) => void
  onClose: () => void
}

/**
 * TODO(track-w/create): 完整拍摄 / 预览 / 生图流程还未迁完
 * （原 CameraFlow 1214 行，属于 Create 功能段）。
 * 目前点 TabBar 中间按钮 → 跳 /create 页面。
 */
export default function CameraFlow({ onClose }: CameraFlowProps) {
  const navigate = useNavigate()

  // 直接跳到 Create 页面；真正的相机 flow 后续补
  const handleOpen = () => {
    onClose()
    navigate('/create')
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        zIndex: 200,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          padding: 24,
          maxWidth: 320,
          textAlign: 'center',
          color: 'var(--text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
        <p style={{ marginBottom: 16, fontSize: 14 }}>
          相机流程迁移中，先走创建页。
        </p>
        <button
          type="button"
          onClick={handleOpen}
          style={{
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 50,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          去创建
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            color: 'var(--text-secondary)',
            border: 'none',
            padding: '10px',
            marginTop: 4,
            fontSize: 13,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          取消
        </button>
      </div>
    </div>
  )
}
