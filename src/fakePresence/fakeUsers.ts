import type { PlazaUser } from '@chataigram/core'

/**
 * 撑场子假人 —— 真人在线 < FAKE_FLOOR 时，混进 plaza 让画面不空。
 *
 * id 用负数（-101 ~ -110），确保和真后端 id（自增正整数）永不冲突。
 * animationTaskId 形如 `fake:cyberpunk-m`，作为 react-query cache key 的一部分；
 * Lottie JSON 在 idle 时下载并 `setQueryData` 进 cache，PlazaPage 自然命中。
 *
 * archetype + gender 决定加载 `lottie/{archetype}-{gender}.json`。
 */
export type FakeUserMeta = {
  id: number
  name: string
  gender: 'm' | 'f'
  archetype:
    | 'cyberpunk'
    | 'victorian'
    | 'samurai'
    | 'elf'
    | 'cowboy'
    | 'astronaut'
    | 'witch'
    | 'baker'
    | 'monk'
    | 'punk'
  /** 静态头像 URL；占位阶段为 null，跑生成脚本后填 CDN URL。 */
  avatarUrl: string | null
  statusEmoji: string | null
  statusText: string | null
  /** Lottie 动画 cache key 的 taskId 片段，必须和 lottie/ 下文件名一致。 */
  animationTaskId: string
}

export const FAKE_USERS: readonly FakeUserMeta[] = [
  {
    id: -101,
    name: 'Vex',
    gender: 'm',
    archetype: 'cyberpunk',
    avatarUrl: null,
    statusEmoji: '🌃',
    statusText: 'jacked into the grid',
    animationTaskId: 'fake:cyberpunk-m',
  },
  {
    id: -102,
    name: 'Eloise',
    gender: 'f',
    archetype: 'victorian',
    avatarUrl: null,
    statusEmoji: '🌹',
    statusText: 'tea in the rose garden',
    animationTaskId: 'fake:victorian-f',
  },
  {
    id: -103,
    name: 'Renji',
    gender: 'm',
    archetype: 'samurai',
    avatarUrl: null,
    statusEmoji: '⚔️',
    statusText: 'sharpening the blade',
    animationTaskId: 'fake:samurai-m',
  },
  {
    id: -104,
    name: 'Sylva',
    gender: 'f',
    archetype: 'elf',
    avatarUrl: null,
    statusEmoji: '🍃',
    statusText: 'whispering to oaks',
    animationTaskId: 'fake:elf-f',
  },
  {
    id: -105,
    name: 'Hank',
    gender: 'm',
    archetype: 'cowboy',
    avatarUrl: null,
    statusEmoji: '🤠',
    statusText: 'sun on my back',
    animationTaskId: 'fake:cowboy-m',
  },
  {
    id: -106,
    name: 'Kade',
    gender: 'm',
    archetype: 'astronaut',
    avatarUrl: null,
    statusEmoji: '🛰️',
    statusText: 'drifting past Earth',
    animationTaskId: 'fake:astronaut-m',
  },
  {
    id: -107,
    name: 'Morrigan',
    gender: 'f',
    archetype: 'witch',
    avatarUrl: null,
    statusEmoji: '🌙',
    statusText: 'reading the stars',
    animationTaskId: 'fake:witch-f',
  },
  {
    id: -108,
    name: 'Brie',
    gender: 'f',
    archetype: 'baker',
    avatarUrl: null,
    statusEmoji: '🥐',
    statusText: 'first batch out the oven',
    animationTaskId: 'fake:baker-f',
  },
  {
    id: -109,
    name: 'Tenzin',
    gender: 'm',
    archetype: 'monk',
    avatarUrl: null,
    statusEmoji: '🪷',
    statusText: 'breathing with the wind',
    animationTaskId: 'fake:monk-m',
  },
  {
    id: -110,
    name: 'Riot',
    gender: 'f',
    archetype: 'punk',
    avatarUrl: null,
    statusEmoji: '🎸',
    statusText: 'feedback all the way up',
    animationTaskId: 'fake:punk-f',
  },
]

/** 假人 id 都 < 0；这个 helper 在多处复用（bump 守卫、merge 判定）。 */
export function isFakeUserId(id: number | null | undefined): boolean {
  return id != null && id < 0
}

/** 把 FakeUserMeta 转成 PlazaUser，posX/posY 由调用方给。 */
export function fakeMetaToPlazaUser(
  meta: FakeUserMeta,
  posX: number,
  posY: number,
): PlazaUser {
  return {
    id: meta.id,
    name: meta.name,
    avatarUrl: meta.avatarUrl,
    statusText: meta.statusText,
    statusEmoji: meta.statusEmoji,
    animationTaskId: meta.animationTaskId,
    posX,
    posY,
  }
}
