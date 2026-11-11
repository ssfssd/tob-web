import { SS14_RULES } from "./data/ss14Rules.generated.js";
import { SS14_OFFENSE_RULES } from "./data/ss14OffenseRules.generated.js";
import { SS14_HIT_RULES } from "./data/ss14HitRules.generated.js";
import { validGameCriticalBinding } from "./seasonGameData.js";
import { seasonWeaponProfile } from './seasonWeaponProfile.js';

const finite = Number.isFinite;
const round = (n) => finite(n) ? Math.round(n * 1e5) / 1e5 : null;
const attributes = { Strength: "strength", Dexterity: "dexterity", Intelligence: "intelligence" };
export const seasonOffenseRulePins = () => Object.fromEntries([...Object.values(SS14_OFFENSE_RULES.pages), ...Object.values(SS14_HIT_RULES.pages)]
  .filter((p) => p.locale === "en").map((p) => [p.sourceUrl, p.sourcePageSha256]));
export const validBaseCriticalRating = (n) => typeof n === "number" && finite(n) && n >= 0 && n <= 100000;

export function readSkillMainStats(record) {
  if ((String(record?.detail ?? "").match(/^Main Stat:/gmu) ?? []).length !== 1) return null;
  const headings = String(record?.detail ?? "").match(/^Main Stat:\n([^\n]+)\n/mu);
  if (!headings) return null;
  const names = headings[1].split(/,\s*/u);
  return names.length && new Set(names).size === names.length && names.every((n) => attributes[n]) ? names : null;
}

