/**
 * @chataigram/core 的类型定义副本。
 *
 * 来源：core 仓 docs/core-api.md（自动生成）。
 * 设计师用这些类型写 mock 和页面，保证形状与 core 一致。
 */

// ── Feed / Post ─────────────────────────────────────────────

export type Post = {
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
  createdAt?: string | null
}

export type FeedPage = {
  posts: Post[]
  nextOffset: number | null
}

export type Paginated<T> = {
  items: T[]
  nextCursor: string | null
  total: number
}

export type FeedSortMode = 'random' | 'chrono'

export type UseFeedParams = {
  offset?: number
  limit?: number
  sortMode?: FeedSortMode
}

// ── User / Auth ─────────────────────────────────────────────

export type User = {
  id: number
  name: string
  username: string | null
  avatarUrl: string | null
}

export type LoginCredentials = {
  username: string
  password: string
}

export type RegisterInput = {
  name: string
  username: string
  password: string
  inviteCode?: string
}

export type AuthSuccess = {
  user: User
  animationTaskId: string | null
}

// ── Create / Remix / Voice / Generate ───────────────────────

export type PostStatus = 'published' | 'draft'

export type CreatePostInput = {
  authorId: number
  photoUrl: string
  content?: string | null
  optional?: string | null
  optionalInfo?: string | null
  type?: number
  status?: PostStatus
}

export type CreatePostResult = { postId: number }

export type RemixMode = 'remix' | 'draw-back'

export type RemixInput = {
  authorId: number
  parentPostId: number
  instruction: string
  mode?: RemixMode
  status?: PostStatus
}

export type RemixTaskStatus = 'pending' | 'done' | 'error'

export type RemixTask = {
  taskId: string
  status: RemixTaskStatus
  post: Post | null
  error: string | null
}

export type GhibliRemixInput = {
  authorId: number
  photoUrl: string
}

export type VoiceTranscribeResult = {
  text: string
  confidence: number | null
}

export type GenerateImageInput = {
  prompt: string
  userId: number
  refImageUrl?: string | null
  isFriends?: boolean
  users?: number[]
}

export type GenerateImageResult = {
  imageUrl: string
  taskId: string | null
}

export type PhotoToImageStep = 'upload' | 'describe' | 'prompt' | 'generate'
export type PhotoToImageModel = 'gpu' | 'cpu'

export type PhotoToImageInput = {
  file: Blob
  authorId: number
  promptVersion?: number
  aspectRatio?: string
  model?: PhotoToImageModel
  contentType?: string
  onStep?: (step: PhotoToImageStep, elapsed: number) => void
  signal?: AbortSignal
}

export type PhotoToImageResult = {
  resultUrl: string
  cdnUrl: string
  description: string
  prompt: string
}

// ── Social ──────────────────────────────────────────────────

export type CommentInput = { postId: number; text: string }
export type CommentResult = { commentCount: number }
export type ReactInput = { recipientId: number; notificationId: number }
export type UploadImageResult = { imageUrl: string }

// ── VLM / Suggestion / Avatar ───────────────────────────────

export type SuggestionItem = {
  label: string
  prompt: string
  emoji: string | null
  desc: string | null
}

export type SuggestionScene = 'avatar' | 'create' | 'prank'

export type SuggestionsInput = {
  prompt: string
  scene?: SuggestionScene
  imgDesc?: string | null
  history?: string[]
  count?: number
  angle?: number | null
}

export type PrankSuggestionsInput = {
  imageUrl: string
  prompt?: string
  count?: number
}

export type UpdateAvatarResult = { animationTaskId: string | null }

// ── Intent / Analyze / Search / Onboarding ──────────────────

export type IntentType = 'generate' | 'feed' | 'analyze_prompt' | 'analyze_keywords'

export type AnalyzeHistoryMode = 'prompt' | 'keywords'
export type HistoryItem = { prompt: string; userText?: string }
export type AnalyzeHistoryInput = {
  history: HistoryItem[]
  mode: AnalyzeHistoryMode
}

export type SearchUsersResult = { users: User[]; isRecommended: boolean }
export type OnboardingResult = { welcomeText: string | null; avatarUrl: string | null }

// ── Notification / Inbox ────────────────────────────────────

export type NotificationKind = 'like' | 'comment' | 'remix' | 'follow' | 'system' | string

