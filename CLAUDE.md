# Claude instructions — chataigram-web

You are in **chataigram-web** — the frontend app. **设计师主场**。

**先读 `AGENTS.md`（跨仓协议）**。本文件只写本仓专属规则。

`@chataigram/core`（业务 SDK）以 git submodule 挂在 `packages/core/`。你**不能改它**，但可以读 `packages/core/src/index.ts` 查契约。

---

## 这里装什么

```
src/
  pages/         路由页面
  components/    可复用组件（视觉 + 交互）
  layouts/       布局（可选）
  hooks/         纯 UI hook（useMediaQuery / useHover 等）
  mocks/         MSW 假数据（给本地 dev）
  styles/        全局样式 / tokens（可选）
  main.tsx       入口
  App.tsx        根组件 + 路由

public/          静态资源
docs/
  core-wishlist.md   让 core 加东西用
```

## 绝对禁止

- `fetch(` / `axios.*` / `ky(` / `new WebSocket(` / `new XMLHttpRequest(`
  → 全部用 `@chataigram/core` 的 hooks 替代
- 修改 `packages/core/` 的任何文件（CODEOWNERS 拦 PR）
- 读写 `node_modules/@chataigram/core/`（symlink，别碰）
- 引入自己的 HTTP 客户端（那是 core 的活）
- 在 `src/` 下硬编码 API 地址 / 后端域名

ESLint 会拦住大部分。**不要绕过**，有需求就走 wishlist。

---

## 拿数据的标准动作

第一步：读 `packages/core/src/index.ts`，看 core 有没有对应 hook。

**有**：

```tsx
import { useFeed } from '@chataigram/core'

export function FeedPage() {
  const { data, isLoading, error } = useFeed()
  if (isLoading) return <Spinner />
  if (error) return <ErrorState error={error} />
  return <FeedList items={data?.items ?? []} />
}
```

**没有**：

1. 在 `src/mocks/handlers.ts` 加 MSW handler
2. 在 `docs/core-wishlist.md` 追加条目（模板见那个文件）
3. 继续写页面，用 mock 的数据形状

**实在要紧，非 mock 不可**（极少数）：
```ts
import { apiClient } from '@chataigram/core/internals'
// TODO(core): extract to useXxx
const data = await apiClient.get('/...')
```
⚠️ `internals` 无稳定性承诺，属于逃生舱。**尽量不用**。

---

## mock 的写法

`src/mocks/handlers.ts`（MSW v2 语法）：

```ts
import { http, HttpResponse } from 'msw'
import type { FeedItem, Paginated } from '@chataigram/core'

export const handlers = [
  http.get('/api/feed', () => {
    const payload: Paginated<FeedItem> = {
      items: [
        { id: '1', authorId: 'u1', content: 'hello', createdAt: '2026-04-13', likeCount: 0, liked: false },
      ],
      nextCursor: null,
      total: 1,
    }
    return HttpResponse.json(payload)
  }),
]
```

**关键**：`import type from '@chataigram/core'` —— 用 core 的真实类型，保证 mock 形状和真实契约对齐。类型对不上 tsc 会报错，早发现总比线上早。

---

## 路由与页面

- 所有页面在 `src/pages/`
- 路由集中在 `App.tsx` 或 `src/routes.tsx`
- 页面之间共享的视觉归 `src/components/`
- 页面专用的小组件可以放同目录下（colocated）：
  ```
  src/pages/FeedPage/
    FeedPage.tsx
    FeedCard.tsx
    FeedEmpty.tsx
    FeedPage.module.css
  ```

---

## 样式

- 任何范围合理：CSS Modules / 原生 CSS / 全局 CSS / 甚至内联 —— 项目不强求
- 但**不要引入新的 CSS 框架 / UI 库**（tailwind、mui、antd 等），除非 PR 里明确讨论
- 全局 tokens 放 `src/styles/tokens.css`（颜色、间距、字号）

---

## 命令

```bash
pnpm dev              # Vite dev server，连真后端
pnpm dev:mocks        # 带 MSW，完全离线开发
pnpm typecheck        # tsc -b，同时 check packages/core
pnpm lint
pnpm test             # Vitest：L2 hook 测试 + L3 组件测试
pnpm e2e              # Playwright L4：真浏览器端到端
pnpm e2e:ui           # Playwright UI mode（调试用）
pnpm build
pnpm core:status      # 看 packages/core pin 哪个 SHA
```

**提交前**：`pnpm lint && pnpm typecheck && pnpm build` 全绿。

---

## 提交规则

- 一个 PR = 一件事（一个页面改动 / 一次设计迭代）
- 不要夹带无关的 refactor / 清理
- commit message 用"做了什么"，不用"怎么做"

---

## 常见踩坑

| 症状 | 原因 | 解法 |
|---|---|---|
| `import '@chataigram/core'` 红线 | submodule 没 init | `git submodule update --init --recursive` 或 `pnpm install` |
| `fetch` 被 ESLint 拦 | 规则有效 | 用 core 的 hook，或走 wishlist |
| 改了 `packages/core/` PR 被拒 | CODEOWNERS | 去 core 仓提 PR |
| tsc 报 core 里某个类型变了 | Downstream Gate 的好处 | 按新类型改调用点 |
| `pnpm install` 报 workspace 缺失 | submodule 没 clone | `git submodule update --init` |
