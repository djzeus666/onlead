#!/usr/bin/env bash
# Point landing subdomains at OnLead (preserve Host for PRO routing).
# Uses explicit hostnames — LE http-01/tls-alpn-01. Wildcard *.zone needs DNS-01
# and previously broke TLS for onlead + landing hosts (handshake internal error / CF 525).
set -euo pipefail
CADDY_FILE="${CADDY_FILE:-/opt/neiro-academy/infra/caddy/Caddyfile}"
[[ -f "$CADDY_FILE" ]] || exit 0

cp "$CADDY_FILE" "${CADDY_FILE}.bak.landing-hosts.$(date +%s)"

python3 - <<'PY' "$CADDY_FILE"
import re, sys
path = sys.argv[1]
text = open(path, encoding='utf-8').read()

landing = """# OnLead landing hosts — explicit names (LE http-01; wildcard needs DNS-01)
leadgen.m360-ural.online, smm.m360-ural.online, agents.m360-ural.online, media.m360-ural.online, za.m360-ural.online {
\tencode gzip
\treverse_proxy onlead:4173
}"""

# Replace broken wildcard block if present
wild = re.compile(
    r'# OnLead landing hosts[^\n]*\n\*\.m360-ural\.online \{\s*\n\s*encode gzip\s*\n\s*reverse_proxy onlead:4173\s*\n\}',
    re.M,
)
if wild.search(text):
    text = wild.sub(landing, text, count=1)
    open(path, 'w', encoding='utf-8').write(text)
    print('==> Replaced *.m360-ural.online wildcard with explicit landing hosts')
    sys.exit(0)

# Already explicit OnLead landing block
if 'leadgen.m360-ural.online, smm.m360-ural.online' in text and 'reverse_proxy onlead:4173' in text:
    print('==> Caddy explicit landing hosts already present')
    sys.exit(0)

# Legacy redirect-all-hosts block → split apex redirect + landing proxy
old = re.compile(
    r'www\.m360-ural\.online, za\.m360-ural\.online, m360-ural\.online, smm\.m360-ural\.online, '
    r'leadgen\.m360-ural\.online, agents\.m360-ural\.online, api\.m360-ural\.online, media\.m360-ural\.online \{\s*\n'
    r'\tredir https://onlead\.m360-ural\.online\{uri\} permanent\s*\n\}',
    re.M,
)
new = """www.m360-ural.online, m360-ural.online {
\tredir https://onlead.m360-ural.online{uri} permanent
}

""" + landing + """

api.m360-ural.online {
\tredir https://onlead.m360-ural.online{uri} permanent
}"""
if old.search(text):
    text = old.sub(new, text, count=1)
    open(path, 'w', encoding='utf-8').write(text)
    print('==> Patched Caddy landing host blocks (explicit)')
else:
    print('==> Caddy redirect block not found — append landing hosts manually if needed')
PY

docker exec neiro-caddy caddy reload --config /etc/caddy/Caddyfile \
  || docker restart neiro-caddy
