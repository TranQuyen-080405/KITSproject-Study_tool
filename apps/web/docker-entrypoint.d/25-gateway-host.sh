#!/bin/sh
# Always rebuild the proxy config from API_GATEWAY_URL.
# A stale API_GATEWAY_HOST (the old demo default) makes Render return an HTML page,
# and the login form then shows a generic failure.
PORT="${PORT:-80}"
if [ -n "${API_GATEWAY_URL:-}" ]; then
  API_GATEWAY_URL=$(printf '%s' "$API_GATEWAY_URL" | sed -e 's#^\([a-zA-Z][a-zA-Z0-9+.-]*://[^/]*\).*#\1#' -e 's#/*$##')
  API_GATEWAY_HOST=$(printf '%s' "$API_GATEWAY_URL" | sed -e 's#^[a-zA-Z][a-zA-Z0-9+.-]*://##' -e 's#:.*##')
else
  API_GATEWAY_URL="http://127.0.0.1:9"
  API_GATEWAY_HOST="127.0.0.1"
fi
export PORT API_GATEWAY_URL API_GATEWAY_HOST
envsubst '${PORT} ${API_GATEWAY_URL} ${API_GATEWAY_HOST}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf
