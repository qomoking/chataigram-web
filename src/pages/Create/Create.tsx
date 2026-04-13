import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useCreatePost,
  useCurrentUser,
  useGenerateImage,
} from '@chataigram/core'
import './Create.css'

type UserMsg = {
  id: string
  role: 'user'
  text: string
  imagePreview: string | null
}

type AiMsg =
  | { id: string; role: 'ai'; loading: true }
  | { id: string; role: 'ai'; loading: false; imageUrl: string; prompt: string }
  | { id: string; role: 'ai'; loading: false; error: string }

type Msg = UserMsg | AiMsg

let msgIdCounter = 0
const newId = () => (++msgIdCounter).toString()

/**
 * 轻量"聊天式创建"页 —— 输框描述 + 可选参考图 → 生成 → 保存到 feed。
 * 对齐 frontend/Create.jsx；用 useGenerateImage + useCreatePost 替代 generateImage + savePhoto。
 */
export default function Create() {
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()
  const generate = useGenerateImage()
  const createPost = useCreatePost()

  const [messages, setMessages] = useState<Msg[]>([])
  const [inputText, setInputText] = useState('')
  const [refImage, setRefImage] = useState<{ dataUrl: string } | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`
  }, [inputText])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = typeof ev.target?.result === 'string' ? ev.target.result : null
      if (dataUrl) setRefImage({ dataUrl })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const canSend = (inputText.trim().length > 0 || refImage != null) && !generate.isPending

  const handleSend = () => {
    if (!canSend || !currentUser) return

    const prompt = inputText.trim()
    const imagePreview = refImage?.dataUrl ?? null

    const userMsgId = newId()
    const aiMsgId = newId()
    const userMsg: UserMsg = {
      id: userMsgId,
      role: 'user',
      text: prompt,
      imagePreview,
    }
    const aiLoading: AiMsg = { id: aiMsgId, role: 'ai', loading: true }

    setMessages((prev) => [...prev, userMsg, aiLoading])
    setInputText('')
    setRefImage(null)

    generate.mutate(
      {
        prompt,
        userId: currentUser.id,
        refImageUrl: imagePreview,
      },
      {
        onSuccess: ({ imageUrl }) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId ? { id: aiMsgId, role: 'ai', loading: false, imageUrl, prompt } : m,
            ),
          )
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? {
                    id: aiMsgId,
                    role: 'ai',
                    loading: false,
                    error: err.message || 'Generation failed',
                  }
                : m,
            ),
          )
        },
      },
    )
  }

  const handleSaveToFeed = (msg: AiMsg) => {
    if (!currentUser || msg.loading || 'error' in msg) return
    createPost.mutate(
      {
        authorId: currentUser.id,
        photoUrl: msg.imageUrl,
        content: null,
        optional: msg.prompt,
      },
      {
        onSuccess: () => setSavedIds((prev) => new Set([...prev, msg.id])),
      },
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="create-page">
      <div className="create-header">
        <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="back">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="create-title">Create</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="messages-area">
        {messages.length === 0 && (
          <div className="create-welcome">
            <div className="welcome-icon">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <p className="welcome-title">What will you create?</p>
            <p className="welcome-sub">Describe your idea or upload a reference image</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`msg-row ${msg.role}`}>
            {msg.role === 'user' ? (
              <div className="user-bubble">
                {msg.imagePreview && (
                  <img src={msg.imagePreview} alt="ref" className="bubble-ref-img" />
                )}
                {msg.text && <p className="bubble-text">{msg.text}</p>}
              </div>
            ) : (
              <div className="ai-bubble">
                {msg.loading ? (
                  <div className="ai-loading">
                    <div className="loading-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span className="loading-label">Generating...</span>
                  </div>
                ) : 'error' in msg ? (
                  <div className="ai-error">
                    <span className="error-icon">⚠</span>
                    <span>{msg.error}</span>
                  </div>
                ) : (
                  <div className="ai-result">
                    <img src={msg.imageUrl} alt={msg.prompt} className="result-img" />
                    <div className="result-actions">
                      {savedIds.has(msg.id) ? (
                        <span className="saved-label">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Saved to feed
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="save-btn"
                          onClick={() => handleSaveToFeed(msg)}
                          disabled={createPost.isPending}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                          </svg>
                          Save to Feed
                        </button>
                      )}
                      <a
                        href={msg.imageUrl}
                        download={`chataigram-${msg.id}.jpg`}
                        target="_blank"
                        rel="noreferrer"
                        className="download-btn"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="input-bar">
        {refImage && (
          <div className="ref-preview-strip">
            <img src={refImage.dataUrl} alt="ref" className="ref-thumb" />
            <button
              type="button"
              className="ref-remove"
              onClick={() => setRefImage(null)}
              aria-label="remove ref"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        <div className="input-row">
          <button
            type="button"
            className="img-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={generate.isPending}
            aria-label="upload image"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M3 15l5-5 4 4 3-3 6 6" />
              <circle cx="8.5" cy="8.5" r="1.5" />
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder="Describe your image..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={generate.isPending}
            rows={1}
          />

          <button
            type="button"
            className={`send-btn ${canSend ? 'active' : ''}`}
            onClick={handleSend}
            disabled={!canSend}
            aria-label="send"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageSelect}
        />
      </div>
    </div>
  )
}
