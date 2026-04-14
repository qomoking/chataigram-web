import type { CSSProperties } from 'react'
import './Skeleton.css'

type SkeletonProps = {
  width?: number | string
  height?: number | string
  borderRadius?: number | string
  className?: string
  style?: CSSProperties
}

export function Skeleton({ width, height, borderRadius, className = '', style }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius, ...style }}
    />
  )
}

/** Feed masonry skeleton */
export function FeedSkeleton() {
  return (
    <div className="skeleton-feed">
      {[0, 1].map((col) => (
        <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-feed-card">
              <div className="skeleton skeleton-feed-img" style={{ height: 120 + (i % 2) * 60 }} />
              <div className="skeleton-feed-body">
                <div className="skeleton-feed-row">
                  <div className="skeleton skeleton-circle" style={{ width: 20, height: 20 }} />
                  <div className="skeleton skeleton-text-short" style={{ flex: 1 }} />
                </div>
                <div className="skeleton skeleton-text" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** List page skeleton (Inbox, Works, etc.) */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-list-item">
          <div className="skeleton skeleton-circle" style={{ width: 44, height: 44, flexShrink: 0 }} />
          <div className="skeleton-list-lines">
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text-short" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Immersive full-screen skeleton */
export function ImmersiveSkeleton() {
  return (
    <div className="skeleton-immersive">
      <div className="skeleton skeleton-text" style={{ width: 120 }} />
      <div className="skeleton skeleton-text" style={{ width: '70%', marginTop: 8 }} />
      <div className="skeleton skeleton-text-short" style={{ width: '40%', marginTop: 4 }} />
    </div>
  )
}
