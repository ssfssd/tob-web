import { SKILL_MAX_LEVEL, createSkillRuntimeModel } from "./skillRuntimeModel.js";

const SS13_SKILL_ID_PREFIX = "skills-tlidb-ss13-";
const SS13_SUPPORT_ID_PREFIX = "supports-tlidb-ss13-";
const EXPECTED_SS13_DISPLAY_ONLY_COUNTS = Object.freeze({ skills: 8, supports: 18 });
const EDITOR_LOCALES = Object.freeze(["ko", "en"]);
const NUMERIC_TOKEN_PATTERN = /[+-]?\(?-?\d+(?:\.\d+)?(?:[–~～-]-?\d+(?:\.\d+)?)?\)?/gu;

function cloneJson(value) {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneJson(entry)]));
  }
  return value;
}

function assertExactSs13KoItem(item, category) {
  const ko = item?.tlidbText?.ko;
  if (
    item?.sourceSeason !== "SS13"
    || !item?.sourceUrl?.startsWith("https://tlidb.com/cn/")
    || ko?.sourcePageVersion !== "SS13"
    || ko?.sourceFieldStatus?.name !== "exact"
    || ko?.sourceFieldStatus?.detail !== "exact"
    || ko?.sourceFieldStatus?.tags !== "exact"
    || typeof ko?.name !== "string"
    || !ko.name
  ) {
    throw new Error(`Verified TLIDB SS13 Korean ${category} text is required: ${item?.id ?? "unknown"}`);
  }
}

function displayOnlyItems(items, prefix, category) {
  const result = (Array.isArray(items) ? items : []).filter(({ id }) => id?.startsWith(prefix));
  if (result.length !== EXPECTED_SS13_DISPLAY_ONLY_COUNTS[category]) {
    throw new Error(
      `TLIDB SS13 ${category} display-only count mismatch: ${result.length}`,
    );
  }
  result.forEach((item) => assertExactSs13KoItem(item, category));
  return result;
}

function displayOnlyRecord(item, kind, role) {
  const sourceTags = Array.isArray(item.tags) ? [...item.tags] : [];
  return {
    id: item.id,
    flatItemId: item.id,
    kind,
    role,
    name: item.name,
    nameEn: item.tlidbText?.en?.name ?? "",
    url: item.sourceUrl,
    iconUrl: item.iconUrl ?? "",
    localIconPath: item.localIconPath ?? "",
    tags: sourceTags,
    tagsCn: sourceTags,
    displayTags: sourceTags,
    tlidbText: cloneJson(item.tlidbText),
    description: item.detail ?? item.summary ?? "",
    descriptionEn: item.tlidbText?.en?.detail ?? item.tlidbText?.en?.summary ?? "",
    effects: [],
    rawTags: [],
    compatibilityTags: [],
    hostCapabilities: {
      canDealDamage: false,
      canHit: false,
      canAilmentOrDot: false,
      canBeCatalyzed: false,
    },
    calculationSupported: false,
    calculationUnsupportedReason: "ss13-display-only-no-verified-runtime-structure",
    runtimeSupport: "display-only",
    raw: {
      source: "tlidb-ss13-flat-authority",
      tlidbStableKey: item.tlidbStableKey ?? null,
      displayOnly: true,
      calculationSupported: false,
    },
  };
}

function displayOnlySkillRecord(item) {
  return displayOnlyRecord(item, "active", "active");
}

function supportKind(item) {
  const source = decodeURIComponent(String(item?.sourceUrl ?? ""));
  if (source.includes("(Magnificent)")) return "magnificent";
  if (source.includes("(Noble)")) return "noble";
  return "regular";
}

function displayOnlySupportRecord(item) {
  const kind = supportKind(item);
  return {
    ...displayOnlyRecord(item, `support-${kind}`, "support"),
    supportKind: kind,
    compatibleTags: [],
    excludedTags: [],
    oneOfTags: [],
    maxLevel: SKILL_MAX_LEVEL,
    requiredSlot: null,
    supportCompatibility: null,
    grantedHostCompatibilityTags: [],
    removedHostCompatibilityTags: [],
    specialType: "",
    tierTable: [],
    editorConfig: { kind: "basic_support", numeric_controls: [] },
  };
}

function comparableGameText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\s,，.。;；:：<>]/gu, "")
    .trim();
}

