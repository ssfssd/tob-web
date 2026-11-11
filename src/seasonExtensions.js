import { SS14_EXTENSIONS } from "./data/ss14Extensions.generated.js";
import { SS14_CRAFT } from "./data/ss14Craft.generated.js";
import { memoryRange } from "./seasonMemoryRolls.js";
import { addSeasonIngredients } from "./seasonElixirIngredients.js";
import { inspectSeasonPrism } from "./seasonPrismPlacement.js";
import { theaState } from "./seasonTheaState.js";
import { theaCombatEnabled } from "./seasonTheaCombatInputs.js";
import { moduleOptionEffects, seasonModuleProfile } from "./seasonModules.js";
import { ADVANCED_EXTENSION_FIELDS, advancedExtensionContext, advancedModuleLine, advancedElixirLine } from "./seasonAdvancedExtensions.js";
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { resolveSeasonSkillLevel } from "./seasonSkillLevels.js";
import { logAllSkillLevelBonus } from "./seasonLogGear.js";

const safeKo = (s) => typeof s === "string" && /[가-힣]/u.test(s) && !/\p{Script=Han}/u.test(s) ? s : "한국어 원문 미제공";
const validPage = (p) => p?.season === "SS14" && /^[a-f0-9]{64}$/u.test(p.sourcePageSha256);
const signature = (v) => JSON.stringify(v);
export const validExtensionValue = (control, value) => value === "" || typeof value === "number" && Number.isFinite(value)
  && value >= control.min && value <= control.max && (!["boolean", "tier", "count"].includes(control.kind) || Number.isInteger(value));

