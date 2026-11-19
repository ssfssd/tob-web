import { findItemById } from "./catalog.js";
import { SS14_SUPPORTS_EN } from "./data/ss14Supports.en.generated.js";
import { SS14_SUPPORTS } from "./data/ss14Supports.generated.js";
import { parseTlidbSkillTooltipCalculation } from "./tlidbSkillTooltipCalculation.js";
import { getCurrentTlidbSupportCompatibility, isCurrentTlidbSupportCompatible, matchesSupportHostType } from "./tlidbSupportCompatibility.js";
import { resolveSeasonSkillLevel } from "./seasonSkillLevels.js";
import { SS14_LOG_COMPLETION } from "./data/ss14LogCompletion.generated.js";
import "./seasonCurrentDatabase.js";
import { MOON_LUNAR_RING_ID, resolveSeasonSupportRolls } from "./seasonSupportRolls.js";
export { MOON_LUNAR_RING_ID } from "./seasonSupportRolls.js";
import { seasonConditionalExpression, scaleSeasonConditionalEffects } from './seasonEffectConditions.js';
import { boundBlessingStacks } from './seasonBlessings.js';
import { ICE_LANCES_REBOUND_TEXT } from './seasonIceLancesShotgun.js';

export const CLOCKWORK_CORE_ID = "supports-ss14-clockwork-core";
export const MANIACAL_ARMY_ID = "supports-tlidb-com-cn-maniacal-army";
export const VOLTAGE_TURMOIL_ID = 'supports-ss14-current-voltaic-ripple-turmoil-noble';
export const VOLTAGE_AFTERWAVE_ID = 'supports-ss14-current-voltaic-ripple-afterwave-noble';
export const LUNAR_ECLIPSE_ID = 'supports-ss14-current-moon-strike-lunar-eclipse-noble';
const MOON_RAINBOW_ID = 'supports-ss14-current-moon-strike-rainbow-magnificent';
export const MOON_WAX_AND_WANE_ID = 'supports-ss14-current-moon-strike-wax-and-wane-noble';
const moonStrikeId = 'skills-tlidb-com-cn-moon-strike';
export function validLunarEclipseLink(build,rowIndex,supportIndex){
  const slot=build.skills?.active?.[rowIndex];
  return slot?.skillId===moonStrikeId && supportIndex===4 && slot.unlockedSupportCount===5
    && slot.supports?.[4]?.supportId===LUNAR_ECLIPSE_ID
    && slot.supports.filter(row=>row?.supportId===LUNAR_ECLIPSE_ID).length===1;
}
const mechanicalModificationCap = "Halve the max number of Synthetic Troop Minions that can be summoned by you, rounding up to at least 1. This effect will take effect once";
const maniacalArmyCommand = "Whenever a Minion summoned by the supported skill deals damage, gains 15 Command per second for 5 s. Interval: 1 s";
const wiltingReflectionLine = "Additionally generates a Beam that shoots in the opposite direction when channeling the supported skill";
const costConversionLine='Replace Mana Cost from the supported skill with Life cost';
const lunarNoMana='The supported skill no longer costs Mana';
const lunarSeal='When the supported skill is installed, seal 10 % Max Mana';
const supportLevelFiveDamage='+20 % additional damage for the supported skill';
// SS14 skill stone table 6173858, affix 825739 at level 5. Card icons identify each stone.
const verifiedLevelFiveDamage = new Set([
  'Blizzard_Avalanche_Noble',                   // 10003667
  'Fallen_Star_Gravity_Noble',                  // 10003841
  'Flame_Slash_Inverted_Blaze_Noble',           // 10003562
  'Frost_Impact_Frozen_Trajectory_Magnificent', // 10003580
  'Ice_Focus_Solemn_Chill_Noble',               // 10003805
  'Ice_Lances_Bounce_Noble',                   // 10003653
  'Ice_Lances_Ice_Corrosion_Magnificent',      // 10003652
  'Ice_Lances_Permafrost_Noble',               // 10003654
  'Ice_Lances_Rebound_Magnificent',            // 10003651
  'Lightning_Beam_Aftershock_Magnificent',     // 10003775
  'Lightning_Storm_Boundless_Noble',           // 10003670
  'Lightning_Storm_Raging_Storm_Noble',        // 10003671
  'Moon_Strike_Rainbow_Magnificent',           // 10003609
  'Voltaic_Ripple_Afterwave_Noble',            // 10003855
  'Voltaic_Ripple_Turmoil_Noble',              // 10003854
  'Wilting_Beam_Rapid_Completion_Noble',       // 10003782
  'Wilting_Beam_Reflection_Magnificent',       // 10003780
  'Wilting_Beam_Set_Course_Noble',              // 10003781
]);
const iceCorrosionSlow = 'When the supported skill hits a unit on a Frost Terra , inflicts 1 stack(s) of Slow';
const iceCorrosionDamage = /^The supported skill deals \+([\d.]+) % additional damage to enemies on a Frost Terra$/u;
export const ICE_CORROSION_ID = 'supports-ss14-current-ice-lances-ice-corrosion-magnificent';
export const ICE_PERMAFROST_ID = 'supports-ss14-current-ice-lances-permafrost-noble';
export const iceCorrosionConditionMissing = '대상이 프로스트 그라운드 위에 있는지 선택하세요.';
export const iceCorrosionCountMissing = '대상에게 적용된 프로스트 그라운드 수를 입력하세요.';
const icePermafrostTrigger = 'Every 1.5 s, the next supported skill triggers a Lv. 20 Frost Terra on hit\\n+87.5% base radius for the Terra triggered by this effect and +66% additional Duration';
const icePermafrostStack = "The supported skill's additional damage bonus against enemies on a Frost Terra can be stacked, with the number of stacks equal to the Frost Terra Quantity";
const costClause=/\b(?:mana|life) (?:cost|consumption)|\b(?:costs?|consumes?) (?:mana|life)\b|\b(?:mana|life) (?:consumed|spent)\b/iu;
const recentDamageTypes = Object.entries({ fire: '화염', cold: '냉기', lightning: '번개', erosion: '부식' });
const recentPhysicalBonus = /^\+?([\d.]+) % additional Physical Damage for the supported skill for each type of Non-Physical Damage dealt recently$/u;
const recentTypePenalty = /^-([\d.]+) % additional damage of the corresponding type for the supported skill for each type of Non-Physical Damage dealt recently$/u;
export const recentDamageMissing = '다중 전환에 사용할 최근 비물리 대미지 유형을 선택하세요.';
export const recentDamageConflict = '다중 전환을 연결한 보조 칸의 최근 대미지 유형을 같은 값으로 맞추세요.';
export const isRecentDamageCondition = key => /^recentDamage-(fire|cold|lightning|erosion)$/u.test(key);
const clockworkSocket = (rowIndex,supportIndex) => rowIndex === 0 && supportIndex === 1;
export function seasonSupportRequiredSlot(record) {
  const ordinal = record?.detail?.match(/This skill can only be installed in the (first|second|third|fourth|fifth) Support Skill Slot of each (?:Active|Passive) Skill(?:\.|$)/mu)?.[1];
  return ({first:0,second:1,third:2,fourth:3,fifth:4})[ordinal] ?? null;
}
for (const [id, r] of Object.entries(SS14_LOG_COMPLETION.records).filter(([, r]) => r.en.category === "supports")) {
  SS14_SUPPORTS_EN.records[id] = r.en; SS14_SUPPORTS.records[id] = r.ko;
}
for (const data of [SS14_SUPPORTS_EN, SS14_SUPPORTS]) data.collected = Object.values(data.records).filter(r => r.status === 'collected-preview').length;

