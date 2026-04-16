# @chataigram/core — API Reference

> 业务 SDK 的完整公开契约。**不要手改** —— 改动由 SDK 维护方驱动。
>
> 在本仓里判断"SDK 有没有对应 hook"时先读这份；没有就走许愿单（`docs/core-wishlist.md`）。
>
> 稳定性标注：`@stable` = 不会在兼容窗口内破坏；`@experimental` = 可能在任何版本变更。

---

## Feed

### useFeed

```ts
function useFeed(params?: UseFeedParams): UseQueryResult<FeedPage>
```

获取 feed 列表（分页）。

**参数类型：**
```ts
type UseFeedParams = {
  offset?: number
  limit?: number
  sortMode?: FeedSortMode
}
type FeedSortMode = 'random' | 'chrono'
```

**返回数据类型：** `FeedPage`（见 [类型定义](#feed--post)）

### useLikePost

```ts
function useLikePost(): UseMutationResult<void, Error, number>
```

点赞帖子。参数为 `postId`。

---

## Auth

### useCurrentUser

```ts
function useCurrentUser(): UseQueryResult<User | null>
```

获取当前登录用户，未登录返回 `null`。

### useSetCurrentUser

```ts
function useSetCurrentUser(): (user: User | null) => void
```

手动设置当前用户（用于 OAuth callback 等场景）。

### useLogin

```ts
function useLogin(): UseMutationResult<AuthSuccess, Error, LoginCredentials>
```

### useRegister

```ts
function useRegister(): UseMutationResult<AuthSuccess, Error, RegisterInput>
```

### useLogout

```ts
function useLogout(): UseMutationResult<void, Error, void>
```

### useCheckUsername

```ts
function useCheckUsername(username: string): UseQueryResult<boolean>
```

检查用户名是否可用。`true` = 可用。

### useUserInfo

```ts
function useUserInfo(userId: number | null | undefined): UseQueryResult<User | null>
```

获取指定用户信息。

### googleAuthUrl

```ts
const googleAuthUrl: string  // = '/auth/google'
```

### parseGoogleCallback

```ts
function parseGoogleCallback(search: string | URLSearchParams): User | null
```

从 Google OAuth 回调的 query string 中解析用户信息。

---

## Create / Remix / Voice / Generate

### useCreatePost

```ts
function useCreatePost(): UseMutationResult<CreatePostResult, Error, CreatePostInput>
```

### useRemixPost

```ts
function useRemixPost(): UseMutationResult<string, Error, RemixInput>
```

发起 remix，返回 `taskId`。

### useRemixTask

```ts
function useRemixTask(
  taskId: string | null | undefined,
  pollIntervalMs?: number
): UseQueryResult<RemixTask>
```

轮询 remix 任务状态。

### useGhibliRemix

```ts
function useGhibliRemix(): UseMutationResult<string, Error, GhibliRemixInput>
```

Ghibli 风格 remix，返回 `taskId`。

### useVoiceTranscribe

```ts
function useVoiceTranscribe(): UseMutationResult<VoiceTranscribeResult, Error, Blob>
```

语音转文字。参数为音频 Blob。

### usePublishPost

```ts
function usePublishPost(): UseMutationResult<void, Error, number>
```

发布草稿帖子。参数为 `postId`。

### useDeletePost

```ts
function useDeletePost(): UseMutationResult<void, Error, number>
```

删除帖子。参数为 `postId`。

### useGenerateImage

```ts
function useGenerateImage(): UseMutationResult<GenerateImageResult, Error, GenerateImageInput>
```

### usePhotoToImage

```ts
function usePhotoToImage(): UseMutationResult<PhotoToImageResult, Error, PhotoToImageInput>
```

照片转图像的 SSE 多阶段 pipeline（upload → describe → prompt → generate）。

**参数类型：**
```ts
type PhotoToImageStep = 'upload' | 'describe' | 'prompt' | 'generate'
type PhotoToImageModel = 'gpu' | 'cpu'

type PhotoToImageInput = {
  file: Blob
  authorId: number
  promptVersion?: number
  aspectRatio?: string
  model?: PhotoToImageModel
  contentType?: string
  onStep?: (step: PhotoToImageStep, elapsed: number) => void
  signal?: AbortSignal
}

type PhotoToImageResult = {
  resultUrl: string
  cdnUrl: string
  description: string
  prompt: string
}
```

---

## Social

### useRemixes

```ts
function useRemixes(postId: number | null | undefined): UseQueryResult<Post[]>
```

获取指定帖子的 remix 列表。

### useCommentPost

```ts
function useCommentPost(): UseMutationResult<CommentResult, Error, CommentInput>
```

**类型：**
```ts
type CommentInput = { postId: number; text: string }
type CommentResult = { commentCount: number }
```

### useReact

```ts
function useReact(): UseMutationResult<void, Error, ReactInput>
```

对通知发送 reaction。

**类型：**
```ts
type ReactInput = { recipientId: number; notificationId: number }
```

### useUploadImage

```ts
function useUploadImage(): UseMutationResult<UploadImageResult, Error, Blob>
```

上传图片，返回 CDN URL。

**类型：**
```ts
type UploadImageResult = { imageUrl: string }
```

---

## VLM / Suggestion / Avatar

### useImageDescription

```ts
function useImageDescription(): UseMutationResult<string, Error, { url: string }>
```

VLM 图像描述，返回描述文本。

### useSuggestions

```ts
function useSuggestions(): UseMutationResult<SuggestionItem[], Error, SuggestionsInput>
```

**类型：**
```ts
type SuggestionItem = {
  label: string
  prompt: string
  emoji: string | null
  desc: string | null
}
type SuggestionScene = 'avatar' | 'create' | 'prank'
type SuggestionsInput = {
  prompt: string
  scene?: SuggestionScene
  imgDesc?: string | null
  history?: string[]
  count?: number
  angle?: number | null
}
```

### usePrankSuggestions

```ts
function usePrankSuggestions(): UseMutationResult<SuggestionItem[], Error, PrankSuggestionsInput>
```

**类型：**
```ts
type PrankSuggestionsInput = {
  imageUrl: string
  prompt?: string
  count?: number
}
```

### useUpdateAvatar

```ts
function useUpdateAvatar(): UseMutationResult<UpdateAvatarResult, Error, string>
```

更新头像。参数为图片 URL。

**类型：**
```ts
type UpdateAvatarResult = { animationTaskId: string | null }
```

---

## Intent / Analyze / Search / Onboarding

### useDetectIntent

```ts
function useDetectIntent(): UseMutationResult<IntentType, Error, string>
```

**类型：**
```ts
type IntentType = 'generate' | 'feed' | 'analyze_prompt' | 'analyze_keywords'
```

### useAnalyzeHistory

```ts
function useAnalyzeHistory(): UseMutationResult<string | null, Error, AnalyzeHistoryInput>
```

**类型：**
```ts
type AnalyzeHistoryMode = 'prompt' | 'keywords'
type HistoryItem = { prompt: string; userText?: string }
type AnalyzeHistoryInput = {
  history: HistoryItem[]
  mode: AnalyzeHistoryMode
}
```

### useSearchUsers

```ts
function useSearchUsers(query: string | null | undefined): UseQueryResult<SearchUsersResult>
```

**类型：**
```ts
type SearchUsersResult = { users: User[]; isRecommended: boolean }
```

### useOnboarding

```ts
function useOnboarding(): UseMutationResult<OnboardingResult, Error, { userId: number; name: string }>
```

**类型：**
```ts
type OnboardingResult = { welcomeText: string | null; avatarUrl: string | null }
```

---

## Inbox / Notifications

### useInbox

```ts
function useInbox(params?: {
  limit?: number
  beforeId?: number
}): UseQueryResult<InboxPage>
```

### useMarkRead

```ts
function useMarkRead(): UseMutationResult<void, Error, number[]>
```

标记通知为已读。参数为通知 id 数组。

### useUnreadCount

```ts
function useUnreadCount(pollIntervalMs?: number): UseQueryResult<number>
```

轮询未读通知数量。

---

## Profile / User Posts

### useUserPosts

```ts
function useUserPosts(
  userId: number | null | undefined,
  params?: UseUserPostsParams
): UseQueryResult<UserPostsPage>
```

**类型：**
```ts
type UseUserPostsParams = {
  status?: PostStatus
  limit?: number
  beforeId?: number | null
}
```

---

## Invite

### useMyInviteCodes

```ts
function useMyInviteCodes(
  userId: number | null | undefined
): UseQueryResult<InviteCodesData>
```

### useGenerateInviteCode

```ts
function useGenerateInviteCode(): UseMutationResult<GenerateInviteResult, Error, number>
```

参数为 `userId`。

**类型：**
```ts
type InviteCodeRow = {
  code: string
  used: boolean
  usedBy: number | null
  createdAt: string
}
type InviteCodesData = {
  codes: InviteCodeRow[]
  totalCount: number
  maxCount: number
}
type GenerateInviteResult = {
  code: string
  totalCount: number
  maxCount: number
}
```

---

## WebSocket

### useNotificationSocket

```ts
function useNotificationSocket(
  userId: number | null | undefined,
  onNotification: (n: Notification) => void
): NotificationSocketHandle
```

**类型：**
```ts
type NotificationSocketHandle = { connected: boolean }
```

### usePlazaSocket

```ts
function usePlazaSocket(
  userId: number | null | undefined,
  callbacks: PlazaSocketCallbacks
): PlazaSocketHandle
```

**类型：**
```ts
type PlazaSocketCallbacks = {
  onInit?: (msg: PlazaInitMessage) => void
  onUserJoin?: (user: PlazaUser) => void
  onUserLeave?: (userId: number) => void
  onBump?: (from: { id: number; name: string }, to: PlazaBumpTarget) => void
  onStatusUpdate?: (userId: number, statusText: string | null, statusEmoji: string | null) => void
  onAnimationReady?: (userId: number, taskId: string) => void
}

type PlazaSocketHandle = {
  send: (msg: PlazaClientMessage) => void
  connected: boolean
}
```

---

## SAM3 Stream (Experimental)

### segmentAndSuggestStream

```ts
function segmentAndSuggestStream(
  opts: SegmentAndSuggestStreamOptions
): Promise<void>
```

SSE 流式分割 + 提示建议。

**类型：**
```ts
type SegmentPoint = { x: number; y: number }
type SegmentPromptItem = {
  icon?: string | null
  text: string
  prompt: string
}
type SegmentAndSuggestStreamOptions = {
  imageUrl: string
  points: SegmentPoint[]
  mode: 'single' | 'box'
  signal?: AbortSignal
  onLabel?: (label: string) => void
  onPrompts?: (prompts: SegmentPromptItem[]) => void
  onError?: (err: string) => void
}
```

---

## 类型定义

### Feed / Post

```ts
type Post = {
  id: number
  parentId: number
  authorId: number
  photoUrl: string | null
  content: string | null
  type: number
  likeCount: number
  relayCount: number
  commentCount: number
  shareCount: number
  optional: string | null
  hasRemixes: boolean
}

type FeedPage = {
  posts: Post[]
  nextOffset: number | null
}

type Paginated<T> = {
  items: T[]
  nextCursor: string | null
  total: number
}
```

### User / Auth

```ts
type User = {
  id: number
  name: string
  username: string | null
  avatarUrl: string | null
}

type LoginCredentials = {
  username: string
  password: string
}

type RegisterInput = {
  name: string
  username: string
  password: string
  inviteCode?: string
}

type AuthSuccess = {
  user: User
  animationTaskId: string | null
}
```

### Create / Remix

```ts
type PostStatus = 'published' | 'draft'

type CreatePostInput = {
  authorId: number
  photoUrl: string
  content?: string | null
  optional?: string | null
  optionalInfo?: string | null
  type?: number
  status?: PostStatus
}

type CreatePostResult = { postId: number }

type RemixMode = 'remix' | 'draw-back'

type RemixInput = {
  authorId: number
  parentPostId: number
  instruction: string
  mode?: RemixMode
  status?: PostStatus
}

type RemixTaskStatus = 'pending' | 'done' | 'error'

type RemixTask = {
  taskId: string
  status: RemixTaskStatus
  post: Post | null
  error: string | null
}

type GhibliRemixInput = {
  authorId: number
  photoUrl: string
}

type VoiceTranscribeResult = {
  text: string
  confidence: number | null
}

type GenerateImageInput = {
  prompt: string
  userId: number
  refImageUrl?: string | null
  isFriends?: boolean
  users?: number[]
}

type GenerateImageResult = {
  imageUrl: string
  taskId: string | null
}
```

### Notification / Inbox

```ts
type NotificationKind = 'like' | 'comment' | 'remix' | 'follow' | 'system' | string

type Notification = {
  id: number
  kind: NotificationKind
  sender: {
    id: number
    name: string
    avatarUrl: string | null
  }
  content: string | Record<string, unknown> | null
  isRead: boolean
  createdAt: string
}

type InboxPage = {
  notifications: Notification[]
  nextBeforeId: number | null
}
```

### Profile / User Posts

```ts
type UserPost = {
  id: number
  photoUrl: string | null
  optional: string | null
  content: string | null
  status: PostStatus
  createdAt: string | null
}

type UserPostsPage = {
  posts: UserPost[]
  hasMore: boolean
}
```

### Plaza

```ts
type PlazaUser = {
  id: number
  name: string
  avatarUrl: string | null
  statusText: string | null
  statusEmoji: string | null
  animationTaskId: string | null
  posX: number
  posY: number
}

type PlazaBumpTarget = {
  userId: number
  posX: number
  posY: number
}

type PlazaInitMessage = {
  type: 'init'
  users: PlazaUser[]
  myPos: { x: number; y: number } | null
}

type PlazaUserJoinMessage = { type: 'user_join'; user: PlazaUser }
type PlazaUserLeaveMessage = { type: 'user_leave'; userId: number }
type PlazaBumpMessage = {
  type: 'bump'
  from: { id: number; name: string }
  to: PlazaBumpTarget
}
type PlazaStatusUpdateMessage = {
  type: 'status_update'
  userId: number
  statusText: string | null
  statusEmoji: string | null
}
type PlazaAnimationReadyMessage = {
  type: 'animation_ready'
  userId: number
  taskId: string
}

type PlazaServerMessage =
  | PlazaInitMessage
  | PlazaUserJoinMessage
  | PlazaUserLeaveMessage
  | PlazaBumpMessage
  | PlazaStatusUpdateMessage
  | PlazaAnimationReadyMessage

type PlazaBumpAction = { type: 'bump'; targetUserId: number }
type PlazaStatusAction = {
  type: 'status_update'
  statusText: string | null
  statusEmoji: string | null
}
type PlazaClientMessage = PlazaBumpAction | PlazaStatusAction

type PlazaViewerContext = {
  invitedByUserIds: number[]
  inviteeUserIds: number[]
  interactedUserIds: number[]
  interactionTimes: Record<string, string>  // userId → ISO timestamp
}
```

注：`PlazaInitMessage` 在 `@since 0.0.11` 加了 `viewerContext: PlazaViewerContext | null` 字段。

---

## CDN Routing

### prefetchCdnConfig

```ts
function prefetchCdnConfig(): Promise<CdnConfig>
```

启动时调用，异步拉 `/api/cdn-config` 并写入 sessionStorage。后续同步 rewrite 能直接命中。

### rewriteCdnUrlSync

```ts
function rewriteCdnUrlSync(url: string | null | undefined): string
```

同步重写 URL（走 sessionStorage 缓存）。没缓存就返回原 URL。用于 initial render 避免 flash。

### rewriteCdnUrl

```ts
function rewriteCdnUrl(url: string | null | undefined): Promise<string | null>
```

异步重写（等 config 加载完）。`url` 为空返回 `null`。

### getFallbackUrl

```ts
function getFallbackUrl(url: string | null): string | null
```

图片加载失败时返回 fallback host 版本，没 fallback 返回 `null`。

---

## Animation Prefetch

### prefetchAnimation

```ts
function prefetchAnimation(
  qc: QueryClient,
  userId: number,
  taskId: string,
): Promise<object | null>
```

预取用户头像的 Lottie JSON，缓存到 react-query。返回 Lottie JSON 对象，没拿到返回 `null`。

---

## Post Update

### useUpdatePost

```ts
function useUpdatePost(): UseMutationResult<void, Error, UpdatePostInput>
```

**类型：**
```ts
type UpdatePostInput = {
  postId: number
  content?: string
  photoUrl?: string
}
```

---

## Avatar Generate / Iterate

### useAvatarGenerate

```ts
function useAvatarGenerate(): UseMutationResult<
  AvatarGenerateResult,
  Error,
  AvatarGenerateInput
>
```

**类型：**
```ts
type AvatarGenerateStep = 'prompt' | 'generate'

type AvatarGenerateInput = {
  userId: number
  text: string
  styleChips?: string[]
  onStep?: (step: AvatarGenerateStep) => void
}

type AvatarGenerateResult = { resultUrl: string }
```

### useAvatarIterate

```ts
function useAvatarIterate(): UseMutationResult<
  AvatarIterateResult,
  Error,
  AvatarIterateInput
>
```

**类型：**
```ts
type AvatarIterateStep = 'describe' | 'prompt' | 'generate'

type AvatarIterateInput = {
  userId: number
  prevImageUrl: string
  text: string
  styleChips?: string[]
  onStep?: (step: AvatarIterateStep) => void
}

type AvatarIterateResult = { resultUrl: string }
```

---

注：`Post` 类型在 `@since 0.0.11` 加了 `createdAt?: string | null` 可选字段。
