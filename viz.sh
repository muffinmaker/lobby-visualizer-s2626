#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
git checkout cursor/menu-gestures-7b1a
git pull origin cursor/menu-gestures-7b1a
npm install
npm run dev
