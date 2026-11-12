const CURRENT_SEASON = "SS13";
const CURRENT_SEASON_NUMBER = 13;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SUPPORT_TAG_GROUPS = Object.freeze({
  Area: ["area"],
  "Area Spell": ["area", "spell"],
  Attack: ["attack"],
  "Attack Projectile": ["attack", "projectile"],
  Aura: ["aura"],
  Barrage: ["bombardment"],
  Beam: ["beam"],
  Channeled: ["channeling"],
  Combo: ["combo"],
  Curse: ["curse"],
  Defensive: ["guard"],
  Duration: ["duration"],
  Elixir: ["elixir"],
  Empower: ["empower"],
  Focus: ["infuse"],
  "Horizontal Projectile": ["projectile", "straight_shot"],
  "Melee Attack": ["melee", "attack"],
  "Melee Demolisher": ["melee", "strike"],
  "Melee Slash Strike": ["melee", "steep_strike"],
  Mobility: ["movement"],
  "Modularization Minion": ["modularization", "summon"],
  "Parabolic Projectile": ["projectile", "lob"],
  Projectile: ["projectile"],
  Restoration: ["recovery"],
  Sentry: ["sentry"],
  "Shadow Strike": ["shadow_strike"],
  Spell: ["spell"],
  "Spirit Magus": ["spirit"],
  "Synthetic Troop": ["synthetic", "summon"],
  Terra: ["ground"],
  "Vertical Projectile": ["projectile", "falling"],
  Warcry: ["warcry"],
});

function exactCurrentEnglishDetail(item, expectedSeason = CURRENT_SEASON) {
  if (!["SS13", "SS14"].includes(expectedSeason)) return null;
  const expectedSeasonNumber = Number(expectedSeason.slice(2));
  const locale = item?.tlidbText?.en;
  const season = locale?.sourceSeasonEvidence;
  if (
    locale?.sourceFieldStatus?.detail !== "exact"
    || locale?.sourcePageVersion !== expectedSeason
    || season?.expectedSeason !== expectedSeasonNumber
    || season?.actualSeason !== expectedSeasonNumber
    || season?.collectionAllowed !== true
    || season?.verificationComplete !== true
    || typeof locale?.sourceUrl !== "string"
    || !locale.sourceUrl.startsWith("https://tlidb.com/en/")
    || typeof locale?.sourceRecordKey !== "string"
    || !locale.sourceRecordKey
    || !SHA256_PATTERN.test(locale?.sourcePageSha256 ?? "")
    || typeof locale?.detail !== "string"
  ) return null;
  return locale.detail;
}

