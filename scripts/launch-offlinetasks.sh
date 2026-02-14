#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_DIR/.launcher-logs"

mkdir -p "$LOG_DIR"

# Load nvm when available because Finder-launched scripts do not get your shell profile.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi

if [ -f "$PROJECT_DIR/.nvmrc" ] && command -v nvm >/dev/null 2>&1; then
  nvm use --silent >/dev/null 2>&1 || true
fi

cd "$PROJECT_DIR"

# Avoid zsh auto-nicing background jobs (can fail in restricted environments).
setopt NO_BG_NICE

if ! /usr/sbin/lsof -nP -iTCP:3123 -sTCP:LISTEN >/dev/null 2>&1; then
  nohup npm run api >>"$LOG_DIR/api.log" 2>&1 &
fi

nohup npm start >>"$LOG_DIR/app.log" 2>&1 &
