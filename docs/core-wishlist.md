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

### [2026-04-20] [Done-in-core] compressImage —— 单 pass 上传前压缩
- **场景**：`CameraFlow` 拍照后送 `photoToImage` 前的图片压缩
- **现状问题**：当前压缩做了两次（叠加有损）
  - Stage 1 `src/components/CameraFlow.tsx:162-178` —— `video → canvas → toBlob(0.92)`
  - Stage 2 `src/utils/image-compress.ts:18-44` —— `Blob → decode → canvas(max 1600) → toBlob(0.85)`
- **core 已落**：`compressImage` 从 `@chataigram/core` 导出（@stable @since 0.0.13）
  ```ts
  import { compressImage } from '@chataigram/core'

  type CompressImageSource =
    | Blob | HTMLVideoElement | HTMLCanvasElement | HTMLImageElement | ImageBitmap
  type CompressImageOptions = {
    maxDimension?: number  // 默认 1600
    quality?: number       // 默认 0.85
    mimeType?: string      // 默认 'image/jpeg'
  }
  type CompressedImage = { file: Blob; width: number; height: number; aspectRatio: string }

  const { file, aspectRatio } = await compressImage(videoRef.current)
  ```
  单 pass：优先 `createImageBitmap`（解码 + EXIF 处理），降级 `objectURL + <img>`；然后
  一次 `canvas.drawImage` 缩放到目标尺寸、一次 `canvas.toBlob` 编码。
- **设计师要做（web 改造清单）**：
  1. `src/components/CameraFlow.tsx` 的 `captureFrame`（L162-178）：删掉 `canvas.toBlob` 那段，直接把 `videoRef.current` 传给 `compressImage`。`runPipeline` 的入参从 `raw: Blob` 改成接 `videoRef.current: HTMLVideoElement`，里面 `const { file, aspectRatio } = await compressImage(video)` 一步到位。
  2. 把旧的 `import { compressImage } from '../utils/image-compress'` 改成 `import { compressImage } from '@chataigram/core'`。类型签名同名、返回形状一致（`{ file, width, height, aspectRatio }`），几乎零改动。
  3. 删除 `src/utils/image-compress.ts`（冗余）。
- **Before / After 对比**（CameraFlow.tsx 的 `captureFrame`）：
  ```tsx
  // BEFORE —— Stage 1 canvas.toBlob 0.92
  const captureFrame = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob((b) => r(b), 'image/jpeg', 0.92),
    )
    if (!blob) return
    setPreviewUrl(URL.createObjectURL(blob))
    void runPipeline(blob)  // 再进 Stage 2 压缩
  }, [runPipeline])

  // AFTER —— 直接把 video 扔给 core 的 compressImage
  const captureFrame = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return
    void runPipeline(video)  // 内部一次 compressImage(video)
  }, [runPipeline])
  ```
- **紧急度**：`mock-ok`（旧代码不碰也能跑，只是输出质量差一档）
- **提出者**：@king
- **状态**：`open`（等设计师执行 web 改造）

### [2026-04-20] [Bug] ImmersiveFeedPage 被动浏览时自动跳下一张
- **场景**：ImmersiveFeedPage 被动浏览（不点击、不生图），约 30s 后当前图片"自动变"成下一张
- **紧急度**：`blocker`
- **根因（静态分析）**：`activeIdx` 绑的是数组下标，不是 `post.id`。`useFeed({ sortMode: 'random' })` + QueryClient 默认 `refetchOnWindowFocus: true` / `refetchOnReconnect: true` + `staleTime: 30_000`（见 `main.tsx`），以及各 mutation（`useLikePost` / `useCommentPost` / `useCreatePost` / `usePublishPost` / `useUpdatePost` / `useDeletePost`）的 `invalidateQueries(['feed'])`，任何一个触发都会让后端按 random 重排，`activeIdx=3` 指向的帖子"被动换成"另一张。`safeIdx`（L189-190）只裁剪越界，防不了重排。时间点对上 30s staleTime → window focus/reconnect refetch。
- **修复位置（工程师禁区）**：`src/pages/ImmersiveFeedPage/ImmersiveFeedPage.tsx` L143 / L187-191
- **建议**：
  - `useState<number>(activeIdx)` → `useState<string | null>(activePostId)`
  - 派生 `const activeIdx = posts.findIndex(p => p.id === activePostId)`
  - `swipeUp` / `swipeDown` 改成更新 `activePostId` 而非 `activeIdx`
  - 这样 feed 重排后"当前帖子"稳定，index 只是视图派生量
- **反模式警告**：不要去 core 里把 `refetchOnWindowFocus` 关掉 —— 会波及 `FeedPage` / `useFeedViewModel`，副作用太大
- **未验证**：真实后端 `sort_mode=random` 的刷新行为需要后端确认；建议 UI 改完后复现验证
- **提出者**：@king（工程师侧定位）
- **状态**：`open`

### [2026-04-20] [Bug] 沉浸式 feed 选项卡点击后闪现消失（prank panel 自动关闭）
- **场景**：ImmersiveFeedPage 点魔法棒或图片 → 弹出 3 个 prompt 选项卡 → 点其中一个 → 卡片闪一下就消失了。预期：卡片应保持可见直到生成结果回来 OR 用户显式关闭
- **紧急度**：`blocker`
- **根因**：
  - L1056-1166 渲染条件 `!prankLoading && prankPanel !== null`
  - L483-502 `handlePrankPick` 触发异步 remix / 生成
  - L434-481 `handleImmersivePick` await 生成完成后 **L474 立即调用 `closePrankPanel()`** → `prankPanel = null` → L1057 条件失败 → tabs 卸载
  - L504-529 remix 轮询在 L524 又调用一次 `closePrankPanel()`
  - L209-226 `useEffect([activeIdx, remixIdx])` 会在索引变化时再次清空 panel 状态
- **修复位置（工程师禁区）**：`src/pages/ImmersiveFeedPage/ImmersiveFeedPage.tsx`
- **建议**：
  1. **拆解状态**：把"用户意图（panel 可见）"和"异步请求状态（loading）"分开。panel 的可见性不应由生成完成回调决定
  2. **L474**：移除 `closePrankPanel()`，改为生成成功后只更新 panel 内部状态（比如把选中 tab 标记为"已请求"），保留 panel 挂载
  3. **L524** 同理：remix 轮询结束不应强制关 panel；只在新图片 ready 后由用户手势或显式 dismiss 关闭
  4. **L209-226**：`useEffect([activeIdx, remixIdx])` 的重置只应在 `activeIdx` 变化时执行，避免 `remixIdx` 变化（即生成一轮完成）顺带清空
  5. **兜底交互**：提供明显的"关闭"手势（下滑或 X 按钮），而不是依赖副作用自动关
- **影响**：用户想看生成完成后的结果，但选项卡消失了意味着无法再换一个 prompt 重试，必须重新打开魔法棒 —— "点了没反应 / 闪退"的体验
- **提出者**：@king（工程师侧定位）
- **状态**：`open`

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
