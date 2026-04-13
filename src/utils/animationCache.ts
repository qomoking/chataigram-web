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
