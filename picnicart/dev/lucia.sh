#!/usr/bin/env bash
# Local session: local Chatwoot <-> n8n STAGING (private Tailscale network) <-> WhatsApp test number.
# Never touches production services. Nothing from the staging stack is exposed to the internet.
#
#   picnicart/dev/lucia.sh up           # start everything (idempotent)
#   picnicart/dev/lucia.sh status       # show the state of every piece
#   picnicart/dev/lucia.sh down         # give the test number back to staging, close the public webhook path
#   picnicart/dev/lucia.sh down --stop-docker
#   picnicart/dev/lucia.sh whatsapp-inbox   # one-time: create the WhatsApp Cloud inbox locally (token from the Keychain)
#   picnicart/dev/lucia.sh bot-token [--from-server]   # one-time: store the bot token in the local DB (clipboard, or fetched over ssh)
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
for v in PICNIC_N8N_STAGING_URL PICNIC_N8N_WEBHOOK_URL PICNIC_N8N_HEALTH_URL PICNIC_WA_PHONE PICNIC_WA_PHONE_ID PICNIC_KEYCHAIN_SERVICE \
         PICNIC_LOCAL_ACCOUNT_NAME PICNIC_LOCAL_ACCOUNT_ID PICNIC_AGENT_USER_ID PICNIC_BOT_USER_ID PICNIC_BOT_LABELS; do
  [ -n "${!v:-}" ] || { echo "✗ $v is empty in $PICNIC_ENV"; exit 1; }
done

GRAPH="https://graph.facebook.com/v24.0"
LOCAL_PORT=3005
WEBHOOK_PATH="/webhooks/whatsapp"          # the ONLY path exposed publicly (Meta -> local Chatwoot)
CONV_SEQ_START=900000                      # n8n sends conversation ids >= this to the local Chatwoot
WEBHOOK_EVENTS='conversation_created conversation_status_changed conversation_updated message_created message_updated contact_updated'
STATE_DIR="$HOME/.config/picnicart/state"; mkdir -p "$STATE_DIR"

CMD="${1:-status}"; shift || true
DIR=""; SWITCH=0; STOP_DOCKER=0; BOT_SRC=clipboard
while [ $# -gt 0 ]; do
  case "$1" in
    --dir) DIR="$2"; shift 2 ;;
    --switch) SWITCH=1; shift ;;
    --stop-docker) STOP_DOCKER=1; shift ;;
    --from-server) BOT_SRC=--from-server; shift ;;
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

ts_ip() { tailscale ip -4 2>/dev/null | head -1; }
ts_host() { tailscale status --json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))' 2>/dev/null; }
public_url() { local h; h="$(ts_host)"; [ -n "$h" ] && echo "https://$h"; }
http_code() { curl -s -o /dev/null -m "${2:-10}" -w '%{http_code}' "$1"; }
wa_token() { security find-generic-password -s "$PICNIC_KEYCHAIN_SERVICE" -w 2>/dev/null; }
# curl to the Meta Graph API with the token passed through a stdin config (a printf builtin), never as a process argument
meta() { local t; t="$(wa_token)"; [ -n "$t" ] || return 9; printf 'header = "Authorization: Bearer %s"\n' "$t" | curl -s -K - "$@"; }
env_value() { grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2-; }
rails_run() { docker compose exec -T rails bundle exec rails runner "$1" 2>/dev/null | grep -v -e 'warning' -e 'called from' -e 'DEPRECATION'; }
# Everything published through Tailscale Funnel is reachable from the whole Internet. We allow ONE path only.
funnel_paths() { tailscale funnel status 2>/dev/null | awk '/^\|-- /{print $2}'; }
close_path() { tailscale serve --https=443 --set-path="$1" off >/dev/null 2>&1; }
close_unexpected_paths() {
  local p
  for p in $(funnel_paths); do
    [ "$p" = "$WEBHOOK_PATH" ] && continue
    if close_path "$p"; then warn "closed an unexpected PUBLIC path: $p"; else fail "COULD NOT CLOSE the public path $p — run: tailscale serve --https=443 --set-path=$p off"; exit 1; fi
  done
}

from_container() { docker compose exec -T rails sh -c "wget -qO- -T 6 '$1' 2>/dev/null" 2>/dev/null; }