// A separate, source-bound hit projection. Do not multiply a mixed hit/DoT or
// proc result by critical chance, and do not manufacture a skill's base rating.
export function calculateSeasonOffense(build, components, skills, projection, character, direct,
  { rules = SS14_RULES, offenseRules = SS14_OFFENSE_RULES, hitRules = SS14_HIT_RULES } = {}) {
  const criticalPage = offenseRules.pages["en/Critical_Strike"];
  const luckyPage = offenseRules.pages["en/Lucky"];
  const doublePage = hitRules.pages["en/Double_Damage"];
  const bound = (page, pins) => page?.season === "SS14" && /^[a-f0-9]{64}$/u.test(page.sourcePageSha256)
    && pins?.[page.sourceUrl] === page.sourcePageSha256;
  const effects = [...projection.effects, ...components.filter((r) => r.category === "gear")
    .flatMap((r) => r.calculations ?? []).filter((r) => r.status === "mapped").flatMap((r) => r.rawEffects ?? [])];
  const rows = direct.rows.map((row) => {
    const record = skills.records?.[row.id]; const mainStats = record?.detail && !record.detail.includes("Main Stat:") ? [] : readSkillMainStats(record);
    const blockers = []; const criticalBlockers = []; const receipts = [...row.receipts];
    const basis = row.offenseBasis;
    if (!row.supported && row.blockers.length) blockers.push(...row.blockers);
    else if (!row.supported || !basis || basis.hitDps < 0 || basis.otherExpectation
      || basis.dotDps > 0 && !basis.dotPools?.length
      || basis && Math.abs(basis.hitDps + basis.dotDps - row.values.dps) > .0001
      || record?.tags?.some((t) => ["Summon", "Synthetic Troop", "Spirit Magus"].includes(t))) {
      blockers.push("명중·지속 대미지를 원문 계수와 분리할 수 없습니다. 소환·추가 확률 효과는 별도 계산이 필요합니다.");
    }
    if (!mainStats) blockers.push("SS14 스킬 카드의 주 속성을 확인할 수 없습니다.");
    let attributeBonus = 0;
    for (const name of mainStats ?? []) {
      const page = rules.pages[`en/${name}`];
      const rate = page?.body.match(new RegExp(`Every point of ${name} additionally increases the damage of skills that have ${name} as a main stat by ([\\d.]+)%`))?.[1];
      const value = character.values[attributes[name]];
      if (!bound(page, build.ss14Inputs?.ruleReceipts) || !rate || !finite(value)
        || !page.body.includes("the bonuses of the main stats are added together before calculating the final damage bonus")) {
        blockers.push("주 속성 수치 또는 SS14 합산 공식의 근거가 없거나 변경되었습니다.");
      } else { attributeBonus += value * Number(rate); receipts.push(page); }
    }
    const attributeMultiplier = blockers.length ? null : 1 + attributeBonus / 100;
    const attributedDps = blockers.length ? null : basis.hitDps * attributeMultiplier;
    if (basis?.hitDps === 0 && basis?.dotPools?.length) return { id: row.id, rowIndex: row.rowIndex, mainStats: mainStats?.map(n => attributes[n]) ?? [],
      supported: !blockers.length, values: { attributeMultiplier, attributedDps: 0, expectedDps: 0, hitMultiplier: 1 }, blockers, receipts,
      assumption: "지속 대미지에는 크리티컬·더블 대미지를 적용하지 않습니다." };
    const weapon = record?.tags?.includes('Attack') ? seasonWeaponProfile(build) : null;
    const offensePins = weapon?.enabled ? seasonOffenseRulePins() : build.ss14Inputs?.offenseRuleReceipts;
    const input = weapon?.enabled ? weapon.supported ? { itemId: row.id, sourcePageSha256: record?.sourcePageSha256,
      baseCriticalRating: weapon.values.baseCriticalRating } : null : build.ss14Inputs?.offense?.[row.rowIndex];
    if (weapon?.enabled) { criticalBlockers.push(...weapon.blockers); receipts.push(...weapon.receipts); }
    if (!input || input.itemId !== row.id || input.sourcePageSha256 !== record?.sourcePageSha256 || !validBaseCriticalRating(input.baseCriticalRating)
      || !validGameCriticalBinding(input)) {
      if (!weapon?.enabled) criticalBlockers.push("해당 스킬의 보정 전 기본 크리티컬 수치를 직접 입력하세요. 미입력을 0으로 계산하지 않습니다.");
    }
    if (!bound(criticalPage, offensePins)
      || !criticalPage.body.includes("Final Critical Strike Rating = The sum of Base Critical Strike Rating x (1 + all non-additional bonus percentages)")
      || !criticalPage.body.includes("Critical Hit Chance = Final Critical Strike Rating/100.")
      || !criticalPage.body.includes("All units have 150% Critical Strike Damage by default.")) {
      criticalBlockers.push("SS14 크리티컬 공식 근거가 없거나 변경되었습니다. 입력을 다시 확인하세요.");
    }
    const tags = new Set((record?.tags ?? []).map((t) => t.toLowerCase()));
    const applies = (e) => !e.stat.startsWith("attack_") || tags.has("attack");
    const criticalEffects = effects.filter((e) => /^(?:(?:attack|spell|projectile|melee|(?:fire|cold|lightning|erosion|physical)_skill)_)?critical_strike_(?:rating|damage|lucky|unlucky|very_lucky)$/u.test(e.stat))
      .filter(applies).filter((e) => !e.stat.startsWith("spell_") || tags.has("spell"))
      .filter(e=>!e.stat.startsWith('melee_')||tags.has('melee'))
      .filter((e) => !e.stat.startsWith("projectile_") || tags.has("projectile"))
      .filter((e) => !e.stat.includes("_skill_") || tags.has(e.stat.split("_")[0]));
    for (const c of (projection.rows ?? []).flatMap((r) => r.conditionControls ?? [])) {
      if (c.value === "" && /Critical Strike|Double Damage/u.test(c.expression)) criticalBlockers.push("크리티컬·더블 대미지 효과의 조건을 직접 확인하세요.");
    }
    for (const e of basis?.criticalEffects ?? []) {
      const match = e.stat.match(/^(?:skill|supported-skill)-critical-strike-(rating|damage)$/u);
      if (!match) { criticalBlockers.push("보조·스킬의 특수 크리티컬 효과는 아직 결합하지 않습니다."); continue; }
      criticalEffects.push({ ...e, stat: `critical_strike_${match[1]}`,
        operation: e.operation === "add" && e.unit !== "flat" ? "add_percent" : e.operation });
    }
    let flat = 0; let increase = 0; let more = 1; let damage = 150; let damageMore = 1;
    let lucky = false; let veryLucky = false; let unlucky = false;
    for (const e of criticalEffects) {
      if (e.condition || e.conditionRequirements || e.per || e.target) { criticalBlockers.push("크리티컬 조건·대상 계산 미지원"); continue; }
      if (e.stat.endsWith("lucky") && e.operation === "set" && [true, 1].includes(e.value)) {
        if (e.stat.endsWith("unlucky")) unlucky = true;
        else if (e.stat.endsWith("very_lucky")) veryLucky = true;
        else lucky = true;
      } else if (!finite(e.value)) criticalBlockers.push("크리티컬 수치 미확인");
      else if (e.stat.endsWith("rating") && e.operation === "add") flat += e.value;
      else if (e.stat.endsWith("rating") && e.operation === "add_percent") increase += e.value;
      else if (e.stat.endsWith("rating") && e.operation === "more" && e.value >= -100) more *= 1 + e.value / 100;
      else if (e.stat.endsWith("damage") && ["add", "add_percent"].includes(e.operation)) damage += e.value;
      else if (e.stat.endsWith("damage") && e.operation === "more" && e.value >= -100) damageMore *= 1 + e.value / 100;
      else criticalBlockers.push("크리티컬 고정·특수 연산 미지원");
      if (e.receipt) receipts.push(e.receipt);
    }
    damage *= damageMore;
    let doubleChance = 0;
    const doubleEffects = effects.filter((e) => /^(?:(?:attack|spell)_)?double_damage_chance$/u.test(e.stat))
      .filter(applies).filter((e) => !e.stat.startsWith("spell_") || tags.has("spell"));
    for (const e of doubleEffects) {
      if (e.operation !== "add_percent" || !finite(e.value) || e.condition || e.conditionRequirements || e.per || e.target) {
        criticalBlockers.push("더블 대미지의 조건·특수 연산 미지원"); continue;
      }
      doubleChance += e.value;
      if (e.receipt) receipts.push(e.receipt);
    }
    if (doubleEffects.length) {
      if (!bound(doublePage, offensePins)
        || !doublePage.body.includes("All Double Damage chances that apply to the damage are stacked before the final determination.")
        || !doublePage.body.includes("Double Damage chance only applies to Hit Damage.")) criticalBlockers.push("SS14 더블 대미지 공식 근거가 없거나 변경되었습니다. 기본 크리티컬 입력을 다시 확인하세요.");
      else receipts.push(doublePage);
    }
    const overflow = effects.filter(e => e.stat === "double_damage_overflow_quadruple");
    if (overflow.some(e => e.operation !== "set" || e.value !== 1 || e.condition || e.target)) criticalBlockers.push("쿼드러플 대미지 전환 규칙 미확인");
    const quadrupleChance = overflow.length ? Math.min(100, Math.max(0, doubleChance - 100)) : 0;
    receipts.push(...overflow.map(e => e.receipt).filter(Boolean));
    doubleChance = Math.min(100, Math.max(0, doubleChance));
    const doubleMultiplier = 1 + doubleChance / 100 + 2 * quadrupleChance / 100;
    if ((lucky || veryLucky || unlucky) && (!bound(luckyPage, offensePins)
      || !luckyPage.body.includes("Lucky: The result is rolled twice") || !luckyPage.body.includes("Very Lucky: The result is rolled three times")
      || !luckyPage.body.includes("Unlucky: The result is rolled twice") || !luckyPage.body.includes("cancel into Lucky"))) {
      criticalBlockers.push("SS14 크리티컬 행운·불운 공식 미확인");
    }
    const rating = (input?.baseCriticalRating + flat) * (1 + increase / 100) * more;
    if (!finite(rating) || rating < 0 || !finite(damage) || damage < 100) criticalBlockers.push("크리티컬 계산 입력 범위 오류");
    const chance = Math.min(1, Math.max(0, rating / 10000));
    const luck = (veryLucky ? 2 : lucky ? 1 : 0) - (unlucky ? 1 : 0);
    const effectiveChance = luck >= 0 ? 1 - (1 - chance) ** (luck + 1) : chance ** 2;
    const criticalHitMore = effects.filter(e => e.stat === "critical_hit_damage" || e.stat === 'projectile_critical_hit_damage' && tags.has('projectile'));
    if (criticalHitMore.some(e => e.operation !== "more" || !finite(e.value) || e.value < 0 || e.target || e.condition)) criticalBlockers.push("크리티컬 명중 전용 추가 배율 미확인");
    const criticalOnlyMultiplier = criticalHitMore.reduce((n, e) => n * (1 + e.value / 100), 1);
    const criticalMultiplier = 1 + effectiveChance * (damage / 100 * criticalOnlyMultiplier - 1);
    receipts.push(...criticalHitMore.map(e => e.receipt).filter(Boolean));
    const supported = !blockers.length && !criticalBlockers.length;
    if (criticalPage) receipts.push(criticalPage);
    if ((lucky || veryLucky || unlucky) && luckyPage) receipts.push(luckyPage);
    return { id: row.id, rowIndex: row.rowIndex, mainStats: mainStats?.map((n) => attributes[n]) ?? [], supported,
      values: { attributeMultiplier: round(attributeMultiplier), attributedDps: round(attributedDps),
        hitMultiplier: supported ? criticalMultiplier * doubleMultiplier : null,
        criticalRating: !criticalBlockers.length ? round(rating) : null, criticalDamage: !criticalBlockers.length ? round(damage) : null,
        criticalChance: !criticalBlockers.length ? round(chance * 100) : null,
        effectiveCriticalChance: !criticalBlockers.length ? round(effectiveChance * 100) : null,
        doubleDamageChance: !criticalBlockers.length ? round(doubleChance) : null,
        quadrupleDamageChance: !criticalBlockers.length ? round(quadrupleChance) : null,
        doubleDamageMultiplier: !criticalBlockers.length ? round(doubleMultiplier) : null,
        criticalOnlyMultiplier: !criticalBlockers.length ? round(criticalOnlyMultiplier) : null,
        expectedDps: supported ? round(attributedDps * criticalMultiplier * doubleMultiplier) : null },
      blockers: [...new Set([...blockers, ...criticalBlockers])], receipts,
      assumption: "기본 크리티컬·조건은 사용자 확인 입력입니다. 행운 재추첨과 크리티컬·더블 대미지 판정은 독립이라고 가정한 부분 기대값입니다. 발동 유지율을 뜻하지 않습니다." };
  });
  return { rows, fullBuildSupported: false, scope: "source-bound-main-stat-critical-hit-projection",
    limitation: "직접 명중에 주 속성·확인된 크리티컬 보정·크리티컬 행운/불운·더블 대미지를 연결한 부분 기대값입니다. 적 방어·명중률·대미지 행운·트리플 대미지·소환·지속 대미지·나머지 특수 효과를 제외하며 전체 빌드 DPS가 아닙니다." };
}
