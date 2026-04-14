const palette = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

export function pickColor(seed: number): string {
  return palette[Math.abs(seed) % palette.length] ?? palette[0]!
}
