import { findItemById } from "./catalog.js";
import { SS14_CURRENT_IDENTITIES } from "./seasonCurrentDatabase.js";
import { normalizeBuild } from "./engine.js";
import { calculateSeasonSkill } from "./seasonCalculation.js";
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { SS14_GEAR_EN } from "./data/ss14Gear.en.generated.js";
import { corrosionCard,isImplicitRoll } from './seasonCorrosion.js';
import { parseTlidbGearTooltip, projectTlidbGearTooltipRollValues } from "./tlidbGearTooltipCalculation.js";
import { mapTlidbTooltipEffects } from "./tlidbTooltipStatMapping.js";
import { resolveTlidbTooltipEffects } from "./tlidbTooltipEffectRuntime.js";
import { compareSeasonGearEffects } from "./seasonGearComparison.js";
import { calculateSeasonCoupledSkills } from "./seasonCoupledCalculation.js";
import { calculateSeasonOffense } from "./seasonOffense.js";
import { SS14_CARDS } from "./data/ss14Cards.generated.js";
import { inspectNestedSeasonReferences } from "./seasonConfiguration.js";
import { inspectSeasonSupport } from "./seasonSupport.js";
import { SS14_SUPPORTS_EN } from "./data/ss14Supports.en.generated.js";
import { projectSeasonComponents, projectSeasonCustomOptions } from "./seasonComponents.js";
import { calculateSeasonCharacter } from "./seasonCharacter.js";
import { calculateElixirAverage, applyObservedElixirUptime } from "./seasonElixirAverage.js";

import { projectSeasonBlessings } from "./seasonBlessings.js";
import { calculateSeasonDps, manualResourceBalance } from "./seasonDps.js";
import { observedManaRecoveryBasis } from "./seasonSurvival.js";
import { calculateTheaAverage } from "./seasonTheaCycle.js";
import { seasonDamageContext } from "./seasonWeaponInputs.js";
import { inspectLogGear } from "./seasonLogGear.js";
import { seasonGearLevelBonus, seasonEffectLevelBonus, seasonRevelationLevelBonus } from "./seasonSkillLevels.js";
import { projectSeasonClockwork } from "./seasonClockwork.js";
import { calculateSeasonNumericStats } from "./seasonNumericStats.js";
import { inactiveIcePulseOptions, inactiveKinglyTerraOptions, inactiveSunsetReapingOptions, isObservedTerraGearEffect, normalizeSeasonGearEffects, observedKinglyTerraOptions, validSeasonGearEffects, SEASON_LOCAL_WEAPON_STATS, SEASON_GLOBAL_FLAT_STATS, SEASON_NATIVE_GEAR_STATS } from "./seasonGearEffects.js";
import { VOLTAIC_RIPPLE_ID } from "./seasonSkillMechanics.js";
import { netherSum } from "./seasonNetherRemaining.js";
import { getSkillEnergyUsage } from "./skillRuntimeModel.js";
import { logMechanicStats } from "./seasonLogGearMechanics.js";
import { resolveSeasonGearConditions } from './seasonGearConditions.js';
import { craftOptions } from './seasonItemCraft.js';

export const SS14_BUILD_MODEL = "tlidb-ss14-build-preview-v1";
const labels = { hero: "히어로", heroTraits: "히어로 특성", heroMemory: "히어로 추억", heroMemoryAffixes: "추억 옵션", skills: "스킬", supports: "보조", gear: "장비", talents: "재능", talentTrees: "재능 패널", spirits: "정령", destiny: "운명", slates: "신격의 석판", divinityAffixes: "석판 옵션", modularization: "모듈", elixirs: "영약", ingredients: "영약 재료", prisms: "프리즘", inverseImages: "역상" };
const nonempty = (value) => Array.isArray(value) ? value.length > 0 : value && typeof value === "object" ? Object.keys(value).length > 0 : Boolean(value);

