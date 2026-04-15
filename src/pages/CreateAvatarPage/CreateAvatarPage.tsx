import { useCallback, useRef, useState } from 'react'
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
import './CreateAvatarPage.css'

/**
 * 创建头像页 —— 文字 + chip 描述 → 生成 → 可继续迭代。
 *
 * 用 core 0.0.7 的两个 SSE hook：
 *   - 确定按键 → useAvatarGenerate（后端 2 步：prompt → generate）
 *   - Continue 按键 → useAvatarIterate（后端 3 步：describe → prompt → generate）
 *
 * onStep 把后端推的阶段名映射成中文短语，渲染在 AI loading 气泡里。
 */

// 风格标签 —— 只传 label 给后端，由后端 LLM 解释成英文 prompt
const STYLE_PRESETS = ['3D', '动漫', '赛博', '油画', '水彩', '像素']

type Msg =
  | { id: string; role: 'user'; text: string; chips: string[] }
  | {
      id: string
      role: 'ai'
      status: 'loading' | 'done' | 'error'
      imageUrl?: string
      error?: string
      stepLabel?: string
      /** true 表示用户已经按"再改改"跳过选择，或这条是历史气泡 */
      choiceDismissed?: boolean
    }

const GEN_STEP_LABEL: Record<AvatarGenerateStep, string> = {
  prompt: '想头像…',
  generate: '画图中…',
}
const ITER_STEP_LABEL: Record<AvatarIterateStep, string> = {
  describe: '理解上一张图…',
  prompt: '想改图方案…',
  generate: '画图中…',
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

  const [messages, setMessages] = useState<Msg[]>([])
  const [inputText, setInputText] = useState('')
  const [activeChips, setActiveChips] = useState<string[]>([])
  const lastResultUrl = useRef<string | null>(null)

  const toggleChip = (label: string) => {
    setActiveChips((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    )
  }

  const canSend = (inputText.trim() || activeChips.length > 0) && !isPending
  const canContinue = !!lastResultUrl.current && !isPending

  const pushUserBubble = useCallback((text: string, chips: string[]) => {
    if (!text && chips.length === 0) return
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: 'user', text, chips },
    ])
  }, [])

  const pushAiLoading = useCallback((initialLabel: string): string => {
    const id = uid()
    setMessages((prev) => [
      ...prev,
      { id, role: 'ai', status: 'loading', stepLabel: initialLabel },
    ])
    return id
  }, [])

  const updateAiStep = useCallback((aiMsgId: string, label: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === aiMsgId && m.role === 'ai' && m.status === 'loading'
          ? { ...m, stepLabel: label }
          : m,
      ),
    )
  }, [])

  const settleAi = useCallback(
    (aiMsgId: string, patch: Partial<Extract<Msg, { role: 'ai' }>>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId && m.role === 'ai' ? { ...m, ...patch } : m)),
      )
    },
    [],
  )

  const handleSend = useCallback(() => {
    if (!canSend || !currentUser) return
    const text = inputText.trim()
    const chips = [...activeChips]
    pushUserBubble(text, chips)
    const aiMsgId = pushAiLoading(GEN_STEP_LABEL.prompt)
    setInputText('')
    setActiveChips([])

    avatarGen.mutate(
      {
        userId: currentUser.id,
        text,
        styleChips: chips,
        onStep: (step) => updateAiStep(aiMsgId, GEN_STEP_LABEL[step]),
      },
      {
        onSuccess: ({ resultUrl }) => {
          lastResultUrl.current = resultUrl
          settleAi(aiMsgId, { status: 'done', imageUrl: resultUrl, stepLabel: undefined })
        },
        onError: (err) => settleAi(aiMsgId, { status: 'error', error: err.message }),
      },
    )
  }, [
    canSend,
    currentUser,
    inputText,
    activeChips,
    avatarGen,
    pushUserBubble,
    pushAiLoading,
    updateAiStep,
    settleAi,
  ])

  const handleContinue = useCallback(() => {
    if (!canContinue || !currentUser || !lastResultUrl.current) return
    const text = inputText.trim()
    const chips = [...activeChips]
    pushUserBubble(text, chips)
    const aiMsgId = pushAiLoading(ITER_STEP_LABEL.describe)
    setInputText('')
    setActiveChips([])

    avatarIter.mutate(
      {
        userId: currentUser.id,
        prevImageUrl: lastResultUrl.current,
        text,
        styleChips: chips,
        onStep: (step) => updateAiStep(aiMsgId, ITER_STEP_LABEL[step]),
      },
      {
        onSuccess: ({ resultUrl }) => {
          lastResultUrl.current = resultUrl
          settleAi(aiMsgId, { status: 'done', imageUrl: resultUrl, stepLabel: undefined })
        },
        onError: (err) => settleAi(aiMsgId, { status: 'error', error: err.message }),
      },
    )
  }, [
    canContinue,
    currentUser,
    inputText,
    activeChips,
    avatarIter,
    pushUserBubble,
    pushAiLoading,
    updateAiStep,
    settleAi,
  ])

  const dismissChoice = useCallback((msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.role === 'ai' ? { ...m, choiceDismissed: true } : m,
      ),
    )
  }, [])

  const handleUseAvatar = useCallback(
    async (url: string) => {
      if (!currentUser) return
      try {
        const { animationTaskId } = await updateAvatar.mutateAsync(url)
        if (animationTaskId) void prefetchAnimation(qc, currentUser.id, animationTaskId)
      } catch {
        /* fallback to local-only */
      }
      navigate('/profile', { replace: true, state: { avatarJustSet: true } })
    },
    [currentUser, updateAvatar, qc, navigate],
  )

  return (
    <div className="cav-page">
      <div className="cav-header">
        <button type="button" className="cav-back" onClick={() => navigate(-1)} aria-label="back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="cav-title">创建头像</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="cav-body">
        {/* 卡牌堆 —— 只渲染最新一张 AI 卡片，后面两层是装饰幽灵 */}
        <div className="cav-stack">
          <div className="cav-deck-layer cav-deck-layer--back" aria-hidden="true" />
          <div className="cav-deck-layer cav-deck-layer--mid" aria-hidden="true" />
          <div className="cav-card">
            {(() => {
              const latest = [...messages].reverse().find((m) => m.role === 'ai') as
                | Extract<Msg, { role: 'ai' }>
                | undefined
              if (!latest) {
                return (
                  <div className="cav-card-empty">
                    <div className="cav-card-emoji">✨</div>
                    <p>描述你想要的头像风格，或选择预设</p>
                  </div>
                )
              }
              if (latest.status === 'loading') {
                return (
                  <div className="cav-card-loading">
                    <span className="cav-spinner" />
                    <span>{latest.stepLabel ?? '生成中…'}</span>
                  </div>
                )
              }
              if (latest.status === 'error') {
                return <div className="cav-card-error">⚠ {latest.error}</div>
              }
              return (
                <div className="cav-card-result">
                  {latest.imageUrl && (
                    <CdnImg src={latest.imageUrl} alt="" className="cav-result-img" />
                  )}
                  {latest.imageUrl && !latest.choiceDismissed && (
                    <div className="cav-result-choice">
                      <p className="cav-choice-hint">用这张当头像？</p>
                      <div className="cav-choice-row">
                        <button
                          type="button"
                          className="cav-choice-btn cav-choice-confirm"
                          onClick={() => void handleUseAvatar(latest.imageUrl!)}
                          disabled={updateAvatar.isPending}
                        >
                          {updateAvatar.isPending ? '保存中…' : '✓ 用这张'}
                        </button>
                        <button
                          type="button"
                          className="cav-choice-btn cav-choice-skip"
                          onClick={() => dismissChoice(latest.id)}
                        >
                          再改改
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        {/* 输入区 */}
        <div className="cav-input-area">
          <div className="cav-chips">
            {STYLE_PRESETS.map((label) => (
              <button
                key={label}
                type="button"
                className={`cav-chip${activeChips.includes(label) ? ' active' : ''}`}
                onClick={() => toggleChip(label)}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            className="cav-text-input"
            placeholder={
              lastResultUrl.current
                ? '继续迭代，或选择建议'
                : '描述你想要的头像风格…'
            }
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
              确定
            </button>
            <button
              type="button"
              className="cav-continue-btn"
              onClick={handleContinue}
              disabled={!canContinue}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