export function getCurrentTlidbSupportCompatibility(item, { season = CURRENT_SEASON } = {}) {
  const detail = exactCurrentEnglishDetail(item, season);
  if (!detail) return null;
  const sourceTexts = [];
  const requiredTagGroups = [];
  const excludedTags = [];
  const specificHostSkillNames = [];
  let requiresDamage = false;
  let requiresHit = false;
  let requiresAilmentOrDot = false;
  let hostRole = "any";

  function parseAllowedBody(rawBody) {
    const body = rawBody.replace(/[.]$/u, "").trim();
    if (/^any skills?$/iu.test(body)) return true;
    if (/^skills that deal damage$/iu.test(body)) {
      requiresDamage = true;
      return true;
    }
    if (/^skills that hit (?:enemies|the enemy)$/iu.test(body)) {
      requiresHit = true;
      return true;
    }
    if (/^Active Skills? that deal damage$/iu.test(body)) {
      hostRole = 'active'; requiresDamage = true; return true;
    }
    if (['Restoration and Elixir Skills', 'Empower and Defensive Skills'].includes(body)) {
      for(const phrase of body.replace(/ Skills$/u,'').split(' and ')) requiredTagGroups.push([...SUPPORT_TAG_GROUPS[phrase]]);
      return true;
    }
    if (/^skills that deal Damage Over Time or inflict Ailments$/iu.test(body)) {
      requiresAilmentOrDot = true;
      return true;
    }
    if (/^Persistent Skills and skills that can inflict Ailment$/iu.test(body)) {
      requiresAilmentOrDot = true;
      return true;
    }
    if (/^skills that summon Minions$/iu.test(body)) {
      requiredTagGroups.push(["summon"]);
      return true;
    }
    if (/^skills that summon Spirit Magus$/iu.test(body)) {
      requiredTagGroups.push(["summon", "spirit"]);
      return true;
    }
    if (/^skills that summon Synthetic Troops$/iu.test(body)) {
      requiredTagGroups.push(["summon", "synthetic"]);
      return true;
    }
    if (/^Spell Skills or skills that can activate Spell Burst$/iu.test(body)) {
      requiredTagGroups.push(["spell"], ["can_activate_spell_burst"]);
      return true;
    }
    if (/^Attack Skills or Spell Skills$/iu.test(body)) {
      requiredTagGroups.push(["attack"], ["spell"]);
      return true;
    }
    if (/^Attack and Spell Skills$/iu.test(body)) {
      requiredTagGroups.push(["attack"], ["spell"]);
      return true;
    }
    if (/^Horizontal Projectile Skills or Chain Skills$/iu.test(body)) {
      requiredTagGroups.push(["projectile", "straight_shot"], ["chain"]);
      return true;
    }

    const roleMatch = body.match(/^(Active|Passive) Skills?$/iu);
    if (roleMatch) {
      hostRole = roleMatch[1].toLowerCase();
      return true;
    }
    const taggedRoleMatch = body.match(/^(Active|Passive) (.+?) Skills?$/iu);
    const tagPhrase = taggedRoleMatch?.[2]
      ?? body.match(/^(.+?) Skills?$/iu)?.[1]
      ?? null;
    const tagGroup = tagPhrase ? SUPPORT_TAG_GROUPS[tagPhrase] : null;
    if (tagGroup) {
      requiredTagGroups.push([...tagGroup]);
      if (taggedRoleMatch) hostRole = taggedRoleMatch[1].toLowerCase();
      return true;
    }
    if (!/\bSkills?\b/iu.test(body)) {
      specificHostSkillNames.push(body);
      return true;
    }
    return false;
  }

  function parseExcludedBody(rawBody) {
    const body = rawBody.replace(/[.]$/u, "").trim();
    const mappings = [
      [/\bAttack\b/iu, "attack"],
      [/\bChanneled\b/iu, "channeling"],
      [/\bMobility\b/iu, "movement"],
      [/\bSentry\b/iu, "sentry"],
      [/\bSummon\b|\bMinion Skills?\b/iu, "summon"],
    ];
    const matched = mappings.filter(([pattern]) => pattern.test(body));
    excludedTags.push(...matched.map(([, tag]) => tag));
    return matched.length > 0;
  }

  for (const rawLine of detail.split(/\r?\n/u)) {
    const line = rawLine.trim().replace(/^This skill cannot support /u, 'Cannot support ');
    if (!/^(?:Supports?\b|Cannot support\b)/iu.test(line)) continue;
    const snapshot = {
      requiredTagGroupCount: requiredTagGroups.length,
      excludedTagCount: excludedTags.length,
      specificHostSkillNameCount: specificHostSkillNames.length,
      requiresDamage,
      requiresHit,
      requiresAilmentOrDot,
      hostRole,
    };
    const clauses = line.split(/(?<=\.)\s+(?=(?:Supports?|Cannot support)\b)/iu);
    const parsed = clauses.every((clause) => {
      const allow = clause.match(/^Supports?\s+(.+)$/iu);
      if (allow) return parseAllowedBody(allow[1]);
      const exclude = clause.match(/^Cannot support\s+(.+)$/iu);
      return exclude ? parseExcludedBody(exclude[1]) : false;
    });
    if (parsed) {
      sourceTexts.push(line);
      continue;
    }
    requiredTagGroups.length = snapshot.requiredTagGroupCount;
    excludedTags.length = snapshot.excludedTagCount;
    specificHostSkillNames.length = snapshot.specificHostSkillNameCount;
    requiresDamage = snapshot.requiresDamage;
    requiresHit = snapshot.requiresHit;
    requiresAilmentOrDot = snapshot.requiresAilmentOrDot;
    hostRole = snapshot.hostRole;
  }
  if (!sourceTexts.length) return null;
  return {
    sourceTexts,
    requiredTagGroups,
    excludedTags: [...new Set(excludedTags)],
    specificHostSkillNames,
    requiresDamage,
    requiresHit,
    requiresAilmentOrDot,
    hostRole,
  };
}

function normalizedName(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

function canonicalHostTag(value) {
  const tag = String(value ?? "").trim().toLowerCase();
  return ({
    channeled: "channeling",
    minion: "summon",
    mobility: "movement",
    persistent: "duration",
  })[tag] ?? tag;
}

export function isCurrentTlidbSupportCompatible(item, host, options = {}) {
  const compatibility = getCurrentTlidbSupportCompatibility(item, options);
  if (!compatibility) return null;
  const tags = new Set((host?.tags ?? []).map(canonicalHostTag));
  const role = String(host?.role ?? "any").trim().toLowerCase();
  if (compatibility.hostRole !== "any" && role !== compatibility.hostRole) return false;
  if (compatibility.requiresDamage && host?.canDealDamage !== true) return false;
  if (compatibility.requiresHit && host?.canHit !== true) return false;
  if (compatibility.requiresAilmentOrDot && host?.canAilmentOrDot !== true) return false;
  if (compatibility.excludedTags.some((tag) => tags.has(tag))) return false;
  if (
    compatibility.requiredTagGroups.length
    && !compatibility.requiredTagGroups.some((group) => group.every((tag) => tags.has(tag)))
  ) return false;
  if (compatibility.specificHostSkillNames.length) {
    const names = new Set((host?.names ?? []).map(normalizedName).filter(Boolean));
    if (!compatibility.specificHostSkillNames.some((name) => names.has(normalizedName(name)))) {
      return false;
    }
  }
  return true;
}
