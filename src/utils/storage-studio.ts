/**
 * CreatePage Studio 用的 localStorage 工具集。
 * 从原 frontend/src/utils/storage.js 中提取相关函数。
 */

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* quota */
  }
}

// ── My published posts ────────────────────────────────────────
const MY_POSTS_KEY = 'omnient_my_posts'

export function publishPost({ imageUrl, prompt }: { imageUrl: string; prompt: string }) {
  const posts = read<unknown[]>(MY_POSTS_KEY, [])
  posts.unshift({
    id: 'my_' + Date.now(),
    isOwn: true,
    imageUrl,
    prompt,
    baseLikes: 0,
    baseSaves: 0,
    createdAt: Date.now(),
  })
  write(MY_POSTS_KEY, posts)
}

// ── Drafts ────────────────────────────────────────────────────
const DRAFTS_KEY = 'omnient_drafts'

export function saveDraft({ imageUrl, prompt }: { imageUrl: string; prompt: string }) {
  const drafts = read<unknown[]>(DRAFTS_KEY, [])
  drafts.unshift({ id: 'draft_' + Date.now(), imageUrl, prompt, createdAt: Date.now() })
  write(DRAFTS_KEY, drafts)
}

// ── Generation history ────────────────────────────────────────
const GEN_HISTORY_KEY = 'omnient_gen_history'

export function addToGenHistory({ imageUrl, prompt }: { imageUrl: string; prompt: string }) {
  const list = read<unknown[]>(GEN_HISTORY_KEY, [])
  list.unshift({ id: 'hist_' + Date.now(), imageUrl, prompt, createdAt: Date.now() })
  write(GEN_HISTORY_KEY, list.slice(0, 200))
}

export function getRecentHistory(n = 50): { prompt: string; user_text: string }[] {
  const CHAT_SESSIONS_KEY = 'omnient_chat_sessions'
  type Session = {
    messages?: {
      role: string
      text?: string
      prompt?: string
      status?: string
    }[]
  }
  const sessions = read<Session[]>(CHAT_SESSIONS_KEY, [])
  const pairs: { prompt: string; user_text: string }[] = []
  for (const session of sessions) {
    if (pairs.length >= n) break
    const msgs = session.messages ?? []
    for (let i = 0; i < msgs.length - 1; i++) {
      const cur = msgs[i]!
      const next = msgs[i + 1]!
      if (cur.role === 'user' && next.role === 'ai' && next.status === 'done' && next.prompt) {
        pairs.push({ user_text: cur.text ?? '', prompt: next.prompt })
      }
    }
  }
  return pairs.slice(0, n)
}

// ── Friends cache ─────────────────────────────────────────────
const FRIENDS_KEY = 'omnient_friends'
export function getFriends(): { id: number; name: string; avatar: string | null }[] {
  return read<{ id: number; name: string; avatar: string | null }[]>(FRIENDS_KEY, [])
}

// ── Onboarding ────────────────────────────────────────────────
const ONBOARDING_DONE_KEY = 'omnient_onboarding_done'

export function isOnboardingDone(userId: number): boolean {
  return Boolean(read<Record<string, boolean>>(ONBOARDING_DONE_KEY, {})[String(userId)])
}

export function setOnboardingDone(userId: number): void {
  const done = read<Record<string, boolean>>(ONBOARDING_DONE_KEY, {})
  done[String(userId)] = true
  write(ONBOARDING_DONE_KEY, done)
}

// ── Daily proactive ───────────────────────────────────────────
const USER_FIRST_SEEN_KEY = 'omnient_user_first_seen'
const PROACTIVE_TRIGGER_KEY = 'omnient_proactive_trigger'

function getUserFirstSeen(userId: number): number {
  const map = read<Record<string, number>>(USER_FIRST_SEEN_KEY, {})
  if (!map[String(userId)]) {
    map[String(userId)] = Date.now()
    write(USER_FIRST_SEEN_KEY, map)
  }
  return map[String(userId)]!
}

export function setProactiveTriggerDate(userId: number): void {
  const map = read<Record<string, string>>(PROACTIVE_TRIGGER_KEY, {})
  map[String(userId)] = new Date().toISOString().split('T')[0]!
  write(PROACTIVE_TRIGGER_KEY, map)
}

export function shouldShowDailyProactive(userId: number): boolean {
  const firstSeen = getUserFirstSeen(userId)
  const daysSince = (Date.now() - firstSeen) / (1000 * 60 * 60 * 24)
  if (daysSince >= 7) return false
  const today = new Date().toISOString().split('T')[0]!
  return read<Record<string, string>>(PROACTIVE_TRIGGER_KEY, {})[String(userId)] !== today
}
