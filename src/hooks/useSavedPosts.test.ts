/**
 * L2: useSavedPosts 本地偏好存取。
 */
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useSavedPosts } from './useSavedPosts'

describe('useSavedPosts', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('returns empty set initially', () => {
    const { result } = renderHook(() => useSavedPosts())
    expect(result.current.saved.size).toBe(0)
    expect(result.current.isSaved(1)).toBe(false)
  })

  it('toggle adds and removes', () => {
    const { result } = renderHook(() => useSavedPosts())
    act(() => result.current.toggle(42))
    expect(result.current.isSaved(42)).toBe(true)
    act(() => result.current.toggle(42))
    expect(result.current.isSaved(42)).toBe(false)
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useSavedPosts())
    act(() => result.current.toggle(1))
    act(() => result.current.toggle(2))
    const raw = localStorage.getItem('chataigram:saved-posts')
    expect(JSON.parse(raw!)).toEqual(expect.arrayContaining([1, 2]))
  })

  it('reads pre-existing storage', () => {
    localStorage.setItem('chataigram:saved-posts', JSON.stringify([7, 9]))
    const { result } = renderHook(() => useSavedPosts())
    expect(result.current.isSaved(7)).toBe(true)
    expect(result.current.isSaved(9)).toBe(true)
    expect(result.current.isSaved(1)).toBe(false)
  })

  it('ignores corrupt storage gracefully', () => {
    localStorage.setItem('chataigram:saved-posts', '{not json')
    const { result } = renderHook(() => useSavedPosts())
    expect(result.current.saved.size).toBe(0)
  })

  it('filters non-number entries from storage', () => {
    localStorage.setItem('chataigram:saved-posts', JSON.stringify([1, 'x', null, 3]))
    const { result } = renderHook(() => useSavedPosts())
    expect([...result.current.saved].sort()).toEqual([1, 3])
  })
})
