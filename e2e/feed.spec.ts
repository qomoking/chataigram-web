import { test, expect } from '@playwright/test'

/**
 * ImmersiveFeedPage 路由 `/` 的 E2E。
 * 每个测试前 addInitScript 预埋用户到 localStorage，跳过 LoginPage。
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

test('logged-in user sees immersive feed (first post content)', async ({ page }) => {
  await page.goto('/')
  // MSW 假 feed 第一条内容是 "今天画了一只赛博朋克风的猫"
  await expect(page.getByText(/赛博朋克风的猫/)).toBeVisible({ timeout: 5000 })
})

test('like button bumps count on immersive feed', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/赛博朋克风的猫/)).toBeVisible({ timeout: 5000 })

  // ImmersiveFeedPage 的右侧 like 按钮 aria-label="like"，数字紧跟在内部
  const likeBtn = page.getByLabel('like').first()
  await expect(likeBtn).toBeVisible()
  // 第一条帖子的 like_num 是 42
  await expect(likeBtn).toContainText('42')
  // 直接调原生 click —— 沉浸式页面的右侧按钮在某些 viewport 下被 Playwright 误判超出视口
  await likeBtn.evaluate((el) => (el as HTMLElement).click())
  await expect(likeBtn).toContainText('43')
})

test('swipe changes active post (keyboard arrow)', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/赛博朋克风的猫/)).toBeVisible({ timeout: 5000 })

  // 用键盘触发 swipeUp（我们绑了 ArrowDown/Space 触发下一条）
  await page.keyboard.press('ArrowDown')
  // 下一条是 "吉卜力风格的森林小屋"
  await expect(page.getByText(/吉卜力风格的森林小屋/)).toBeVisible({ timeout: 3000 })
})

test('immersive feed image has src set (CdnImg renders)', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/赛博朋克风的猫/)).toBeVisible({ timeout: 5000 })

  // CdnImg should render an <img> with a non-empty src.
  // We check attachment + src attribute rather than visual visibility because
  // in a headless CI viewport the full-screen image container resolves to 0
  // height (imf-page uses height:100% which needs an explicit parent height).
  const img = page.locator('.imf-image').first()
  await expect(img).toBeAttached()

  const src = await img.getAttribute('src')
  expect(src).toBeTruthy()
  expect(src).not.toBe('')
  expect(src).toContain('picsum.photos')
})

test('like button is visible and shows count', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/赛博朋克风的猫/)).toBeVisible({ timeout: 5000 })

  const likeBtn = page.getByLabel('like').first()
  await expect(likeBtn).toBeVisible()
  await expect(likeBtn).toContainText('42')
})
