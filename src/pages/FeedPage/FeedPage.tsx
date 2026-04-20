import { useState } from 'react'
import { useFeedViewModel } from '@chataigram/core'
import type { FeedCardVM } from '@chataigram/core'
import { useSavedPosts } from '../../hooks/useSavedPosts'
import { HeartIcon, BookmarkIcon } from '../../components/icons'
import CdnImg from '../../components/CdnImg'
import styles from './FeedPage.module.css'

/**
 * Feed 页 —— 公开 feed 流，masonry 布局 + 点赞 + 收藏 + Lightbox。
 */
export default function FeedPage() {
  const { items, isLoading, error, like } = useFeedViewModel({ limit: 20 })
  const { isSaved, toggle: toggleSave } = useSavedPosts()
  const [bumpId, setBumpId] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<FeedCardVM | null>(null)

  const handleLike = (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setBumpId(postId)
    setTimeout(() => setBumpId(null), 300)
    like(postId)
  }

  const handleSave = (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    toggleSave(postId)
  }

  const col1 = items.filter((_, i) => i % 2 === 0)
  const col2 = items.filter((_, i) => i % 2 === 1)

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <span className={styles.logo}>ChatAigram</span>
      </header>

      {isLoading && <div className={styles.empty}>Loading…</div>}

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>✦</div>
          <p>暂无帖子</p>
        </div>
      )}

      {items.length > 0 && (
        <div className={styles.masonry}>
          <div className={styles.col}>
            {col1.map((p) => (
              <Card
                key={p.id}
                vm={p}
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
                vm={p}
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
          vm={lightbox}
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
  vm: FeedCardVM
  bumped: boolean
  isSaved: boolean
  onLike: (e: React.MouseEvent) => void
  onSave: (e: React.MouseEvent) => void
  onOpen: () => void
}

function Card({ vm, bumped, isSaved, onLike, onSave, onOpen }: CardProps) {
  return (
    <article className={styles.card} onClick={onOpen}>
      <div className={styles.imgWrap}>
        {vm.photoUrl ? (
          <CdnImg
            src={vm.photoUrl}
            alt={vm.content ?? ''}
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
          <div className={styles.dot} style={{ background: pickColor(vm.authorId) }}>
            {vm.authorInitial}
          </div>
          <span className={styles.authorName}>{vm.authorLabel}</span>
        </div>

        {vm.content && <p className={styles.prompt}>{vm.content}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.actionBtn} onClick={onLike}>
            <HeartIcon filled={false} />
            <span>{vm.likeCount}</span>
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
  vm: FeedCardVM
  isSaved: boolean
  onLike: () => void
  onSave: () => void
  onClose: () => void
}

function Lightbox({ vm, isSaved, onLike, onSave, onClose }: LightboxProps) {
  // 下滑关闭
  const startY = { current: 0 as number }
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
          <div className={styles.dot} style={{ background: pickColor(vm.authorId) }}>
            {vm.authorInitial}
          </div>
          <span>{vm.authorLabel}</span>
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
        {vm.photoUrl ? (
          <CdnImg src={vm.photoUrl} alt={vm.content ?? ''} className={styles.lbImg} />
        ) : (
          <div className={styles.imgPlaceholder}>无图</div>
        )}
      </div>

      {vm.content && (
        <div className={styles.lbPrompt} onClick={(e) => e.stopPropagation()}>
          {vm.content}
        </div>
      )}

      <div className={styles.lbActions} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.lbActionBtn} onClick={onLike} aria-label="like">
          <HeartIcon size={20} />
          <span>{vm.likeCount}</span>
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

function pickColor(seed: number): string {
  const palette = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']
  return palette[Math.abs(seed) % palette.length] ?? palette[0]!
}
