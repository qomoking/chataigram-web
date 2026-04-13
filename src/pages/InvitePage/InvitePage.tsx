import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useCurrentUser,
  useGenerateInviteCode,
  useMyInviteCodes,
} from '@chataigram/core'
import { t } from '../../utils/i18n'
import './InvitePage.css'

export default function InvitePage() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { data, isLoading } = useMyInviteCodes(user?.id ?? null)
  const generate = useGenerateInviteCode()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const codes = data?.codes ?? []
  const totalCount = data?.totalCount ?? 0
  const maxCount = data?.maxCount ?? 10
  const atLimit = totalCount >= maxCount
  const remaining = maxCount - totalCount

  const available = codes.filter((c) => !c.used)
  const used = codes.filter((c) => c.used)

  const handleGenerate = () => {
    if (!user || generate.isPending || atLimit) return
    generate.mutate(user.id)
  }

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      /* browser blocked clipboard */
    }
  }

  const handleShare = async (code: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join ChatAigram',
          text: `Use my invite code: ${code}`,
        })
      } catch {
        /* cancelled */
      }
    } else {
      await handleCopy(code)
    }
  }

  return (
    <div className="invite-page">
      <div className="invite-topbar">
        <button type="button" className="invite-back" onClick={() => navigate(-1)} aria-label="back">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="invite-topbar-title">{t('invite.title')}</span>
      </div>

      <div className="invite-scroll">
        {isLoading ? (
          <div className="invite-loading">
            <div className="invite-spinner" />
          </div>
        ) : (
          <>
            <div className="invite-gen-area">
              <div className="invite-quota">
                {t('invite.generated', { count: totalCount, max: maxCount })}
              </div>
              <button
                type="button"
                className={`invite-gen-btn ${atLimit ? 'invite-gen-btn--disabled' : ''}`}
                onClick={handleGenerate}
                disabled={generate.isPending || atLimit}
              >
                {generate.isPending ? (
                  <span className="invite-gen-spinner" />
                ) : (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
                {atLimit
                  ? t('invite.atLimit')
                  : remaining > 0
                    ? t('invite.generateRemaining', { n: remaining })
                    : t('invite.generate')}
              </button>
              {generate.isError && (
                <div className="invite-gen-error">{generate.error?.message ?? 'Failed'}</div>
              )}
            </div>

            {codes.length === 0 ? (
              <div className="invite-empty">
                <div className="invite-empty-icon">🎟️</div>
                <div className="invite-empty-text">{t('invite.empty')}</div>
                <div className="invite-empty-hint">{t('invite.emptyHint')}</div>
              </div>
            ) : (
              <>
                {available.length > 0 && (
                  <div className="invite-section">
                    <div className="invite-section-label">
                      {t('invite.available', { n: available.length })}
                    </div>
                    <div className="invite-code-list">
                      {available.map((item) => (
                        <div key={item.code} className="invite-code-card">
                          <div className="invite-code-text">{item.code}</div>
                          <div className="invite-code-actions">
                            <button
                              type="button"
                              className={`invite-copy-btn ${copiedCode === item.code ? 'invite-copy-btn--done' : ''}`}
                              onClick={() => void handleCopy(item.code)}
                            >
                              {copiedCode === item.code ? (
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                >
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              )}
                              {copiedCode === item.code ? t('invite.copied') : t('invite.copy')}
                            </button>
                            <button
                              type="button"
                              className="invite-share-btn"
                              onClick={() => void handleShare(item.code)}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              >
                                <circle cx="18" cy="5" r="3" />
                                <circle cx="6" cy="12" r="3" />
                                <circle cx="18" cy="19" r="3" />
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                              </svg>
                              {t('invite.share')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {used.length > 0 && (
                  <div className="invite-section">
                    <div className="invite-section-label">
                      {t('invite.used', { n: used.length })}
                    </div>
                    <div className="invite-code-list">
                      {used.map((item) => (
                        <div
                          key={item.code}
                          className="invite-code-card invite-code-card--used"
                        >
                          <div className="invite-code-text">{item.code}</div>
                          <div className="invite-used-info">
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            >
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            {t('invite.usedBy')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="invite-hint-box">
                  <div className="invite-hint-text">{t('invite.hint')}</div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
