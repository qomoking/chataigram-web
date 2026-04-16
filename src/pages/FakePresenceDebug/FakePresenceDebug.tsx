import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'
import CdnImg from '../../components/CdnImg'
import { FAKE_USERS, type FakeUserMeta } from '../../fakePresence/fakeUsers'

/**
 * 假人资产可视化调试页（dev 用）。
 *
 * 访问 /dev/fake-presence 一屏铺 10 个假人：
 *   - 左列：本地 src/fakePresence/lottie/*.json 的 Lottie 动画
 *   - 右列：avatarUrl 静态头像
 *   - 下方：name / archetype / taskId
 *
 * 用途：跑完 scripts/generate-fake-avatars.mjs 后，不走 PlazaPage
 * 整套合并逻辑，直接肉眼验证 10 份动画是否能播、位置对不对、图全不全。
 */

// 每个 JSON 独立 chunk（和 useFakePresence 的懒加载一致，debug 页首次进入时拉）
const lottieLoaders = import.meta.glob<object>(
  '../../fakePresence/lottie/*.json',
  { import: 'default' },
)

function loaderKey(meta: FakeUserMeta) {
  return `../../fakePresence/lottie/${meta.archetype}-${meta.gender}.json`
}

export default function FakePresenceDebug() {
  const [lotties, setLotties] = useState<Record<string, object | null>>({})

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const entries = await Promise.all(
        FAKE_USERS.map(async (meta) => {
          const loader = lottieLoaders[loaderKey(meta)]
          const id = `${meta.archetype}-${meta.gender}`
          if (!loader) return [id, null] as const
          try {
            const mod = await loader()
            return [id, mod] as const
          } catch {
            return [id, null] as const
          }
        }),
      )
      if (cancelled) return
      const next: Record<string, object | null> = {}
      for (const [id, v] of entries) next[id] = v
      setLotties(next)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      style={{
        // .page-area > * 被强制 position:absolute; inset:0，自己得开滚动
        padding: 16,
        background: '#0f0f1e',
        color: '#e6e6f0',
        fontFamily: 'system-ui, sans-serif',
        overflowY: 'auto',
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Fake Presence Debug</h1>
        <p style={{ opacity: 0.6, fontSize: 13, marginTop: 4 }}>
          左 Lottie 动画 / 右静态 avatar。看动画是否能播、位置对不对、图是否残缺。
          共 {FAKE_USERS.length} 个假人。
        </p>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 14,
        }}
      >
        {FAKE_USERS.map((meta) => {
          const id = `${meta.archetype}-${meta.gender}`
          const lottie = lotties[id]
          const lottieLoading = !(id in lotties)
          return (
            <div
              key={meta.id}
              style={{
                border: '1px solid #2a2a42',
                borderRadius: 8,
                padding: 12,
                background: '#141426',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{meta.name}</div>
                <div style={{ fontSize: 11, opacity: 0.45 }}>id {meta.id}</div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>
                {meta.archetype} · {meta.gender} · task {meta.animationTaskId.replace('fake:', '')}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <Pane label="Lottie">
                  {lottie ? (
                    <Lottie
                      animationData={lottie}
                      loop
                      autoplay
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <Placeholder text={lottieLoading ? 'loading...' : 'load failed'} />
                  )}
                </Pane>
                <Pane label="avatar">
                  {meta.avatarUrl ? (
                    <CdnImg
                      src={meta.avatarUrl}
                      alt={meta.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Placeholder text="no avatar" />
                  )}
                </Pane>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Pane({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>{label}</div>
      <div
        style={{
          aspectRatio: '1 / 1',
          background: '#1d1d32',
          borderRadius: 6,
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function Placeholder({ text }: { text: string }) {
  return <div style={{ opacity: 0.4, fontSize: 12 }}>{text}</div>
}
