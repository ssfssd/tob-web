import { SS14_RULES } from "./data/ss14Rules.generated.js";
import { calculateSeasonSurvival } from "./seasonSurvival.js";
import { validSeasonGearEffects } from "./seasonGearEffects.js";

export const SEASON_CHARACTER_INPUTS = {
  strength: { label: "적용 전 힘", min: 0, max: 100000 },
  dexterity: { label: "적용 전 민첩", min: 0, max: 100000 },
  intelligence: { label: "적용 전 지혜", min: 0, max: 100000 },
  enemyLevel: { label: "받는 대미지 계산 대상 레벨", min: 1, max: 100 },
  enemyAccuracy: { label: "회피 계산 대상 명중 수치", min: 1, max: 1000000 },
};
export const seasonRulePins = (data = SS14_RULES) => Object.fromEntries(Object.values(data.pages).map((p) => [p.sourceUrl, p.sourcePageSha256]));
const finite = (n) => typeof n === "number" && Number.isFinite(n);
const round = (n) => finite(n) ? Math.round(n * 1e8) / 1e8 : null;

export function readSeasonCharacterRules(data = SS14_RULES) {
  const page = data.pages["en/Character_Build"];
  const text = page?.body ?? "";
  const number = (pattern) => { const match = text.match(pattern); return match ? Number(match[1]) : null; };
  return {
    life: number(/Heroes initially start with ([\d.]+) Max Life/u),
    lifePerLevel: number(/Each level gained increases Max Life by ([\d.]+)/u),
    lifePerStrength: number(/Each point of Strength increases Max Life by ([\d.]+)/u),
    mana: number(/Heroes have ([\d.]+) Max Mana by default/u),
    manaPerLevel: number(/Each level increases Max Mana by ([\d.]+)/u),
    manaPerIntelligence: number(/Each Intelligence increases Max Mana by ([\d.]+)/u),
    shieldPerIntelligence: number(/Each Intelligence increases Max Energy Shield by ([\d.]+)%/u),
    evasionPerLevel: number(/Each level increases Evasion by ([\d.]+)/u),
    evasionPerDexterity: number(/Each Dexterity increases Evasion by ([\d.]+)%/u),
    shieldStartsZero: /Heroes do not start with any Energy Shield/u.test(text),
    armorStartsZero: /Characters start with 0 Armor by default/u.test(text),
    evasionStartsZero: /Characters start with 0 Evasion by default/u.test(text),
    penalty: /At Lv.48, Lv.58, and Lv.80, heroes will be inflicted with -20% to all Resistances/u.test(text),
    armorFormula: (data.pages["en/Armor"]?.body ?? "").includes("Your Armor/(0.9 x Your Armor + 3000 + 300 x Min (Enemy Level, 90))")
      && text.includes("Armor/(Armor x0.9+30,000)") && text.includes("80%") && text.includes("60%"),
    resistanceCaps: [text, data.pages["en/Resistance"]?.body ?? ""].map((body) => Number(body.match(/base Max Resistance is (\d+)%/u)?.[1]) || null),
    resistanceHardCaps: [text.match(/increase the Max Resistance to (\d+)%/u), (data.pages["en/Resistance"]?.body ?? "").match(/Max Resistance is capped at (\d+)%/u)].map((m) => m ? Number(m[1]) : null),
  };
}

