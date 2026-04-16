# Claude instructions — chataigram-web

You are in **chataigram-web** —— 前端主仓。**设计师主场**。

本仓纯 UI。数据通过 `@chataigram/core` SDK，本地开发用 MSW 假数据离线跑。

---

## 这里装什么

```
src/
  pages/         路由页面
  components/    可复用组件（视觉 + 交互）
  core-stub/     SDK 的本地类型和 stub（勿改）
  layouts/       布局（可选）
  hooks/         纯 UI hook（useMediaQuery / useHover 等）
  mocks/         MSW 假数据
  styles/        全局样式 / tokens（可选）
  main.tsx       入口
  App.tsx        根组件 + 路由

public/          静态资源
docs/
  core-api.md        SDK 契约（勿手改）
  core-wishlist.md   让 SDK 加东西用（许愿单）
```

## 绝对禁止

- 在页面 / 组件里直接写 `fetch(` / `axios.*` / `ky(` / `new WebSocket(`
  → 全部用 `@chataigram/core` 的 hooks
- 在 `src/` 下硬编码 API 地址 / 后端域名
- 引入自己的 HTTP 客户端
- 手改 `src/core-stub/` 或 `docs/core-api.md`（契约由 SDK 驱动）

ESLint 会拦住大部分。**不要绕过**，有需求就走许愿单。

---

## 拿数据的标准动作

第一步：读 `docs/core-api.md`，看 SDK 有没有对应 hook。

**有**：

```tsx
import { useFeed } from '@chataigram/core'

export function FeedPage() {
  const { data, isLoading, error } = useFeed()
  if (isLoading) return <Spinner />
  if (error) return <ErrorState error={error} />
  return <FeedList items={data?.posts ?? []} />
}
```

本地开发时 `@chataigram/core` 的调用会被 MSW 拦截，返回 mock 数据。
类型和签名与真实 SDK 完全一致。

**没有**：

1. 在 `src/mocks/handlers.ts` 加 MSW handler（让页面先能跑）
2. 在 `docs/core-wishlist.md` 追加条目（模板见那个文件）
3. 继续写页面，用 mock 的数据形状

**不要自己改 `src/core-stub/` 补"想要的 hook"** —— 那只在本地编译层面骗过 TS，真实 SDK 还是没有。走许愿单才有用。

---

## core-stub 是什么

`src/core-stub/` 是 `@chataigram/core` 的本地替身：

- `types.ts` — SDK 的类型声明副本
- `index.ts` — hook 的 stub 实现（通过 fetch 让 MSW 拦）
- `internals.ts` — 逃生舱（极少用）

**这是基础设施，勿手改。** SDK 契约变更时会被自动更新。

---

## mock 的写法

`src/mocks/handlers.ts`（MSW v2 语法）：

```ts
import { http, HttpResponse } from 'msw'
import type { FeedPage, Post } from '@chataigram/core'

export const handlers = [
  http.get('/api/feed', () => {
    const payload: FeedPage = {
      posts: [
        { id: 1, parentId: 0, authorId: 1, photoUrl: null, content: 'hello',
          type: 2, likeCount: 0, relayCount: 0, commentCount: 0, shareCount: 0,
          optional: null, hasRemixes: false },
      ],
      nextOffset: null,
    }
    return HttpResponse.json(payload)
  }),
]
```

**关键**：`import type from '@chataigram/core'` —— 用 SDK 的真实类型，保证 mock 形状和契约对齐。类型对不上 tsc 会报错。

---

## 路由与页面

- 所有页面在 `src/pages/`
- 路由集中在 `App.tsx` 或 `src/routes.tsx`
- 页面间共享的视觉归 `src/components/`
- 页面专用的小组件 colocated：
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
- **不要引入新的 CSS 框架 / UI 库**（tailwind、mui、antd 等），除非 PR 里明确讨论
- 全局 tokens 放 `src/styles/tokens.css`

---

## 命令

```bash
pnpm dev              # Vite + MSW 假数据
pnpm dev:mocks        # 同上（显式）
pnpm typecheck
pnpm lint
pnpm test             # Vitest
pnpm e2e              # Playwright
pnpm e2e:ui           # Playwright UI mode（调试）
pnpm build
```

**提交前**：`pnpm lint && pnpm typecheck && pnpm build` 全绿。

---

## GitHub 协作规则（严格遵守）

**1. 一切改动走 PR，禁止直推 main**

```bash
git checkout main && git pull
git checkout -b feat/xxx
```
改完推远端、开 PR、等合并。不在本地 main 上直接 commit。

**2. 一个 PR = 一件事，保持小**

- 一个页面改动 / 一次设计迭代 / 一个 bug 修复 —— 单一主题
- 不夹带无关的 refactor、清理、格式化
- 改动偏大就拆多个 PR 串行提交
- commit message 写"做了什么"，不写"怎么做"

**3. PR 合并后，下一项前必须同步 main**

```bash
git checkout main
git pull origin main
git checkout -b feat/next-xxx
```

- 绝不在旧分支上接着做下一件事
- 绝不基于没合并的 PR 分支切新分支（除非明确依赖）

**4. 提 PR 前本地三连全绿**

```bash
pnpm lint && pnpm typecheck && pnpm build
```

失败就修，不绕过 hook、不 `--no-verify`。

---

## 常见踩坑

| 症状 | 原因 | 解法 |
|---|---|---|
| `import '@chataigram/core'` 红线 | IDE 没识别 paths alias | 重启 TS server |
| `fetch` 被 ESLint 拦 | 规则有效 | 用 `@chataigram/core` 的 hook，或走许愿单 |
| MSW 没拦截到请求 | handler 路径不匹配 | 检查 `src/mocks/handlers.ts` 的路径 |
| `docs/core-api.md` 里没找到我要的 hook | SDK 没提供 | 写 mock + 许愿单 |
