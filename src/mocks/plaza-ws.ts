/**
 * MSW WebSocket mock for /ws/plaza.
 *
 * 模拟行为：
 *   - 连接时推 `init` + 3 个假用户
 *   - 每 15s 推一次假 ping（让 hook 的 pong 回路走一遍）
 *   - 收到 bump → 立刻回一条同形状 bump 广播
 *   - 收到 status_update → 回 status_update 广播
 */
import { ws } from 'msw'

const plaza = ws.link(/\/ws\/plaza/)

export const plazaWsHandler = plaza.addEventListener('connection', ({ client }) => {
  const myIdFromUrl = new URL(client.url).searchParams.get('user_id')
  const myId = myIdFromUrl ? Number(myIdFromUrl) : 0

  // 初始 init
  client.send(
    JSON.stringify({
      type: 'init',
      user: { pos_x: 200, pos_y: 200 },
      users: [
        {
          id: myId,
          name: 'You',
          avatar: null,
          status_text: '在线',
          status_emoji: '🟢',
          animation_task_id: 'mock-anim-self',
          pos_x: 200,
          pos_y: 200,
        },
        {
          id: 9001,
          name: 'Mock Alice',
          avatar: 'https://picsum.photos/seed/a/100',
          status_text: '摸鱼中',
          status_emoji: '🐟',
          animation_task_id: 'mock-anim-9001',
          pos_x: 380,
          pos_y: 120,
        },
        {
          id: 9002,
          name: 'Mock Bob',
          avatar: 'https://picsum.photos/seed/b/100',
          status_text: null,
          status_emoji: '☕️',
          animation_task_id: null,
          pos_x: 120,
          pos_y: 320,
        },
      ],
    }),
  )

  // ping 心跳
  const pingTimer = setInterval(() => {
    try {
      client.send(JSON.stringify({ type: 'ping' }))
    } catch {
      /* client 关闭了 */
    }
  }, 15_000)

  client.addEventListener('message', (event) => {
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(event.data as string) as Record<string, unknown>
    } catch {
      return
    }
    switch (msg['type']) {
      case 'bump':
        // 广播一条 bump（from=myId, to=msg.to）
        client.send(
          JSON.stringify({ type: 'bump', from: myId, to: Number(msg['to']) }),
        )
        break
      case 'status_update':
        client.send(
          JSON.stringify({
            type: 'status_update',
            user_id: myId,
            status_text: msg['status_text'] ?? null,
            status_emoji: msg['status_emoji'] ?? null,
          }),
        )
        break
      case 'pong':
        /* ignore */
        break
    }
  })

  client.addEventListener('close', () => {
    clearInterval(pingTimer)
  })
})
