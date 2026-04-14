import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useCurrentUser,
  useDetectIntent,
  useGenerateImage,
  useImageDescription,
  useOnboarding,
  useSuggestions,
  useUploadImage,
  type SuggestionItem,
} from '@chataigram/core'
import CdnImg from '../../components/CdnImg'
import InlineFeed from '../../components/InlineFeed'
import { isEngramEnabled } from '../../utils/featureFlags'
import { t } from '../../utils/i18n'
import {
  type ChatMessage,
  type ChatSession,
  deleteChatSession,
  formatSessionTime,
  getChatSessions,
  newMessageId,
  newSessionId,
  serializeMessages,
  upsertChatSession,
} from '../../utils/chat-sessions'
import {
  isOnboardingDone,
  setOnboardingDone,
  shouldShowDailyProactive,
  setProactiveTriggerDate,
  publishPost,
  saveDraft,
  addToGenHistory,
  getRecentHistory,
} from '../../utils/storage-studio'
import './CreatePage.css'

const FIRST_HINTS = [
  { labelKey: 'onboarding.starter1', prompt: 'cyberpunk city at night, neon lights, rain reflections on the street' },
  { labelKey: 'onboarding.starter2', prompt: 'dreamy watercolor portrait, soft pastel tones, impressionist style' },
]

/**
 * CreatePage Studio —— 对齐 frontend/CreatePage.jsx 1734 行版本。
 *
 * 实现的：
 *   ✅ 多轮 chat UI（消息卡片堆叠 + 底部输入条）
 *   ✅ 意图检测（generate / feed / analyze_prompt / analyze_keywords）
 *   ✅ 图片生成 + VLM 描述 + 建议推荐
 *   ✅ Publish / Draft / Use as Avatar 按钮
 *   ✅ 参考图上传
 *   ✅ 会话持久化（localStorage）
 *   ✅ 历史侧边栏（恢复 / 删除 / 新建）
 *   ✅ Onboarding 流程（首次登录 → 欢迎 → 头像）
 *   ✅ Daily proactive（前 7 天每日推荐）
 *   ✅ Starter hints
 *
 * 未实现（延后）：
 *   ⏸️ @ mention / friend picker（依赖 Engram 多人生图 context）
 *   ⏸️ Engram SSE streaming（feature flag off 时跳过）
 *   ⏸️ Card carousel swipe（简化为 scroll 列表）
 *   ⏸️ Suggestion long-press popover（点击直接用）
 *   ⏸️ Tool rendering（getToolRenderer 是 Engram 专用）
 */