// Enumerate both legacy selections and structured slots. The untouched source
// document remains the migration authority; normalizing must never erase IDs.
export function inspectSeasonBuildInputs(build) {
  const normalized = normalizeBuild(build);
  const rows = new Map();
  const add = (category, id, path) => {
    if (typeof id !== "string" || !id) return;
    const key = `${category}:${id}`;
    if (!rows.has(key)) rows.set(key, { category, id, paths: [] });
    if (!rows.get(key).paths.includes(path)) rows.get(key).paths.push(path);
  };
  for (const source of [build?.selections, normalized.selections]) {
    for (const [category, ids] of Object.entries(source ?? {})) {
      if (Array.isArray(ids)) ids.forEach((id, index) => add(category, id, `selections.${category}.${index}`));
    }
  }
  inspectNestedSeasonReferences(build, add);
  const extra = [];
  const block = (path, label, reason) => extra.push({ path, label, reason });
  const hero = build?.hero ?? normalized.hero;
  if (hero?.branchId) add("hero", hero.branchId, "hero.branchId");
  if (nonempty(hero?.traitSelections)) block("hero.traitSelections", "히어로 특성", "확인된 단계별 무조건 수치는 별도 내역에 반영하며 조건·특수 효과의 전체 계산은 미완료입니다.");
  if (nonempty(hero?.memories) || hero?.revivalMemory) block("hero.memories", "히어로 추억·부활", "동일 ID의 일반 옵션과 직접 확인한 기본 수치를 반영하며 강화 환산·부활·특성 레벨 자동 보정은 미검증입니다.");
  const skillSlots = [...(build?.skills?.active ?? []), ...(build?.skills?.passive ?? [])];
  skillSlots.forEach((slot, index) => {
    add("skills", slot?.skillId, `skills.rows.${index}`);
    slot?.supports?.forEach((support, supportIndex) => add("supports", support?.supportId, `skills.rows.${index}.supports.${supportIndex}`));
    if (nonempty(slot?.modularization)) block(`skills.rows.${index}.modularization`, "모듈화 설정", "확인한 소환체의 플레이어 부여 수치는 별도 내역에 반영하며 소환체 전용·발동 효과의 전체 계산은 미지원입니다.");
    if (slot?.sealedLife || slot?.sealedMana) block(`skills.rows.${index}.seals`, "스킬 자원 봉인", "SS14 자원 봉인 계산 미검증");
  });
  if ((build?.skills?.elixirs ?? []).some(Boolean) || build?.skills?.elixir) block("skills.elixirs", "영약", "상세 원문과 직접 확인한 현재 활성·효과 배율을 반영하며 재료·자동 증폭·회복·전체 유지율은 미지원입니다.");
  (build?.gear?.slots ?? []).forEach((slot, index) => add("gear", slot?.itemId, `gear.slots.${index}`));
  if ((build?.talents?.boards ?? []).some((board) => board.treeSlug || board.boardId || Object.values(board.nodePoints ?? {}).some(Boolean)
    || Object.values(board.reflectedNodePoints ?? {}).some(Boolean) || nonempty(board.selectedNodeIds) || nonempty(board.coreTalentIds)
    || nonempty(board.prismSlots) || nonempty(board.inverseImageSlots)) || build?.talents?.placedPrism || build?.talents?.placedInverseImage) {
    block("talents", "재능·프리즘", "확인된 노드 수치는 별도 내역에 반영하며 SS14 경로·배치·프리즘·특수 효과 검증은 미완료입니다.");
  }
  if (nonempty(build?.divinity?.boards)) block("divinity", "신격의 석판", "확인된 일반 석판 수치는 별도 내역에 반영하며 SS14 명왕·복제·배치 검증은 미완료입니다.");
  if ((build?.pact?.slots ?? []).some((slot) => slot.spirit || slot.undeterminedFate
    || Object.values(slot.rings ?? {}).some((ring) => ring.installedDestiny))) block("pact", "정령·운명", "정령 레벨, 링과 추가 슬롯에 장착한 운명은 효과별 계산 내역에서 확인할 수 있습니다.");
  if (projectSeasonCustomOptions(build).some(r=>r.blockers.length)) block("customAffixes","사용자 옵션","일부 옵션의 SS14 문구를 확인하세요.");
  if (nonempty(build?.conditions)) block("conditions", "전투 조건", "SS14 조건과 적 방어 계산 미검증");
  if (build?.skillSeals?.life || build?.skillSeals?.mana) block("skillSeals", "자원 봉인", "SS14 자원 봉인 계산 미검증");
  if (nonempty(build?.calculation)) block("calculation", "추가 계산 설정", "원본 계산 설정을 보존했으나 SS14 적용은 미검증");
  return { normalized, references: [...rows.values()], extra };
}

