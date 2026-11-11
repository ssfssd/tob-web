// Unreal's pretty-printed Lua trees use column positions, not indentation depth.
// Keep the source in memory only. Never print values from an unfiltered tree.
export function parseTree(lines) {
  const root = Object.create(null);
  const stack = [];
  const truncated = [];
  const malformed = [];
  for (const { text, line } of lines) {
    if (!/^[ |]*\+/.test(text)) continue;
    const valueMatch = text.match(/ \[([^\r\n]*)\]\s*$/);
    const branch = valueMatch ? text.slice(0, valueMatch.index) : text.trimEnd();
    const parts = [...branch.matchAll(/\+([^+|]+)/g)];
    if (!parts.length) continue;
    while (stack.length && stack.at(-1).column >= parts[0].index) stack.pop();
    for (const [index, part] of parts.entries()) {
      const key = part[1].trim();
      const parent = stack.length ? stack.at(-1).node : root;
      if (key === "...") {
        truncated.push({ line, path: [...stack.map((entry) => entry.key)] });
        continue;
      }
      if (!key || ["__proto__", "constructor", "prototype"].includes(key)) {
        malformed.push(line);
        continue;
      }
      const last = index === parts.length - 1;
      let node;
      if (last && valueMatch) {
        const raw = valueMatch[1];
        node = /^-?\d+(?:\.\d+)?$/.test(raw) && Number.isSafeInteger(Number(raw))
          ? Number(raw)
          : /^-?\d+\.\d+$/.test(raw) && Number.isFinite(Number(raw))
            ? Number(raw)
            : raw === "true" ? true : raw === "false" ? false : raw;
      } else {
        node = Object.create(null);
      }
      if (Object.hasOwn(parent, key)) malformed.push(line);
      parent[key] = node;
      if (node && typeof node === "object") stack.push({ column: part.index, key, node });
    }
  }
  return { root, truncated, malformed };
}

export function schemaPaths(value, path = "", result = new Set(), depth = 0) {
  if (!value || typeof value !== "object" || depth > 8) return result;
  for (const [key, child] of Object.entries(value)) {
    const safeKey = /^[A-Za-z_][A-Za-z0-9_]{0,45}$/.test(key) ? key : "[]";
    const next = path ? `${path}.${safeKey}` : safeKey;
    result.add(next);
    schemaPaths(child, next, result, depth + 1);
  }
  return result;
}

const entries = (value) => value && typeof value === "object" ? Object.entries(value) : [];
const values = (value) => entries(value).map(([, child]) => child);
const numberFields = (value, fields) => Object.fromEntries(fields.flatMap((key) => {
  const field = value?.[key];
  return (typeof field === "number" && Number.isFinite(field)) || typeof field === "boolean"
    ? [[key, field]] : [];
}));
const numberList = (value) => values(value).filter((entry) => typeof entry === "number" && Number.isFinite(entry));
const AFFIX_FAMILIES = ["Prefix", "Suffix", "BaseAffix", "BaseAttrAffix", "FixedBaseAffix", "EnchantAffixs", "ChipAffix"];
const relevantPath = (path) => /^(bag\.(wearItems|dressSkillItems|dressingTalentBlocks)|skills\.skills|skillLayout|geniusInfos)/.test(path);

export function logGroupComplete(record, group) {
  return record.groupCompleteness?.[group] ?? record.verdict !== "incomplete";
}

function affixes(value) {
  return values(value).map((affix) => {
    const args = entries(affix?.DynArgs);
    const validArgs = (!affix || !Object.hasOwn(affix, "DynArgs") || affix.DynArgs !== null && typeof affix.DynArgs === "object")
      && args.every(([key, v], index) => key === String(index + 1) && typeof v === "number" && Number.isFinite(v));
    return { ...numberFields(affix, ["Id", "Version", "source"]),
      ...(affix && Object.hasOwn(affix, "DynArgs") ? { DynArgs: args.map(([, v]) => typeof v === "number" && Number.isFinite(v) ? v : null) } : {}),
      ...(!Number.isSafeInteger(affix?.Id) || !validArgs ? { invalid: true } : {}) };
  });
}

export function itemFields(item) {
  return {
    ...numberFields(item, ["BaseId", "UniqueItmId", "Level", "SkillItemLevel", "RareValue", "Corrode", "InfluenceId", "AffixNum"]),
    affixes: Object.fromEntries(AFFIX_FAMILIES.filter((family) => Object.hasOwn(item, family))
      .map((family) => [family, affixes(item[family])])),
    ...slateFields(item),
  };
}

