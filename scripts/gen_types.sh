#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
scratch="$(mktemp -d /tmp/nova-types.XXXXXX)"
trap 'rm -rf -- "$scratch"' EXIT

cd "$repo_root"
backend/.venv/bin/python -c 'import json, sys; from backend.src.main import app; print(json.dumps(app.openapi()))' > "$scratch/openapi.json"

# Isolate the generator's TypeScript 5 peer dependency from the app's TypeScript 6.
cd "$scratch"
npm exec --yes --package=openapi-typescript@7.13.0 -- openapi-typescript \
  "$scratch/openapi.json" -o "$repo_root/frontend/src/api/types.ts"
