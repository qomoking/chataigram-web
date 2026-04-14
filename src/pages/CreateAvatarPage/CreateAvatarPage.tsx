import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  prefetchAnimation,
  useCurrentUser,
  useGenerateImage,
  useImageDescription,
  useSuggestions,
  useUpdateAvatar,
  useUploadImage,
  type SuggestionItem,
} from '@chataigram/core'
import CdnImg from '../../components/CdnImg'
import './CreateAvatarPage.css'

/**
 * 创建头像页 —— 完整 VLM 迭代循环对齐原版。
 *
 * 流程：
 *   1. 文字描述 / style chip → generate → 结果图
 *   2. 可选 paste/pick 参考图 → useUploadImage 上传 CDN
 *   3. 结果图 → useImageDescription → useSuggestions → chip 推荐
 *   4. 用户选 chip（或再输入）→ continue 迭代
 *   5. 满意 → useUpdateAvatar（服务端）+ prefetchAnimation → 跳 /profile
 */

const STYLE_PRESETS = [
  { label: '3D', prompt: '3D cartoon avatar, Pixar style, soft lighting' },
  { label: '动漫', prompt: 'anime style, big eyes, vibrant colors, clean line art' },
  { label: '赛博', prompt: 'cyberpunk portrait, neon glow, futuristic dark background' },
  { label: '油画', prompt: 'oil painting portrait, impressionist, rich textured strokes' },
  { label: '水彩', prompt: 'watercolor portrait, soft washes, dreamy pastel tones' },
  { label: '像素', prompt: 'pixel art avatar, 16-bit retro game character' },
]

type Msg =
  | { id: string; role: 'user'; text: string; imagePreview: string | null; chips: string[] }
  | { id: string; role: 'ai'; status: 'loading' | 'done' | 'error'; imageUrl?: string; suggestions?: SuggestionItem[]; error?: string }

let _id = 0
const uid = () => String(++_id)

