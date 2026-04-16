import { createPortal } from 'react-dom'
import { useState } from 'react'
import CdnImg from '../../components/CdnImg'
import { t } from '../../utils/i18n'

type Props = {
  imageUrl: string | null
  onPublish: (caption: string | null) => void
  onSaveDraft: () => void
  publishing: boolean
}

export default function RemixDraftPanel({ imageUrl, onPublish, onSaveDraft, publishing }: Props) {
  const [caption, setCaption] = useState('')
  const [imgLoaded, setImgLoaded] = useState(false)

  const root = document.getElementById('root')
  if (!root) return null

  return createPortal(
    <>
      <style>{`
        @keyframes remixReveal { from { opacity: 0; transform: scale(0.96); filter: blur(6px); } to { opacity: 1; transform: scale(1); filter: blur(0); } }
        @keyframes remixDot { from { opacity: 0.4; transform: scale(0.8); } to { opacity: 1; transform: scale(1.2); } }
        @keyframes remixActionsIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: '#000',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* 顶部栏 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          flexShrink: 0,
        }}>
          <button onClick={onSaveDraft} disabled={publishing} style={{
            background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: 'linear-gradient(135deg, #6c5ce7, #a855f7)',
              color: '#fff', fontSize: 11, fontWeight: 700,
              padding: '2px 8px', borderRadius: 8, letterSpacing: 0.5,
            }}>
              REMIX
            </span>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{t('remix.draftTitle')}</span>
          </div>
          <div style={{ width: 32 }} />
        </div>

        {/* 可滚动内容区 */}
        <div style={{
          flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '12px 16px',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
          gap: 20,
        }}>
          {/* 图片卡片 */}
          <div style={{
            width: '100%', maxWidth: 480, flexShrink: 0, position: 'relative',
            borderRadius: 16, overflow: 'hidden', background: '#111', minHeight: 120,
          }}>
            {!imgLoaded && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'rgba(168,85,247,0.7)',
                    animation: `remixDot 0.6s ease-in-out infinite alternate ${i * 0.15}s`,
                  }} />
                ))}
              </div>
            )}
            {imageUrl && (
              <CdnImg
                src={imageUrl}
                alt=""
                style={imgLoaded
                  ? { display: 'block', width: '100%', borderRadius: 16,
                      animation: 'remixReveal 0.65s cubic-bezier(0.34, 1.1, 0.64, 1) forwards' }
                  : { position: 'absolute', width: 0, height: 0, opacity: 0 }}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgLoaded(true)}
              />
            )}
          </div>

          {/* 输入 + 按钮 */}
          {imgLoaded && (
            <div style={{
              width: '100%', maxWidth: 480,
              display: 'flex', flexDirection: 'column', gap: 14,
              animation: 'remixActionsIn 0.35s ease both',
            }}>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder={t('post.captionPlaceholder')}
                maxLength={200}
                rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10, padding: '10px 12px',
                  color: '#fff', fontSize: 14, lineHeight: 1.5,
                  resize: 'none', outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => onPublish(caption.trim() || null)}
                disabled={publishing}
                style={{
                  width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
                  background: publishing ? 'rgba(108,92,231,0.5)' : 'linear-gradient(135deg, #6c5ce7, #a855f7)',
                  color: '#fff', fontSize: 16, fontWeight: 700,
                  cursor: publishing ? 'default' : 'pointer',
                  letterSpacing: 1,
                  boxShadow: '0 4px 20px rgba(108,92,231,0.4)',
                }}
              >
                {publishing ? t('remix.creating') : t('remix.publishNow')}
              </button>
              <button
                onClick={onSaveDraft}
                disabled={publishing}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: 500,
                  cursor: publishing ? 'default' : 'pointer',
                }}
              >
                {t('remix.saveDraft')}
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    root,
  )
}