// Carry only an explicitly selected value whose effect, text and range match.
// Line-index keys alone are not stable between seasons; range-only matching can
// silently move a value onto an unrelated effect after a seasonal card change.
export function projectSeasonGearRollValues(item, slot, targetEffects) {
  const source = parseTlidbGearTooltip(item);
  const selected = projectTlidbGearTooltipRollValues(item, slot, { parsedEffects: source.effects });
  const signature = (effect) => JSON.stringify([effect.stat, effect.operation, effect.unit, effect.sourceText, effect.roll?.min, effect.roll?.max]);
  const values = {};
  for (const target of targetEffects.filter((effect) => effect.roll)) {
    const matches = source.effects.filter((effect) => effect.roll && signature(effect) === signature(target));
    if (matches.length !== 1 || !Object.hasOwn(selected, matches[0].roll.key)) continue;
    const value = selected[matches[0].roll.key];
    if (typeof value === "number" && Number.isFinite(value) && value >= target.roll.min && value <= target.roll.max) values[target.roll.key] = value;
  }
  return values;
}

function inspectGear(item, slot, records, { targetBinding, isTarget = false, sourceSlot = slot, sourceSeason = "SS13", build, slotIndex, noTerra = false, observedVoltage = false, noReaping = false, icePulseScope, rollsOnly = false } = {}) {
  const record = corrosionCard(records?.[item.id],isTarget?targetBinding:null);
  if (!record || record.status !== "collected-preview" || record.season !== "SS14"
    || record.sourceRecordKey !== item.tlidbText?.en?.sourceRecordKey) return { status: "unavailable", reasons: ["SS14 동일 장비 카드 미확보"] };
  const receipt = { sourceUrl: record.sourceUrl, sourcePageSha256: record.sourcePageSha256, sourceRecordKey: record.sourceRecordKey, season: record.season };
  const currentIdentity=SS14_CURRENT_IDENTITIES.find(i=>i.id===item.id&&i.categoryId==='gear');
  if(isTarget&&currentIdentity&&!currentIdentity.slots.includes(slotIndex))
    return {status:'partial',receipt,reasons:['장비 종류와 장착 칸이 맞지 않습니다. 저장된 장비는 보존되며 올바른 칸에서 다시 선택할 수 있습니다.']};
  if (isTarget && targetBinding?.logGear && targetBinding.itemId === item.id && targetBinding.sourcePageSha256 === record.sourcePageSha256) {
    return inspectLogGear(item.id, targetBinding.logGear, build, slotIndex, icePulseScope);
  }
  const crafts = Object.values(slot.crafts ?? {});
  const unknownCraft = crafts.some(c => !craftOptions(item.id).some(o => o.affixId === c?.affixId && o.tierId === c?.tierId));
  if (slot.corrupted || nonempty(slot.legendaryDraft?.corrodedSlotIds) || unknownCraft || slot.affixText?.trim()) {
    return { status: "partial", receipt, reasons: ["SS14 제작·침식·사용자 장비 옵션의 별도 수치 근거 미확보. SS13 값으로 대체하지 않습니다."] };
  }
  const parsed = normalizeSeasonGearEffects(parseTlidbGearTooltip({ id: item.id, categoryId: "gear", tlidbText: { en: { ...record,
    sourcePageVersion: "SS14", sourceFieldStatus: { detail: "exact" } } } }, { season: "SS14", flavorReceipt: record.flavorReceipt }),record);
  const validBinding = targetBinding?.itemId === item.id && targetBinding.sourcePageSha256 === record.sourcePageSha256;
  if (isTarget && !validBinding) return { status: "partial", receipt, reasons: ["SS14 장비 입력과 원문 근거의 연결이 바뀌었습니다. SS13 선택값으로 대체하지 않습니다."] };
  const rollValues = isTarget ? targetBinding.rolls : sourceSeason === "SS13" ? projectSeasonGearRollValues(item, slot, parsed.effects) : {};
  const controls = parsed.effects.filter((effect) => effect.roll).map((effect) => ({ ...effect.roll,
    ...(isImplicitRoll(record,effect.roll.key)?{implicit:true}:{}),
    stat: effect.stat, sourceText: effect.sourceText, value: rollValues?.[effect.roll.key] ?? "" }));
  const corrosion = targetBinding?.corrosion ? {corrosion:targetBinding.corrosion} : {};
  if (rollsOnly) return {receipt, controls, ...corrosion};
  const inactive = !isTarget ? [] : [
    ...(noTerra ? inactiveKinglyTerraOptions(parsed,record) : []),
    ...(observedVoltage ? observedKinglyTerraOptions(parsed,record) : []),
    ...(noReaping ? inactiveSunsetReapingOptions(parsed,record) : []),
    ...inactiveIcePulseOptions(parsed,record,icePulseScope),
  ];
  const inactiveLines = new Set(inactive.map(effect=>effect.sourceText));
  const parsedBlockers = parsed.blockers.filter(effect=>!inactiveLines.has(effect.sourceText));
  const conditional = resolveSeasonGearConditions(parsed.effects.filter(effect=>!inactiveLines.has(effect.sourceText)).map(e => ({ ...e,
    value: e.roll ? Number.isFinite(rollValues?.[e.roll.key]) && rollValues[e.roll.key] >= e.roll.min && rollValues[e.roll.key] <= e.roll.max
      ? rollValues[e.roll.key] : null : e.value })), build,
    { path: `gear.slots.${slotIndex}.${item.id}.conditions`, sourcePageSha256: record.sourcePageSha256 });
  const mapped = mapTlidbTooltipEffects(conditional.effects.filter(e => !SEASON_LOCAL_WEAPON_STATS.has(e.stat) && !SEASON_GLOBAL_FLAT_STATS.has(e.stat) && !logMechanicStats.has(e.stat) && !SEASON_NATIVE_GEAR_STATS.has(e.stat) && !isObservedTerraGearEffect(e)));
  const resolution = resolveTlidbTooltipEffects(mapped.effects, { rollValues });
  const reasons = [...parsedBlockers, ...conditional.blockers, ...mapped.blockers, ...resolution.excluded];
  const effectReasons = [...new Set(conditional.blockers.map(issue=>issue.reason))];
  if (parsedBlockers.length || mapped.blockers.length || resolution.excluded.length)
    effectReasons.push("SS14 장비 효과·조건·선택 수치 해석 미완료");
  // Keep the native parser vocabulary for the season-neutral damage evaluator.
  // Mapped character-stat names must not be fed into the skill evaluator.
  const rawEffects = conditional.effects;
  return { status: reasons.length ? "partial" : "mapped", receipt,
    reasons: effectReasons,
    effects: resolution.applied, rawEffects, controls, rollValues, effectBlockers: reasons,
    ...corrosion,
    conditionControls: conditional.conditions, inactive: [...conditional.inactive,...inactive],
    comparison: { scope: "gear-card-contributions-only", rows: sourceSeason === "SS13" && sourceSlot?.itemId === item.id ? compareSeasonGearEffects(item, sourceSlot, parsed, rollValues) : [],
      sourceReceipt: { season: "SS13", sourceUrl: item.tlidbText?.en?.sourceUrl, sourcePageSha256: item.tlidbText?.en?.sourcePageSha256 } } };
}