export default function CreateAvatarPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: currentUser } = useCurrentUser()
  const generate = useGenerateImage()
  const upload = useUploadImage()
  const describe = useImageDescription()
  const suggest = useSuggestions()
  const updateAvatar = useUpdateAvatar()

  const [messages, setMessages] = useState<Msg[]>([])
  const [inputText, setInputText] = useState('')
  const [refImage, setRefImage] = useState<{ previewUrl: string; cdnUrl: string | null; uploading: boolean } | null>(null)
  const [activeChips, setActiveChips] = useState<string[]>([])
  const [inputMode, setInputMode] = useState<'text' | 'continue'>('text')
  const lastResultUrl = useRef<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const toggleChip = (label: string) => {
    setActiveChips((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    )
  }

  const buildPrompt = () => {
    const chipText = STYLE_PRESETS.filter((p) => activeChips.includes(p.label))
      .map((p) => p.prompt)
      .join(', ')
    const base = inputText.trim()
    if (base && chipText) return `${base}, ${chipText}`
    return base || chipText || 'generate an avatar portrait'
  }

  const pickFile = useCallback(
    (file: File) => {
      const previewUrl = URL.createObjectURL(file)
      setRefImage({ previewUrl, cdnUrl: null, uploading: true })
      upload.mutate(file, {
        onSuccess: ({ imageUrl }) =>
          setRefImage((p) => (p ? { ...p, cdnUrl: imageUrl, uploading: false } : null)),
        onError: () =>
          setRefImage((p) => (p ? { ...p, uploading: false } : null)),
      })
    },
    [upload],
  )

  const canSend =
    (inputText.trim() || refImage || activeChips.length > 0) &&
    !generate.isPending &&
    !(refImage?.uploading)

  const doGenerate = useCallback(
    async (prompt: string, refUrl: string | null, userText: string, userPreview: string | null, chips: string[]) => {
      if (!currentUser) return

      const aiMsgId = uid()
      if (userText || userPreview || chips.length) {
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: 'user', text: userText, imagePreview: userPreview, chips },
        ])
      }
      setMessages((prev) => [...prev, { id: aiMsgId, role: 'ai', status: 'loading' }])
      setInputText('')
      setInputMode('continue')
      scrollToBottom()

      generate.mutate(
        { prompt, userId: currentUser.id, refImageUrl: refUrl },
        {
          onSuccess: async ({ imageUrl }) => {
            lastResultUrl.current = imageUrl
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId
                  ? { ...m, status: 'done' as const, imageUrl, suggestions: [] }
                  : m,
              ),
            )
            scrollToBottom()

            // VLM 描述 + LLM 建议
            try {
              const desc = await describe.mutateAsync({ url: imageUrl })
              const items = await suggest.mutateAsync({
                prompt,
                scene: 'avatar',
                imgDesc: desc,
              })
              if (items.length) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId && m.role === 'ai' ? { ...m, suggestions: items } : m,
                  ),
                )
              }
            } catch {
              /* non-fatal */
            }
            scrollToBottom()
          },
          onError: (err) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId
                  ? { ...m, status: 'error' as const, error: err.message }
                  : m,
              ),
            )
          },
        },
      )
    },
    [currentUser, generate, describe, suggest],
  )

  const handleSend = () => {
    if (!canSend) return
    const prompt = buildPrompt()
    doGenerate(
      prompt,
      refImage?.cdnUrl ?? null,
      inputText.trim(),
      refImage?.previewUrl ?? null,
      [...activeChips],
    )
    setRefImage(null)
    setActiveChips([])
  }

  const handleSuggestionClick = (item: SuggestionItem) => {
    doGenerate(item.prompt, lastResultUrl.current, '', null, [item.label])
  }

  const handleUseAvatar = async () => {
    if (!currentUser || !lastResultUrl.current) return
    const url = lastResultUrl.current
    try {
      const { animationTaskId } = await updateAvatar.mutateAsync(url)
      if (animationTaskId) void prefetchAnimation(qc, currentUser.id, animationTaskId)
    } catch {
      /* fallback to local-only */
    }
    navigate('/profile', { replace: true, state: { avatarJustSet: true } })
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
      i.type.startsWith('image/'),
    )
    if (!item) return
    e.preventDefault()
    const f = item.getAsFile()
    if (f) pickFile(f)
  }

  return (
    <div className="cav-page" onPaste={handlePaste}>
      <div className="cav-header">
        <button type="button" className="cav-back" onClick={() => navigate(-1)} aria-label="back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="cav-title">创建头像</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="cav-body">
        {/* 消息流 */}
        <div className="cav-messages">
          {messages.length === 0 && (
            <div className="cav-empty">
              <div style={{ fontSize: 36, marginBottom: 8 }}>✨</div>
              <p>描述你想要的头像风格，或选择预设</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`cav-msg cav-msg--${msg.role}`}>
              {msg.role === 'user' ? (
                <div className="cav-user-bubble">
                  {msg.imagePreview && (
                    <img src={msg.imagePreview} alt="ref" className="cav-ref-thumb" />
                  )}
                  {msg.chips.length > 0 && (
                    <div className="cav-chip-row">
                      {msg.chips.map((c) => (
                        <span key={c} className="cav-chip active">{c}</span>
                      ))}
                    </div>
                  )}
                  {msg.text && <p>{msg.text}</p>}
                </div>
              ) : msg.status === 'loading' ? (
                <div className="cav-ai-loading">
                  <span className="cav-spinner" />
                  <span>生成中…</span>
                </div>
              ) : msg.status === 'error' ? (
                <div className="cav-ai-error">⚠ {msg.error}</div>
              ) : (
                <div className="cav-ai-result">
                  {msg.imageUrl && (
                    <CdnImg src={msg.imageUrl} alt="" className="cav-result-img" />
                  )}
                  {(msg.suggestions ?? []).length > 0 && (
                    <div className="cav-suggestions">
                      {msg.suggestions!.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          className="cav-suggest-btn"
                          onClick={() => handleSuggestionClick(s)}
                        >
                          {s.emoji && <span>{s.emoji}</span>}
                          <span className="cav-suggest-label">{s.label}</span>
                          {s.desc && <span className="cav-suggest-desc">{s.desc}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* 输入区 */}
        <div className="cav-input-area">
          {refImage && (
            <div className="cav-ref-strip">
              <img src={refImage.previewUrl} alt="ref" className="cav-ref-mini" />
              {refImage.uploading && <span className="cav-ref-uploading">上传中…</span>}
              <button
                type="button"
                className="cav-ref-remove"
                onClick={() => setRefImage(null)}
              >
                ✕
              </button>
            </div>
          )}

          <div className="cav-chips">
            {STYLE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`cav-chip${activeChips.includes(p.label) ? ' active' : ''}`}
                onClick={() => toggleChip(p.label)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="cav-input-row">
            <button
              type="button"
              className="cav-pick-btn"
              onClick={() => fileRef.current?.click()}
              aria-label="pick reference image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M3 15l5-5 4 4 3-3 6 6" />
                <circle cx="8.5" cy="8.5" r="1.5" />
              </svg>
            </button>
            <input
              className="cav-text-input"
              placeholder={inputMode === 'text' ? '描述你想要的头像风格…' : '继续迭代，或选择建议'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend()
              }}
            />
            <button
              type="button"
              className={`cav-send-btn ${canSend ? 'active' : ''}`}
              onClick={handleSend}
              disabled={!canSend}
              aria-label="send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) pickFile(f)
              e.target.value = ''
            }}
          />

          {lastResultUrl.current && (
            <button
              type="button"
              className="cav-use-btn"
              onClick={() => void handleUseAvatar()}
              disabled={updateAvatar.isPending}
            >
              {updateAvatar.isPending ? '保存中…' : '✓ 用作头像'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
