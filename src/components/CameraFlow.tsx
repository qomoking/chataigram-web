import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useCreatePost,
  useCurrentUser,
  usePhotoToImage,
  type PhotoToImageStep,
  type Post,
} from '@chataigram/core'
import { compressImage } from '../utils/image-compress'
import { t } from '../utils/i18n'

type CameraFlowProps = {
  onPost?: (post: Post) => void
  onClose: () => void
}

type Step = 'viewfinder' | 'loading' | 'result' | 'error'

const STEP_TO_PHASE: Record<PhotoToImageStep, number> = {
  upload: 0,
  describe: 1,
  prompt: 2,
  generate: 3,
}

const PHASE_LABEL_KEYS = [
  'camera.loadingPhase0',
  'camera.loadingPhase1',
  'camera.loadingPhase2',
  'camera.loadingPhase3',
] as const

/**
 * 拍照 → 一键生图（4 阶段 SSE pipeline）→ 编辑文案 → 发布。
 *
 * 迁自 frontend/components/CameraFlow.jsx，pipeline 走 core 的 usePhotoToImage。
 * 砍掉的：fallback file picker、SSE 进度的 elapsed UI 计时、虚拟键盘 viewport 跟随。
 */
export default function CameraFlow({ onPost, onClose }: CameraFlowProps) {
  const { data: currentUser } = useCurrentUser()
  const photoToImage = usePhotoToImage()
  const createPost = useCreatePost()

  const [step, setStep] = useState<Step>('viewfinder')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultPrompt, setResultPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState(0)
  const [caption, setCaption] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const runPipeline = useCallback(
    async (raw: Blob) => {
      if (!currentUser) {
        setError('未登录')
        setStep('error')
        return
      }
      setStep('loading')
      setPhase(0)
      setError(null)

      try {
        const { file: compressed, aspectRatio } = await compressImage(raw)

        photoToImage.mutate(
          {
            file: compressed,
            authorId: currentUser.id,
            aspectRatio,
            promptVersion: 2,
            model: 'gpu',
            onStep: (s) => setPhase(STEP_TO_PHASE[s]),
          },
          {
            onSuccess: ({ resultUrl: url, prompt }) => {
              setResultUrl(url)
              setResultPrompt(prompt)
              setStep('result')
            },
            onError: (err) => {
              setError(err.message || 'Pipeline failed')
              setStep('error')
            },
          },
        )
      } catch (err) {
        setError((err as Error).message || 'Compress failed')
        setStep('error')
      }
    },
    [currentUser, photoToImage],
  )

  // 开摄像头
  useEffect(() => {
    if (step !== 'viewfinder') return
    let cancelled = false

    async function openCam() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t('voice.notSupported'))
        setStep('error')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((tk) => tk.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {
            /* autoplay blocked, user can tap */
          })
        }
      } catch (err) {
        const name = (err as { name?: string })?.name
        const msg =
          name === 'NotAllowedError'
            ? t('voice.permissionDenied')
            : name === 'NotFoundError'
              ? t('voice.notFound')
              : t('voice.accessFailed')
        setError(msg)
        setStep('error')
      }
    }

    void openCam()

    return () => {
      cancelled = true
      const s = streamRef.current
      if (s) {
        s.getTracks().forEach((tk) => tk.stop())
        streamRef.current = null
      }
    }
  }, [step])

  // 锁 body 滚动
  useEffect(() => {
    const orig = document.body.style.cssText
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'
    return () => {
      document.body.style.cssText = orig
    }
  }, [])

  const captureFrame = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob((b) => r(b), 'image/jpeg', 0.92),
    )
    if (!blob) return

    setPreviewUrl(URL.createObjectURL(blob))
    void runPipeline(blob)
  }, [runPipeline])

  const handlePublish = () => {
    if (!currentUser || !resultUrl || createPost.isPending) return
    createPost.mutate(
      {
        authorId: currentUser.id,
        photoUrl: resultUrl,
        content: caption.trim() || null,
        optional: resultPrompt,
      },
      {
        onSuccess: ({ postId }) => {
          onPost?.({
            id: postId,
            parentId: 0,
            authorId: currentUser.id,
            photoUrl: resultUrl,
            content: caption.trim() || null,
            type: 2,
            likeCount: 0,
            relayCount: 0,
            commentCount: 0,
            shareCount: 0,
            optional: resultPrompt,
            hasRemixes: false,
          })
          onClose()
        },
        onError: (err) => {
          setError(err.message || 'Publish failed')
        },
      },
    )
  }

  const handleRetry = () => {
    setError(null)
    setPhase(0)
    setResultUrl(null)
    setPreviewUrl(null)
    setStep('viewfinder')
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        color: '#fff',
      }}
    >
      {step === 'viewfinder' && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={topBarStyle}>
            <button type="button" onClick={onClose} style={iconBtnStyle} aria-label="close">
              ✕
            </button>
          </div>
          <div style={shutterRowStyle}>
            <button
              type="button"
              onClick={() => void captureFrame()}
              style={shutterBtnStyle}
              aria-label="capture"
            />
          </div>
        </>
      )}

      {step === 'loading' && (
        <div style={centerStyle}>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="captured"
              style={{
                width: '70%',
                maxWidth: 320,
                borderRadius: 16,
                opacity: 0.6,
                marginBottom: 24,
              }}
            />
          )}
          <PhasePills phase={phase} />
          <p style={{ marginTop: 16, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
            {t(PHASE_LABEL_KEYS[phase] ?? 'camera.loadingPhase3')}
          </p>
        </div>
      )}

      {step === 'result' && resultUrl && (
        <div style={resultLayoutStyle}>
          <img
            src={resultUrl}
            alt="generated"
            style={{
              width: '100%',
              maxHeight: '60%',
              objectFit: 'contain',
              marginTop: 60,
            }}
          />
          <div style={resultActionsStyle}>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t('camera.captionPlaceholder')}
              style={captionInputStyle}
              maxLength={140}
            />
            <button
              type="button"
              onClick={handlePublish}
              disabled={createPost.isPending}
              style={publishBtnStyle}
            >
              {createPost.isPending ? '发布中…' : '发布'}
            </button>
            <button type="button" onClick={handleRetry} style={secondaryBtnStyle}>
              重拍
            </button>
            {createPost.isError && (
              <div style={{ color: '#ff6b6b', fontSize: 13 }}>
                {createPost.error?.message ?? 'Publish failed'}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ ...iconBtnStyle, position: 'absolute', top: 16, right: 16 }}
            aria-label="close"
          >
            ✕
          </button>
        </div>
      )}

      {step === 'error' && (
        <div style={centerStyle}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <p style={{ fontSize: 15, marginBottom: 20, textAlign: 'center', padding: '0 24px' }}>
            {error || '出错了'}
          </p>
          <button type="button" onClick={handleRetry} style={publishBtnStyle}>
            重试
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ ...secondaryBtnStyle, marginTop: 8 }}
          >
            关闭
          </button>
        </div>
      )}
    </div>
  )
}

