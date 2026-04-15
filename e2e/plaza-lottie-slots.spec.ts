import { test, expect } from '@playwright/test'

/**
 * L4 E2E: PlazaPage Lottie 配额端到端验证。
 *
 * 走真实浏览器 + MSW 假 WS + 假 /api/animations —— 端到端覆盖：
 *   1. 总在线用户数正确落到 DOM
 *   2. Lottie 硬上限 8 = self 1 + others 7
 *   3. 其余用户退回 CdnImg 静态头像
 *   4. 互动过的用户（mock viewer_context 里的 Alice）优先吃到 Lottie 名额
 *
 * 不走 L2/L3 的 mock，这里拿到的是 lottie-react 真实渲染的行为。
 */

test.beforeEach(async ({ page }) => {
  // 预埋登录态，绕过 LoginPage；user_id=1 进 plaza WS
  await page.addInitScript(() => {
    localStorage.setItem(
      'omnient_current_user',
      JSON.stringify({
        id: 1,
        name: 'E2E',
        username: 'e2e',
        avatarUrl: null,
      }),
    )
  })
})

test('plaza renders all 18 mock users after WS init', async ({ page }) => {
  await page.goto('/plaza')

  // WS mock init 有 self + Alice + Bob + 15 bots = 18 人
  await expect(page.locator('.avatar-name')).toHaveCount(18, { timeout: 10_000 })
})

test('Lottie count capped at 8 (self + 7 others); rest fall back to CdnImg', async ({ page }) => {
  await page.goto('/plaza')
  await expect(page.locator('.avatar-name')).toHaveCount(18, { timeout: 10_000 })

  // `.avatar-img-wrap.floating` 表示还没 Lottie（fallback 到头像/首字母）
  // 非 `.floating` 的表示已经真正渲染 Lottie
  //
  // 候选池（非自己 & 有 animation_task_id）= Alice + 15 bots = 16 人，
  // 取前 7 = 7 个 Lottie；加上 self = 8 个 Lottie；
  // 剩下 18 - 8 = 10 个走 CdnImg / fallback。
  await expect(page.locator('.avatar-img-wrap:not(.floating)')).toHaveCount(8, {
    timeout: 10_000,
  })
  await expect(page.locator('.avatar-img-wrap.floating')).toHaveCount(10)
})

test('interacted user (Alice) is guaranteed a Lottie slot', async ({ page }) => {
  await page.goto('/plaza')
  await expect(page.locator('.avatar-name')).toHaveCount(18, { timeout: 10_000 })

  // mock viewer_context.interacted_user_ids 包含 Alice（9001）
  // Tier II 内 interacted 优先，所以 Alice 必在 7 个名额内
  const aliceWrap = page
    .locator('.avatar-marker', { hasText: 'Mock Alice' })
    .locator('.avatar-img-wrap')
  await expect(aliceWrap).toBeAttached({ timeout: 10_000 })

  // 等 Lottie 真正加载完成（.floating 被移除）
  await expect(aliceWrap).not.toHaveClass(/floating/, { timeout: 10_000 })
})

test('user with null animation_task_id never takes a Lottie slot', async ({ page }) => {
  await page.goto('/plaza')
  await expect(page.locator('.avatar-name')).toHaveCount(18, { timeout: 10_000 })

  // Bob 没 animation_task_id，必在 .floating（走 CdnImg），
  // 等待 Lotties 加载完也不会变
  const bobWrap = page
    .locator('.avatar-marker', { hasText: 'Mock Bob' })
    .locator('.avatar-img-wrap')
  await expect(bobWrap).toHaveClass(/floating/, { timeout: 10_000 })

  // 额外验证：Bob 这格里必有 <img>（CdnImg 渲染的），没有 Lottie
  await expect(bobWrap.locator('img.avatar-img')).toBeAttached()
})
