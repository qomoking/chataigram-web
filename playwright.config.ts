import { defineConfig, devices } from '@playwright/test'

/**
 * L4 E2E 配置。
 *
 * - testDir: e2e/
 * - 启动 vite dev（带 MSW mocks）作为被测服务；dev server 已自己
 *   intercept /api/*，无需真后端。
 * - 仅 chromium —— CI 速度 / 本地下载体量最小。
 * - failure 时保留 trace，CI 里用 upload-artifact 拿回来 diagnose。
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      // 用 Pixel 5 尺寸 —— 小于 600px，绕过 index.css 里的桌面 9:16 手机框
      // 测试沉浸式 feed 这种"占满屏幕"的交互才不会被 TabBar / viewport 挤出
      name: 'chromium',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'pnpm dev:mocks',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
