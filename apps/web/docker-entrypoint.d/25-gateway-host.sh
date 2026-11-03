#!/bin/sh
if [ -z "${API_GATEWAY_HOST:-}" ] && [ -n "${API_GATEWAY_URL:-}" ]; then
  API_GATEWAY_HOST=$(printf '%s' "$API_GATEWAY_URL" | sed -e 's#^[a-zA-Z][a-zA-Z0-9+.-]*://##' -e 's#/.*##' -e 's#:.*##')
  export API_GATEWAY_HOST
  export PORT
  envsubst '${PORT} ${API_GATEWAY_URL} ${API_GATEWAY_HOST}' \
    < /etc/nginx/templates/default.conf.template \
    > /etc/nginx/conf.d/default.conf
fi
