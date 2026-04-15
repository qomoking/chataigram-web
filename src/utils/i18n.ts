/**
 * i18n — 语言检测 + 翻译工具
 *
 * 优先级：
 *   1. localStorage 手动覆盖 (omnient_lang)
 *   2. navigator.language (系统语言)
 *   3. 默认英文
 *
 * 用法：
 *   import { t, getLang } from '../utils/i18n'
 *   t('login.continue')            → 'Continue' | '继续'
 *   t('onboarding.fallback', { name: 'Alice' }) → 'Hello, Alice!...'
 */

type Dict = Record<string, string>

const EN: Dict = {
  // ── Login ─────────────────────────────────────────────────────────────────
  'login.tagline':        'AI Social Future',
  'login.getStarted':     'Get Started',
  'login.selectAccount':  'Choose Account',
  'login.continue':       'Continue',
  'login.or':             'or',
  'login.newUser':        'New User',
  'login.yourName':       'Your name',
  'login.creating':       'Creating…',
  'login.createAndEnter': 'Create & Enter',
  'login.password':       'Password',
  'login.login':          'Log In',
  'login.register':       'Register',
  'login.useUsername':     'Log in with username',
  'login.backToCards':     'Back to account selection',
  'login.noAccount':      "Don't have an account?",
  'login.hasAccount':     'Already have an account?',
  'login.goRegister':     'Register',
  'login.goLogin':        'Log in',
  'login.displayName':    'Display name',
  'login.username':       'Username',
  'login.usernamePlaceholder': 'Letters, numbers, underscore',
  'login.confirmPassword': 'Confirm password',
  'login.usernameAvailable': 'Available',
  'login.usernameTaken':  'Already taken',
  'login.passwordMismatch': 'Passwords do not match',
  'login.wrongPassword':  'Wrong username or password',
  'login.registering':    'Registering…',
  'login.loggingIn':      'Logging in…',
  'login.inviteCode':     'Invite Code',
  'login.inviteCodePlaceholder': 'Enter invite code to register',
  'login.more':           'More',
  'login.less':           'Less',

  // ── Create page ───────────────────────────────────────────────────────────
  'create.tagline':       'Imagine anything.',
  'create.inputPlaceholder': 'Describe your image, or paste one…',
  'create.thinking':      'Thinking…',
  'create.generating':    'Generating…',
  'create.processing':    'Processing…',
  'create.generatingImage': 'Generating image…',
  'create.generationFailed': 'Generation failed',
  'create.noHistory':     'No history yet — generate some images first!',
  'create.publish':       'Publish',
  'create.published':     'Published',
  'create.saveDraft':     'Save Draft',
  'create.saved':         'Saved',
  'create.useSuggestion': 'Use this suggestion',
  'create.history':       'History',
  'create.noSessions':    'No history yet',
  'create.blankSession':  'Empty session',
  'create.parseFailed':   'Parse failed',

  // ── Mention / friend picker ───────────────────────────────────────────────
  'create.pickFriends':     'Pick Friends',
  'create.selected':        'Selected',
  'create.searchFriends':   'Search friends…',
  'create.noFriends':       'No friends yet',
  'create.noMatchFriends':  'No matching friends',

  // ── Analysis results ──────────────────────────────────────────────────────
  'create.suggestedPrompt': "Based on your history, here's a suggested prompt:",
  'create.useThis':         'Use this',
  'create.recentThemes':    'Your recent creative themes:',

  // ── Daily proactive ───────────────────────────────────────────────────────
  'create.dailyInspiration': "Today's inspiration ✨",
  'create.tryContrast':      'Try a different vibe',

  // ── Onboarding ────────────────────────────────────────────────────────────
  'onboarding.fallback': 'Hello, {{name}}! Welcome to Omnient — start creating ✨',
  'onboarding.useAvatar':      'Use this avatar',
  'onboarding.generateAvatar': '✨ Generate a different one',
  'onboarding.skipLink':       'Skip for now',
  'onboarding.avatarUpdated':  'Avatar updated',
  'onboarding.skipped':        'Skipped',
  'onboarding.starter1':       'Cyberpunk city, neon glow at night',
  'onboarding.starter2':       'Dreamy watercolor portrait',

  // ── Feed ─────────────────────────────────────────────────────────────────
  'feed.trending':         'Trending',
  'feed.noPosts':          'No posts yet',
  'feed.noPostsHint':      'No posts yet, go create one',
  'feed.loadError':        'Load failed',
  'feed.backToOriginal':   '← Back to original',
  'feed.remixHint':        '→ Swipe right for {{n}} remixes',
  'feed.commentPlaceholder': 'Write a comment…',
  'feed.justNow':          'just now',
  'feed.minutesAgo':       '{{m}}m ago',
  'feed.hoursAgo':         '{{h}}h ago',
  'feed.daysAgo':          '{{d}}d ago',

  // ── Profile ──────────────────────────────────────────────────────────────
  'profile.switchAccount':    'Switch Account',
  'profile.published':        'Published',
  'profile.drafts':           'Drafts',
  'profile.history':          'History',
  'profile.noPublished':      'No published posts yet',
  'profile.noPublishedHint':  'Go to Create and publish your first image',
  'profile.noDrafts':         'No drafts saved',
  'profile.noDraftsHint':     'Save a draft from the Create tab',
  'profile.noHistory':        'No generation history yet',
  'profile.noHistoryHint':    'Images you generate will appear here automatically',
  'profile.publishToFeed':    'Publish to Feed',
  'profile.deleteDraft':      'Delete Draft',
  'profile.delete':           'Delete',
  'profile.deletePost':       'Delete Post',
  'profile.save':             'Save',
  'profile.inbox':            'Inbox',
  'profile.works':            'Works',
  'profile.cancel':           'Cancel',
  'profile.confirmDelete':    'Confirm Delete?',
  'inbox.loading':            'Loading...',
  'inbox.empty':              'No messages yet',

  // ── Avatar creator ────────────────────────────────────────────────────────
  'avatar.title':         'Create Avatar',
  'avatar.emptyHint':     'Describe your avatar, then tap Create',
  'avatar.placeholder':   'Describe your avatar…',
  'avatar.confirm':       'Create',
  'avatar.continue':      'Continue',
  'avatar.useAsAvatar':   'Set as avatar',
  'avatar.saving':        'Saving…',
  'avatar.prev':          'Previous',
  'avatar.next':          'Next',
  'avatar.step.composing':     'Composing prompt…',
  'avatar.step.painting':      'Painting…',
  'avatar.step.understanding': 'Understanding image…',
  'avatar.step.editing':       'Planning edits…',

  // ── Notification ─────────────────────────────────────────────────────────
  'notification.mentionedYou':  '{{name}} mentioned you',
  'notification.reply':         'Reply',
  'notification.remix':         'Remix',
  'notification.like':          'Like',
  'notification.systemCard':    '{{name}} mentioned you in a creation',
  'notification.view':          'View',

  // ── Camera flow ───────────────────────────────────────────────────────────
  'camera.loading':    'AI Ghibli-fying…',
  'camera.result':     'Result',
  'camera.publishing': 'Publishing…',
  'camera.error':      'Generation Failed',
  'camera.retake':     'Retake',
  'camera.publish':    'Publish to Feed',
  'camera.errorMsg':   'Failed: {{msg}}',
  'camera.publishFailed': 'Publish failed: {{msg}}',
  'camera.loadingOverlay': 'AI Ghibli-fying…',
  'camera.publishingOverlay': 'Publishing…',
  'camera.loadingPhase0': 'Uploading photo…',
  'camera.loadingPhase1': 'AI analyzing image…',
  'camera.loadingPhase2': 'Creating Ghibli style…',
  'camera.loadingPhase3': 'Creating…',
  'camera.noAccess':     'Camera not available',
  'camera.capture':      'Capture',
  'camera.retry':        'Retry AI',

  // ── Post caption ───────────────────────────────────────────────────────────
  'post.captionPlaceholder': 'Say something…',

  // ── Feed / ImmersiveFeed ──────────────────────────────────────────────────
  'feed.loading':      'Loading',
  'feed.noContent':    'No content yet',
  'feed.noContentHint': 'Tap + to capture and post',

  // ── Remix overlay ─────────────────────────────────────────────────────────
  'remix.listening':   'Listening…',
  'remix.thinking':    'Thinking…',
  'remix.creating':    'Creating…',
  'remix.draftTitle':  'Remix Ready',
  'remix.publishNow':  'Publish',
  'remix.saveDraft':   'Save as Draft',

  // ── Prank panel ───────────────────────────────────────────────────────────
  'prank.tappedPrefix': 'Tapped',
  'prank.tappedSuffix': 'can…',
  'prank.chaos':       'Stir It Up ↗',
  'prank.funny':       'Funny Transform ↗',
  'prank.surprise':    'Surprise Me ↗',
  'prank.chaos_desc':    'Little critters swarm in and snatch everything',
  'prank.funny_desc':    'You shrink to toy size in a giant world',
  'prank.surprise_desc': 'A huge cake drops from the sky mid-scene',

  // ── Notification extras ───────────────────────────────────────────────────
  'notification.mentionedYouHint': ' mentioned you',
  'notification.remixedYouHint':   ' remixed your post',
  'notification.reactedYouHint':   ' liked your creation',
  'notification.drawBack': 'Draw Back',
  'notification.drawBackDone': 'Done!',
  'notification.liked':    'Liked',
  'notification.drawBackFor': 'Draw back for {{name}}',
  'notification.drawingBack': ' drawing back…',
  'notification.drawBackSent': ' sent!',
  'notification.drawBackRetry': 'Retry',
  'notification.drawBackSuccess': 'Sent to {{name}}!',
  'drawback.analyzing': 'Analyzing image',
  'drawback.composing':  'Composing style',
  'drawback.rendering':  'Rendering artwork',

  // ── Feed / ImmersiveFeed image labels ─────────────────────────────────────
  'feed.original':     'Original',
  'feed.viewOriginal': 'View original',

  // ── Invite page ───────────────────────────────────────────────────────────
  'invite.title':            'Invite Codes',
  'invite.generated':        'Generated {{count}} / {{max}}',
  'invite.atLimit':          'At Limit',
  'invite.generate':         'Generate Code',
  'invite.generateRemaining': 'Generate Code ({{n}} left)',
  'invite.empty':            'No invite codes',
  'invite.emptyHint':        'Click the button above to generate',
  'invite.available':        'Available · {{n}}',
  'invite.copied':           'Copied',
  'invite.copy':             'Copy',
  'invite.share':            'Share',
  'invite.used':             'Used · {{n}}',
  'invite.usedBy':           'Used',
  'invite.hint':             'When a friend registers with your invite code, it will be marked as used',

  // ── Profile page entries ──────────────────────────────────────────────────
  'profile.me':      'Me',
  'profile.plaza':   'Plaza',
  'profile.invites': 'Invite Codes',

  // ── Unseen bubble ─────────────────────────────────────────────────────────
  'unseen.newMessages':      '{{n}} new messages',
  'unseen.newMessage':       '1 new message',
  'unseen.viewAll':          'View All',

  // ── Voice ─────────────────────────────────────────────────────────────────
  'voice.recording':         'Recording…',
  'voice.transcribing':      'Transcribing…',
  'voice.httpsRequired':     'HTTPS required for microphone',
  'voice.notSupported':      'Recording not supported, please open in system browser',
  'voice.permissionDenied':  'Microphone permission denied, please allow in settings',
  'voice.notFound':          'Microphone not found',
  'voice.notSupportedEnv':   'Microphone not supported in this environment',
  'voice.accessFailed':      'Cannot access microphone',
  'voice.noSpeech':          'No speech detected, please try again',
  'voice.transcribeFailed':  'Transcription failed, please try again',
}

