/**
 * MSW handlers —— 本地开发 / 被 core 堵住时的假数据源。
 *
 * 关键纪律：
 * 1. handler 返回**后端真实形状**（snake_case），不是 core 的 camelCase
 *    —— 因为 core 内部会做 normalize，mock 也走完整链路才接近真实
 * 2. 每个 handler 顶部注释 wishlist 链接（如果是为 wishlist 条目写的）
 * 3. 合并真 hook 后，删掉对应 handler
 */
import { http, HttpResponse } from 'msw'

// 后端 PostItem 的形状（snake_case）—— core 会 normalize 成 Post
type PostRow = {
  id: number
  pid: number
  telegram_id: number
  photo_url: string | null
  content: string | null
  type: number
  like_num: number
  relay_num: number
  comment_num: number
  share_num: number
  optional: string | null
  has_remixes: boolean
}

type FeedResponse = {
  ret_code: number
  posts: PostRow[]
  next_offset: number | null
}

// ──────────────────────────────────────────────────────────
//  fixtures
// ──────────────────────────────────────────────────────────

const FAKE_POSTS: PostRow[] = [
  {
    id: 101,
    pid: 0,
    telegram_id: 1001,
    photo_url: 'https://picsum.photos/seed/cat1/600/600',
    content: '今天画了一只赛博朋克风的猫',
    type: 2,
    like_num: 42,
    relay_num: 3,
    comment_num: 5,
    share_num: 1,
    optional: 'cyberpunk cat, neon lights, rain, blade runner',
    has_remixes: true,
  },
  {
    id: 102,
    pid: 0,
    telegram_id: 1002,
    photo_url: 'https://picsum.photos/seed/forest/600/800',
    content: '吉卜力风格的森林小屋',
    type: 2,
    like_num: 128,
    relay_num: 12,
    comment_num: 9,
    share_num: 4,
    optional: 'ghibli forest house, watercolor, soft light',
    has_remixes: false,
  },
  {
    id: 103,
    pid: 0,
    telegram_id: 1003,
    photo_url: 'https://picsum.photos/seed/space/600/600',
    content: 'mock 数据 —— 切到真后端时这条会消失',
    type: 2,
    like_num: 7,
    relay_num: 0,
    comment_num: 0,
    share_num: 0,
    optional: null,
    has_remixes: false,
  },
  {
    id: 104,
    pid: 0,
    telegram_id: 1004,
    photo_url: 'https://picsum.photos/seed/coffee/600/700',
    content: null,
    type: 2,
    like_num: 23,
    relay_num: 1,
    comment_num: 3,
    share_num: 0,
    optional: 'morning coffee, warm tones, cozy',
    has_remixes: false,
  },
]

// ──────────────────────────────────────────────────────────
//  handlers
// ──────────────────────────────────────────────────────────