// Keep positional zeroes and invalid markers. Filtering a malformed option
// would move the last-talent copy target to a different slot.
function slateFields(item) {
  const fields = ["ShapeId", "Direction", "InfluenceId", "EnhanceId", "CustomEnhancedTimes", "devilBlockAttrId", "recipeId", "growCount"];
  const lists = ["BaseTalentList", "EnchantTalentList", "talentSlotList"];
  if (![...fields, ...lists].some(k => Object.hasOwn(item, k))) return {};
  let invalid = fields.some(k => Object.hasOwn(item, k) && !Number.isSafeInteger(item[k]));
  const list = (key, slots = false) => {
    if (!Object.hasOwn(item, key)) return [];
    const rows = entries(item[key]);
    if (!item[key] || typeof item[key] !== "object" || rows.length > 32) invalid = true;
    return rows.slice(0, 33).map(([index, value], i) => {
      if (index !== String(i + 1)) invalid = true;
      const id = slots ? value?.talentId ?? 0 : value;
      if (!Number.isSafeInteger(id) || id < 0) { invalid = true; return slots ? { talentId: null } : null; }
      if (!slots) return id;
      return { talentId: id, ...numberFields(value, ["effectDevilBlockIdx"]),
        ...(["White", "Blue", "Purple", "Orange", "Red"].includes(value.color) ? { color: value.color } : {}),
        ...(/^Rarity[0-5]$/.test(value.rarity ?? "") ? { rarity: value.rarity } : {}) };
    });
  };
  const baseTalents = list("BaseTalentList"), enchantTalents = list("EnchantTalentList"), talentSlots = list("talentSlotList", true);
  return { ...numberFields(item, fields), baseTalents, enchantTalents, talentSlots,
    ...(invalid ? { invalidSlate: true } : {}) };
}