export type Notification = {
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

export type InboxPage = {
  notifications: Notification[]
  nextBeforeId: number | null
}

// ── Profile / User Posts ────────────────────────────────────

export type UserPost = {
  id: number
  photoUrl: string | null
  optional: string | null
  content: string | null
  status: PostStatus
  createdAt: string | null
}

export type UserPostsPage = {
  posts: UserPost[]
  hasMore: boolean
}

// ── Invite ──────────────────────────────────────────────────

export type InviteCodeRow = {
  code: string
  used: boolean
  usedBy: number | null
  createdAt: string
}

export type InviteCodesData = {
  codes: InviteCodeRow[]
  totalCount: number
  maxCount: number
}

export type GenerateInviteResult = {
  code: string
  totalCount: number
  maxCount: number
}

// ── WebSocket ───────────────────────────────────────────────

export type NotificationSocketHandle = { connected: boolean }

export type PlazaUser = {
  id: number
  name: string
  avatarUrl: string | null
  statusText: string | null
  statusEmoji: string | null
  animationTaskId: string | null
  posX: number
  posY: number
}

export type PlazaBumpTarget = {
  userId: number
  posX: number
  posY: number
}

export type PlazaInitMessage = {
  type: 'init'
  users: PlazaUser[]
  myPos: { x: number; y: number } | null
  viewerContext: PlazaViewerContext | null
}

export type PlazaUserJoinMessage = { type: 'user_join'; user: PlazaUser }
export type PlazaUserLeaveMessage = { type: 'user_leave'; userId: number }
export type PlazaBumpMessage = {
  type: 'bump'
  from: { id: number; name: string }
  to: PlazaBumpTarget
}
export type PlazaStatusUpdateMessage = {
  type: 'status_update'
  userId: number
  statusText: string | null
  statusEmoji: string | null
}
export type PlazaAnimationReadyMessage = {
  type: 'animation_ready'
  userId: number
  taskId: string
}

export type PlazaServerMessage =
  | PlazaInitMessage
  | PlazaUserJoinMessage
  | PlazaUserLeaveMessage
  | PlazaBumpMessage
  | PlazaStatusUpdateMessage
  | PlazaAnimationReadyMessage

export type PlazaBumpAction = { type: 'bump'; targetUserId: number }
export type PlazaStatusAction = {
  type: 'status_update'
  statusText: string | null
  statusEmoji: string | null
}
export type PlazaClientMessage = PlazaBumpAction | PlazaStatusAction

export type PlazaSocketCallbacks = {
  onInit?: (msg: PlazaInitMessage) => void
  onUserJoin?: (user: PlazaUser) => void
  onUserLeave?: (userId: number) => void
  onBump?: (from: { id: number; name: string }, to: PlazaBumpTarget) => void
  onStatusUpdate?: (userId: number, statusText: string | null, statusEmoji: string | null) => void
  onAnimationReady?: (userId: number, taskId: string) => void
}

export type PlazaSocketHandle = {
  send: (msg: PlazaClientMessage) => void
  connected: boolean
}

export type PlazaViewerContext = {
  invitedByUserIds: number[]
  inviteeUserIds: number[]
  interactedUserIds: number[]
  interactionTimes: Record<string, string>
}

// ── Avatar Generate / Iterate ───────────────────────────────

export type AvatarGenerateStep = 'prompt' | 'generate'
export type AvatarIterateStep = 'describe' | 'prompt' | 'generate'

// ── Profile / User Posts params ─────────────────────────────

export type UseUserPostsParams = {
  status?: PostStatus
  limit?: number
  beforeId?: number | null
}

// ── SAM3 Stream ─────────────────────────────────────────────

export type SegmentPoint = { x: number; y: number }
export type SegmentPromptItem = {
  icon?: string | null
  text: string
  prompt: string
  is_interactive?: boolean
}
export type SegmentAndSuggestStreamOptions = {
  imageUrl: string
  points: SegmentPoint[]
  mode: 'single' | 'box'
  signal?: AbortSignal
  onLabel?: (label: string) => void
  onPrompts?: (prompts: SegmentPromptItem[]) => void
  onError?: (err: string) => void
}

// ── Interactive SAM3 Stream (临场互动) ──────────────────────

export type InteractiveSegmentStreamOptions = SegmentAndSuggestStreamOptions & {
  avatarUrl: string
}

// ── Immersive Generate ──────────────────────────────────────

export type ImmersiveGenerateInput = {
  sceneImageUrl: string
  avatarUrl: string
  prompt: string
}

export type ImmersiveGenerateResult = {
  resultUrl: string | null
  error: string | null
}
