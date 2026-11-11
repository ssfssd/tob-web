import { TLIDB_CATALOG } from "./data/tlidbCatalog.ss13.generated.js";
import { applySs13SkillValueAuthority } from "./ss13SkillValueAuthority.js";
import { SS14_LOG_COMPLETION } from "./data/ss14LogCompletion.generated.js";
import { SS14_CURRENT_DATABASE } from "./data/ss14CurrentDatabase.generated.js";

const LOCALE_FIELDS = Object.freeze(["name", "summary", "detail", "tags", "type", "slot", "rarity"]);
const HAN_SCRIPT_PATTERN = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u;

function localeFieldValuePresent(record, field) {
  const value = record?.[field];
  return field === "tags"
    ? Array.isArray(value) && value.length > 0
    : typeof value === "string" && value.trim().length > 0;
}

function inexactKoreanFields(record) {
  return LOCALE_FIELDS.filter((field) => {
    const status = record?.sourceFieldStatus?.[field];
    const present = localeFieldValuePresent(record, field);
    if (status === "not-present") return present;
    if (status !== "exact" || !present) return true;
    const value = field === "tags" ? record.tags.join("\n") : record[field];
    return HAN_SCRIPT_PATTERN.test(value);
  });
}

function currentKoreanLocaleBlockers(dataset) {
  return Object.entries(dataset?.catalog ?? {}).flatMap(([category, items]) => (
    (items ?? []).flatMap((item) => {
      const record = item?.tlidbText?.ko;
      const fields = record?.sourceUrl?.startsWith("https://tlidb.com/ko/")
        ? inexactKoreanFields(record)
        : ["sourceUrl"];
      return fields.length
        ? [{
            category,
            itemId: item.id,
            locale: "ko",
            fields,
            reason: "current TLIDB Korean fields are not exact locale text",
          }]
        : [];
    })
  ));
}

function mergeBlockers(...groups) {
  const merged = new Map();
  for (const blocker of groups.flat()) {
    const key = JSON.stringify([
      blocker?.category,
      blocker?.itemId,
      blocker?.locale,
      blocker?.fields,
      blocker?.reason,
    ]);
    if (!merged.has(key)) merged.set(key, blocker);
  }
  return [...merged.values()];
}

function assertActiveSs13Catalog(dataset) {
  const metadata = dataset?.metadata;
  const finalization = metadata?.ss13FlatFinalization;
  if (
    metadata?.tlidbSeason !== 13
    || metadata?.activeSeason !== "SS13"
    || metadata?.seasonTrack !== "tlidb_ss13_live"
    || finalization?.targetSeason !== 13
  ) {
    throw new Error("Current TLIDB SS13 flat catalog identity is required");
  }
}

assertActiveSs13Catalog(TLIDB_CATALOG);

export function deriveActiveSs13CatalogMetadata(dataset) {
  assertActiveSs13Catalog(dataset);
  const metadata = dataset.metadata;
  const finalization = metadata.ss13FlatFinalization;
  const koreanLocaleBlockers = currentKoreanLocaleBlockers(dataset);
  const blockers = mergeBlockers(finalization.blockers ?? [], koreanLocaleBlockers);
  const koTextApplicationComplete = finalization.koTextApplicationComplete === true
    && koreanLocaleBlockers.length === 0;
  const applicationReady = finalization.applicationReady === true && blockers.length === 0;
  const verificationComplete = finalization.verificationComplete === true
    && applicationReady
    && koTextApplicationComplete;
  return Object.freeze({
    ...metadata,
    applicationVerificationComplete: metadata.applicationVerificationComplete === true
      && verificationComplete,
    ss13FlatFinalization: Object.freeze({
      ...finalization,
      koreanLocaleBlockers: Object.freeze(koreanLocaleBlockers),
      blockers: Object.freeze(blockers),
      koTextApplicationComplete,
      applicationReady,
      verificationComplete,
    }),
  });
}

const ACTIVE_CATALOG_METADATA = deriveActiveSs13CatalogMetadata(TLIDB_CATALOG);

const ALL_FILTER = "__all__";

const GEAR_PREFIX_TAGS = [
  ["helmet-", ["helmet"]],
  ["chest-", ["bodyArmor"]],
  ["gloves-", ["gloves"]],
  ["boots-", ["boots"]],
  ["shield-", ["offHand"]],
  ["trinket-necklace", ["amulet"]],
  ["trinket-ring", ["ring"]],
  ["trinket-spirit-ring", ["ring"]],
  ["trinket-belt", ["belt"]],
  ["weapon-claw", ["mainHand", "oneHand", "claw"]],
  ["weapon-dagger", ["mainHand", "oneHand", "dagger"]],
  ["weapon-one-handed-sword", ["mainHand", "oneHand", "oneHandSword"]],
  ["weapon-one-handed-hammer", ["mainHand", "oneHand", "oneHandMace"]],
  ["weapon-one-handed-axe", ["mainHand", "oneHand", "oneHandAxe"]],
  ["weapon-wand", ["mainHand", "oneHand", "wand"]],
  ["weapon-scepter", ["mainHand", "oneHand", "wand"]],
  ["weapon-pistol", ["mainHand", "oneHand"]],
  ["weapon-cane", ["mainHand", "staff"]],
  ["weapon-rod", ["mainHand", "staff"]],
  ["weapon-cudgel", ["mainHand", "oneHand", "oneHandMace"]],
  ["weapon-two-handed-sword", ["mainHand", "twoHand", "twoHandSword"]],
  ["weapon-two-handed-hammer", ["mainHand", "twoHand", "twoHandMace"]],
  ["weapon-two-handed-axe", ["mainHand", "twoHand", "twoHandAxe"]],
  ["weapon-tin-staff", ["mainHand", "twoHand", "staff"]],
  ["weapon-bow", ["mainHand", "twoHand", "bow"]],
  ["weapon-crossbow", ["mainHand", "twoHand", "crossbow"]],
  ["weapon-musket", ["mainHand", "twoHand", "cannon"]],
  ["weapon-fire-cannon", ["mainHand", "twoHand", "cannon"]],
];

