# 部署指南（设计师版）

## 前置条件

- 已安装 pnpm
- 已安装 rsync（macOS 自带）

## 两步部署

### 1. 构建

```bash
pnpm build
```

构建产物在 `dist/` 目录下。确认无报错再继续。

### 2. 上传到服务器

```bash
rsync -av -P -e "ssh -p 6001" dist/* yinuser@123.57.34.146:/var/www/aigram-yin/
```

提示输入密码时输入：`yinuser123`

完成后访问线上地址确认页面正常。

---

> **安全提醒**：密码不应长期保存在文档中，后续建议配置 SSH 密钥免密登录。
