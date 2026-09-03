#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/${USER}/app/}"
ENV_FILE="$APP_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: missing required env file: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ENV_FILE"
set +a

REQUIRED_VARS=(WEB_ROOT MEDIA_ROOT PUBLIC_URL PORT)
MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    MISSING+=("$var")
  fi
done

if [ "${#MISSING[@]}" -gt 0 ]; then
  echo "Error: required variables missing or empty in $ENV_FILE:" >&2
  for var in "${MISSING[@]}"; do
    echo "  - $var" >&2
  done
  exit 1
fi

# Optional: set in .env during staging when nginx site-wide Basic Auth is enabled.
# Example: NGINX_BASIC_AUTH_USER=staging  NGINX_BASIC_AUTH_PASS=...
SERVICE_NAME="${USER}_app.service"
EVENTS_LOCAL="src/content/events/event-data.local.json"
EVENTS_EXAMPLE="src/content/events/event-data.example.json"
POSTS_LOCAL="src/content/posts/post-data.local.json"
POSTS_EXAMPLE="src/content/posts/post-data.example.json"
UPLOADS_DIR="public/uploads/blog"

CURL_AUTH=()
if [ -n "${NGINX_BASIC_AUTH_USER:-}" ] && [ -n "${NGINX_BASIC_AUTH_PASS:-}" ]; then
  CURL_AUTH=(-u "${NGINX_BASIC_AUTH_USER}:${NGINX_BASIC_AUTH_PASS}")
fi

echo "Updating app in $APP_DIR..."
cd "$APP_DIR"

git pull

find "$APP_DIR/bin" -maxdepth 1 -name '*.sh' -exec chmod +x {} +

if [ ! -f "$EVENTS_LOCAL" ]; then
  echo "Creating $EVENTS_LOCAL from example..."
  cp "$EVENTS_EXAMPLE" "$EVENTS_LOCAL"
fi

if [ ! -f "$POSTS_LOCAL" ]; then
  echo "Creating $POSTS_LOCAL from example..."
  cp "$POSTS_EXAMPLE" "$POSTS_LOCAL"
fi

mkdir -p "$UPLOADS_DIR"

echo "Installing dependencies..."
npm ci

echo "Building app..."
npm run build

if [ ! -f dist/server/entry.mjs ]; then
  echo "Error: build did not produce dist/server/entry.mjs"
  exit 1
fi

if [ ! -d dist/client/_astro ]; then
  echo "Error: build did not produce dist/client/_astro"
  exit 1
fi

echo "Publishing client assets to $WEB_ROOT..."
mkdir -p "$WEB_ROOT"
mkdir -p "$MEDIA_ROOT"
rsync -a --delete dist/client/ "$WEB_ROOT/"

echo "Restarting $SERVICE_NAME service..."
sudo systemctl restart "$SERVICE_NAME"

echo "Waiting for Node server..."
READY=0
for _ in $(seq 1 30); do
  HTTP_CODE="$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://127.0.0.1:${PORT}/" || echo "000")"
  if [ "$HTTP_CODE" = "200" ]; then
    READY=1
    break
  fi
  sleep 1
done

if [ "$READY" -ne 1 ]; then
  echo "Error: Node server did not become ready on http://127.0.0.1:${PORT}/"
  sudo systemctl status "$SERVICE_NAME" --no-pager || true
  exit 1
fi

echo "Verifying website is accessible..."

URLS_TO_CHECK=(
  "$PUBLIC_URL"
  "$PUBLIC_URL/impressum"
  "$PUBLIC_URL/datenschutz"
)

FAILED=0
for URL in "${URLS_TO_CHECK[@]}"; do
  echo -n "Checking $URL... "
  HTTP_CODE="$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "${CURL_AUTH[@]}" "$URL" || echo "000")"
  if [ "$HTTP_CODE" = "200" ]; then
    echo "OK"
  else
    echo "FAILED (HTTP $HTTP_CODE)"
    FAILED=1
  fi
done

if [ "$FAILED" -ne 0 ]; then
  echo "Error: one or more pages are not accessible"
  exit 1
fi

echo "Done! Website updated and all checks passed."
