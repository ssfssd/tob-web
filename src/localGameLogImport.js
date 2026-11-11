import { parseTree, extractSnapshot, logGroupComplete } from "./gameLogSnapshot.js";
import { createGameLogReplay } from "./gameLogReplay.js";
import { captureLogGear, inspectLogGear } from "./seasonLogGear.js";
import { previewLogSlates } from "./seasonLogSlates.js";
import { findItemById } from "./catalog.js";
import { normalizeBuild } from "./engine.js";
import { getSeasonSelectionOptions, SEASON_GEAR_SLOT_LABELS } from "./seasonSelections.js";
import { seasonSupportOptions } from "./seasonSupport.js";
import { exportSeasonWorkspace, importSeasonWorkspace, editSeasonWorkspace } from "./seasonWorkspace.js";
import { assertLocalLogAccess } from "./runtimePolicy.js";

export const LOCAL_LOG_MAX_BYTES = 128 * 1024 * 1024;
const gearSlots = { 1: 2, 2: 0, 3: 1, 4: 3, 5: 4, 6: 7, 7: 8, 8: 6, 9: 5, 10: 9 };
// ItemMgr copies Item.Level into SkillData.Level; SkillEquipMgr sends that
// level to FSkillItemData. SkillItemLevel is not the equipped skill level.
const levelOf = item => item.Level;
function skillSlot(index) {
  if (index >= 1 && index <= 5) return { rowIndex: index - 1, supportIndex: null };
  if (index >= 101 && index <= 505 && index % 100 >= 1 && index % 100 <= 5)
    return { rowIndex: Math.floor(index / 100) - 1, supportIndex: index % 100 - 1 };
  if (index >= 1001 && index <= 1024) {
    const n = index - 1001;
    return { rowIndex: 5 + Math.floor(n / 6), supportIndex: n % 6 === 0 ? null : n % 6 - 1 };
  }
  return null;
}

// Read only the user-selected File. No URLs, telemetry, raw log storage or
// filename persistence. Instance references exist only inside the parser.
export async function readLocalGameLog(file) {
  assertLocalLogAccess();
  if (!file || !Number.isFinite(file.size) || file.size > LOCAL_LOG_MAX_BYTES)
    throw new Error("128MB 이하의 게임 로그 파일을 선택하세요.");
  const records = [];
  let active = null, replay = null, block = [], line = 0, remainder = "", total = 0;
  const finishSession = () => {
    if (!replay) return;
    records.push(replay.finish());
    if (records.length > 16) records.shift();
    replay = null;
  };
  const finishBlock = () => {
    if (!block.length) return;
    const parsed = parseTree(block);
    if (!parsed.malformed.length && !parsed.truncated.length) replay?.observe(parsed.root);
    else replay?.uncertain();
    block = [];
  };
  const finish = complete => {
    if (!active?.lines.length) { active = null; return; }
    let parsed;
    try { parsed = parseTree(active.lines); }
    catch { throw new Error("로그의 데이터 구조를 읽을 수 없습니다. 다른 로그인 기록을 선택하세요."); }
    const result = extractSnapshot({ ...parsed, line: active.line, endLine: line, complete }, { source: "로컬 로그", sha256: "local-only" });
    replay = createGameLogReplay(result, parsed.root);
    active = null;
  };
  const consume = text => {
    line++;
    if (text.length > 1_000_000) throw new Error("로그에 지나치게 긴 행이 있습니다.");
    text = text.replace(/\r+$/u, "");
    if (/Socket RecvMessage STT----GetPlayerData----/u.test(text)) {
      finish(false); finishBlock(); finishSession(); active = { line, lines: [] }; return;
    }
    if (active && /^[ |]*\+/u.test(text)) {
      active.lines.push({ text, line });
      if (active.lines.length > 100_000) throw new Error("로그인 기록이 너무 큽니다. 더 작은 로그를 선택하세요.");
      return;
    }
    if (active?.lines.length && /^\[\d{4}\.\d{2}\.\d{2}-/u.test(text)) finish(true);
    if (!active && replay) {
      if (/^[ |]*\+/u.test(text)) {
        block.push({ text, line });
        if (block.length > 100_000) throw new Error("변경 기록이 너무 큽니다. 더 작은 로그를 선택하세요.");
      } else {
        finishBlock();
        replay.event(text, line);
      }
    }
  };
  const decoder = new TextDecoder("utf-8");
  const reader = file.stream().getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > LOCAL_LOG_MAX_BYTES) throw new Error("게임 로그는 128MB까지 읽을 수 있습니다.");
      remainder += decoder.decode(value, { stream: true });
      const lines = remainder.split("\n"); remainder = lines.pop();
      for (const text of lines) consume(text);
      if (remainder.length > 1_000_000) throw new Error("로그에 지나치게 긴 행이 있습니다.");
    }
    remainder += decoder.decode();
    if (remainder) consume(remainder);
    finish(false);
    finishBlock();
    finishSession();
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  if (!records.length) throw new Error("캐릭터 로그인 기록을 찾지 못했습니다. 로그 기록을 켠 뒤 다시 접속했을 때의 파일을 선택하세요.");
  return records;
}

