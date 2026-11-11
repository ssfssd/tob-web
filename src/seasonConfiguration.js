// A configuration is a user's input, not a season-value authority. Copy whole
// owned sections, including future nested fields; never normalize them away.
export const SEASON_CONFIGURATION_GROUPS = [
  { id: "hero", label: "히어로·레벨·특성·추억", fields: ["hero", "heroLevel"], selections: ["hero", "heroMemory"], section: "hero" },
  { id: "skills", label: "스킬·보조·모듈·영약·봉인", fields: ["skills", "skillLevels", "skillSeals"], selections: ["skills", "supports"], section: "skills" },
  { id: "gear", label: "장비·제작·침식·보관함", fields: ["gear", "gearAffixes", "gearRolls", "gearCrafts", "gearCorruptions", "gearLegendaryDrafts"], selections: ["gear"], section: "gear" },
  { id: "talents", label: "재능·프리즘·역상", fields: ["talents"], selections: ["talents"], section: "talents" },
  { id: "divinity", label: "신격·명왕·배치", fields: ["divinity"], selections: ["slates"], section: "divinity" },
  { id: "pact", label: "정령·운명·숙명", fields: ["pact"], selections: ["spirits", "destiny"], section: "pact" },
  { id: "combat", label: "전투 조건·사용자 옵션·계산 설정", fields: ["conditions", "customAffixes", "calculation"], selections: [], section: "conditions" },
];
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const pick = (value, keys) => Object.fromEntries(keys.filter((key) => Object.hasOwn(value ?? {}, key)).map((key) => [key, structuredClone(value[key])]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function captureSeasonConfiguration(build, groupId) {
  const group = SEASON_CONFIGURATION_GROUPS.find((entry) => entry.id === groupId);
  if (!group || !object(build)) throw new Error("이전할 구성 범위를 확인하세요.");
  return { fields: pick(build, group.fields), selections: pick(build.selections, group.selections),
    selectionProjection: pick(build.selectionProjection, group.selections) };
}

export function validSeasonConfigurations(configurations) {
  if (configurations === undefined) return true;
  if (!object(configurations)) return false;
  return Object.entries(configurations).every(([id, entry]) => {
    const group = SEASON_CONFIGURATION_GROUPS.find((row) => row.id === id);
    return group && object(entry) && object(entry.fields) && object(entry.selections) && object(entry.selectionProjection)
      && Object.keys(entry).every((key) => ["fields", "selections", "selectionProjection"].includes(key))
      && Object.keys(entry.fields).every((key) => group.fields.includes(key))
      && [entry.selections, entry.selectionProjection].every((values) => Object.keys(values).every((key) => group.selections.includes(key)));
  });
}

export function applySeasonConfigurations(source, configurations) {
  const target = structuredClone(source);
  for (const group of SEASON_CONFIGURATION_GROUPS) {
    const entry = configurations?.[group.id];
    if (!entry) continue;
    for (const field of group.fields) {
      delete target[field];
      if (Object.hasOwn(entry.fields, field)) target[field] = structuredClone(entry.fields[field]);
    }
    for (const field of ["selections", "selectionProjection"]) {
      target[field] ??= {};
      for (const category of group.selections) {
        delete target[field][category];
        if (Object.hasOwn(entry[field], category)) target[field][category] = structuredClone(entry[field][category]);
      }
    }
  }
  return target;
}

export function compareSeasonConfigurations(before, after) {
  return SEASON_CONFIGURATION_GROUPS.map((group) => ({ id: group.id, label: group.label,
    changed: !same(captureSeasonConfiguration(before, group.id), captureSeasonConfiguration(after, group.id)) }));
}

// Explicitly walk equipped/selected content. Inventory items are retained by
// migration but must not become equipped effects. Do not guess from arbitrary
// strings (notes and instance IDs are not game content IDs).
export function inspectNestedSeasonReferences(build, add) {
  const visit = (value, path, fields) => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (["inventory", "prismInventory", "inverseImageInventory", "slateInventory"].includes(key)) continue;
      const childPath = `${path}.${key}`;
      if (fields[key]) {
        const category = fields[key];
        if (typeof child === "string") add(category, child, childPath);
        else if (Array.isArray(child)) child.forEach((id, index) => add(category, id, `${childPath}.${index}`));
      }
      visit(child, childPath, fields);
    }
  };
  visit(build?.hero, "hero", { branchId: "hero", traitId: "heroTraits", choiceIds: "heroTraits", memoryTypeId: "heroMemory", affixId: "heroMemoryAffixes" });
  visit(build?.skills, "skills", { skillId: "skills", supportId: "supports", modularizationId: "modularization", elixirId: "elixirs", bottleId: "elixirs", ingredientId: "ingredients", ingredientIds: "ingredients" });
  visit(build?.talents, "talents", { boardId: "talentTrees", treeSlug: "talentTrees", selectedNodeIds: "talents", coreTalentIds: "talents", prismId: "prisms", prismItemSlug: "prisms", inverseImageId: "inverseImages" });
  for (const [index, board] of (build?.talents?.boards ?? []).entries()) {
    for (const field of ["nodePoints", "reflectedNodePoints"]) {
      for (const [id, points] of Object.entries(board?.[field] ?? {})) if (points > 0) add("talents", id, `talents.boards.${index}.${field}.${id}`);
    }
  }
  visit(build?.pact, "pact", { spiritId: "spirits", destinyId: "destiny", fateId: "destiny" });
  visit(build?.divinity, "divinity", { slateId: "slates", affixId: "divinityAffixes" });
  for (const [index, board] of (build?.divinity?.boards ?? []).entries()) {
    for (const [cellIndex, cell] of (board?.cells ?? []).entries()) {
      if (!cell?.slateInstanceId) continue;
      const instance = board.slateInventory?.find((row) => row.instanceId === cell.slateInstanceId);
      if (instance) visit(instance, `divinity.boards.${index}.cells.${cellIndex}`, { slateId: "slates", affixId: "divinityAffixes" });
      else add("slates", cell.slateInstanceId, `divinity.boards.${index}.cells.${cellIndex}.unresolved`);
    }
  }
}
