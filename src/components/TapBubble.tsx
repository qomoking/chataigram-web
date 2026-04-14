/**
 * TapBubble —— 单击图片后的交互气泡。
 *
 * 动画状态机：null → 'waiting'（涟漪 + 光点）→ 'label'（药丸出现）→ 'done'（药丸收缩）→ null
 *
 * 迁自 frontend/src/pages/ImmersiveFeedPage.jsx TapBubble。
 */
import { createPortal } from 'react-dom'

export type TapBubblePhase = 'waiting' | 'label' | 'done' | null

type TapBubbleProps = {
  phase: TapBubblePhase
  label: string
  clientX: number
  clientY: number
}

export default function TapBubble({ phase, label, clientX, clientY }: TapBubbleProps) {
  if (!phase) return null

  const isTopHalf = clientY < window.innerHeight * 0.5
  const pillOffsetY = isTopHalf ? 32 : -32
  const triangleDir = isTopHalf ? 'up' : 'down'
  const pillLeft = Math.max(60, Math.min(clientX, window.innerWidth - 60))

  const root = document.getElementById('root')
  if (!root) return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9997, pointerEvents: 'none' }}>
      <style>{`
        @keyframes tapDotEnter {
          0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          50%  { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes tapDotBreathe {
          0%, 100% { transform: translate(-50%, -50%) scale(0.85); box-shadow: 0 0 12px rgba(168,85,247,0.6); }
          50%      { transform: translate(-50%, -50%) scale(1.15); box-shadow: 0 0 24px rgba(224,64,251,0.9); }
        }
        @keyframes tapRipple0 {
          0%   { transform: translate(-50%, -50%) scale(0.25); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
        @keyframes tapRipple1 {
          0%   { transform: translate(-50%, -50%) scale(0.25); opacity: 0.48; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
        @keyframes tapRipple2 {
          0%   { transform: translate(-50%, -50%) scale(0.25); opacity: 0.36; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
        @keyframes tapRipple3 {
          0%   { transform: translate(-50%, -50%) scale(0.25); opacity: 0.24; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
        @keyframes tapPillEnter {
          0%   { opacity: 0; transform: translate(-50%, ${isTopHalf ? '-8px' : '8px'}) scale(0.8); filter: blur(6px); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); filter: blur(0); }
        }
        @keyframes tapPillShrink {
          0%   { transform: translate(-50%, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, ${isTopHalf ? '-8px' : '8px'}) scale(0.85); opacity: 0.7; }
        }
      `}</style>

      {/* 涟漪：点击瞬间向外扩散 */}
      {phase === 'waiting' && [0, 1, 2, 3].map(i => (
        <div key={`tap-ripple-${i}`} style={{
          position: 'fixed', left: clientX, top: clientY,
          width: 280, height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.35) 0%, rgba(168,85,247,0.12) 40%, rgba(168,85,247,0) 100%)',
          animation: `tapRipple${i} ${1.0 + i * 0.15}s ${i * 0.2}s ease-out forwards`,
          transform: 'translate(-50%, -50%) scale(0.25)',
        }} />
      ))}

      {/* 中心光点：waiting 时大且呼吸，label/done 时缩小 */}
      <div style={{
        position: 'fixed', left: clientX, top: clientY,
        width: phase === 'label' || phase === 'done' ? 8 : 44,
        height: phase === 'label' || phase === 'done' ? 8 : 44,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(224,64,251,1) 0%, rgba(168,85,247,0.5) 50%, rgba(168,85,247,0) 100%)',
        boxShadow: '0 0 16px rgba(224,64,251,0.5)',
        animation: phase === 'waiting'
          ? 'tapDotEnter 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards, tapDotBreathe 1.5s 0.3s ease-in-out infinite'
          : 'none',
        transform: 'translate(-50%, -50%)',
        transition: phase !== 'waiting' ? 'width 0.3s ease, height 0.3s ease' : 'none',
      }} />

      {/* 标签药丸：label/done 阶段出现 */}
      {(phase === 'label' || phase === 'done') && label && (
        <div style={{
          position: 'fixed',
          left: pillLeft,
          top: clientY + pillOffsetY,
          transform: 'translate(-50%, 0)',
          animation: phase === 'label'
            ? 'tapPillEnter 0.4s ease forwards'
            : 'tapPillShrink 0.35s ease forwards',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          {triangleDir === 'up' && (
            <div style={{
              width: 0, height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid rgba(8,8,18,0.55)',
              marginBottom: -1,
            }} />
          )}
          <div style={{
            background: 'rgba(8,8,18,0.55)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 14,
            padding: '7px 14px',
            maxWidth: 180,
          }}>
            <span style={{
              color: '#fff', fontSize: 13.5, fontWeight: 600, lineHeight: 1.5,
              whiteSpace: 'nowrap',
            }}>
              {label}
            </span>
          </div>
          {triangleDir === 'down' && (
            <div style={{
              width: 0, height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid rgba(8,8,18,0.55)',
              marginTop: -1,
            }} />
          )}
        </div>
      )}
    </div>,
    root,
  )
}
