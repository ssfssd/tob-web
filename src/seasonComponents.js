import { findItemById } from "./catalog.js";
import { SS14_COMPONENTS } from "./data/ss14Components.generated.js";
import "./seasonCurrentDatabase.js";
import { inspectSeasonAllocation } from "./seasonAllocation.js";
import { boundBlessingStacks, blessingConditionValue } from "./seasonBlessings.js";
import { seasonMemoryRows } from "./seasonMemories.js";
import { seasonDestinyRow, pactNodeActive, validFateLayout, activeExtraSlot } from "./seasonDestiny.js";
import { SS14_DESTINY } from "./data/ss14Destiny.generated.js";
import { seasonExtensionRows } from "./seasonExtensions.js";
import { EMPTY_TRAIT_MEMORY, canMarkTraitMemoryEmpty, traitSlots, traitSlotCount } from "./seasonHeroSelection.js";
import { parseSeasonHeroMechanics } from "./seasonHeroMechanics.js";
import { resolveSeasonSlates, seasonSlateEntry } from "./seasonDivinity.js";
import { netherTalent, netherPage, netherTopology, parseNetherTalent, netherJudgmentScale, netherTalentId, scaleNetherRow, parseNetherBanishment, applyNetherAggression } from './seasonNether.js';
import { applyNetherModifiers } from './seasonNetherModifiers.js';
import { netherRule } from './seasonNetherRemaining.js';
import { revelationReplacement, revelationPage, parseRevelation, theaRulePin } from "./seasonTheaRevelation.js";
import { parseTheaBlessingSources } from "./seasonTheaBlessingSources.js";
import { seasonGearConditionRows } from './seasonGearConditionRows.js';
import { seasonNonCombatEffect } from './seasonNonCombatEffects.js';
import { seasonConditionalExpression, scaleSeasonConditionalEffects } from './seasonEffectConditions.js';
import { parseTlidbNumericModifierLine } from './tlidbGearTooltipCalculation.js';
import { normalizeSeasonGearEffects } from './seasonGearEffects.js';
import { applySeasonCurses } from './seasonCurseEffects.js';

export const SEASON_COMPONENT_LABELS = { hero: "히어로 특성", talents: "재능·프리즘·역상", divinity: "신격", pact: "정령", skills: "영약·모듈", gear: "제작 옵션" };
const stats = { "damage": "damage", "spell damage": "spell_damage", "attack damage": "attack_damage",
  "area damage": "area_damage", "projectile damage": "projectile_damage", "max damage": "max_damage", "min damage": "min_damage",
  "max spell burst": "max_spell_burst", "spell burst charge speed": "spell_burst_charge_speed",
  "fire penetration": "fire_penetration", "cold penetration": "cold_penetration", "lightning penetration": "lightning_penetration",
  "fire resistance penetration": "fire_penetration", "cold resistance penetration": "cold_penetration", "lightning resistance penetration": "lightning_penetration",
  "erosion resistance penetration": "erosion_resistance_penetration", "elemental resistance penetration": "elemental_resistance_penetration",
  "armor dmg mitigation penetration": "armor_damage_mitigation_penetration",
  "cold penetration for minions": "minion_cold_penetration", "fire penetration for minions": "minion_fire_penetration",
  "lightning penetration for minions": "minion_lightning_penetration", "erosion resistance penetration for minions": "minion_erosion_penetration",
  "armor dmg mitigation penetration for minions": "minion_armor_penetration",
  "damage over time": "damage_over_time", "affliction effect": "affliction_effect",
  "elemental damage": "elemental_damage", "fire damage": "fire_damage", "cold damage": "cold_damage",
  "lightning damage": "lightning_damage", "physical damage": "physical_damage", "erosion damage": "erosion_damage",
  "cast speed": "cast_speed", "attack speed": "attack_speed", "movement speed": "movement_speed", "projectile speed": "projectile_speed", "hit damage": "hit_damage",
  "max life": "max_life", "max mana": "max_mana", "max energy shield": "max_energy_shield",
  "strength": "strength", "dexterity": "dexterity", "intelligence": "intelligence", "all stats": "all_stats",
  "armor": "armor", "evasion": "evasion", "fire resistance": "fire_resistance", "cold resistance": "cold_resistance",
  "lightning resistance": "lightning_resistance", "erosion resistance": "erosion_resistance",
  "elemental resistance": "elemental_resistance", "minion damage": "minion_damage",
  "minion fire damage": "minion_fire_damage", "minion lightning damage": "minion_lightning_damage",
  "minion attack speed": "minion_attack_speed", "minion cast speed": "minion_cast_speed",
  "attack critical strike rating": "attack_critical_strike_rating", "spell critical strike rating": "spell_critical_strike_rating",
  "critical strike rating": "critical_strike_rating", "critical strike damage": "critical_strike_damage",
  "spell critical strike damage": "spell_critical_strike_damage", "attack critical strike damage": "attack_critical_strike_damage",
  "fire skill critical strike damage": "fire_skill_critical_strike_damage", "cold skill critical strike damage": "cold_skill_critical_strike_damage",
  "lightning skill critical strike damage": "lightning_skill_critical_strike_damage", "erosion skill critical strike damage": "erosion_skill_critical_strike_damage",
  "physical skill critical strike damage": "physical_skill_critical_strike_damage",
  "projectile critical strike rating": "projectile_critical_strike_rating", "projectile critical strike damage": "projectile_critical_strike_damage",
  "damage taken": "damage_taken", "life regeneration speed": "life_regeneration_speed",
  "mana regeneration speed": "mana_regeneration_speed", "energy shield charge speed": "energy_shield_charge_speed",
  "energy shield charge interval": "energy_shield_charge_interval", "attack block chance": "attack_block_chance",
  "spell block chance": "spell_block_chance", "block chance": "block_chance", "attack and spell block chance": "block_chance", "block ratio": "block_ratio",
  "max block ratio": "max_block_ratio", "max elemental resistance": "max_elemental_resistance",
  "max fire resistance": "max_fire_resistance", "max cold resistance": "max_cold_resistance",
  "max lightning resistance": "max_lightning_resistance", "max erosion resistance": "max_erosion_resistance" };
