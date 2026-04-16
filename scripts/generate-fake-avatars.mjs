#!/usr/bin/env node
/**
 * 一次性脚本：调真后端生成 10 份 plaza 假人的 avatar + Lottie。
 *
 * 产物：
 *   - 覆盖 src/fakePresence/lottie/{archetype}-{gender}.json（占位 → 真 Lottie）
 *   - 在 stdout 打印每个假人的 avatar CDN URL，复制回 src/fakePresence/fakeUsers.ts
 *     的 avatarUrl 字段（手动一次）
 *
 * 用法：
 *   API_BASE=https://chataigram.com/api \
 *   USER_ID=123 \
 *   node scripts/generate-fake-avatars.mjs
 *
 *   # 只跑指定几个：
 *   ONLY=cyberpunk-m,witch-f node scripts/generate-fake-avatars.mjs
 *
 *   # dry-run（不写盘，只看流程通不通）：
 *   DRY=1 node scripts/generate-fake-avatars.mjs
 *
 * 前置：你已登录后端，知道自己的 user_id。后端 /update_avatar 用 X-User-Id 识别。
 * 如果后端要求 Cookie/Bearer，加 AUTH_HEADER='Cookie: session=...' 或 BEARER=xxx。
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const LOTTIE_DIR = resolve(REPO_ROOT, 'src/fakePresence/lottie')

const API_BASE = process.env.API_BASE
const USER_ID = process.env.USER_ID
const BEARER = process.env.BEARER ?? ''
const AUTH_HEADER = process.env.AUTH_HEADER ?? ''
const ONLY = process.env.ONLY?.split(',').map((s) => s.trim()).filter(Boolean) ?? null
const DRY = process.env.DRY === '1'
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 5_000)
const POLL_TIMEOUT_MS = Number(process.env.POLL_TIMEOUT_MS ?? 900_000) // 15 分钟兜底；真·动画转换后端耗时浮动大

if (!API_BASE) {
  console.error('missing API_BASE (e.g. https://chataigram.com/api)')
  process.exit(1)
}
if (!USER_ID) {
  console.error('missing USER_ID')
  process.exit(1)
}

/**
 * psd_svr 分层友好的 prompt（v2）。v1 因遮挡 / 持物 / 前景被分层卡住（例如
 * cyberpunk-m 的 glowing visor 让 face 抠空、victorian-f 的 parasol 让左手混进道具）。
 *
 * v2 规则：
 *   - 脸完全露出：no mask / visor / helmet / hair covering eyes
 *   - 双手可见且不持道具
 *   - 正面姿势：standing upright facing camera, both hands at sides
 *   - 简洁背景：无 fence / forest / graveyard 等前景遮挡
 *   - 保留每个 archetype 的核心识别元素（发色 / 服装 / 种族特征）
 */
const PROMPTS = [
  {
    key: 'cyberpunk-m',
    prompt:
      'A cyberpunk male with neon blue hair and sharp confident features, full body, fully visible face with clear eyes nose mouth, wearing a fitted leather jacket and cargo pants, standing upright facing camera, both hands at sides, clean dark studio background',
  },
  {
    key: 'victorian-f',
    prompt:
      'A Victorian woman with porcelain skin and delicate features, full body, fully visible face with bright eyes, elaborate updo hairstyle, wearing a flowing lavender gown, standing upright facing camera, both hands at sides, soft pastel background',
  },
  {
    key: 'samurai-m',
    prompt:
      'A samurai warrior with a calm expression and fully visible face, full body, wearing traditional armor with dragon motifs, katana sheathed at belt (not held), standing upright facing camera, both hands at sides, clean solid background',
  },
  {
    key: 'elf-f',
    prompt:
      'A forest elf woman with pointed ears and bright green eyes, full body, fully visible face, flowing auburn hair pulled behind shoulders, wearing fitted leaf-patterned robes, standing upright facing camera, both hands at sides, clean soft green background',
  },
  {
    key: 'cowboy-m',
    prompt:
      'A cowboy with a sun-tanned fully visible face under a small brimmed hat tipped back (not covering eyes), full body, wearing an open denim shirt and leather chaps, standing upright facing camera, both hands at sides, clean desert-beige background',
  },
  {
    key: 'astronaut-m',
    prompt:
      'An astronaut man with a determined expression and fully visible face, no helmet, full body, short hair, wearing a sleek white spacesuit, standing upright facing camera, both hands at sides, clean light-gray background',
  },
  {
    key: 'witch-f',
    prompt:
      'A witch woman with silver hair and piercing violet eyes, full body, fully visible face, wearing a fitted dark purple robe (not draped, not cloak), standing upright facing camera, both hands at sides, clean deep-blue background',
  },
  {
    key: 'baker-f',
    prompt:
      'A baker woman with rosy cheeks and a warm smile on a fully visible face, full body, short hair tucked behind ears, wearing a flour-dusted apron over a simple dress, standing upright facing camera, both hands at sides, clean cream background',
  },
  {
    key: 'monk-m',
    prompt:
      'A monk man with shaved head and a serene smile on a fully visible face, full body, wearing orange robes with the right shoulder bare, standing upright facing camera (not meditating), both hands at sides, clean warm-yellow background',
  },
  {
    key: 'punk-f',
    prompt:
      'A punk rocker woman with spiked hair and a fierce confident expression on a fully visible face, full body, wearing a leather jacket covered in patches over ripped jeans, standing upright facing camera, both hands at sides, clean dark-gray background',
  },
]

