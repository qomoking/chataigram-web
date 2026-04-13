#!/usr/bin/env node
/**
 * postinstall：保证 packages/core 的 submodule 已初始化。
 *
 * 设计师常忘 `--recursive`，这里兜底。
 * - 不在 git 仓 / 没有 .gitmodules：跳过（CI 或 release 包场景）
 * - 子模块已在位：跳过
 * - 否则：跑 `git submodule update --init --recursive`
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

// 不在 git 仓里就退出
try {
  execSync('git rev-parse --is-inside-work-tree', { cwd: root, stdio: 'ignore' })
} catch {
  process.exit(0)
}

// 没有 .gitmodules 也退
if (!existsSync(resolve(root, '.gitmodules'))) {
  process.exit(0)
}

// core 已经在位（有 package.json）就退
if (existsSync(resolve(root, 'packages/core/package.json'))) {
  process.exit(0)
}

console.log('[postinstall] initializing submodules…')
try {
  execSync('git submodule update --init --recursive', { cwd: root, stdio: 'inherit' })
} catch (err) {
  console.warn('[postinstall] failed to init submodules; continue anyway')
  console.warn(err?.message ?? err)
  // 不阻塞 install
}
