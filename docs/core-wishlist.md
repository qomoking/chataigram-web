# Core Wishlist（许愿单）

当 web 需要 `@chataigram/core` 还没提供的能力时，在这里追加一条。SDK 维护方会定期过这个列表。

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

### [2026-04-20] compressImage 单 pass 压缩接入 CameraFlow
- **场景**：CameraFlow 拍照送 photoToImage 前的压缩
- **做了什么**：删掉 CameraFlow 的 Stage 1 `canvas.toBlob(0.92)` 预压缩 + 删掉 `src/utils/image-compress.ts`；`runPipeline` 直接吃 HTMLVideoElement，内部 `compressImage(video)` 单 pass 到位。core-stub 同步加了 `compressImage` + 三个类型。
- **提出者**：@king
- **状态**：`done`

### [2026-04-20] [Bug] 沉浸式 feed 选项卡点击后闪现消失（prank panel 过早关闭）
- **场景**：点魔法棒或图片弹出 3 个 prompt tab → 点一个 → 卡片闪一下就消失
- **根因**：async 生成完成回调里立刻 `closePrankPanel()`（mock 模式下几乎瞬时）
- **修复**：portal 渲染条件追加 `!pendingRemix`，让 prank 面板在 RemixDraftPanel 出现时自然退场；生成成功路径不再主动 `closePrankPanel()`（仅错误路径和 handleSave/Publish 保留显式关面板避免闪一帧）
- **提出者**：@king
- **状态**：`done`

### [2026-04-20] [Bug] ImmersiveFeedPage 被动浏览时自动跳下一张
- **场景**：被动浏览约 30s 后当前图片被动换到下一张
- **根因**：`activeIdx` 绑数组下标，feed refetch 重排（random）后 index 位移
- **修复**：`activeIdx: number` → `activePostId: number | null`；activeIdx 从 `posts.findIndex(p => p.id === activePostId)` 派生；swipeUp/Down 改成更新 activePostId；remix 插入用 `insertAfterPostId` 替代 `insertAfterIdx`
- **提出者**：@king
- **状态**：`done`

### [2026-04-16] useUpdatePost（PATCH 帖子文案 / 图片）
- **场景**：沉浸式 feed 的 RemixDraftPanel 发布前改 caption
- **提出者**：@king
- **状态**：`done`

### [2026-04-16] useAvatarGenerate / useAvatarIterate（头像 SSE）
- **场景**：CreateAvatarPage 的头像生成 + 迭代两路 hook（generate = 2 阶段 / iterate = 3 阶段）
- **提出者**：@king
- **状态**：`done`

### [2026-04-16] PlazaViewerContext + PlazaInitMessage.viewerContext
- **场景**：PlazaPage / useLottieSlots 分层选人（邀请 / 互动 / 最近加入）
- **期望数据**：`{ invitedByUserIds, inviteeUserIds, interactedUserIds, interactionTimes }`
- **提出者**：@king
- **状态**：`done`

### [2026-04-16] Post.createdAt 可选字段
- **场景**：ImmersiveFeedPage 显示时间戳
- **提出者**：@king
- **状态**：`done`

### [2026-04-16] useRemixPost 接受 ret_code 202（异步受理）
- **场景**：后端新 remix 走异步任务；老前端兼容行为
- **提出者**：@king
- **状态**：`done`

### [2026-04-16] useRemixTask 不依赖 status 字段
- **场景**：老后端不返 status，从 post/error 推断终态
- **提出者**：@king
- **状态**：`done`

### [2026-04-14] CDN 路由工具收归 SDK
- **场景**：CdnImg / PlazaPage / App.tsx 的 CDN 配置获取和 URL 改写
- **提出者**：@king
- **状态**：`done`

### [2026-04-14] useAnimation / prefetchAnimation 收归 SDK
- **场景**：PlazaPage / LoginPage / CreateAvatarPage 的 Lottie 动画拉取
- **提出者**：@king
- **状态**：`done`

---

## 使用约定

- 新条目放"开放中"区最上方，按时间倒序
- 条目完成后本仓会收到 SDK 契约更新 —— 删对应 MSW mock，把条目移到"最近完成"区
- "最近完成"保留最近 10 条即可，更早的 clean up（有 git 历史兜底）
- 被 reject 的条目说明原因 + 替代方案
