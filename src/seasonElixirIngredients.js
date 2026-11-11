import { getTlidbLicoriceIngredientAuthority } from "./tlidbLicoriceIngredientAuthority.js";
import { SS14_COMPONENTS } from "./data/ss14Components.generated.js";
import { memoryTraitTier } from "./seasonMemories.js";

// Historical records supply only stable ingredient/trait identities. Every
// number and displayed name below comes from the current SS14 detailed tier.
export function addSeasonIngredients(build, slot, index, state, data, { make, control, apply }) {
  const ids = Array.isArray(slot.ingredientIds) ? slot.ingredientIds.filter(Boolean) : [];
  const identities = ids.map(getTlidbLicoriceIngredientAuthority);
  const hero = SS14_COMPONENTS.heroIdentities.find(h => h.catalogId === "hero-tlidb-com-cn-licorice-note");
  const en = data.pages["en/Licorice_Note"]; const ko = data.pages["ko/Licorice_Note"];
  const count = alt => identities.filter(i => i?.traitAlt.startsWith(alt)).length;
  const legalSet = new Set(ids).size === ids.length && identities.every(Boolean)
    && count("UISage001") <= (index === 0 ? 2 : 0) && count("UISage011") <= 1 && count("UISage032") <= (index === 1 ? 1 : 0);
  for (const [n, id] of ids.entries()) {
    const identity = identities[n]; const [alt, category, ordinal] = identity?.traitAlt.split(":") ?? [];
    const trait = en.parsed.traits[alt];
    const choice = hero.choices.find(c => c.sourceId === `licorice-note-${alt?.toLowerCase()}`);
    const selected = build.hero?.traitSelections?.filter(s => s.stageId === identity?.stageId && s.choiceIds?.length === 1
      && [choice?.id, choice?.sourceId].includes(s.choiceIds[0]));
    const legal = legalSet && build.hero?.branchId === hero.catalogId && !build.hero?.revivalMemory
      && selected?.length === 1 && (build.hero.level ?? build.heroLevel) >= trait?.requiredLevel;
    const row = make(`skills.elixirs.${index}.ingredients.${id}`, id, en, null, identity?.traitAlt,
      trait?.text, "재료 단계와 조건을 확인하세요.", legal ? "" : "영약 재료의 히어로·특성·병·개수·레벨 조건을 확인하지 못했습니다.", true);
    const fingerprint = JSON.stringify({ slot, hero: build.hero });
    row.comparisonFingerprint = JSON.stringify({ fingerprint, inputs: Object.entries(build.ss14Inputs?.extensionInputs ?? {}).filter(([k]) => k.startsWith(`ingredient:${index}:`)) });
    if (!legal || row.blockers.length) continue;
    const memorySlot=[45,60,75].indexOf(trait.requiredLevel);
    const fromMemory=!!build.hero?.memories?.[memorySlot];
    const tier = fromMemory ? memoryTraitTier(build,trait.requiredLevel).tier : control(row, `ingredient:${index}:${id}:tier`, `영약 ${index + 1} 재료 ${n + 1} 확인한 특성 단계`, "tier", fingerprint, 5, 1);
    const get = (page) => page.parsed.traits[alt]?.tiers.find(t => t.key === String(tier))?.categories
      .find(c => c.ordinal === Number(category))?.ingredients.find(i => i.ordinal === Number(ordinal));
    const entry = get(en); const kr = get(ko);
    if (!entry) { row.blockers.push({ reason: "재료가 속한 SS14 특성의 단계를 확인하세요. 이전 시즌 단계를 자동 적용하지 않습니다." }); continue; }
    row.ingredientTraitState = { alt, tier };
    const confirmedHeroTier = build.ss14Inputs?.heroTiers?.[choice.id] ?? build.ss14Inputs?.heroTiers?.[choice.sourceId];
    if (!fromMemory && confirmedHeroTier && confirmedHeroTier.tier !== tier) { row.blockers.push({ reason: "히어로 특성과 재료의 확인 단계가 서로 다릅니다." }); continue; }
    row.name = kr?.name && !/\p{Script=Han}/u.test(kr.name) ? kr.name : "한국어 원문 미제공";
    row.detail = kr?.text && !/\p{Script=Han}/u.test(kr.text) ? kr.text : "한국어 원문 미제공";
    const text = entry.text;
    const crit = text.match(/^This skill gains an additional base effect: [+](\d+(?:\.\d+)?) % additional damage when you or your Minions land a Critical Strike$/u);
    const moss = text.match(/^This skill gains an additional base effect: -(\d+(?:\.\d+)?) % additional damage taken when any Minion exists \(up to -(\d+)% additional damage\)$/u);
    const charge = text.match(/^(?:This skill gains (\d+) Charging Progress on Critical Strike|When Reaping, this skill gains (\d+) Charging Progress|For every 6 m moved, this skill gains (\d+) Charging Progress)\. Interval: 0\.5 s \(not affected by the effects of Elixir Skills\)$/u);
    const minion = moss ? control(row, `ingredient:${index}:${id}:minion`, `영약 ${index + 1} 재료 ${n + 1} 소환체 존재`, "boolean", fingerprint) : null;
    if (charge) {
      const rate = control(row, `ingredient:${index}:${id}:rate`, `영약 ${index + 1} 재료 ${n + 1} 실제 충전 발동 횟수 (초당)`, "rate", fingerprint, 2);
      if (rate === "") row.blockers.push({ reason: "0.5초 간격 제한을 적용한 실제 충전 발동 횟수를 입력하세요. 크리티컬 확률·이동 속도로 자동 추정하지 않습니다." });
      else row.charging = { perProc: Number(charge[1] ?? charge[2] ?? charge[3]), rate, perSecond: Number(charge[1] ?? charge[2] ?? charge[3]) * rate };
      continue;
    }
    if (!crit && !moss) { row.blockers.push({ sourceText: text, reason: "이 재료의 재발동·피격 전환·특수 상호작용 계산은 미지원입니다." }); continue; }
    if (state.enabled === "" || state.scale === "") { row.blockers.push({ reason: "영약 활성 여부와 최종 효과 배율을 확인하세요." }); continue; }
    if (state.enabled === 0) { row.inactive.push({ reason: "입력한 영약 비활성 상태" }); continue; }
    if (crit) row.effects.push({ stat: "critical_hit_damage", operation: "more", value: Number(crit[1]) * state.scale,
      unit: "percent", sourceText: text, receipt: row.receipt, path: row.path, group: row.group });
    if (moss) {
      if (minion === "") row.blockers.push({ reason: "재료의 소환체 존재 조건을 확인하세요." });
      else if (minion === 1) apply(row, `${-Math.min(Number(moss[2]), Number(moss[1]) * state.scale)}% additional Damage Taken`);
      else row.inactive.push({ reason: "재료의 소환체 존재 조건 미충족" });
    }
  }
}
