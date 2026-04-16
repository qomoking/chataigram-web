#!/usr/bin/env node
/**
 * 把 src/fakePresence/lottie/*.json 的 position 摇摆从 x 方向改成 y 方向，
 * 且幅度缩到原来的 1/3（夹在 [5, 20]px 内），形成"上下轻微呼吸"的效果。
 *
 * 背景：backend `_make_layer` 产出的是 x 方向左右摆（视差/转头感），但假人撑场子
 * 场景更适合轻微上下呼吸。与其改 backend 公式 + 重刷 + 重拉，不如本地一次性转换。
 *
 * 映射规则（对每个 layer 的 ks.p 关键帧的 s/e 坐标）：
 *   原 [cx,       cy, 0]  →  [cx, cy,           0]
 *   原 [cx+shift, cy, 0]  →  [cx, cy - shift_y, 0]  （原"右峰" → "上峰"，Lottie 里 -y 是向上）
 *   原 [cx-shift, cy, 0]  →  [cx, cy + shift_y, 0]  （原"左峰" → "下峰"）
 *   shift_y = clamp(|shift|/3, 5, 20)
 *
 * 其他字段（t / i / o 缓动、scale / opacity）不动。
 *
 * 用法：
 *   node scripts/transform-fake-lottie-to-vertical.mjs           # 真实转换并写回
 *   node scripts/transform-fake-lottie-to-vertical.mjs --dry-run # 只打印每层变化
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOTTIE_DIR = resolve(__dirname, '..', 'src/fakePresence/lottie')
const DRY = process.argv.includes('--dry-run')

const MIN_SHIFT_Y = 5
const MAX_SHIFT_Y = 20
const SCALE_DOWN = 3

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

/** 把一个 position 坐标 (x, y, z) 按规则映射 — cx/cy 是图像中心。 */
function mapPoint(pt, cx, cy) {
  if (!Array.isArray(pt) || pt.length < 2) return pt
  const [x, y, z] = pt
  const xOffset = x - cx
  if (xOffset === 0) return [cx, cy, z ?? 0]
  const signed = Math.sign(xOffset)
  const scaled = clamp(Math.abs(xOffset) / SCALE_DOWN, MIN_SHIFT_Y, MAX_SHIFT_Y)
  // 原 x+（右峰）→ y-（上峰）；原 x-（左峰）→ y+（下峰）
  return [cx, cy - signed * scaled, z ?? 0]
}

/** 转换单个 layer.ks.p.k。返回变化摘要 {cx, cy, peaks: [xBefore, yAfter]}. */
function transformLayer(layer) {
  const p = layer?.ks?.p
  if (!p || p.a !== 1 || !Array.isArray(p.k)) return null
  const cx = (layer.w ?? 0) / 2
  const cy = (layer.h ?? 0) / 2
  if (cx === 0 || cy === 0) return null

  const peaks = []
  for (const kf of p.k) {
    if (Array.isArray(kf.s)) {
      const before = kf.s.slice()
      kf.s = mapPoint(kf.s, cx, cy)
      if (before[0] !== cx) peaks.push({ xBefore: before[0] - cx, yAfter: kf.s[1] - cy })
    }
    if (Array.isArray(kf.e)) {
      kf.e = mapPoint(kf.e, cx, cy)
    }
  }
  return { tag: layer.nm, cx, cy, peaks }
}

function processFile(filePath) {
  const raw = readFileSync(filePath, 'utf8')
  const lottie = JSON.parse(raw)
  const summary = []
  for (const layer of lottie.layers ?? []) {
    const r = transformLayer(layer)
    if (r) summary.push(r)
  }
  if (DRY) {
    console.log(`[dry] ${filePath}`)
    for (const s of summary.slice(0, 3)) {
      const sample = s.peaks[0]
      const sampleStr = sample ? ` sample: x${sample.xBefore > 0 ? '+' : ''}${sample.xBefore.toFixed(1)} → y${sample.yAfter > 0 ? '+' : ''}${sample.yAfter.toFixed(1)}` : ''
      console.log(`    ${s.tag.padEnd(14)}${sampleStr}`)
    }
    if (summary.length > 3) console.log(`    ... +${summary.length - 3} more`)
    return
  }
  writeFileSync(filePath, JSON.stringify(lottie))
  console.log(`[write] ${filePath}  (${summary.length} layers)`)
}

const files = readdirSync(LOTTIE_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => resolve(LOTTIE_DIR, f))

if (files.length === 0) {
  console.error('no .json files in', LOTTIE_DIR)
  process.exit(1)
}

console.log(`processing ${files.length} files (DRY=${DRY ? 'on' : 'off'})`)
for (const f of files) processFile(f)
console.log('done')
