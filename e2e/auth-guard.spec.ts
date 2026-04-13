import { test, expect } from '@playwright/test'

/** 路由守卫：未登录访问 `/` 应被重定向到 `/login`。 */
test('unauthenticated visit to / redirects to /login', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL('**/login', { timeout: 5000 })
  expect(page.url()).toMatch(/\/login$/)
})

/** OAuth 回调：带合法 query → 跳 /，localStorage 被写入 */
test('google callback with valid params lands on feed', async ({ page }) => {
  await page.goto('/auth/callback?user_id=42&name=Alice&username=alice')
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/callback'), {
    timeout: 5000,
  })
  await expect(page).toHaveURL(/\/$/)

  const stored = await page.evaluate(() => localStorage.getItem('omnient_current_user'))
  expect(stored).not.toBeNull()
  expect(JSON.parse(stored!)).toMatchObject({
    id: 42,
    name: 'Alice',
    username: 'alice',
  })
})

/** OAuth 回调：缺参 → 跳 /login?error=oauth */
test('google callback without params lands on /login with error', async ({ page }) => {
  await page.goto('/auth/callback')
  await page.waitForURL('**/login*', { timeout: 5000 })
  expect(page.url()).toContain('error=oauth')
})
