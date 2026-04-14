import { forwardRef, useCallback, useEffect, useState } from 'react'
import type { ImgHTMLAttributes, SyntheticEvent } from 'react'
import { getFallbackUrl, rewriteCdnUrl, rewriteCdnUrlSync } from '../utils/cdn'

type CdnImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | null | undefined
}

/**
 * 自动 CDN 地域路由 + 加载失败自动切换 fallback host 的 <img>。
 *
 * - 初始值：rewriteCdnUrlSync（同步，命中缓存则无 flash）
 * - useEffect：rewriteCdnUrl（异步，等 CDN config 加载完后修正 URL）
 *   → 修复首次加载时 sessionStorage 还没写入导致图片空白的 timing 问题
 *
 * 支持 ref 转发，供需要读取 naturalWidth/naturalHeight 的场景使用。
 */
const CdnImg = forwardRef<HTMLImageElement, CdnImgProps>(
  ({ src, onError, ...rest }, ref) => {
    const [currentSrc, setCurrentSrc] = useState<string | null>(() => rewriteCdnUrlSync(src))
    const [triedFallback, setTriedFallback] = useState(false)

    useEffect(() => {
      setTriedFallback(false)
      void rewriteCdnUrl(src).then(setCurrentSrc)
    }, [src])

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

    return <img ref={ref} src={currentSrc ?? undefined} onError={handleError} {...rest} />
  },
)

CdnImg.displayName = 'CdnImg'

export default CdnImg
