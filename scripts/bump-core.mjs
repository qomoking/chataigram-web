#!/usr/bin/env node
/**
 * pnpm core:bump
 *
 * 把 packages/core 推到远端 main 的最新 commit，并 stage submodule 指针。
 * 你只需要写 commit message + push 即可。
 *
 * 用法：
 *   pnpm core:bump          # 推到 origin/main 最新
 *   pnpm core:bump <sha>    # 推到指定 SHA / branch / tag
 */
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const corePath = resolve(root, 'packages/core')
const target = process.argv[2] ?? 'origin/main'

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', cwd: corePath, ...opts })
}

function read(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', cwd: corePath, ...opts }).trim()
}

console.log(`==> fetching origin in packages/core`)
run('git fetch origin --tags')

const oldSha = read('git rev-parse --short HEAD')
console.log(`==> current pin: ${oldSha}`)

console.log(`==> checking out ${target}`)
run(`git checkout --detach ${target}`)

const newSha = read('git rev-parse --short HEAD')
const newSubject = read('git log -1 --pretty=%s')

if (oldSha === newSha) {
  console.log(`==> already at ${newSha} — nothing to bump`)
  process.exit(0)
}

console.log(`==> staging submodule pointer in parent repo`)
execSync('git add packages/core', { stdio: 'inherit', cwd: root })

console.log('')
console.log('────────────────────────────────────────────────')
console.log(`  core: ${oldSha} → ${newSha}`)
console.log(`  HEAD: ${newSubject}`)
console.log('────────────────────────────────────────────────')
console.log('')
console.log('下一步：')
console.log(`  git commit -m "chore: bump core to ${newSha}"`)
console.log(`  git push`)
