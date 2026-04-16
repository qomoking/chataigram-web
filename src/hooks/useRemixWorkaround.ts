/**
 * 临时 workaround：绕过 core 的 useRemixPost / useRemixTask 的两个 bug：
 *   1. useRemixPost 只接受 ret_code=200，但后端返回 202
 *   2. useRemixTask 要求 status 字段，但后端完成时不返回 status
 *
 * TODO(core): 等 core 修复后删除此文件，改回用 core 的 hooks
 * 见 docs/core-wishlist.md
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@chataigram/core/internals'
import type { Post, RemixInput } from '@chataigram/core'

type RemixResponseRaw = {
  ret_code: number
  task_id?: string
  error?: string
}

type RemixTaskRaw = {
  ret_code: number
  status?: 'pending' | 'done' | 'error'
  post?: Record<string, unknown> | null
  task_id?: string | null
  error?: string | null
}

export type RemixTaskResult = {
  taskId: string
  status: 'pending' | 'done' | 'error'
  post: Post | null
  error: string | null
}

function normalizePost(raw: Record<string, unknown>): Post {
  return {
    id: raw.id as number,
    parentId: (raw.pid as number) ?? 0,
    authorId: (raw.telegram_id as number) ?? 0,
    photoUrl: (raw.photo_url as string) ?? null,
    content: (raw.content as string) ?? null,
    type: (raw.type as number) ?? 0,
    likeCount: (raw.like_num as number) ?? 0,
    relayCount: (raw.relay_num as number) ?? 0,
    commentCount: (raw.comment_num as number) ?? 0,
    shareCount: (raw.share_num as number) ?? 0,
    optional: (raw.optional as string) ?? null,
    hasRemixes: (raw.has_remixes as boolean) ?? false,
    createdAt: (raw.created_at as string) ?? null,
  }
}

// TODO(core): replace with core's useRemixPost once ret_code 202 is accepted
export function useRemixPostFixed() {
  return useMutation<string, Error, RemixInput>({
    mutationFn: async (input) => {
      const body = {
        telegram_id: input.authorId,
        instruction: input.instruction,
        mode: input.mode ?? 'remix',
        status: input.status ?? 'draft',
      }
      const raw = await apiClient.post<RemixResponseRaw>(
        `/posts/${input.parentPostId}/remix`,
        body,
      )
      // Accept both 200 and 202
      if ((raw.ret_code !== 200 && raw.ret_code !== 202) || !raw.task_id) {
        throw new Error(raw.error ?? 'Remix failed')
      }
      return raw.task_id
    },
  })
}

// TODO(core): replace with core's useRemixTask once status inference is fixed
export function useRemixTaskFixed(taskId: string | null | undefined, pollIntervalMs = 2000) {
  const queryClient = useQueryClient()

  return useQuery<RemixTaskResult>({
    queryKey: ['remixTask', taskId],
    queryFn: async () => {
      if (!taskId) throw new Error('no task id')
      const raw = await apiClient.get<RemixTaskRaw>(`/remix_tasks/${taskId}`)

      if (raw.ret_code !== 200 && raw.ret_code !== 202) {
        return { taskId, status: 'error' as const, post: null, error: raw.error ?? 'unknown' }
      }

      // Infer status from response shape:
      // - ret_code 202 + no post = still pending
      // - ret_code 200 + post = done
      // - explicit status field takes priority
      let status: 'pending' | 'done' | 'error' = raw.status ?? 'pending'
      if (!raw.status) {
        if (raw.post) status = 'done'
        else if (raw.error) status = 'error'
        // else stays 'pending' — keep polling
      }

      const post = raw.post ? normalizePost(raw.post) : null

      // Auto-invalidate feed when done
      if (status === 'done') {
        void queryClient.invalidateQueries({ queryKey: ['remixes'] })
        void queryClient.invalidateQueries({ queryKey: ['feed'] })
      }

      return { taskId, status, post, error: raw.error ?? null }
    },
    enabled: taskId != null,
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return s === 'done' || s === 'error' ? false : pollIntervalMs
    },
    staleTime: 0,
  })
}
