# Core Wishlist

当 web 需要 `@chataigram/core` 还没提供的能力时，在这里追加一条。工程师会定期过这个列表。

先查 [`docs/core-api.md`](./core-api.md) 确认真的没有。

## 条目模板

复制下面格式追加到"开放中"区最上方：

```md
### [YYYY-MM-DD] useXxx / 新字段名 / ...
- **场景**：<哪个页面 / 哪个交互 / 为什么需要>
- **期望签名**：`useXxx(params): { data, isLoading, error }`
- **期望数据**：<简要描述，或 TypeScript 类型草稿>
- **紧急度**：`mock-ok`（可以先用 mock 顶住） / `blocker`（真实阻塞）
- **提出者**：@<handle>
- **状态**：`open` / `in-progress` / `done` / `rejected`
- **PR / Issue**：<链接，等工程师接后填上>
```

---

## 开放中

### [2026-04-20] segmentAndSuggestInteractiveStream / SegmentPromptItem.is_interactive
- **场景**：ImmersiveFeedPage 单击图片时，有 avatar 的用户调用 interactive 版本，返回 2 Remix + 1 @me 临场互动
- **期望签名**：`segmentAndSuggestInteractiveStream(opts: InteractiveSegmentStreamOptions): Promise<void>`
- **期望数据**：同 `segmentAndSuggestStream`，但 opts 多一个 `avatarUrl: string`；prompts 数组每项多 `is_interactive: boolean`
- **紧急度**：`mock-ok`（core-stub 已加 stub，MSW 已加 mock handler）
- **提出者**：@king
- **状态**：`open`
- **PR / Issue**：后端 ChatAigram/backend PR#4 已 ready

### [2026-04-20] useImmersiveGenerate（临场互动图片生成）
- **场景**：ImmersiveFeedPage 用户选择 @me 选项后，调用 Gemini 双图融合（avatar + scene）
- **期望签名**：`useImmersiveGenerate(): UseMutationResult<ImmersiveGenerateResult, Error, ImmersiveGenerateInput>`
- **期望数据**：`ImmersiveGenerateInput = { sceneImageUrl, avatarUrl, prompt }` → `ImmersiveGenerateResult = { resultUrl, error }`
- **紧急度**：`mock-ok`
- **提出者**：@king
- **状态**：`open`
- **PR / Issue**：后端 `POST /api/immersive_generate` 已就绪

---

## 最近完成

### [2026-04-16] useUpdatePost（PATCH 帖子文案 / 图片）
- **场景**：沉浸式 feed 的 RemixDraftPanel 发布前改 caption
- **提出者**：@king
- **状态**：`done`
- **PR / Issue**：core@6d58708

### [2026-04-16] useAvatarGenerate / useAvatarIterate（头像 SSE）
- **场景**：CreateAvatarPage 的头像生成 + 迭代两路 hook（generate = 2 阶段 / iterate = 3 阶段）
- **提出者**：@king
- **状态**：`done`
- **PR / Issue**：core@6d58708

### [2026-04-16] PlazaViewerContext + PlazaInitMessage.viewerContext
- **场景**：PlazaPage / useLottieSlots 分层选人（邀请 / 互动 / 最近加入）
- **期望数据**：`{ invitedByUserIds, inviteeUserIds, interactedUserIds, interactionTimes }`
- **提出者**：@king
- **状态**：`done`
- **PR / Issue**：core@6d58708

### [2026-04-16] Post.createdAt 可选字段
- **场景**：ImmersiveFeedPage 显示时间戳
- **提出者**：@king
- **状态**：`done`
- **PR / Issue**：core@6d58708

### [2026-04-16] useRemixPost 接受 ret_code 202（异步受理）
- **场景**：后端新 remix 走异步任务；老前端兼容行为
- **提出者**：@king
- **状态**：`done`
- **PR / Issue**：core@0fd3f72

### [2026-04-16] useRemixTask 不依赖 status 字段
- **场景**：老后端不返 status，从 post/error 推断终态
- **提出者**：@king
- **状态**：`done`
- **PR / Issue**：core@0fd3f72

### [2026-04-14] CDN 路由工具收归 core
- **场景**：CdnImg / PlazaPage / App.tsx 的 CDN 配置获取和 URL 改写
- **提出者**：@king
- **状态**：`done`
- **PR / Issue**：core@6d58708

### [2026-04-14] useAnimation / prefetchAnimation 收归 core
- **场景**：PlazaPage / LoginPage / CreateAvatarPage 的 Lottie 动画拉取
- **提出者**：@king
- **状态**：`done`
- **PR / Issue**：core@6d58708

---

## 使用约定

**新架构下的流程**（拆库后）：

- 新条目放"开放中"区最上方，按时间倒序
- 工程师接一条 → 在 **chataigram-core** 仓开 PR → merge → CI 自动生成 `docs/core-api.md` → 自动 PR 回本仓
- web 这边：等 core-api.md 同步过来（或手动 `cp` ） → 更新 `src/core-stub/types.ts` 的类型（若有 breaking） → 删对应 MSW mock → 把本文条目移到"最近完成"区
- "最近完成"保留最近 10 条即可，更早的 clean up（有 git 历史兜底）
- 被 reject 的条目说明原因 + 替代方案

**真实集成联调**在 [`chataigram-app`](https://github.com/qomoking/chataigram-app) 仓里做 —— 本仓只能用 core-stub + MSW 验证。