function authHeaders() {
  const h = { 'X-User-Id': String(USER_ID) }
  if (BEARER) h['Authorization'] = `Bearer ${BEARER}`
  if (AUTH_HEADER) {
    const idx = AUTH_HEADER.indexOf(':')
    if (idx > 0) {
      h[AUTH_HEADER.slice(0, idx).trim()] = AUTH_HEADER.slice(idx + 1).trim()
    }
  }
  return h
}

/**
 * 调 SSE generate_stream。返回 { resultUrl, prompt }。
 * 协议参考 docs/core-api.md 的 useAvatarGenerate。
 */
async function generateAvatar(promptText) {
  const res = await fetch(`${API_BASE}/avatar/generate_stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      user_id: Number(USER_ID),
      text: promptText,
      style_chips: [],
    }),
  })
  if (!res.ok) throw new Error(`generate_stream HTTP ${res.status}`)
  if (!res.body) throw new Error('generate_stream missing body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      const trimmed = part.trim()
      if (!trimmed) continue
      let eventType = 'message'
      let dataStr = ''
      for (const line of trimmed.split('\n')) {
        if (line.startsWith('event: ')) eventType = line.slice(7)
        else if (line.startsWith('data: ')) dataStr = line.slice(6)
      }
      if (!dataStr) continue
      let data
      try {
        data = JSON.parse(dataStr)
      } catch {
        continue
      }
      if (eventType === 'step') {
        process.stdout.write(`    step=${data.step} elapsed=${data.elapsed ?? 0}s\n`)
      } else if (eventType === 'done') {
        result = { resultUrl: data.result_url, prompt: data.prompt ?? '' }
      } else if (eventType === 'error') {
        throw new Error(data.error ?? 'pipeline failed')
      }
    }
  }

  if (!result?.resultUrl) throw new Error('stream ended without result_url')
  return result
}

/**
 * 网络级重试包装：对 `fetch` 的 "fetch failed"（TCP/DNS/TLS 抖动）做短暂重试。
 * 返回 Response（让调用方自己判 HTTP 状态码；只重试 network-level 异常）。
 */
async function fetchWithRetry(url, init, { attempts = 3, baseDelayMs = 4_000 } = {}) {
  let lastErr
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fetch(url, init)
    } catch (err) {
      lastErr = err
      if (i < attempts) {
        const wait = baseDelayMs * i
        console.log(`    (fetch抖动 ${err.message}，第${i}次失败，${wait / 1000}s 后重试)`)
        await new Promise((r) => setTimeout(r, wait))
      }
    }
  }
  throw lastErr
}

async function updateAvatar(avatarUrl) {
  const res = await fetchWithRetry(`${API_BASE}/update_avatar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ avatar_url: avatarUrl }),
  })
  if (!res.ok) throw new Error(`update_avatar HTTP ${res.status}`)
  const json = await res.json()
  if (json.ret_code !== 200) throw new Error(json.error ?? 'update_avatar failed')
  return json.animation_task_id ?? null
}

async function pollAnimation(taskId) {
  const start = Date.now()
  let attempt = 0
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    attempt++
    const elapsed = Math.round((Date.now() - start) / 1000)
    // 单次 fetch 抖动不应终止整个 task；视为这次 poll 失败，下次 interval 再试
    let res
    try {
      res = await fetch(`${API_BASE}/animations/${taskId}`, {
        headers: authHeaders(),
      })
    } catch (err) {
      console.log(`    [${attempt}] ${elapsed}s → fetch 抖动: ${err.message}`)
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      continue
    }
    if (res.ok) {
      let json
      try {
        json = await res.json()
      } catch {
        json = null
      }
      if (json?.lottie) {
        console.log(`    [${attempt}] ${elapsed}s → lottie ready`)
        return json.lottie
      }
      // 200 但还没 lottie：打印返回形状帮诊断（截断避免刷屏）
      const preview = JSON.stringify(json ?? {}).slice(0, 160)
      console.log(`    [${attempt}] ${elapsed}s → 200 waiting: ${preview}`)
    } else {
      // 非 200：读 body 前 160 字节诊断
      let text = ''
      try {
        text = (await res.text()).slice(0, 160)
      } catch {
        /* ignore */
      }
      console.log(`    [${attempt}] ${elapsed}s → HTTP ${res.status} ${text}`)
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }
  throw new Error(`animation poll timeout for ${taskId}`)
}

