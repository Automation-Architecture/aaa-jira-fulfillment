#!/usr/bin/env bash
# Guard: this repo is dormant and must carry no hosting-platform deploy config
# (GAAA-6143). The river's deploy survey names it no-deploy; a config file here
# would make it read as deployable again. Fails if any such file is present.
#
# Not yet wired into CI: the step `- run: bash scripts/check-no-deploy-config.sh`
# belongs in .github/workflows/ci.yml and needs a push with `workflows` permission.
set -euo pipefail

cd "$(dirname "$0")/.."

found=0
for f in vercel.json .vercel now.json netlify.toml .netlify render.yaml fly.toml railway.json railway.toml app.yaml Procfile; do
  if [ -e "$f" ]; then
    echo "hosting-platform config present: $f (repo is no-deploy, see GAAA-6143)" >&2
    found=1
  fi
done

if [ "$found" -ne 0 ]; then
  exit 1
fi
echo "ok: no hosting-platform deploy config"