export function calculateSeasonCharacter(build, components, projection, { data = SS14_RULES } = {}) {
  const rules = readSeasonCharacterRules(data); const blockers = []; const effects = [...projection.effects];
  const receipts = Object.values(data.pages).filter((p) => p.locale === "en");
  const input = build.ss14Inputs?.character ?? {};
  const bound = receipts.every((p) => p.season === "SS14" && /^[a-f0-9]{64}$/u.test(p.sourcePageSha256)
    && build.ss14Inputs?.ruleReceipts?.[p.sourceUrl] === p.sourcePageSha256);
  if (!bound) blockers.push("SS14 기본 공식 원문이 없거나 변경되었습니다. 기본 입력을 확인하고 다시 계산하세요.");
  const level = build.hero?.level ?? build.heroLevel;
  if (!Number.isInteger(level) || level < 1 || level > 100) blockers.push("히어로 레벨을 1~100 범위에서 확인하세요.");
  for (const key of ["strength", "dexterity", "intelligence"]) if (!finite(input[key]) || input[key] < 0 || input[key] > 100000) blockers.push(`${SEASON_CHARACTER_INPUTS[key].label} 미입력 또는 범위 오류`);
  const gearLocal = { armor: 0, evasion: 0, max_energy_shield: 0 };
  const value = (stat, base, all = effects, extraIncrease = 0) => {
    if (!finite(base)) return null;
    const rows = all.filter((e) => e.stat === stat && finite(e.value));
    const fixed = [...new Set(rows.filter((e) => e.operation === "set").map((e) => e.value))];
    if (fixed.length > 1) { blockers.push("동일 자원의 고정값 효과가 충돌하여 해당 수치를 확정하지 않습니다."); return null; }
    if (fixed.length === 1) return fixed[0];
    return (base + rows.filter((e) => e.operation === "add" && e.unit !== "percent").reduce((s, e) => s + e.value, 0))
      * (1 + (extraIncrease + rows.filter((e) => e.operation === "add_percent" || e.operation === "add" && e.unit === "percent").reduce((s, e) => s + e.value, 0)) / 100)
      * rows.filter((e) => ["more", "more_percent"].includes(e.operation)).reduce((s, e) => s * (1 + e.value / 100), 1);
  };
  for (const component of components.filter((c) => c.category === "gear")) {
    if (!component.calculations?.length) blockers.push("선택 장비의 자원·아머 계산 연결 미확보");
    for (const gear of component.calculations ?? []) {
      if (gear.status !== "mapped") blockers.push("선택 장비의 미해석 효과는 제외하고, 원문에 연결된 유효한 무조건부 수치만 자원·방어 참고값에 반영합니다.");
      // Rejected receipts/crafted states have no rawEffects. A partial card may
      // still contain independent exact base stats; never carry invalid rolls.
      const raw = validSeasonGearEffects(gear);
      for (const stat of Object.keys(gearLocal)) {
        const local = value(`gear_${stat === "max_energy_shield" ? "energy_shield" : stat}`, 0, raw);
        gearLocal[stat] = finite(gearLocal[stat]) && finite(local) ? gearLocal[stat] + local : null;
      }
      effects.push(...raw.filter((e) => !e.stat.startsWith("gear_")));
    }
  }
  const allStats = effects.filter((e) => e.stat === "all_stats" || e.stat === "all_attributes");
  const stats = Object.fromEntries(["strength", "dexterity", "intelligence"].map((key) => [key,
    value(key, input[key], [...effects, ...allStats.map((e) => ({ ...e, stat: key }))])]));
  // Each output depends only on its own inputs. Missing Strength must not
  // suppress armor, resistances, Dexterity, or Intelligence-derived resources.
  const safe = bound && Number.isInteger(level) && level >= 1 && level <= 100;
  for (const key of Object.keys(stats)) if (!safe || !finite(input[key]) || input[key] < 0 || input[key] > 100000
    || !finite(stats[key]) || stats[key] < 0) stats[key] = null;
  const life = safe && finite(stats.strength) && [rules.life, rules.lifePerLevel, rules.lifePerStrength].every(finite)
    ? value("max_life", rules.life + (level - 1) * rules.lifePerLevel + stats.strength * rules.lifePerStrength) : null;
  const mana = safe && finite(stats.intelligence) && [rules.mana, rules.manaPerLevel, rules.manaPerIntelligence].every(finite)
    ? value("max_mana", rules.mana + (level - 1) * rules.manaPerLevel + stats.intelligence * rules.manaPerIntelligence) : null;
  const lifeAsShield = effects.filter(e => e.stat === "max_life_as_energy_shield").reduce((sum, e) => sum + e.value / 100, 0);
  const shield = safe && finite(stats.intelligence) && rules.shieldStartsZero && finite(rules.shieldPerIntelligence)
    && finite(gearLocal.max_energy_shield) && (!lifeAsShield || finite(life))
    ? value("max_energy_shield", gearLocal.max_energy_shield + (lifeAsShield ? life * lifeAsShield : 0), effects, stats.intelligence * rules.shieldPerIntelligence) : null;
  const rawArmor = safe && rules.armorStartsZero ? value("armor", gearLocal.armor) : null;
  const armor = finite(rawArmor) ? Math.max(0, rawArmor) : null;
  const rawEvasion = safe && finite(stats.dexterity) && finite(gearLocal.evasion) && rules.evasionStartsZero && [rules.evasionPerLevel, rules.evasionPerDexterity].every(finite)
    ? value("evasion", (level - 1) * rules.evasionPerLevel + gearLocal.evasion, effects, stats.dexterity * rules.evasionPerDexterity) : null;
  const evasion = finite(rawEvasion) ? Math.max(0, rawEvasion) : null;
  const enemyLevel = input.enemyLevel;
  let armorReduction = null;
  const armorScenarios = [];
  if (safe && rules.armorFormula && finite(armor) && Number.isInteger(enemyLevel) && enemyLevel >= 1 && enemyLevel <= 100) {
    const specific = Math.min(.8, armor / (.9 * armor + 3000 + 300 * Math.min(enemyLevel, 90)));
    const general = Math.min(.8, armor / (.9 * armor + 30000));
    armorScenarios.push({ label: "캐릭터 도움말", value: round(general * 100) }, { label: "아머 도움말 · 대상 레벨 반영", value: round(specific * 100) });
    if (Math.abs(specific - general) < 1e-10) armorReduction = specific * 100;
    else blockers.push("아머 도움말 공식이 대상 레벨 90 미만에서 서로 다릅니다. 감면율을 확정하지 않습니다.");
  } else blockers.push("아머 감면율에 필요한 대상 레벨 또는 SS14 공식 미확인");
  const capConflict = rules.resistanceCaps.some((v) => !finite(v)) || new Set(rules.resistanceCaps).size !== 1
    || rules.resistanceHardCaps.some((v) => !finite(v)) || new Set(rules.resistanceHardCaps).size !== 1;
  if (capConflict) blockers.push(`저항 상한 원문 충돌: 캐릭터 도움말 ${rules.resistanceCaps[0] ?? "미확인"}/${rules.resistanceHardCaps[0] ?? "미확인"}, 저항 도움말 ${rules.resistanceCaps[1] ?? "미확인"}/${rules.resistanceHardCaps[1] ?? "미확인"}. 적용 저항은 미지원입니다.`);
  const resistances = Object.fromEntries(["fire", "cold", "lightning", "erosion"].map((type) => {
    const rows = effects.filter((e) => e.stat === `${type}_resistance` || e.stat === "all_resistance" || type !== "erosion" && e.stat === "elemental_resistance");
    const raw = safe && rules.penalty ? -20 * [48, 58, 80].filter((n) => level >= n).length + rows.filter((e) => ["add", "add_percent"].includes(e.operation)).reduce((sum, e) => sum + e.value, 0) : null;
    const capBonus = effects.filter((e) => ["add", "add_percent"].includes(e.operation)
      && (e.stat === `max_${type}_resistance` || e.stat === "max_all_resistance" || type !== "erosion" && e.stat === "max_elemental_resistance"))
      .reduce((sum, e) => sum + e.value, 0);
    const scenarios = rules.resistanceCaps.map((cap, index) => finite(raw) && finite(cap) && finite(rules.resistanceHardCaps[index])
      ? round(Math.min(raw, Math.min(cap + capBonus, rules.resistanceHardCaps[index]))) : null);
    return [type, { raw: round(raw), effective: !capConflict ? scenarios[0] : null, scenarios }];
  }));
  const survival = calculateSeasonSurvival({ safe, input, effects, life, mana, shield, evasion, data });
  const reservedManaPercent=effects.filter(e=>e.stat==='sealed_mana_percent').reduce((n,e)=>n+e.value,0);
  if(reservedManaPercent>100)blockers.push('선택한 패시브의 MP 봉인 합이 100%를 초과합니다.');
  return { scope: "source-bound-resource-defense-projection", fullBuildSupported: false,
    values: { ...Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, safe ? round(v) : null])),
      life: round(life), mana: round(mana), shield: round(shield), armor: round(armor), evasion: round(evasion),
      reservedManaPercent:round(reservedManaPercent),unreservedMana:reservedManaPercent>100?null:round(mana*(1-reservedManaPercent/100)),
      armorReduction: round(armorReduction), nonPhysicalArmorReduction: round(armorReduction === null ? null : armorReduction * .6),
      ...survival.values }, resistances, armorScenarios, survival, blockers: [...new Set([...blockers, ...survival.reasons])], receipts,
    omittedEffectCount: projection.rows.filter((r) => r.blockers.length).length,
    limitation: "사용자가 입력한 적용 전 속성에 확인된 선택 효과와 SS14 기본 공식을 결합한 참고값입니다. 미해석 효과·봉인·특수 상호작용은 제외되며 전체 빌드 최종값이 아닙니다." };
}