const ZH: Dict = {
  // ── Login ─────────────────────────────────────────────────────────────────
  'login.tagline':        'AI未来社交',
  'login.getStarted':     'Get Started',
  'login.selectAccount':  '选择账户',
  'login.continue':       '继续',
  'login.or':             '或',
  'login.newUser':        '新建用户',
  'login.yourName':       '你的名字',
  'login.creating':       '注册中…',
  'login.createAndEnter': '创建并进入',
  'login.password':       '密码',
  'login.login':          '登录',
  'login.register':       '注册',
  'login.useUsername':     '使用用户名登录',
  'login.backToCards':     '← 返回选择账号',
  'login.noAccount':      '还没有账号？',
  'login.hasAccount':     '已有账号？',
  'login.goRegister':     '去注册',
  'login.goLogin':        '去登录',
  'login.displayName':    '昵称',
  'login.username':       '用户名',
  'login.usernamePlaceholder': '字母、数字、下划线',
  'login.confirmPassword': '确认密码',
  'login.usernameAvailable': '可以使用',
  'login.usernameTaken':  '已被占用',
  'login.passwordMismatch': '两次密码不一致',
  'login.wrongPassword':  '用户名或密码错误',
  'login.registering':    '注册中…',
  'login.loggingIn':      '登录中…',
  'login.inviteCode':     '邀请码',
  'login.inviteCodePlaceholder': '输入邀请码注册账号',
  'login.more':           '更多',
  'login.less':           '收起',

  // ── Create page ───────────────────────────────────────────────────────────
  'create.tagline':       '智能社交，未来无限',
  'create.inputPlaceholder': '描述你想要的图片，或粘贴一张…',
  'create.thinking':      '思考中…',
  'create.generating':    'Generating…',
  'create.processing':    '处理中…',
  'create.generatingImage': '生成图片中…',
  'create.generationFailed': '生成失败',
  'create.noHistory':     '暂无历史记录，先生几张图再来问我吧～',
  'create.publish':       '发布',
  'create.published':     '已发布',
  'create.saveDraft':     '存草稿',
  'create.saved':         '已保存',
  'create.useSuggestion': '使用此建议',
  'create.history':       '历史记录',
  'create.noSessions':    '暂无历史记录',
  'create.blankSession':  '空白会话',
  'create.parseFailed':   '解析失败',

  // ── Mention / friend picker ───────────────────────────────────────────────
  'create.pickFriends':     '选好友',
  'create.selected':        '已选',
  'create.searchFriends':   '搜索好友…',
  'create.noFriends':       '暂无好友数据',
  'create.noMatchFriends':  '没有匹配的好友',

  // ── Analysis results ──────────────────────────────────────────────────────
  'create.suggestedPrompt': '根据你的历史，推荐这条 Prompt：',
  'create.useThis':         '用这个',
  'create.recentThemes':    '你最近的创作热点：',

  // ── Daily proactive ───────────────────────────────────────────────────────
  'create.dailyInspiration': '今日灵感 ✨',
  'create.tryContrast':      '换个风格试试',

  // ── Onboarding ────────────────────────────────────────────────────────────
  'onboarding.fallback': '你好，{{name}}！欢迎来到 Omnient，开始你的 AI 创作之旅吧 ✨',
  'onboarding.useAvatar':      '使用这个头像',
  'onboarding.generateAvatar': '✨ 换一张',
  'onboarding.skipLink':       '暂时跳过',
  'onboarding.avatarUpdated':  '头像已更新',
  'onboarding.skipped':        '已跳过',
  'onboarding.starter1':       '赛博朋克城市，霓虹夜景',
  'onboarding.starter2':       '梦幻水彩人像插画',

  // ── Feed ─────────────────────────────────────────────────────────────────
  'feed.trending':         '热门',
  'feed.noPosts':          '暂无帖子',
  'feed.noPostsHint':      '暂无帖子，去创建一个吧',
  'feed.loadError':        '加载失败',
  'feed.backToOriginal':   '← 回到原帖',
  'feed.remixHint':        '→ 右滑看 {{n}} 条 remix',
  'feed.commentPlaceholder': '写条评论…',
  'feed.justNow':          '刚刚',
  'feed.minutesAgo':       '{{m}}分钟前',
  'feed.hoursAgo':         '{{h}}小时前',
  'feed.daysAgo':          '{{d}}天前',

  // ── Profile ──────────────────────────────────────────────────────────────
  'profile.switchAccount':    '切换账户',
  'profile.published':        '已发布',
  'profile.drafts':           '草稿',
  'profile.history':          '历史',
  'profile.noPublished':      '暂无发布的帖子',
  'profile.noPublishedHint':  '去创作页发布你的第一张图吧',
  'profile.noDrafts':         '暂无草稿',
  'profile.noDraftsHint':     '在创作页保存草稿',
  'profile.noHistory':        '暂无生成历史',
  'profile.noHistoryHint':    '你生成的图片会自动出现在这里',
  'profile.publishToFeed':    '发布到广场',
  'profile.deleteDraft':      '删除草稿',
  'profile.delete':           '删除',
  'profile.deletePost':       '删除帖子',
  'profile.save':             '保存',
  'profile.inbox':            '消息箱',
  'profile.works':            '作品',
  'profile.cancel':           '取消',
  'profile.confirmDelete':    '确认删除？',
  'inbox.loading':            '加载中...',
  'inbox.empty':              '暂无消息',

  // ── Avatar creator ────────────────────────────────────────────────────────
  'avatar.title':         '创建头像',
  'avatar.emptyHint':     '描述你想要的头像，按「确定」开始生成',
  'avatar.placeholder':   '描述你想要的头像…',
  'avatar.confirm':       '确定',
  'avatar.continue':      'Continue',
  'avatar.useAsAvatar':   '设为我的头像',
  'avatar.saving':        '保存中…',
  'avatar.prev':          '上一张',
  'avatar.next':          '下一张',
  'avatar.step.composing':     '构思提示词…',
  'avatar.step.painting':      '绘制中…',
  'avatar.step.understanding': '理解上一张图…',
  'avatar.step.editing':       '构思修改方案…',

  // ── Notification ─────────────────────────────────────────────────────────
  'notification.mentionedYou':  '{{name}} 提到了你',
  'notification.reply':         '回复',
  'notification.remix':         '二创',
  'notification.like':          '喜欢',
  'notification.systemCard':    '{{name}} 在创作中提到了你',
  'notification.view':          '查看',

  // ── Camera flow ───────────────────────────────────────────────────────────
  'camera.loading':    'AI 吉卜力化中…',
  'camera.result':     '生成结果',
  'camera.publishing': '发布中…',
  'camera.error':      '生成失败',
  'camera.retake':     '重拍',
  'camera.publish':    '发布到流',
  'camera.errorMsg':   '生成失败：{{msg}}',
  'camera.publishFailed': '发布失败：{{msg}}',
  'camera.loadingOverlay': 'AI 吉卜力化中…',
  'camera.publishingOverlay': '发布中…',
  'camera.loadingPhase0': '上传照片中…',
  'camera.loadingPhase1': 'AI 正在理解画面…',
  'camera.loadingPhase2': '构思吉卜力风格…',
  'camera.loadingPhase3': '正在创作…',
  'camera.noAccess':     '无法访问相机',
  'camera.capture':      '拍摄',
  'camera.retry':        '重新生成',

  // ── Post caption ───────────────────────────────────────────────────────────
  'post.captionPlaceholder': '说点什么…',

  // ── Feed / ImmersiveFeed ──────────────────────────────────────────────────
  'feed.loading':      '加载中',
  'feed.noContent':    '暂无内容',
  'feed.noContentHint': '点击底部 + 拍照发布',

  // ── Remix overlay ─────────────────────────────────────────────────────────
  'remix.listening':   '聆听中…',
  'remix.thinking':    '构思中…',
  'remix.creating':    '创作中…',
  'remix.draftTitle':  'Remix 已就绪',
  'remix.publishNow':  '发布',
  'remix.saveDraft':   '存草稿',

  // ── Prank panel ───────────────────────────────────────────────────────────
  'prank.tappedPrefix': '点击的',
  'prank.tappedSuffix': '可以…',
  'prank.chaos':       '捣乱一下 ↗',
  'prank.funny':       '搞怪变换 ↗',
  'prank.surprise':    '意外惊喜 ↗',
  'prank.chaos_desc':    '小动物突然闯入，抢走主角手中的东西',
  'prank.funny_desc':    '主角变成玩偶大小，周围一切变得巨大',
  'prank.surprise_desc': '天空掉下一个巨大蛋糕，砸在正中央',

  // ── Notification extras ───────────────────────────────────────────────────
  'notification.mentionedYouHint': ' 提到了你',
  'notification.remixedYouHint':   ' remix 了你的作品',
  'notification.reactedYouHint':   ' 喜欢了你的创作',
  'notification.drawBack': '画回去',
  'notification.drawBackDone': '完成！',
  'notification.liked':    '已喜欢',
  'notification.drawBackFor': '画回去给 {{name}}',
  'notification.drawingBack': ' 正在画回去…',
  'notification.drawBackSent': ' 已发送！',
  'notification.drawBackRetry': '重试',
  'notification.drawBackSuccess': '已画回去给 {{name}}！',
  'drawback.analyzing': '分析画面',
  'drawback.composing':  '构图中',
  'drawback.rendering':  '渲染中',

  // ── Feed / ImmersiveFeed image labels ─────────────────────────────────────
  'feed.original':     '原图',
  'feed.viewOriginal': '查看原图',

  // ── Invite page ───────────────────────────────────────────────────────────
  'invite.title':            '邀请码',
  'invite.generated':        '已生成 {{count}} / {{max}}',
  'invite.atLimit':          '已达上限',
  'invite.generate':         '生成邀请码',
  'invite.generateRemaining': '生成邀请码（剩余 {{n}} 次）',
  'invite.empty':            '暂无邀请码',
  'invite.emptyHint':        '点击上方按钮生成邀请码',
  'invite.available':        '可用 · {{n}} 个',
  'invite.copied':           '已复制',
  'invite.copy':             '复制',
  'invite.share':            '分享',
  'invite.used':             '已使用 · {{n}} 个',
  'invite.usedBy':           '已被使用',
  'invite.hint':             '每位好友用你的邀请码注册，你的码将标记为已使用',

  // ── Profile page entries ──────────────────────────────────────────────────
  'profile.me':      'Me',
  'profile.plaza':   'Plaza',
  'profile.invites': '邀请码',

  // ── Unseen bubble ─────────────────────────────────────────────────────────
  'unseen.newMessages':      '{{n}} 条新消息',
  'unseen.newMessage':       '1 条新消息',
  'unseen.viewAll':          '查看全部',

  // ── Voice ─────────────────────────────────────────────────────────────────
  'voice.recording':         '录音中…',
  'voice.transcribing':      '识别中…',
  'voice.httpsRequired':     '需要 HTTPS 才能使用麦克风',
  'voice.notSupported':      '当前浏览器不支持录音，请用系统浏览器打开',
  'voice.permissionDenied':  '麦克风权限被拒绝，请在设置中允许',
  'voice.notFound':          '未找到麦克风设备',
  'voice.notSupportedEnv':   '当前环境不支持麦克风',
  'voice.accessFailed':      '无法访问麦克风',
  'voice.noSpeech':          '未识别到语音，请重试',
  'voice.transcribeFailed':  '识别失败，请重试',
}