check_other_projects() {
  local others p
  others="$(docker compose ls --format json 2>/dev/null | python3 -c "import json,sys; print(' '.join(p['Name'] for p in json.load(sys.stdin) if p['Name']!='$PROJECT' and 'running' in p['Status']))" 2>/dev/null)"
  for p in $others; do
    if docker ps --filter "label=com.docker.compose.project=$p" --format '{{.Ports}}' | grep -q ":${LOCAL_PORT}->"; then
      if [ "$SWITCH" = 1 ]; then docker compose -p "$p" stop >/dev/null && ok "stopped other environment '$p'"
      else fail "environment '$p' is using port ${LOCAL_PORT}; re-run with --switch to stop it"; exit 1; fi
    fi
  done
}

ensure_tailscale() {
  step "1. Tailscale (private network)"
  tailscale status >/dev/null 2>&1 || { fail "Tailscale is not running / not logged in — open the Tailscale app"; exit 1; }
  local ip; ip="$(ts_ip)"
  ok "this Mac: $ip"
  # The app is published on this address (docker-compose.override.yml uses PICNIC_TS_IP); keep .env in sync.
  if [ "$(env_value PICNIC_TS_IP)" != "$ip" ]; then
    grep -q '^PICNIC_TS_IP=' .env && sed -i '' "s|^PICNIC_TS_IP=.*|PICNIC_TS_IP=$ip|" .env || printf '\nPICNIC_TS_IP=%s\n' "$ip" >> .env
    ok "PICNIC_TS_IP updated in .env"
  fi
}

# The dev images (chatwoot:development, ...) have the gems of ONE checkout baked in and the tags are shared by every
# checkout. Sidekiq and Vite do not run `bundle install`, so after switching between checkouts with different
# Gemfile.lock (e.g. develop vs the production release) they crash with "Could not find <gem>". Rebuild (cached) when needed.
ensure_images() {
  local want have; want="$PROJECT:$(shasum Gemfile.lock | cut -d' ' -f1)"; have="$(cat "$STATE_DIR/dev-image-owner" 2>/dev/null)"
  [ "$want" = "$have" ] && return 0
  warn "dev images were built for another checkout/Gemfile.lock — rebuilding (cached; first time ~10 min)"
  if [ -f .git ]; then
    # git worktree: its .git is a file pointing outside the build context, so the Dockerfile's
    # `git rev-parse HEAD` fails. Build the base image from a clean clone instead (same args as docker-compose.yaml).
    local tmp; tmp="$(mktemp -d)"
    git clone -q "$PWD" "$tmp/src" && ( cd "$tmp/src" && docker build -q -f docker/Dockerfile \
        --build-arg BUNDLE_WITHOUT= --build-arg EXECJS_RUNTIME=Node --build-arg RAILS_ENV=development \
        --build-arg RAILS_SERVE_STATIC_FILES=false -t chatwoot:development . >/dev/null ) \
      && docker compose build rails vite >/dev/null 2>&1; local rc=$?; rm -rf "$tmp"
  else
    docker compose build base >/dev/null 2>&1 && docker compose build >/dev/null 2>&1; local rc=$?
  fi
  [ "$rc" = 0 ] && { echo "$want" > "$STATE_DIR/dev-image-owner"; ok "images rebuilt for $PROJECT"; } \
    || { fail "image build failed (try it by hand: docker compose build base && docker compose build)"; exit 1; }
}

