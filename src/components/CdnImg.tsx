import type { ImgHTMLAttributes, SyntheticEvent } from 'react'
import { useCallback, useState } from 'react'
import { getFallbackUrl, rewriteCdnUrlSync } from '../utils/cdn'

type CdnImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | null | undefined
}

/**
 * 自动 CDN 地域路由 + 加载失败自动切换 fallback host 的 <img>。
 *
 * @example
 * <CdnImg src={post.photoUrl} alt="post" className="card-img" loading="lazy" />
 */
export default function CdnImg({ src, onError, ...rest }: CdnImgProps) {
  const [currentSrc, setCurrentSrc] = useState(() => rewriteCdnUrlSync(src))
  const [triedFallback, setTriedFallback] = useState(false)

  // src 变化时重置（当且仅当没尝试过 fallback）
  const rewritten = rewriteCdnUrlSync(src)
  if (rewritten !== currentSrc && !triedFallback) {
    setCurrentSrc(rewritten)
  }

  const handleError = useCallback(
    (e: SyntheticEvent<HTMLImageElement>) => {
      if (!triedFallback) {
        const fallback = getFallbackUrl(currentSrc)
        if (fallback) {
          setCurrentSrc(fallback)
          setTriedFallback(true)
          return
        }
      }
      onError?.(e)
    },
    [currentSrc, triedFallback, onError],
  )

  return <img src={currentSrc ?? undefined} onError={handleError} {...rest} />
}
