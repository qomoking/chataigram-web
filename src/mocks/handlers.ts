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
]