ensure_docker() {
  step "2. Chatwoot local ($PROJECT, $(cat VERSION_CW 2>/dev/null))"
  docker info >/dev/null 2>&1 || { fail "Docker is not running — open Docker Desktop and retry"; exit 1; }
  [ -f .env ] && [ -f docker-compose.override.yml ] || { fail "missing .env or docker-compose.override.yml (see docs 01, 'Primera vez')"; exit 1; }
  check_other_projects
  ensure_images
  docker compose up -d >/dev/null 2>&1 || { fail "docker compose up failed: docker compose logs"; exit 1; }
  printf '    waiting for http://localhost:%s ' "$LOCAL_PORT"
  for _ in $(seq 1 120); do [ "$(http_code "http://localhost:${LOCAL_PORT}/api" 20)" = 200 ] && break; printf '.'; sleep 3; done; echo
  [ "$(http_code "http://localhost:${LOCAL_PORT}/api" 20)" = 200 ] && ok "app up: http://localhost:${LOCAL_PORT} and http://$(ts_ip):${LOCAL_PORT} (Tailscale only)" \
    || { fail "app not responding (docker compose logs rails vite)"; exit 1; }
}

# Local data that mirrors staging so the shared n8n flows work unchanged:
# account id, agent/bot user ids, the bot's labels, and conversation ids that cannot collide with staging's.
ensure_local_data() {
  step "3. Local data (mirrors staging ids)"
  local pw; pw="$(env_value LOCAL_ADMIN_PASSWORD)"
  if [ -z "$pw" ]; then
    pw="Pa1!$(openssl rand -hex 12)"
    printf '\n# Local-only login for john@acme.inc (seed password replaced; app does not read this var)\nLOCAL_ADMIN_PASSWORD=%s\n' "$pw" >> .env
  fi
  local out
  out="$(docker compose exec -T -e PW="$pw" -e ACC_ID="$PICNIC_LOCAL_ACCOUNT_ID" -e ACC_NAME="$PICNIC_LOCAL_ACCOUNT_NAME" \
      -e AGENT_ID="$PICNIC_AGENT_USER_ID" -e BOT_ID="$PICNIC_BOT_USER_ID" -e LABELS="$PICNIC_BOT_LABELS" \
      -e URL="$PICNIC_N8N_WEBHOOK_URL" -e EVENTS="$WEBHOOK_EVENTS" -e PHONE="$PICNIC_WA_PHONE" -e SEQ_START="$CONV_SEQ_START" \
      rails bundle exec rails runner '
      acc = Account.find_by(id: ENV["ACC_ID"].to_i) || Account.create!(id: ENV["ACC_ID"].to_i, name: ENV["ACC_NAME"])
      acc.update!(name: ENV["ACC_NAME"]) unless acc.name == ENV["ACC_NAME"]

      admin = User.find_by(email: "john@acme.inc")
      admin.update!(password: ENV["PW"], password_confirmation: ENV["PW"]) if admin && !admin.valid_password?(ENV["PW"])
      AccountUser.find_or_create_by!(account: acc, user: admin) { |au| au.role = :administrator } if admin

      make_user = lambda do |id, name, email|
        user = User.find_by(id: id)
        unless user
          pass = "Aa1!#{SecureRandom.hex(16)}"
          user = User.create!(id: id, name: name, email: email, password: pass, password_confirmation: pass, confirmed_at: Time.current)
        end
        AccountUser.find_or_create_by!(account: acc, user: user) { |au| au.role = :administrator }
        user
      end
      make_user.call(ENV["AGENT_ID"].to_i, "Asesor local", "asesor@picnic.local")
      make_user.call(ENV["BOT_ID"].to_i, "Bot local", "bot@picnic.local")
      ActiveRecord::Base.connection.reset_pk_sequence!("users")

      ENV["LABELS"].split.each { |t| Label.find_or_create_by!(account_id: acc.id, title: t) }

      seq = "conv_dpid_seq_#{acc.id}"
      last = ActiveRecord::Base.connection.select_value("SELECT last_value FROM #{seq}").to_i
      ActiveRecord::Base.connection.execute("ALTER SEQUENCE #{seq} RESTART WITH #{ENV["SEQ_START"].to_i}") if last < ENV["SEQ_START"].to_i
      seq_now = ActiveRecord::Base.connection.select_value("SELECT last_value FROM #{seq}")

      wh = acc.webhooks.find_or_initialize_by(url: ENV["URL"])
      wh.update!(name: "n8n staging", subscriptions: ENV["EVENTS"].split, webhook_type: :account_type)
      acc.webhooks.where.not(id: wh.id).where("url LIKE ?", "%n8n%").destroy_all

      inbox = acc.inboxes.where(channel_type: "Channel::Whatsapp").find { |i| i.channel.phone_number == ENV["PHONE"] }
      puts "RESULT account=#{acc.id} inbox=#{inbox&.id || "none"} seq=#{seq_now}"' 2>/dev/null | grep '^RESULT')"
  [ -n "$out" ] || { fail "could not prepare local data (docker compose logs rails)"; exit 1; }
  ok "${out#RESULT }; login john@acme.inc / LOCAL_ADMIN_PASSWORD (.env)"
  ok "users $PICNIC_AGENT_USER_ID (agent) and $PICNIC_BOT_USER_ID (bot), labels: $PICNIC_BOT_LABELS"
  ok "account webhook → n8n staging (private network)"
  LOCAL_INBOX="${out##*inbox=}"; LOCAL_INBOX="${LOCAL_INBOX%% *}"
  [ "$LOCAL_INBOX" = none ] && warn "no WhatsApp inbox for the test number yet — one-time step in docs 05"
  [ -f "$STATE_DIR/bot-token-$PROJECT" ] || warn "bot token not stored yet — run: picnicart/dev/lucia.sh bot-token (docs 05)"
  return 0
}

ensure_n8n() {
  step "4. n8n staging over Tailscale (nothing exposed)"
  if [ -z "$(from_container "$PICNIC_N8N_HEALTH_URL")" ]; then
    warn "n8n staging not answering — it may be asleep; waking it via its public URL"
    http_code "$PICNIC_N8N_STAGING_URL" 30 >/dev/null
    for _ in $(seq 1 20); do [ -n "$(from_container "$PICNIC_N8N_HEALTH_URL")" ] && break; sleep 3; done
  fi
  [ -n "$(from_container "$PICNIC_N8N_HEALTH_URL")" ] && ok "the local Chatwoot container reaches n8n staging" \
    || { fail "the local Chatwoot container cannot reach n8n staging (Tailscale up on both sides? 'tailscale serve' active on the server?)"; exit 1; }
}

ensure_public_webhook() {
  step "5. Public ingress for Meta (only ${WEBHOOK_PATH})"
  local url; url="$(public_url)"
  close_unexpected_paths
  if ! funnel_paths | grep -qx "$WEBHOOK_PATH"; then
    tailscale funnel --bg --set-path="$WEBHOOK_PATH" "http://127.0.0.1:${LOCAL_PORT}${WEBHOOK_PATH}" >/tmp/picnicart-funnel.log 2>&1 &
    sleep 6
    if grep -qi "not enabled" /tmp/picnicart-funnel.log; then
      fail "Funnel is not enabled on the tailnet — approve once: $(grep -o 'https://login.tailscale.com[^ ]*' /tmp/picnicart-funnel.log)"; exit 1
    fi
  fi
  local code; code="$(http_code "$url${WEBHOOK_PATH}/probe" 20)"
  [ "$code" != 000 ] && ok "Meta can reach $url${WEBHOOK_PATH}/… (HTTP $code); the rest of the app stays private" \
    || { fail "$url not reachable yet (DNS can take a minute the first time)"; exit 1; }
  close_unexpected_paths
  local api_code; api_code="$(http_code "$url/api" 15)"
  if [ "$api_code" = 200 ]; then fail "the WHOLE APP answers on the public URL — closing the ingress"; close_path "$WEBHOOK_PATH"; exit 1; fi
  ok "verified: ${url}/api is not public (HTTP $api_code)"
}

set_override() {
  step "6. WhatsApp test number → this Mac (Meta webhook override)"
  local token url verify
  token="$(wa_token)"
  [ -n "$token" ] || { fail "WhatsApp token not in Keychain — one-time: security add-generic-password -s $PICNIC_KEYCHAIN_SERVICE -a \"\$USER\" -w"; return 1; }
  [ "${LOCAL_INBOX:-none}" != none ] || { warn "skipped: create the local WhatsApp inbox first"; return 1; }
  url="$(public_url)${WEBHOOK_PATH}/${PICNIC_WA_PHONE}"
  verify="$(docker compose exec -T -e ID="$LOCAL_INBOX" rails bundle exec rails runner 'puts Inbox.find(ENV["ID"]).channel.provider_config["webhook_verify_token"]' 2>/dev/null | tail -1)"
  local res; res="$(meta -X POST "$GRAPH/$PICNIC_WA_PHONE_ID" -H 'Content-Type: application/json' \
    -d "{\"webhook_configuration\":{\"override_callback_uri\":\"$url\",\"verify_token\":\"$verify\"}}")"
  echo "$res" | grep -q '"success":true' && ok "messages to the test number now go to this Mac (the staging inbox is muted for this number)" \
    || { fail "Meta rejected the override: $(echo "$res" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("error",{}).get("message","?"))' 2>/dev/null)"; return 1; }
}

clear_override() {
  step "Give the test number back to staging (remove override)"
  local token; token="$(wa_token)"
  [ -n "$token" ] || { warn "no token in Keychain; nothing to clear"; return 0; }
  local res; res="$(meta -X POST "$GRAPH/$PICNIC_WA_PHONE_ID" -H 'Content-Type: application/json' \
    -d '{"webhook_configuration":{"override_callback_uri":""}}')"
  echo "$res" | grep -q '"success":true' && ok "override removed — the staging inbox receives the test number again" || fail "could not remove override: $res"
}

show_override() {
  local token; token="$(wa_token)"
  [ -n "$token" ] || { warn "override: unknown (no token in Keychain)"; return; }
  local cur; cur="$(meta "$GRAPH/$PICNIC_WA_PHONE_ID?fields=webhook_configuration" \
    | python3 -c 'import json,sys; c=json.load(sys.stdin).get("webhook_configuration",{}); print(c.get("phone_number") or "")' 2>/dev/null)"
  [ -n "$cur" ] && ok "override ACTIVE → local (staging muted for the test number)" || ok "no override (the test number delivers to staging)"
}

# Reads a token from stdin (never from argv/env, so it does not show up in `ps`), validates its shape and stores it
# as the access token of the bot user in the LOCAL database. Prints nothing secret.
store_bot_token() {
  docker compose exec -T -e BOT_ID="$PICNIC_BOT_USER_ID" rails bundle exec rails runner '
    tok = STDIN.read.strip
    abort("BAD_TOKEN") unless tok.match?(/\A[A-Za-z0-9_\-]{16,128}\z/)
    User.find(ENV["BOT_ID"].to_i).access_token.update!(token: tok)
    puts "TOKEN_SET"' 2>/dev/null | grep -q TOKEN_SET
}

bot_token() {
  step "Bot token (one-time)"
  local source="${1:-clipboard}"
  if [ "$source" = "--from-server" ]; then
    for v in PICNIC_BOT_TOKEN_SSH PICNIC_BOT_TOKEN_REMOTE_FILE PICNIC_BOT_TOKEN_VAR; do
      [ -n "${!v:-}" ] || { fail "$v is empty in $PICNIC_ENV"; exit 1; }
    done
    # the token travels ssh -> stdin of the local rails runner; it is never printed or written to disk
    ssh -o BatchMode=yes "$PICNIC_BOT_TOKEN_SSH" "grep '^${PICNIC_BOT_TOKEN_VAR}=' ${PICNIC_BOT_TOKEN_REMOTE_FILE} | cut -d= -f2-" 2>/dev/null | store_bot_token \
      && { touch "$STATE_DIR/bot-token-$PROJECT"; ok "token stored for user $PICNIC_BOT_USER_ID in the local DB (nothing printed)"; return 0; } \
      || { fail "could not fetch/store the token (is the local app up? is the SSH key authorized? does the remote var exist?)"; exit 1; }
  fi
  command -v pbpaste >/dev/null || { fail "pbpaste not available"; exit 1; }
  pbpaste | tr -d '\n' | grep -Eq '^[A-Za-z0-9_-]{16,128}$' || { fail "the clipboard does not look like a token. Copy it first, or use: lucia.sh bot-token --from-server"; exit 1; }
  pbpaste | store_bot_token \
    && { printf '' | pbcopy; touch "$STATE_DIR/bot-token-$PROJECT"; ok "token stored for user $PICNIC_BOT_USER_ID in the local DB; clipboard cleared"; } \
    || { fail "could not store the token (is the local app up? run 'up' first)"; exit 1; }
}

# Creates the WhatsApp Cloud inbox in the LOCAL account. The token comes from the Keychain (stdin, never argv).
# Chatwoot normally calls Meta right after creating a manual WhatsApp Cloud channel (`setup_webhooks`: it sets the
# number's webhook to FRONTEND_URL and may register the number). That would change what staging receives behind your
# back, so the callback is disabled for THIS process only; `lucia.sh up` is the one that points Meta at this Mac.
whatsapp_inbox() {
  step "WhatsApp inbox (local)"
  [ -n "$(wa_token)" ] || { fail "no WhatsApp token in the Keychain — one-time: security add-generic-password -s $PICNIC_KEYCHAIN_SERVICE -a \"\$USER\" -U -w   (paste the token at the prompt)"; exit 1; }
  local code; code="$(meta -o /dev/null -w '%{http_code}' "$GRAPH/$PICNIC_WA_PHONE_ID?fields=id")"
  [ "$code" = 200 ] && ok "the token can read the test number" || { fail "Meta rejected the token for the test number (HTTP $code): expired, or missing permissions"; exit 1; }
  local out
  out="$(wa_token | docker compose exec -T -e ACC_ID="$PICNIC_LOCAL_ACCOUNT_ID" -e PHONE="$PICNIC_WA_PHONE" -e PHONE_ID="$PICNIC_WA_PHONE_ID" \
      -e WABA_ID="$PICNIC_WA_WABA_ID" -e NAME="${PICNIC_LOCAL_INBOX_NAME:-WhatsApp local}" rails bundle exec rails runner '
      Channel::Whatsapp.skip_callback(:commit, :after, :setup_webhooks)   # this process only; nothing is persisted
      acc = Account.find(ENV["ACC_ID"].to_i)
      inbox = acc.inboxes.where(channel_type: "Channel::Whatsapp").find { |i| i.channel.phone_number == ENV["PHONE"] }
      if inbox
        puts "RESULT existing inbox=#{inbox.id}"
      else
        token = STDIN.read.strip
        channel = Channel::Whatsapp.create!(account: acc, phone_number: ENV["PHONE"], provider: "whatsapp_cloud",
                                            provider_config: { "api_key" => token, "phone_number_id" => ENV["PHONE_ID"], "business_account_id" => ENV["WABA_ID"] })
        inbox = acc.inboxes.create!(name: ENV["NAME"], channel: channel)
        puts "RESULT created inbox=#{inbox.id}"
      end' 2>&1 | grep -E '^RESULT|Invalid|RecordInvalid|Validation' | head -3)"
  case "$out" in
    RESULT*) ok "${out#RESULT } (Meta webhooks were NOT touched)"; touch "$STATE_DIR/wa-inbox-$PROJECT" ;;
    *) fail "could not create the inbox: ${out:-no output (is the local app up? run 'up')}"; exit 1 ;;
  esac
}