Object.assign(stats,{'minion max life':'minion_max_life','max frostbite rating':'max_frostbite_rating',
  'warcry effect':'warcry_effect','aura effect':'aura_effect','sealed mana compensation':'sealed_mana_compensation',
  'physical damage taken':'physical_damage_taken','terra skill damage':'terra_damage'});
Object.assign(stats,{'damage for channeled skills':'channeled_skill_damage','skill area':'skill_area',
  'life regain':'life_regain','energy shield regain':'energy_shield_regain'});
Object.assign(stats,{'skill effect duration':'skill_effect_duration','origin of spirit magus effect':'spirit_magus_origin_effect',
  'reaping recovery speed':'reaping_recovery_speed','reaping duration':'reaping_duration',
  'chance to inflict damaging ailments':'damaging_ailment_chance'});
stats['curse effect']='curse_effect';
const safeKo = (text) => typeof text === "string" && /[가-힣]/u.test(text) && !/\p{Script=Han}/u.test(text) ? text : "한국어 원문 미제공";
const populated = (x) => x && typeof x === "object" && Object.keys(x).length > 0;
const receipt = (page, key) => page && ({ season: "SS14", sourceUrl: page.sourceUrl,
  sourcePageSha256: page.sourcePageSha256, sourceRecordKey: key, authorityScope: "preview-site-deployment" });

export const validSeasonConditionValue = (control, value) => value === "" || Number.isInteger(value)
  && value >= 0 && value <= (control.kind === "count" ? control.max : 1);

function conditionalClause(clean) {
  const allBlessings = clean.match(/^(.*?) while having Tenacity Blessing, Agility Blessing, and Focus Blessing$/u);
  if (allBlessings) return { expression: allBlessings[1], kind: "boolean", max: 1, conditionGroup: "all-blessings-active" };
  const shield = clean.match(/^(.*?) (when the Energy Shield is not low|at Low Energy Shield)$/u);
  if (shield) return { expression: shield[1], kind: "boolean", max: 1, conditionGroup: "self-low-energy-shield",
    inverted: shield[2] === "when the Energy Shield is not low" };
  const paralyzed = clean.match(/^(.*?) against Paralyzed enemies$/u);
  if (paralyzed) return { expression: paralyzed[1], kind: "boolean", max: 1, conditionGroup: "enemy-paralyzed" };
  const boolean = clean.match(/^(.*?) (while (?:standing still|channeling|Dual Wielding|holding a Shield|having Fervor|having Bond|(?:Tenacity|Focus) Blessing is active|Blur is active)|when (?:having Attack Aggression|holding a Shield|Pure Heart is active)|(?:when )?(?:not )?at (?:Low|Full) Life|against Low Life enemies)$/u);
  if (boolean) return { expression: boolean[1], kind: "boolean", max: 1,
    conditionGroup: /^(?:when )?(?:not )?at Low Life$/u.test(boolean[2]) ? "self-low-life" : boolean[2],
    inverted: boolean[2].includes("not at Low Life") };
  const stack = clean.match(/^(.*?) per stack of (Tenacity|Focus|Agility) Blessing(?: owned)?$/u);
  if (stack) return { expression: stack[1], kind: "count", max: 4, conditionGroup: `${stack[2]}-blessing` };
  const wilt = clean.match(/^(.*?) per stack of Wilt inflicted, stacking up to (60) times$/u);
  if (wilt) return { expression: wilt[1], kind: "count", max: 60, conditionGroup: "enemy-wilt" };
  return null;
}