export function seasonGearSlotRollEntry(build, slotIndex) {
  if (build.patchSnapshot?.season !== 'SS14') return null;
  const slot = build.gear?.slots?.[slotIndex];
  if (!slot?.itemId) return null;
  const item = findItemById(slot.itemId);
  if (!item) return null;
  return inspectGear(item, slot, SS14_GEAR_EN.records, {
    build, slotIndex, isTarget:true, targetBinding:build.ss14Inputs?.gear?.[slotIndex], sourceSeason:'SS14', rollsOnly:true,
  });
}

// The full-build boundary remains fail-closed until every selected dependency
// AND base-stat/level/combat rules have season-specific authority. Partial
// component values are never summed and presented as full build performance.
export function calculateSeasonBuild(build, options) {
  const report = projectSeasonBuild(build, options);
  const inputs = build.ss14Inputs;
  if (Number.isFinite(inputs?.character?.observedManaRecovery) && inputs.observedManaRecoveryBasis
    && JSON.stringify(inputs.observedManaRecoveryBasis)!==JSON.stringify(observedManaRecoveryBasis(build,report))) {
    // A stale measurement is still part of the document, but must not drive
    // the resource budget of the current loadout.
    const survival = report.character.survival;
    const formulasOnly = rows => rows.filter(row=>row.id!=='observed');
    survival.manaObservationStale = true;
    survival.manaScenarios = formulasOnly(survival.manaScenarios);
    survival.values.manaRegeneration = null;
    const dps = report.fullDps;
    if (dps.manualResources)
      dps.manualResources = manualResourceBalance(dps.rows,formulasOnly(dps.manualResources.recovery),inputs.dps?.skills);
  }
  return report;
}

