#!/usr/bin/env bash
# Candidate-owned transport adapter for the untouched original fp_snapshot.py.
# Its Linux launcher adds --no-sandbox. Remove only that exact argument so the
# real Chrome renderer uses its normal sandbox. No test predicate is changed.
set -euo pipefail
if [[ "$(id -u)" == 0 ]]; then
  printf '%s\n' 'Refusing Chrome as root: the normal Chrome sandbox must remain enabled.' >&2
  exit 2
fi
real="${CHROME_SANDBOXED_BINARY:-/usr/bin/google-chrome}"
if [[ ! -x "$real" ]]; then
  printf 'Chrome executable unavailable: %s\n' "$real" >&2
  exit 2
fi
args=()
for arg in "$@"; do
  if [[ "$arg" == --no-sandbox ]]; then
    printf '%s\n' 'P01-C security adapter removed original --no-sandbox; all other arguments are unchanged.' >&2
  else
    args+=("$arg")
  fi
done
exec "$real" "${args[@]}"
