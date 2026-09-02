#!/usr/bin/env bash
# Point landing subdomains at OnLead (preserve Host for PRO routing).
# Supports wildcard *.zone for Cloudflare-automated DNS subdomains.
set -euo pipefail
CADDY_FILE="${CADDY_FILE:-/opt/neiro-academy/infra/caddy/Caddyfile}"
[[ -f "$CADDY_FILE" ]] || exit 0

cp "$CADDY_FILE" "${CADDY_FILE}.bak.landing-hosts.$(date +%s)"

python3 - <<'PY' "$CADDY_FILE"
import re, sys
path = sys.argv[1]
text = open(path, encoding='utf-8').read()

wildcard = """# OnLead landing hosts — any PRO subdomain (*.m360-ural.online)
*.m360-ural.online {
\tencode gzip
\treverse_proxy onlead:4173
}"""

# Upgrade explicit host list → wildcard (Cloudflare DNS automation)
explicit = re.compile(
    r'# OnLead landing hosts[^\n]*\n[^\{]+\{[^}]+\}',
    re.S,
)
if explicit.search(text):
    text = explicit.sub(wildcard, text, count=1)
    open(path, 'w', encoding='utf-8').write(text)
    print('==> Upgraded Caddy landing block to *.m360-ural.online wildcard')
    sys.exit(0)

if '# OnLead landing hosts' in text or '*.m360-ural.online' in text:
    print('==> Caddy landing wildcard already present')
    sys.exit(0)

old = re.compile(
    r'www\.m360-ural\.online, za\.m360-ural\.online, m360-ural\.online, smm\.m360-ural\.online, '
    r'leadgen\.m360-ural\.online, agents\.m360-ural\.online, api\.m360-ural\.online, media\.m360-ural\.online \{\s*\n'
    r'\tredir https://onlead\.m360-ural\.online\{uri\} permanent\s*\n\}',
    re.M,
)
new = """www.m360-ural.online, m360-ural.online {
\tredir https://onlead.m360-ural.online{uri} permanent
}

""" + wildcard + """

api.m360-ural.online {
\tredir https://onlead.m360-ural.online{uri} permanent
}"""
if old.search(text):
    text = old.sub(new, text, count=1)
    open(path, 'w', encoding='utf-8').write(text)
    print('==> Patched Caddy landing host blocks (wildcard)')
else:
    print('==> Caddy redirect block not found — append landing wildcard manually if needed')
PY

docker exec neiro-caddy caddy reload --config /etc/caddy/Caddyfile \
  || docker restart neiro-caddy