// These are instantaneous, explicitly confirmed inputs, not simulated uptime or
// an inferred effect bonus. Old season values/conditions never supply defaults.
export function seasonExtensionRows(build, { parseLines, data = SS14_EXTENSIONS, craftData = SS14_CRAFT, netherElixirBonus=0, requireBindings = build?.patchSnapshot?.season === "SS14" } = {}) {
  const rows = [];
  const make = (path, id, en, ko, record, text, detail, reason = "", boundByControl = false) => {
    const receipt = validPage(en) ? { season: "SS14", sourceUrl: en.sourceUrl, sourcePageSha256: en.sourcePageSha256,
      sourceRecordKey: record, authorityScope: "preview-site-deployment" } : null;
    const row = { group: "skills", path, itemId: id, name: safeKo(ko?.name), detail: safeKo(detail), selectionCount: 1,
      receipt, extensionControls: [], effects: [], blockers: [], conditionControls: [], inactive: [], status: "partial" };
    if (reason) row.blockers.push({ reason });
    if (!receipt || !text) row.blockers.push({ reason: "SS14 선택 항목 원문 미확보" });
    if (requireBindings && !boundByControl && receipt && build.ss14Inputs?.componentReceipts?.[receipt.sourceUrl] !== receipt.sourcePageSha256)
      row.blockers.push({ reason: "SS14 영약·모듈 원문 연결이 변경되었습니다. 구성을 다시 이전하세요." });
    rows.push(row);
    return row;
  };
  const control = (row, key, label, kind, fingerprint, max = 1, min = 0) => {
    const c = { key, label, kind, min, max, sourceFingerprint: fingerprint, sourcePageSha256: row.receipt?.sourcePageSha256, value: "" };
    const b = build.ss14Inputs?.extensionInputs?.[key];
    if (b?.sourceFingerprint === fingerprint && b.sourcePageSha256 === c.sourcePageSha256 && validExtensionValue(c, b.value)) c.value = b.value;
    if (!row.extensionControls.some(old => old.key === key)) row.extensionControls.push(c);
    return c.value;
  };
  const apply = (row, text, scale = 1, cap = null) => {
    const parsed = parseLines(text);
    row.effects.push(...parsed.effects.map((e) => ({ ...e, value: cap === null ? e.value * scale : Math.min(cap, e.value * scale),
      path: row.path, group: row.group, receipt: row.receipt })));
    row.blockers.push(...parsed.blockers);
  };
  const active = build.skills?.active ?? [];
  const elixirs = build.skills?.elixirs ?? [];
  const levelBonus = elixirs.some(s => s?.skillId) ? logAllSkillLevelBonus(build) : 0;
  for (const [index, slot] of elixirs.entries()) {
    if (!slot?.skillId && !(slot?.ingredientIds ?? []).some(Boolean)) continue;
    const identity = data.elixirs.find((s) => s.id === slot.skillId);
    const en = data.pages[`en/${identity?.slug}`]; const ko = data.pages[`ko/${identity?.slug}`]?.parsed;
    const hostIndex = active.findIndex(s => identity && s?.skillId === identity.itemId);
    const host = active[hostIndex];
    const card = SS14_CARDS_EN.records[identity?.itemId];
    const level = host?.level + levelBonus;
    const leveled = card && resolveSeasonSkillLevel({ id: identity.itemId, tlidbText: { en: { ...card, sourcePageVersion: "SS14" } } }, level);
    const levelText = leveled && !leveled.blockers.length ? leveled.item.tlidbText.en.detail.split("\nDetails\n").at(-1) : null;
    const text = level === 20 ? en?.parsed.detailMods.join("\n") : levelText;
    const valid = index < 2 && slot.bottleId === ["base", "special"][index] && identity
      && host?.skillId === identity.itemId && (level === en?.parsed.level || levelText) && en?.parsed.season === 14
      && !active.some((s, i) => i !== hostIndex && s?.skillId === identity.itemId);
    const row = make(`skills.elixirs.${index}`, identity?.itemId ?? slot.skillId, en, ko, en?.parsed.key, text,
      ko?.detailMods.join("\n"), valid ? "" : "영약 종류·병·실제 액티브 칸과 SS14 원문 레벨을 확인하세요. 중복 영약은 합산하지 않습니다.");
    row.comparisonFingerprint = signature({ slot, host, inputs: Object.entries(build.ss14Inputs?.extensionInputs ?? {}).filter(([k]) => k.startsWith(`elixir:${index}:`)) });
    row.effectiveLevel = level;
    if (row.blockers.length) continue;
    const fingerprint = signature({ slot, skillId: host.skillId, level: host.level });
    const selectedEnabled = control(row, `elixir:${index}:active`, `영약 ${index + 1} 현재 활성`, "boolean", fingerprint);
    const enabled = theaCombatEnabled(build) ? (theaState(build)?.events?.[`elixir${index}`] ?? 0) : selectedEnabled;
    let scale = control(row, `elixir:${index}:scale`, `영약 ${index + 1} 확인한 효과 배율`, "scale", fingerprint, 100);
    if(netherElixirBonus) {
      const included=control(row,`elixir:${index}:netherIncludes`,'최종 배율에 명왕 효과가 포함됨','boolean',fingerprint);
      if(included===0) {
        const increase=control(row,`elixir:${index}:netherOtherEffect`,'명왕 외 영약 효과 증가율 (%)','scale',fingerprint,1000);
        scale=increase===''?'':1+(increase+netherElixirBonus)/100;
        row.elixirEffectCalculation={base:1,increased:increase,nether:netherElixirBonus,scale};
      } else if(included==='')row.blockers.push({reason:'영약 최종 배율에 명왕 보너스가 포함됐는지 선택하세요. 별도 증가율로 계산할 수 있습니다.'});
    }
    row.elixirState = { index, enabled, scale,
      uptime: control(row, `elixir:${index}:uptime`, `영약 ${index + 1} 관측한 활성 시간 비율 (%)`, "percent", fingerprint, 100) };
    if (enabled === "" || enabled === 1 && scale === "") row.blockers.push({ reason: "영약 현재 활성 여부와 게임에서 확인한 최종 효과 배율을 입력하세요. 1은 기본 효과이며 자동 계산한 배율이 아닙니다." });
    addSeasonIngredients(build, slot, index, row.elixirState, data, { make, control, apply });
    const extraKeys = { "putrid-toad-distillate": ["blurRating", "ominousCurse"], "saltpeter-mushroom-distillate": ["minionPresent"], "iridescent-butterfly-distillate": ["coldInfiltration", "fireInfiltration", "lightningInfiltration"] }[slot.skillId] ?? [];
    for (const key of extraKeys) if (!theaCombatEnabled(build) || !key.endsWith("Infiltration")) {
      const definition = ADVANCED_EXTENSION_FIELDS[key];
      control(row, `elixir:${index}:${key}`, definition.label, definition.kind, fingerprint, definition.max);
    }
    // The spell can apply a ten-second debuff that outlives the elixir.
    if (slot.skillId === "iridescent-butterfly-distillate" && theaCombatEnabled(build)) {
      const context = advancedExtensionContext(build, row, `elixir:${index}`, fingerprint, control);
      context.mechanic("elixir-infiltration", { index });
      for (const type of ["cold", "fire", "lightning"]) context.infiltration(type, 0);
    }
    if (slot.skillId === "putrid-toad-distillate" && enabled === 0) advancedElixirLine("30.5 % Ill Omen Cumulative Efficiency while Blur is active", 0, advancedExtensionContext(build, row, `elixir:${index}`, fingerprint, control));
    if (enabled === 0) { row.inactive.push({ reason: "입력한 영약 비활성 상태" }); continue; }
    if (enabled === "" || scale === "") continue;
    // Only the detailed active-effect block is numeric authority; simple text,
    // charge generation and duration are retained above, not averaged into DPS.
    const block = level === 20 ? en.parsed.detailMods[0] : levelText.split("\nDefeating enemies")[0];
    const restoration = block.match(/^Casts this skill and gains restoration:\nRestores ([\d.]+) % Max (Life|Mana) within ([\d.]+) s\nThis skill's Restoration Effect and Duration are also affected by Elixir Effect and Duration$/u);
    if (restoration) {
      row.restoration = { resource: restoration[2].toLowerCase(), percent: Number(restoration[1]) * scale,
        baseDuration: Number(restoration[3]), receipt: row.receipt };
      continue;
    }
    if (!block.startsWith("Casts this skill and gains an Elixir Effect:\n")) {
      row.blockers.push({ reason: "영약 회복 총량·지속시간 계산 미지원" }); continue;
    }
    for (const line of block.split("\n").slice(1)) {
      if (/^Lasts for \d+(?:\.\d+)? s$/u.test(line)) continue;
      if (advancedElixirLine(line, scale, advancedExtensionContext(build, row, `elixir:${index}`, fingerprint, control))) continue;
      if (line === "Converts 15 % of Physical Damage taken to random Elemental Damage") {
        row.mechanics ??= []; row.mechanics.push({ kind: "damage-taken-conversion", from: "physical", to: "random-elemental", percent: 15 * scale });
        if (15 * scale > 100) row.blockers.push({ reason: "받는 대미지 전환의 100% 초과 처리 근거가 없습니다." });
        continue;
      }
      if (line === "Energy Shield Charge started recently cannot be interrupted by damage") {
        row.mechanics ??= []; row.mechanics.push({ kind: "recent-shield-recharge-uninterruptible" }); continue;
      }
      if (line === "The Ignite inflicted is replaced with Scorch") {
        row.mechanics ??= []; row.mechanics.push({ kind: "elixir-scorch" });
        if (!theaCombatEnabled(build)) row.blockers.push({ reason: "영약의 점화·스코치 교체는 전투 조건에서 복합 발동 계산을 켜세요." });
        continue;
      }
      const extra = line.match(/^Adds ([\d.]+) % of Physical Damage (?:as|to) (Fire|Cold|Lightning) Damage$/u);
      if (extra) {
        row.effects.push({ stat: `physical_damage_as_${extra[2].toLowerCase()}`, operation: "add_percent", value: Number(extra[1]) * scale,
          unit: "percent", sourceText: line, path: row.path, group: row.group, receipt: row.receipt });
        continue;
      }
      if (line === "Damage triggers Lucky") { apply(row, "Lucky Damage"); continue; }
      const capped = line.match(/^([+]?\d+(?:\.\d+)?\s*% Movement Speed), up to [+](\d+(?:\.\d+)?)\s*%$/u);
      apply(row, capped?.[1] ?? line, scale, capped ? Number(capped[2]) : null);
    }
  }
  const moduleSlots = active.flatMap((slot, index) => slot?.modularization ? [{ slot, index }] : []);
  const optionCounts = new Map();
  for (const { slot } of moduleSlots) for (const id of Array.isArray(slot.modularization.moduleOptionIds) ? slot.modularization.moduleOptionIds : []) optionCounts.set(id, (optionCounts.get(id) ?? 0) + 1);
  for (const { slot, index } of moduleSlots) {
    const config = slot.modularization;
    const host = data.modules.find((s) => s.id === config.modularizationSkillId && s.itemId === slot.skillId);
    const en = data.pages["en/Hyperlink"]; const ko = data.pages["ko/Hyperlink"];
    const hostPage = data.pages["en/Modularization_Skill"];
    const ids = Array.isArray(config.moduleOptionIds) ? config.moduleOptionIds : [];
    const valid = host && Array.isArray(config.moduleOptionIds) && ids.length <= 3 && new Set(ids).size === ids.length
      && ids.every((id) => data.moduleOptions.some((o) => o.id === id)) && Number.isInteger(slot.level) && slot.level >= 1 && slot.level <= 100;
    const fingerprint = signature({ skillId: slot.skillId, config, hostHash: hostPage.sourcePageSha256 });
    for (const id of ids.length ? ids : [null]) {
      const identity = data.moduleOptions.find((s) => s.id === id);
      const matches = en.parsed.filter((r) => r.href === identity?.href);
      const entry = matches.length && matches.every((r) => r.detail === matches[0].detail) ? matches[0] : null;
      const translated = ko.parsed.find((r) => r.href === identity?.href);
      const row = make(`skills.active.${index}.modularization.${id ?? "empty"}`, identity?.itemId ?? slot.skillId,
        en, translated, identity?.href, entry?.detail, translated?.detail, valid && entry ? "" : "SS14 모듈 호스트·옵션 구성 연결을 확인하세요.");
      row.comparisonFingerprint = signature({ slot, inputs: Object.entries(build.ss14Inputs?.extensionInputs ?? {}).filter(([k]) => k.startsWith(`module:${index}:`)) });
      if (optionCounts.get(id) > 1) row.blockers.push({ reason: "같은 모듈 옵션의 여러 소환체·스킬 간 중첩 규칙 미확인으로 합산하지 않습니다." });
      if (row.blockers.length) continue;
      const enabled = control(row, `module:${index}:active`, `모듈 스킬 칸 ${index + 1} 효과 부여 소환체 존재`, "boolean", fingerprint);
      const moved = id === "source_surge" ? control(row, `module:${index}:moved10`, `모듈 스킬 칸 ${index + 1} 소환체가 최근 10m 초과 이동`, "boolean", fingerprint) : null;
      if (enabled === "") { row.blockers.push({ reason: "선택한 모듈의 효과를 부여하는 소환체가 현재 존재하는지 확인하세요." }); continue; }
      if (enabled === 0) { row.inactive.push({ reason: "입력한 소환체 부재 상태" }); continue; }
      for (const line of entry.detail.split("\n")) {
        if (advancedModuleLine(id, line, advancedExtensionContext(build, row, `module:${index}`, fingerprint, control), row)) continue;
        const pulse = line.match(/^When Minions summoned by this skill hit, \+50% chance to grant you and allies 1 stack of (Tenacity|Agility|Focus) Blessing$/u);
        if (pulse && /^source_(tenacity|agility|focus)_pulse$/u.test(id)) {
          const profile = seasonModuleProfile(slot.skillId), b = build.ss14Inputs?.dps?.skills?.[index];
          const rate = profile?.actions.reduce((n, a, i) => n + (a.detail.includes("Deals Persistent") ? 0 : b?.[`moduleRate${i}`] * b?.[`moduleHits${i}`]), 0)
            * b?.minionCount * b?.minionUptime / 100 * b?.hitChance / 100;
          if (!theaState(build) || build.ss14Inputs?.theaCycle?.mode !== "automatic") row.blockers.push({ reason: "소환체의 축복 획득은 티아1 자동 은총 계산을 켜세요." });
          else if (!Number.isFinite(rate) || rate < 0 || rate > 1000) row.blockers.push({ reason: "소환체 적중·개체 수·유지율을 입력하세요." });
          else { row.mechanics ??= []; row.mechanics.push({ kind: "thea-event", rate, chance: .5, blessing: pulse[1], gain: 1, sourceText: line }); }
          continue;
        }
        if (id === "program_frenzy" && line === "+25% additional damage when a Minion summoned by this skill is at Low Life") {
          row.mechanics ??= []; row.mechanics.push({ kind: "module-low-life", hostIndex: index, more: 25 }); continue;
        }
        if (id === "program_spell" && line === "+1 Max Spell Burst and +5% additional Spell Damage for Minions summoned by this skill") {
          row.minionEffects ??= []; row.minionEffects.push({ stat: "spell_damage", operation: "more", value: 5, path: row.path, hostIndex: index, target: "module-minion", receipt: row.receipt });
          row.mechanics ??= []; row.mechanics.push({ kind: "module-final-cast-rate-includes-burst", maxBurstBonus: 1 }); continue;
        }
        const owner = line.match(/^Minions summoned by this skill grant (.*?) to you and allies$/u);
        const minion = line.match(/^(.*?) for Minions summoned by this skill$/u);
        const surge = line.match(/^([+]\d+% additional Lightning Damage) to you and allies if Minions summoned by this skill have recently moved more than 10m$/u);
        if (owner) {
          const regen = owner[1].match(/^(\d+(?:\.\d+)?)% Life Regeneration$/u);
          if (id === "protocol_area" && owner[1] === "+60% Skill Area") {
            row.mechanics ??= []; row.mechanics.push({ kind: "skill-area", increased: 60 });
          } else if (id.startsWith("aura_overwrite_")) row.blockers.push({ reason: "이 오라의 SS14 1레벨 상세 수치가 연결되지 않아 계산할 수 없습니다." });
          else apply(row, regen ? `Regenerates ${regen[1]}% Life per second` : owner[1]);
        } else if (surge && id === "source_surge") {
          if (moved === "") row.blockers.push({ reason: "소환체의 최근 이동 조건을 직접 확인하세요. 자동 발동률을 추정하지 않습니다." });
          else if (moved === 1) apply(row, surge[1]);
          else row.inactive.push({ reason: "소환체 최근 이동 조건 미충족" });
        } else if (minion) {
          const parsed = moduleOptionEffects(minion[1], parseLines);
          row.minionEffects ??= [];
          row.minionEffects.push(...parsed.effects.map(e => ({ ...e, path: row.path, hostIndex: index, target: "module-minion", receipt: row.receipt })));
          row.blockers.push(...parsed.blockers);
        } else row.blockers.push({ sourceText: line, reason: id === "protocol_cold_penetration"
          ? "냉기 침투의 SS14 원문에 저항 감소와 받는 대미지 증가가 함께 있어 적용 규칙 확인이 필요합니다."
          : "이 모듈의 특수 효과 계산은 아직 지원하지 않습니다." });
      }
    }
  }
  for (const [index, slot] of (build.gear?.slots ?? []).entries()) {
    if (!slot?.itemId) continue;
    const selected = Object.values(slot.crafts ?? {});
    const sourceIds = new Set();
    for (const selectedCraft of selected) {
      const key = `${selectedCraft?.affixId}|${selectedCraft?.tierId}`;
      const identity = craftData.identities[key];
      const en = craftData.pages[`en/${identity?.slug}`]; const ko = craftData.pages[`ko/${identity?.slug}`];
      const unique = (p) => [...new Map((p?.rows ?? []).filter((r) => r.id === identity?.modifierId).map((r) => [signature(r), r])).values()];
      const matches = unique(en); const translated = unique(ko);
      const entry = matches.length === 1 ? matches[0] : null; const kr = translated.length === 1 ? translated[0] : null;
      const valid = index < 10 && craftData.gear[slot.itemId]?.includes(key) && entry && !sourceIds.has(identity.modifierId)
        && !slot.corrupted && !slot.legendaryDraft?.corrodedSlotIds?.length && !slot.affixText?.trim();
      if (identity) sourceIds.add(identity.modifierId);
      const row = make(`gear.slots.${index}.crafts.${selectedCraft?.affixId}`, slot.itemId, en,
        { name: kr?.text }, identity?.modifierId, entry?.text, kr?.text,
        valid ? "" : "제작 옵션의 SS14 동일 ID·단계·장비 종류 연결을 확인하지 못했거나 침식·사용자 변경 상태입니다.");
      row.group = "gear";
      row.comparisonFingerprint = signature({ slot, selectedCraft, inputs: Object.entries(build.ss14Inputs?.extensionInputs ?? {}).filter(([k]) => k.startsWith(`craft:${index}:`)) });
      if (row.blockers.length) continue;
      const fingerprint = signature({ itemId: slot.itemId, identity, text: entry.text });
      const fragments = entry.rollFragments;
      const tokens = [...entry.renderTemplate.matchAll(/\{\{roll_(\d+)\}\}/gu)].map((m) => Number(m[1]));
      if (tokens.length !== fragments.length || tokens.some((n, i) => n !== i + 1)) {
        row.blockers.push({ reason: "제작 범위 원문 구조 미검증" }); continue;
      }
      let complete = true;
      const values = fragments.map((fragment, ordinal) => {
        const range = memoryRange(fragment);
        if (!range) { if (/[()]/u.test(fragment)) complete = false; return fragment; }
        const key = `craft:${index}:${identity.modifierId}:${ordinal + 1}`;
        control(row, key, `장비 ${index + 1} 제작 옵션 ${identity.modifierId} 수치 ${ordinal + 1}`, "roll", fingerprint, range.max);
        const c = row.extensionControls.at(-1); c.min = range.min;
        // Revalidate after installing the source range (including negative rolls).
        const b = build.ss14Inputs?.extensionInputs?.[key];
        c.value = b?.sourceFingerprint === fingerprint && b.sourcePageSha256 === c.sourcePageSha256 && validExtensionValue(c, b.value) ? b.value : "";
        if (c.value === "") { complete = false; return fragment; }
        return `${range.positive && c.value >= 0 ? "+" : ""}${c.value}`;
      });
      if (!complete) { row.blockers.push({ reason: "제작 수치를 SS14 현재 범위에서 확인하세요. 이전 시즌 선택값은 자동 적용하지 않습니다." }); continue; }
      const render = (r) => r.renderTemplate.replace(/\{\{roll_(\d+)\}\}/gu, (_, n) => values[Number(n) - 1]);
      if (kr && signature(kr.rollFragments) === signature(fragments)) row.detail = safeKo(render(kr));
      apply(row, entry.renderTemplate ? render(entry) : entry.text);
    }
    // A repeated modifier ID is never applied even once: the complete selected
    // set is ambiguous, not a first-wins lookup.
    const craftRows = rows.filter((r) => r.path.startsWith(`gear.slots.${index}.crafts.`));
    for (const r of craftRows) if (craftRows.filter((x) => x.receipt?.sourceRecordKey === r.receipt?.sourceRecordKey).length > 1) {
      r.effects = []; r.blockers.push({ reason: "동일 제작 옵션이 중복되어 합산하지 않습니다." });
    }
  }
  for (const [kind, field, inventory, slug] of [["prism", "placedPrism", "prismInventory", "Ethereal_Prism"], ["inverse", "placedInverseImage", "inverseImageInventory", "Inverse_Image"]]) {
    const placement = build.talents?.[field];
    if (!placement) continue;
    const selected = build.talents?.[inventory]?.filter((r) => (r.instanceId ?? r.id) === placement.instanceId) ?? [];
    const item = selected.length === 1 ? selected[0] : null;
    const en = data.pages[`en/${slug}`]; const ko = data.pages[`ko/${slug}`];
    const ids = item ? Object.entries(item).filter(([k, v]) => /ModifierId$/u.test(k) && v != null && v !== "").map(([, v]) => String(v)) : [];
    const texts = ids.map((id) => en?.parsed.modifiers?.find((r) => r.id === id)?.text).filter(Boolean);
    const koTexts = ids.map((id) => ko?.parsed.modifiers?.find((r) => r.id === id)?.text).filter(Boolean);
    const row = make(`talents.${field}`, kind, en, { name: kind === "prism" ? "프리즘 이전 검토" : "역상 이전 검토" }, slug,
      texts.join("\n") || en?.parsed.body, koTexts.join("\n") || "선택 구성은 보존했습니다. 아래 미지원 사유를 확인하세요.",
      kind === "prism" ? "" : "역상 원문은 연결했지만 반사 영역·세 종류 재능 효과 배율의 SS14 수치 근거가 없어 과거 수치를 적용하지 않습니다.");
    row.group = "talents";
    row.comparisonFingerprint = signature({ placement, selected, board: build.talents?.boards?.[placement.boardIndex] });
    if (!item) row.blockers.push({ reason: "배치와 보관함 항목을 하나로 확인하지 못했습니다." });
    if (texts.length !== ids.length) row.blockers.push({ reason: "선택 옵션 일부의 현재 SS14 ID 원문을 찾지 못했습니다." });
    if (kind === "prism" && !row.blockers.length) {
      const plan = inspectSeasonPrism(build, item, en);
      if (!plan.supported) row.blockers.push({ reason: plan.reason });
      else {
        row.placementPreview = plan;
        const confirmed = control(row, "prism:layout", "현재 게임과 프리즘 배치·재능 좌표 일치 확인", "boolean", plan.fingerprint);
        if (confirmed !== 1) row.blockers.push({ reason: "기존 편집기의 재능 좌표는 SS14 자동 검증 자료가 아닙니다. 현재 게임 배치와 일치하는지 직접 확인해야 합니다." });
        else {
          apply(row, plan.effectText, plan.multiplier);
          if (!row.blockers.length) row.talentTransform = plan;
        }
      }
    }
  }
  const ingredientTiers = new Map();
  for (const row of rows.filter(r => r.ingredientTraitState)) {
    const { alt, tier } = row.ingredientTraitState;
    const values = ingredientTiers.get(alt) ?? new Set(); values.add(tier); ingredientTiers.set(alt, values);
  }
  for (const row of rows) {
    if (row.effects.some(e => e.stat === "damage_transferred_to_minion" && e.value > 100)) row.blockers.push({ reason: "대미지 이전율의 100% 초과 처리 근거가 없습니다." });
    for (const m of row.mechanics ?? []) if (m.kind === "ill-omen") {
      if (!theaCombatEnabled(build)) row.blockers.push({ reason: "오멘은 전투 조건에서 자동 은총과 복합 발동 계산을 켜세요." });
      if (!(m.maxLife > 0) || m.remainingLife > m.maxLife) row.blockers.push({ reason: "오멘 대상의 최대 HP와 남은 HP를 확인하세요." });
    }
    if (row.ingredientTraitState && ingredientTiers.get(row.ingredientTraitState.alt)?.size > 1) {
      row.effects = []; delete row.charging; row.blockers.push({ reason: "같은 특성에 속한 재료들의 확인 단계가 서로 다릅니다." });
    }
    if (row.extensionControls.some(c => c.key.startsWith("ingredient:") && c.key.endsWith(":minion") && c.value === 0)
      && rows.some(r => r.extensionControls.some(c => /^module:[0-4]:active$/u.test(c.key) && c.value === 1))) {
      row.effects = []; row.blockers.push({ reason: "소환체 없음 입력과 모듈 소환체 존재 입력이 서로 충돌합니다." });
    }
    row.status = row.blockers.length ? "partial" : "mapped";
  }
  return rows;
}

export function validSeasonExtensionInputs(build, controls) {
  const values = build.ss14Inputs?.extensionInputs;
  if (values === undefined) return true;
  if (!values || typeof values !== "object" || Array.isArray(values)) return false;
  return Object.entries(values).every(([key, b]) => {
    const craft = /^craft:[0-9]:\d+:[1-9]\d*$/u.test(key);
    const ingredient = /^ingredient:[01]:[a-z-]+:(tier|minion|rate)$/u.test(key);
    const advanced = /^(?:elixir:[01]|module:[0-4]):/u.test(key) && ADVANCED_EXTENSION_FIELDS[key.split(":")[2]];
    if (!craft && !ingredient && !advanced && !/^(elixir:[01]:(active|scale|uptime|netherIncludes|netherOtherEffect)|module:[0-4]:(active|moved10)|prism:layout)$/u.test(key) || !b
      || typeof b.sourceFingerprint !== "string" || b.sourceFingerprint.length > 20000
      || !/^[a-f0-9]{64}$/u.test(b.sourcePageSha256) || typeof b.value !== "number" || !Number.isFinite(b.value)
      || !craft && (b.value < (key.endsWith(":tier") ? 1 : 0) || b.value > (advanced ? advanced.max : key.endsWith(':netherOtherEffect')?1000:/:(scale|uptime)$/u.test(key) ? 100 : key.endsWith(":tier") ? 5 : key.endsWith(":rate") ? 2 : 1)
        || (advanced ? ["boolean", "count"].includes(advanced.kind) : !/:(scale|uptime|rate|netherOtherEffect)$/u.test(key)) && !Number.isInteger(b.value))) return false;
    const c = controls.find((c) => c.key === key && c.sourcePageSha256 === b.sourcePageSha256);
    return !c || validExtensionValue(c, b.value);
  });
}
