# Migration Plan: frontend/ → chataigram-web + chataigram-core

**原仓**：`/Users/king/Documents/devs-ai/ChatAigram/frontend/`
**目标**：在不改动 `frontend/` 任何文件的前提下，把它的功能按 AI 时代的架构（core = 无头 SDK, web = UI）分布到两个新仓。

---

## 并行开发模型（Wave + Track）

```
Wave 1  契约冻结     一个人做，把所有 hook 签名 + 类型在 core 里定死
Wave 2  并行开发     Track C（core 真实现）+ Track W（web 页面）+ Track M（mock）同时跑
Wave 3  切真数据     自动：core 发版 → web bump submodule → 删 mock
```

**纪律**：
1. Wave 1 未合并前，不允许 Wave 2 的页面用 `@chataigram/core` 导入
2. 一个 feature 一个分支
3. `core/src/index.ts` 一次改一份 PR（序列化点）

---

## Feature 列表（按迁移优先级）

### 🟥 P0 Blocker（优先级最高，堵后续一大片）

| Feature | core hooks | web 页面/组件 | 状态 |
|---|---|---|---|
| **auth** | `useCurrentUser` `useLogin` `useRegister` `useLogout` `useCheckUsername` `useUserInfo` | `LoginPage` `GoogleCallbackPage` | 🟡 Wave 1 进行中 |
| **路由骨架** | — | `App` with `react-router` + 路由守卫 | ⬜ 未开始 |

### 🟧 P1 核心体验

| Feature | core hooks | web 页面/组件 | 状态 |
|---|---|---|---|
| **feed 完整版** | ✅ `useFeed` `useLikePost`；待加：`useRemixes` `useCreatePost` `useDeletePost` `useUserPosts` | `FeedPage`（加 Lightbox / timeAgo / TabBar）| 🟢 MVP 完成，待补 |
| **创建内容** | `useCreatePost` `useRemixPost` `useVoiceTranscribe` `useGenerateImage` | `CreatePage` `Create` `CreateAvatarPage` `CameraFlow` `PreviewCard` `VoiceRemixButton` | ⬜ 未开始 |
| **个人主页** | `useUserPosts` `useUserProfile` | `ProfilePage` `Profile` `WorksPage` | ⬜ 未开始 |

### 🟨 P2 社交 / 通知

| Feature | core hooks | web 页面/组件 | 状态 |
|---|---|---|---|
| **Inbox / 通知** | `useInbox` `useMarkRead` `useNotificationSocket` | `InboxPage` `NotificationManager` `Toast` `UnseenBubble` | ⬜ 未开始 |
| **广场 (Plaza)** | `usePlazaFeed` `usePlazaSocket` | `PlazaPage` | ⬜ 未开始 |
| **邀请** | `useMyInviteCodes` `useRedeemInvite` | `InvitePage` | ⬜ 未开始 |

### 🟩 P3 沉浸式 / 其他

| Feature | core hooks | web 页面/组件 | 状态 |
|---|---|---|---|
| **Immersive feed** | 复用 `useFeed` | `ImmersiveFeedPage` | ⬜ 未开始 |
| **Home 入口** | — | `Home` | ⬜ 未开始 |
| **CDN / 图片组件** | — | `CdnImg` | ⬜ 未开始（纯 UI） |

### 🟪 P4 横切关注点

| 主题 | 去哪 | 备注 |
|---|---|---|
| `utils/i18n.js` | **core**（语言判断和字典 = 业务）→ `src/i18n/` | 设计师的 AI 用 `t()` 写 UI 文案 |
| `utils/storage.js` | **拆分**：auth / profile / liked / saved / drafts → core；UI 偏好 → web | 正在拆 |
| `utils/api.js` | **弃用** | core 的 `apiClient` + hooks 取代 |
| `utils/featureFlags.js` | **core** `src/flags/` | |
| `utils/engramApi.js` | **core** `src/api/engram.ts`（feature-flag）| 延后 |
| `utils/notificationApi.js` | **core** | P2 做 |
| `utils/toolRenderers.js` | **web** | 纯视觉 |
| `utils/animationCache.js` | **web** | 纯视觉 |
| `utils/cdn.js` | **web** | 纯视觉 |
| `utils/mockData.js` | **弃用** | MSW 取代 |

---

## 每个 Feature 的工作流（Wave 2 三轨）

假设你在做 **auth**：

### Track C（工程师 AI） — `chataigram-core`
1. 在 core 分支 `feat/auth` 实现 `useLogin` / `useRegister` / ...
2. 用真实 `apiClient.post('/api/login')` 换掉 stub
3. 加单测
4. PR → CI + Downstream Gate 双绿 → merge

### Track W（设计师 AI） — `chataigram-web`
1. 在 web 分支 `feat/auth-ui` 迁 `LoginPage.tsx` + CSS
2. 用 `useLogin` 等 hooks（**Wave 1 已冻结签名**，可以直接用）
3. 页面跑在 `pnpm dev:mocks` 下验证
4. PR → 不依赖 Track C 进度

### Track M（可以和 W 同一人）
1. 在 `src/mocks/handlers.ts` 加 `/api/login` `/api/register` 的假响应
2. 用后端真实形状（snake_case）
3. 和页面一起 review

### 合并顺序
1. core 的 Track C 先 merge
2. web 的 Track W 合并
3. `pnpm core:bump` 让 web 用上真 core
4. 从 `docs/core-wishlist.md` 删掉对应 wishlist 条目（如果有）

---

## 冲突矩阵（谁改哪里不会撞）

| | `core/src/index.ts` | `core/src/hooks/*` | `web/src/pages/*` | `web/src/mocks/handlers.ts` |
|---|---|---|---|---|
| 多 feature 并行 | ⚠️ 尽量一起 Wave 1 一起改 | ✅ 各写自己的文件 | ✅ 各写自己的页面 | ⚠️ 同一文件，分 section 追加 |

Wave 1 建议：**把所有 feature 的 hook 签名 + 类型一次性加到 `core/src/index.ts`**（`throw new Error('not implemented')` 占位）。这样之后 N 个并行 PR 都不用再动 `index.ts`。

---

## 清单使用约定

- 本文件是**活文档**。picker 选一项就在对应行加 `[in-progress by @<handle>]`
- 完成后把行移到"最近完成"区（可在本文末尾加个 section）
- 每次 `pnpm core:bump` 后，检查这份清单是否有任务可以 close