status() {
  step "Status ($PROJECT, $(cat VERSION_CW 2>/dev/null))"
  [ "$(http_code "http://localhost:${LOCAL_PORT}/api" 20)" = 200 ] && ok "app http://localhost:${LOCAL_PORT}" || warn "app down"
  local ip; ip="$(ts_ip)"
  [ -n "$ip" ] && ok "phone / other tailnet devices: http://$ip:${LOCAL_PORT}"
  local exposed; exposed="$(funnel_paths | grep -vx "$WEBHOOK_PATH" | tr '\n' ' ')"
  if [ -n "$exposed" ]; then fail "EXPOSED TO THE INTERNET: $exposed — run lucia.sh up (closes them) or lucia.sh down"
  elif funnel_paths | grep -qx "$WEBHOOK_PATH"; then ok "public ingress for Meta: $(public_url)${WEBHOOK_PATH} (only that path)"
  else ok "no public ingress (Funnel closed)"; fi
  [ -n "$(from_container "$PICNIC_N8N_HEALTH_URL")" ] && ok "local Chatwoot → n8n staging reachable" || warn "local Chatwoot cannot reach n8n staging"
  show_override
  [ -f "$STATE_DIR/bot-token-$PROJECT" ] && ok "bot token stored" || warn "bot token not stored (lucia.sh bot-token)"
}

case "$CMD" in
  up)
    ensure_tailscale; ensure_docker; ensure_local_data; ensure_n8n; ensure_public_webhook; set_override
    status
    echo; echo "Write to the test number from your phone. When finished: picnicart/dev/lucia.sh down" ;;
  down)
    clear_override
    step "Close the public webhook path"
    for p in $(funnel_paths); do close_path "$p"; done
    [ -z "$(funnel_paths)" ] && { tailscale funnel --https=443 off >/dev/null 2>&1; ok "public ingress closed (nothing is published)"; } || fail "some public paths are still open: $(funnel_paths | tr '\n' ' ')"
    [ "$STOP_DOCKER" = 1 ] && docker compose stop >/dev/null && ok "docker stopped" ;;
  status) status ;;
  bot-token) bot_token "$BOT_SRC" ;;
  whatsapp-inbox) whatsapp_inbox ;;
  *) echo "usage: $0 up|status|down|bot-token [--from-server]|whatsapp-inbox [--dir <checkout>] [--switch] [--stop-docker]"; exit 2 ;;
esac