export function seasonSupportKoreanCard(id) {
  const direct = SS14_SUPPORTS.records[id];
  if (direct?.season === "SS14" && direct.koreanTextVerified) return direct;
  if (direct?.status !== "unavailable") return null;
  const previous = findItemById(id)?.tlidbText;
  const parts = previous?.en?.sourceRecordKey?.match(/^([\w]+):_([\w]+)_\((Magnificent|Noble)\)$/u);
  if (!parts) return null;
  const key = parts.slice(1).join("_");
  const currentId = "supports-ss14-current-" + key.toLowerCase().replaceAll("_", "-");
  const current = SS14_SUPPORTS.records[currentId];
  if (current?.season !== "SS14" || !current.koreanTextVerified || current.sourceRecordKey !== key
    || !previous.ko?.name || previous.ko.name !== current.name) return null;
  return current;
}

export function seasonSupportItem(id, records = SS14_SUPPORTS_EN.records) {
  const record = records?.[id];
  if (!record || record.season !== "SS14" || record.status !== "collected-preview"
    || record.sourceRecordKey !== findItemById(id)?.tlidbText?.en?.sourceRecordKey) return null;
  return { id, categoryId: "supports", tlidbText: { en: { ...record, sourcePageVersion: "SS14", sourceFieldStatus: { detail: "exact" } } } };
}

