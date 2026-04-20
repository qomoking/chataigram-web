# @chataigram/web

ChatAigram 前端 —— 页面、组件、路由、样式、交互。

本仓纯 UI，用 `@chataigram/core` SDK 拿数据，本地开发用 MSW 假数据，不需要连后端。

---

## 一行 clone

```bash
git clone https://github.com/qomoking/chataigram-web.git
cd chataigram-web
pnpm install
pnpm dev         # http://localhost:5173
```

`pnpm dev` 默认启用 MSW mock，**不需要后端在跑**。

---

## 日常工作流

1. 从 `main` 切分支（`design/xxx` 或 `feat/xxx`）
2. 在 `src/` 下改视觉、路由、组件、交互
3. 数据 `import from '@chataigram/core'`，SDK 的完整 API 在 [`docs/core-api.md`](./docs/core-api.md)
4. 如果 SDK 没有你要的能力：
   - 先在 `src/mocks/handlers.ts` 加 mock 顶住（让页面先能跑）
   - 在 [`docs/core-wishlist.md`](./docs/core-wishlist.md) 追加一条需求
5. `pnpm lint && pnpm typecheck && pnpm build && pnpm test` → PR
6. 端到端：`pnpm e2e`（首次需 `pnpm e2e:install` 装浏览器）

### ⚠️ 禁区

- 不要在 `src/` 下写 `fetch` / `axios` / `ky` / `new WebSocket(...)`（ESLint 拦）—— 用 `@chataigram/core` 的 hook
- 不要手改 `src/core-stub/`（那是 SDK 的本地 stub，契约变更要走许愿单流程）
- 不要改 `docs/core-api.md`（SDK 契约文档，自动更新）

---

## 数据怎么拿

```tsx
import { useFeed } from '@chataigram/core'

export function FeedPage() {
  const { data, isLoading, error } = useFeed()
  if (isLoading) return <Spinner />
  if (error) return <ErrorState error={error} />
  return <FeedList items={data?.posts ?? []} />
}
```

开发时 `@chataigram/core` 的调用会被 MSW 拦截，返回 `src/mocks/handlers.ts` 里的假数据。
类型和签名与真实 SDK 完全一致。

写 mock 时 `import type from '@chataigram/core'` 保证形状对齐：

```ts
import { http, HttpResponse } from 'msw'
import type { FeedPage, Post } from '@chataigram/core'

export const handlers = [
  http.get('/api/feed', () => {
    const payload: FeedPage = { posts: [/* ... */], nextOffset: null }
    return HttpResponse.json(payload)
  }),
]
```

---

## 目录结构

```
chataigram-web/
├── src/
│   ├── pages/         路由页面
│   ├── components/    可复用组件
│   ├── hooks/         纯 UI hook
│   ├── mocks/         MSW handler（假数据）
│   ├── core-stub/     SDK 的本地类型和 stub（别动）
│   └── App.tsx
├── docs/
│   ├── core-api.md          ← SDK 契约文档
│   └── core-wishlist.md     ← 许愿单：让 SDK 加新能力
├── public/
└── package.json
```

---

## 常用命令

```bash
pnpm dev              # Vite dev + MSW 假数据
pnpm dev:mocks        # 同上
pnpm build            # 构建（本仓的 build 用 mock，不是生产产物）
pnpm typecheck
pnpm lint
pnpm test             # Vitest
pnpm e2e              # Playwright
```

**提交前三连**：`pnpm lint && pnpm typecheck && pnpm build` 全绿。
