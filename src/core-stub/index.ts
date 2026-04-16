/**
 * @chataigram/core stub — 设计师本地开发用。
 *
 * 提供与 core 相同的导出签名，让 `import { ... } from '@chataigram/core'` 编译通过。
 * 运行时搭配 MSW mock 使用（`pnpm dev:mocks`）。
 *
 * ⚠️ 这里的 hook 实现只是 placeholder，真正的数据来自 MSW handler。
 *    真集成请在 chataigram-app 组装项目中开发。
 */

// Re-export all types
export type {
  Post,
  FeedPage,
  Paginated,
  FeedSortMode,
  UseFeedParams,
  User,
  LoginCredentials,
  RegisterInput,
  AuthSuccess,
  PostStatus,
  CreatePostInput,
  CreatePostResult,
  RemixMode,
  RemixInput,
  RemixTaskStatus,
  RemixTask,
  GhibliRemixInput,
  VoiceTranscribeResult,
  GenerateImageInput,
  GenerateImageResult,
  PhotoToImageStep,
  PhotoToImageModel,
  PhotoToImageInput,
  PhotoToImageResult,
  CommentInput,
  CommentResult,
  ReactInput,
  UploadImageResult,
  SuggestionItem,
  SuggestionScene,
  SuggestionsInput,
  PrankSuggestionsInput,
  UpdateAvatarResult,
  IntentType,
  AnalyzeHistoryMode,
  AnalyzeHistoryInput,
  SearchUsersResult,
  OnboardingResult,
  NotificationKind,
  Notification,
  InboxPage,
  UserPost,
  UserPostsPage,
  InviteCodeRow,
  InviteCodesData,
  GenerateInviteResult,
  NotificationSocketHandle,
  PlazaUser,
  PlazaBumpTarget,
  PlazaInitMessage,
  PlazaUserJoinMessage,
  PlazaUserLeaveMessage,
  PlazaBumpMessage,
  PlazaStatusUpdateMessage,
  PlazaAnimationReadyMessage,
  PlazaServerMessage,
  PlazaBumpAction,
  PlazaStatusAction,
  PlazaClientMessage,
  PlazaSocketCallbacks,
  PlazaSocketHandle,
  UseUserPostsParams,
  SegmentPoint,
  SegmentPromptItem,
  PlazaViewerContext,
  AvatarGenerateStep,
  AvatarIterateStep,
  SegmentAndSuggestStreamOptions,
} from './types'

import type {
  UseFeedParams,
  FeedPage,
  User,
  AuthSuccess,
  LoginCredentials,
  RegisterInput,
  CreatePostResult,
  CreatePostInput,
  RemixInput,
  RemixTask,
  GhibliRemixInput,
  VoiceTranscribeResult,
  GenerateImageResult,
  GenerateImageInput,
  PhotoToImageResult,
  PhotoToImageInput,
  CommentResult,
  CommentInput,
  ReactInput,
  UploadImageResult,
  SuggestionItem,
  SuggestionsInput,
  PrankSuggestionsInput,
  UpdateAvatarResult,
  IntentType,
  AnalyzeHistoryInput,
  SearchUsersResult,
  OnboardingResult,
  Notification,
  InboxPage,
  UserPostsPage,
  UseUserPostsParams,
  InviteCodesData,
  GenerateInviteResult,
  NotificationSocketHandle,
  PlazaSocketCallbacks,
  PlazaSocketHandle,
  AvatarGenerateStep,
  AvatarIterateStep,
  SegmentAndSuggestStreamOptions,
  Post,
} from './types'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

// ─────────────────────────────────────────────────────────────
// Helper: stub fetch that goes through MSW
// ─────────────────────────────────────────────────────────────

