#!/usr/bin/env bash
# pre-submit-lint.sh — Run linter before submitting a check-in
# Place in .chorus/hooks/pre-submit-lint.sh
# Exit non-zero to abort the submission.

set -euo pipefail

echo "[chorus-hook] Running lint checks before submit..."

# Example: run ESLint on staged files
if command -v npx &> /dev/null; then
  npx eslint --quiet . || {
    echo "[chorus-hook] ❌ Lint failed. Fix errors before submitting."
    exit 1
  }
fi

echo "[chorus-hook] ✅ Lint passed."
exit 0
