/**
 * 浏览器侧图片压缩 + 长边限制，避免大图直接传后端 SSE pipeline。
 *
 * 用 canvas 绘制 + toBlob 输出 jpeg，质量 0.85，max 长边 1600px。
 * 同时返回 aspectRatio 字符串（如 '4:3'）方便传给 photoToImage。
 */

const MAX_DIM = 1600
const QUALITY = 0.85

export type CompressedImage = {
  file: Blob
  aspectRatio: string
  width: number
  height: number
}

export async function compressImage(input: Blob): Promise<CompressedImage> {
  const url = URL.createObjectURL(input)
  try {
    const img = await loadImage(url)
    const { width, height } = scaleToMaxDim(img.width, img.height, MAX_DIM)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d context unavailable')
    ctx.drawImage(img, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', QUALITY)
    })
    if (!blob) throw new Error('toBlob returned null')

    return {
      file: blob,
      aspectRatio: aspectRatioString(width, height),
      width,
      height,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

function scaleToMaxDim(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h }
  const ratio = w / h
  if (w >= h) {
    return { width: max, height: Math.round(max / ratio) }
  }
  return { width: Math.round(max * ratio), height: max }
}

function aspectRatioString(w: number, h: number): string {
  const g = gcd(w, h)
  return `${w / g}:${h / g}`
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}