let optionsCache;
export function seasonSupportOptions() {
  return optionsCache ??= Object.values(SS14_SUPPORTS.records).filter((record) => record.season === "SS14" && record.koreanTextVerified
    && (record.itemId === CLOCKWORK_CORE_ID || getCurrentTlidbSupportCompatibility(seasonSupportItem(record.itemId), { season: "SS14" })))
    .map((record) => ({ id: record.itemId, name: record.name })).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export function applySeasonSupportSelections(build, selections) {
  for (const [key, support] of Object.entries(selections ?? {})) {
    const [row, column] = key.split(":").map(Number);
    const slot = row < 5 ? build.skills?.active?.[row] : build.skills?.passive?.[row - 5];
    if (!slot) continue;
    slot.supports ??= Array(5).fill(null);
    slot.supports[column] = support ? { supportId: support.supportId, level: support.level } : null;
  }
  // No item-level compatibility projection can represent row ownership. Remove
  // replaced IDs from legacy global lists, preserving all structured instances.
  if (Object.keys(selections ?? {}).length) {
    const ids = [...(build.skills?.active ?? []), ...(build.skills?.passive ?? [])].flatMap((slot) => (slot?.supports ?? []).map((row) => row?.supportId).filter(Boolean));
    build.selections ??= {};
    build.selectionProjection ??= {};
    build.selections.supports = ids;
    build.selectionProjection.supports = [...ids];
  }
  return build;
}

export function inspectSeasonSupport(support, { rowIndex, supportIndex, binding, isTarget, records, build } = {}) {
  const item = seasonSupportItem(support?.supportId, records);
  const record = item?.tlidbText.en;
  const base = { rowIndex, supportIndex, level: support?.level, effects: [], blockers: [],
    receipt: record ? { season: "SS14", sourceUrl: record.sourceUrl, sourceRecordKey: record.sourceRecordKey, sourcePageSha256: record.sourcePageSha256 } : null };
  if (!item) return { ...base, blockers: ["SS14 보조 스킬 원문 미확보"] };
  if (isTarget && (binding?.itemId !== item.id || binding.sourcePageSha256 !== record.sourcePageSha256)) return { ...base, bindingChanged:true, blockers: ["SS14 보조 입력의 원문 근거가 바뀌었거나 연결되지 않았습니다."] };
  if (item.id === CLOCKWORK_CORE_ID) {
    if (!clockworkSocket(rowIndex,supportIndex) || support.level !== 20 || record.detail !== SS14_LOG_COMPLETION.records[item.id].en.detail)
      return { ...base, blockers: ['클락워크 코어는 메인 스킬의 두 번째 보조 칸에 20레벨로 연결하세요.'] };
    return { ...base, mechanics: [{ kind: "clockwork-core", sourceText: record.detail }] };
  }
  const resolved = resolveSeasonSkillLevel(item, support.level);
  if (resolved.blockers.length) return { ...base, levelUnavailable: true, blockers: ["선택한 레벨의 SS14 보조 스킬 수치 미확보"], evidenceBlockers: resolved.blockers };
  let selected = resolved.item;
  if (record.calculationDetail && !resolved.receipt) {
    let detail = record.calculationDetail;
    if (binding?.tier !== undefined) {
      const chosen = record.supportTiers?.find(t => t.tier === binding.tier);
      const current = record.supportTiers?.filter(t => detail.includes(t.text));
      if (chosen && current?.length === 1) {
        detail = detail.replace(current[0].text, chosen.text);
      } else if (chosen && ["Activation_Medium_Perpetual_Motion", "Activation_Medium_Spell_Burst"].includes(record.sourceRecordKey)) {
        const [recovery, duration, trigger, ...extra] = chosen.text.split("\n");
        const suffix = `${trigger}\n<Cooldown Recovery Speed or Duration Bonus>`;
        if (extra.length || !recovery?.endsWith("additional Cooldown Recovery Speed")
          || !duration?.endsWith("additional Duration for the supported skill") || !trigger || !detail.endsWith(suffix))
          return { ...base, blockers: ["보조 옵션 등급의 SS14 원문 연결을 확인하세요."] };
        detail = detail.slice(0, -suffix.length) + chosen.text;
      } else return { ...base, blockers: ["보조 옵션 등급의 SS14 원문 연결을 확인하세요."] };
    }
    selected = { ...selected, tlidbText: { ...selected.tlidbText, en: { ...selected.tlidbText.en, detail } } };
  }
  base.tiers = record.supportTiers ?? [];
  base.tier = binding?.tier ?? record.supportTiers?.find(t => record.calculationDetail?.includes(t.text))?.tier;
  const rolled = resolveSeasonSupportRolls(selected, binding?.rolls);
  base.controls = rolled.controls;
  base.conditionControls = /^\+[\d.]+ % additional Hit Damage \(multiplies\) for the supported skill for every Jump$/mu.test(selected.tlidbText.en.detail)
    ? [{ key: "jumpsBeforeHit", label: "계산 대상 적중 전 점프 횟수", min: 0, max: 100, integer: true, value: binding?.conditions?.jumpsBeforeHit ?? "" }] : [];
  const rebound = record.sourceRecordKey === 'Ice_Lances_Rebound_Magnificent'
    && record.sourceSeasonEvidence?.actualSeason === 14 && record.sourceSeasonEvidence?.verificationComplete
    && selected.tlidbText.en.detail.includes(ICE_LANCES_REBOUND_TEXT);
  if (rebound) {
    base.conditionControls.push({ key: 'sameTargetHits', label: '한 투사체의 동일 대상 적중 횟수 (첫 적중 포함·관측값)', min: 1, max: 100, integer: true, value: binding?.conditions?.sameTargetHits ?? '' });
    const count = binding?.conditions?.sameTargetHits;
    if (Number.isInteger(count) && count >= 1 && count <= 100) for (let i = 1; i < count; i++) {
      base.conditionControls.push({ key: `repeatJump-${i}`, label: `${i + 1}번째 적중까지 누적 점프 (지면 경유·관측값)`, min: 1, max: 100, integer: true, value: binding?.conditions?.[`repeatJump-${i}`] ?? '' });
      if (build?.ss14Inputs?.theaEvents?.combatMode === 1)
        base.conditionControls.push({ key: `repeatDelayMs-${i}`, label: `첫 적중부터 ${i + 1}번째 적중까지 관측한 시간 (ms)`, min: 0, max: 1800000, integer: true, value: binding?.conditions?.[`repeatDelayMs-${i}`] ?? '' });
    }
  }
  const verified = record.sourceSeasonEvidence?.actualSeason === 14 && record.sourceSeasonEvidence.verificationComplete;
  const corrosion = verified && item.id===ICE_CORROSION_ID && record.sourceRecordKey === 'Ice_Lances_Ice_Corrosion_Magnificent'
    && support.level===5 && selected.tlidbText.en.detail.split('\n').includes(iceCorrosionSlow);
  const permafrost = verified && item.id===ICE_PERMAFROST_ID && support.level===5
    && selected.tlidbText.en.detail.includes(icePermafrostTrigger) && selected.tlidbText.en.detail.includes(icePermafrostStack);
  const stacking = corrosion && build?.skills?.active?.[rowIndex]?.supports?.[4]?.supportId===ICE_PERMAFROST_ID;
  const groundCount = binding?.conditions?.[stacking?'frostTerraCount':'frostTerra'];
  const validGrounds = Number.isInteger(groundCount) && groundCount>=0 && groundCount<=(stacking?100:1);
  if (corrosion) base.conditionControls.push({key:stacking?'frostTerraCount':'frostTerra',
    label:stacking?'대상에게 적용된 프로스트 그라운드 수':'대상이 프로스트 그라운드 위에 있음',
    min:0,max:stacking?100:1,integer:true,...(!stacking&&{choices:[[0,'아니요'],[1,'예']]}),value:validGrounds?groundCount:''});
  const reflection = verified && record.sourceRecordKey === "Wilting_Beam_Reflection_Magnificent"
    && selected.tlidbText.en.detail.split("\n").includes(wiltingReflectionLine);
  if (reflection) base.conditionControls.push({ key:"beamTargetCount", label:"같은 대상에 적용된 부식 광선 수", min:1, max:2,
    integer:true, value:binding?.conditions?.beamTargetCount??"" });
  const requiredSlot = seasonSupportRequiredSlot(record);
  const requiredRole = record.detail.match(/Support Skill Slot of each (Active|Passive) Skill(?:\.|$)/mu)?.[1];
  if (requiredSlot !== null && ((requiredRole === 'Passive' ? rowIndex < 5 : rowIndex >= 5) || supportIndex !== requiredSlot))
    return { ...base, blockers: [`이 보조는 ${requiredRole === 'Passive' ? '패시브' : '액티브'} 스킬의 ${requiredSlot + 1}번째 보조 칸에만 장착할 수 있습니다.`] };
  if(verified){
    const lines=selected.tlidbText.en.detail.split('\n');
    const heads=lines.flatMap((line,index)=>line==='Mana Cost Multiplier'?[index]:[]);
    const multiplier=heads.length===1&&lines[heads[0]+1]?.match(/^([\d.]+)%$/u);
    const adjustments=[...new Set(lines.filter(line=>line!=='Mana Cost Multiplier'&&costClause.test(line)))];
    const convertsToLife=record.sourceRecordKey==='Cost_Conversion'&&adjustments.length===1&&adjustments[0]===costConversionLine;
    const noMana=item.id===LUNAR_ECLIPSE_ID&&adjustments.length===1&&adjustments[0]===lunarNoMana;
    if(multiplier&&(!adjustments.length||convertsToLife||noMana))
      base.castCost={multiplier:Number(multiplier[1]),convertsToLife,noMana};
    if(noMana&&lines.includes(lunarSeal))base.sealedManaPercent=10;
  }
  if (rolled.blockers.length) return { ...base, blockers: rolled.blockers };
  const parsed = parseTlidbSkillTooltipCalculation(rolled.item, { season: "SS14", level: resolved.parserLevel });
  const unresolvedEffects=new Set(parsed.effects.filter(e=>e.condition||e.conditionText||e.conditionRequirements||e.per));
  for(const e of unresolvedEffects)if(!parsed.blockers.some(b=>b.sourceText===e.sourceText))
    parsed.blockers.push({sourceText:e.sourceText,reason:'source-condition-input-required'});
  const mechanics = [];
  const handled = new Set();
  const conditionBlockers = [];
  const hasLevelFiveDamage = support.level===5 && record.detail.split('\n').includes(supportLevelFiveDamage);
  const addLevelFiveDamage = () => {
    if (!parsed.effects.some(effect => effect.stat==='supported-skill-damage' && effect.operation==='more'
      && effect.value===20 && effect.sourceText===supportLevelFiveDamage))
      parsed.effects.push({stat:'supported-skill-damage',operation:'more',unit:'percent',value:20,sourceText:supportLevelFiveDamage});
  };
  if (verified && hasLevelFiveDamage && verifiedLevelFiveDamage.has(record.sourceRecordKey)) addLevelFiveDamage();
  if (verified && item.id===LUNAR_ECLIPSE_ID && support.level===5 && base.castCost?.noMana && base.sealedManaPercent===10
    && hasLevelFiveDamage) {
    const scale = [...new Set(parsed.blockers.map(b=>b.sourceText))]
      .map(text=>/^For every 100 Mana sealed, \+1 % additional damage for the supported skill, up to \+(\d+) % additional damage$/u.exec(text))
      .filter(Boolean);
    if (scale.length===1 && (!build || validLunarEclipseLink(build,rowIndex,supportIndex))) {
      // Installed 6173858 stone 10003611 binds level-5 affix 825739 separately from the tier modifier.
      addLevelFiveDamage();
      mechanics.push({kind:'moon-lunar-eclipse',maxBonus:Number(scale[0][1]),fixedBonus:20,sourceText:scale[0][0],sourceUrl:record.sourceUrl});
      [lunarNoMana,lunarSeal,scale[0][0]].forEach(text=>handled.add(text));
    }
  }
  if (verified && record.sourceRecordKey === 'Elemental_Conversion') {
    const lines=parsed.blockers.map(b=>b.sourceText);
    const physical=lines.find(line=>recentPhysicalBonus.test(line));
    const penalty=lines.find(line=>recentTypePenalty.test(line));
    if (physical && penalty) {
      handled.add(physical);
      handled.add(penalty);
      handled.add(physical+'\\n '+penalty);
      const controls=recentDamageTypes.map(([type,label])=>{
        const key='recentDamage-'+type, value=binding?.conditions?.[key];
        return { type, key, label:`최근 ${label} 대미지`, min:0, max:1, integer:true,
          choices:[[0,'없음'],[1,'있음']], value:[0,1].includes(value)?value:'' };
      });
      base.conditionControls.push(...controls);
      const active=controls.filter(c=>c.value===1);
      if (controls.some(c=>c.value==='')) conditionBlockers.push(recentDamageMissing);
      else {
        mechanics.push({kind:'recent-nonphysical-damage-types', types:active.map(c=>c.type)});
        if (active.length) parsed.effects.push({stat:'supported-skill-physical-damage', operation:'more', unit:'percent',
          value:Number(recentPhysicalBonus.exec(physical)[1])*active.length, sourceText:physical, nonBlockingWhenDamageTypeUnavailable:true});
        for (const {type} of active) parsed.effects.push({stat:`supported-skill-${type}-damage`, operation:'more', unit:'percent',
          value:-Number(recentTypePenalty.exec(penalty)[1]), sourceText:penalty, nonBlockingWhenDamageTypeUnavailable:true});
      }
    }
  }
  for (const blocker of parsed.blockers) {
    const text = blocker.sourceText;
    if (handled.has(text)) continue;
    let m;
    if (corrosion && (m=iceCorrosionDamage.exec(text))) {
      handled.add(text);
      handled.add(iceCorrosionSlow);
      if (!validGrounds) conditionBlockers.push(stacking?iceCorrosionCountMissing:iceCorrosionConditionMissing);
      else if (groundCount>0) {
        // Affix 666890432 uses one more modifier with P1 times the target's buff 10200 stack count.
        parsed.effects.push({stat:'supported-skill-damage',operation:'more',unit:'percent',value:Number(m[1])*groundCount,sourceText:text});
        mechanics.push({kind:'ice-lances-slow',stacksPerEligibleHit:1,sourceText:iceCorrosionSlow,sourceUrl:record.sourceUrl});
      }
    } else if (permafrost && text===icePermafrostTrigger) {
      // Affix 888393792 invokes stone 1551. Action 619202 uses buff 10200 and damage curve 271.
      // The level-20 curve is 484 cold DPS. Stone 1551 passes 40 to charge affix 974028.
      mechanics.push({kind:'ice-lances-permafrost',level:20,interval:1.5,baseColdDps:484,damagePerCharge:40,
        sourceText:text,sourceUrl:record.sourceUrl});
      handled.add(text);
      handled.add(icePermafrostStack);
    } else if (verified && item.id===MOON_LUNAR_RING_ID && hasLevelFiveDamage
      && (m = /^When the supported skill casts a Steep Strike, there is a (\d+(?:\.\d+)?) % chance to launch a circular attack\. For every 150 Max Mana, \+1% to the trigger chance of this effect, up to \+\1 %$/u.exec(text))) {
      // Installed SS14 stone 10003610 binds level-5 affix 825739 separately from the tier roll.
      addLevelFiveDamage();
      mechanics.push({kind:'moon-lunar-ring',baseChance:Number(m[1]),fixedBonus:20,sourceText:text,sourceUrl:record.sourceUrl});
      handled.add(text);
    } else if (verified && item.id===MOON_WAX_AND_WANE_ID && hasLevelFiveDamage
      && (m = /^The supported skill can activate Spell Burst\s*\. \+(\d+) % additional Hit Damage for skills cast by Spell Burst when Spell Burst is activated by the supported skill$/u.exec(text))) {
      // Installed stone 10003612 also binds the separate level-5 affix 825739.
      addLevelFiveDamage();
      mechanics.push({kind:'moon-wax-and-wane',burstBonus:Number(m[1]),fixedBonus:20,sourceText:text,sourceUrl:record.sourceUrl});
      handled.add(text);
    } else if (verified && item.id===MOON_RAINBOW_ID
      && (m = /^\+1 % Steep Strike chance for the supported skill for every 100 Max Mana, up to \+(\d+) %$/u.exec(text))) {
      mechanics.push({kind:'moon-rainbow',maxBonus:Number(m[1]),sourceText:text,sourceUrl:record.sourceUrl});
      handled.add(text);
    } else if ((m = text.match(/^\+([\d.]+) % additional Hit Damage \(multiplies\) for the supported skill for every Jump$/u))) {
      const count = binding?.conditions?.jumpsBeforeHit;
      if (!Number.isInteger(count) || count < 0 || count > 100) conditionBlockers.push("계산 대상에 적중하기 전 점프 횟수를 선택하세요.");
      else parsed.effects.push({stat:"supported-skill-hit-damage",operation:"more",unit:"percent",value:((1 + +m[1] / 100) ** count - 1) * 100,sourceText:text});
      mechanics.push({ kind: 'ice-lances-bounce', jumpsBeforeHit: count, morePerJump: +m[1] });
      handled.add(text);
    } else if (rebound && text === ICE_LANCES_REBOUND_TEXT) {
      const hits = binding?.conditions?.sameTargetHits;
      if (!Number.isInteger(hits) || hits < 1 || hits > 100) conditionBlockers.push('한 투사체가 같은 적에 적중하는 횟수를 선택하세요.');
      else {
        const repeatJumps = Array.from({ length: hits - 1 }, (_, i) => binding?.conditions?.[`repeatJump-${i + 1}`]);
        if (repeatJumps.some(n => !Number.isInteger(n) || n < 1 || n > 100)) conditionBlockers.push('반복 적중마다 누적 점프 횟수를 선택하세요.');
        const delaysMs = [0, ...repeatJumps.map((_, i) => binding?.conditions?.[`repeatDelayMs-${i + 1}`])];
        mechanics.push({ kind: 'ice-lances-rebound', hits, repeatJumps, delaysMs, sourceUrl: record.sourceUrl, sourceText: text });
      }
      handled.add(text);
    } else if (reflection && text === wiltingReflectionLine) {
      const count = binding?.conditions?.beamTargetCount;
      if (count === 1) mechanics.push({kind:"wilting-extra-beam",value:1,sourceText:text,sourceUrl:record.sourceUrl});
      else conditionBlockers.push(count === 2
        ? "같은 대상에 적용된 부식 광선 수가 2개일 때 지속 대미지 중첩은 미지원입니다."
        : "같은 대상에 적용된 부식 광선 수를 입력하세요.");
      handled.add(text);
    } else if (verified && record.sourceRecordKey === "Wilting_Beam_Rapid_Completion_Noble"
      && (m = text.match(/^For every \+1 Beam the supported skill has, \+([\d.]+) % additional Reaping Recovery Speed for Reaping that is triggered when this skill reaches max channeled stacks$/u))) {
      parsed.effects.push({stat:"reaping-recovery-speed",operation:"more",unit:"percent",value:Number(m[1]),perWiltingBeam:true,sourceText:text});
      handled.add(text);
    } else if (record.sourceRecordKey === "Mechanical_Modification" && record.sourceSeasonEvidence?.actualSeason === 14
      && record.sourceSeasonEvidence.verificationComplete && text === mechanicalModificationCap) {
      mechanics.push({kind:"synthetic-troop-map-cap-halved",sourceText:text,sourceUrl:record.sourceUrl});
      handled.add(text);
    } else if (record.sourceRecordKey === "Mechanical_Modification" && text === "+40 % Physique for Minions summoned by the supported skill") {
      // Size is a separate effect; final hit rates account for target coverage.
      mechanics.push({kind:"minion-physique",value:40,sourceText:text});
      handled.add(text);
    } else if (item.id === MANIACAL_ARMY_ID && record.sourceSeasonEvidence?.actualSeason === 14
      && record.sourceSeasonEvidence.verificationComplete && text === maniacalArmyCommand) {
      mechanics.push({kind:"synthetic-troop-observed-command",rate:15,duration:5,interval:1,sourceText:text});
      handled.add(text);
    } else if (record.sourceRecordKey === 'Cost_Conversion' && text === costConversionLine) {
      parsed.effects.push({stat:'supported-skill-mana-cost-to-life',operation:'set',unit:'percent',value:100,sourceText:text});
      handled.add(text);
    } else if ((m = text.match(/^Adds ([\d.]+) - ([\d.]+) (Physical|Cold|Fire|Lightning|Erosion) Damage to the supported skill$/u)
      ?? text.match(/^Supported skills add ([\d.]+) - ([\d.]+) (physical|cold|fire|lightning|erosion) damage$/u))) {
      for (const [suffix, value] of [["min", Number(m[1])], ["max", Number(m[2])]]) parsed.effects.push({
        stat: `supported-skill-added-${m[3].toLowerCase()}-damage-${suffix}`, operation: "set", value, unit: "damage", sourceText: text });
      handled.add(text);
    } else if (record.sourceRecordKey === "High_Voltage" && record.sourceSeasonEvidence?.actualSeason === 14
      && record.sourceSeasonEvidence.verificationComplete && text === "Inflicts Numbed when the supported skill deals Hit Lightning Damage") {
      mechanics.push({ kind: "support-numbed-on-hit", sourceText: text, sourceUrl: record.sourceUrl });
      handled.add(text);
    } else if ((m = text.match(/^\+([\d.]+) Jumps for the supported skill$/u))) {
      mechanics.push({ kind: "projectile-jumps", value: Number(m[1]), sourceText: text }); handled.add(text);
    } else if ((m = text.match(/^\+([\d.]+) % Projectile Speed for the supported skill$/u))) {
      mechanics.push({ kind: "projectile-speed", value: Number(m[1]), sourceText: text }); handled.add(text);
    } else if ((m = text.match(/^\+([\d.]+) % Restoration Duration for the supported skill$/u))) {
      mechanics.push({ kind: "restoration-duration", value: Number(m[1]), sourceText: text }); handled.add(text);
    } else if ((m = text.match(/^\+([\d.]+) Max Charges for the supported skill$/u))) {
      mechanics.push({ kind: "maximum-charges", value: +m[1], sourceText: text }); handled.add(text);
    } else if ((m = text.match(/^Gains the following buff upon casting the supported skill: \+([\d.]+)% Movement Speed$/u))) {
      mechanics.push({ kind: "mobility-movement", value: +m[1], duration: 2, sourceText: text }); handled.add(text);
    } else if (record.sourceRecordKey === 'Periodic_Burst'
      && (m = text.match(/^Gains a stack of buff when using the supported skill every (\d+) s: \+([\d.]+) % Attack and Cast Speed after using a Mobility Skill$/u))
      && selected.tlidbText.en.detail.split('\n').includes('The buff lasts 2 s')) {
      mechanics.push({ kind: "periodic-burst", value: +m[2], interval: +m[1], duration: 2, sourceText: text });
      handled.add(text);
      handled.add(`Gains a stack of buff when using the supported skill every ${m[1]} s. The buff lasts 2s`);
    } else if (verified && item.id===VOLTAGE_TURMOIL_ID
      && text==='Damage Over Time dealt by the supported skill changes randomly between 30 % and 300 % instead') {
      mechanics.push({kind:'voltage-turmoil',sourceText:text});
      handled.add(text);
    } else if (verified && record.sourceRecordKey==='Voltaic_Ripple_Jolt_Magnificent'
      && text==='While the supported skill lasts, inflicts 3 stack(s) of Numbed when Reaping') {
      mechanics.push({kind:'voltage-jolt',stacks:3,sourceText:text,sourceUrl:record.sourceUrl});
      handled.add(text);
    } else if (verified && item.id===VOLTAGE_AFTERWAVE_ID
      && text==='The supported skill additionally generates an electric ring when Terra Charge stacks are greater than or equal to 3') {
      mechanics.push({kind:'voltage-afterwave',sourceText:text,sourceUrl:record.sourceUrl});
      handled.add(text);
    } else {
      const model=seasonConditionalExpression(text);
      if(!model)continue;
      const inner=parseTlidbSkillTooltipCalculation({...rolled.item,tlidbText:{en:{...rolled.item.tlidbText.en,detail:model.expression}}},
        {season:'SS14',level:resolved.parserLevel});
      if(inner.blockers.length||!inner.effects.length)continue;
      const lineIndex=rolled.item.tlidbText.en.detail.split(/\r?\n/u).findIndex(l=>l.trim().replace(/[‐‑‒–—−]/gu,'-').replace(/\s+/gu,' ')===text);
      if(lineIndex<0)continue;
      const key=`snapshot-${lineIndex}`;
      const blessing=model.control.unit?.match(/^stack of (Focus|Agility|Tenacity) Blessing$/u)?.[1];
      const bound=blessing?boundBlessingStacks(build)?.[blessing]:undefined;
      const value=bound===undefined?binding?.conditions?.[key]:Math.min(bound,model.control.max);
      const valid=Number.isInteger(value)&&value>=0&&value<=model.control.max;
      const effects=scaleSeasonConditionalEffects(inner.effects,model,valid?value:1);
      if(!effects)continue;
      base.conditionControls.push({...model.control,key,value:valid?value:'',sourceText:text,automatic:bound!==undefined,blessing,
        label:model.control.kind==='boolean'?'조건 충족 여부 (0: 미충족, 1: 충족)':model.control.label});
      handled.add(text);
      if(!valid)conditionBlockers.push('보조 효과의 조건 충족 여부 또는 적용 수량을 선택하세요.');
      else if(build&&blessing&&value>0&&bound===undefined)conditionBlockers.push('축복 기본 효과를 함께 계산하려면 전투 조건에서 축복 현재 중첩 3종을 선택하세요.');
      else parsed.effects.push(...effects.map(e=>({...e,sourceText:text})));
    }
  }
  parsed.blockers = parsed.blockers.filter(b => !handled.has(b.sourceText));
  parsed.effects=parsed.effects.filter(e=>!unresolvedEffects.has(e)||!handled.has(e.sourceText));
  if (conditionBlockers.length) return { ...base, blockers: conditionBlockers, evidenceBlockers: parsed.blockers };
  if (!getCurrentTlidbSupportCompatibility(item, { season: "SS14" }) || parsed.blockers.length || !parsed.effects.length) {
    return { ...base, blockers: ["SS14 보조의 호환 조건·효과 해석 미완료"], evidenceBlockers: parsed.blockers };
  }
  return { ...base, effects: parsed.effects, mechanics, progressionReceipt: resolved.receipt ?? null };
}

export function checkSeasonSupportHost(id, hostRecord, evaluation, rowIndex) {
  if (id === CLOCKWORK_CORE_ID) return rowIndex === 0 && hostRecord?.tags?.includes("Spell") === true;
  return isCurrentTlidbSupportCompatible(seasonSupportItem(id), {
    ...supportHostType(hostRecord, rowIndex),
    canDealDamage: evaluation?.values?.baseDps > 0, canHit: evaluation?.values?.averageHit > 0,
    canAilmentOrDot: evaluation?.damageCapabilities?.dot === true,
  }, { season: "SS14" });
}

// Only reject fixed card restrictions in the picker. Hit and damage may depend on pending inputs.
export function supportFitsSocket(id, hostRecord, rowIndex, supportIndex) {
  if (!hostRecord) return false;
  if (id === CLOCKWORK_CORE_ID) return clockworkSocket(rowIndex,supportIndex) && hostRecord.tags?.includes("Spell") === true;
  const item = seasonSupportItem(id), record = item?.tlidbText.en;
  const position = seasonSupportRequiredSlot(record);
  if (position !== null && (position !== supportIndex || record.detail.includes("Slot of each Passive Skill") !== (rowIndex >= 5))) return false;
  const rules = getCurrentTlidbSupportCompatibility(item, {season:"SS14"});
  return !!rules && matchesSupportHostType(rules, supportHostType(hostRecord, rowIndex));
}

export function seasonExclusiveSupportSlots(hostRecord, rowIndex) {
  if (!hostRecord) return [];
  const slots = new Map();
  for (const {id,name} of seasonSupportOptions()) {
    const grade = name.match(/\((부귀|숭고)\)$/u)?.[1];
    if (!grade) continue;
    const index = seasonSupportRequiredSlot(SS14_SUPPORTS_EN.records[id]);
    if (index === null || !supportFitsSocket(id,hostRecord,rowIndex,index)) continue;
    const grades = slots.get(index) ?? new Set();
    grades.add(grade);
    slots.set(index,grades);
  }
  return [...slots].sort(([a],[b])=>a-b).map(([index,grades])=>({index,grades:[...grades]}));
}

function supportHostType(hostRecord, rowIndex) {
  const tags = (hostRecord?.tags ?? []).map(tag => ({ Horizontal: 'straight_shot', Vertical:'falling', Parabolic:'lob',
    Restoration:'recovery',Defensive:'guard',Focus:'infuse',Barrage:'bombardment',Terra:'ground',
    'Synthetic Troop':'synthetic','Spirit Magus':'spirit','Shadow Strike':'shadow_strike','Slash-Strike':'steep_strike',Demolisher:'strike' })[tag] ?? tag);
  return { tags, role: rowIndex < 5 ? "active" : "passive", names: [hostRecord?.name] };
}
