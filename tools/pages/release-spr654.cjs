'use strict';
/* T654（原 T643b）：解凍 scene603 的兩把精靈指紋鎖，用 release-correctness 的建置時覆寫（比照 release-world-filters634），
   不改 scene603.js——它和各支診斷工具釘住的雜湊都不動。
   原本：上一版的 SPR_PINS 必須正好 1586 鍵、逐鍵不變、不准新增（297 行）；上一版文件與候選在同一個 Chrome 裡完全相同（307 行）。
   合法的美術 PR 一定紅，部署過一次加鍵的 PR 之後每個 PR 都紅。
   現在：和上一版相比有變的鍵（含新增、移除），必須正好落在「上一版提交的 SPR_PINS」與「這一版提交的 SPR_PINS」有差異的鍵上；
   「實算等於提交檔」原樣保留；同一個 Chrome 的交叉比對照做，只准在提交檔有差異的鍵上不同。
   改了哪些鍵、要不要業主同意，由 CI 的 fp（tools/fp_diff.py：家族⊆卡頭 families、要 owner_ok）把關。 */

const LOCK_297 = "check(Object.keys(baseline).length===1586,'immutable baseline has 1586 keys');" +
  "check(!report.pinDiff.length,'approved 1586 keys unchanged: '+JSON.stringify(report.pinDiff));" +
  "check(report.newPins.length===0,'no legacy SPR keys added or replaced');";
const LOCK_307 = "check(!report.baseDocumentPinDiff.length,'previous release document and candidate have identical complete sprite pins in this Chrome: '+JSON.stringify(report.baseDocumentPinDiff));";

// 被換掉的四條原斷言（release-acceptance 測試的「每條 check 都要原樣出現」只豁免這四條）
const REPLACED_CHECKS = [
  "check(Object.keys(baseline).length===1586,'immutable baseline has 1586 keys');",
  "check(!report.pinDiff.length,'approved 1586 keys unchanged: '+JSON.stringify(report.pinDiff));",
  "check(report.newPins.length===0,'no legacy SPR keys added or replaced');",
  LOCK_307,
];

const COMMITTED = "report.committedPinChanges654=[...new Set([...Object.keys(baseline),...Object.keys(candidate)])].filter(k=>JSON.stringify(baseline[k])!==JSON.stringify(candidate[k]));";
const NEW_297_CHECK = "check(report.pinDiff.every(k=>report.committedPinChanges654.includes(k))&&report.newPins.every(k=>report.committedPinChanges654.includes(k)),'sprite pins differ from the previous release only where the committed SPR_PINS differ: '+JSON.stringify([...report.pinDiff,...report.newPins].filter(k=>!report.committedPinChanges654.includes(k))));";
const NEW_307_CHECK = "check(report.baseDocumentPinDiff.every(k=>report.committedPinChanges654.includes(k)),'previous release document and candidate differ only where the committed SPR_PINS differ, in this Chrome: '+JSON.stringify(report.baseDocumentPinDiff.filter(k=>!report.committedPinChanges654.includes(k))));";
const NEW_CHECKS = [NEW_297_CHECK, NEW_307_CHECK];

function install(replace) {
  replace(LOCK_297, COMMITTED + NEW_297_CHECK, 'T654 previous-release SPR lock follows the committed SPR_PINS changes');
  replace(LOCK_307, NEW_307_CHECK, 'T654 same-Chrome previous-document pins follow the committed SPR_PINS changes');
}

/* 與覆寫後的頁內判定同一個邏輯（單元測試用）：changed＝和上一版不同的鍵，committed＝兩份提交檔有差異的鍵 */
function committedChanges(previousFile, currentFile) {
  return [...new Set([...Object.keys(previousFile), ...Object.keys(currentFile)])].filter(k => JSON.stringify(previousFile[k]) !== JSON.stringify(currentFile[k]));
}
function onlyCommitted(changed, committed) {
  return changed.filter(k => !committed.includes(k));
}

module.exports = { LOCK_297, LOCK_307, REPLACED_CHECKS, NEW_CHECKS, install, committedChanges, onlyCommitted };
