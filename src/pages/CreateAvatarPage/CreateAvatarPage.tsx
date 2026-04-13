import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser, useGenerateImage } from '@chataigram/core'
import { getProfile, saveProfile } from '../../utils/profile-storage'
import './CreateAvatarPage.css'

/**
 * 头像创建页 —— 简化版。
 *
 * 原版（frontend/CreateAvatarPage.jsx 381 行）依赖这些 core 还没提供的 API：
 *   - uploadImage      /api/upload
 *   - getImgDesc       /api/imgdesc
 *   - getSuggestions   /api/suggestions
 *   - updateAvatar     /api/update_avatar
 *
 * 本简化版：
 *   - 用 useGenerateImage 文本直接生成头像
 *   - 成功后保存到本地 profile-storage（服务器端 updateAvatar 待 core 补）
 *   - 原版的 style chips / continue 迭代 / VLM 推荐都是 TODO
 *
 * TODO(core): useUploadImage / useImageDescription / useSuggestions / useUpdateAvatar
 */

const STYLE_PRESETS = [
  { label: '3D', prompt: '3D cartoon avatar, Pixar style, soft lighting' },
  { label: '动漫', prompt: 'anime style, big eyes, vibrant colors, clean line art' },
  { label: '赛博', prompt: 'cyberpunk portrait, neon glow, futuristic dark background' },
  { label: '油画', prompt: 'oil painting portrait, impressionist, rich textured strokes' },
  { label: '水彩', prompt: 'watercolor portrait, soft washes, dreamy pastel tones' },
  { label: '像素', prompt: 'pixel art avatar, 16-bit retro game character' },
]

export default function CreateAvatarPage() {
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()
  const generate = useGenerateImage()

  const [activeChips, setActiveChips] = useState<string[]>([])
  const [inputText, setInputText] = useState('')
  const [result, setResult] = useState<string | null>(null)

  const toggleChip = (label: string) => {
    setActiveChips((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    )
  }

  const handleGenerate = () => {
    if (!currentUser || generate.isPending) return
    const chipText = STYLE_PRESETS.filter((p) => activeChips.includes(p.label))
      .map((p) => p.prompt)
      .join(', ')
    const base = inputText.trim()
    const prompt = base && chipText ? `${base}, ${chipText}` : base || chipText || 'avatar portrait'

    generate.mutate(
      { prompt, userId: currentUser.id },
      { onSuccess: ({ imageUrl }) => setResult(imageUrl) },
    )
  }

  const handleUseAvatar = () => {
    if (!result) return
    const profile = getProfile()
    saveProfile({ ...profile, avatar: result })
    navigate('/profile', { replace: true, state: { avatarJustSet: true } })
  }

  return (
    <div className="cav-page">
      <div className="cav-header">
        <button type="button" className="cav-back" onClick={() => navigate(-1)} aria-label="back">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="cav-title">创建头像</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="cav-body">
        {result ? (
          <div className="cav-result-wrap">
            <img src={result} alt="avatar result" className="cav-result-img" />
            <div className="cav-result-actions">
              <button type="button" className="cav-use-btn" onClick={handleUseAvatar}>
                用作头像
              </button>
              <button
                type="button"
                className="cav-regen-btn"
                onClick={() => {
                  setResult(null)
                }}
              >
                重来
              </button>
            </div>
          </div>
        ) : (
          <>
            <textarea
              className="cav-input"
              placeholder="描述你想要的头像风格，或勾选预设"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <div className="cav-chips">
              {STYLE_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.label}
                  className={`cav-chip${activeChips.includes(preset.label) ? ' active' : ''}`}
                  onClick={() => toggleChip(preset.label)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="cav-generate-btn"
              onClick={handleGenerate}
              disabled={generate.isPending}
            >
              {generate.isPending ? '生成中…' : '生成头像'}
            </button>
            {generate.isError && (
              <div className="cav-error">{generate.error?.message ?? 'Generation failed'}</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