function match(options, nativeId) {
  // Older catalogs are used only for stable identity. All selectable items and
  // numeric authority come from the verified SS14 options above. The candidate
  // is shown before application; ambiguous identifiers never auto-select.
  const hits = options.filter(option => Object.values(findItemById(option.id)?.tlidbText ?? {})
    .some(locale => locale.sourceDataIds?.some(id => String(id) === String(nativeId))));
  return hits.length === 1 ? hits[0].id : "";
}

export function previewLocalGameLog(record, { moment = "latest" } = {}) {
  if (moment === "login") record = record.loginSnapshot ?? record;
  const rows = [], warnings = [];
  const slates = previewLogSlates(record);
  const add = (item, category, index, supportIndex = null) => {
    const options = category === "supports" ? seasonSupportOptions() : getSeasonSelectionOptions(category, index);
    const nativeId = category === "gear" && item.UniqueItmId > 0 ? item.UniqueItmId : item.BaseId;
    const itemId = !item.removed && nativeId ? match(options, nativeId) : "";
    const level = category === "gear" ? null : levelOf(item) ?? "";
    const affixCount = Object.values(item.affixes ?? {}).reduce((n, values) => n + values.length, 0);
    const logGear = category === "gear" && !item.removed ? captureLogGear(item, itemId, logGroupComplete(record, "gear") && !item.unresolved && !record.changedAfterSnapshot) : null;
    rows.push({ key: `${category}:${index}:${supportIndex ?? "main"}`, category, index, supportIndex,
      label: category === "gear" ? SEASON_GEAR_SLOT_LABELS[index] : `${index < 5 ? "액티브" : "패시브"} ${index < 5 ? index + 1 : index - 4}${supportIndex !== null ? ` · 보조 ${supportIndex + 1}` : ""}`,
      nativeId: nativeId ?? item.BaseId, itemId, level, options, affixCount, logGear, removed: !!item.removed, sourceLine: item.sourceLine,
      blocked: !!(item.unresolved || item.duplicate),
      selected: !item.unresolved && !item.duplicate && (item.removed || Boolean(itemId) && (category === "gear" || Number.isInteger(level) && level >= 1 && level <= 100)),
      note: item.unresolved ? "변경된 아이템의 상세 기록이 없어 반영할 수 없습니다."
        : item.duplicate ? "같은 슬롯의 기록이 겹쳐 반영할 수 없습니다."
        : item.removed ? "로그에 기록된 해제를 이 슬롯에 반영합니다."
        : category === "gear" ? "SS14 옵션 ID와 일치하는 실제 수치를 반영합니다. 미확인 옵션이 있으면 전체 DPS를 확정하지 않습니다."
        : "스킬 종류와 로그에 기록된 레벨을 반영합니다." });
  };
  for (const item of record.gear ?? []) {
    if (item.PageId === -1 && gearSlots[item.Index] !== undefined) add(item, "gear", gearSlots[item.Index]);
    else warnings.push("장착 위치를 확인하지 못한 장비가 있습니다.");
  }
  for (const item of record.skills ?? []) {
    const slot = item.PageId === -6 && skillSlot(item.Index);
    if (slot) add(item, slot.supportIndex === null ? "skills" : "supports", slot.rowIndex, slot.supportIndex);
    else warnings.push("장착 위치를 확인하지 못한 스킬이 있습니다.");
  }
  const duplicates = new Set(rows.filter((r, i) => rows.findIndex(x => x.key === r.key) !== i).map(r => r.key));
  for (const row of rows) if (duplicates.has(row.key)) { row.selected = false; row.blocked = true; }
  if (duplicates.size) warnings.push("같은 슬롯의 기록이 겹쳐 해당 슬롯은 가져오지 않습니다.");
  for (const row of rows.filter(r => r.category === "supports" && !r.removed)) {
    const main = rows.find(r => r.category === "skills" && r.index === row.index);
    if (main && (!main.itemId || main.blocked || main.removed)) {
      row.selected = false; row.blocked = true;
      row.note = "로그의 메인 스킬을 확인하지 못해 보조 스킬을 다른 스킬에 연결하지 않습니다.";
    }
  }
  if (record.parseErrors) {
    rows.forEach(row => { row.selected = false; row.blocked = true; });
    warnings.push("데이터 구조에 오류가 있어 이 기록은 반영할 수 없습니다. 다른 로그인 기록을 선택하세요.");
  }
  if (record.verdict === "incomplete") warnings.push("생략되거나 끝나지 않은 로그인 기록입니다. 화면에 나온 항목만 확인할 수 있습니다.");
  if (moment === "login") warnings.push("로그인 직후 구성을 가져옵니다. 이후 변경은 이 사본에 반영하지 않습니다.");
  if (record.changedAfterSnapshot) warnings.push("로그인 이후 변경 기록 중 읽을 수 없는 형식이 있습니다. 자동 선택을 해제했으므로 슬롯을 확인하세요.");
  if (record.changedAfterSnapshot) rows.forEach(row => { row.selected = false; });
  if (slates) warnings.push(slates.blocked ? "석판 보드에 미확인 기록이 있어 현재 배치를 유지합니다." : "석판은 선택한 시점의 전체 배치로 사본의 활성 보드를 교체합니다.");
  warnings.push("히어로·재능·추억·정령 구성은 현재 빌드에서 유지됩니다.");
  if (rows.some(r => r.category === "gear")) warnings.push("장비를 반영한 사본에서는 전투 조건의 적 방어·적중률·시전 배분을 다시 확인하세요.");
  const level = moment === 'login' && Number.isInteger(record.character?.Level) && record.character.Level >= 1 && record.character.Level <= 100 ? record.character.Level : null;
  return { rows, slates, characterLevel: level, warnings: [...new Set(warnings)], changes: record.changes ?? [], changeCount: record.changeCount ?? 0 };
}