function projectSeasonBuild(build, { skills = SS14_CARDS_EN, gear = SS14_GEAR_EN, supports = SS14_SUPPORTS_EN, sourceBuild = build, includeAverage = true, includeTheaAverage = true, includeElixirUptime = true, beforeDefense = false } = {}) {
  if (includeTheaAverage && build.ss14Inputs?.theaCycle?.mode === "automatic") {
    const average=calculateTheaAverage(build,
      state => projectSeasonBuild(state, { skills, gear, supports, sourceBuild, includeAverage: false, includeTheaAverage: false, includeElixirUptime:false, beforeDefense }));
    average.numericStats=calculateSeasonNumericStats(average);
    return average;
  }
  const inputs = inspectSeasonBuildInputs(build);
  const sourceInputs = sourceBuild === build ? inputs : inspectSeasonBuildInputs(sourceBuild);
  const selectedCards = {skills:skills.records,supports:supports.records,gear:gear.records};
  const slots = [...inputs.normalized.skills.active, ...inputs.normalized.skills.passive];
  const calculateSupport = (support, rowIndex, supportIndex) => {
    const result = inspectSeasonSupport(support, { rowIndex, supportIndex, records: supports.records, build,
      isTarget: build?.patchSnapshot?.season === "SS14", binding: build?.ss14Inputs?.supports?.[`${rowIndex}:${supportIndex}`] });
    const slot = slots[rowIndex];
    if (!slot.skillId || supportIndex >= slot.unlockedSupportCount)
      result.blockers.push("보조가 연결된 스킬 또는 열린 보조 칸이 없습니다.");
    if (slot.supports.filter(entry => entry?.supportId === support.supportId).length > 1)
      result.blockers.push("같은 스킬에 중복된 보조를 연결할 수 없습니다.");
    return result;
  };
  const components = inputs.references.map((reference) => {
    const item = findItemById(reference.id);
    const name = item?.tlidbText?.ko?.name;
    const base = { ...reference, label: labels[reference.category] ?? "추가 구성",
      name: name && !/\p{Script=Han}/u.test(name) ? name : "한국어 이름 미제공" };
    if (!item) return { ...base, status: "unavailable", reasons: ["보존된 선택 ID의 현재 항목을 찾지 못했습니다. 삭제하지 않고 유지합니다."] };
    if (reference.category === "skills") {
      const indices = inputs.normalized.selections.skills.flatMap((id, index) => id === item.id ? [index] : []);
      const calculations = indices.map((index) => {
        const calculation = calculateSeasonSkill(item.id, inputs.normalized.skillLevels[index], "SS14", { preview: skills, damageContext: seasonDamageContext(build, index, item.id) });
        const binding = build?.ss14Inputs?.skills?.[index];
        if (build?.patchSnapshot?.season === "SS14" && (binding?.itemId !== item.id
          || binding.sourcePageSha256 !== skills.records?.[item.id]?.sourcePageSha256)) {
          return { ...calculation, rowIndex: index, minionLevel:undefined, levelUnavailable:false, bindingChanged:true, values: {}, blockers: ["SS14 스킬 입력과 원문 근거의 연결이 바뀌었습니다. 저장 당시 값으로 대체하지 않습니다."] };
        }
        return { rowIndex: index, ...calculation };
      });
      return { ...base, status: calculations.length && calculations.every((result) => !result.blockers.length) ? "mapped" : "partial",
        reasons: [...new Set(calculations.flatMap((result) => result.blockers))], calculations };
    }
    if (reference.category === "gear") {
      const sourceKey=gear.records?.[item.id]?.sourceRecordKey;
      const selectedSkills=inputs.normalized.selections.skills.filter(Boolean);
      const observedVoltage=sourceKey==='Kingly_Armor' && selectedSkills.length>0 && selectedSkills.every(id=>id===VOLTAIC_RIPPLE_ID);
      const noTerra = sourceKey==='Kingly_Armor' && inputs.references.every(({category,id})=>{
        if (!Object.hasOwn(selectedCards,category) || id===item.id) return true;
        const card=selectedCards[category]?.[id];
        return card?.season==='SS14' && !card.tags?.includes('Terra') && !/\bTerra (?:Charge|Skills?)\b/iu.test(card.detail??'');
      });
      // Only skip the armor's on-Reaping effects if every selected source is
      // accounted for. Craft, logged and conditional extension effects can
      // supply triggers independently of a card's normal tooltip.
      const noReaping = sourceKey==='Twilight_Vestment' && !nonempty(build.customAffixes)
        && !inputs.normalized.gear.slots.some(slot=>nonempty(slot?.crafts))
        && !Object.values(build.ss14Inputs?.gear??{}).some(binding=>binding?.logGear||binding?.corrosion?.implicit
          || binding?.itemId!==item.id&&binding?.corrosion)
        && inputs.references.every(({category,id})=>{
          if (id===item.id) return true;
          const card=selectedCards[category]?.[id];
          return card?.season==='SS14' && !/\breap(?:s|ed|ing)?\b/iu.test(card.detail??'');
        });
      let icePulseScope;
      if (sourceKey==='Ice_Pulse' && !build.skills?.elixirs?.some(slot=>slot?.skillId)) {
        const hasTrigger = inputs.normalized.gear.slots.some((slot,index)=>{
          if (!slot?.itemId || slot.itemId===item.id) return false;
          const binding=build.ss14Inputs?.gear?.[index], card=selectedCards.gear?.[slot.itemId];
          return !card?.detail || /\btriggers?\b/iu.test(card.detail) || nonempty(slot.crafts)
            || binding?.logGear || binding?.corrosion || slot.corrupted || slot.affixText?.trim();
        });
        const hosts=inputs.references.filter(({category})=>category==='skills'||category==='supports')
          .map(({category,id})=>selectedCards[category]?.[id]);
        if (!hasTrigger && hosts.length && hosts.every(card=>card?.season==='SS14'&&card.detail)) {
          const noPotionOrMobility=hosts.every(card=>!card.tags?.some(tag=>['Mobility','Restoration','Elixir'].includes(tag))
            && !/\b(?:Mobility|Restoration|Potion) Skills?\b/iu.test(card.detail));
          icePulseScope={noPotionOrMobility,noChargeSkill:noPotionOrMobility
            && hosts.every(card=>!/\b(?:Cooldown|Charges|Charging Progress)\b/iu.test(card.detail))};
        }
      }
      const slots = inputs.normalized.gear.slots.flatMap((slot, index) => slot?.itemId === item.id ? [{ index, slot }] : []);
      const calculations = slots.map(({ index, slot }) => ({ slotIndex: index, ...inspectGear(item, slot, gear.records, {
        isTarget: build?.patchSnapshot?.season === "SS14", targetBinding: build?.ss14Inputs?.gear?.[index], build, slotIndex: index, noTerra,observedVoltage,noReaping,icePulseScope,
        sourceSlot: sourceInputs.normalized.gear.slots[index],
        sourceSeason: sourceBuild?.patchSnapshot?.season,
      }) }));
      return { ...base, status: calculations.length && calculations.every((entry) => entry.status === "mapped") ? "mapped" : "partial",
        reasons: [...new Set(calculations.flatMap((entry) => entry.reasons))], calculations };
    }
    if (reference.category === "supports") {
      const calculations = slots.flatMap((slot, rowIndex) => (slot?.supports ?? []).flatMap((support, supportIndex) => {
        if (support?.supportId !== item.id) return [];
        return [calculateSupport(support,rowIndex,supportIndex)];
      }));
      return { ...base, status: calculations.length && calculations.every((entry) => !entry.blockers.length) ? "mapped" : "partial",
        reasons: calculations.length ? [...new Set(calculations.flatMap((entry) => entry.blockers))] : ["보조의 적용 스킬·칸 연결 미확인"], calculations };
    }
    const record = SS14_CARDS.records[reference.id];
    const sourceReceipt = record?.status === "collected-preview" && record.season === "SS14"
      && /^[a-f0-9]{64}$/u.test(record.sourcePageSha256)
      && record.sourceRecordKey === item.tlidbText?.ko?.sourceRecordKey
      ? { sourceUrl: record.sourceUrl, sourcePageSha256: record.sourcePageSha256, sourceRecordKey: record.sourceRecordKey, season: "SS14" } : null;
    return { ...base, status: "unavailable", sourceReceipt, reasons: [sourceReceipt
      ? "SS14 항목 원문은 연결됐지만 선택 효과·레벨·배치의 계산 연결은 미완료입니다."
      : "선택 구성별 수치 내역과 별개로 이 참조의 전체 효과 연결은 미완료입니다."] };
  });
  const gearEffects = components.filter(c => c.category === "gear").flatMap(c => c.calculations ?? []).flatMap(validSeasonGearEffects);
  const gearNumbedEffect=netherSum(gearEffects.filter(e=>e.operation==='add_percent'&&e.unit==='percent'&&e.value>=0),"numbed_effect");
  const componentProjection = projectSeasonComponents(build, {
    gearSealCompensation: netherSum(gearEffects, "sealed_mana_compensation"), gearLevelEffects: gearEffects, gearNumbedEffect,
  });
  for(const component of components.filter(c=>c.category==='skills')) {
    const buffs=componentProjection.rows.filter(r=>r.itemId===component.id&&Number.isInteger(r.buffSkill));
    if(!buffs.length)continue;
    component.calculations=component.calculations.map(c=>{
      const buff=buffs.find(r=>r.buffSkill===c.rowIndex);if(!buff)return c;
      return {...c,level:buff.level,baseLevel:buff.baseLevel,levelBonus:buff.levelBonus,progressionReceipt:buff.progressionReceipt,
        ...(buff.levelUnavailable&&{levelUnavailable:true}),
        blockers:buff.blockers.map(b=>b.reason),effects:[],values:{},mechanics:[{kind:'utility-skill',sourceText:buff.detail}]};
    });
    component.reasons=buffs.flatMap(r=>r.blockers.map(b=>b.reason));component.status=component.reasons.length?'partial':'mapped';
  }
  for (const row of components.filter(c => ["skills", "supports"].includes(c.category) && c.calculations?.length)) {
    if (row.id === "supports-ss14-clockwork-core" || row.id === "skills-ss14-supreme-descent") continue;
    const support = row.category === "supports", record = skills.records[row.id];
    const revelationBonus = support ? 0 : seasonRevelationLevelBonus(build,componentProjection.rows,record);
    row.calculations = row.calculations.map(entry => {
      if(entry.mechanics?.some(m=>m.kind==='utility-skill'))return entry;
      const bonus = seasonEffectLevelBonus(componentProjection.effects, record, support, entry.rowIndex)
        + seasonGearLevelBonus(components, record, support, entry.rowIndex) + revelationBonus;
      if (!bonus) return entry;
      if (entry.bindingChanged) return entry;
      const calculation = row.category === "skills" ? calculateSeasonSkill(row.id, entry.level + bonus, "SS14", { preview: skills, damageContext: seasonDamageContext(build, entry.rowIndex, row.id) })
        : calculateSupport({ supportId: row.id, level: entry.level + bonus },entry.rowIndex,entry.supportIndex);
      return { rowIndex: entry.rowIndex, ...calculation, baseLevel: entry.level, levelBonus: bonus };
    });
    row.reasons = [...new Set(row.calculations.flatMap(e => e.blockers))];
    row.status = row.reasons.length ? "partial" : "mapped";
  }
  const blessings = projectSeasonBlessings(build, componentProjection, components);
  componentProjection.effects.push(...blessings.effects);
  componentProjection.globalBlockers = [...blessings.blockers];
  const energy = getSkillEnergyUsage(inputs.normalized.skills);
  if (energy.over > 0) {
    const reason = `스킬 에너지 한도 초과 (${energy.used}/${energy.maximum}). 열린 보조 칸을 줄이세요.`;
    componentProjection.globalBlockers.push(reason);
    inputs.extra.push({ path: "skills.energyMax", label: "스킬 에너지", reason });
  }
  projectSeasonClockwork(componentProjection, components);
  const blockers = [...inputs.extra, ...componentProjection.allocation.issues.map((row) => ({ ...row, label: "배치 검증" })), ...componentProjection.rows.filter((row) => row.blockers.length).map((row) => ({
    path: row.path, label: row.name, reason: [...new Set(row.blockers.map((entry) => entry.reason))].join(" · "),
  })), ...components.filter((row) => row.status !== "mapped")
    .map((row) => ({ path: row.paths[0], label: `${row.label} · ${row.name}`, reason: row.reasons.join(" · ") || "원본 입력과 계산 연결 미완료" })),
    { path: "season-rules", label: "시즌 기본 규칙", reason: "SS14 기본 속성·레벨·히어로·방어·자원 및 전체 결합 공식의 시즌별 검증 미완료" }];
  const character = calculateSeasonCharacter(build, components, componentProjection);
  if (blessings.blockers.length) {
    character.values.damageTakenMultiplier = null;
    character.survival.values.damageTakenMultiplier = null;
    character.blockers.push(...blessings.blockers);
    blockers.push(...blessings.blockers.map((reason) => ({ path: "blessings", label: "축복 기본 효과", reason })));
  }
  const coupledSkills = calculateSeasonCoupledSkills(components, skills, componentProjection, build, character.values);
  const report = { schemaVersion: 1, season: "SS14", model: SS14_BUILD_MODEL, status: "partial", fullBuildSupported: false,
    summary: { dps: null, life: null, mana: null, shield: null }, components, blockers,
    counts: { total: components.length, mapped: components.filter((row) => row.status === "mapped").length, blocked: blockers.length },
    sourceGeneratedAt: { skills: skills.generatedAt, gear: gear.generatedAt, supports: supports.generatedAt, components: componentProjection.generatedAt },
    componentProjection, coupledSkills, character, blessings, beforeDefense, energy,
    offense: calculateSeasonOffense(build, components, skills, componentProjection, character, coupledSkills),
    limitation: "개별 카드 해석 성공은 전체 빌드 계산 지원이 아닙니다. 구성과 설정은 모두 보존하며, 연결되지 않은 효과를 0으로 합산하지 않습니다." };
  const calculateState=input=>projectSeasonBuild(input,{skills,gear,supports,sourceBuild,
    includeAverage:false,includeElixirUptime:false,beforeDefense});
  if (includeAverage) report.elixirAverage = calculateElixirAverage(build, componentProjection, calculateState);
  report.fullDps = calculateSeasonDps(build, report);
  if(includeElixirUptime)applyObservedElixirUptime(build,report,calculateState);
  report.numericStats = calculateSeasonNumericStats(report);
  report.fullDpsSupported = report.fullDps.supported;
  report.summary.dps = report.fullDps.dps;
  return report;
}