export type Lang = 'en' | 'zh'

const LOCALES: Record<Lang, Dict> = { en: EN, zh: ZH }

/** Detect language: zh* → 'zh', everything else → 'en' */
export function getLang(): Lang {
  try {
    const override = localStorage.getItem('omnient_lang')
    if (override === 'zh' || override === 'en') return override
  } catch {
    /* storage disabled */
  }
  return navigator.language?.startsWith('zh') ? 'zh' : 'en'
}

export type TVars = Record<string, string | number>

/** Translate a key, with optional variable substitution. */
export function t(key: string, vars?: TVars): string {
  const lang = getLang()
  const locale = LOCALES[lang] ?? EN
  let str: string = locale[key] ?? EN[key] ?? key
  if (vars) {
    str = str.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ''))
  }
  return str
}

export type NotifContent = {
  liveText?: string
  liveTextEn?: string
  previewText?: string
  previewTextEn?: string
  [key: string]: unknown
}

/**
 * Pick the right liveText / previewText from a notification content object.
 * Backend stores both ZH and EN variants; this selects the correct one.
 */
export function localizeNotifContent(
  content: NotifContent | null | undefined,
): NotifContent {
  if (!content) return {}
  const lang = getLang()
  const isEn = lang === 'en'
  return {
    ...content,
    liveText: isEn && content.liveTextEn ? content.liveTextEn : content.liveText,
    previewText:
      isEn && content.previewTextEn ? content.previewTextEn : content.previewText,
  }
}
