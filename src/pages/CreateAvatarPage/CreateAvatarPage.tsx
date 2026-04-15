import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  prefetchAnimation,
  useAvatarGenerate,
  useAvatarIterate,
  useCurrentUser,
  useUpdateAvatar,
  type AvatarGenerateStep,
  type AvatarIterateStep,
} from '@chataigram/core'
import CdnImg from '../../components/CdnImg'
import { t } from '../../utils/i18n'
import { getProfile, saveProfile } from '../../utils/profile-storage'
import './CreateAvatarPage.css'

/**
 * 创建头像页 —— 风格固定动漫化；每次生成压成一张卡堆叠，可翻前后。
 *
 * 用 core 0.0.7 的两个 SSE hook：
 *   - 确定按键 → useAvatarGenerate（后端 2 步：prompt → generate）
 *   - Continue 按键 → useAvatarIterate（后端 3 步：describe → prompt → generate）
 *
 * 卡堆：顶层是当前展示的卡，后面 2 层是更早的结果；← → 翻动。
 */

// 风格固定动漫化，不再让用户选
const FIXED_STYLE_CHIPS = ['动漫化']

type AiMsg = {
  id: string
  status: 'loading' | 'done' | 'error'
  imageUrl?: string
  error?: string
  stepLabel?: string
}

const GEN_STEP_LABEL: Record<AvatarGenerateStep, () => string> = {
  prompt: () => t('avatar.step.composing'),
  generate: () => t('avatar.step.painting'),
}
const ITER_STEP_LABEL: Record<AvatarIterateStep, () => string> = {
  describe: () => t('avatar.step.understanding'),
  prompt: () => t('avatar.step.editing'),
  generate: () => t('avatar.step.painting'),
}

let _id = 0
const uid = () => String(++_id)

