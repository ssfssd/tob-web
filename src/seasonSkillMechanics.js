import { parseTlidbSkillTooltipCalculation } from "./tlidbSkillTooltipCalculation.js";
import { SS14_ICE_LANCES_CADENCE } from "./data/ss14IceLancesCadence.generated.js";
import { resolveSeasonSkillLevel } from "./seasonSkillLevels.js";

export const VOLTAIC_RIPPLE_ID='skills-ss14-current-voltaic-ripple';
export const MOON_STRIKE_ID='skills-tlidb-com-cn-moon-strike';
export const VOLTAGE_AFTERWAVE_CHARGES=3;
export const voltageAverageFields = {
  voltageAverage:{label:'전광의 물결 관측 평균 대미지 배율 (%)',min:50,max:150},
  voltageTurmoilAverage:{label:'불안정 적용 후 관측 평균 대미지 배율 (%)',min:30,max:300},
};

// A supported mechanic never hides any other unknown line on the same card.
export function parseSeasonSkillMechanics(item, options) {
  const sourceDetail = item.tlidbText?.en?.detail;
  const resolved = options.season === "SS14" ? resolveSeasonSkillLevel(item, options.level) : null;
  if (resolved?.blockers.length) return { effects: [], blockers: resolved.blockers, mechanics: [] };
  item = resolved?.item ?? item;
  const parsed = parseTlidbSkillTooltipCalculation(item, { ...options, level: resolved?.parserLevel ?? options.level });
  if (resolved?.receipt) parsed.progressionReceipt = resolved.receipt;
  if (resolved?.missingAddedDamageEffectiveness) parsed.missingAddedDamageEffectiveness = true;
  const locale = item.tlidbText?.en;
  const mechanics = [];
  if (options.season === 'SS14' && locale?.sourceRecordKey === 'Moon_Strike'
    && locale.sourceSeasonEvidence?.actualSeason === 14 && locale.sourceSeasonEvidence.verificationComplete) {
    const forms = /(?:^|\n)Sweep Slash:\nDeals ([\d.]+)% Weapon Attack Damage\.\nSteep Strike:\nDeals ([\d.]+)% Weapon Attack Damage\./u.exec(locale.detail);
    const chance = /^This skill \+([\d.]+) % Steep Strike chance\.$/mu.exec(locale.detail);
    const growth = resolved?.extraEffects?.find(e=>e.stat==='skill-damage'&&e.operation==='more');
    const spellLine = "Spell Damage bonus and additional bonus also apply to the skill's Attack Damage";
    const manaLine = '+1 % additional damage for the skill for every 100 Max Mana, up to +70 %';
    const coefficients = parsed.effects.filter(e=>e.stat==='weapon-attack-damage-coefficient');
    const added = parsed.effects.find(e=>e.stat==='added-damage-effectiveness');
    const mana = parsed.effects.find(e=>e.sourceText===manaLine && e.per?.path==='stats.mana' && e.per.divisor===100 && e.per.cap===70);
    const baseChance = parsed.effects.find(e=>e.stat==='skill-steep-strike-chance' && e.sourceText===chance?.[0]);
    if (forms && baseChance && baseChance.value>=0 && baseChance.value<=100 && mana && parsed.blockers.some(b=>b.sourceText===spellLine)
      && coefficients.length===2 && coefficients.every((e,i)=>e.value===Number(forms[i+1]))
      && added?.value===coefficients[0].value && resolved.secondaryEffectiveness===coefficients[1].value) {
      const baseSlashChance=baseChance.value;
      const knownMana=Number.isFinite(options.maxMana)&&options.maxMana>=0;
      const manaBonus=knownMana ? Math.min(70,Math.floor(options.maxMana/100)) : null;
      const rainbowBonus=knownMana && options.moonRainbow ? Math.min(options.moonRainbow.maxBonus,Math.floor(options.maxMana/100)) : 0;
      const slashChance=Math.min(100,baseSlashChance+rainbowBonus);
      const averageCoefficient=coefficients[0].value+(coefficients[1].value-coefficients[0].value)*slashChance/100;
      parsed.effects=parsed.effects.filter(e=>e!==coefficients[1]&&e!==mana&&e!==baseChance)
        .map(e=>e===added||e===coefficients[0] ? {...e,value:averageCoefficient,sourceText:forms[0].trim()+'\n'+chance[0]} : e);
      if (knownMana) parsed.effects.push({stat:'skill-damage',operation:'more',unit:'percent',value:manaBonus,sourceText:manaLine});
      const consumed = new Set([spellLine,`Effectiveness of added damage ${coefficients[1].value}%`]);
      parsed.blockers=parsed.blockers.filter(b=>!consumed.has(b.sourceText));
      mechanics.push({kind:'moon-strike-forms', level:options.level, sweep:coefficients[0].value, slash:coefficients[1].value,
        baseSlashChance,slashChance,rainbowBonus,rainbowSourceUrl:options.moonRainbow?.sourceUrl,
        averageCoefficient,manaBonus,growthMultiplier:growth ? 1+growth.value/100 : null,sourceUrl:locale.sourceUrl});
    }
  }
  if (options.season === 'SS14' && locale?.sourceRecordKey === 'Groundshaker'
    && locale.sourceSeasonEvidence?.actualSeason === 14 && locale.sourceSeasonEvidence.verificationComplete) {
    const recovery = 'This skill gains 1 Demolisher Charge every 3 s.';
    const coverage = [recovery, "This skill's Demolisher Charge Restoration Speed bonuses are also applied to the speed at which the fissure spreads.",
      '+10 % additional Skill Area when the skill consumes Demolisher Charge'];
    const hitParts = /Fission:\n(Deals [\d.]+% Weapon Attack Damage\.)\nFissure Secondary Damage:\n(Deals [\d.]+% Weapon Attack Damage)\n/u.exec(locale.detail);
    const coefficients = parsed.effects.filter(e=>e.stat==='weapon-attack-damage-coefficient');
    const added = parsed.effects.find(e=>e.stat==='added-damage-effectiveness');
    if (hitParts && coefficients.length===2 && coefficients.every((e,i)=>e.sourceText===hitParts[i+1])
      && added?.value>0 && coefficients[0].value>0 && coefficients[1].value>0
      && coefficients[1].value*added.value===coefficients[0].value*resolved?.secondaryEffectiveness
      && coverage.every(line=>parsed.blockers.some(b=>b.sourceText===line))) {
      parsed.effects=parsed.effects.filter(e=>e!==coefficients[1]);
      parsed.blockers=parsed.blockers.filter(b=>!coverage.includes(b.sourceText));
      mechanics.push({kind:'groundshaker-fissure',field:'fissureHits',interval:3,hitMultiplier:coefficients[1].value/coefficients[0].value,
        sourceText:hitParts[2]+'\n'+recovery,sourceUrl:locale.sourceUrl,sourcePageSha256:locale.sourcePageSha256});
    }
  }
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
  if (options.season === "SS14" && locale?.sourceRecordKey === "Chain_Lightning"
    && locale.sourceSeasonEvidence?.actualSeason === 14 && locale.sourceSeasonEvidence.verificationComplete) {
    const line = "+2 Jumps for this skill";
    const found = parsed.blockers.filter(blocker => blocker.sourceText === line);
    if (found.length === 1) {
      parsed.blockers = parsed.blockers.filter(blocker => blocker !== found[0]);
      // The Chain help requires another enemy for a jump. The DPS scenario
      // uses one enemy, so the unmodified skill lands one hit per cast.
      mechanics.push({ kind: "single-target-chain", sourceText: line,
        sourceUrl: locale.sourceUrl, sourcePageSha256: locale.sourcePageSha256,
        limitation: "적이 한 명일 때 번개 사슬은 시전당 1회 적중합니다." });
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
  if (options.season === "SS14" && locale?.sourceRecordKey === "Wilting_Beam"
    && locale.sourceSeasonEvidence?.actualSeason === 14 && locale.sourceSeasonEvidence.verificationComplete) {
    const spread = "Damage Over Time statuses inflicted by the skill can't be spread (excludes Ailments)";
    const trigger = "At max channeled stacks, loses all channeled stacks and Reaps enemies within the Wilting Beam's range once.";
    const duration = parsed.effects.find(e => e.stat === "reaping-duration" && e.operation === "set");
    const baseBeams = sourceDetail?.includes("Channels the skill and fires 1 Wilting Beam forward") ? 1 : null;
    const recovery = parsed.effects.find(e => e.stat === "effect-cooldown" && e.operation === "set" && e.value > 0
      && locale.detail.includes(`Reaping:\n${duration?.sourceText}\n${e.sourceText}`));
    // An exact level-table row preserves the Reaping block but omits Simple.
    if (sourceDetail?.includes(trigger) && duration?.value > 0 && recovery) {
      parsed.blockers = parsed.blockers.filter(b => b.sourceText !== spread);
      mechanics.push({ kind: "wilting-beam-reaping", field: "reapingRate", baseBeams,
        sourceText: trigger, sourceUrl: locale.sourceUrl, sourcePageSha256: locale.sourcePageSha256 });
    }
  }
  const dotSkills = ["Path_of_Flames", "Mind_Control", "Frost_Terra", "Black_Hole", "Thornfield", "Shadow_Swamp", "Voltaic_Ripple"];
  if (options.season === "SS14" && locale?.sourceSeasonEvidence?.actualSeason === 14 && dotSkills.includes(locale.sourceRecordKey)) {
    const handled = new Set();
    const add = (line, kind, values = {}) => {
      handled.add(line);
      mechanics.push({ kind, sourceText: line, sourceUrl: locale.sourceUrl, sourcePageSha256: locale.sourcePageSha256, ...values });
    };
    for (const line of new Set(locale.detail.split("\n"))) {
      let m;
      if (locale.sourceRecordKey==='Voltaic_Ripple' && locale.sourceSeasonEvidence.verificationComplete
        && (m=line.match(/^Deals ([\d.]+) Persistent Lightning Damage per second for 2 s\. This damage changes randomly between 50% and 150% \.$/u))) {
        add(line,'voltage-observed-average',{field:'voltageAverage'});
        parsed.effects.push({stat:'persistent-lightning-damage-per-second',operation:'set',value:Number(m[1]),unit:'flat',sourceText:line});
      }
      else if ((m = line.match(/^This skill ([\d.]+) % additional damage for every \+1 additional Max Channeled Stack\(s\)$/u))) add(line, "additional-channel", { per: Number(m[1]), field: "additionalChannelStacks" });
      else if (/^(?:For each Terra Charge consumed when this skill is cast, that cast deals 26% additional damage|\+26 % additional damage for the skill for every Terra Charge consumed)$/u.test(line)) add(line, "terra-charge", { per: 26, field: "terraCharges" });
      else if (["The maximum stacks of Terra Charge are 1", "The maximum stack of Terra Charge is 1 .", "Gain 1 stack of Terra Charge per 0.5 s", "Gain 1 stack of Terra Charge per 0.5 second.", "This skill's max base Terra quantity is 1 .", "Damage Over Time statuses inflicted by the skill can't be spread (excludes Ailments)",
        "Inflicts Frostbite when this skill deals damage", "Initially has 3 maximum links", "+1 maximum link for every channeled stack", "0.5 % Max Life per second per link",
        "The Black Hole knocks back enemies inside of it every 0.5 s.", "The skill can only generate 1 Terra", "Enemies on a Swamp Terra are Weakened", "Each movement grants +10% additional Skill Area for the Swamp Terra"].includes(line)) add(line, "observed-dot-state");
      else if (line === "On hit, Shadow Shot moves the existing Swamp Terra to the location of the hit and causes another explosion") add(line, "swamp-move", { field: "extraHits" });
      else if (line === "For every stack of Terra Charge consumed, the Swamp Terra gains an additional effect every time it moves: +26% additional Damage Over Time (does not apply to Ailment Damage)") {
        add(line, "swamp-charge", { field: "terraCharges", per: 26 });
        add(line, "swamp-moved", { field: "swampMoved" });
      }
      else if (line === "When the skill deals Damage Over Time, it inflicts 100 Affliction on the enemy. Effect Cooldown: 1 s") add(line, "affliction-infliction", { value: 100 });
      else if (locale.sourceRecordKey === 'Black_Hole'
        && (m = line.match(/^You deal \+ ([\d.]+) % additional Damage Over Time to enemies in the Black Hole for every 10 Affliction they have for 4 s\.$/u)))
        add(line, "black-hole-euphoria", { field: "euphoria", per: Number(m[1]) });
      else if (line === "Deals 249-249 Persistent Erosion Damage.") {
        add(line, "persistent-base");
        parsed.effects.push({ stat: "persistent-erosion-damage-per-second", operation: "set", value: 249, unit: "flat", sourceText: line });
      }
    }
    parsed.blockers = parsed.blockers.filter(b => !handled.has(b.sourceText));
    // Replace only the exact per-state effects covered above. Other clauses
    // on this card retain the parser's normal fail-closed behavior.
    parsed.effects = parsed.effects.filter(e => !handled.has(e.sourceText) || /^persistent-(?:erosion|lightning)-damage-per-second$/u.test(e.stat));
    if (options.combat !== undefined) {
      const appliedKinds = new Set();
      for (const m of mechanics.filter(m => m.field)) {
        if (appliedKinds.has(m.kind)) continue;
        appliedKinds.add(m.kind);
        const field=m.kind==='voltage-observed-average' && options.voltageTurmoil ? 'voltageTurmoilAverage' : m.field;
        const value = options.combat?.[field];
        const range=voltageAverageFields[field];
        if (!Number.isFinite(value) || range&&(value<range.min||value>range.max)
          || field==='terraCharges'&&(!Number.isInteger(value)||value<0||value>(options.terraChargeMaximum??1))) {
          parsed.blockers.push({ sourceText: m.sourceText, reason: "ss14-combat-state-required" }); continue;
        }
        if (m.kind==='voltage-observed-average') parsed.effects.push({stat:'skill-damage-over-time',operation:'more',unit:'percent',value:value-100,sourceText:m.sourceText});
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
  // Only skills with an outgoing damage pool use the above-cap multiplier.
  if (parsed.effects.some(e => /^(?:weapon-attack-damage-coefficient|(?:attack|spell|persistent)-.+-damage(?:-min|-max|-coefficient|-per-second)?)$/u.test(e.stat)))
    parsed.effects.push(...(resolved?.extraEffects ?? []));
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
