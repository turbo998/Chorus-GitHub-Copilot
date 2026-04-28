#!/usr/bin/env bash
set -euo pipefail

MAX_SIZE=102400 # 100KB

for f in *.vsix; do
  size=$(stat --format=%s "$f" 2>/dev/null || stat -f%z "$f")
  echo "$f: ${size} bytes"
  if [ "$size" -gt "$MAX_SIZE" ]; then
    echo "ERROR: $f exceeds 100KB limit (${size} bytes)" >&2
    exit 1
  fi
done

echo "Size check passed."
