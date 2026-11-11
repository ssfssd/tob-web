import { findItemById } from "./catalog.js";
import { SS14_SUPPORTS_EN } from "./data/ss14Supports.en.generated.js";
import { SS14_SUPPORTS } from "./data/ss14Supports.generated.js";
import { parseTlidbSkillTooltipCalculation } from "./tlidbSkillTooltipCalculation.js";
import { getCurrentTlidbSupportCompatibility, isCurrentTlidbSupportCompatible } from "./tlidbSupportCompatibility.js";
import { resolveSeasonSkillLevel } from "./seasonSkillLevels.js";
import { SS14_LOG_COMPLETION } from "./data/ss14LogCompletion.generated.js";
import "./seasonCurrentDatabase.js";
import { resolveSeasonSupportRolls } from "./seasonSupportRolls.js";
import { seasonConditionalExpression, scaleSeasonConditionalEffects } from './seasonEffectConditions.js';
import { boundBlessingStacks } from './seasonBlessings.js';
import { ICE_LANCES_REBOUND_TEXT } from './seasonIceLancesShotgun.js';

export const CLOCKWORK_CORE_ID = "supports-ss14-clockwork-core";
export function seasonSupportRequiredSlot(record) {
  const ordinal = record?.detail?.match(/This skill can only be installed in the (first|second|third|fourth|fifth) Support Skill Slot of each (?:Active|Passive) Skill(?:\.|$)/mu)?.[1];
  return ({first:0,second:1,third:2,fourth:3,fifth:4})[ordinal] ?? null;
}
for (const [id, r] of Object.entries(SS14_LOG_COMPLETION.records).filter(([, r]) => r.en.category === "supports")) {
  SS14_SUPPORTS_EN.records[id] = r.en; SS14_SUPPORTS.records[id] = r.ko;
}
for (const data of [SS14_SUPPORTS_EN, SS14_SUPPORTS]) data.collected = Object.values(data.records).filter(r => r.status === 'collected-preview').length;

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
  if (isTarget && (binding?.itemId !== item.id || binding.sourcePageSha256 !== record.sourcePageSha256)) return { ...base, blockers: ["SS14 보조 입력의 원문 근거가 바뀌었거나 연결되지 않았습니다."] };
  if (item.id === CLOCKWORK_CORE_ID) {
    if (rowIndex !== 0 || supportIndex !== 1 || support.level !== 20 || record.detail !== SS14_LOG_COMPLETION.records[item.id].en.detail)
      return { ...base, blockers: ['클락워크 코어는 메인 스킬의 두 번째 보조 칸에 20레벨로 연결하세요.'] };
    return { ...base, mechanics: [{ kind: "clockwork-core", sourceText: record.detail }] };
  }
  const resolved = resolveSeasonSkillLevel(item, support.level);
  if (resolved.blockers.length) return { ...base, blockers: ["선택한 레벨의 SS14 보조 스킬 수치 미확보"], evidenceBlockers: resolved.blockers };
  let selected = resolved.item;
  if (record.calculationDetail && !resolved.receipt) {
    let detail = record.calculationDetail;
    if (binding?.tier !== undefined) {
      const chosen = record.supportTiers?.find(t => t.tier === binding.tier);
      const current = record.supportTiers?.filter(t => detail.includes(t.text));
      if (!chosen || current?.length !== 1) return { ...base, blockers: ["보조 옵션 등급의 SS14 원문 연결을 확인하세요."] };
      detail = detail.replace(current[0].text, chosen.text);
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
  const requiredSlot = seasonSupportRequiredSlot(record);
  const requiredRole = record.detail.match(/Support Skill Slot of each (Active|Passive) Skill(?:\.|$)/mu)?.[1];
  if (requiredSlot !== null && ((requiredRole === 'Passive' ? rowIndex < 5 : rowIndex >= 5) || supportIndex !== requiredSlot))
    return { ...base, blockers: [`이 보조는 ${requiredRole === 'Passive' ? '패시브' : '액티브'} 스킬의 ${requiredSlot + 1}번째 보조 칸에만 장착할 수 있습니다.`] };
  if (rolled.blockers.length) return { ...base, blockers: rolled.blockers };
  const parsed = parseTlidbSkillTooltipCalculation(rolled.item, { season: "SS14", level: resolved.parserLevel });
  const unresolvedEffects=new Set(parsed.effects.filter(e=>e.condition||e.conditionText||e.conditionRequirements||e.per));
  for(const e of unresolvedEffects)if(!parsed.blockers.some(b=>b.sourceText===e.sourceText))
    parsed.blockers.push({sourceText:e.sourceText,reason:'source-condition-input-required'});
  const mechanics = [];
  const handled = new Set();
  const conditionBlockers = [];
  for (const blocker of parsed.blockers) {
    const text = blocker.sourceText;
    if (handled.has(text)) continue;
    let m;
    if ((m = text.match(/^\+([\d.]+) % additional Hit Damage \(multiplies\) for the supported skill for every Jump$/u))) {
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
    } else if ((m = text.match(/^Adds ([\d.]+) - ([\d.]+) (Physical|Cold|Fire|Lightning|Erosion) Damage to the supported skill$/u)
      ?? text.match(/^Supported skills add ([\d.]+) - ([\d.]+) (physical|cold|fire|lightning|erosion) damage$/u))) {
      for (const [suffix, value] of [["min", Number(m[1])], ["max", Number(m[2])]]) parsed.effects.push({
        stat: `supported-skill-added-${m[3].toLowerCase()}-damage-${suffix}`, operation: "set", value, unit: "damage", sourceText: text });
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
    } else if ((m = text.match(/^Gains a stack of buff when using the supported skill every (\d+) s: \+([\d.]+) % Attack and Cast Speed after using a Mobility Skill$/u))) {
      mechanics.push({ kind: "periodic-burst", value: +m[2], interval: +m[1], duration: 2, sourceText: text }); handled.add(text);
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
  const tags = (hostRecord?.tags ?? []).map(tag => ({ Horizontal: 'straight_shot', Vertical:'falling', Parabolic:'lob',
    Restoration:'recovery',Defensive:'guard',Focus:'infuse',Barrage:'bombardment',Terra:'ground',
    'Synthetic Troop':'synthetic','Spirit Magus':'spirit','Shadow Strike':'shadow_strike','Slash-Strike':'steep_strike',Demolisher:'strike' })[tag] ?? tag);
  return isCurrentTlidbSupportCompatible(seasonSupportItem(id), {
    tags, role: rowIndex < 5 ? "active" : "passive", names: [hostRecord?.name],
    canDealDamage: evaluation?.values?.baseDps > 0, canHit: evaluation?.values?.averageHit > 0,
    canAilmentOrDot: evaluation?.damageCapabilities?.dot === true,
  }, { season: "SS14" });
}
