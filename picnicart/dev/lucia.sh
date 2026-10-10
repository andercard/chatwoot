#!/usr/bin/env bash
# Local session: local Chatwoot <-> n8n STAGING <-> WhatsApp test number.
# Never touches production services.
#
#   picnicart/dev/lucia.sh up        # start everything (idempotent)
#   picnicart/dev/lucia.sh status    # show the state of every piece
#   picnicart/dev/lucia.sh down      # give the test number back to staging, close tunnels
#   picnicart/dev/lucia.sh down --stop-docker
#
# Options: --dir <path> (Chatwoot checkout to run; default: git toplevel of the current dir)
#          --switch     (stop another running Chatwoot compose project instead of failing)
#
# One-time setup and troubleshooting: picnicart/docs/05-lucia-local.md
set -uo pipefail

# Private values live OUTSIDE the repo (never commit them): see picnicart/dev/env.example
PICNIC_ENV="${PICNIC_ENV:-$HOME/.config/picnicart/env}"
[ -f "$PICNIC_ENV" ] || { echo "✗ missing $PICNIC_ENV — copy picnicart/dev/env.example there and fill it in"; exit 1; }
# shellcheck disable=SC1090
set -a; . "$PICNIC_ENV"; set +a
for v in PICNIC_SERVER_SSH PICNIC_N8N_STAGING_URL PICNIC_N8N_STAGING_PORT PICNIC_N8N_LOCAL_WEBHOOK_PATH PICNIC_WA_PHONE PICNIC_WA_PHONE_ID PICNIC_KEYCHAIN_SERVICE PICNIC_LOCAL_ACCOUNT_NAME; do
  [ -n "${!v:-}" ] || { echo "✗ $v is empty in $PICNIC_ENV"; exit 1; }
done

SERVER="$PICNIC_SERVER_SSH"
N8N_LOCAL_PORT="$PICNIC_N8N_STAGING_PORT"   # n8n staging is published on 127.0.0.1:<port> on the server
N8N_PUBLIC="$PICNIC_N8N_STAGING_URL"
N8N_WEBHOOK_PATH="$PICNIC_N8N_LOCAL_WEBHOOK_PATH"
WA_PHONE="$PICNIC_WA_PHONE"
WA_PHONE_ID="$PICNIC_WA_PHONE_ID"
GRAPH="https://graph.facebook.com/v24.0"
KEYCHAIN_SERVICE="$PICNIC_KEYCHAIN_SERVICE"
LOCAL_ACCOUNT="$PICNIC_LOCAL_ACCOUNT_NAME"
LOCAL_PORT=3005
WEBHOOK_EVENTS='conversation_created conversation_status_changed conversation_updated message_created message_updated contact_updated'

CMD="${1:-status}"; shift || true
DIR=""; SWITCH=0; STOP_DOCKER=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dir) DIR="$2"; shift 2 ;;
    --switch) SWITCH=1; shift ;;
    --stop-docker) STOP_DOCKER=1; shift ;;
    *) echo "unknown option $1"; exit 2 ;;
  esac
done
DIR="${DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$DIR" || exit 1
[ -f docker-compose.yaml ] || { echo "✗ $DIR is not a Chatwoot checkout"; exit 1; }
PROJECT="$(basename "$DIR")"

ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*"; }
step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
rails_run() { docker compose exec -T rails bundle exec rails runner "$1" 2>/dev/null | grep -v -e 'warning' -e 'called from' -e 'DEPRECATION' | tail -1; }

funnel_host() { tailscale status --json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))' 2>/dev/null; }
public_url() { local h; h="$(funnel_host)"; [ -n "$h" ] && echo "https://$h"; }
http_code() { curl -s -o /dev/null -m "${2:-10}" -w '%{http_code}' "$1"; }
tunnel_pid() { pgrep -f "ssh .*-L ${N8N_LOCAL_PORT}:127.0.0.1:${N8N_LOCAL_PORT} ${SERVER}" | head -1; }
wa_token() { security find-generic-password -s "$KEYCHAIN_SERVICE" -w 2>/dev/null; }
env_value() { grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2-; }

check_other_projects() {
  local others
  others="$(docker compose ls --format json 2>/dev/null | python3 -c "import json,sys; print(' '.join(p['Name'] for p in json.load(sys.stdin) if p['Name']!='$PROJECT' and 'running' in p['Status']))" 2>/dev/null)"
  for p in $others; do
    if docker ps --filter "label=com.docker.compose.project=$p" --format '{{.Ports}}' | grep -q ":${LOCAL_PORT}->"; then
      if [ "$SWITCH" = 1 ]; then docker compose -p "$p" stop >/dev/null && ok "stopped other environment '$p'"
      else fail "environment '$p' is using port ${LOCAL_PORT}; re-run with --switch to stop it"; exit 1; fi
    fi
  done
}

