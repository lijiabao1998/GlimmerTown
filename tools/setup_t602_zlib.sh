#!/usr/bin/env bash
# Source this from the repository root before running verify.py.
# Source: official PyPI zlib-ng 1.0.0 sdist, containing upstream zlib-ng 2.2.5.
# This installs an isolated build dependency only. It does not alter game files,
# PNG assets, generator code, test predicates, or system libraries.
set -euo pipefail
PNG_RUNTIME_ROOT="${1:-${RUNNER_TEMP:-/tmp}/glimmertown-png-runtime}"
mkdir -p "$PNG_RUNTIME_ROOT"
PNG_RUNTIME_ROOT="$(cd "$PNG_RUNTIME_ROOT" && pwd)"
ZLIBNG_SDIST_URL='https://files.pythonhosted.org/packages/46/7d/901c6e333fb031b5bfbd1532099200cf859f12aa83689be494eade6685ec/zlib_ng-1.0.0.tar.gz'
ZLIBNG_SDIST_SHA256='c753cea73f9e803c246e9bf01a59eb652897ed8a19334ada0f968394c7f61650'
curl -fLsS --retry 2 "$ZLIBNG_SDIST_URL" -o "$PNG_RUNTIME_ROOT/zlib_ng-1.0.0.tar.gz"
printf '%s  %s\n' "$ZLIBNG_SDIST_SHA256" "$PNG_RUNTIME_ROOT/zlib_ng-1.0.0.tar.gz" | sha256sum -c -
tar -xzf "$PNG_RUNTIME_ROOT/zlib_ng-1.0.0.tar.gz" -C "$PNG_RUNTIME_ROOT"
(
  cd "$PNG_RUNTIME_ROOT/zlib_ng-1.0.0/src/zlib_ng/zlib-ng"
  ./configure --zlib-compat --prefix="$PNG_RUNTIME_ROOT/zlibng-install"
  make -j2
  make install
)
python -m pip install --disable-pip-version-check --no-deps --target "$PNG_RUNTIME_ROOT/pillow122" 'Pillow==12.2.0'
export LD_LIBRARY_PATH="$PNG_RUNTIME_ROOT/zlibng-install/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export PYTHONPATH="$PNG_RUNTIME_ROOT/pillow122${PYTHONPATH:+:$PYTHONPATH}"
# Fail closed before the costly full suite if this runner still differs.
python generate_pwa_icons.py --check