function comparableNumericTemplate(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(NUMERIC_TOKEN_PATTERN, "#")
    .replace(/[\s,，.。;；:：<>%％()（）+\-–~～]/gu, "")
    .replace(/#+/gu, "#")
    .trim();
}

function semanticGameText(value) {
  return comparableNumericTemplate(value).replace(/#/gu, "");
}

function bigrams(value) {
  const text = String(value ?? "");
  if (text.length < 2) return text ? [text] : [];
  return Array.from({ length: text.length - 1 }, (_, index) => text.slice(index, index + 2));
}

function diceSimilarity(left, right) {
  const leftBigrams = bigrams(left);
  const rightBigrams = bigrams(right);
  if (!leftBigrams.length || !rightBigrams.length) return 0;
  const remaining = new Map();
  for (const value of leftBigrams) remaining.set(value, (remaining.get(value) ?? 0) + 1);
  let intersection = 0;
  for (const value of rightBigrams) {
    if (!(remaining.get(value) > 0)) continue;
    intersection += 1;
    remaining.set(value, remaining.get(value) - 1);
  }
  return (2 * intersection) / (leftBigrams.length + rightBigrams.length);
}

function numericTokenValues(value) {
  return (String(value ?? "").match(NUMERIC_TOKEN_PATTERN) ?? []).map((token) => (
    (token.match(/-?\d+(?:\.\d+)?/gu) ?? []).map(Number)
  ));
}

function lineMatchesNumericPreset(line, numericPresets) {
  const ranges = Object.values(numericPresets ?? {}).filter((range) => (
    Array.isArray(range) && range.length >= 2 && range.every((value) => Number.isFinite(Number(value)))
  ));
  if (!ranges.length) return false;
  return numericTokenValues(line).some((values) => ranges.some((range) => (
    values.length === 2
    && Number(values[0]) === Number(range[0])
    && Number(values[1]) === Number(range[1])
  )));
}

function exactDetailLines(localePayload) {
  if (
    localePayload?.sourcePageVersion !== "SS13"
    || localePayload?.sourceFieldStatus?.detail !== "exact"
    || typeof localePayload?.detail !== "string"
  ) return [];
  return localePayload.detail.split(/\r?\n/gu);
}

function findAlignedDetailSpan(record, sourceText, numericPresets = {}) {
  const cnLines = exactDetailLines(record?.tlidbText?.cn);
  const comparableSource = comparableGameText(sourceText);
  if (!comparableSource || !cnLines.length) return null;
  const templateSource = comparableNumericTemplate(sourceText);
  for (const mode of ["exact", "template", "contained"]) {
    for (let start = 0; start < cnLines.length; start += 1) {
      for (let length = 1; length <= 6 && start + length <= cnLines.length; length += 1) {
        const spanText = cnLines.slice(start, start + length).join("");
        const comparableSpan = comparableGameText(spanText);
        const templateSpan = comparableNumericTemplate(spanText);
        if (mode === "exact" && comparableSpan === comparableSource) {
          return { start, length, alignmentMethod: "exact-source-span" };
        }
        if (mode === "template" && templateSpan === templateSource) {
          return { start, length, alignmentMethod: "exact-numeric-template-span" };
        }
        if (
          mode === "contained"
          && Math.min(templateSpan.length, templateSource.length) >= 4
          && (templateSpan.includes(templateSource) || templateSource.includes(templateSpan))
        ) return { start, length, alignmentMethod: "unique-contained-template-span" };
      }
    }
  }
  const semanticSource = semanticGameText(sourceText);
  const candidates = cnLines.slice(Math.min(3, cnLines.length)).map((line, offset) => ({
    start: offset + Math.min(3, cnLines.length),
    length: 1,
    score: Math.min(
      1,
      diceSimilarity(semanticSource, semanticGameText(line))
        + (lineMatchesNumericPreset(line, numericPresets) ? 0.15 : 0),
    ),
  })).sort((left, right) => right.score - left.score || left.start - right.start);
  const [best, second] = candidates;
  if (best?.score >= 0.38 && best.score - (second?.score ?? 0) >= 0.05) {
    return {
      start: best.start,
      length: best.length,
      alignmentMethod: "unique-semantic-numeric-line",
      alignmentScore: Number(best.score.toFixed(6)),
    };
  }
  return null;
}

function replaceStructuralNumbers(template, sourceText, targetText) {
  const sourceTokens = String(sourceText ?? "").match(NUMERIC_TOKEN_PATTERN) ?? [];
  const targetTokens = String(targetText ?? "").match(NUMERIC_TOKEN_PATTERN) ?? [];
  const templateTokens = String(template ?? "").match(NUMERIC_TOKEN_PATTERN) ?? [];
  if (!sourceTokens.length || sourceTokens.length !== targetTokens.length || sourceTokens.length !== templateTokens.length) {
    return String(template ?? "");
  }
  let index = 0;
  return String(template).replace(NUMERIC_TOKEN_PATTERN, () => targetTokens[index++]);
}

function tlidbEditorLocaleText(record, sourceText, tierTexts = {}, numericPresets = {}) {
  const span = findAlignedDetailSpan(record, sourceText, numericPresets);
  const cnLines = exactDetailLines(record?.tlidbText?.cn);
  if (!cnLines.length || !span) return null;
  const sourceTemplate = cnLines.slice(span.start, span.start + span.length).join("\n");
  const locales = Object.fromEntries(EDITOR_LOCALES.flatMap((locale) => {
    const lines = exactDetailLines(record?.tlidbText?.[locale]);
    if (!lines.length || lines.length < span.start + span.length) return [];
    const template = lines.slice(span.start, span.start + span.length).join("\n");
    const tiers = Object.fromEntries(Object.entries(tierTexts).map(([tier, targetText]) => [
      tier,
      replaceStructuralNumbers(template, sourceTemplate, targetText),
    ]));
    return [[locale, { template, tiers }]];
  }));
  return {
    localeAuthority: "tlidb-current-ss13-exact-detail-template",
    numericAuthority: "91tob-structural-unverified",
    mappingAuthority: "aligned-current-detail-span",
    alignmentMethod: span.alignmentMethod,
    sourceLineSpan: { start: span.start, length: span.length },
    ...(span.alignmentScore ? { alignmentScore: span.alignmentScore } : {}),
    locales,
  };
}

function localizedSupportEditorRecord(record) {
  const editor = record?.editorConfig;
  if (!editor || editor.kind === "basic_support") return record;
  const clauses = (editor.clauses ?? []).map((clause) => ({
    ...clause,
    tlidbLocaleText: tlidbEditorLocaleText(record, clause.description, clause.tier_descriptions),
  }));
  const numericControls = (editor.numeric_controls ?? []).map((control) => ({
    ...control,
    tlidbLocaleText: tlidbEditorLocaleText(
      record,
      control.description || control.label,
      control.activation_medium_tier_descriptions ?? {},
      control.activation_medium_tier_range_presets ?? control.tier_range_presets ?? {},
    ),
  }));
  return {
    ...record,
    editorConfig: {
      ...editor,
      clauses,
      numeric_controls: numericControls,
      localeAuthority: "tlidb-current-ss13-exact-detail-template",
      numericAuthority: "91tob-structural-unverified",
      calculationSupported: false,
    },
  };
}

function reconcileRecords(records, authorityIds, displayItems, createRecord, acceptsItem = () => true) {
  const displayById = new Map(displayItems.map((item) => [item.id, item]));
  const seen = new Set();
  const result = [];

  for (const record of Array.isArray(records) ? records : []) {
    const flatItemId = record?.flatItemId;
    if (!flatItemId || !authorityIds.has(flatItemId) || seen.has(flatItemId)) continue;
    const displayItem = displayById.get(flatItemId);
    if (displayItem) {
      if (!acceptsItem(displayItem)) continue;
      result.push(createRecord(displayItem));
    } else {
      result.push(record);
    }
    seen.add(flatItemId);
  }

  for (const item of displayItems) {
    if (!seen.has(item.id) && acceptsItem(item)) {
      result.push(createRecord(item));
      seen.add(item.id);
    }
  }
  return result;
}

export function getActiveSkillRuntimeEditorLocaleText(field, locale = "ko", tier = null) {
  const localized = field?.tlidbLocaleText?.locales?.[locale];
  if (!localized) return "";
  return (tier ? localized.tiers?.[tier] : "") || localized.template || "";
}

export function createActiveSkillRuntimeModel(datasets, catalogs = {}) {
  const skills = Array.isArray(catalogs.skills) ? catalogs.skills : [];
  const supports = Array.isArray(catalogs.supports) ? catalogs.supports : [];
  const skillAuthorityIds = new Set(skills.map(({ id }) => id).filter(Boolean));
  const supportAuthorityIds = new Set(supports.map(({ id }) => id).filter(Boolean));
  const displaySkills = displayOnlyItems(skills, SS13_SKILL_ID_PREFIX, "skills");
  const displaySupports = displayOnlyItems(supports, SS13_SUPPORT_ID_PREFIX, "supports");
  const model = createSkillRuntimeModel(datasets, catalogs);

  const active = reconcileRecords(
    model.active,
    skillAuthorityIds,
    displaySkills,
    displayOnlySkillRecord,
  );
  const passive = reconcileRecords(
    model.passive,
    skillAuthorityIds,
    [],
    displayOnlySkillRecord,
  );
  const reconciledSupports = Object.fromEntries(
    Object.entries(model.supports).map(([kind, records]) => [
      kind,
      reconcileRecords(
        records,
        supportAuthorityIds,
        displaySupports,
        displayOnlySupportRecord,
        (item) => supportKind(item) === kind,
      ).map(localizedSupportEditorRecord),
    ]),
  );
  const allSupports = [
    ...reconciledSupports.activation,
    ...reconciledSupports.magnificent,
    ...reconciledSupports.noble,
    ...reconciledSupports.regular,
    ...reconciledSupports.modular,
  ];

  return {
    ...model,
    active,
    passive,
    supports: reconciledSupports,
    allSupports,
    activeFlatAuthority: {
      season: "SS13",
      skillCount: skillAuthorityIds.size,
      supportCount: supportAuthorityIds.size,
      displayOnlySkillCount: displaySkills.length,
      displayOnlySupportCount: displaySupports.length,
      calculationSupport: "display-only-items-unsupported",
    },
  };
}