/**
 * RESUME 模式：如果 env 里配了 RESUME_<KEY_UPPER>=<taskId>，跳过 generate + update_avatar，
 * 直接 poll 已存在 task，适合之前 generate 成功但 poll 超时的场景避免重复消耗 LLM。
 *   e.g. RESUME_CYBERPUNK_M=83182e4781ad ONLY=cyberpunk-m pnpm gen:fake-avatars
 */
function resumeTaskIdFor(key) {
  const envKey = `RESUME_${key.toUpperCase().replace(/-/g, '_')}`
  return process.env[envKey] || null
}

/**
 * FROM_AVATAR 模式：如果 env 里配了 FROM_AVATAR_<KEY_UPPER>=<url>，跳过 generate，
 * 直接从 update_avatar 开始跑（给 avatar 生成成功但 update_avatar/poll 挂掉的场景用）。
 *   e.g. FROM_AVATAR_COWBOY_M='https://cdn.../xxx.webp' ONLY=cowboy-m pnpm gen:fake-avatars
 */
function fromAvatarUrlFor(key) {
  const envKey = `FROM_AVATAR_${key.toUpperCase().replace(/-/g, '_')}`
  return process.env[envKey] || null
}

async function processOne({ key, prompt }) {
  const resumeTaskId = resumeTaskIdFor(key)
  const fromAvatarUrl = fromAvatarUrlFor(key)
  let resultUrl = ''
  let taskId = ''

  if (resumeTaskId) {
    taskId = resumeTaskId
    console.log(`\n[${key}] RESUME task=${taskId} (skip generate + update_avatar)`)
  } else if (fromAvatarUrl) {
    resultUrl = fromAvatarUrl
    console.log(`\n[${key}] FROM_AVATAR ${resultUrl} (skip generate)`)
    console.log(`[${key}] update_avatar → animation task...`)
    const tid = await updateAvatar(resultUrl)
    if (!tid) {
      console.warn(`[${key}]   no animation_task_id, skip Lottie fetch`)
      return { key, avatarUrl: resultUrl, taskId: null, lottie: null }
    }
    taskId = tid
    console.log(`[${key}]   task: ${taskId}`)
  } else {
    console.log(`\n[${key}] generating avatar...`)
    const out = await generateAvatar(prompt)
    resultUrl = out.resultUrl
    console.log(`[${key}]   avatar: ${resultUrl}`)

    console.log(`[${key}] update_avatar → animation task...`)
    const tid = await updateAvatar(resultUrl)
    if (!tid) {
      console.warn(`[${key}]   no animation_task_id, skip Lottie fetch`)
      return { key, avatarUrl: resultUrl, taskId: null, lottie: null }
    }
    taskId = tid
    console.log(`[${key}]   task: ${taskId}`)
  }

  console.log(`[${key}] polling Lottie (every ${POLL_INTERVAL_MS / 1000}s)...`)
  const lottie = await pollAnimation(taskId)
  const filePath = resolve(LOTTIE_DIR, `${key}.json`)
  if (DRY) {
    console.log(`[${key}]   [dry] would write ${filePath} (${JSON.stringify(lottie).length} bytes)`)
  } else {
    mkdirSync(LOTTIE_DIR, { recursive: true })
    writeFileSync(filePath, JSON.stringify(lottie))
    console.log(`[${key}]   wrote ${filePath}`)
  }
  return { key, avatarUrl: resultUrl, taskId, lottie }
}

const tasks = ONLY ? PROMPTS.filter((p) => ONLY.includes(p.key)) : PROMPTS
if (tasks.length === 0) {
  console.error('no prompts matched ONLY filter:', ONLY)
  process.exit(1)
}

console.log(`processing ${tasks.length} prompts (DRY=${DRY ? 'on' : 'off'})`)

const summary = []
for (const t of tasks) {
  try {
    const result = await processOne(t)
    summary.push(result)
  } catch (err) {
    console.error(`[${t.key}] FAILED:`, err.message)
    summary.push({ key: t.key, error: err.message })
  }
}

console.log('\n── summary ────────────────────────────────────────')
console.log('粘到 src/fakePresence/fakeUsers.ts 的对应 avatarUrl：')
for (const r of summary) {
  if (r.error) console.log(`  ${r.key}: ERROR ${r.error}`)
  else console.log(`  ${r.key}: ${r.avatarUrl}`)
}
