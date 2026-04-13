/**
 * Animation prefetch cache（从 frontend/src/utils/animationCache.js 迁来）。
 *
 * 登录成功后调 prefetchAnimation 把 Lottie JSON 拉回来缓存在内存，
 * PlazaPage 渲染用户头像动画时先查这里再决定是否远程拉。
 */

type LottieAsset = { e?: number; u?: string; p?: string }
type LottieJson = { assets?: LottieAsset[] }

const cache: Record<number, LottieJson> = {}

/** 预取用户的 Lottie 动画 + 预载其中图片。静默失败。 */
export function prefetchAnimation(
  userId: number | null | undefined,
  taskId: string | null | undefined,
): void {
  if (!userId || !taskId) return
  if (cache[userId]) return

  fetch(`/api/animations/${taskId}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { lottie?: LottieJson } | null) => {
      if (!data?.lottie) return
      cache[userId] = data.lottie
      for (const asset of data.lottie.assets ?? []) {
        if (asset.e === 0 && asset.u && asset.p) {
          const img = new Image()
          img.src = asset.u + asset.p
        }
      }
    })
    .catch(() => {
      /* silent */
    })
}

export function getCachedAnimation(userId: number | null | undefined): LottieJson | null {
  if (userId == null) return null
  return cache[userId] ?? null
}

export function setCachedAnimation(
  userId: number | null | undefined,
  lottie: LottieJson | null | undefined,
): void {
  if (userId != null && lottie) cache[userId] = lottie
}

/**
 * 一次性拉某个 taskId 的 Lottie JSON（带缓存）；失败返回 null，不抛异常。
 * 给 PlazaPage 的 on-demand 拉取用。
 */
export async function fetchAnimationData(
  userId: number,
  taskId: string,
): Promise<LottieJson | null> {
  const cached = getCachedAnimation(userId)
  if (cached) return cached
  try {
    const res = await fetch(`/api/animations/${taskId}`)
    if (!res.ok) return null
    const data = (await res.json()) as { lottie?: LottieJson }
    if (data.lottie) {
      cache[userId] = data.lottie
      return data.lottie
    }
    return null
  } catch {
    return null
  }
}
