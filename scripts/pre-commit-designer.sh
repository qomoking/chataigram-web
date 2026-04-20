#!/bin/sh
#
# 设计师角色 pre-commit hook — 拦截对基础设施/SDK 契约文件的提交
#
# 安装方法：
#   cp scripts/pre-commit-designer.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#

FORBIDDEN_PATTERNS="
src/core-stub/
docs/core-api.md
scripts/
.github/
"

FORBIDDEN_EXACT="
vite.config.ts
vitest.config.ts
eslint.config.js
"

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR)

BLOCKED=""
for file in $STAGED_FILES; do
  # 检查目录匹配
  for forbid in $FORBIDDEN_PATTERNS; do
    case "$file" in
      ${forbid}*)
        BLOCKED="$BLOCKED\n  - $file"
        break
        ;;
    esac
  done

  # 检查精确匹配
  for forbid in $FORBIDDEN_EXACT; do
    if [ "$file" = "$forbid" ]; then
      BLOCKED="$BLOCKED\n  - $file"
      break
    fi
  done

  # 检查 tsconfig
  case "$file" in
    tsconfig*)
      BLOCKED="$BLOCKED\n  - $file (TS config)"
      ;;
  esac
done

if [ -n "$BLOCKED" ]; then
  echo ""
  echo "============================================"
  echo " BLOCKED: 设计师角色越权"
  echo "============================================"
  echo ""
  echo "以下文件不在设计师的改动范围内："
  printf "$BLOCKED\n"
  echo ""
  echo "设计师只能改 UI 相关文件（pages/components/styles/hooks/CSS）。"
  echo "基础设施和 SDK 契约文件请联系工程师。"
  echo ""
  echo "如确需修改，请联系工程师或使用 --no-verify 跳过。"
  echo "============================================"
  exit 1
fi
