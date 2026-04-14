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
import { plazaWsHandler } from './plaza-ws'

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

  // 某帖的 remix 子树（core 0.0.7 useRemixes）
  http.get('/api/posts/:postId/remixes', ({ params }) => {
    const postId = Number(params['postId'])
    const remixes = Array.from({ length: 3 }).map((_, i) => ({
      id: postId * 10 + i + 1,
      pid: postId,
      telegram_id: 2000 + i,
      photo_url: `https://picsum.photos/seed/r${postId}-${i}/600/600`,
      content: i === 0 ? 'remix 变体 A' : i === 1 ? 'remix 变体 B' : '另一个角度',
      type: 2,
      like_num: 3 + i,
      relay_num: 0,
      comment_num: 0,
      share_num: 0,
      optional: null,
      has_remixes: false,
    }))
    return HttpResponse.json({ ret_code: 200, remixes })
  }),

  // 评论（core 0.0.7 useCommentPost）
  http.post('/api/posts/:postId/comment', ({ params }) => {
    const postId = Number(params['postId'])
    const post = FAKE_POSTS.find((p) => p.id === postId)
    if (post) post.comment_num += 1
    return HttpResponse.json({
      ret_code: 200,
      comment_num: post?.comment_num ?? 1,
    })
  }),

  // 通知 ❤️ 回应（core 0.0.7 useReact）
  http.post('/api/notifications/react', () => {
    return HttpResponse.json({ ret_code: 200 })
  }),

  // 上传图片（core 0.0.7 useUploadImage）
  http.post('/api/upload', () => {
    const seed = Math.random().toString(36).slice(2, 8)
    return HttpResponse.json({
      ret_code: 200,
      image_url: `https://picsum.photos/seed/up-${seed}/800/800`,
    })
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

  // ──────────────────────────────────────────────────────────
  //  invite (core 0.0.4)
  // ──────────────────────────────────────────────────────────

  http.get('/api/invite/my', ({ request }) => {
    const userId = Number(new URL(request.url).searchParams.get('user_id') ?? 0)
    return HttpResponse.json({
      ret_code: 200,
      codes: [
        { code: 'MOCK-' + userId + '-1', used: false, created_at: '2026-03-01' },
        { code: 'MOCK-' + userId + '-2', used: true, used_by: userId + 1, created_at: '2026-03-02' },
      ],
      total_count: 2,
      max_count: 5,
    })
  }),

  http.post('/api/invite/generate', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { user_id?: number } | null
    const newCode = 'NEW-' + Math.random().toString(36).slice(2, 8).toUpperCase()
    return HttpResponse.json({
      ret_code: 200,
      code: newCode,
      total_count: 3,
      max_count: 5,
      user_id: body?.user_id,
    })
  }),

  // ──────────────────────────────────────────────────────────
  //  photo → image SSE pipeline (core 0.0.6)
  // ──────────────────────────────────────────────────────────

  http.post('/api/photo_to_image_stream', () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          )
        }
        // 模拟 4 阶段，每阶段间隔 300ms
        const phases: Array<{ step: string; elapsed: number }> = [
          { step: 'upload', elapsed: 0.1 },
          { step: 'describe', elapsed: 0.5 },
          { step: 'prompt', elapsed: 0.9 },
          { step: 'generate', elapsed: 1.4 },
        ]
        for (const p of phases) {
          send('step', p)
          await new Promise((r) => setTimeout(r, 300))
        }
        const seed = Math.random().toString(36).slice(2, 8)
        send('done', {
          result_url: `https://picsum.photos/seed/${seed}/600/600`,
          cdn_url: `https://picsum.photos/seed/${seed}/600/600`,
          description: 'mock 描述：一张充满创意的画面',
          prompt: `mock prompt seed=${seed}, vibrant colors, professional lighting`,
        })
        controller.close()
      },
    })
    return new HttpResponse(stream, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
      },
    })
  }),

  // ──────────────────────────────────────────────────────────
  //  Lottie animation fetch (PlazaPage 头像动画)
  // ──────────────────────────────────────────────────────────

  http.get('/api/animations/:taskId', () => {
    // 返回一个最小可播放的 Lottie JSON（简单呼吸圆点）
    return HttpResponse.json({
      lottie: {
        v: '5.7.4',
        fr: 30,
        ip: 0,
        op: 60,
        w: 100,
        h: 100,
        nm: 'pulse',
        ddd: 0,
        assets: [],
        layers: [
          {
            ddd: 0,
            ind: 1,
            ty: 4,
            nm: 'dot',
            sr: 1,
            ks: {
              o: {
                a: 1,
                k: [
                  { t: 0, s: [100] },
                  { t: 30, s: [60] },
                  { t: 60, s: [100] },
                ],
              },
              r: { a: 0, k: 0 },
              p: { a: 0, k: [50, 50, 0] },
              a: { a: 0, k: [0, 0, 0] },
              s: {
                a: 1,
                k: [
                  { t: 0, s: [100, 100, 100] },
                  { t: 30, s: [130, 130, 100] },
                  { t: 60, s: [100, 100, 100] },
                ],
              },
            },
            ao: 0,
            shapes: [
              {
                ty: 'el',
                d: 1,
                s: { a: 0, k: [40, 40] },
                p: { a: 0, k: [0, 0] },
                nm: 'ellipse',
              },
              {
                ty: 'fl',
                c: { a: 0, k: [0.545, 0.361, 0.965, 1] },
                o: { a: 0, k: 100 },
                nm: 'fill',
              },
            ],
            ip: 0,
            op: 60,
            st: 0,
            bm: 0,
          },
        ],
        markers: [],
      },
    })
  }),

  // ──────────────────────────────────────────────────────────
  //  VLM / suggestions / avatar (core 0.0.8)
  // ──────────────────────────────────────────────────────────

  http.post('/api/imgdesc', () => {
    return HttpResponse.json({
      ret_code: 200,
      description: 'Mock VLM：画面中有一只戴着太阳镜的猫坐在海边',
    })
  }),

  http.post('/api/suggestion', () => {
    return HttpResponse.json({
      ret_code: 200,
      suggestions: [
        { label: '太空版', prompt: '把猫放到太空里，周围飘浮陨石', emoji: '🚀', desc: '宇宙冒险' },
        { label: '水彩风', prompt: '用水彩风格重绘整个场景，柔和色调', emoji: '🎨', desc: '柔和梦幻' },
      ],
    })
  }),

  http.post('/api/prank_suggestions', () => {
    return HttpResponse.json({
      ret_code: 200,
      suggestions: [
        { label: '混乱', prompt: '一群小动物突然闯入画面', emoji: '😱', desc: '场面失控' },
        { label: '搞笑', prompt: '主角变成玩偶大小', emoji: '😈', desc: '荒诞缩小' },
        { label: '惊喜', prompt: '天空掉下巨大蛋糕', emoji: '🙈', desc: '甜蜜轰炸' },
      ],
    })
  }),

  http.post('/api/update_avatar', () => {
    return HttpResponse.json({
      ret_code: 200,
      animation_task_id: 'mock-anim-' + Math.random().toString(36).slice(2, 8),
    })
  }),

  // ──────────────────────────────────────────────────────────
  //  intent / analyze / search / onboarding (core 0.0.9)
  // ──────────────────────────────────────────────────────────

  http.post('/api/intent', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { prompt?: string } | null
    const p = body?.prompt?.toLowerCase() ?? ''
    const intent = p.includes('feed') || p.includes('trending')
      ? 'feed'
      : p.includes('分析') || p.includes('history')
        ? 'analyze_prompt'
        : 'generate'
    return HttpResponse.json({ ret_code: 200, intent })
  }),

  http.post('/api/analyze_history', () => {
    return HttpResponse.json({
      ret_code: 200,
      result: 'Try a Studio Ghibli inspired sunset scene with warm tones',
    })
  }),

  http.get('/api/search_users', ({ request }) => {
    const q = new URL(request.url).searchParams.get('q') ?? ''
    const users = [
      { id: 9001, name: 'Alice', username: 'alice', avatar: 'https://picsum.photos/seed/a/100' },
      { id: 9002, name: 'Bob', username: 'bob', avatar: 'https://picsum.photos/seed/b/100' },
      { id: 9003, name: 'Carol', username: 'carol', avatar: null },
    ].filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase()))
    return HttpResponse.json({ users, is_recommended: !q })
  }),

  http.post('/api/onboarding', () => {
    return HttpResponse.json({
      ret_code: 200,
      welcome_text: '欢迎来到 ChatAigram！让我帮你创造独一无二的头像和作品。',
      avatar_url: 'https://picsum.photos/seed/onboard/400/400',
    })
  }),

  // ──────────────────────────────────────────────────────────
  //  cdn-config — geo CDN routing
  // ──────────────────────────────────────────────────────────
  http.get('/api/cdn-config', () => {
    return HttpResponse.json({
      region: 'mock',
      cdn_host: 'https://cdn.aiwaves.tech',
      fallback_host: 'https://static.wdabuliu.com',
    })
  }),

  // ──────────────────────────────────────────────────────────
  //  plaza WebSocket (core 0.0.4)
  // ──────────────────────────────────────────────────────────
  plazaWsHandler,
]
