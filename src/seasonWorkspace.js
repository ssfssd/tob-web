import { normalizeBuild } from "./engine.js";
import { calculateSeasonBuild } from "./seasonBuild.js";
import { validTheaInputs } from "./seasonTheaCycle.js";
import { validTheaEventValue, THEA_EVENT_FIELDS } from "./seasonTheaEvents.js";
import { theaEffectsPin } from "./seasonTheaSpecials.js";
import { theaCombatPin } from "./seasonTheaCombatInputs.js";
import { isThea, revelationBoardOptions, revelationNodeOptions, theaRulePin } from "./seasonTheaRevelation.js";
import { prepareSeasonMigration, reopenSeasonResearchCopy, isSeasonMigrationSource } from "./seasonMigration.js";
import { applySeasonSelections, getSeasonSelectionOptions, getSeasonSelectionRecord } from "./seasonSelections.js";
import { parseTlidbGearTooltip } from "./tlidbGearTooltipCalculation.js";
import { validLogGear, editLogGearRoll } from "./seasonLogGear.js";
import { applyLogSlates } from "./seasonLogSlates.js";
import { applySeasonConfigurations, captureSeasonConfiguration, compareSeasonConfigurations, SEASON_CONFIGURATION_GROUPS, validSeasonConfigurations, validPactAllocations } from "./seasonConfiguration.js";
import { applySeasonSupportSelections, seasonSupportItem, seasonSupportOptions } from "./seasonSupport.js";
import { pinSeasonComponentReceipts, projectSeasonComponents, validSeasonConditionValue } from "./seasonComponents.js";
import { SEASON_CHARACTER_INPUTS, seasonRulePins } from "./seasonCharacter.js";
import { seasonOffenseRulePins, validBaseCriticalRating } from "./seasonOffense.js";
import { seasonGameCritical, validGameCriticalBinding } from "./seasonGameData.js";
import { rebindSeasonSkillInputs } from './seasonSkillInputs.js';
import { SEASON_BLESSINGS, validBlessingCount, seasonBlessingPins } from "./seasonBlessings.js";
import { seasonMemoryRows, validSeasonMemoryBases, validSeasonMemoryRolls } from "./seasonMemories.js";
import { validMemoryRollValue } from "./seasonMemoryRolls.js";
import { validSeasonDestinyRolls } from "./seasonDestiny.js";
import { validSeasonExtensionInputs, validExtensionValue } from "./seasonExtensions.js";
import { validSeasonDpsInputs, editSeasonDpsInput } from "./seasonDps.js";
import { trainingDummyLevels } from "./seasonTrainingDummy.js";
import { validMemoryQuality } from './seasonMemoryQuality.js';
import { validHeroCombatInputs, SEASON_HERO_COMBAT_FIELDS, validCombatValue, seasonMechanicPins } from "./seasonMechanicInputs.js";
import { validBingEvents, editBingEvents } from './seasonBingRecovery.js';
import { applyShelf } from './seasonShelf.js';
import { applySeasonSlateSelections, validSeasonSlateSelections, seasonSlateTemplates, seasonSlateOptions } from "./seasonDivinity.js";
import { applySeasonHeroSelection, validSeasonHeroSelection, editSeasonHeroSelection } from "./seasonHeroSelection.js";
import { editNativeSeasonSelection } from "./seasonNativeSelections.js";
import { editNativeDivinity } from "./seasonNativeDivinity.js";
import { editNativeExtension, clearNativeExtension, nativeModuleOptions, nativeElixirOptions, nativeModuleForItem } from "./seasonNativeExtensions.js";
import { validLogReview, editLogReview, LOG_REVIEW_GROUPS } from "./seasonLogReview.js";

export const SEASON_WORKSPACE_STORAGE_KEY = "tob.season-workspaces.v1";
const MODEL = "tlidb-ss14-editable-v1";
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const json = (value) => JSON.stringify(value);
const sharedBase = () => ({ id: "tob-shared-base-v1", name: "공유 빌드", patchSnapshot: { season: "SS14", shared: true } });
const patch = () => ({ season: "SS14", baselineSeason: "SS14", overlaySeason: "SS14", overlayState: "season-workspace",
  overlayApplicationComplete: false, calculationModel: MODEL });

function targetFor(source, id, name, levels, inputs) {
  const base = applySeasonConfigurations(source, inputs.configurations);
  const target = structuredClone(base);
  Object.assign(target, { id, name, patchSnapshot: patch(), ss14Inputs: structuredClone(inputs), skillLevels: [...levels] });
  const selected = normalizeBuild(base).selections.skills;
  const activeCount = target.skills?.active?.length ?? 5;
  selected.forEach((skillId, rowIndex) => {
    if (!skillId) return;
    const category = rowIndex < activeCount ? "active" : "passive";
    const index = rowIndex < activeCount ? rowIndex : rowIndex - activeCount;
    target.skills ??= { active: [], passive: [] };
    target.skills[category] ??= [];
    target.skills[category][index] = { ...target.skills[category][index], skillId, level: levels[rowIndex] };
  });
  return applySeasonHeroSelection(applySeasonSlateSelections(applySeasonSupportSelections(applySeasonSelections(target, inputs.selections, levels, inputs.selectionMode === "isolated-v1"), inputs.supportSelections), inputs.slateSelections), inputs);
}

