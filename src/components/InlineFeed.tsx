import { useState } from 'react'
import type { Post } from '@chataigram/core'
import { useFeed, useLikePost } from '@chataigram/core'
import { useSavedPosts } from '../hooks/useSavedPosts'
import { t } from '../utils/i18n'
import { pickColor } from '../utils/color'
import CdnImg from './CdnImg'
import { HeartIcon } from './icons'
import './InlineFeed.css'

/**
 * 嵌入其他页面里的"热门" feed 缩略版。
 * 迁自 frontend/src/components/InlineFeed.jsx，数据源从 localStorage mock 切到 useFeed。
 */
export default function InlineFeed() {
  const { data } = useFeed({ limit: 20 })
  const like = useLikePost()
  const { isSaved } = useSavedPosts()
  const [expanded, setExpanded] = useState<number | null>(null)

  const posts = (data?.posts ?? [])
    .slice()
    .sort((a, b) => b.likeCount - a.likeCount)

  const handleLike = (post: Post, e: React.MouseEvent) => {
    e.stopPropagation()
    like.mutate(post.id)
  }

  if (expanded != null) {
    const post = posts.find((p) => p.id === expanded)
    if (!post) {
      setExpanded(null)
      return null
    }
    return (
      <div className="inline-feed-expanded">
        <button type="button" className="ife-back" onClick={() => setExpanded(null)}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t('feed.trending')}
        </button>
        <CdnImg src={post.photoUrl} alt={post.content ?? ''} className="ife-big-img" />
        <div className="ife-big-meta">
          <div className="ife-author">
            <div className="ife-dot" style={{ background: pickColor(post.authorId) }}>
              {String(post.authorId).slice(-1)}
            </div>
            <span>user-{post.authorId}</span>
          </div>
          {post.content && <p className="ife-big-prompt">{post.content}</p>}
          <button
            type="button"
            className={`ife-like-btn ${isSaved(post.id) ? 'liked' : ''}`}
            onClick={(e) => handleLike(post, e)}
          >
            <HeartIcon size={14} />
            <span>{post.likeCount}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="inline-feed">
      <div className="inline-feed-label">{t('feed.trending')}</div>
      <div className="inline-feed-scroll">
        {posts.map((post) => (
          <div key={post.id} className="ifc" onClick={() => setExpanded(post.id)}>
            <div className="ifc-img-wrap">
              <CdnImg
                src={post.photoUrl}
                alt={post.content ?? ''}
                className="ifc-img"
                loading="lazy"
              />
              <button
                type="button"
                className="ifc-like"
                onClick={(e) => handleLike(post, e)}
              >
                <HeartIcon size={14} />
                <span>{post.likeCount}</span>
              </button>
            </div>
            <div className="ifc-author">
              <div className="ifc-dot" style={{ background: pickColor(post.authorId) }}>
                {String(post.authorId).slice(-1)}
              </div>
              <span className="ifc-name">user-{post.authorId}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

