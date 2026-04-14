/**
 * L3: CdnImg — CDN 地域路由 + fallback 逻辑。
 *
 * 重点覆盖：
 *   1. 异步 timing：sessionStorage 为空时 mount，config 加载完后 src 被修正
 *   2. onError fallback：图片加载失败时切换到备用 host
 *   3. 循环防护：fallback 也失败时不再重试，直接透传 onError
 *   4. src prop 变化时重置状态
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CdnImg from './CdnImg'
import * as cdnUtils from '../utils/cdn'

function srcOf(el: HTMLElement) {
  return (el as HTMLImageElement).getAttribute('src')
}

describe('CdnImg', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })
  afterEach(() => cleanup())

  // ── 1. async timing ────────────────────────────────────────────────────────
  it('updates src after async CDN config loads', async () => {
    vi.spyOn(cdnUtils, 'rewriteCdnUrlSync').mockReturnValue(
      'https://cdn.aiwaves.tech/img.jpg',
    )
    vi.spyOn(cdnUtils, 'rewriteCdnUrl').mockResolvedValue(
      'https://cloudflare-cdn.wdabuliu.com/img.jpg',
    )

    render(<CdnImg src="https://cdn.aiwaves.tech/img.jpg" alt="test" />)
    const img = screen.getByRole('img')

    await waitFor(() =>
      expect(srcOf(img)).toBe('https://cloudflare-cdn.wdabuliu.com/img.jpg'),
    )
  })

  it('shows rewritten URL immediately when cache is warm (no flash)', () => {
    vi.spyOn(cdnUtils, 'rewriteCdnUrlSync').mockReturnValue(
      'https://cloudflare-cdn.wdabuliu.com/img.jpg',
    )
    vi.spyOn(cdnUtils, 'rewriteCdnUrl').mockResolvedValue(
      'https://cloudflare-cdn.wdabuliu.com/img.jpg',
    )

    render(<CdnImg src="https://cdn.aiwaves.tech/img.jpg" alt="test" />)

    expect(srcOf(screen.getByRole('img'))).toBe(
      'https://cloudflare-cdn.wdabuliu.com/img.jpg',
    )
  })

  // ── 2. onError fallback ────────────────────────────────────────────────────
  it('switches to fallback host when image fails to load', async () => {
    vi.spyOn(cdnUtils, 'rewriteCdnUrl').mockResolvedValue(
      'https://cdn.aiwaves.tech/img.jpg',
    )
    vi.spyOn(cdnUtils, 'getFallbackUrl').mockReturnValue(
      'https://static.wdabuliu.com/img.jpg',
    )

    render(<CdnImg src="https://cdn.aiwaves.tech/img.jpg" alt="test" />)
    const img = screen.getByRole('img')

    await waitFor(() =>
      expect(srcOf(img)).toBe('https://cdn.aiwaves.tech/img.jpg'),
    )

    fireEvent.error(img)

    await waitFor(() =>
      expect(srcOf(img)).toBe('https://static.wdabuliu.com/img.jpg'),
    )
  })

  // ── 3. loop guard ─────────────────────────────────────────────────────────
  it('calls onError and stops retrying when fallback returns null', async () => {
    vi.spyOn(cdnUtils, 'rewriteCdnUrl').mockResolvedValue(
      'https://cdn.aiwaves.tech/img.jpg',
    )
    vi.spyOn(cdnUtils, 'getFallbackUrl').mockReturnValue(null)
    const onError = vi.fn()

    render(
      <CdnImg src="https://cdn.aiwaves.tech/img.jpg" alt="test" onError={onError} />,
    )
    const img = screen.getByRole('img')
    await waitFor(() => expect(srcOf(img)).toBe('https://cdn.aiwaves.tech/img.jpg'))

    fireEvent.error(img)
    expect(onError).toHaveBeenCalledOnce()
    // Src unchanged — no loop
    expect(srcOf(img)).toBe('https://cdn.aiwaves.tech/img.jpg')
  })

  // ── 4. src prop change resets triedFallback ───────────────────────────────
  it('resets after src prop changes so fallback can fire again', async () => {
    const rewriteSpy = vi.spyOn(cdnUtils, 'rewriteCdnUrl')
    rewriteSpy.mockResolvedValueOnce('https://cdn.aiwaves.tech/a.jpg')
    rewriteSpy.mockResolvedValueOnce('https://cdn.aiwaves.tech/b.jpg')
    const getFallbackSpy = vi.spyOn(cdnUtils, 'getFallbackUrl').mockReturnValue(null)

    const { rerender } = render(
      <CdnImg src="https://cdn.aiwaves.tech/a.jpg" alt="test" />,
    )
    const img = screen.getByRole('img')
    await waitFor(() => expect(srcOf(img)).toBe('https://cdn.aiwaves.tech/a.jpg'))

    fireEvent.error(img) // triedFallback = true for a.jpg

    rerender(<CdnImg src="https://cdn.aiwaves.tech/b.jpg" alt="test" />)
    await waitFor(() => expect(srcOf(img)).toBe('https://cdn.aiwaves.tech/b.jpg'))

    fireEvent.error(img) // should call getFallbackUrl again (state reset)
    expect(getFallbackSpy).toHaveBeenCalledTimes(2)
  })

  // ── 5. null src doesn't crash ─────────────────────────────────────────────
  it('renders without crashing when src is null', () => {
    vi.spyOn(cdnUtils, 'rewriteCdnUrl').mockResolvedValue(null)
    expect(() => render(<CdnImg src={null} alt="empty" />)).not.toThrow()
  })
})
