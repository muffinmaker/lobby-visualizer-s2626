#!/usr/bin/env bash
# Push the current Lobby Visualizer branch. Does not merge and does not force-push.
# Usage:
#   ./push.sh                  # push HEAD if the tree is clean
#   ./push.sh "commit message" # commit pending work, then push
set -euo pipefail
cd "$(dirname "$0")"

branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" != "cursor/menu-gestures-7b1a" ]]; then
  echo "Refusing to push '$branch'. Checkout cursor/menu-gestures-7b1a first."
  exit 1
fi

echo "Branch: $branch"
git status --short

if [[ -n "$(git status --porcelain)" ]]; then
  if [[ $# -lt 1 || -z "${1:-}" ]]; then
    echo "Working tree is dirty. Re-run with a commit message: ./push.sh \"what changed\""
    exit 1
  fi
  git add -A
  git commit -m "$1"
fi

git push -u origin HEAD
echo "Pushed $(git rev-parse --short HEAD) to origin/$branch"
