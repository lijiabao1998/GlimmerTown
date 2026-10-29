#!/bin/bash
# T720 proof: run the old and new port-t677 detectors on four cases.
# Usage: run-cases.sh <repo> <proofdir> <native-main-commit> <t677-landing-commit>  (the card names the commits used)
set -u
G=$1; P=$2; MAIN=$3; LAND=$4
run_case() { # name head base mutate
  local name=$1 head=$2 base=$3 mutate=$4 wt=$P/wt-$1
  git -C "$G" worktree add -q --detach "$wt" "$head" >/dev/null 2>&1
  (cd "$wt" && eval "$mutate")
  for v in before after; do
    out=$(cd "$wt" && rm -rf evidence && mkdir -p evidence/port-t677 && GITHUB_OUTPUT=$wt/gh-out-$v BASE=$base python3 "$P/detect-$v.py" 2>&1); rc=$?
    app=$(grep -h '^applicable=' "$wt/gh-out-$v" 2>/dev/null | tail -1)
    printf '%-28s %-6s exit=%s %-17s %s\n' "$name" "$v" "$rc" "${app:-applicable=(none)}" "$(echo "$out" | tail -1 | cut -c1-200)"
  done
  git -C "$G" worktree remove --force "$wt"
}
run_case 1-initial-promotion "$LAND" "$MAIN" 'true'
run_case 2-later-unrelated-pr "$LAND" "$LAND" 'echo "T720 proof: unrelated change" >> README.md'
run_case 3a-partial-markers-only "$MAIN" "$MAIN" "sed -i '0,/<script>/s//<script>\/* T677 BEGIN proof *\//' index.html"
run_case 3b-partial-valve-only "$MAIN" "$MAIN" "python3 -c \"import json;p='docs/APPROVED_ART.json';j=json.load(open(p));j['valves']['T677']='__noT677';json.dump(j,open(p,'w'),ensure_ascii=False,indent=2)\""
run_case 4-later-t677-shots-edit "$LAND" "$LAND" 'echo "<!-- T720 proof -->" >> docs/tasks/t677-shots/qa/inherited-coverage.md'
run_case 5-empty-base-fails-closed "$LAND" "" 'true'