ensure_docker() {
  step "1. Chatwoot local ($PROJECT)"
  docker info >/dev/null 2>&1 || { fail "Docker is not running — open Docker Desktop and retry"; exit 1; }
  [ -f .env ] && [ -f docker-compose.override.yml ] || { fail "missing .env or docker-compose.override.yml (see docs 01, 'Primera vez')"; exit 1; }
  check_other_projects
  docker compose up -d >/dev/null 2>&1 || { fail "docker compose up failed: docker compose logs"; exit 1; }
  printf '    waiting for http://localhost:%s ' "$LOCAL_PORT"
  for _ in $(seq 1 90); do [ "$(http_code "http://localhost:${LOCAL_PORT}/api" 20)" = 200 ] && break; printf '.'; sleep 3; done; echo
  [ "$(http_code "http://localhost:${LOCAL_PORT}/api" 20)" = 200 ] && ok "app up on http://localhost:${LOCAL_PORT}" || { fail "app not responding (docker compose logs rails vite)"; exit 1; }
}

ensure_local_data() {
  step "2. Local account, admin password and webhook to n8n"
  local pw; pw="$(env_value LOCAL_ADMIN_PASSWORD)"
  if [ -z "$pw" ]; then
    pw="Pa1!$(openssl rand -hex 12)"
    printf '\n# Local-only login for john@acme.inc (seed password replaced; app does not read this var)\nLOCAL_ADMIN_PASSWORD=%s\n' "$pw" >> .env
  fi
  local out
  out="$(docker compose exec -T -e PW="$pw" -e ACC="$LOCAL_ACCOUNT" -e URL="http://host.docker.internal:${N8N_LOCAL_PORT}/webhook/${N8N_WEBHOOK_PATH}" -e EVENTS="$WEBHOOK_EVENTS" -e PHONE="$WA_PHONE" \
    rails bundle exec rails runner '
      u = User.find_by(email: "john@acme.inc")
      u&.update!(password: ENV["PW"], password_confirmation: ENV["PW"]) unless u&.valid_password?(ENV["PW"])
      acc = Account.find_or_create_by!(name: ENV["ACC"])
      AccountUser.find_or_create_by!(account: acc, user: u) { |au| au.role = :administrator } if u
      wh = acc.webhooks.find_or_initialize_by(url: ENV["URL"])
      wh.update!(name: "n8n staging (local)", subscriptions: ENV["EVENTS"].split, webhook_type: :account_type)
      inbox = acc.inboxes.where(channel_type: "Channel::Whatsapp").find { |i| i.channel.phone_number == ENV["PHONE"] }
      puts "account=#{acc.id} inbox=#{inbox&.id || "none"}"' 2>/dev/null | grep '^account=')"
  [ -n "$out" ] || { fail "could not prepare local data (docker compose logs rails)"; exit 1; }
  ok "$LOCAL_ACCOUNT ready ($out); login john@acme.inc / LOCAL_ADMIN_PASSWORD in .env"
  ok "account webhook → n8n staging /webhook/${N8N_WEBHOOK_PATH}"
  LOCAL_INBOX="${out##*inbox=}"
  [ "$LOCAL_INBOX" = none ] && warn "no WhatsApp inbox for $WA_PHONE in '$LOCAL_ACCOUNT' yet — one-time step in docs 05"
}

ensure_funnel() {
  step "3. Public URL of this Mac (Tailscale Funnel)"
  tailscale status >/dev/null 2>&1 || { fail "Tailscale is not running/logged in — open Tailscale"; exit 1; }
  local url; url="$(public_url)"
  if ! tailscale funnel status 2>/dev/null | grep -q "${LOCAL_PORT}"; then
    tailscale funnel --bg "$LOCAL_PORT" >/tmp/picnicart-funnel.log 2>&1 &
    sleep 5
    if grep -q "not enabled" /tmp/picnicart-funnel.log; then
      fail "Funnel is not enabled on the tailnet — approve once: $(grep -o 'https://login.tailscale.com[^ ]*' /tmp/picnicart-funnel.log)"; exit 1
    fi
  fi
  [ "$(http_code "$url/api" 20)" = 200 ] && ok "$url → localhost:${LOCAL_PORT}" || { fail "$url not reachable yet (DNS can take a minute the first time)"; exit 1; }
  [ "$(env_value FRONTEND_URL)" = "$url" ] || warn "FRONTEND_URL in .env is not $url (one-time step in docs 05; WhatsApp media needs it)"
}

ensure_n8n_tunnel() {
  step "4. Tunnel to n8n STAGING"
  if [ -z "$(tunnel_pid)" ]; then
    ssh -f -N -o BatchMode=yes -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
      -L "${N8N_LOCAL_PORT}:127.0.0.1:${N8N_LOCAL_PORT}" "$SERVER" || { fail "ssh tunnel failed (is your key on $SERVER?)"; exit 1; }
  fi
  if [ "$(http_code "http://127.0.0.1:${N8N_LOCAL_PORT}/healthz" 8)" != 200 ]; then
    warn "n8n (staging) asleep (scale-to-zero) — waking it via its public URL"
    http_code "$N8N_PUBLIC" 30 >/dev/null
    for _ in $(seq 1 20); do [ "$(http_code "http://127.0.0.1:${N8N_LOCAL_PORT}/healthz" 5)" = 200 ] && break; sleep 3; done
  fi
  [ "$(http_code "http://127.0.0.1:${N8N_LOCAL_PORT}/healthz" 8)" = 200 ] && ok "n8n (staging) reachable at host.docker.internal:${N8N_LOCAL_PORT}" || { fail "n8n (staging) not answering"; exit 1; }
}

set_override() {
  step "5. WhatsApp test number → this Mac (Meta webhook override)"
  local token url verify
  token="$(wa_token)"
  [ -n "$token" ] || { fail "WhatsApp token not in Keychain — one-time: security add-generic-password -s $KEYCHAIN_SERVICE -a \"\$USER\" -w"; return 1; }
  [ "${LOCAL_INBOX:-none}" != none ] || { warn "skipped: create the local WhatsApp inbox first"; return 1; }
  url="$(public_url)/webhooks/whatsapp/${WA_PHONE}"
  verify="$(docker compose exec -T -e ID="$LOCAL_INBOX" rails bundle exec rails runner 'puts Inbox.find(ENV["ID"]).channel.provider_config["webhook_verify_token"]' 2>/dev/null | tail -1)"
  local res; res="$(curl -s -X POST "$GRAPH/$WA_PHONE_ID" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
    -d "{\"webhook_configuration\":{\"override_callback_uri\":\"$url\",\"verify_token\":\"$verify\"}}")"
  echo "$res" | grep -q '"success":true' && ok "messages to $WA_PHONE now go to $url (staging account 2 is muted for this number)" \
    || { fail "Meta rejected the override: $(echo "$res" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("error",{}).get("message","?"))' 2>/dev/null)"; return 1; }
}

clear_override() {
  step "Give the test number back to staging (remove override)"
  local token; token="$(wa_token)"
  [ -n "$token" ] || { warn "no token in Keychain; nothing to clear"; return 0; }
  local res; res="$(curl -s -X POST "$GRAPH/$WA_PHONE_ID" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
    -d '{"webhook_configuration":{"override_callback_uri":""}}')"
  echo "$res" | grep -q '"success":true' && ok "override removed — the staging inbox receives the test number again" || fail "could not remove override: $res"
}

show_override() {
  local token; token="$(wa_token)"
  [ -n "$token" ] || { warn "override: unknown (no token in Keychain)"; return; }
  local cfg; cfg="$(curl -s "$GRAPH/$WA_PHONE_ID?fields=webhook_configuration" -H "Authorization: Bearer $token")"
  local cur; cur="$(echo "$cfg" | python3 -c 'import json,sys; c=json.load(sys.stdin).get("webhook_configuration",{}); print(c.get("phone_number") or "")' 2>/dev/null)"
  [ -n "$cur" ] && ok "override ACTIVE → $cur (staging muted)" || ok "no override (test number delivers to staging)"
}

status() {
  step "Status ($PROJECT)"
  [ "$(http_code "http://localhost:${LOCAL_PORT}/api" 20)" = 200 ] && ok "app http://localhost:${LOCAL_PORT}" || warn "app down"
  local lan; lan="$(ipconfig getifaddr en0 2>/dev/null)"
  [ -n "$lan" ] && ok "phone (same Wi-Fi): http://$lan:${LOCAL_PORT}"
  ok "phone (Tailscale): http://$(tailscale ip -4 2>/dev/null | head -1):${LOCAL_PORT}"
  local url; url="$(public_url)"
  [ "$(http_code "$url/api" 10)" = 200 ] && ok "public: $url" || warn "public URL off ($url)"
  [ -n "$(tunnel_pid)" ] && [ "$(http_code "http://127.0.0.1:${N8N_LOCAL_PORT}/healthz" 5)" = 200 ] && ok "n8n (staging) tunnel up" || warn "n8n (staging) tunnel down"
  show_override
}

case "$CMD" in
  up)
    ensure_docker; ensure_local_data; ensure_funnel; ensure_n8n_tunnel; set_override
    status
    echo; echo "Write to $WA_PHONE from your phone. When finished: picnicart/dev/lucia.sh down" ;;
  down)
    clear_override
    step "Close tunnels"
    tailscale funnel reset >/dev/null 2>&1; ok "funnel off (public URL closed)"
    pid="$(tunnel_pid)"; [ -n "$pid" ] && kill "$pid" && ok "n8n tunnel closed" || ok "n8n tunnel was not running"
    [ "$STOP_DOCKER" = 1 ] && docker compose stop >/dev/null && ok "docker stopped" ;;
  status) status ;;
  *) echo "usage: $0 up|status|down [--dir <checkout>] [--switch] [--stop-docker]"; exit 2 ;;
esac
