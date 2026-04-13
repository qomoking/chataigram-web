import { useCallback, useRef, useState } from 'react'
import { useVoiceTranscribe } from '@chataigram/core'
import { t } from '../utils/i18n'

type VoiceRemixButtonProps = {
  onRemix: (text: string) => void | Promise<void>
  onTranscribeStart?: () => void
  disabled?: boolean
}

/**
 * 按住录音 → 松手停止 → 上传 Whisper → onRemix(text)。
 *
 * 状态：idle → recording → uploading → idle
 * 迁自 frontend/components/VoiceRemixButton.jsx，转写走 core 的 useVoiceTranscribe。
 */
export default function VoiceRemixButton({
  onRemix,
  onTranscribeStart,
  disabled = false,
}: VoiceRemixButtonProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'uploading'>('idle')
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const holdingRef = useRef(false)
  const transcribe = useVoiceTranscribe()

  const startRecording = useCallback(async () => {
    if (disabled || state !== 'idle') return
    setError(null)
    holdingRef.current = true

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        window.isSecureContext === false ? t('voice.httpsRequired') : t('voice.notSupported'),
      )
      holdingRef.current = false
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const name = (err as { name?: string })?.name
      const msg =
        name === 'NotAllowedError' || name === 'PermissionDeniedError'
          ? t('voice.permissionDenied')
          : name === 'NotFoundError'
            ? t('voice.notFound')
            : name === 'NotSupportedError'
              ? t('voice.notSupportedEnv')
              : t('voice.accessFailed')
      setError(msg)
      holdingRef.current = false
      return
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

    const recorder = new MediaRecorder(stream, { mimeType })
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      stream.getTracks().forEach((tk) => tk.stop())
      if (chunksRef.current.length === 0) {
        setState('idle')
        return
      }
      const blob = new Blob(chunksRef.current, { type: mimeType })
      if (blob.size < 1000) {
        setState('idle')
        return
      }

      setState('uploading')
      onTranscribeStart?.()
      transcribe.mutate(blob, {
        onSuccess: ({ text }) => {
          setState('idle')
          if (text.trim()) {
            void onRemix(text.trim())
          } else {
            setError(t('voice.noSpeech'))
          }
        },
        onError: () => {
          setError(t('voice.transcribeFailed'))
          setState('idle')
        },
      })
    }

    recorder.start()
    recorderRef.current = recorder
    setState('recording')

    if (!holdingRef.current) recorder.stop()
  }, [disabled, state, onRemix, onTranscribeStart, transcribe])

  const stopRecording = useCallback(() => {
    holdingRef.current = false
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }, [])

  const isRecording = state === 'recording'
  const isUploading = state === 'uploading'
  const isBusy = disabled || isUploading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button
        type="button"
        onPointerDown={() => void startRecording()}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        onPointerCancel={stopRecording}
        disabled={isBusy}
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: isRecording ? '2.5px solid rgba(255,255,255,0.6)' : 'none',
          cursor: isBusy ? 'not-allowed' : 'pointer',
          background: isRecording
            ? 'linear-gradient(135deg, #ff4d6d, #ff6b9d)'
            : 'linear-gradient(135deg, #e040fb, #ff6ec7)',
          boxShadow: isRecording
            ? '0 0 0 10px rgba(255,77,109,0.25), 0 4px 20px rgba(255,110,199,0.5)'
            : '0 4px 20px rgba(224,64,251,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          transform: isRecording ? 'scale(1.12)' : 'scale(1)',
          opacity: isBusy && !isRecording ? 0.5 : 1,
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        aria-label="record voice"
      >
        {isUploading ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <circle
              cx="12"
              cy="12"
              r="9"
              strokeDasharray="56"
              strokeDashoffset="18"
              style={{
                animation: 'vr-spin 0.9s linear infinite',
                transformOrigin: 'center',
              }}
            />
          </svg>
        ) : isRecording ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <rect x="5" y="5" width="14" height="14" rx="2" />
          </svg>
        ) : (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="17" x2="12" y2="21" />
            <line x1="9" y1="21" x2="15" y2="21" />
          </svg>
        )}
      </button>

      {isRecording && (
        <span style={{ fontSize: 10, color: 'rgba(255,150,150,0.9)', fontWeight: 600 }}>
          {t('voice.recording')}
        </span>
      )}
      {isUploading && (
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
          {t('voice.transcribing')}
        </span>
      )}
      {error && !isRecording && !isUploading && (
        <span
          style={{
            fontSize: 10,
            color: 'rgba(255,100,100,0.9)',
            maxWidth: 70,
            textAlign: 'center',
          }}
        >
          {error}
        </span>
      )}

      <style>{`@keyframes vr-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