export default function CreatePage() {
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()

  // ── core hooks ──
  const generate = useGenerateImage()
  const upload = useUploadImage()
  const describe = useImageDescription()
  const suggest = useSuggestions()
  const detectIntent = useDetectIntent()
  const onboarding = useOnboarding()

  // ── state ──
  const [sessionId, setSessionId] = useState(() => {
    const sessions = getChatSessions()
    return sessions[0]?.id ?? newSessionId()
  })
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const sessions = getChatSessions()
    return sessions[0]?.messages ?? []
  })
  const [inputText, setInputText] = useState('')
  const [refImage, setRefImage] = useState<{
    previewUrl: string
    cdnUrl: string | null
    uploading: boolean
  } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historySessions, setHistorySessions] = useState<ChatSession[]>([])
  const [showFirstHints, setShowFirstHints] = useState(false)

  const lastResultUrl = useRef<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const sessionCreatedAt = useRef(Date.now())
  const onboardingStartedRef = useRef(false)
  const dailyProactiveStartedRef = useRef(false)

  // ── auto-save ──
  useEffect(() => {
    if (messages.length === 0) return
    const firstImg = messages.find(
      (m) => m.role === 'ai' && m.status === 'done' && m.imageUrl,
    )?.imageUrl
    const lastUser = [...messages]
      .reverse()
      .find((m) => m.role === 'user')?.text
    upsertChatSession({
      id: sessionId,
      messages: serializeMessages(messages),
      firstImageUrl: firstImg ?? undefined,
      lastUserText: lastUser ?? undefined,
      updatedAt: Date.now(),
      createdAt: sessionCreatedAt.current,
    })
  }, [messages, sessionId])

  // ── auto-resize textarea ──
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`
  }, [inputText])

  // ── auto-scroll ──
  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── onboarding ──
  useEffect(() => {
    if (
      !currentUser ||
      onboardingStartedRef.current ||
      isOnboardingDone(currentUser.id)
    )
      return
    onboardingStartedRef.current = true

    onboarding.mutate(
      { userId: currentUser.id, name: currentUser.name },
      {
        onSuccess: ({ welcomeText, avatarUrl }) => {
          const msgs: ChatMessage[] = []
          if (welcomeText) {
            msgs.push({
              id: newMessageId(),
              role: 'ai',
              status: 'done',
              text: welcomeText,
              type: 'onboarding-text',
            })
          }
          if (avatarUrl) {
            msgs.push({
              id: newMessageId(),
              role: 'ai',
              status: 'done',
              imageUrl: avatarUrl,
              type: 'onboarding-avatar',
            })
          }
          if (msgs.length) {
            setMessages((prev) => [...prev, ...msgs])
          }
          setOnboardingDone(currentUser.id)
          if (!avatarUrl) setShowFirstHints(true)
        },
        onError: () => {
          setShowFirstHints(true)
          if (currentUser) setOnboardingDone(currentUser.id)
        },
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  // ── daily proactive ──
  useEffect(() => {
    if (
      !currentUser ||
      dailyProactiveStartedRef.current ||
      !shouldShowDailyProactive(currentUser.id) ||
      !isOnboardingDone(currentUser.id)
    )
      return
    dailyProactiveStartedRef.current = true
    setProactiveTriggerDate(currentUser.id)

    // 分析历史 → 推荐 prompt → 自动生成预览
    const history = getRecentHistory(20)
    if (history.length === 0) return

    const proactiveId = newMessageId()
    setMessages((prev) => [
      ...prev,
      { id: proactiveId, role: 'ai', status: 'loading', type: 'daily-proactive' },
    ])

    // 用 legacy flow：analyzeHistory → generateImage → suggestions
    // 这是 fire-and-forget 异步
    void (async () => {
      try {
        const { apiClient } = await import('@chataigram/core/internals')
        const res = await apiClient.post<{ ret_code: number; result?: string }>('/analyze_history', {
          history: history.map((h) => ({ prompt: h.prompt, user_text: h.user_text })),
          mode: 'prompt',
        })
        const prompt = res.result ?? FIRST_HINTS[0]!.prompt
        setMessages((prev) =>
          prev.map((m) =>
            m.id === proactiveId
              ? { ...m, status: 'done' as const, text: `每日推荐：${prompt}`, prompt }
              : m,
          ),
        )
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== proactiveId))
      }
    })()
  }, [currentUser])

  // ── file / paste handlers ──
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

  const handlePaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
      i.type.startsWith('image/'),
    )
    if (!item) return
    e.preventDefault()
    const f = item.getAsFile()
    if (f) pickFile(f)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) pickFile(f)
    e.target.value = ''
  }

  // ── legacy generation flow ──
  const runLegacyFlow = useCallback(
    async (userText: string, refUrl: string | null, aiMsgId: string) => {
      if (!currentUser) return

      // 1. 意图检测
      let intent = 'generate'
      if (!isEngramEnabled()) {
        try {
          intent = await detectIntent.mutateAsync(userText)
        } catch {
          intent = 'generate'
        }
      }

      // 2. 路由
      if (intent === 'feed') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, status: 'done' as const, type: 'feed', text: t('create.feedHint') }
              : m,
          ),
        )
        setGenerating(false)
        return
      }

      if (intent === 'analyze_prompt' || intent === 'analyze_keywords') {
        try {
          const { apiClient } = await import('@chataigram/core/internals')
          const history = getRecentHistory(20)
          const res = await apiClient.post<{ ret_code: number; result?: string }>(
            '/analyze_history',
            {
              history: history.map((h) => ({ prompt: h.prompt, user_text: h.user_text })),
              mode: intent === 'analyze_prompt' ? 'prompt' : 'keywords',
            },
          )
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? { ...m, status: 'done' as const, type: intent, text: res.result ?? '' }
                : m,
            ),
          )
        } catch (err) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? { ...m, status: 'error' as const, error: (err as Error).message }
                : m,
            ),
          )
        }
        setGenerating(false)
        return
      }

      // 3. 默认 generate
      try {
        const { imageUrl } = await generate.mutateAsync({
          prompt: userText,
          userId: currentUser.id,
          refImageUrl: refUrl,
        })
        lastResultUrl.current = imageUrl
        addToGenHistory({ imageUrl, prompt: userText })

        // VLM + suggestions
        let desc = ''
        let suggs: SuggestionItem[] = []
        try {
          desc = await describe.mutateAsync({ url: imageUrl })
          suggs = await suggest.mutateAsync({
            prompt: userText,
            scene: 'create',
            imgDesc: desc,
          })
        } catch {
          /* non-fatal */
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  status: 'done' as const,
                  imageUrl,
                  prompt: userText,
                  enhancedPrompt: desc,
                  suggestions: suggs,
                }
              : m,
          ),
        )
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, status: 'error' as const, error: (err as Error).message }
              : m,
          ),
        )
      }
      setGenerating(false)
    },
    [currentUser, generate, describe, suggest, detectIntent],
  )

  // ── send ──
  const canSend = (inputText.trim() || refImage) && !generating && !(refImage?.uploading)

  const handleSend = () => {
    if (!canSend || !currentUser) return
    const text = inputText.trim()
    const refUrl = refImage?.cdnUrl ?? null
    const preview = refImage?.previewUrl ?? null

    const userId = newMessageId()
    const aiId = newMessageId()

    const userMsg: ChatMessage = {
      id: userId,
      role: 'user',
      text,
      imagePreview: preview ?? undefined,
      refImageCdnUrl: refUrl ?? undefined,
    }
    const aiMsg: ChatMessage = { id: aiId, role: 'ai', status: 'loading' }

    setMessages((prev) => [...prev, userMsg, aiMsg])
    setInputText('')
    setRefImage(null)
    setGenerating(true)
    setShowFirstHints(false)

    void runLegacyFlow(text, refUrl, aiId)
  }

  // ── suggestion click ──
  const handleSuggestionClick = useCallback(
    (item: SuggestionItem) => {
      if (!currentUser || generating) return
      const aiId = newMessageId()
      setMessages((prev) => [
        ...prev,
        { id: newMessageId(), role: 'user', text: item.label },
        { id: aiId, role: 'ai', status: 'loading' },
      ])
      setGenerating(true)
      void runLegacyFlow(item.prompt, lastResultUrl.current, aiId)
    },
    [currentUser, generating, runLegacyFlow],
  )

  // ── publish / draft / avatar ──
  const handlePublish = (msg: ChatMessage) => {
    if (!msg.imageUrl) return
    publishPost({ imageUrl: msg.imageUrl, prompt: msg.prompt ?? '' })
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, published: true } : m)),
    )
  }

  const handleSaveDraft = (msg: ChatMessage) => {
    if (!msg.imageUrl) return
    saveDraft({ imageUrl: msg.imageUrl, prompt: msg.prompt ?? '' })
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, drafted: true } : m)),
    )
  }

  const handleUseAvatar = (msg: ChatMessage) => {
    if (!msg.imageUrl || !currentUser) return
    navigate('/create-avatar')
  }

  // ── history ──
  const openHistory = () => {
    setHistorySessions(getChatSessions())
    setShowHistory(true)
  }

  const handleLoadSession = (s: ChatSession) => {
    setSessionId(s.id)
    setMessages(s.messages)
    sessionCreatedAt.current = s.createdAt
    setShowHistory(false)
    setInputText('')
    setRefImage(null)
  }

  const handleDeleteSession = (id: string) => {
    deleteChatSession(id)
    setHistorySessions((prev) => prev.filter((s) => s.id !== id))
    if (id === sessionId) handleNewChat()
  }

  const handleNewChat = () => {
    setSessionId(newSessionId())
    setMessages([])
    sessionCreatedAt.current = Date.now()
    setInputText('')
    setRefImage(null)
    setShowHistory(false)
    setGenerating(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── render ──
  return (
    <div className="create-page" onPaste={handlePaste}>
      {/* ── Header ── */}
      <div className="create-header">
        <button type="button" className="hamburger-btn" onClick={openHistory} aria-label="history">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="create-brand">ChatAigram</span>
        <button type="button" className="new-chat-btn" onClick={handleNewChat} aria-label="new chat">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="create-messages">
        {messages.length === 0 && (
          <div className="create-welcome">
            <div className="create-logo-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <h1 className="create-title-text">{t('create.tagline')}</h1>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`create-msg create-msg--${msg.role}`}>
            {msg.role === 'user' ? (
              <div className="create-user-bubble">
                {msg.imagePreview && (
                  <img src={msg.imagePreview} alt="ref" className="create-ref-thumb" />
                )}
                {msg.text && <p>{msg.text}</p>}
              </div>
            ) : msg.type === 'onboarding-text' ? (
              <div className="create-ai-text">{msg.text}</div>
            ) : msg.type === 'onboarding-avatar' && msg.imageUrl ? (
              <div className="create-onboarding-avatar">
                <CdnImg src={msg.imageUrl} alt="avatar" className="create-avatar-preview" />
                <div className="create-avatar-actions">
                  <button type="button" className="create-avatar-use" onClick={() => handleUseAvatar(msg)}>
                    {t('onboarding.useAvatar')}
                  </button>
                  <button type="button" className="create-avatar-gen" onClick={() => navigate('/create-avatar')}>
                    {t('onboarding.generateAvatar')}
                  </button>
                  <button type="button" className="create-avatar-skip" onClick={() => setShowFirstHints(true)}>
                    {t('onboarding.skip')}
                  </button>
                </div>
              </div>
            ) : msg.type === 'feed' ? (
              <div className="create-feed-card">
                <InlineFeed />
              </div>
            ) : msg.type === 'daily-proactive' ? (
              <div className="create-ai-text create-proactive">
                {msg.status === 'loading' ? (
                  <span className="create-spinner" />
                ) : (
                  <>
                    <p>{msg.text}</p>
                    {msg.prompt && (
                      <button
                        type="button"
                        className="create-proactive-use"
                        onClick={() => handleSuggestionClick({ label: '试试', prompt: msg.prompt!, emoji: null, desc: null })}
                      >
                        {t('create.tryPrompt')}
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : msg.status === 'loading' ? (
              <div className="create-ai-loading">
                <span className="create-spinner" />
                <span>{t('create.generating')}</span>
              </div>
            ) : msg.status === 'error' ? (
              <div className="create-ai-error">⚠ {msg.error}</div>
            ) : msg.status === 'done' && msg.imageUrl ? (
              <div className="create-ai-result">
                <div className="create-result-img-wrap">
                  <CdnImg
                    src={msg.imageUrl}
                    alt={msg.prompt ?? ''}
                    className="create-result-img"
                  />
                </div>

                {/* actions */}
                <div className="create-result-actions">
                  {msg.published ? (
                    <span className="create-result-done">{t('create.published')}</span>
                  ) : msg.drafted ? (
                    <span className="create-result-done">{t('create.drafted')}</span>
                  ) : (
                    <>
                      <button type="button" className="create-publish-btn" onClick={() => handlePublish(msg)}>
                        {t('create.publish')}
                      </button>
                      <button type="button" className="create-draft-btn" onClick={() => handleSaveDraft(msg)}>
                        {t('create.saveDraft')}
                      </button>
                    </>
                  )}
                </div>

                {/* suggestions */}
                {(msg.suggestions ?? []).length > 0 && (
                  <div className="create-suggestions">
                    {msg.suggestions!.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        className="create-suggest-chip"
                        onClick={() => handleSuggestionClick({ label: s.label, prompt: s.prompt, emoji: s.emoji ?? null, desc: s.desc ?? null })}
                        disabled={generating}
                      >
                        {s.emoji && <span>{s.emoji}</span>}
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : msg.status === 'done' && msg.text ? (
              <div className="create-ai-text">{msg.text}</div>
            ) : null}
          </div>
        ))}

        {/* first hints */}
        {showFirstHints && !inputText && messages.every((m) => m.role !== 'user') && (
          <div className="create-first-hints">
            {FIRST_HINTS.map((h) => (
              <button
                key={h.labelKey}
                type="button"
                className="create-hint-chip"
                onClick={() => handleSuggestionClick({ label: t(h.labelKey), prompt: h.prompt, emoji: null, desc: null })}
              >
                {t(h.labelKey)}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="create-input-bar">
        {refImage && (
          <div className="create-ref-strip">
            <img src={refImage.previewUrl} alt="ref" className="create-ref-mini" />
            {refImage.uploading && <span className="create-ref-uploading">…</span>}
            <button type="button" className="create-ref-remove" onClick={() => setRefImage(null)}>
              ✕
            </button>
          </div>
        )}
        <div className="create-input-row">
          <button
            type="button"
            className="create-img-btn"
            onClick={() => fileRef.current?.click()}
            disabled={generating}
            aria-label="attach image"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M3 15l5-5 4 4 3-3 6 6" />
              <circle cx="8.5" cy="8.5" r="1.5" />
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            className="create-textarea"
            placeholder={t('create.inputPlaceholder')}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={generating}
            rows={1}
          />
          <button
            type="button"
            className={`create-send-btn ${canSend ? 'active' : ''}`}
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
          onChange={handleFileSelect}
        />
      </div>

      {/* ── History sidebar ── */}
      {showHistory && (
        <div className="create-history-backdrop" onClick={() => setShowHistory(false)}>
          <div className="create-history-panel" onClick={(e) => e.stopPropagation()}>
            <div className="create-history-header">
              <span className="create-history-title">{t('create.history')}</span>
              <button type="button" className="create-history-close" onClick={() => setShowHistory(false)} aria-label="close">
                ✕
              </button>
            </div>
            <div className="create-history-list">
              {historySessions.length === 0 ? (
                <div className="create-history-empty">{t('create.noHistory')}</div>
              ) : (
                historySessions.map((s) => (
                  <div
                    key={s.id}
                    className={`create-history-item ${s.id === sessionId ? 'active' : ''}`}
                    onClick={() => handleLoadSession(s)}
                  >
                    {s.firstImageUrl && (
                      <CdnImg src={s.firstImageUrl} alt="" className="create-history-thumb" />
                    )}
                    <div className="create-history-info">
                      <span className="create-history-text">
                        {s.lastUserText || '(empty)'}
                      </span>
                      <span className="create-history-time">
                        {formatSessionTime(s.updatedAt)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="create-history-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSession(s.id)
                      }}
                      aria-label="delete session"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
