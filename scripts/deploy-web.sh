#!/usr/bin/env bash
# deploy-web.sh — Build chataigram-web locally and rsync dist/ to the server.
#
# Usage:
#   bash scripts/deploy-web.sh
#
# Assumes:
#   • pnpm installed locally
#   • SSH access configured for REMOTE_HOST (see deploy.md §2)
#   • nginx is already running on the server and serving WEB_ROOT

set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
REMOTE_USER="${REMOTE_USER:-aigram}"
REMOTE_HOST="${REMOTE_HOST:-123.57.34.146}"
REMOTE_PORT="${REMOTE_PORT:-6001}"
WEB_ROOT="${WEB_ROOT:-/var/www/aigram}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Ensure submodule is populated ────────────────────────────────────────────
echo "▶ Syncing submodule…"
git -C "$REPO_ROOT" submodule update --init --recursive

# ── Build ────────────────────────────────────────────────────────────────────
echo "▶ Installing deps…"
pnpm --dir "$REPO_ROOT" install --frozen-lockfile

echo "▶ Building…"
VITE_USE_MOCKS=false pnpm --dir "$REPO_ROOT" run build

# ── Deploy ───────────────────────────────────────────────────────────────────
echo "▶ Uploading dist/ → ${REMOTE_USER}@${REMOTE_HOST}:${WEB_ROOT}"
rsync -avz --delete \
  -e "ssh -p ${REMOTE_PORT}" \
  "${REPO_ROOT}/dist/" \
  "${REMOTE_USER}@${REMOTE_HOST}:${WEB_ROOT}/"

echo "✓ Deploy complete."
echo "  Frontend: http://${REMOTE_HOST}:1221  (or your domain)"