// Exact numeric clauses and explicitly bound Boolean conditions only. A partial
// sentence, range, stack or conversion is never accepted as a global modifier.
export function parseSeasonComponentLines(text, multiplier = 1, options = {}) {
  const effects = []; const blockers = []; const conditions = []; const inactive = [];
  if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > 100) return { effects, conditions, inactive,
    blockers: [{ reason: "선택 포인트 범위를 확인하세요." }] };
  let conditional = false;
  for (const [lineIndex, line] of String(text ?? "").split(/\r?\n/u).map((x) => x.trim()).filter(Boolean).entries()) {
    if(seasonNonCombatEffect(line)){inactive.push({sourceText:line,reason:line==='+% Drop Quantity'
      ?'전리품 수치가 원문에 없음. 전투 대미지 합산 대상이 아니며 수치를 추정하지 않음.'
      :'전리품·경험치 효과: 전투 대미지 합산 대상 아님'});continue;}
    const model=seasonConditionalExpression(line);
    if(model&&!conditional&&!conditionalClause(line)) {
      const blessing=model.control.unit?.match(/^stack of (Focus|Agility|Tenacity) Blessing$/u)?.[1];
      if(blessing)model.control={...model.control,max:options.blessingStacks?100:4};
      const inner=parseSeasonComponentLines(model.expression,1,options);
      // A recognisable predicate cannot make an unknown inner effect supported.
      if(!inner.blockers.length&&!inner.conditions.length&&inner.effects.length) {
        const key=`${options.path??'effect'}:${lineIndex}`;
        const binding=options.conditions?.[key];
        const value=(blessing?options.blessingStacks?.[blessing]:undefined)
          ?? (binding&&binding.sourcePageSha256===options.sourcePageSha256?binding.value:undefined);
        const valid=value!==''&&validSeasonConditionValue(model.control,value);
        const scaled=scaleSeasonConditionalEffects(inner.effects,model,valid?value:1);
        if(scaled&&!(model.multiplies&&multiplier>1)) {
          conditions.push({...model.control,key,conditionGroup:blessing?`${blessing}-blessing`:`snapshot:${key}`,sourceLineIndex:lineIndex,
            sourceText:line,sourcePageSha256:options.sourcePageSha256,value:valid?value:''});
          if(!valid)blockers.push({sourceText:line,reason:'조건 충족 여부 또는 적용 수량을 선택하세요.'});
          else if(value===0)inactive.push({sourceText:line,reason:'입력 조건 미충족'});
          else effects.push(...scaled.map(e=>({...e,value:e.value*multiplier,multiplier,sourceText:line,sourceLineIndex:lineIndex})));
          continue;
        }
      }
    }
    if (/:$/u.test(line) || /^(?:Randomly triggers |After |When |Every |Upon |Once |If )/u.test(line)) conditional = true;
    const clean = line.replace(/\s*\(Max Active Divinity: \d+\)$/u, "").replace(/^\+(\d+(?:\.\d+)?) to Max Frostbite Rating$/u,'+$1 Max Frostbite Rating')
      .replace(/^Damage Penetrates (\d+(?:\.\d+)?) % Elemental Resistance$/u,'+$1 % Elemental Resistance Penetration')
      .replace(/^You can inflict (\d+) additional Curse$/u,'You can cast $1 additional Curses');
    // State is deliberately explicit; missing does not mean false. Only
    // instantaneous Boolean predicates are accepted, never proc/cadence text.
    const conditionalMatch = conditionalClause(clean);
    const key = `${options.path ?? "effect"}:${lineIndex}`;
    const binding = options.conditions?.[key];
    const state = blessingConditionValue(conditionalMatch, options.blessingStacks)
      ?? (binding && binding.sourcePageSha256 === options.sourcePageSha256 ? binding.value : undefined);
    const validState = conditionalMatch && state !== undefined && (validSeasonConditionValue(conditionalMatch, state)
      || options.blessingStacks && /-blessing$/u.test(conditionalMatch.conditionGroup) && Number.isInteger(state) && state >= 0 && state <= 100) && state !== "";
    if (conditionalMatch && !conditional) conditions.push({ ...conditionalMatch, key, sourceLineIndex: lineIndex, sourceText: line,
      sourcePageSha256: options.sourcePageSha256, value: validState ? state : "" });
    const expression = conditionalMatch?.expression ?? clean;
    const scale = multiplier * (conditionalMatch?.kind === "count" && validState ? state : 1);
    for (const clause of expression.split(/;\s*| and (?=[+-]?\d)/u)) {
      const damageLuck = ["Lucky Damage", "Unlucky Damage", "Very Lucky Damage"].includes(clause) ? clause
        : clause === "Your and Minions' damage gains Lucky" ? "Lucky Damage" : null;
      const burstDamage = clause.match(/^([+-]?\d+(?:\.\d+)?)\s*% additional Hit Damage for skills cast by Spell Burst$/u);
      if (!conditional && (damageLuck || burstDamage)) {
        if (conditionalMatch && !validState) { blockers.push({ sourceText: line, reason: "SS14 특수 효과의 조건을 직접 확인하세요." }); continue; }
        if (conditionalMatch && state === 0) { inactive.push({ sourceText: line, reason: "입력 조건 미충족" }); continue; }
        effects.push({ stat: burstDamage ? "spell_burst_hit_damage" : damageLuck.startsWith("Unlucky") ? "damage_unlucky" : damageLuck.startsWith("Very") ? "damage_very_lucky" : "damage_lucky",
          operation: burstDamage ? "more" : "set", value: burstDamage ? Number(burstDamage[1]) * scale : 1,
          unit: burstDamage ? "percent" : "boolean", sourceText: line, sourceLineIndex: lineIndex, multiplier });
        continue;
      }
      if (!conditional && !conditionalMatch && ["Lucky Critical Strike", "Unlucky Critical Strike", "Very Lucky Critical Strike"].includes(clause)) {
        effects.push({ stat: clause.startsWith("Unlucky") ? "critical_strike_unlucky" : clause.startsWith("Very") ? "critical_strike_very_lucky" : "critical_strike_lucky",
          operation: "set", value: 1, sourceText: line, sourceLineIndex: lineIndex, multiplier });
        continue;
      }
      if (!conditional && !conditionalMatch && clause === "Unable to evade") {
        effects.push({ stat: "can_evade", operation: "set", value: 0, sourceText: line, sourceLineIndex: lineIndex, multiplier });
        continue;
      }
      const attackDouble = clause.match(/^Attack Skills: a ([+-]?\d+(?:\.\d+)?)\s*% chance to deal Double Damage$/u);
      const double = clause.match(/^([+-]?\d+(?:\.\d+)?)\s*% chance (?:to|for (Attacks|Spells) to) deal Double Damage$/u)
        ?? (attackDouble ? [attackDouble[0], attackDouble[1], "Attacks"] : null);
      if (!conditional && double) {
        if (conditionalMatch && !validState) { blockers.push({ sourceText: line, reason: "SS14 조건 충족 여부·중첩 수를 지원 범위에서 직접 입력하세요." }); continue; }
        if (conditionalMatch && state === 0) { inactive.push({ sourceText: line, reason: "입력 조건 미충족" }); continue; }
        effects.push({ stat: `${double[2] === "Attacks" ? "attack_" : double[2] === "Spells" ? "spell_" : ""}double_damage_chance`,
          operation: "add_percent", value: Number(double[1]) * scale, unit: "percent", sourceText: line, sourceLineIndex: lineIndex, multiplier });
        continue;
      }
      if (!conditional && !conditionalMatch && clause === "Block Ratio is set to 0 %") {
        effects.push({ stat: "block_ratio", operation: "set", value: 0, sourceText: line, sourceLineIndex: lineIndex, multiplier });
        continue;
      }
      const fixedResources = {
        "Your Max Life is set to 100": [["max_life", 100]],
        "Your Max Energy Shield is fixed at 0": [["max_energy_shield", 0]],
        "Your Evasion and Max Energy Shield are fixed at 0": [["evasion", 0], ["max_energy_shield", 0]],
      }[clause];
      if (!conditional && !conditionalMatch && fixedResources) {
        // A fixed final value is not multiplied by allocated points or bonuses.
        effects.push(...fixedResources.map(([stat, value]) => ({ stat, operation: "set", value,
          sourceText: line, sourceLineIndex: lineIndex, multiplier })));
        continue;
      }
      const regen = clause.match(/^Regenerates? (\d+(?:\.\d+)?)\s*(%)? (Life|Mana) per second$/u);
      if (!conditional && regen && Number.isInteger(multiplier) && multiplier >= 1 && multiplier <= 100) {
        if (conditionalMatch && !validState) { blockers.push({ sourceText: line, reason: "SS14 조건 충족 여부·중첩 수를 지원 범위에서 직접 입력하세요." }); continue; }
        if (conditionalMatch && state === 0) { inactive.push({ sourceText: line, reason: "입력 조건 미충족" }); continue; }
        effects.push({ stat: `${regen[3].toLowerCase()}_regeneration_${regen[2] ? "percent" : "flat"}`, operation: "add",
          value: Number(regen[1]) * scale, unit: regen[2] ? "percent" : "flat", sourceText: line, sourceLineIndex: lineIndex, multiplier });
        continue;
      }
      const match = clause.match(/^([+-]?\d+(?:\.\d+)?)\s*(%)?\s*(additional\s+)?([A-Za-z ]+)$/u);
      const stat = match && (match[4].trim().toLowerCase() === "attack and cast speed" && match[2]
        ? ["attack_speed", "cast_speed"] : match[4].trim().toLowerCase() === "minion attack and cast speed" && match[2]
          ? ["minion_attack_speed", "minion_cast_speed"] : match[4].trim().toLowerCase() === "elemental and erosion resistance" && match[2]
          ? ["elemental_resistance", "erosion_resistance"] : stats[match[4].trim().toLowerCase()]);
      if (!conditional && stat && Number.isInteger(multiplier) && multiplier >= 1 && multiplier <= 100 && (!match[3] || match[2])) {
        if (conditionalMatch && !validState) { blockers.push({ sourceText: line, reason: "SS14 조건 충족 여부·중첩 수를 지원 범위에서 직접 입력하세요." }); continue; }
        if (conditionalMatch && state === 0) { inactive.push({ sourceText: line, reason: "입력 조건 미충족" }); continue; }
        effects.push(...(Array.isArray(stat) ? stat : [stat]).map((name) => ({ stat: name, operation: match[3] ? "more" : match[2] ? "add_percent" : "add",
          value: Number(match[1]) * scale, unit: match[2] ? "percent" : "flat", sourceText: line, sourceLineIndex: lineIndex, multiplier })));
      } else {
        const missingSpeedUnit=/^[+-]?[\d.]+\s+(?:Minion )?Attack and Cast Speed$/u.test(clause);
        const direct=!conditional&&!conditionalMatch&&!missingSpeedUnit?normalizeSeasonGearEffects(parseTlidbNumericModifierLine(clause)):null;
        if(direct?.effects.length&&!direct.blockers.length&&direct.effects.every(e=>Number.isFinite(e.value)&&!e.roll&&!e.condition&&!e.conditionRequirements&&!e.target&&!e.per
          &&(e.unit!=='percent'||clause.includes('%'))))
          effects.push(...direct.effects.map(e=>({...e,value:e.operation==='set'?e.value:e.value*multiplier,sourceText:line,sourceLineIndex:lineIndex,multiplier})));
        else blockers.push({ sourceText: clause, reason: "조건·범위·특수 효과의 계산 미지원" });
      }
    }
  }
  return { effects, blockers, conditions, inactive };
}

