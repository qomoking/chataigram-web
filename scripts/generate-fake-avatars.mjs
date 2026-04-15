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
const POLL_INTERVAL_MS = 3_000
const POLL_TIMEOUT_MS = 180_000 // 3 分钟，单个动画转换通常 30-90s

if (!API_BASE) {
  console.error('missing API_BASE (e.g. https://chataigram.com/api)')
  process.exit(1)
}
if (!USER_ID) {
  console.error('missing USER_ID')
  process.exit(1)
}

/** 和 src/fakePresence/fakeUsers.ts 的 archetype + prompt 表对齐。 */
const PROMPTS = [
  {
    key: 'cyberpunk-m',
    prompt:
      'A mysterious cyberpunk hacker with neon blue hair and sharp features, full body shot, wearing a leather jacket and glowing visor, standing in a rain-soaked neon-lit alleyway at night',
  },
  {
    key: 'victorian-f',
    prompt:
      'An elegant Victorian lady with porcelain skin and delicate features, full body portrait, elaborate updo hairstyle, wearing a flowing lavender gown, standing in a sunlit garden holding a lace parasol',
  },
  {
    key: 'samurai-m',
    prompt:
      'A fierce samurai warrior with battle-scarred face and intense eyes, full body view, wearing traditional armor with dragon motifs, standing on a misty mountain peak holding a katana',
  },
  {
    key: 'elf-f',
    prompt:
      'A whimsical forest elf with pointed ears and bright green eyes, full body shot, flowing auburn hair, wearing leaf-patterned robes, standing among ancient oak trees playing a wooden flute',
  },
  {
    key: 'cowboy-m',
    prompt:
      'A rugged cowboy with weathered face and piercing gaze, full body portrait, wearing a wide-brimmed hat and leather chaps, leaning against a wooden fence with desert mountains behind',
  },
  {
    key: 'astronaut-m',
    prompt:
      'A futuristic astronaut with visible face and determined expression, full body view, wearing a sleek white spacesuit, floating weightlessly inside a space station with Earth visible through the window',
  },
  {
    key: 'witch-f',
    prompt:
      'A mystical witch with silver hair and piercing violet eyes, full body shot, wearing a flowing dark cloak, standing in a moonlit graveyard holding a glowing crystal staff',
  },
  {
    key: 'baker-f',
    prompt:
      'A cheerful baker with rosy cheeks and warm smile, full body portrait, wearing a flour-dusted apron, standing in a cozy cottage kitchen holding a tray of fresh croissants',
  },
  {
    key: 'monk-m',
    prompt:
      'A stoic monk with shaved head and serene expression, full body view, wearing orange robes and prayer beads, meditating in a bamboo forest with morning mist and golden sunlight',
  },
  {
    key: 'punk-f',
    prompt:
      'A rebellious punk rocker with spiked hair and fierce attitude, full body shot, wearing a leather jacket covered in patches, standing on a graffiti-covered city street holding an electric guitar',
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
 * 协议参考 packages/core/src/hooks/useAvatarGenerate.ts。
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

async function updateAvatar(avatarUrl) {
  const res = await fetch(`${API_BASE}/update_avatar`, {
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
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const res = await fetch(`${API_BASE}/animations/${taskId}`, {
      headers: authHeaders(),
    })
    if (res.ok) {
      const json = await res.json()
      if (json?.lottie) return json.lottie
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }
  throw new Error(`animation poll timeout for ${taskId}`)
}

async function processOne({ key, prompt }) {
  console.log(`\n[${key}] generating avatar...`)
  const { resultUrl } = await generateAvatar(prompt)
  console.log(`[${key}]   avatar: ${resultUrl}`)

  console.log(`[${key}] update_avatar → animation task...`)
  const taskId = await updateAvatar(resultUrl)
  if (!taskId) {
    console.warn(`[${key}]   no animation_task_id, skip Lottie fetch`)
    return { key, avatarUrl: resultUrl, taskId: null, lottie: null }
  }
  console.log(`[${key}]   task: ${taskId}`)

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
