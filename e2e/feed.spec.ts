import { test, expect } from '@playwright/test'

/**
 * Feed 相关 E2E：
 *   - 登录后进 feed，看到 MSW 假帖
 *   - 点赞按钮触发乐观更新
 *
 * 每个 test 前用 addInitScript 预埋用户到 localStorage，跳过 LoginPage。
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'omnient_current_user',
      JSON.stringify({
        id: 1,
        name: 'E2E Test',
        username: 'test',
        avatarUrl: null,
      }),
    )
  })
})

test('logged-in user sees feed posts from MSW', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('赛博朋克风的猫')).toBeVisible({ timeout: 5000 })
  await expect(page.getByText('吉卜力风格的森林小屋')).toBeVisible()
})

test('like button optimistically bumps count', async ({ page }) => {
  await page.goto('/')
  const firstCard = page.locator('article').first()
  await expect(firstCard).toBeVisible({ timeout: 5000 })
  await expect(firstCard.getByText('42')).toBeVisible()

  // 第一个 ❤ 按钮（overlay）—— 触发 like mutation
  await firstCard.getByLabel('like').first().click()
  await expect(firstCard.getByText('43')).toBeVisible()
})

test('save button toggles bookmark persistence', async ({ page }) => {
  await page.goto('/')
  const firstCard = page.locator('article').first()
  await expect(firstCard).toBeVisible({ timeout: 5000 })

  // action row 里最后一个按钮是 bookmark
  const buttons = firstCard.getByRole('button')
  const bookmarkBtn = buttons.last()
  await bookmarkBtn.click()

  // 页面刷新后 bookmark 状态保留（通过 class 判断）
  await page.reload()
  const reloadedCard = page.locator('article').first()
  await expect(reloadedCard).toBeVisible({ timeout: 5000 })
  const reloadedBookmark = reloadedCard.getByRole('button').last()
  await expect(reloadedBookmark).toHaveClass(/saved/)
})
