import { useState } from 'react'
import './FeedOnboarding.css'

const ONBOARDING_KEY = 'feed_onboarding_done'

const steps = [
  {
    icon: '👆',
    title: '上下滑动',
    desc: '滑动浏览不同作品',
  },
  {
    icon: '✨',
    title: '点击图片',
    desc: '点击画面中的物体，AI 会识别并推荐创意',
  },
  {
    icon: '🪄',
    title: '魔法棒',
    desc: '点右下角魔法棒，AI 为整张图推荐恶搞玩法',
  },
]

export function shouldShowFeedOnboarding(): boolean {
  return !localStorage.getItem(ONBOARDING_KEY)
}

export default function FeedOnboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, '1')
    onDone()
  }

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1)
    else finish()
  }

  const current = steps[step]!

  return (
    <div className="feed-onboarding" onPointerDown={(e) => e.stopPropagation()}>
      <div className="feed-onboarding-card">
        <div className="feed-onboarding-icon">{current.icon}</div>
        <div className="feed-onboarding-title">{current.title}</div>
        <div className="feed-onboarding-desc">{current.desc}</div>
        <div className="feed-onboarding-dots">
          {steps.map((_, i) => (
            <div key={i} className={`feed-onboarding-dot${i === step ? ' active' : ''}`} />
          ))}
        </div>
        <button type="button" className="feed-onboarding-btn" onPointerDown={next}>
          {step < steps.length - 1 ? '下一步' : '开始探索'}
        </button>
        {step < steps.length - 1 && (
          <button type="button" className="feed-onboarding-skip" onPointerDown={finish}>
            跳过
          </button>
        )}
      </div>
    </div>
  )
}
