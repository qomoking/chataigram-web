import { useRef, useState } from 'react'
import { useFeed, useLikePost } from '@chataigram/core'
import type { Post } from '@chataigram/core'
import { useSavedPosts } from '../../hooks/useSavedPosts'
import { HeartIcon, BookmarkIcon } from '../../components/icons'
import CdnImg from '../../components/CdnImg'
import { FeedSkeleton } from '../../components/Skeleton'
import { pickColor } from '../../utils/color'
import styles from './FeedPage.module.css'

export default function FeedPage() {
  const { data, isLoading, error } = useFeed({ limit: 20 })
  const like = useLikePost()
  const { isSaved, toggle: toggleSave } = useSavedPosts()
  const [bumpId, setBumpId] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<Post | null>(null)

  const handleLike = (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setBumpId(postId)
    setTimeout(() => setBumpId(null), 300)
    like.mutate(postId)
  }

  const handleSave = (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    toggleSave(postId)
  }

  const posts = data?.posts ?? []
  const col1 = posts.filter((_, i) => i % 2 === 0)
  const col2 = posts.filter((_, i) => i % 2 === 1)

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <span className={styles.logo}>ChatAigram</span>
      </header>

      {isLoading && <FeedSkeleton />}

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
                onLike={(e) => handleLike(p.id, e)}
                onSave={(e) => handleSave(p.id, e)}
                onOpen={() => setLightbox(p)}
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
                onLike={(e) => handleLike(p.id, e)}
                onSave={(e) => handleSave(p.id, e)}
                onOpen={() => setLightbox(p)}
              />
            ))}
          </div>
        </div>
      )}

      {lightbox && (
        <Lightbox
          post={lightbox}
          isSaved={isSaved(lightbox.id)}
          onLike={() => handleLike(lightbox.id)}
          onSave={() => handleSave(lightbox.id)}
          onClose={() => setLightbox(null)}
        />
      )}

    </main>
  )
}

// ── Card ────────────────────────────────────────────────

type CardProps = {
  post: Post
  bumped: boolean
  isSaved: boolean
  onLike: (e: React.MouseEvent) => void
  onSave: (e: React.MouseEvent) => void
  onOpen: () => void
}

function Card({ post, bumped, isSaved, onLike, onSave, onOpen }: CardProps) {
  const initial = String(post.authorId).slice(-1)
  const color = pickColor(post.authorId)

  return (
    <article className={styles.card} onClick={onOpen}>
      <div className={styles.imgWrap}>
        {post.photoUrl ? (
          <CdnImg
            src={post.photoUrl}
            alt={post.content ?? ''}
            className={styles.img}
            loading="lazy"
          />
        ) : (
          <div className={styles.imgPlaceholder}>无图</div>
        )}
        <button
          type="button"
          className={`${styles.likeOverlay} ${bumped ? styles.bumped : ''}`}
          onClick={onLike}
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

// ── Lightbox ────────────────────────────────────────────

type LightboxProps = {
  post: Post
  isSaved: boolean
  onLike: () => void
  onSave: () => void
  onClose: () => void
}

function Lightbox({ post, isSaved, onLike, onSave, onClose }: LightboxProps) {
  const startY = useRef(0)
  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0]?.clientY ?? 0
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const end = e.changedTouches[0]?.clientY ?? 0
    if (end - startY.current > 60) onClose()
  }

  return (
    <div className={styles.lightbox} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className={styles.lbHeader}>
        <div className={styles.lbAuthor}>
          <div className={styles.dot} style={{ background: pickColor(post.authorId) }}>
            {String(post.authorId).slice(-1)}
          </div>
          <span>user-{post.authorId}</span>
        </div>
        <button
          type="button"
          className={styles.lbClose}
          onClick={onClose}
          aria-label="close"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className={styles.lbImgWrap} onClick={(e) => e.stopPropagation()}>
        {post.photoUrl ? (
          <CdnImg src={post.photoUrl} alt={post.content ?? ''} className={styles.lbImg} />
        ) : (
          <div className={styles.imgPlaceholder}>无图</div>
        )}
      </div>

      {post.content && (
        <div className={styles.lbPrompt} onClick={(e) => e.stopPropagation()}>
          {post.content}
        </div>
      )}

      <div className={styles.lbActions} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.lbActionBtn} onClick={onLike} aria-label="like">
          <HeartIcon size={20} />
          <span>{post.likeCount}</span>
        </button>
        <button
          type="button"
          className={`${styles.lbActionBtn} ${isSaved ? styles.saved : ''}`}
          onClick={onSave}
          aria-label="save"
        >
          <BookmarkIcon size={18} filled={isSaved} />
        </button>
      </div>
    </div>
  )
}
