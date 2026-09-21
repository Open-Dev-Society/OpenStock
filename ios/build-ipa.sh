#!/usr/bin/env bash
# Generate Xcode project, build unsigned native Markets.app, wrap as IPA.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Prefer explicit env, then repo .env (gitignored), then already-baked Info.plist
if [[ -z "${FINNHUB_API_KEY:-}" && -f "${ROOT}/../.env" ]]; then
  FINNHUB_API_KEY="$(python3 - <<'PY'
from pathlib import Path
for line in Path("../.env").read_text().splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, _, v = line.partition("=")
    if k.strip() in {"FINNHUB_API_KEY", "NEXT_PUBLIC_FINNHUB_API_KEY"}:
        print(v.strip().strip('"').strip("'"))
        break
PY
)"
  export FINNHUB_API_KEY
fi

if [[ -z "${FINNHUB_API_KEY:-}" ]]; then
  FINNHUB_API_KEY="$(python3 - <<'PY'
import plistlib
from pathlib import Path
data = plistlib.loads(Path("Markets/Info.plist").read_bytes())
print((data.get("FinnhubAPIKey") or "").strip())
PY
)"
  export FINNHUB_API_KEY
fi

API_KEY="${FINNHUB_API_KEY:-}"
VERSION="${MARKETS_VERSION:-1.0.0}"
BUILD_NUMBER="${MARKETS_BUILD_NUMBER:-1}"
DERIVED="${ROOT}/build"
ARCHIVE_PATH="${DERIVED}/Markets.xcarchive"
IPA_OUT="${ROOT}/dist/Markets.ipa"

if [[ -z "${API_KEY}" ]]; then
  echo "ERROR: FINNHUB_API_KEY is empty. Set it, add it to ../.env, or bake it into Markets/Info.plist" >&2
  exit 1
fi

echo "Markets native iOS"
echo "Version ${VERSION} (${BUILD_NUMBER})"
echo "Finnhub API key: baked (${#API_KEY} chars)"

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "Installing XcodeGen…"
  brew install xcodegen
fi

# Inject Finnhub key into Info.plist before generate/build
FINNHUB_API_KEY="${API_KEY}" python3 - <<'PY'
import os
import plistlib
from pathlib import Path

path = Path("Markets/Info.plist")
key = os.environ.get("FINNHUB_API_KEY", "")
with path.open("rb") as f:
    data = plistlib.load(f)
data["FinnhubAPIKey"] = key
# Remove legacy web-shell key if present
data.pop("MarketsServerURL", None)
with path.open("wb") as f:
    plistlib.dump(data, f, sort_keys=False)
print("FinnhubAPIKey injected:", "yes" if key else "no")
PY

xcodegen generate

mkdir -p "${DERIVED}" "$(dirname "${IPA_OUT}")"

xcodebuild \
  -project Markets.xcodeproj \
  -scheme Markets \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -archivePath "${ARCHIVE_PATH}" \
  MARKETING_VERSION="${VERSION}" \
  CURRENT_PROJECT_VERSION="${BUILD_NUMBER}" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  DEVELOPMENT_TEAM="" \
  archive

APP_PATH="${ARCHIVE_PATH}/Products/Applications/Markets.app"
if [[ ! -d "${APP_PATH}" ]]; then
  echo "Missing app bundle at ${APP_PATH}" >&2
  exit 1
fi

STAGE="${DERIVED}/ipa-stage"
rm -rf "${STAGE}"
mkdir -p "${STAGE}/Payload"
cp -R "${APP_PATH}" "${STAGE}/Payload/"
(
  cd "${STAGE}"
  /usr/bin/zip -qry "${IPA_OUT}" Payload
)

echo "IPA → ${IPA_OUT}"
ls -lh "${IPA_OUT}"