const GEAR_SLOT_FILTERS = {
  mainHand: "mainHand",
  offHand: "offHand",
  helmet: "helmet",
  bodyArmor: "bodyArmor",
  amulet: "amulet",
  gloves: "gloves",
  belt: "belt",
  leftRing: "ring",
  rightRing: "ring",
  boots: "boots",
};

export const GEAR_SLOT_KEYS = Object.freeze([
  "mainHand",
  "offHand",
  "helmet",
  "bodyArmor",
  "amulet",
  "gloves",
  "belt",
  "leftRing",
  "rightRing",
  "boots",
]);

const GRAFT_SLOT_TAGS = [
  ["vorax-limb-3a-hands", ["gloves"]],
  ["vorax-limb-3a-legs", ["boots"]],
  ["vorax-limb-3a-chest", ["bodyArmor"]],
  ["vorax-limb-3a-head", ["helmet"]],
  ["vorax-limb-3a-neck", ["amulet"]],
  ["vorax-limb-3a-waist", ["belt"]],
  ["vorax-limb-3a-digits", ["ring"]],
];

function getGearAffixPrefix(item) {
  return item.craftAffixes?.[0]?.affixId?.split(":")[0] ?? "";
}

function inferGearTags(item) {
  const tags = new Set(item.tags ?? []);
  const prefix = getGearAffixPrefix(item);
  const matched = GEAR_PREFIX_TAGS.find(([candidate]) => prefix.startsWith(candidate));
  const graftSlot = GRAFT_SLOT_TAGS.find(([candidate]) => item.id.includes(candidate));

  if (matched) {
    matched[1].forEach((tag) => tags.add(tag));
  }
  if (graftSlot) {
    graftSlot[1].forEach((tag) => tags.add(tag));
  }

  return [...tags];
}

function normalizeCatalogItem(categoryId, item) {
  const currentValueItem = applySs13SkillValueAuthority(categoryId, item);
  if (categoryId !== "gear") return currentValueItem;

  return {
    ...currentValueItem,
    tags: inferGearTags(currentValueItem),
  };
}

export const CATEGORY_DEFS = [
  {
    id: "lobby",
    maxSelections: 0,
  },
  {
    id: "gear",
    maxSelections: 10,
  },
  {
    id: "skills",
    maxSelections: 9,
  },
  {
    id: "supports",
    maxSelections: 45,
  },
  {
    id: "hero",
    maxSelections: 1,
  },
  {
    id: "heroMemory",
    maxSelections: 6,
  },
  {
    id: "talents",
    maxSelections: 12,
  },
  {
    id: "spirits",
    maxSelections: 3,
  },
  {
    id: "slates",
    maxSelections: 36,
  },
  {
    id: "destiny",
    maxSelections: 13,
  },
];

export const CATALOG = Object.fromEntries(
  CATEGORY_DEFS.filter((category) => category.id !== "lobby").map((category) => [
    category.id,
    (TLIDB_CATALOG.catalog[category.id] ?? []).map((item) => normalizeCatalogItem(category.id, item)),
  ]),
);

export const CATALOG_METADATA = ACTIVE_CATALOG_METADATA;

export function getSpecialDivinitySlateItems() {
  return CATALOG.gear.filter((item) => (
    item.sourceKind === "divinity-slate" || item.appTags?.includes("divinity-slate")
  ));
}

export function getCategory(id) {
  return CATEGORY_DEFS.find((category) => category.id === id);
}

export function getCatalogItems(categoryId) {
  return CATALOG[categoryId] ?? [];
}

export function getGearFilterForSlot(slotKey) {
  return GEAR_SLOT_FILTERS[slotKey] ?? "all";
}

export function getGearItemsForFilter(filter = "all") {
  const gearItems = getCatalogItems("gear").filter((item) => (
    item.sourceKind !== "divinity-slate" && !item.appTags?.includes("divinity-slate")
  ));
  if (filter === "all" || filter === ALL_FILTER) return gearItems;
  if (filter === "offHand") {
    return gearItems.filter((item) => item.tags?.includes("offHand") || item.tags?.includes("oneHand"));
  }
  return gearItems.filter((item) => item.tags?.includes(filter));
}

export function findItemById(itemId) {
  for (const [categoryId, items] of Object.entries(CATALOG)) {
    const item = items.find((candidate) => candidate.id === itemId);
    if (item) {
      return { ...item, categoryId };
    }
  }

  // Identity lookup is shared by persistence. These entries never join CATALOG,
  // which remains the historical SS13 selection and calculation authority.
  return SS14_LOG_COMPLETION.identities.find(item => item.id === itemId)
    ?? SS14_CURRENT_DATABASE.identities.find(item => item.id === itemId);
}

export function getAllItems() {
  return Object.entries(CATALOG).flatMap(([categoryId, items]) =>
    items.map((item) => ({ ...item, categoryId })),
  );
}