function validDocument(document) {
  if (!object(document) || document.schemaVersion !== 1 || !Number.isInteger(document.revision) || document.revision < 0
    || typeof document.id !== "string" || !document.id || document.id === document.sourceBuild?.id
    || !(isSeasonMigrationSource(document.sourceBuild) || json(document.sourceBuild) === json(sharedBase()))
    || !Number.isFinite(Date.parse(document.createdAt)) || !Number.isFinite(Date.parse(document.updatedAt))) return false;
  const target = document.targetBuild;
  if (!object(target) || typeof target.name !== "string" || !target.name.trim() || target.name.length > 160
    || !Array.isArray(target.skillLevels) || !object(target.ss14Inputs) || target.ss14Inputs.schemaVersion !== 1
    || !object(target.ss14Inputs.gear) || !object(target.ss14Inputs.skills)) return false;
  const changes = target.ss14Inputs.selections;
  if (target.ss14Inputs.selectionMode !== undefined && target.ss14Inputs.selectionMode !== "isolated-v1") return false;
  if (changes !== undefined) {
    if (!object(changes) || Object.keys(changes).some((key) => !["gear", "skills"].includes(key))) return false;
    for (const category of ["gear", "skills"]) {
      if (!object(changes[category])) return false;
      for (const [key, id] of Object.entries(changes[category])) {
        if (!/^(0|[1-9]\d*)$/u.test(key) || Number(key) >= (category === "gear" ? 10 : 9)
          || (id !== null && !getSeasonSelectionOptions(category, Number(key)).some((row) => row.id === id))) return false;
      }
    }
  }
  if (!validSeasonConfigurations(target.ss14Inputs.configurations) || !validPactAllocations(target.pact)) return false;
  if (!validLogReview(target.ss14Inputs.logReview)) return false;
  if (!validSeasonHeroSelection(target.ss14Inputs)) return false;
  if (!validSeasonDpsInputs(target.ss14Inputs)) return false;
  if (!validHeroCombatInputs(target.ss14Inputs)) return false;
  if (!validBingEvents(target.ss14Inputs.bingBurstEvents)) return false;
  if(target.ss14Inputs.equippedTraitLevels!==undefined && (!Number.isInteger(target.ss14Inputs.equippedTraitLevels)||target.ss14Inputs.equippedTraitLevels<0||target.ss14Inputs.equippedTraitLevels>7))return false;
  if (!validTheaInputs(target.ss14Inputs)) return false;
  if (!validSeasonSlateSelections(target)) return false;
  if (!validSeasonMemoryBases(target) || !((target.hero?.memories ?? []).every(validMemoryQuality))) return false;
  if (!validSeasonMemoryRolls(target)) return false;
  if (target.ss14Inputs.extensionInputs !== undefined && !validSeasonExtensionInputs(target, projectSeasonComponents(target).rows.flatMap((r) => r.extensionControls ?? []))) return false;
  if (target.ss14Inputs.destinyRolls !== undefined && !validSeasonDestinyRolls(target, projectSeasonComponents(target).rows.flatMap((r) => r.destinyRollControls ?? []))) return false;
  if (target.ss14Inputs.blessings !== undefined && (!object(target.ss14Inputs.blessings)
    || !Object.entries(target.ss14Inputs.blessings).every(([key, value]) => SEASON_BLESSINGS.includes(key) && validBlessingCount(value)))) return false;
  if (target.ss14Inputs.blessingRuleReceipts !== undefined && (!object(target.ss14Inputs.blessingRuleReceipts)
    || !Object.entries(target.ss14Inputs.blessingRuleReceipts).every(([url, hash]) => /^https:\/\/tlidb\.com\/en\/(Focus|Agility|Tenacity)_Blessing$/u.test(url) && /^[a-f0-9]{64}$/u.test(hash)))) return false;
  if (target.ss14Inputs.offenseRuleReceipts !== undefined && (!object(target.ss14Inputs.offenseRuleReceipts)
    || !Object.entries(target.ss14Inputs.offenseRuleReceipts).every(([url, hash]) => /^https:\/\/tlidb\.com\/en\/(Critical_Strike|Lucky|Double_Damage)$/u.test(url) && /^[a-f0-9]{64}$/u.test(hash)))) return false;
  if (target.ss14Inputs.offense !== undefined && (!object(target.ss14Inputs.offense)
    || !Object.entries(target.ss14Inputs.offense).every(([key, binding]) => /^[0-8]$/u.test(key)
      && object(binding) && typeof binding.itemId === "string" && /^[a-f0-9]{64}$/u.test(binding.sourcePageSha256)
      && validBaseCriticalRating(binding.baseCriticalRating) && validGameCriticalBinding(binding)))) return false;
  if (target.ss14Inputs.character !== undefined && (!object(target.ss14Inputs.character)
    || !Object.entries(target.ss14Inputs.character).every(([key, value]) => SEASON_CHARACTER_INPUTS[key]
      && typeof value === "number" && Number.isFinite(value) && value >= SEASON_CHARACTER_INPUTS[key].min
      && value <= SEASON_CHARACTER_INPUTS[key].max && (key !== "enemyLevel" || Number.isInteger(value))))) return false;
  if (target.ss14Inputs.componentConditions !== undefined && (!object(target.ss14Inputs.componentConditions)
    || !Object.entries(target.ss14Inputs.componentConditions).every(([key, binding]) => key.length > 0 && key.length < 2000
      && object(binding) && Number.isInteger(binding.value) && binding.value >= 0 && binding.value <= 1000
      && /^[a-f0-9]{64}$/u.test(binding.sourcePageSha256)))) return false;
  if (target.ss14Inputs.componentConditions) {
    const controls = projectSeasonComponents(target).rows.flatMap((r) => r.conditionControls);
    for (const [key, binding] of Object.entries(target.ss14Inputs.componentConditions)) {
      const control = controls.find((c) => c.key === key && c.sourcePageSha256 === binding.sourcePageSha256);
      if (control && !validSeasonConditionValue(control, binding.value)) return false;
    }
  }
  if (target.ss14Inputs.ruleReceipts !== undefined && (!object(target.ss14Inputs.ruleReceipts)
    || !Object.entries(target.ss14Inputs.ruleReceipts).every(([url, hash]) => /^https:\/\/tlidb\.com\/(en|ko)\/[^?#]+$/u.test(url) && /^[a-f0-9]{64}$/u.test(hash)))) return false;
  if (target.ss14Inputs.componentReceipts !== undefined && (!object(target.ss14Inputs.componentReceipts)
    || !Object.entries(target.ss14Inputs.componentReceipts).every(([url, hash]) => /^https:\/\/tlidb\.com\/en\/[^?#]+$/u.test(url) && /^[a-f0-9]{64}$/u.test(hash)))) return false;
  if (target.ss14Inputs.heroTiers !== undefined && (!object(target.ss14Inputs.heroTiers)
    || !Object.values(target.ss14Inputs.heroTiers).every((binding) => object(binding) && Number.isInteger(binding.tier)
      && binding.tier >= 1 && binding.tier <= 6 && /^[a-f0-9]{64}$/u.test(binding.sourcePageSha256)))) return false;
  if (target.ss14Inputs.supportSelections !== undefined && (!object(target.ss14Inputs.supportSelections)
    || !Object.entries(target.ss14Inputs.supportSelections).every(([key, row]) => /^[0-8]:[0-4]$/u.test(key)
      && (row === null || object(row) && seasonSupportOptions().some((option) => option.id === row.supportId)
        && Number.isInteger(row.level) && row.level >= 1 && row.level <= 100)))) return false;
  const normalized = normalizeBuild(applySeasonSupportSelections(applySeasonSelections(
    applySeasonConfigurations(document.sourceBuild, target.ss14Inputs.configurations), changes, target.skillLevels,
    target.ss14Inputs.selectionMode === "isolated-v1"), target.ss14Inputs.supportSelections));
  if (Object.entries(target.ss14Inputs.offense ?? {}).some(([key, binding]) => binding.itemId !== normalized.selections.skills[Number(key)])) return false;
  if (Object.entries(target.ss14Inputs.dps?.skills ?? {}).some(([key, binding]) => binding.itemId !== normalized.selections.skills[Number(key)])) return false;
  if (target.skillLevels.length !== normalized.skillLevels.length
    || !target.skillLevels.every((value, index) => Number.isInteger(value) && (normalized.selections.skills[index] ? value >= 1 && value <= 100 : value >= 0 && value <= 100))) return false;
  for (const [slotIndex, binding] of Object.entries(target.ss14Inputs.gear)) {
    if (!/^\d+$/u.test(slotIndex) || !object(binding) || binding.itemId !== normalized.gear.slots[Number(slotIndex)]?.itemId
      || !/^[a-f0-9]{64}$/u.test(binding.sourcePageSha256) || !object(binding.rolls)
      || !Object.values(binding.rolls).every((value) => typeof value === "number" && Number.isFinite(value))) return false;
    if (binding.logGear !== undefined && (!validLogGear(binding.logGear, binding.itemId) || Object.keys(binding.rolls).length)) return false;
    const record = getSeasonSelectionRecord("gear", binding.itemId);
    // Old receipt versions remain readable but are blocked by the calculator.
    if (record?.sourcePageSha256 === binding.sourcePageSha256) {
      const controls = parseTlidbGearTooltip({ id: binding.itemId, categoryId: "gear", tlidbText: { en: {
        ...record, sourcePageVersion: "SS14", sourceFieldStatus: { detail: "exact" },
      } } }, { season: "SS14", flavorReceipt: record.flavorReceipt }).effects.filter((row) => row.roll);
      for (const [key, value] of Object.entries(binding.rolls)) {
        const effect = controls.find((row) => row.roll.key === key);
        if (!effect || value < effect.roll.min || value > effect.roll.max) return false;
        if (controls.some((row) => row.sourceText === effect.sourceText && row.roll.min === effect.roll.min
          && row.roll.max === effect.roll.max && binding.rolls[row.roll.key] !== value)) return false;
      }
    }
  }
  for (const [rowIndex, binding] of Object.entries(target.ss14Inputs.skills)) {
    if (!/^\d+$/u.test(rowIndex) || !object(binding) || binding.itemId !== normalized.selections.skills[Number(rowIndex)]
      || !/^[a-f0-9]{64}$/u.test(binding.sourcePageSha256)) return false;
  }
  if (target.ss14Inputs.supports !== undefined) {
    if (!object(target.ss14Inputs.supports)) return false;
    for (const [key, binding] of Object.entries(target.ss14Inputs.supports)) {
      const [row, column] = key.split(":").map(Number);
      const slot = row < 5 ? normalized.skills.active[row] : normalized.skills.passive[row - 5];
      if (!/^[0-8]:[0-4]$/u.test(key) || !object(binding) || binding.itemId !== slot?.supports?.[column]?.supportId
        || !/^[a-f0-9]{64}$/u.test(binding.sourcePageSha256)) return false;
      if (binding.rolls !== undefined && (!object(binding.rolls)
        || Object.entries(binding.rolls).some(([k,v]) => !/^range-\d+$/u.test(k) || !Number.isFinite(v)))) return false;
      if (binding.conditions !== undefined && (!object(binding.conditions)
        || Object.entries(binding.conditions).some(([k,v]) => !(k === "jumpsBeforeHit" || k === 'sameTargetHits' || /^repeat(?:Jump|DelayMs)-[1-9]\d?$/u.test(k) || /^snapshot-\d+$/u.test(k))
          || !Number.isInteger(v) || v < (k === 'sameTargetHits' || k.startsWith('repeatJump-') ? 1 : 0)
          || v > (k.startsWith('repeatDelayMs-') ? 1800000 : /^snapshot-/u.test(k) ? 1000000000 : 100)))) return false;
      if (binding.tier !== undefined && !seasonSupportItem(binding.itemId)?.tlidbText.en.supportTiers?.some(t => t.tier === binding.tier)) return false;
    }
  }
  if(Object.values(target.ss14Inputs.blessings??{}).some(v=>v>4)) {
    const caps=calculateSeasonBuild(target,{includeTheaAverage:false}).blessings.caps;
    if(Object.entries(target.ss14Inputs.blessings).some(([key,value])=>value>caps[key]))return false;
  }
  return json(target) === json(targetFor(document.sourceBuild, document.id, target.name, target.skillLevels, target.ss14Inputs));
}

export function createSeasonWorkspace(draft, { now = new Date(), id = globalThis.crypto.randomUUID() } = {}) {
  const checked = reopenSeasonResearchCopy(draft);
  const sourceBuild = structuredClone(checked.sourceBuild);
  const normalized = normalizeBuild(sourceBuild);
  const inputs = { schemaVersion: 1, gear: {}, skills: {}, supports: {}, componentReceipts: pinSeasonComponentReceipts(sourceBuild), ruleReceipts: seasonRulePins() };
  for (const row of checked.report.components.filter((row) => row.category === "gear")) {
    for (const entry of row.calculations ?? []) {
      if (entry.receipt?.sourcePageSha256 && entry.rollValues) inputs.gear[entry.slotIndex] = {
        itemId: row.id, sourcePageSha256: entry.receipt.sourcePageSha256, rolls: { ...entry.rollValues },
      };
    }
  }
  for (const row of checked.report.components.filter((row) => row.category === "skills")) {
    for (const entry of row.calculations ?? []) {
      if (entry.receipt?.sourcePageSha256) inputs.skills[entry.rowIndex] = { itemId: row.id, sourcePageSha256: entry.receipt.sourcePageSha256 };
    }
  }
  [...normalized.skills.active, ...normalized.skills.passive].forEach((slot, row) => (slot?.supports ?? []).forEach((support, column) => {
    const record = seasonSupportItem(support?.supportId)?.tlidbText.en;
    if (record) inputs.supports[`${row}:${column}`] = { itemId: support.supportId, sourcePageSha256: record.sourcePageSha256 };
  }));
  return { schemaVersion: 1, id, revision: 0, createdAt: now.toISOString(), updatedAt: now.toISOString(), sourceBuild,
    targetBuild: targetFor(sourceBuild, id, `${sourceBuild.name || "빌드"} · SS14`, normalized.skillLevels, inputs) };
}

export function editSeasonWorkspace(document, edit) {
  if (!validDocument(document)) throw new Error("SS14 편집 문서 형식을 확인할 수 없습니다.");
  const next = structuredClone(document);
  const target = next.targetBuild;
  if (edit.kind === "name") {
    if (typeof edit.value !== "string" || !edit.value.trim() || edit.value.trim().length > 160) throw new Error("빌드 이름을 1~160자로 입력하세요.");
    target.name = edit.value.trim();
  } else if (edit.kind === 'shelf-apply') {
    applyShelf(target,edit.value,edit.slotIndex);
  } else if (edit.kind === "log-review-reset") {
    target.ss14Inputs.logReview = Object.fromEntries(Object.keys(LOG_REVIEW_GROUPS).filter(k => k !== 'divinity' || edit.value !== 1).map(k => [k, null]));
  } else if (edit.kind === "log-review") {
    editLogReview(target, edit.key, edit.value);
  } else if (["hero-selection", "hero-choice"].includes(edit.kind)) {
    if(edit.kind==='hero-selection' && edit.value!==target.hero?.branchId)delete target.ss14Inputs.bingBurstEvents;
    editSeasonHeroSelection(target, edit);
    applySeasonHeroSelection(target, target.ss14Inputs);
    target.ss14Inputs.configurations ??= {};
    target.ss14Inputs.configurations.hero = captureSeasonConfiguration(target, "hero");
  } else if (['bing-event-add','bing-event','bing-event-source','bing-event-remove'].includes(edit.kind)) {
    if(!projectSeasonComponents(target).rows.some(r=>r.mechanics?.some(m=>m.kind==='burst-essence')))throw Error('크리에이티브 대폭발을 활성화하세요.');
    editBingEvents(target.ss14Inputs,edit);
  } else if (edit.kind === "thea-event") {
    if (!isThea(target) || edit.value !== "" && !validTheaEventValue(edit.key, edit.value)
      || edit.value === "" && !Object.hasOwn(THEA_EVENT_FIELDS, edit.key)) throw new Error("축복 발동 조건의 입력 범위를 확인하세요.");
    target.ss14Inputs.theaEvents ??= {};
    if (edit.value === "") delete target.ss14Inputs.theaEvents[edit.key];
    else target.ss14Inputs.theaEvents[edit.key] = edit.value;
    if (edit.value === 1 && ["igniteEnabled", "numbedEnabled"].includes(edit.key)) {
      const defaults = edit.key === "igniteEnabled" ? { igniteDuration: 4, igniteLimit: 1, igniteChance: 0, igniteIncreased: 0, afflictionRate: 0 }
        : { numbedDuration: 2, numbedLimit: 10, numbedThreshold: 10, numbedEffect: 0, numbedChance: 0 };
      for (const [key, value] of Object.entries(defaults)) target.ss14Inputs.theaEvents[key] ??= value;
    }
    target.ss14Inputs.theaEffectsReceipt = theaEffectsPin();
    target.ss14Inputs.theaCombatReceipt = theaCombatPin();
  } else if (["thea-mode", "thea-cycle-input", "thea-rules"].includes(edit.kind)) {
    if (!isThea(target)) throw new Error("티아1 사본에서 사용할 수 있습니다.");
    const cycle = target.ss14Inputs.theaCycle ?? { mode: "snapshot", seconds: 300, warmup: 0 };
    if (edit.kind === "thea-mode") {
      if (![0, 1].includes(edit.value)) throw new Error("은총 계산 방식을 선택하세요.");
      cycle.mode = edit.value ? "automatic" : "snapshot";
    } else if (edit.kind === "thea-cycle-input") {
      if (!["seconds", "warmup"].includes(edit.key)) throw new Error("은총 측정 시간을 확인하세요.");
      cycle[edit.key] = edit.value;
    }
    if (!validTheaInputs({ theaCycle: cycle })) throw new Error("측정은 1~1800초, 준비 시간은 0~1800초로 입력하세요.");
    target.ss14Inputs.theaCycle = cycle;
    target.ss14Inputs.theaRulesReceipt = theaRulePin();
    target.ss14Inputs.theaEffectsReceipt = theaEffectsPin();
    target.ss14Inputs.theaCombatReceipt = theaCombatPin();
    target.ss14Inputs.blessingRuleReceipts = seasonBlessingPins();
  } else if (["thea-board", "thea-node"].includes(edit.kind)) {
    if (!isThea(target)) throw new Error("티아1 사본에서 사용할 수 있습니다.");
    target.talents ??= { boards: [] };
    if (edit.kind === "thea-board") {
      if (!revelationBoardOptions().some(r => r.slug === edit.value)) throw new Error("계시의 예언이 지원하는 재능 보드를 선택하세요.");
      if (target.talents.boards[3]?.treeSlug === edit.value) return next;
      if ([target.talents.placedPrism, target.talents.placedInverseImage].some(p => p?.boardIndex === 3)) throw new Error("기존 4번째 보드의 프리즘·역상 배치를 먼저 해제하세요.");
      target.talents.boards[3] = { boardId: null, slotType: "sub", treeSlug: edit.value, nodePoints: {}, reflectedNodePoints: {}, selectedNodeIds: [], coreTalentIds: [] };
    } else {
      const node = revelationNodeOptions(target).find(r => r.id === edit.key);
      if (!node || !Number.isInteger(edit.value) || edit.value < 0 || edit.value > node.max) throw new Error("재능 포인트가 노드의 상한을 벗어났습니다.");
      const board = target.talents.boards[3];
      if (node.core) board.coreTalentIds = [...new Set([...(board.coreTalentIds ?? []).filter(id => id !== node.id), ...(edit.value ? [node.id] : [])])];
      else {
        if (edit.value) board.nodePoints[node.id] = edit.value; else delete board.nodePoints[node.id];
        board.selectedNodeIds = Object.keys(board.nodePoints);
      }
    }
    const selected = target.talents.boards.flatMap(b => [...Object.entries(b?.nodePoints ?? {}).filter(([, n]) => n > 0).map(([id]) => id), ...(b?.coreTalentIds ?? [])]);
    target.selections = { ...target.selections, talents: selected };
    target.selectionProjection = { ...target.selectionProjection, talents: selected };
    target.ss14Inputs.configurations ??= {};
    target.ss14Inputs.configurations.talents = captureSeasonConfiguration(target, "talents");
    target.ss14Inputs.theaRulesReceipt = theaRulePin();
    target.ss14Inputs.componentReceipts = { ...target.ss14Inputs.componentReceipts, ...pinSeasonComponentReceipts(target, ["talents"]) };
  } else if (edit.kind === "skill-level") {
    if (!Number.isInteger(edit.rowIndex) || !normalizeBuild(target).selections.skills[edit.rowIndex]
      || !Number.isInteger(edit.value) || edit.value < 1 || edit.value > 100) throw new Error("선택한 스킬의 레벨을 1~100 사이 정수로 입력하세요.");
    target.skillLevels[edit.rowIndex] = edit.value;
  } else if (["skill-selection", "gear-selection"].includes(edit.kind)) {
    const category = edit.kind === "gear-selection" ? "gear" : "skills";
    const index = category === "gear" ? edit.slotIndex : edit.rowIndex;
    const id = edit.value === "" ? null : edit.value;
    if (!Number.isInteger(index) || index < 0 || index >= (category === "gear" ? 10 : 9)
      || (id !== null && !getSeasonSelectionOptions(category, index).some((row) => row.id === id))) {
      throw new Error("해당 칸에 맞는 SS14 원문이 확인된 항목을 선택하세요.");
    }
    const oldId = category === "gear" ? normalizeBuild(target).gear.slots[index]?.itemId : normalizeBuild(target).selections.skills[index];
    if ((oldId || null) === id) return next;
    if (category === "skills" && id) {
      const module = nativeModuleForItem(id), elixir = nativeElixirOptions().find(o => o.itemId === id);
      if (module || elixir) {
        const bottles = target.skills.elixirs ?? [];
        const currentBottle = bottles.findIndex(s => nativeElixirOptions().find(o => o.id === s?.skillId)?.itemId === oldId);
        const freeBottle = [0, 1].find(i => !bottles[i]);
        const bottle = currentBottle >= 0 ? currentBottle : freeBottle;
        if (elixir && bottle === undefined) throw new Error("영약은 두 개까지 장착할 수 있습니다. 기존 영약을 먼저 해제하세요.");
        editNativeExtension(target, { kind: module ? "module-selection" : "elixir-selection", slotIndex: module ? index : bottle, rowIndex: index, value: (module ?? elixir).id });
        next.targetBuild = targetFor(next.sourceBuild, next.id, target.name, target.skillLevels, target.ss14Inputs);
        return next;
      }
    }
    target.ss14Inputs.selections ??= { gear: {}, skills: {} };
    target.ss14Inputs.selectionMode = "isolated-v1";
    target.ss14Inputs.selections[category][index] = id;
    // Equipment changes preserve encounter inputs. Weapon-dependent values are
    // derived from the selected SS14 weapon, so stale manual values are ignored.
    delete target.ss14Inputs[category][index];
    if (id) {
      const record = getSeasonSelectionRecord(category, id);
      target.ss14Inputs[category][index] = { itemId: id, sourcePageSha256: record.sourcePageSha256,
        ...(category === "gear" ? { rolls: {} } : {}) };
    }
    if (category === "skills") {
      if (index < 5) clearNativeExtension(target, index);
      rebindSeasonSkillInputs(target.ss14Inputs, index, id);
      target.skillLevels = Array.from({ length: 9 }, (_, row) => target.skillLevels[row] ?? 0);
      target.skillLevels[index] = id ? 20 : 0;
    }
  } else if (["support-roll", "support-condition"].includes(edit.kind)) {
    const key = `${edit.rowIndex}:${edit.supportIndex}`;
    const current = calculateSeasonBuild(target).components.filter(c => c.category === "supports")
      .flatMap(c => c.calculations ?? []).find(c => c.rowIndex === edit.rowIndex && c.supportIndex === edit.supportIndex);
    const condition = edit.kind === "support-condition";
    const control = (condition ? current?.conditionControls : current?.controls)?.find(c => c.key === edit.key);
    if (!control || edit.value !== "" && (!Number.isFinite(edit.value) || edit.value < control.min || edit.value > control.max || control.integer && !Number.isInteger(edit.value)))
      throw new Error("보조 옵션 수치의 허용 범위를 확인하세요.");
    const binding = target.ss14Inputs.supports[key];
    const group = condition ? "conditions" : "rolls";
    binding[group] ??= {};
    if (edit.value === "") delete binding[group][edit.key];
    else binding[group][edit.key] = edit.value;
  } else if (edit.kind === "support-tier") {
    const key = `${edit.rowIndex}:${edit.supportIndex}`, binding = target.ss14Inputs.supports?.[key];
    if (!binding || !seasonSupportItem(binding.itemId)?.tlidbText.en.supportTiers?.some(t => t.tier === edit.value))
      throw new Error("보조 옵션 등급을 확인하세요.");
    binding.tier = edit.value; delete binding.rolls;
  } else if (["support-selection", "support-level"].includes(edit.kind)) {
    const key = `${edit.rowIndex}:${edit.supportIndex}`;
    const normalized = normalizeBuild(target);
    const slot = edit.rowIndex < 5 ? normalized.skills.active[edit.rowIndex] : normalized.skills.passive[edit.rowIndex - 5];
    if (!/^[0-8]:[0-4]$/u.test(key) || !slot?.skillId) throw new Error("선택 스킬의 보조 칸을 확인하세요.");
    const old = slot.supports?.[edit.supportIndex];
    const id = edit.kind === "support-selection" ? edit.value || null : old?.supportId;
    const level = edit.kind === "support-level" ? edit.value : seasonSupportItem(id)?.tlidbText.en.cardLevel ?? 20;
    if ((id && !seasonSupportOptions().some((row) => row.id === id)) || !Number.isInteger(level) || level < 1 || level > 100
      || (id && edit.supportIndex >= slot.unlockedSupportCount)) throw new Error("열린 보조 칸과 SS14 보조·레벨(1~100)을 확인하세요.");
    target.ss14Inputs.supportSelections ??= {};
    target.ss14Inputs.supports ??= {};
    target.ss14Inputs.supportSelections[key] = id ? { supportId: id, level } : null;
    delete target.ss14Inputs.supports[key];
    if (id) target.ss14Inputs.supports[key] = { itemId: id, sourcePageSha256: seasonSupportItem(id).tlidbText.en.sourcePageSha256 };
  } else if (edit.kind === "extension-input") {
    const row = projectSeasonComponents(target).rows.find((r) => r.extensionControls?.some((c) => c.key === edit.key));
    const c = row?.extensionControls.find((c) => c.key === edit.key);
    if (!c || !validExtensionValue(c, edit.value)) throw new Error("SS14 영약·모듈·제작 확인 입력의 허용 범위를 확인하세요.");
    target.ss14Inputs.extensionInputs ??= {};
    if (edit.value === "") delete target.ss14Inputs.extensionInputs[edit.key];
    else target.ss14Inputs.extensionInputs[edit.key] = { sourceFingerprint: c.sourceFingerprint, sourcePageSha256: c.sourcePageSha256, value: edit.value };
  } else if (edit.kind === "memory-base") {
    const row = seasonMemoryRows(target).find((r) => r.memoryControl?.key === edit.key);
    const c = row?.memoryControl; const option = c?.options.find((o) => o.value === edit.value);
    if (!c || edit.value !== "" && !option) throw new Error("선택한 추억의 SS14 원문 기본 수치를 확인하세요.");
    target.ss14Inputs.memoryBases ??= {};
    if (edit.value === "") delete target.ss14Inputs.memoryBases[edit.key];
    else target.ss14Inputs.memoryBases[edit.key] = { instanceId: c.instanceId, baseAttributeId: c.baseAttributeId,
      enhancement: c.enhancement, modifierId: option.value, sourcePageSha256: option.sourcePageSha256 };
    target.ss14Inputs.componentReceipts ??= {};
    target.ss14Inputs.componentReceipts[row.page.sourceUrl] = row.page.sourcePageSha256;
  } else if (edit.kind === "memory-roll") {
    const row = seasonMemoryRows(target).find((r) => r.memoryRollControls?.some((c) => c.key === edit.key));
    const c = row?.memoryRollControls.find((c) => c.key === edit.key);
    if (!c || edit.value !== "" && !validMemoryRollValue(c, edit.value)) throw new Error("추억 옵션 수치를 SS14 원문 범위 안에서 입력하세요.");
    target.ss14Inputs.memoryRolls ??= {};
    if (edit.value === "") delete target.ss14Inputs.memoryRolls[edit.key];
    else target.ss14Inputs.memoryRolls[edit.key] = { instanceId: c.instanceId, affixId: c.affixId, tierId: c.tierId,
      modifierId: c.modifierId, sourcePageSha256: c.sourcePageSha256, value: edit.value };
    target.ss14Inputs.componentReceipts ??= {};
    target.ss14Inputs.componentReceipts[row.page.sourceUrl] = row.page.sourcePageSha256;
  } else if (edit.kind === "destiny-roll") {
    const row = projectSeasonComponents(target).rows.find((r) => r.destinyRollControls?.some((c) => c.key === edit.key));
    const c = row?.destinyRollControls.find((c) => c.key === edit.key);
    if (!c || edit.value !== "" && !validMemoryRollValue(c, edit.value)) throw new Error("운명 수치를 SS14 원문 범위 안에서 입력하세요.");
    target.ss14Inputs.destinyRolls ??= {};
    if (edit.value === "") delete target.ss14Inputs.destinyRolls[edit.key];
    else target.ss14Inputs.destinyRolls[edit.key] = { instanceId: c.instanceId, destinyId: c.destinyId,
      modifierId: c.modifierId, sourcePageSha256: c.sourcePageSha256, value: edit.value };
    target.ss14Inputs.componentReceipts ??= {};
    target.ss14Inputs.componentReceipts[row.receipt.sourceUrl] = row.receipt.sourcePageSha256;
  } else if (edit.kind === "hero-tier") {
    const row = projectSeasonComponents(target).rows.find((row) => row.control?.choiceId === edit.key);
    if (!row?.control || (edit.value !== "" && (!Number.isInteger(edit.value) || edit.value < 1 || edit.value > row.control.maxTier))) throw new Error("SS14 원문에 있는 특성 단계를 선택하세요.");
    target.ss14Inputs.heroTiers ??= {};
    if (edit.value === "") delete target.ss14Inputs.heroTiers[edit.key];
    else target.ss14Inputs.heroTiers[edit.key] = { tier: edit.value, sourcePageSha256: row.control.sourcePageSha256 };
    target.ss14Inputs.componentReceipts ??= {};
    target.ss14Inputs.componentReceipts[row.receipt.sourceUrl] = row.receipt.sourcePageSha256;
  } else if (edit.kind === "slate-log") {
    applyLogSlates(target, edit.value);
    applySeasonSlateSelections(target, target.ss14Inputs.slateSelections);
    target.ss14Inputs.configurations ??= {};
    target.ss14Inputs.configurations.divinity = captureSeasonConfiguration(target, "divinity");
    target.ss14Inputs.mechanicReceipts = seasonMechanicPins();
    target.ss14Inputs.componentReceipts = { ...target.ss14Inputs.componentReceipts, ...pinSeasonComponentReceipts(target, ["divinity"]) };
  } else if (edit.kind === "slate-affix") {
    const row = seasonSlateTemplates(target, { requireBindings: false }).find(r => r.controls.some(c => c.key === edit.key));
    const control = row?.controls.find(c => c.key === edit.key);
    if (!control || edit.value !== "" && !seasonSlateOptions(control.type).some(o => o.id === edit.value)) throw new Error("SS14 석판 슬롯에 허용된 재능을 선택하세요.");
    target.ss14Inputs.slateSelections ??= {};
    const binding = target.ss14Inputs.slateSelections[row.slate.instanceId] ??= { templateId: row.slate.slateId, sourcePageSha256: row.page.sourcePageSha256,
      slots: Object.fromEntries(row.controls.filter(c => c.value && seasonSlateOptions(c.type).some(o => o.id === c.value)).map(c => [c.slot, c.value])) };
    binding.sourcePageSha256 = row.page.sourcePageSha256;
    if (edit.value === "") delete binding.slots[control.slot]; else binding.slots[control.slot] = edit.value;
    applySeasonSlateSelections(target, target.ss14Inputs.slateSelections);
    target.ss14Inputs.mechanicReceipts = seasonMechanicPins();
    target.ss14Inputs.componentReceipts = { ...target.ss14Inputs.componentReceipts, ...pinSeasonComponentReceipts(target, ["divinity"]) };
  } else if (edit.kind === "hero-combat") {
    if (!SEASON_HERO_COMBAT_FIELDS[edit.key] || edit.value !== "" && !validCombatValue(SEASON_HERO_COMBAT_FIELDS[edit.key], edit.value)) throw new Error("히어로 전투 입력의 범위를 확인하세요.");
    if (edit.value !== "" || target.ss14Inputs.heroCombat) {
      target.ss14Inputs.heroCombat ??= {};
      if (edit.value === "") delete target.ss14Inputs.heroCombat[edit.key]; else target.ss14Inputs.heroCombat[edit.key] = edit.value;
      target.ss14Inputs.mechanicReceipts = seasonMechanicPins();
    }
  } else if (edit.kind === "dummy-level") {
    const dummy = trainingDummyLevels.find(row => row.level === edit.value);
    if (!dummy) throw new Error("허수아비 레벨을 확인하세요.");
    editSeasonDpsInput(target, "enemy:armor", dummy.armor);
    for (const type of ["fire", "cold", "lightning", "erosion"]) {
      editSeasonDpsInput(target, "enemy:" + type, dummy.resistance);
    }
  } else if (edit.kind === "dps-input") {
    editSeasonDpsInput(target, edit.key, edit.value);
  } else if (edit.kind === "game-critical-input") {
    const index = Number(edit.key);
    const id = normalizeBuild(target).selections.skills[index];
    const record = getSeasonSelectionRecord("skills", id);
    const data = seasonGameCritical(record);
    if (!/^[0-8]$/u.test(String(edit.key)) || !data) throw new Error("선택 스킬에 연결된 SS14 설치 게임 수치가 없습니다.");
    target.ss14Inputs.offense ??= {};
    target.ss14Inputs.offense[index] = { itemId: id, sourcePageSha256: record.sourcePageSha256,
      baseCriticalRating: data.baseCriticalRating, gameDataReceipt: data.receiptSha256 };
    target.ss14Inputs.offenseRuleReceipts = seasonOffenseRulePins();
  } else if (edit.kind === "offense-input") {
    const index = Number(edit.key);
    const id = normalizeBuild(target).selections.skills[index];
    const record = getSeasonSelectionRecord("skills", id);
    if (!/^[0-8]$/u.test(String(edit.key)) || !record || edit.value !== "" && !validBaseCriticalRating(edit.value)) {
      throw new Error("선택 스킬의 보정 전 크리티컬 수치를 0~100000 범위에서 확인하세요.");
    }
    target.ss14Inputs.offense ??= {};
    if (edit.value === "") delete target.ss14Inputs.offense[index];
    else {
      const previous = target.ss14Inputs.offense[index];
      const retained = previous?.itemId === id && previous?.sourcePageSha256 === record.sourcePageSha256
        && previous?.baseCriticalRating === edit.value && validGameCriticalBinding(previous) ? previous.gameDataReceipt : undefined;
      target.ss14Inputs.offense[index] = { itemId: id, sourcePageSha256: record.sourcePageSha256, baseCriticalRating: edit.value,
        ...(retained ? { gameDataReceipt: retained } : {}) };
    }
    target.ss14Inputs.offenseRuleReceipts = seasonOffenseRulePins();
  } else if (edit.kind === "blessing-input") {
    if (!SEASON_BLESSINGS.includes(edit.key) || edit.value !== "" && (!validBlessingCount(edit.value)
      || edit.value>calculateSeasonBuild(target,{includeTheaAverage:false}).blessings.caps[edit.key])) throw new Error("축복 중첩을 현재 장비·재능의 상한 안에서 입력하세요.");
    if (edit.value !== "" || target.ss14Inputs.blessings !== undefined) {
      target.ss14Inputs.blessings ??= {};
      if (edit.value === "") delete target.ss14Inputs.blessings[edit.key];
      else target.ss14Inputs.blessings[edit.key] = edit.value;
      target.ss14Inputs.blessingRuleReceipts = seasonBlessingPins();
    }
  } else if (edit.kind === "character-input") {
    const field = SEASON_CHARACTER_INPUTS[edit.key];
    if (!field || edit.value !== "" && (typeof edit.value !== "number" || !Number.isFinite(edit.value)
      || edit.value < field.min || edit.value > field.max || edit.key === "enemyLevel" && !Number.isInteger(edit.value))) throw new Error("기본 입력의 표시 범위와 대상 레벨을 확인하세요.");
    target.ss14Inputs.character ??= {};
    if (edit.value === "") delete target.ss14Inputs.character[edit.key];
    else target.ss14Inputs.character[edit.key] = edit.value;
    target.ss14Inputs.ruleReceipts = seasonRulePins();
  } else if (edit.kind === "component-condition") {
    const control = projectSeasonComponents(target).rows.flatMap((r) => r.conditionControls).find((r) => r.key === edit.key);
    if (!control || !validSeasonConditionValue(control, edit.value)) throw new Error("SS14 원문에 연결된 조건 충족 여부·중첩 입력 범위를 확인하세요.");
    target.ss14Inputs.componentConditions ??= {};
    for (const linked of projectSeasonComponents(target).rows.flatMap((r) => r.conditionControls).filter((c) => c.conditionGroup === control.conditionGroup)) {
      if (edit.value === "") delete target.ss14Inputs.componentConditions[linked.key];
      else target.ss14Inputs.componentConditions[linked.key] = {
        value: control.inverted === linked.inverted ? edit.value : 1 - edit.value, sourcePageSha256: linked.sourcePageSha256,
      };
    }
  } else if (edit.kind === "gear-log-options") {
    const binding = target.ss14Inputs.gear[edit.slotIndex];
    if (!binding || !validLogGear(edit.value, binding.itemId)) throw new Error("장비 로그 옵션의 형식 또는 장비 연결이 올바르지 않습니다.");
    binding.logGear = structuredClone(edit.value);
    binding.rolls = {};
  } else if (edit.kind === "gear-roll" && target.ss14Inputs.gear[edit.slotIndex]?.logGear) {
    editLogGearRoll(target.ss14Inputs.gear[edit.slotIndex].logGear, edit.key, edit.value);
  } else if (edit.kind === "gear-roll") {
    const report = calculateSeasonBuild(target);
    const controls = report.components.flatMap((row) => row.calculations ?? []).find((entry) => entry.slotIndex === edit.slotIndex)?.controls ?? [];
    const control = controls.find((row) => row.key === edit.key);
    if (!control) throw new Error("SS14 근거가 연결된 장비 수치를 선택하세요.");
    if (edit.value !== "" && (typeof edit.value !== "number" || !Number.isFinite(edit.value) || edit.value < control.min || edit.value > control.max)) throw new Error("장비 수치가 SS14 원문 범위를 벗어났습니다.");
    // One source modifier can emit multiple stats (attack AND cast speed).
    // They are one game roll, never two independent user choices.
    for (const row of controls.filter((row) => row.sourceText === control.sourceText && row.min === control.min && row.max === control.max)) {
      if (edit.value === "") delete target.ss14Inputs.gear[edit.slotIndex].rolls[row.key];
      else target.ss14Inputs.gear[edit.slotIndex].rolls[row.key] = edit.value;
    }
  } else if (!editNativeSeasonSelection(target, edit) && !editNativeDivinity(target, edit) && !editNativeExtension(target, edit)) throw new Error("지원하지 않는 SS14 편집입니다.");
  next.targetBuild = targetFor(next.sourceBuild, next.id, target.name, target.skillLevels, target.ss14Inputs);
  if(edit.kind==='shelf-apply'&&!validDocument(next))throw Error('보관 항목의 SS14 수치 연결을 확인할 수 없습니다.');
  return next;
}

export function prepareSeasonConfigurationTransfer(document, currentBuild, groups) {
  if (!validDocument(document)) throw new Error("SS14 편집 문서를 먼저 여세요.");
  if (!isSeasonMigrationSource(currentBuild)) throw new Error("현재 SS13 또는 SS12 편집 구성에서만 이전할 수 있습니다.");
  if (!Array.isArray(groups) || !groups.length || new Set(groups).size !== groups.length
    || groups.some((id) => !SEASON_CONFIGURATION_GROUPS.some((group) => group.id === id))) throw new Error("이전할 구성 범위를 선택하세요.");
  const next = structuredClone(document);
  const inputs = next.targetBuild.ss14Inputs;
  inputs.configurations ??= {};
  for (const group of groups) inputs.configurations[group] = captureSeasonConfiguration(currentBuild, group);
  const base = applySeasonConfigurations(next.sourceBuild, inputs.configurations);
  inputs.componentReceipts = { ...inputs.componentReceipts, ...pinSeasonComponentReceipts(base, groups) };
  if (groups.includes("hero")) delete inputs.heroTiers;
  if (groups.includes("hero")) delete inputs.heroSelection;
  if (groups.includes("hero")) delete inputs.memoryBases;
  if (groups.includes("hero")) delete inputs.memoryRolls;
  if (groups.includes("pact")) delete inputs.destinyRolls;
  if (groups.includes("divinity")) delete inputs.slateSelections;
  if (groups.some(group => ["hero", "skills", "combat"].includes(group))) delete inputs.heroCombat;
  // Any configuration replacement can change the observed elixir effect or
  // module uptime. Keep source selections, but require current confirmation.
  delete inputs.extensionInputs;
  if (groups.includes("hero")) delete inputs.character;
  if (groups.some((group) => ["hero", "gear", "skills", "combat"].includes(group))) delete inputs.offense;
  if (groups.some((group) => ["hero", "gear", "skills", "combat"].includes(group))) delete inputs.dps;
  // Any replaced configuration may alter generation, consumption or legality.
  // Require explicit confirmation instead of carrying a combat snapshot over.
  delete inputs.blessings;
  delete inputs.blessingRuleReceipts;
  if (inputs.componentConditions) for (const key of Object.keys(inputs.componentConditions)) {
    if (groups.includes("combat") || groups.some((group) => key.startsWith(`${group}.`))) delete inputs.componentConditions[key];
  }
  // Re-bind only the replaced categories. Existing SS14 edits in other groups
  // must survive, and SS13 numbers are projected only by exact receipt matching.
  if (groups.some((group) => ["gear", "skills"].includes(group))) {
    const rebound = createSeasonWorkspace(prepareSeasonMigration(base));
    for (const category of ["gear", "skills"]) if (groups.includes(category)) {
      inputs[category] = structuredClone(rebound.targetBuild.ss14Inputs[category]);
      if (inputs.selections) inputs.selections[category] = {};
    }
    if (groups.includes("skills")) {
      next.targetBuild.skillLevels = [...rebound.targetBuild.skillLevels];
      inputs.supports = structuredClone(rebound.targetBuild.ss14Inputs.supports);
      delete inputs.supportSelections;
    }
  }
  next.targetBuild = targetFor(next.sourceBuild, next.id, next.targetBuild.name, next.targetBuild.skillLevels, inputs);
  if (!validDocument(next)) throw new Error("이전 구성을 검증하지 못했습니다. 기존 문서는 변경하지 않았습니다.");
  const labels = { memoryRolls: "추억 범위 옵션 수치 확인", memoryBases: "추억 기본 옵션 수치 확인", blessings: "축복 현재 중첩 입력", character: "자원·방어 기본 입력", offense: "스킬 기본 크리티컬 입력", heroTiers: "히어로 특성 단계", componentConditions: "효과 조건·중첩 입력",
    gear: "장비 수치 확인", skills: "스킬 원문 연결", supports: "보조 원문 연결", supportSelections: "보조 별도 선택", selections: "장비·스킬 별도 선택" };
  labels.destinyRolls = "운명 범위 수치 확인";
  labels.extensionInputs = "영약 활성·효과 배율·모듈 소환체·제작 수치 확인";
  const resetInputs = Object.entries(labels).filter(([key]) => Object.keys(document.targetBuild.ss14Inputs[key] ?? {}).length
    && json(document.targetBuild.ss14Inputs[key]) !== json(inputs[key])).map(([key, label]) => ({ key, label }));
  return { document: next, groups: [...groups], sourceFingerprint: json(currentBuild), targetFingerprint: json(document),
    sourceName: currentBuild.name, resetInputs, changes: compareSeasonConfigurations(document.targetBuild, next.targetBuild).filter((row) => groups.includes(row.id)) };
}

export function applySeasonConfigurationTransfer(document, currentBuild, draft) {
  if (!draft || draft.targetFingerprint !== json(document) || draft.sourceFingerprint !== json(currentBuild)) {
    throw new Error("검토 뒤 원본 또는 SS14 입력이 바뀌었습니다. 구성 이전을 다시 검토하세요.");
  }
  // Recompute from inputs; never trust a preview's supplied target document.
  return prepareSeasonConfigurationTransfer(document, currentBuild, draft.groups).document;
}

export function loadSeasonWorkspaces(storage) {
  try {
    const raw = storage.getItem(SEASON_WORKSPACE_STORAGE_KEY);
    if (raw === null) return { documents: [], error: "" };
    const value = JSON.parse(raw);
    if (!object(value) || value.schemaVersion !== 1 || !Array.isArray(value.documents)
      || !value.documents.every(validDocument) || new Set(value.documents.map((row) => row.id)).size !== value.documents.length) throw new Error("invalid");
    return { documents: value.documents, error: "" };
  } catch { return { documents: [], error: "저장된 SS14 편집 문서를 읽을 수 없습니다. 기존 저장 내용은 변경하지 않았습니다." }; }
}

export function saveSeasonWorkspace(storage, document, { now = new Date() } = {}) {
  if (!validDocument(document)) throw new Error("SS14 편집 문서 형식을 확인할 수 없습니다.");
  const loaded = loadSeasonWorkspaces(storage);
  if (loaded.error) throw new Error(loaded.error);
  const existing = loaded.documents.find((row) => row.id === document.id);
  if ((existing?.revision ?? 0) !== document.revision || (existing && json(existing.sourceBuild) !== json(document.sourceBuild))) {
    throw new Error("다른 탭에서 문서가 변경되었습니다. 저장 문서를 다시 열어 주세요.");
  }
  const saved = { ...structuredClone(document), revision: document.revision + 1, updatedAt: now.toISOString() };
  const documents = existing ? loaded.documents.map((row) => row.id === saved.id ? saved : row) : [...loaded.documents, saved];
  storage.setItem(SEASON_WORKSPACE_STORAGE_KEY, json({ schemaVersion: 1, documents }));
  return saved;
}

export function exportSeasonWorkspace(document) {
  if (!validDocument(document)) throw new Error("SS14 편집 문서 형식을 확인할 수 없습니다.");
  return JSON.stringify({ format: "tob-season-workspace", version: 1, document }, null, 2);
}

// Share the current playable configuration. Keep the historical source and
// research notes in the owner's workspace and the full JSON backup only.
export function shareableSeasonBuild(document) {
  if (!validDocument(document)) throw new Error("SS14 빌드를 확인하세요.");
  const target = document.targetBuild;
  const inputs = structuredClone(target.ss14Inputs);
  inputs.configurations = Object.fromEntries(SEASON_CONFIGURATION_GROUPS.map(({ id }) =>
    [id, captureSeasonConfiguration(target, id)]));
  const gear = inputs.configurations.gear.fields.gear;
  if (Array.isArray(gear?.inventory)) gear.inventory = [];
  return { name: target.name, levels: [...target.skillLevels], inputs };
}

export function openSharedSeasonBuild(value, {id = globalThis.crypto.randomUUID(), now = new Date()} = {}) {
  if (!object(value) || !Array.isArray(value.levels) || !object(value.inputs) || !validSeasonConfigurations(value.inputs.configurations)
    || !SEASON_CONFIGURATION_GROUPS.every(group => Object.hasOwn(value.inputs.configurations ?? {}, group.id))) {
    throw new Error("공유 빌드의 구성을 확인하세요.");
  }
  const sourceBuild = sharedBase();
  const targetBuild = targetFor(sourceBuild, id, value.name, value.levels, value.inputs);
  const document = {schemaVersion:1, id, revision:0, createdAt:now.toISOString(), updatedAt:now.toISOString(), sourceBuild, targetBuild};
  if (!validDocument(document)) throw new Error("공유 빌드의 SS14 입력을 확인하세요.");
  return document;
}

export function importSeasonWorkspace(text, { id = globalThis.crypto.randomUUID(), now = new Date() } = {}) {
  if (typeof text !== "string" || text.length > 2_000_000) throw new Error("SS14 문서는 2MB 이하의 텍스트로 입력하세요.");
  let envelope;
  try { envelope = JSON.parse(text); } catch { throw new Error("SS14 문서 JSON 형식을 확인하세요. 기존 문서는 변경하지 않았습니다."); }
  if (envelope?.format !== "tob-season-workspace" || envelope.version !== 1 || !validDocument(envelope.document)) {
    throw new Error("지원하는 TOB SS14 편집 문서가 아닙니다. SS13·91TOB 파일을 여기에 적용할 수 없습니다.");
  }
  // Import always creates a new identity, never overwrites an existing revision.
  const source = structuredClone(envelope.document);
  const document = { ...source, id, revision: 0, createdAt: now.toISOString(), updatedAt: now.toISOString(),
    targetBuild: targetFor(source.sourceBuild, id, source.targetBuild.name, source.targetBuild.skillLevels, source.targetBuild.ss14Inputs) };
  if (!validDocument(document)) throw new Error("새 SS14 문서 식별자를 확인할 수 없습니다.");
  return document;
}