async function stubGet<T>(path: string): Promise<T> {
  const res = await globalThis.fetch(path)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

async function stubPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await globalThis.fetch(path, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

async function stubDelete<T>(path: string): Promise<T> {
  const res = await globalThis.fetch(path, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

async function stubPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await globalThis.fetch(path, {
    method: 'PUT',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

async function stubUpload<T>(path: string, blob: Blob): Promise<T> {
  const form = new FormData()
  form.append('file', blob)
  const res = await globalThis.fetch(path, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Upload ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

// ─────────────────────────────────────────────────────────────
// Feed
// ─────────────────────────────────────────────────────────────

export function useFeed(params?: UseFeedParams) {
  return useQuery<FeedPage>({
    queryKey: ['feed', params],
    queryFn: () => {
      const sp = new URLSearchParams()
      if (params?.offset != null) sp.set('offset', String(params.offset))
      if (params?.limit != null) sp.set('limit', String(params.limit))
      if (params?.sortMode) sp.set('sort', params.sortMode)
      const qs = sp.toString()
      return stubGet<FeedPage>(`/api/feed${qs ? `?${qs}` : ''}`)
    },
  })
}

export function useLikePost() {
  const qc = useQueryClient()
  return useMutation<void, Error, number>({
    mutationFn: (postId) => stubPost(`/api/posts/${postId}/like`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['feed'] }) },
  })
}

// ─────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────

const CURRENT_USER_KEY = 'chataigram_current_user'

export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ['currentUser'],
    queryFn: () => {
      const raw = localStorage.getItem(CURRENT_USER_KEY)
      return raw ? (JSON.parse(raw) as User) : null
    },
    staleTime: Infinity,
  })
}

export function useSetCurrentUser() {
  const qc = useQueryClient()
  return (user: User | null) => {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(CURRENT_USER_KEY)
    }
    qc.setQueryData(['currentUser'], user)
  }
}

export function useLogin() {
  const set = useSetCurrentUser()
  return useMutation<AuthSuccess, Error, LoginCredentials>({
    mutationFn: (creds) => stubPost<AuthSuccess>('/api/auth/login', creds),
    onSuccess: (data) => { set(data.user) },
  })
}

export function useRegister() {
  const set = useSetCurrentUser()
  return useMutation<AuthSuccess, Error, RegisterInput>({
    mutationFn: (input) => stubPost<AuthSuccess>('/api/auth/register', input),
    onSuccess: (data) => { set(data.user) },
  })
}

export function useLogout() {
  const set = useSetCurrentUser()
  return useMutation<void, Error, void>({
    mutationFn: () => stubPost('/api/auth/logout'),
    onSuccess: () => { set(null) },
  })
}

export function useCheckUsername(username: string) {
  return useQuery<boolean>({
    queryKey: ['checkUsername', username],
    queryFn: () => stubGet<boolean>(`/api/auth/check-username?username=${encodeURIComponent(username)}`),
    enabled: username.length > 0,
  })
}

export function useUserInfo(userId: number | null | undefined) {
  return useQuery<User | null>({
    queryKey: ['userInfo', userId],
    queryFn: () => stubGet<User>(`/api/users/${userId}`),
    enabled: userId != null,
  })
}

export const googleAuthUrl = '/auth/google'

export function parseGoogleCallback(search: string | URLSearchParams): User | null {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const raw = params.get('user')
  if (!raw) return null
  try {
    return JSON.parse(decodeURIComponent(raw)) as User
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// Create / Remix / Voice / Generate
// ─────────────────────────────────────────────────────────────

export function useCreatePost() {
  return useMutation<CreatePostResult, Error, CreatePostInput>({
    mutationFn: (input) => stubPost('/api/posts', input),
  })
}

export function useRemixPost() {
  return useMutation<string, Error, RemixInput>({
    mutationFn: (input) => stubPost<{ taskId: string }>('/api/remix', input).then((r) => r.taskId),
  })
}

export function useRemixTask(taskId: string | null | undefined, pollIntervalMs = 2000) {
  return useQuery<RemixTask>({
    queryKey: ['remixTask', taskId],
    queryFn: () => stubGet<RemixTask>(`/api/remix/${taskId}`),
    enabled: taskId != null,
    refetchInterval: pollIntervalMs,
  })
}

export function useGhibliRemix() {
  return useMutation<string, Error, GhibliRemixInput>({
    mutationFn: (input) => stubPost<{ taskId: string }>('/api/remix/ghibli', input).then((r) => r.taskId),
  })
}

export function useVoiceTranscribe() {
  return useMutation<VoiceTranscribeResult, Error, Blob>({
    mutationFn: (blob) => stubUpload('/api/voice/transcribe', blob),
  })
}

export function usePublishPost() {
  return useMutation<void, Error, number>({
    mutationFn: (postId) => stubPut(`/api/posts/${postId}/publish`),
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation<void, Error, number>({
    mutationFn: (postId) => stubDelete(`/api/posts/${postId}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['feed'] }) },
  })
}

export function useGenerateImage() {
  return useMutation<GenerateImageResult, Error, GenerateImageInput>({
    mutationFn: (input) => stubPost('/api/generate', input),
  })
}

export function usePhotoToImage() {
  return useMutation<PhotoToImageResult, Error, PhotoToImageInput>({
    mutationFn: (input) => stubUpload('/api/photo-to-image', input.file),
  })
}

// ─────────────────────────────────────────────────────────────
// Social
// ─────────────────────────────────────────────────────────────

export function useRemixes(postId: number | null | undefined) {
  return useQuery<Post[]>({
    queryKey: ['remixes', postId],
    queryFn: () => stubGet<Post[]>(`/api/posts/${postId}/remixes`),
    enabled: postId != null,
  })
}

export function useCommentPost() {
  return useMutation<CommentResult, Error, CommentInput>({
    mutationFn: (input) => stubPost(`/api/posts/${input.postId}/comments`, { text: input.text }),
  })
}

export function useReact() {
  return useMutation<void, Error, ReactInput>({
    mutationFn: (input) => stubPost('/api/reactions', input),
  })
}

export function useUploadImage() {
  return useMutation<UploadImageResult, Error, Blob>({
    mutationFn: (blob) => stubUpload('/api/upload', blob),
  })
}

// ─────────────────────────────────────────────────────────────
// VLM / Suggestion / Avatar
// ─────────────────────────────────────────────────────────────

export function useImageDescription() {
  return useMutation<string, Error, { url: string }>({
    mutationFn: (input) => stubPost<{ description: string }>('/api/vlm/describe', input).then((r) => r.description),
  })
}

export function useSuggestions() {
  return useMutation<SuggestionItem[], Error, SuggestionsInput>({
    mutationFn: (input) => stubPost<{ suggestions: SuggestionItem[] }>('/api/suggestions', input).then((r) => r.suggestions),
  })
}

export function usePrankSuggestions() {
  return useMutation<SuggestionItem[], Error, PrankSuggestionsInput>({
    mutationFn: (input) => stubPost<{ suggestions: SuggestionItem[] }>('/api/suggestions/prank', input).then((r) => r.suggestions),
  })
}

export function useUpdateAvatar() {
  return useMutation<UpdateAvatarResult, Error, string>({
    mutationFn: (url) => stubPost('/api/avatar', { url }),
  })
}

// ─────────────────────────────────────────────────────────────
// Intent / Analyze / Search / Onboarding
// ─────────────────────────────────────────────────────────────

export function useDetectIntent() {
  return useMutation<IntentType, Error, string>({
    mutationFn: (text) => stubPost<{ intent: IntentType }>('/api/intent', { text }).then((r) => r.intent),
  })
}

export function useAnalyzeHistory() {
  return useMutation<string | null, Error, AnalyzeHistoryInput>({
    mutationFn: (input) => stubPost<{ result: string | null }>('/api/analyze', input).then((r) => r.result),
  })
}

export function useSearchUsers(query: string | null | undefined) {
  return useQuery<SearchUsersResult>({
    queryKey: ['searchUsers', query],
    queryFn: () => stubGet<SearchUsersResult>(`/api/users/search?q=${encodeURIComponent(query ?? '')}`),
    enabled: query != null && query.length > 0,
  })
}

export function useOnboarding() {
  return useMutation<OnboardingResult, Error, { userId: number; name: string }>({
    mutationFn: (input) => stubPost('/api/onboarding', input),
  })
}

// ─────────────────────────────────────────────────────────────
// Inbox / Notifications
// ─────────────────────────────────────────────────────────────

export function useInbox(params?: { limit?: number; beforeId?: number }) {
  return useQuery<InboxPage>({
    queryKey: ['inbox', params],
    queryFn: () => {
      const sp = new URLSearchParams()
      if (params?.limit != null) sp.set('limit', String(params.limit))
      if (params?.beforeId != null) sp.set('before_id', String(params.beforeId))
      const qs = sp.toString()
      return stubGet<InboxPage>(`/api/inbox${qs ? `?${qs}` : ''}`)
    },
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation<void, Error, number[]>({
    mutationFn: (ids) => stubPost('/api/inbox/read', { ids }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['inbox'] }) },
  })
}

export function useUnreadCount(pollIntervalMs = 30000) {
  return useQuery<number>({
    queryKey: ['unreadCount'],
    queryFn: () => stubGet<{ count: number }>('/api/inbox/unread').then((r) => r.count),
    refetchInterval: pollIntervalMs,
  })
}

// ─────────────────────────────────────────────────────────────
// Profile / User Posts
// ─────────────────────────────────────────────────────────────

export function useUserPosts(userId: number | null | undefined, params?: UseUserPostsParams) {
  return useQuery<UserPostsPage>({
    queryKey: ['userPosts', userId, params],
    queryFn: () => {
      const sp = new URLSearchParams()
      if (params?.status) sp.set('status', params.status)
      if (params?.limit != null) sp.set('limit', String(params.limit))
      if (params?.beforeId != null) sp.set('before_id', String(params.beforeId))
      const qs = sp.toString()
      return stubGet<UserPostsPage>(`/api/users/${userId}/posts${qs ? `?${qs}` : ''}`)
    },
    enabled: userId != null,
  })
}

// ─────────────────────────────────────────────────────────────
// Invite
// ─────────────────────────────────────────────────────────────

export function useMyInviteCodes(userId: number | null | undefined) {
  return useQuery<InviteCodesData>({
    queryKey: ['inviteCodes', userId],
    queryFn: () => stubGet<InviteCodesData>(`/api/users/${userId}/invite-codes`),
    enabled: userId != null,
  })
}

export function useGenerateInviteCode() {
  const qc = useQueryClient()
  return useMutation<GenerateInviteResult, Error, number>({
    mutationFn: (userId) => stubPost(`/api/users/${userId}/invite-codes`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['inviteCodes'] }) },
  })
}

// ─────────────────────────────────────────────────────────────
// WebSocket (stub: no-op in mock mode)
// ─────────────────────────────────────────────────────────────

export function useNotificationSocket(
  _userId: number | null | undefined,
  _onNotification: (n: Notification) => void,
): NotificationSocketHandle {
  return { connected: false }
}

export function usePlazaSocket(
  _userId: number | null | undefined,
  _callbacks: PlazaSocketCallbacks,
): PlazaSocketHandle {
  const noop = useCallback(() => {
    // no-op in stub mode
  }, [])
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send: noop as any,
    connected: false,
  }
}

// ─────────────────────────────────────────────────────────────
// SAM3 Stream (stub)
// ─────────────────────────────────────────────────────────────

export async function segmentAndSuggestStream(
  _opts: SegmentAndSuggestStreamOptions,
): Promise<void> {
  // no-op in stub mode
}

// ─────────────────────────────────────────────────────────────
// Update post (WIP in core)
// ─────────────────────────────────────────────────────────────

export function useUpdatePost() {
  const qc = useQueryClient()
  return useMutation<void, Error, { postId: number; content?: string; photoUrl?: string }>({
    mutationFn: (input) => stubPut(`/api/posts/${input.postId}`, input),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['feed'] }) },
  })
}

// ─────────────────────────────────────────────────────────────
// Avatar Generate / Iterate (WIP in core)
// ─────────────────────────────────────────────────────────────

export function useAvatarGenerate() {
  return useMutation<
    { resultUrl: string },
    Error,
    {
      userId: number
      text: string
      styleChips?: string[]
      onStep?: (step: AvatarGenerateStep) => void
    }
  >({
    mutationFn: (input) => stubPost('/api/avatar/generate', input),
  })
}

export function useAvatarIterate() {
  return useMutation<
    { resultUrl: string },
    Error,
    {
      userId: number
      prevImageUrl: string
      text: string
      styleChips?: string[]
      onStep?: (step: AvatarIterateStep) => void
    }
  >({
    mutationFn: (input) => stubPost('/api/avatar/iterate', input),
  })
}

// ─────────────────────────────────────────────────────────────
// Animation prefetch (WIP in core)
// ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function prefetchAnimation(_qc: any, _userId: number, _taskId: string): Promise<object | null> {
  return null
}

// ─────────────────────────────────────────────────────────────
// CDN utilities (stub: passthrough)
// ─────────────────────────────────────────────────────────────

export function prefetchCdnConfig(): void {
  // no-op in stub mode
}

export function rewriteCdnUrl(url: string | null | undefined): Promise<string | null> {
  return Promise.resolve(url ?? null)
}

export function rewriteCdnUrlSync(url: string | null | undefined): string {
  return url ?? ''
}

export function getFallbackUrl(url: string | null): string | null {
  return url
}
