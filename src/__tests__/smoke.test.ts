import { describe, expect, it } from 'vitest'

describe('web smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })

  it('can import from @chataigram/core', async () => {
    const core = await import('@chataigram/core')
    expect(core.useFeed).toBeDefined()
  })
})
