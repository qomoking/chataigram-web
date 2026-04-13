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
| **auth** | ✅ `useCurrentUser` `useLogin` `useRegister` `useLogout` `useCheckUsername` `useUserInfo` `useSetCurrentUser` `parseGoogleCallback` | ✅ `LoginPage` `GoogleCallbackPage` | 🟢 **完成**（Wave 1+2+3）|
| **路由骨架** | — | ✅ `App` with `BrowserRouter` + `ProtectedRoute` | 🟢 完成 |

### 🟧 P1 核心体验

| Feature | core hooks | web 页面/组件 | 状态 |
|---|---|---|---|
| **feed 完整版** | ✅ `useFeed` `useLikePost`；延后：`useRemixes` | ✅ `FeedPage`（masonry，路由 `/feed`）| 🟢 完成；Lightbox 仍可补 |
| **沉浸式 feed** | 复用 `useFeed` `useLikePost` | ✅ `ImmersiveFeedPage`（路由 `/`）| 🟢 完成；横向 swipe / 双击 prank 延后 |
| **创建内容** | ✅ 8 个 hooks | ✅ `Create`（chat 风格，含 `VoiceRemixButton`）`CreateAvatarPage`（简化版）| 🟢 完成；CreatePage 1734 行的"完整 Studio"未做 |
| **个人主页** | ✅ `useUserPosts` `useUserInfo` | ✅ `ProfilePage` `Profile`（编辑）`WorksPage`（已发布/草稿）| 🟢 完成 |

### 🟨 P2 社交 / 通知

| Feature | core hooks | web 页面/组件 | 状态 |
|---|---|---|---|
| **Inbox / 通知** | ✅ `useInbox` `useMarkRead` `useUnreadCount` `useNotificationSocket`（WS push）| ✅ `InboxPage` `NotificationManager` `Toast` `UnseenBubble` `PreviewCard` | 🟢 完成 |
| **广场 (Plaza)** | ✅ `usePlazaSocket` (init/join/leave/bump/status)| ✅ `PlazaPage`（2D canvas + drag + bump）| 🟢 完成；Lottie 头像动画延后 |
| **邀请** | ✅ `useMyInviteCodes` `useGenerateInviteCode` | ✅ `InvitePage` | 🟢 完成 |

### 🟩 P3 沉浸式 / 其他

| Feature | core hooks | web 页面/组件 | 状态 |
|---|---|---|---|
| **Home 入口** | 复用 `useUserPosts` `useDeletePost` | ✅ `Home`（路由 `/home`）| 🟢 完成 |
| **CDN / 图片组件** | — | ✅ `CdnImg` | 🟢 完成 |
| **CameraFlow** | — | ⏸️ 占位（导到 `/create`）| 🟡 stub；photoToImage SSE pipeline 还没 |

### 🟪 P4 横切关注点

| 主题 | 去哪 | 状态 |
|---|---|---|
| `utils/i18n.js` | ✅ web `src/utils/i18n.ts`（dict 1:1） | 完成 |
| `utils/storage.js` | ✅ 已拆：auth → core/`auth/storage.ts`；本地偏好 → web/`profile-storage.ts` `useSavedPosts`；exposed ids → web/`useUnseenNotifications` | 完成 |
| `utils/api.js` | ✅ 弃用，全部走 core hooks | 完成 |
| `utils/featureFlags.js` | ✅ web `src/utils/featureFlags.ts` | 完成 |
| `utils/cdn.js` | ✅ web `src/utils/cdn.ts` | 完成 |
| `utils/animationCache.js` | ✅ web `src/utils/animationCache.ts`（PlazaPage 还没 wire 进 Lottie） | 完成 |
| `utils/notificationApi.js` | ✅ 弃用，由 useInbox / useMarkRead / useUnreadCount 替代 | 完成 |
| `utils/engramApi.js` | ⬜ 延后（Engram 集成 = feature flag 默认关）| 未开始 |
| `utils/toolRenderers.js` | ⬜ 仅在被 ImmersiveFeed 之外的页面用到时再迁 | 未开始 |
| `utils/mockData.js` | ✅ 弃用，MSW handlers 替代 | 完成 |

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

---

## 当前完成度（截至最近一次 push）

```
core   24 hooks · 25 types · 72 tests · 0 build step (source-imported via workspace)
web    14 pages · 13 components · 95 tests (L1+L2+L3+L4)
```

**对齐的页面**：LoginPage / GoogleCallbackPage / FeedPage / ImmersiveFeedPage /
PlazaPage / Home / Create / CreateAvatarPage / Profile / ProfilePage / WorksPage /
InboxPage / InvitePage（13/14 实迁，CameraFlow 是 stub）。

**故意延后的"完整原版"**：
- CreatePage（1734 行 Studio）—— 当前用 Create.tsx 的 chat-style 替代
- CameraFlow（1214 行 SSE 流水线）—— 占位跳转到 /create
- 双击 prank suggestions / horizontal remix swipe / Lottie 头像动画

**核心 SDK 还没的接口**（决定上面"完整原版"何时能做）：
- `usePhotoToImage`（SSE 流式 4 阶段 pipeline）
- `useUploadImage` / `useImageDescription` / `useSuggestions` / `useUpdateAvatar`
- `useComment` / `useReact`（社交向）
- `usePrankSuggestions`