export default function CreateAvatarPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: currentUser } = useCurrentUser()
  const avatarGen = useAvatarGenerate()
  const avatarIter = useAvatarIterate()
  const updateAvatar = useUpdateAvatar()
  const isPending = avatarGen.isPending || avatarIter.isPending

  const [messages, setMessages] = useState<AiMsg[]>([])
  const [inputText, setInputText] = useState('')
  // topIdx = null 表示跟随最新；用户手动翻动后变成具体 index
  const [topIdx, setTopIdx] = useState<number | null>(null)

  const effectiveTopIdx = useMemo(() => {
    if (messages.length === 0) return 0
    if (topIdx === null) return messages.length - 1
    return Math.min(Math.max(topIdx, 0), messages.length - 1)
  }, [topIdx, messages.length])

  const canSend = !isPending
  // Continue：当前展示的卡必须已出图
  const currentCard: AiMsg | undefined = messages[effectiveTopIdx]
  const canContinue = !isPending && currentCard?.status === 'done' && !!currentCard.imageUrl

  const pushLoading = useCallback((initialLabel: string): string => {
    const id = uid()
    setMessages((prev) => [
      ...prev,
      { id, status: 'loading', stepLabel: initialLabel },
    ])
    setTopIdx(null) // 新卡产生 → 跳回最新
    return id
  }, [])

  const updateStep = useCallback((msgId: string, label: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId && m.status === 'loading' ? { ...m, stepLabel: label } : m)),
    )
  }, [])

  const settle = useCallback((msgId: string, patch: Partial<AiMsg>) => {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, ...patch } : m)))
  }, [])

  const handleSend = useCallback(() => {
    if (!canSend || !currentUser) return
    const text = inputText.trim()
    const msgId = pushLoading(GEN_STEP_LABEL.prompt())
    setInputText('')

    avatarGen.mutate(
      {
        userId: currentUser.id,
        text,
        styleChips: FIXED_STYLE_CHIPS,
        onStep: (step) => updateStep(msgId, GEN_STEP_LABEL[step]()),
      },
      {
        onSuccess: ({ resultUrl }) => {
          settle(msgId, { status: 'done', imageUrl: resultUrl, stepLabel: undefined })
        },
        onError: (err) => settle(msgId, { status: 'error', error: err.message }),
      },
    )
  }, [canSend, currentUser, inputText, avatarGen, pushLoading, updateStep, settle])

  const handleContinue = useCallback(() => {
    if (!canContinue || !currentUser || !currentCard?.imageUrl) return
    const text = inputText.trim()
    const msgId = pushLoading(ITER_STEP_LABEL.describe())
    setInputText('')

    avatarIter.mutate(
      {
        userId: currentUser.id,
        prevImageUrl: currentCard.imageUrl,
        text,
        styleChips: FIXED_STYLE_CHIPS,
        onStep: (step) => updateStep(msgId, ITER_STEP_LABEL[step]()),
      },
      {
        onSuccess: ({ resultUrl }) => {
          settle(msgId, { status: 'done', imageUrl: resultUrl, stepLabel: undefined })
        },
        onError: (err) => settle(msgId, { status: 'error', error: err.message }),
      },
    )
  }, [canContinue, currentUser, inputText, avatarIter, currentCard, pushLoading, updateStep, settle])

  const handleUseAvatar = useCallback(
    async (url: string) => {
      if (!currentUser) return
      // 本地 profile 先写入，me 页面 avatarJustSet effect 会读这个立即刷新头像
      saveProfile({ ...getProfile(), avatar: url })
      try {
        // 后端 /update_avatar 写 users 表；hook 的 onSuccess 同步 useCurrentUser 缓存里的 avatarUrl
        const { animationTaskId } = await updateAvatar.mutateAsync(url)
        if (animationTaskId) void prefetchAnimation(qc, currentUser.id, animationTaskId)
      } catch {
        /* 服务端失败也跳回；本地已更新，不阻塞用户 */
      }
      navigate('/profile', { replace: true, state: { avatarJustSet: true } })
    },
    [currentUser, updateAvatar, qc, navigate],
  )

  const canPrev = effectiveTopIdx > 0
  const canNext = effectiveTopIdx < messages.length - 1

  return (
    <div className="cav-page">
      <div className="cav-header">
        <button type="button" className="cav-back" onClick={() => navigate(-1)} aria-label="back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="cav-title">{t('avatar.title')}</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="cav-body">
        {/* 卡牌堆 —— 始终 3 层：后 / 中 / 顶。实际生成的从顶层往下覆盖，其它槽位是占位卡 */}
        <div className="cav-stack">
          {(() => {
            const backMsg = messages[effectiveTopIdx - 2]
            const midMsg = messages[effectiveTopIdx - 1]
            return (
              <>
                {backMsg ? (
                  <PeekCard msg={backMsg} depth="back" />
                ) : (
                  <PlaceholderLayer depth="back" />
                )}
                {midMsg ? (
                  <PeekCard msg={midMsg} depth="mid" />
                ) : (
                  <PlaceholderLayer depth="mid" />
                )}
                <div className="cav-card">
                  {currentCard ? (
                    <CardContent
                      msg={currentCard}
                      onUseAvatar={handleUseAvatar}
                      saving={updateAvatar.isPending}
                    />
                  ) : (
                    <div className="cav-card-empty">
                      <div className="cav-card-emoji">✨</div>
                      <p>{t('avatar.emptyHint')}</p>
                    </div>
                  )}
                </div>
              </>
            )
          })()}

          {/* 翻动按键 */}
          {messages.length > 1 && (
            <div className="cav-nav">
              <button
                type="button"
                className="cav-nav-btn"
                disabled={!canPrev}
                onClick={() => setTopIdx(effectiveTopIdx - 1)}
                aria-label={t('avatar.prev')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="cav-nav-indicator">
                {effectiveTopIdx + 1} / {messages.length}
              </span>
              <button
                type="button"
                className="cav-nav-btn"
                disabled={!canNext}
                onClick={() => setTopIdx(effectiveTopIdx + 1)}
                aria-label={t('avatar.next')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* 输入区：只有 input + 确定 + Continue，不再选风格 */}
        <div className="cav-input-area">
          <input
            className="cav-text-input"
            placeholder={t('avatar.placeholder')}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
          />

          <div className="cav-action-row">
            <button
              type="button"
              className={`cav-confirm-btn${canSend ? ' active' : ''}`}
              onClick={handleSend}
              disabled={!canSend}
            >
              {t('avatar.confirm')}
            </button>
            <button
              type="button"
              className="cav-continue-btn"
              onClick={handleContinue}
              disabled={!canContinue}
            >
              {t('avatar.continue')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CardContent({
  msg,
  onUseAvatar,
  saving,
}: {
  msg: AiMsg
  onUseAvatar: (url: string) => void
  saving: boolean
}) {
  if (msg.status === 'loading') {
    return (
      <div className="cav-card-loading">
        <span className="cav-spinner" />
        <span>{msg.stepLabel ?? ''}</span>
      </div>
    )
  }
  if (msg.status === 'error') {
    return <div className="cav-card-error">⚠ {msg.error}</div>
  }
  return (
    <div className="cav-card-result">
      {msg.imageUrl && (
        <CdnImg src={msg.imageUrl} alt="" className="cav-result-img" />
      )}
      {msg.imageUrl && (
        <div className="cav-result-action">
          <button
            type="button"
            className="cav-use-btn"
            onClick={() => onUseAvatar(msg.imageUrl!)}
            disabled={saving}
          >
            {saving ? t('avatar.saving') : `✓ ${t('avatar.useAsAvatar')}`}
          </button>
        </div>
      )}
    </div>
  )
}

function PeekCard({ msg, depth }: { msg: AiMsg; depth: 'mid' | 'back' }) {
  return (
    <div className={`cav-deck-layer cav-deck-layer--${depth}`} aria-hidden="true">
      {msg.status === 'done' && msg.imageUrl && (
        <CdnImg src={msg.imageUrl} alt="" className="cav-result-img" />
      )}
    </div>
  )
}

function PlaceholderLayer({ depth }: { depth: 'mid' | 'back' }) {
  return (
    <div
      className={`cav-deck-layer cav-deck-layer--${depth} cav-deck-layer--placeholder`}
      aria-hidden="true"
    />
  )
}