export function previewLogGearOptions(row) {
  if (row.category !== "gear" || row.removed || !row.logGear) return null;
  return inspectLogGear(row.itemId, row.logGear);
}

export function applyLocalGameLog(document, preview, options) {
  const rows = preview.rows.filter(r => r.selected && !r.blocked);
  const slates = preview.slates?.selected && !preview.slates.blocked ? preview.slates : null;
  if (!rows.length && !slates) throw new Error("반영할 슬롯을 하나 이상 선택하세요.");
  let copy = importSeasonWorkspace(exportSeasonWorkspace(document), options);
  copy = editSeasonWorkspace(copy, { kind: "name", value: `${document.targetBuild.name.slice(0, 138)} · 로그 사본` });
  const apply = edit => { copy = editSeasonWorkspace(copy, edit); };
  if (preview.characterLevel !== null && preview.characterLevel !== undefined) apply({kind:'hero-level',value:preview.characterLevel});
  for (const row of [...rows.filter(r => r.category !== "supports"), ...rows.filter(r => r.category === "supports")]) {
    if (row.removed) {
      if (row.category === "gear") apply({ kind: "gear-selection", slotIndex: row.index, value: "" });
      else if (row.category === "skills") apply({ kind: "skill-selection", rowIndex: row.index, value: "" });
      else apply({ kind: "support-selection", rowIndex: row.index, supportIndex: row.supportIndex, value: "" });
      continue;
    }
    const allowed = row.category === "supports" ? seasonSupportOptions() : getSeasonSelectionOptions(row.category, row.index);
    if (!allowed.some(o => o.id === row.itemId)) throw new Error(`${row.label}의 SS14 항목을 선택하세요.`);
    if (row.category !== "gear" && (!Number.isInteger(row.level) || row.level < 1 || row.level > 100))
      throw new Error(`${row.label}의 실제 레벨을 1~100으로 입력하세요.`);
    if (row.category === "gear") {
      // Re-select even identical gear, clearing previous rolled values. A log
      // item never inherits unrelated rolls from the current build.
      apply({ kind: "gear-selection", slotIndex: row.index, value: "" });
      apply({ kind: "gear-selection", slotIndex: row.index, value: row.itemId });
      // A manual identity change must not transfer another item's arguments.
      if (row.logGear?.itemId !== row.itemId) throw new Error(`${row.label}의 로그 장비와 선택한 장비가 다릅니다. 일치 항목을 확인하세요.`);
      apply({ kind: "gear-log-options", slotIndex: row.index, value: row.logGear });
    } else if (row.category === "skills") {
      apply({ kind: "skill-selection", rowIndex: row.index, value: row.itemId });
      apply({ kind: "skill-level", rowIndex: row.index, value: row.level });
    } else {
      const normalized = normalizeBuild(copy.targetBuild);
      const slot = [...normalized.skills.active, ...normalized.skills.passive][row.index];
      if (!slot?.skillId) throw new Error(`${row.label}의 메인 스킬을 먼저 선택하세요.`);
      const expectedMain = preview.rows.find(r => r.category === "skills" && r.index === row.index);
      if (expectedMain && (expectedMain.removed || slot.skillId !== expectedMain.itemId))
        throw new Error(`${row.label}과 함께 로그의 메인 스킬도 선택하세요.`);
      if (slot.unlockedSupportCount <= row.supportIndex) apply({ kind: "support-count", rowIndex: row.index, value: row.supportIndex + 1 });
      apply({ kind: "support-selection", rowIndex: row.index, supportIndex: row.supportIndex, value: row.itemId });
      apply({ kind: "support-level", rowIndex: row.index, supportIndex: row.supportIndex, value: row.level });
    }
  }
  if (slates) apply({ kind: "slate-log", value: slates });
  apply({ kind: "log-review-reset", value: slates ? 1 : 0 });
  return copy;
}
