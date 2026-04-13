/**
 * 本地 profile 存储（昵称 + 头像）。
 *
 * 和核心用户身份（登录态）不同：这是给 /profile 编辑页当暂存的 UI 偏好。
 * 实际用户资料变更应走 core，暂未实现。
 */

const PROFILE_KEY = 'omnient_profile'

export type LocalProfile = {
  name: string
  avatar: string | null
}

const DEFAULT: LocalProfile = { name: 'You', avatar: null }

export function getProfile(): LocalProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw) as Partial<LocalProfile>
    return {
      name: parsed.name ?? DEFAULT.name,
      avatar: parsed.avatar ?? null,
    }
  } catch {
    return DEFAULT
  }
}

export function saveProfile(p: LocalProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
  } catch {
    /* storage disabled */
  }
}
