/**
 * Chat session persistence for CreatePage Studio。
 *
 * 对齐 frontend/src/utils/storage.js 里的 chat session 部分。
 * Key: omnient_chat_sessions
 * 形状: { id, messages[], firstImageUrl?, lastUserText?, updatedAt, createdAt }
 * 最多保存 20 条，newest-first。
 */

const SESSIONS_KEY = 'omnient_chat_sessions'
const MAX_SESSIONS = 20

export type ChatMessage = {
  id: string
  role: 'user' | 'ai' | 'system-notification'
  text?: string
  imagePreview?: string
  refImageCdnUrl?: string
  mentionedFriends?: { id: number; name: string; avatar: string | null }[]
  status?: 'loading' | 'streaming' | 'done' | 'error'
  prompt?: string
  imageUrl?: string
  enhancedPrompt?: string
  suggestions?: { label: string; prompt: string; emoji?: string | null; desc?: string | null }[]
  published?: boolean
  drafted?: boolean
  error?: string
  type?: string
  [key: string]: unknown
}

export type ChatSession = {
  id: string
  messages: ChatMessage[]
  firstImageUrl?: string
  lastUserText?: string
  updatedAt: number
  createdAt: number
}

function read(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as ChatSession[]
  } catch {
    return []
  }
}

function write(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)))
  } catch {
    /* quota */
  }
}

export function getChatSessions(): ChatSession[] {
  return read()
}

export function upsertChatSession(session: ChatSession): void {
  const sessions = read()
  const idx = sessions.findIndex((s) => s.id === session.id)
  if (idx >= 0) {
    const updated = { ...session, createdAt: sessions[idx]!.createdAt }
    sessions.splice(idx, 1)
    sessions.unshift(updated)
  } else {
    sessions.unshift(session)
  }
  write(sessions)
}

export function deleteChatSession(id: string): void {
  write(read().filter((s) => s.id !== id))
}

/**
 * 序列化 messages：去掉 loading 状态的 AI 消息；去掉 user 的 imagePreview（blob URL 不能持久化）。
 */
export function serializeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter((m) => !(m.role === 'ai' && m.status === 'loading'))
    .map((m) => {
      if (m.role === 'user') {
        const { imagePreview: _strip, ...rest } = m
        void _strip
        return rest
      }
      return m
    })
}

export function newSessionId(): string {
  return 'session_' + Date.now()
}

export function newMessageId(): string {
  return 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
}

export function formatSessionTime(ts: number | undefined): string {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 24 * 3600_000) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
  if (diff < 7 * 24 * 3600_000) {
    return d.toLocaleDateString(undefined, { weekday: 'short' })
  }
  return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
}