function PhasePills({ phase }: { phase: number }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            width: i === phase ? 28 : 8,
            height: 8,
            borderRadius: 4,
            background: i <= phase ? 'var(--accent)' : 'rgba(255,255,255,0.18)',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  )
}

const topBarStyle = {
  position: 'absolute' as const,
  top: 16,
  left: 16,
  right: 16,
  display: 'flex',
  justifyContent: 'space-between',
  zIndex: 1,
}

const iconBtnStyle = {
  width: 40,
  height: 40,
  borderRadius: 20,
  background: 'rgba(0,0,0,0.4)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: '#fff',
  border: 'none',
  fontSize: 18,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const shutterRowStyle = {
  position: 'absolute' as const,
  bottom: 32,
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'center',
  zIndex: 1,
}

const shutterBtnStyle = {
  width: 76,
  height: 76,
  borderRadius: 38,
  background: '#fff',
  border: '5px solid rgba(255,255,255,0.4)',
  cursor: 'pointer',
  boxShadow: '0 0 24px rgba(255,255,255,0.3)',
}

const centerStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
}

const resultLayoutStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'stretch',
  padding: '0 16px 24px',
  position: 'relative' as const,
}

const resultActionsStyle = {
  marginTop: 16,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 8,
}

const captionInputStyle = {
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 14,
  outline: 'none',
}

const publishBtnStyle = {
  padding: '14px',
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 50,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
}

const secondaryBtnStyle = {
  padding: '12px',
  background: 'transparent',
  color: 'rgba(255,255,255,0.7)',
  border: '1.5px solid rgba(255,255,255,0.2)',
  borderRadius: 50,
  fontSize: 14,
  cursor: 'pointer',
}