export const handlers = [
  http.get('/api/feed', ({ request }) => {
    const url = new URL(request.url)
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const limit = Number(url.searchParams.get('limit') ?? 10)
    const slice = FAKE_POSTS.slice(offset, offset + limit)
    const payload: FeedResponse = {
      ret_code: 200,
      posts: slice,
      next_offset: offset + slice.length < FAKE_POSTS.length ? offset + slice.length : null,
    }
    return HttpResponse.json(payload)
  }),

  http.post('/api/posts/:postId/like', ({ params }) => {
    const postId = Number(params['postId'])
    const post = FAKE_POSTS.find((p) => p.id === postId)
    if (!post) {
      return HttpResponse.json({ ret_code: 404, error: 'Post not found' }, { status: 404 })
    }
    post.like_num += 1
    return HttpResponse.json({ ret_code: 200, like_num: post.like_num })
  }),

  // ──────────────────────────────────────────────────────────
  //  auth
  // ──────────────────────────────────────────────────────────

  http.post('/api/login', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as
      | { username?: string; password?: string }
      | null
    if (!body?.username || !body?.password) {
      return HttpResponse.json({ ret_code: 400, error: 'Missing credentials' })
    }
    // mock：任何非空凭据都当成 alice 登录成功
    return HttpResponse.json({
      ret_code: 200,
      user_id: 1001,
      name: 'Alice (mock)',
      username: body.username,
      avatar: 'https://picsum.photos/seed/alice/200/200',
      animation_task_id: null,
    })
  }),

  http.post('/api/register', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as
      | { name?: string; username?: string; password?: string; invite_code?: string }
      | null
    if (!body?.name || !body?.username || !body?.password) {
      return HttpResponse.json({ ret_code: 400, error: 'Missing fields' })
    }
    return HttpResponse.json({
      ret_code: 200,
      user_id: Math.floor(Math.random() * 10_000) + 2000,
      name: body.name,
      username: body.username,
      avatar: null,
      animation_task_id: 'mock-task-' + Date.now(),
    })
  }),

  http.get('/api/check_username', ({ request }) => {
    const username = new URL(request.url).searchParams.get('username') ?? ''
    // mock：用户名是 "taken" 或 "admin" 时判定已占用
    const taken = ['taken', 'admin', 'alice'].includes(username.toLowerCase())
    return HttpResponse.json({ available: !taken })
  }),

  http.get('/api/user_info', ({ request }) => {
    const userId = new URL(request.url).searchParams.get('user_id')
    if (!userId) return HttpResponse.json(null)
    return HttpResponse.json({
      id: Number(userId),
      name: `user-${userId} (mock)`,
      username: `user${userId}`,
      avatar: `https://picsum.photos/seed/u${userId}/200/200`,
    })
  }),

  // ──────────────────────────────────────────────────────────
  //  create / remix / voice / generate (core 0.0.3)
  // ──────────────────────────────────────────────────────────

  http.post('/api/posts', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      telegram_id?: number
      photo_url?: string
      content?: string | null
      optional?: string | null
      status?: 'published' | 'draft'
    } | null
    if (!body?.telegram_id || !body?.photo_url) {
      return HttpResponse.json({ ret_code: 400, error: 'Missing telegram_id or photo_url' })
    }
    const postId = Math.floor(Math.random() * 100_000) + 500
    // 顺便加进 FAKE_POSTS 让 feed 能看到
    FAKE_POSTS.unshift({
      id: postId,
      pid: 0,
      telegram_id: body.telegram_id,
      photo_url: body.photo_url,
      content: body.content ?? null,
      type: 2,
      like_num: 0,
      relay_num: 0,
      comment_num: 0,
      share_num: 0,
      optional: body.optional ?? null,
      has_remixes: false,
    })
    return HttpResponse.json({ ret_code: 200, post_id: postId })
  }),

  // Remix — mock 立即返回 task_id，然后让 /remix_tasks 假装很快完成
  http.post('/api/posts/:postId/remix', () => {
    const taskId = 'remix-' + Math.random().toString(36).slice(2, 10)
    return HttpResponse.json({ ret_code: 200, task_id: taskId })
  }),

  http.post('/api/posts/ghibli', () => {
    const taskId = 'ghibli-' + Math.random().toString(36).slice(2, 10)
    return HttpResponse.json({ ret_code: 200, task_id: taskId })
  }),

  http.get('/api/remix_tasks/:taskId', ({ params }) => {
    const taskId = String(params['taskId'])
    // mock 逻辑：task_id 的前 2 位字符 ≥ 'f' 算作 done，其他 pending
    // 让 useRemixTask 的轮询能看到状态变化
    const suffix = taskId.split('-')[1] ?? ''
    const isDone = (suffix.charCodeAt(0) || 0) >= 'f'.charCodeAt(0)
    if (isDone) {
      return HttpResponse.json({
        ret_code: 200,
        status: 'done',
        post: {
          id: Math.floor(Math.random() * 100_000) + 900,
          pid: 1,
          telegram_id: 1001,
          photo_url: `https://picsum.photos/seed/${taskId}/600/600`,
          content: `remix result (${taskId})`,
          type: 2,
          like_num: 0,
          relay_num: 0,
          comment_num: 0,
          share_num: 0,
          optional: null,
          has_remixes: false,
        },
      })
    }
    return HttpResponse.json({ ret_code: 200, status: 'pending' })
  }),

  http.post('/api/voice/transcribe', () => {
    return HttpResponse.json({
      ret_code: 200,
      text: '（mock）把这个改成蓝色的',
      confidence: 0.92,
    })
  }),

  http.post('/api/posts/:postId/publish', ({ params }) => {
    const postId = Number(params['postId'])
    return HttpResponse.json({ ret_code: 200, post_id: postId })
  }),

  http.delete('/api/posts/:postId', ({ params }) => {
    const postId = Number(params['postId'])
    const idx = FAKE_POSTS.findIndex((p) => p.id === postId)
    if (idx >= 0) FAKE_POSTS.splice(idx, 1)
    return HttpResponse.json({ ret_code: 200 })
  }),

  http.post('/api/generate', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as
      | { prompt?: string; user_id?: number }
      | null
    if (!body?.prompt) {
      return HttpResponse.json({ ret_code: 400, error: 'Missing prompt' })
    }
    const seed = encodeURIComponent(body.prompt.slice(0, 20))
    return HttpResponse.json({
      ret_code: 200,
      image_url: `https://picsum.photos/seed/${seed}/600/600`,
      task_id: null,
    })
  }),

  // ──────────────────────────────────────────────────────────
  //  inbox / notifications (core 0.0.3)
  // ──────────────────────────────────────────────────────────

  http.get('/api/notifications', () => {
    return HttpResponse.json({
      ret_code: 200,
      notifications: [
        {
          id: 1001,
          type: 'like',
          sender: { id: 2001, name: 'Alice', avatar: 'https://picsum.photos/seed/a/100' },
          content: 'liked your post',
          is_read: false,
          created_at: new Date(Date.now() - 3600_000).toISOString(),
        },
        {
          id: 1002,
          type: 'remix',
          sender: { id: 2002, name: 'Bob', avatar: 'https://picsum.photos/seed/b/100' },
          content: { action: 'remix', postId: 101 },
          is_read: false,
          created_at: new Date(Date.now() - 7200_000).toISOString(),
        },
        {
          id: 1003,
          type: 'comment',
          sender: { id: 2003, name: 'Carol', avatar: null },
          content: 'nice!',
          is_read: true,
          created_at: new Date(Date.now() - 86_400_000).toISOString(),
        },
      ],
    })
  }),

  http.post('/api/notifications/read', () => {
    return HttpResponse.json({ ret_code: 200 })
  }),

  http.get('/api/notifications/unread-count', () => {
    return HttpResponse.json({ ret_code: 200, count: 2 })
  }),

  // ──────────────────────────────────────────────────────────
  //  user-posts (profile; core 0.0.3)
  // ──────────────────────────────────────────────────────────

  http.get('/api/user-posts', ({ request }) => {
    const url = new URL(request.url)
    const telegramId = Number(url.searchParams.get('telegram_id') ?? 0)
    const status = url.searchParams.get('status') ?? 'published'
    // mock：返回该用户 3 条假帖
    const posts = Array.from({ length: 3 }).map((_, i) => ({
      id: telegramId * 10 + i,
      photo_url: `https://picsum.photos/seed/u${telegramId}p${i}/400/400`,
      optional: `mock prompt ${i}`,
      content: i === 0 ? 'latest post' : null,
      status,
      created_at: new Date(Date.now() - i * 86_400_000).toISOString(),
    }))
    return HttpResponse.json({ ret_code: 200, posts, has_more: false })
  }),
]
