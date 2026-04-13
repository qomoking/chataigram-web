import { useState } from 'react'
import { useFeed, useLikePost } from '@chataigram/core'
import type { Post } from '@chataigram/core'
import { useSavedPosts } from '../../hooks/useSavedPosts'
import { HeartIcon, BookmarkIcon } from '../../components/icons'
import styles from './FeedPage.module.css'

/**
 * Feed 页 —— 公开 feed 流，masonry 布局 + 点赞 + 收藏。
 *
 * 数据来源：@chataigram/core 的 useFeed / useLikePost
 * 收藏（saved）：本地 localStorage（web 内部 hook）
 */
export default function FeedPage() {
  const { data, isLoading, error } = useFeed({ limit: 20 })
  const like = useLikePost()
  const { isSaved, toggle: toggleSave } = useSavedPosts()
  const [bumpId, setBumpId] = useState<number | null>(null)

  const handleLike = (postId: number) => {
    setBumpId(postId)
    setTimeout(() => setBumpId(null), 300)
    like.mutate(postId)
  }

  const posts = data?.posts ?? []
  const col1 = posts.filter((_, i) => i % 2 === 0)
  const col2 = posts.filter((_, i) => i % 2 === 1)

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <span className={styles.logo}>ChatAigram</span>
      </header>

      {isLoading && <div className={styles.empty}>Loading…</div>}

      {error && (
        <div className={styles.error}>
          {String(error instanceof Error ? error.message : error)}
        </div>
      )}

      {!isLoading && !error && posts.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>✦</div>
          <p>暂无帖子</p>
        </div>
      )}

      {posts.length > 0 && (
        <div className={styles.masonry}>
          <div className={styles.col}>
            {col1.map((p) => (
              <Card
                key={p.id}
                post={p}
                bumped={bumpId === p.id}
                isSaved={isSaved(p.id)}
                onLike={() => handleLike(p.id)}
                onSave={() => toggleSave(p.id)}
              />
            ))}
          </div>
          <div className={styles.col}>
            {col2.map((p) => (
              <Card
                key={p.id}
                post={p}
                bumped={bumpId === p.id}
                isSaved={isSaved(p.id)}
                onLike={() => handleLike(p.id)}
                onSave={() => toggleSave(p.id)}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

// ── Card ────────────────────────────────────────────────

type CardProps = {
  post: Post
  bumped: boolean
  isSaved: boolean
  onLike: () => void
  onSave: () => void
}

function Card({ post, bumped, isSaved, onLike, onSave }: CardProps) {
  const initial = String(post.authorId).slice(-1)
  const color = pickColor(post.authorId)

  return (
    <article className={styles.card}>
      <div className={styles.imgWrap}>
        {post.photoUrl ? (
          <img src={post.photoUrl} alt={post.content ?? ''} className={styles.img} loading="lazy" />
        ) : (
          <div className={styles.imgPlaceholder}>无图</div>
        )}
        <button
          type="button"
          className={`${styles.likeOverlay} ${bumped ? styles.bumped : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onLike()
          }}
          aria-label="like"
        >
          <HeartIcon filled={false} />
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.author}>
          <div className={styles.dot} style={{ background: color }}>
            {initial}
          </div>
          <span className={styles.authorName}>user-{post.authorId}</span>
        </div>

        {post.content && <p className={styles.prompt}>{post.content}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.actionBtn} onClick={onLike}>
            <HeartIcon filled={false} />
            <span>{post.likeCount}</span>
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${isSaved ? styles.saved : ''}`}
            onClick={onSave}
          >
            <BookmarkIcon filled={isSaved} />
          </button>
        </div>
      </div>
    </article>
  )
}

function pickColor(seed: number): string {
  const palette = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']
  return palette[Math.abs(seed) % palette.length] ?? palette[0]!
}