function pageFor(item, locale, data) {
  const page = data.pages[item?.tlidbText?.[locale]?.sourceUrl];
  return page?.status === "collected-preview" && page.season === "SS14" && page.sourceSeasonEvidence?.verificationComplete === true
    && page.sourceSeasonEvidence.actualSeason === 14 && /^[a-f0-9]{64}$/u.test(page.sourcePageSha256) ? page : null;
}
function stableEntry(item, page) {
  const match = item?.tlidbText?.en?.sourceRecordKey?.match(/^data-(?:talent-)?id:(\d+):(core|regular)$/u);
  if (!match) return null;
  const matches = (page?.parsed.entries ?? []).filter((row) => row.id === match[1] && row.section === match[2]);
  return matches.length === 1 ? matches[0] : null;
}
function heroTier(trait, tier, locale) {
  const heading = locale === "ko" ? /^(?:레벨|등급)\s*(\d+)$/u : /^Level (\d+)$/u;
  let active = false; const texts = [];
  for (const block of trait?.detailBlocks ?? []) {
    if (block.kind === "tier") active = Number(block.text.match(heading)?.[1]) === tier;
    else if (active && ["affix", "server_affix"].includes(block.kind)) texts.push(block.text);
  }
  return texts.join("\n");
}

export function projectSeasonComponents(build, { data = SS14_COMPONENTS, requireBindings = build?.patchSnapshot?.season === "SS14" } = {}) {
  const rows = seasonGearConditionRows(build);
  const resolvedSlates = resolveSeasonSlates(build);
  const netherTemplate = resolvedSlates.special.find(t=>t.nether);
  const topology = netherTopology(netherTemplate?.board, netherTemplate, resolvedSlates.selections.map(s=>({...s,nativeId:seasonSlateEntry(s.selection.valueId)?.id})));
  rows.push(...seasonExtensionRows(build, { parseLines: parseSeasonComponentLines, requireBindings }));
  const allocation = inspectSeasonAllocation(build, { components: data });
  for (const row of rows.filter(r => r.talentTransform)) if (allocation.issues.some(i => i.path.startsWith(`talents.boards.${row.talentTransform.boardIndex}`))) {
    row.effects = []; delete row.talentTransform; row.status = "partial";
    row.blockers.push({ reason: "재능 포인트 배치 오류로 프리즘 수치를 제외했습니다." });
  }
  const add = (group, path, item, page, record, text, koText, multiplier = 1, reason = "", control = null, replacement = null, inactiveReason = '') => {
    const invalid = allocation.issues.filter((row) => path === row.path || path.startsWith(`${row.path}.`));
    const nether = netherTalent(record?.match(/^data-(?:talent-)?id:(\d+):/u)?.[1]);
    if(nether){page=netherPage();text=nether.detail;koText=nether.ko;}
    const parsed = inactiveReason&&!reason&&page ? {effects:[],blockers:[],conditions:[],inactive:[{reason:inactiveReason}]}
      : reason || !page || !text ? { effects: [], blockers: [{ reason: reason || "SS14 선택 항목 원문 미확보" }] }
      : nether ? parseNetherTalent(nether,{parseLines:parseSeasonComponentLines,build,path,topology})
      : replacement ? parseRevelation(replacement, { build, multiplier, parseLines: parseSeasonComponentLines,
        options: { path, sourcePageSha256: page.sourcePageSha256, conditions: build.ss14Inputs?.componentConditions, blessingStacks: boundBlessingStacks(build) } })
      : group === "hero" && parseSeasonHeroMechanics(text, { build, recordKey: record, parseLines: parseSeasonComponentLines })
        || parseTheaBlessingSources(text, build, multiplier, parseSeasonComponentLines, { path, sourcePageSha256: page.sourcePageSha256,
          conditions: build.ss14Inputs?.componentConditions, blessingStacks: boundBlessingStacks(build) })
        || parseSeasonComponentLines(text, multiplier, { path, sourcePageSha256: page.sourcePageSha256, conditions: build.ss14Inputs?.componentConditions,
          blessingStacks: boundBlessingStacks(build) });
    if (invalid.length) { parsed.effects = []; parsed.blockers.push(...invalid); }
    const source = receipt(page, record);
    if (source && requireBindings && (replacement ? build.ss14Inputs?.theaRulesReceipt !== theaRulePin() : build.ss14Inputs?.componentReceipts?.[source.sourceUrl] !== source.sourcePageSha256)) {
      parsed.effects = [];
      parsed.blockers.push({ reason: "저장 입력의 SS14 원문 연결이 없거나 변경되었습니다. 해당 구성을 다시 이전하세요." });
    }
    rows.push({ group, path, itemId: item?.id ?? null, name: safeKo(koText?.name ?? item?.tlidbText?.ko?.name),
      detail: safeKo(koText?.detail), selectionCount: multiplier, receipt: source, control,
      maxActive: Number(text?.match(/\(Max (?:Active Divinity|Divinity Effect): (\d+)\)/u)?.[1]) || null,
      ...(nether ? {netherTalentId:nether.id} : {}),
      conditionControls: parsed.conditions ?? [], inactive: parsed.inactive ?? [],
      mechanics: parsed.mechanics ?? [], heroControls: parsed.heroControls ?? [],
      effects: parsed.effects.map((effect) => ({ ...effect, receipt: source, path, group })), blockers: parsed.blockers,
      status: parsed.blockers.length ? "partial" : "mapped" });
  };
  const hero = build?.hero;
  for (const memory of seasonMemoryRows(build)) {
    add("hero", memory.path, memory.item, memory.page, memory.record, memory.text, memory.koText, 1, memory.reason);
    rows.at(-1).memoryControl = memory.memoryControl ?? null;
    rows.at(-1).memoryRollControls = memory.memoryRollControls ?? [];
  }
  if (hero?.branchId) {
    const identity = data.heroIdentities?.find((row) => [row.id, row.catalogId, row.sourcePath].includes(hero.branchId));
    const item = findItemById(identity?.catalogId); const en = pageFor(item, "en", data); const ko = pageFor(item, "ko", data);
    const seen = new Set();
    for (const [index, selection] of (hero.traitSelections ?? []).entries()) for (const id of selection.choiceIds ?? []) {
      const key = build.ss14Inputs?.heroSelection?.heroId === hero.branchId
        && en?.parsed.traits.some(row => row.key === id) ? id
        : identity?.choices.find((row) => [row.id, row.sourceId].includes(id))?.recordKey;
      const trait = en?.parsed.traits.find((row) => row.key === key);
      const koTrait = ko?.parsed.traits.find((row) => row.key === key);
      const binding = build.ss14Inputs?.heroTiers?.[id];
      const tier = binding?.tier ?? selection.choiceTiers?.[id];
      const path = `hero.traitSelections.${index}.${id}`;
      const maxTier = Math.max(0, ...(trait?.detailBlocks ?? []).filter(b => b.kind === "tier").map(b => Number(b.text.match(/^Level (\d+)$/u)?.[1]) || 0));
      const control = trait ? { choiceId: id, name: safeKo(koTrait?.name), maxTier, tier: Number.isInteger(tier) ? tier : "", sourcePageSha256: en.sourcePageSha256 } : null;
      const duplicate = seen.has(key); seen.add(key);
      const reason = !trait ? "SS14 특성 ID 연결 미확보" : duplicate ? "중복 선택 특성은 합산하지 않습니다."
        : trait.requiredLevel > (hero.level ?? build.heroLevel) ? "히어로 레벨보다 높은 특성입니다."
          : binding && binding.sourcePageSha256 !== en.sourcePageSha256 ? "SS14 특성 원문이 변경되어 단계 재선택이 필요합니다."
            : !Number.isInteger(tier) || tier < 1 || tier > maxTier ? "SS14 특성 단계를 직접 선택하세요. SS13 입력에 없는 단계는 추정하지 않습니다." : "";
      add("hero", path, item, en, key, heroTier(trait, tier, "en"), { name: koTrait?.name, detail: heroTier(koTrait, tier, "ko") }, 1, reason, control);
    }
    if (!(hero.traitSelections ?? []).length) add("hero", "hero", item, en, "", "", null, 1, "선택한 히어로의 특성이 없습니다.");
    if (build.ss14Inputs?.heroSelection) for (const level of [1, 45, 60, 75]) {
      const choice = build.ss14Inputs.heroSelection.choices[level];
      const selected=traitSlots(choice).filter(k=>k && (k!==EMPTY_TRAIT_MEMORY || canMarkTraitMemoryEmpty(build,level)));
      // Older documents explicitly marked the entire stage as unequipped.
      const emptyStage=choice===EMPTY_TRAIT_MEMORY && canMarkTraitMemoryEmpty(build,level);
      if (!emptyStage && level <= (hero.level ?? build.heroLevel) && selected.length < traitSlotCount(hero.branchId,level)) {
        add("hero", `hero.traitSelections.missing.${level}`, item, en, "", "", null, 1, `${level}레벨 히어로 특성을 선택하세요.`);
      }
    }
  }
  for (const [index, board] of (build?.talents?.boards ?? []).entries()) {
    const prism = rows.find(r => r.talentTransform?.boardIndex === index)?.talentTransform;
    const transformed = [build.talents.placedPrism, build.talents.placedInverseImage].some((placement) => placement && placement.boardIndex === index)
      || populated(board.placedPrism) || populated(board.placedInverseImage)
      || (board.prismSlots ?? []).some(Boolean) || (board.inverseImageSlots ?? []).some(Boolean)
      || Object.values(board.reflectedNodePoints ?? {}).some((n) => n > 0);
    const selected = [...Object.entries(board.nodePoints ?? {}).filter(([, points]) => points > 0), ...(board.coreTalentIds ?? []).map((id) => [id, 1])];
    for (const [id, points] of selected) {
      if (prism?.suppressedNodeId === id) continue;
      const item = findItemById(id); const en = pageFor(item, "en", data); const ko = pageFor(item, "ko", data);
      const entry = stableEntry(item, en); const koEntry = stableEntry(item, ko);
      const belongs = board.treeSlug && data.pages[`https://tlidb.com/en/${board.treeSlug}`]?.parsed.entries?.some((row) => row.id === entry?.id);
      const replacement = revelationReplacement(build, index, board.treeSlug, entry?.id);
      add("talents", `talents.boards.${index}.${id}`, item, replacement ? revelationPage() : en, replacement ? `data-id:${replacement.targetId}:regular` : item?.tlidbText?.en?.sourceRecordKey,
        replacement?.detail ?? entry?.detail, replacement ? { name: replacement.name, detail: replacement.koDetail } : koEntry, points,
        transformed && (!prism || replacement) ? "프리즘·역상과 계시 재능의 결합 변환은 별도 검증이 필요합니다." : !belongs ? "선택 재능과 SS14 패널 소속을 확인하지 못했습니다." : "", null, replacement);
      if (replacement) rows.at(-1).revelation = { sourceId: replacement.sourceId, targetId: replacement.targetId, receipt: theaRulePin() };
    }
  }
  const board = build?.divinity?.boards?.find((row) => row.boardId === build.divinity.activeBoardId);
  if (board) {
    const resolved = resolvedSlates;
    for (const template of resolved.special) {
      const bound = build.ss14Inputs?.slateSelections?.[template.slate.instanceId];
      if (bound && bound.sourcePageSha256 !== template.page.sourcePageSha256) template.blockers.push({ reason: "SS14 석판 슬롯의 원문이 변경되었습니다." });
      rows.push({ group: "divinity", path: `divinity.${board.boardId}.${template.slate.instanceId}`, itemId: template.slate.slateId,
        name: template.name, detail: template.detail, receipt: receipt(template.page, template.slug), selectionCount: 1, maxActive: null,
        conditionControls: [], inactive: [], effects: [], blockers: template.blockers, status: template.blockers.length ? "partial" : "mapped", slateControls: template.controls });
      if(template.nether) {
        rows.at(-1).nether = {active:template.active,adjacent:topology.adjacent,line:topology.line};
        if(!template.active&&!template.blockers.length)rows.at(-1).inactive.push({reason:'모든 명왕 소켓을 채우면 고유 효과가 활성화됩니다.'});
        if(template.active&&template.slate.slateId==='nether_banishment') {
          const row=rows.at(-1), parsed=parseNetherBanishment(template,{parseLines:parseSeasonComponentLines,build,path:row.path,topology});
          row.effects=parsed.effects.map(e=>({...e,receipt:receipt(netherPage(),'Banishment'),path:row.path,group:'divinity'}));
          row.blockers.push(...parsed.blockers);row.conditionControls=parsed.conditions;row.mechanics=parsed.mechanics;
          row.status=row.blockers.length?'partial':'mapped';
        }
      }
    }
    for (const { slate, slot, selection: selected, copiedFrom } of resolved.selections) {
        const instanceId = slate.instanceId;
        const native = netherTalent(selected.valueId);
        const item = native ? {id:selected.valueId,categoryId:'slates',tlidbText:{en:{sourceRecordKey:`data-id:${native.id}:regular`}}} : findItemById(selected.valueId);
        const en = native ? netherPage() : pageFor(item, "en", data); const ko = pageFor(item, "ko", data);
        const entry = native ?? stableEntry(item, en); const koEntry = native?.ko ?? stableEntry(item, ko);
        const points = [...new Set([selected.points, selected.pointCount, selected.point].filter((value) => value != null && value !== ""))];
        const modified = selected.effectMultiplier != null && selected.effectMultiplier !== 1 || populated(selected.config) || populated(selected.pointConfig);
        add("divinity", `divinity.${board.boardId}.${instanceId}.${slot}`, item, en, item?.tlidbText?.en?.sourceRecordKey,
          entry?.detail, koEntry, points[0] ?? 1, points.length > 1 ? "석판 포인트 입력이 서로 충돌합니다."
            : modified ? "석판 추가 배율·설정의 SS14 효과 미검증" : slate.slateId !== "six_gods" && !resolved.special.some(r => r.slate.instanceId === instanceId) ? "SS14 특수 석판 원문 미확보" : !item || item.categoryId !== "slates" ? "석판 옵션 ID 연결 미확보" : "");
        if (copiedFrom) rows.at(-1).copiedFrom = copiedFrom;
        if(topology.active&&topology.type==='nether_judgment') {
          const row=rows.at(-1), ownBrand=topology.owner===instanceId && netherTalent(row.netherTalentId)?.typeLabel==='Ultimate Nether King Talent Node';
          if(ownBrand || topology.line.includes(instanceId)) {
            scaleNetherRow(row,ownBrand ? .7 : netherJudgmentScale(topology,slate.slateId));
            row.judgmentSource='https://torchlight.xd.com/ss14pn/';
          }
        }
    }
    if(topology.active&&topology.type==='nether_contamination') {
      const projectionRule=netherRule('Contamination');
      const conflict=projectionRule?.body.includes('-88% Effect');
      if(conflict) {
        const templateRow=rows.find(r=>r.itemId==='nether_contamination');
        templateRow.blockers.push({reason:'SS14 인펙션 출처 충돌: 명왕 안내 20%, 연결 효과 원문·설치 표 12%. 투영 수치를 확정하지 않습니다.',
          sources:[netherPage().sourceUrl,projectionRule.sourceUrl]});templateRow.status='partial';
      }
      const own=resolved.selections.filter(s=>s.slate.instanceId===netherTemplate.slate.instanceId&&netherTalent(s.selection.valueId)?.typeLabel==='Ultimate Nether King Talent Node');
      for(const instanceId of topology.adjacent)for(const source of own) {
        const talent=netherTalent(source.selection.valueId);
        if(talent.id.startsWith('920'))continue; // Topology changes are not recursively projected.
        const path=`divinity.${board.boardId}.${instanceId}.nether_projection_${talent.id}`;
        add('divinity',path,{id:netherTalentId(talent.id)},netherPage(),`data-id:${talent.id}:regular`,talent.detail,talent.ko);
        const projected=rows.at(-1);projected.selectionCount=0;projected.copiedFrom=netherTemplate.slate.instanceId;
        if(conflict){projected.effects=[];projected.blockers.push({reason:'인펙션 기본 투영 비율의 출처 충돌'});projected.status='partial';}
        else scaleNetherRow(projected,.2);
      }
      if(topology.selectedIds.some(id=>/^9200000[1-6]$/u.test(id))) {
        const templateRow=rows.find(r=>r.itemId==='nether_contamination');
        templateRow.blockers.push({reason:'인펙션 추가 투영 6종은 기본 비율의 출처 충돌 및 증가 연산 확인이 필요합니다.'});templateRow.status='partial';
      }
    }
  }
  for (const [index, slot] of (build?.pact?.slots ?? []).entries()) {
    const shell = slot?.undeterminedFate;
    const layoutOK = validFateLayout(shell) && !!slot.spirit && index < 3;
    if (shell) {
      add('pact', `pact.slots.${index}.undeterminedFate`, {id:'destiny-undetermined-fate'}, SS14_DESTINY.pages.en,
        'Undetermined_Fate', '', {name:'미정 숙명'}, 1, layoutOK ? '' : '정령과 미정 숙명의 슬롯 구성을 확인하세요.',
        null, null, '추가 슬롯을 제공하며 장착한 운명의 효과를 적용합니다.');
    }
    if (!slot?.spirit) continue;
    const id = slot.spirit.spiritId;
    const identity = data.spiritIdentities?.find((row) => [row.id, row.catalogId, ...(row.aliases ?? [])].includes(id));
    const item = findItemById(identity?.catalogId); const en = pageFor(item, "en", data); const ko = pageFor(item, "ko", data);
    const level = slot.spirit.level;
    const entry = en?.parsed.levelAffixes.find((row) => row.level === level);
    const koEntry = ko?.parsed.levelAffixes.find((row) => row.level === level);
    const inactiveOuter = entry && !pactNodeActive(slot, 'outer') ? '외환 포인트 회수' : '';
    add("pact", `pact.slots.${index}.spirit`, item, en, `level:${level}`, entry?.affixes.join("\n"), { detail: koEntry?.affixes.join("\n") }, 1, '', null, null, inactiveOuter);
    if (!entry || en?.parsed.duplicateDataLevels.length) continue;
    const addDestiny = (destiny, inactiveRing = '') => {
        const reason = inactiveRing && destiny.destinyRollControls.length ? '' : destiny.reason;
        add("pact", destiny.path, destiny.item, destiny.page, destiny.record, destiny.text, destiny.koText, 1, reason, null, null, inactiveRing || destiny.activation?.inactiveReason);
        rows.at(-1).destinyRollControls = destiny.destinyRollControls;
        rows.at(-1).destinyActivation = destiny.activation;
    };
    if (layoutOK) shell.slots.forEach((child, extraIndex) => {
      if (child.installedDestiny || child.destiny) addDestiny(seasonDestinyRow(build, index, null, { extraIndex }),
        activeExtraSlot(slot,extraIndex)?'':'계약 경로의 선행 포인트 미투자');
    });
    for (const ring of en?.parsed.rings ?? []) {
      const inactiveRing = !pactNodeActive(slot, ring.slotId) ? '링 포인트 회수' : '';
      if (slot.rings?.[ring.slotId]?.installedDestiny) {
        addDestiny(seasonDestinyRow(build, index, ring), inactiveRing);
        continue;
      }
      const translated = ko?.parsed.rings.find((row) => row.slotId === ring.slotId && row.dataId === ring.dataId);
      const explicitlyEmpty=ring.name==='Empty Talent Node (Medium)'&&ring.effect===''&&ring.dataId===200
        &&ring.contentFieldCount===3&&/^midRing[1-3]$/u.test(ring.slotId)&&ring.dataLevel===6+Number(ring.slotId.at(-1));
      add("pact", `pact.slots.${index}.rings.${ring.slotId}`, item, en, `ring:${ring.dataLevel}:${ring.dataId}`,
        ring.effect, { name: translated?.name, detail: translated?.effect },1,'',null,null,
        inactiveRing || (explicitlyEmpty?'원문에서 효과 없는 공백 포인트로 확인됨':undefined));
    }
    // The SS14 promotion table includes the outer-ring base effect (and its
    // higher-level replacement). It is one effect, not a second additive copy.
    const mainInLevelTable = en?.parsed.levelAffixes.some(r => r.affixes.includes(en.parsed.mainAffix?.effect));
    if (pactNodeActive(slot,'outer') && en?.parsed.mainAffix && !mainInLevelTable) add("pact", `pact.slots.${index}.main`, item, en, "main", en.parsed.mainAffix.effect, { detail: ko?.parsed.mainAffix?.effect });
  }
  for (const row of rows.filter((r) => r.group === "divinity" && r.maxActive)) {
    const active = rows.filter((r) => r.group === "divinity" && (row.netherTalentId ? r.netherTalentId===row.netherTalentId : r.itemId === row.itemId)).reduce((sum, r) => sum + r.selectionCount, 0);
    if (active > row.maxActive) { row.effects = []; row.status = "partial"; row.blockers.push({ reason: "신격 옵션의 SS14 원문 활성 개수 상한을 초과했습니다." }); }
  }
  applyNetherAggression(rows);
  const netherElixirBonus=rows.flatMap(r=>r.effects).filter(e=>e.stat==='elixir_effect').reduce((n,e)=>n+e.value,0);
  if(netherElixirBonus){
    const revised=seasonExtensionRows(build,{parseLines:parseSeasonComponentLines,requireBindings,netherElixirBonus}).filter(r=>r.path.startsWith('skills.elixirs.'));
    for(let n=rows.length-1;n>=0;n--)if(rows[n].path.startsWith('skills.elixirs.'))rows.splice(n,1);
    rows.push(...revised);
  }
  applyNetherModifiers(rows,build,parseSeasonComponentLines);
  applySeasonCurses(rows,build);
  // Imported documents may contain inconsistent answers for one physical state.
  // Keep the document readable but do not calculate either conflicting clause.
  const states = new Map();
  for (const c of rows.flatMap((r) => r.conditionControls).filter((c) => c.value !== "")) {
    const values = states.get(c.conditionGroup) ?? new Set();
    values.add(c.inverted ? 1 - c.value : c.value); states.set(c.conditionGroup, values);
  }
  for (const row of rows) {
    const conflicts = row.conditionControls.filter((c) => states.get(c.conditionGroup)?.size > 1);
    if (!conflicts.length) continue;
    row.effects = row.effects.filter((e) => !conflicts.some((c) => c.sourceLineIndex === e.sourceLineIndex));
    row.blockers.push({ reason: "같은 상태의 조건·중첩 입력이 서로 충돌합니다. 조건을 다시 입력하세요." }); row.status = "partial";
  }
  const uniqueBuffs = new Set();
  for (const row of rows) row.effects = row.effects.filter(effect => {
    if (!effect.buffIdentity) return true;
    if (uniqueBuffs.has(effect.buffIdentity)) return false;
    uniqueBuffs.add(effect.buffIdentity); return true;
  });
  return { rows, effects: rows.flatMap((row) => row.effects), generatedAt: data.generatedAt, allocation,
    counts: { selected: rows.length, mapped: rows.filter((row) => row.status === "mapped").length, effects: rows.reduce((n, row) => n + row.effects.length, 0) },
    limitation: "SS14 미리보기 원문의 수치와 직접 선택한 일부 조건을 연결합니다. 조건 미입력·배치 오류는 제외하며 나머지 특수 효과·전체 경로·출시 후 값은 별도 검증이 필요합니다." };
}

export function pinSeasonComponentReceipts(build, groups = Object.keys(SEASON_COMPONENT_LABELS)) {
  return Object.fromEntries(projectSeasonComponents(build, { requireBindings: false }).rows
    .filter((row) => groups.includes(row.group) && row.receipt && !row.revelation)
    .map((row) => [row.receipt.sourceUrl, row.receipt.sourcePageSha256]));
}
