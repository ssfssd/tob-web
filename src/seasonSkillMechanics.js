import { parseTlidbSkillTooltipCalculation } from "./tlidbSkillTooltipCalculation.js";
import { SS14_ICE_LANCES_CADENCE } from "./data/ss14IceLancesCadence.generated.js";
import { resolveSeasonSkillLevel } from "./seasonSkillLevels.js";

// A supported mechanic never hides any other unknown line on the same card.
export function parseSeasonSkillMechanics(item, options) {
  const resolved = options.season === "SS14" ? resolveSeasonSkillLevel(item, options.level) : null;
  if (resolved?.blockers.length) return { effects: [], blockers: resolved.blockers, mechanics: [] };
  item = resolved?.item ?? item;
  const parsed = parseTlidbSkillTooltipCalculation(item, { ...options, level: resolved?.parserLevel ?? options.level });
  parsed.effects.push(...(resolved?.extraEffects ?? []));
  if (resolved?.receipt) parsed.progressionReceipt = resolved.receipt;
  const locale = item.tlidbText?.en;
  const mechanics = [];
  if(options.season==='SS14'&&locale?.sourceSeasonEvidence?.actualSeason===14&&locale.sourceSeasonEvidence.verificationComplete) {
    const geometry = parsed.blockers.filter(b=>b.sourceText==='The skill fires 1 Projectile in its base state.'
      || b.sourceText==='Projectiles from this skill always Penetrate' || /^\+\d+ Penetration for this skill$/u.test(b.sourceText));
    for(const b of geometry)mechanics.push({kind:'single-target-projectile-geometry',sourceText:b.sourceText,
      sourceUrl:locale.sourceUrl,sourcePageSha256:locale.sourcePageSha256});
    parsed.blockers=parsed.blockers.filter(b=>!geometry.includes(b));
  }
  if (options.season === "SS14" && locale?.sourceRecordKey === "Electrifying_Shot"
    && locale.sourceSeasonEvidence?.actualSeason === 14 && locale.sourceSeasonEvidence.verificationComplete) {
    const lines = ["Projectiles from this skill always Penetrate", "The skill fires 1 Projectile in its base state."];
    if (lines.every(line=>locale.detail.includes(line))) {
      parsed.blockers = parsed.blockers.filter(b => !lines.includes(b.sourceText));
      mechanics.push({ kind: "always-penetrates", baseProjectiles:1, sourceText: lines.join('\n'), sourceUrl: locale.sourceUrl, sourcePageSha256: locale.sourcePageSha256 });
    }
  }
  if (options.season === "SS14" && locale?.sourceRecordKey === "Ice_Lances"
    && locale.sourceSeasonEvidence?.actualSeason === 14 && locale.sourceSeasonEvidence.verificationComplete) {
    const lines = ["+1 Jumps for this skill", "In general, the Projectiles shot by this skill cannot hit the same enemy.", "The skill's Shotgun Effect falloff coefficient is 80%."];
    // The ordinary projectile is one hit on the target. Jumps are not a
    // single-target multiplier; a support that changes this needs its own rule.
    if (lines.every(line => parsed.blockers.filter(b => b.sourceText === line).length === 1)) {
      parsed.blockers = parsed.blockers.filter(b => !lines.includes(b.sourceText));
      mechanics.push({ kind: "ice-lances-projectile", jumps: 1, sameTargetHits: 1, shotgunFalloff: 0.8,
        sourceText: lines.join("\n"), sourceUrl: locale.sourceUrl, sourcePageSha256: locale.sourcePageSha256,
        limitation: "일반 얼음 송곳은 대상당 1회 적중합니다. 점프·추가 투사체를 같은 대상의 적중 횟수로 합산하지 않습니다." });
    }
  }
  if (options.season === "SS14" && locale?.sourceRecordKey === "Ring_of_Ice"
    && locale.sourceSeasonEvidence?.actualSeason === 14 && locale.sourceSeasonEvidence.verificationComplete) {
    const exact = "When defeating the enemies, +20 % chance to be triggered again where the enemy is; Each icy ring may only trigger once";
    const found = parsed.blockers.filter(b => b.sourceText === exact);
    if (found.length === 1) {
      parsed.blockers = parsed.blockers.filter(b => b !== found[0]);
      mechanics.push({ kind: "ice-ring-on-kill", chance: 20, sourceText: exact,
        sourceUrl: locale.sourceUrl, sourcePageSha256: locale.sourcePageSha256,
        limitation: "처치·재발동·대상 적중의 연쇄를 자동 추정하지 않습니다. 같은 대상에 실제 도달한 재발동의 초당 횟수를 별도로 확인합니다." });
    }
  }
  const dotSkills = ["Path_of_Flames", "Mind_Control", "Frost_Terra", "Black_Hole", "Thornfield", "Shadow_Swamp"];
  if (options.season === "SS14" && locale?.sourceSeasonEvidence?.actualSeason === 14 && dotSkills.includes(locale.sourceRecordKey)) {
    const handled = new Set();
    const add = (line, kind, values = {}) => {
      handled.add(line);
      mechanics.push({ kind, sourceText: line, sourceUrl: locale.sourceUrl, sourcePageSha256: locale.sourcePageSha256, ...values });
    };
    for (const line of new Set(locale.detail.split("\n"))) {
      let m;
      if ((m = line.match(/^This skill ([\d.]+) % additional damage for every \+1 additional Max Channeled Stack\(s\)$/u))) add(line, "additional-channel", { per: Number(m[1]), field: "additionalChannelStacks" });
      else if (/^(?:For each Terra Charge consumed when this skill is cast, that cast deals 26% additional damage|\+26 % additional damage for the skill for every Terra Charge consumed)$/u.test(line)) add(line, "terra-charge", { per: 26, field: "terraCharges" });
      else if (["The maximum stacks of Terra Charge are 1", "Gain 1 stack of Terra Charge per 0.5 s", "This skill's max base Terra quantity is 1 .", "Damage Over Time statuses inflicted by the skill can't be spread (excludes Ailments)",
        "Inflicts Frostbite when this skill deals damage", "Initially has 3 maximum links", "+1 maximum link for every channeled stack", "0.5 % Max Life per second per link",
        "The Black Hole knocks back enemies inside of it every 0.5 s.", "The skill can only generate 1 Terra", "Enemies on a Swamp Terra are Weakened", "Each movement grants +10% additional Skill Area for the Swamp Terra"].includes(line)) add(line, "observed-dot-state");
      else if (line === "On hit, Shadow Shot moves the existing Swamp Terra to the location of the hit and causes another explosion") add(line, "swamp-move", { field: "extraHits" });
      else if (line === "For every stack of Terra Charge consumed, the Swamp Terra gains an additional effect every time it moves: +26% additional Damage Over Time (does not apply to Ailment Damage)") {
        add(line, "swamp-charge", { field: "terraCharges", per: 26 });
        add(line, "swamp-moved", { field: "swampMoved" });
      }
      else if (line === "When the skill deals Damage Over Time, it inflicts 100 Affliction on the enemy. Effect Cooldown: 1 s") add(line, "affliction-infliction", { value: 100 });
      else if (line === "You deal + 3.5 % additional Damage Over Time to enemies in the Black Hole for every 10 Affliction they have for 4 s.") add(line, "black-hole-euphoria", { field: "euphoria", per: 3.5 });
      else if (line === "Deals 249-249 Persistent Erosion Damage.") {
        add(line, "persistent-base");
        parsed.effects.push({ stat: "persistent-erosion-damage-per-second", operation: "set", value: 249, unit: "flat", sourceText: line });
      }
    }
    parsed.blockers = parsed.blockers.filter(b => !handled.has(b.sourceText));
    // Replace only the exact per-state effects covered above. Other clauses
    // on this card retain the parser's normal fail-closed behavior.
    parsed.effects = parsed.effects.filter(e => !handled.has(e.sourceText) || e.stat === "persistent-erosion-damage-per-second");
    if (options.combat !== undefined) {
      const appliedKinds = new Set();
      for (const m of mechanics.filter(m => m.field)) {
        if (appliedKinds.has(m.kind)) continue;
        appliedKinds.add(m.kind);
        const value = options.combat?.[m.field];
        if (!Number.isFinite(value)) { parsed.blockers.push({ sourceText: m.sourceText, reason: "ss14-combat-state-required" }); continue; }
        if (["additional-channel", "terra-charge", "swamp-charge"].includes(m.kind)) parsed.effects.push({
          stat: m.kind === "swamp-charge" ? "skill-damage-over-time" : "skill-damage", operation: "more", value: m.per * value * (m.kind === "swamp-charge" ? options.combat.swampMoved : 1), unit: "percent", sourceText: m.sourceText });
        if (m.kind === "black-hole-euphoria") {
          if (!Number.isFinite(options.affliction)) parsed.blockers.push({ sourceText: m.sourceText, reason: "ss14-affliction-required" });
          // The buff affects all of this player's DoTs, added by the build
          // combiner once rather than only to Black Hole's own damage.
        }
      }
    }
  }
  const cadence = SS14_ICE_LANCES_CADENCE;
  if (options.season === "SS14" && item.id === cadence.itemId
    && locale?.sourcePageSha256 === cadence.cardSha256) {
    const time = parsed.effects.find(e => e.stat === "cast-time" && e.sourceUnit === "casts-per-second"
      && e.sourceValue === cadence.displayedCastsPerSecond);
    if (time) {
      // Prefer the installed, unrounded interval over inverting a rounded card.
      time.value = cadence.castTime;
      time.installedReceiptSha256 = cadence.receiptSha256;
      mechanics.push({ kind: "installed-cast-time", castTime: cadence.castTime,
        sourceReceiptSha256: cadence.receiptSha256,
        limitation: "얼음 송곳의 설치 데이터 시전 간격은 약 0.65초입니다. TLIDB의 1.54는 반올림된 초당 시전 횟수입니다." });
    }
  }
  return { ...parsed, mechanics };
}
