import { test, expect } from '@playwright/test'

/** cards 模式登录成功 → 跳 feed */
test('card mode: successful login navigates to feed', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('选择账号')).toBeVisible()

  // 选 GhostPixel → 输密码 → 点登录
  await page.locator('.user-card').filter({ hasText: 'GhostPixel' }).click()
  await page.getByPlaceholder('密码').fill('any-password')
  await page.getByRole('button', { name: '登录', exact: true }).click()

  // 应该跳到 /，feed 页把 mock 帖子加载出来
  await page.waitForURL((url) => url.pathname === '/', { timeout: 5000 })
  await expect(page.getByText('赛博朋克风的猫')).toBeVisible({ timeout: 5000 })

  // 登录态被写入
  const stored = await page.evaluate(() => localStorage.getItem('omnient_current_user'))
  expect(stored).not.toBeNull()
})

// 登录失败路径：L3 `LoginPage.test.tsx` 已覆盖（见那个文件里的
// "failed login shows 密码错误"）。E2E 不重复，因为 MSW service worker
// 在 Playwright `page.route` 之前拦截，同层级覆盖反而要折腾。

/** username 模式切换 */
test('switches between cards and username mode', async ({ page }) => {
  await page.goto('/login')
  await page.getByText('用户名登录 →').click()
  await expect(page.getByPlaceholder('@用户名')).toBeVisible()

  await page.getByText('返回账号选择').click()
  await expect(page.getByText('选择账号')).toBeVisible()
})

/** 打开 register sheet */
test('invite code arrow opens register sheet', async ({ page }) => {
  await page.goto('/login')
  await page.getByPlaceholder('邀请码').first().fill('INVITE123')
  await page.getByLabel('继续注册').first().click()

  await expect(page.getByText('创建账号')).toBeVisible()
})
