import {
  TOB91_IRIS_SPIRIT_INTEROP_RECEIPT,
} from "./data/91tobIrisSpiritInterop.ss13_4.generated.js";

function normalizedIdentifier(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function heroMode(identifier) {
  const normalized = normalizedIdentifier(identifier);
  if (TOB91_IRIS_SPIRIT_INTEROP_RECEIPT.heroIdentifiers.growingBreeze.includes(normalized)) {
    return "growing-breeze";
  }
  if (TOB91_IRIS_SPIRIT_INTEROP_RECEIPT.heroIdentifiers.vigilantBreeze.includes(normalized)) {
    return "vigilant-breeze";
  }
  return "";
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && Boolean(value)))];
}

export function createIrisSpiritActiveSkillRecords(passiveRecords) {
  return TOB91_IRIS_SPIRIT_INTEROP_RECEIPT.directActiveSkills.flatMap((identity) => {
    const matches = (passiveRecords ?? []).filter((record) => (
      record.name === identity.sourceName && record.url === identity.sourceUrl
    ));
    if (matches.length !== 1) return [];
    const passive = matches[0];
    const rawTags = uniqueStrings(passive.rawTags ?? passive.raw?.skill_types ?? []);
    return [{
      ...passive,
      id: identity.localActiveSkillId,
      kind: "active",
      role: "active",
      irisSpiritActive: true,
      irisSpiritPassiveSkillId: passive.id,
      tob91SourceId: identity.sourceSkillId,
      rawTags,
      compatibilityTags: uniqueStrings([
        ...rawTags,
        "active",
        "damage",
        "hit",
      ]),
      hostCapabilities: {
        canDealDamage: true,
        canHit: true,
        canAilmentOrDot: rawTags.includes("duration"),
        canBeCatalyzed: false,
      },
    }];
  });
}

export function filterIrisSpiritActiveSkillRecords(records, heroIdentifier) {
  const mode = heroMode(heroIdentifier);
  return (records ?? []).filter((record) => (
    record?.irisSpiritActive !== true || mode === "growing-breeze"
  ));
}

export function getIrisSpiritHostSkillForActiveSkill(model, activeSkillOrId, heroIdentifier) {
  const mode = heroMode(heroIdentifier);
  if (!mode) return null;
  const activeSkill = typeof activeSkillOrId === "string"
    ? model?.active?.find(({ id }) => id === activeSkillOrId)
    : activeSkillOrId;
  if (!activeSkill || activeSkill.irisSpiritActive === true) return null;
  const identities = TOB91_IRIS_SPIRIT_INTEROP_RECEIPT.mappings.filter((identity) => (
    identity.sourceActiveName === activeSkill.name
    && identity.sourceActiveUrl === activeSkill.url
  ));
  if (identities.length !== 1) return null;
  const identity = identities[0];
  const hosts = (model?.passive ?? []).filter((record) => (
    record.name === identity.sourceSpiritHostName
    && record.url === identity.sourceSpiritHostUrl
  ));
  return hosts.length === 1 ? hosts[0] : null;
}

export function getIrisSpiritHeroMode(identifier) {
  return heroMode(identifier);
}