// Explicitly allowlisted projections: no player names, account identifiers,
// instance IDs, auth fields, source text, or arbitrary strings leave this boundary.
export function extractSnapshot(snapshot, source) {
  const root = snapshot.root;
  const gear = values(root.bag?.wearItems).filter((row) => Number.isFinite(row.Item?.BaseId))
    .map((row) => ({ ...numberFields(row, ["PageId", "Index"]), ...itemFields(row.Item) }));
  const skillRows = values(root.bag?.dressSkillItems).filter((row) => Number.isFinite(row.Item?.BaseId));
  const skills = skillRows.map((row, index) => ({
    ref: `skill-${index + 1}`,
    ...numberFields(row, ["PageId", "Index"]),
    ...numberFields(row.Item, ["BaseId", "Level", "SkillItemLevel", "RareValue"]),
  }));
  // Keep the second list separate: presence here does not prove equipped status.
  // Match instance IDs only in memory and only within this same response.
  const alternateRows = values(root.skills?.skills).filter((item) => Number.isFinite(item.BaseId));
  const alternateSkills = alternateRows.map((item, index) => ({
    ref: `alternate-skill-${index + 1}`,
    ...numberFields(item, ["BaseId", "Level", "SkillItemLevel", "RareValue"]),
  }));
  const skillLayout = values(root.skillLayout?.slots).filter((row) => Number.isFinite(row.key))
    .map((row) => {
      const index = skillRows.findIndex((skill) => skill.Item.Id !== undefined && skill.Item.Id === row.value?.skillId);
      const alternateIndex = alternateRows.findIndex((item) => item.Id !== undefined && item.Id === row.value?.skillId);
      return {
        slot: row.key,
        observedSkillRef: index >= 0 ? `skill-${index + 1}`
          : alternateIndex >= 0 ? `alternate-skill-${alternateIndex + 1}` : null,
        ...(row.value?.status === "Activating" ? { status: "Activating" } : {}),
      };
    });
  const talents = values(root.geniusInfos?.info).filter((tree) => Number.isFinite(tree.geniusCareerId))
    .map((tree) => ({
      careerId: tree.geniusCareerId,
      nodes: values(tree.geniusList).filter((node) => Number.isFinite(node.geniusId)).map((node) => ({
        ...numberFields(node, ["geniusId", "point", "prePointNeed", "inPrismArea", "disable", "beforeGenusFree"]),
        position: numberFields(node.position, ["x", "y"]),
        ...(node.extAffix ? { extAffix: affixes(node.extAffix) } : {}),
      })),
      bonuses: values(tree.bonusGeniusInfo).map((row) => ({
        ...numberFields(row, ["key"]), ...numberFields(row.value, ["geniusId"]),
      })),
      ...(tree.Modifiers ? { modifiers: affixes(tree.Modifiers) } : {}),
      ...(tree.prismInfo?.item ? { prism: itemFields(tree.prismInfo.item) } : {}),
    }));
  const slates = values(root.bag?.dressingTalentBlocks).filter((row) => Number.isFinite(row.Item?.BaseId))
    .map((row) => ({
      ...numberFields(row, ["PageId", "Index"]),
      ...itemFields(row.Item),
    }));
  const omissions = snapshot.truncated.filter((entry) => relevantPath(entry.path.join(".")))
    .map((entry) => ({ sourceLine: entry.line, path: entry.path.map((key) => /^\d+$/.test(key) ? key : /^[A-Za-z_][A-Za-z0-9_]{0,45}$/.test(key) ? key : "[redacted-key]").join("."), reason: "source-ellipsis" }));
  const groupCompleteness = Object.fromEntries(Object.entries({ gear: "wearItems", skills: "dressSkillItems", slates: "dressingTalentBlocks" }).map(([group, field]) => {
    const prefix = ["bag", field];
    const omitted = snapshot.truncated.some(({ path }) => prefix.every((key, i) => key === path[i]));
    return [group, Boolean(snapshot.complete && !snapshot.malformed.length && root.bag?.[field] && typeof root.bag[field] === "object" && !omitted)];
  }));
  return {
    schemaVersion: "tob-game-log-evidence-v1",
    verdict: omissions.length || snapshot.malformed.length || !snapshot.complete ? "incomplete" : "not-proven-complete",
    usableAsCompleteTobImport: false,
    source: { file: source.source, sha256: source.sha256, message: "GetPlayerData", startLine: snapshot.line, endLine: snapshot.endLine,
      timestamp: snapshot.timestamp, closedByNextLogEntry: snapshot.complete, buildCodeAssociation: "unverified" },
    character: numberFields(root.player, ["Level", "SeasonId", "HeroId", "HeroPurchaseId"]),
    gear, skills, alternateSkills, skillLayout, talents, slates, omissions, groupCompleteness,
    slatesObserved: Object.hasOwn(root.bag ?? {}, "dressingTalentBlocks"),
    slatesMalformed: Object.hasOwn(root.bag ?? {}, "dressingTalentBlocks") && (!root.bag.dressingTalentBlocks || typeof root.bag.dressingTalentBlocks !== "object")
      || values(root.bag?.dressingTalentBlocks).some(row => row?.PageId !== -4 || !Number.isInteger(row?.Index) || !Number.isSafeInteger(row.Item?.BaseId))
      || (() => { const ids = values(root.bag?.dressingTalentBlocks).map(row => row.Item?.Id).filter(Boolean); return new Set(ids).size !== ids.length; })(),
    parseErrors: snapshot.malformed.length,
    notes: ["Only allowlisted observed values are exported; absent fields are not defaulted.",
      "Native slot indices and slate shapes/directions are not translated to TOB coordinates.",
      "This is a diagnostic snapshot, not a validated TOB build document."],
  };
}

export function summarize(snapshot) {
  const affixRows = snapshot.gear.flatMap((item) => Object.values(item.affixes).flat());
  return {
    source: snapshot.source,
    verdict: snapshot.verdict,
    character: snapshot.character,
    counts: { gear: snapshot.gear.length, gearAffixes: affixRows.length,
      affixesWithExplicitRolls: affixRows.filter((row) => row.DynArgs?.length).length,
      skills: snapshot.skills.length, alternateSkillRecords: snapshot.alternateSkills.length,
      skillLayoutSlots: snapshot.skillLayout.length,
      unresolvedLayoutReferences: snapshot.skillLayout.filter((row) => row.observedSkillRef === null).length,
      talentTrees: snapshot.talents.length, talentNodes: snapshot.talents.reduce((sum, tree) => sum + tree.nodes.length, 0),
      slates: snapshot.slates.length, slatesWithExplicitDirection: snapshot.slates.filter((row) => Object.hasOwn(row, "Direction")).length,
      slatesWithExplicitShape: snapshot.slates.filter((row) => Object.hasOwn(row, "ShapeId")).length },
    parseErrors: snapshot.parseErrors,
    omissions: snapshot.omissions,
    usableAsCompleteTobImport: false,
  };
}
