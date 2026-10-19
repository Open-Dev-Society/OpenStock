#!/bin/bash
# Restore an OpenStock transfer bundle on the receiving Mac, then install and
# verify. Run this on the OTHER Mac after moving the .tar.gz across.
#
# Usage:  ./restore-from-bundle.sh ~/Desktop/OpenStock-20261019-121029.tar.gz
set -euo pipefail

BUNDLE="${1:-}"
TARGET_PARENT="$HOME/Documents/Default Project"
TARGET="$TARGET_PARENT/OpenStock"

if [ -z "$BUNDLE" ]; then
    echo "Usage: $0 <path-to-bundle.tar.gz>" >&2
    exit 1
fi
if [ ! -f "$BUNDLE" ]; then
    echo "Bundle not found: $BUNDLE" >&2
    exit 1
fi

echo "==> Verifying the bundle"
if [ -f "${BUNDLE%.tar.gz}.sha256" ]; then
    ( cd "$(dirname "$BUNDLE")" && shasum -a 256 -c "$(basename "${BUNDLE%.tar.gz}.sha256")" ) || {
        echo "Checksum mismatch — the transfer was corrupted. Re-copy it." >&2
        exit 1
    }
else
    echo "    (no .sha256 sidecar — skipping checksum)"
fi

if [ -d "$TARGET" ]; then
    BACKUP="${TARGET}.backup-$(date +%H%M%S)"
    echo "==> Existing copy found — moving it aside to $BACKUP"
    mv "$TARGET" "$BACKUP"
    echo "    Your previous copy is kept there. Delete it once you are happy."
fi

echo "==> Extracting"
mkdir -p "$TARGET_PARENT"
tar -xzf "$BUNDLE" -C "$TARGET_PARENT"

cd "$TARGET"

echo "==> Verifying the git history arrived"
git log --oneline -3
echo "    pending commits to publish:"
git log --oneline origin/main..main 2>/dev/null | sed 's/^/      /' || echo "      (already in sync)"

echo "==> Installing dependencies (this takes a minute)"
npm install --silent

echo "==> Type check and tests"
npx tsc --noEmit && echo "    tsc: clean"
npx vitest run 2>&1 | tail -4

cat <<'EOF'

==> Done.

    Next:
      git push origin main     # publish the pending commits (needs your GitHub login)
      npm run dev             # start the dev server
EOF
