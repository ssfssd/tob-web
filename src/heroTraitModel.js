function cloneJson(value) {
  if (Array.isArray(value)) {
    return value.map(cloneJson);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneJson(entry)]),
    );
  }

  return value;
}

function decodeUrlPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function sourceSlug(value) {
  if (typeof value !== "string") return "";

  const path = value.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  const slug = path.slice(path.lastIndexOf("/") + 1);
  return decodeUrlPart(slug).trim().toLowerCase();
}

function normalizedIdentifier(value) {
  return typeof value === "string" ? decodeUrlPart(value).trim().toLowerCase() : "";
}

function normalizeLevel(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 90;
  return Math.max(1, Math.min(100, Math.round(numeric)));
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];

  for (const value of Array.isArray(values) ? values : []) {
    if (typeof value !== "string" || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }

  return result;
}

function choiceTierMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return new Map();
  return new Map(Object.entries(value).filter(([, tier]) => Number.isInteger(tier)));
}

function optionSourceText(option) {
  if (typeof option?.name === "string" && option.name) return option.name;
  if (typeof option?.description === "string" && option.description) return option.description;
  return typeof option?.id === "string" ? option.id : "";
}

function createSelectionKey(branchSourcePath, requiredLevel, sourceOrdinal, option) {
  return [
    "hero-trait",
    branchSourcePath,
    requiredLevel,
    sourceOrdinal,
    optionSourceText(option),
  ].map((part) => encodeURIComponent(String(part))).join(":");
}

function normalizeOption(option, branchSourcePath, requiredLevel, sourceOrdinal) {
  const sourceId = option.id;
  const selectionKey = createSelectionKey(
    branchSourcePath,
    requiredLevel,
    sourceOrdinal,
    option,
  );

  return {
    ...cloneJson(option),
    id: selectionKey,
    selectionKey,
    sourceId,
    sourceOrdinal,
  };
}

function resolveChoiceId(options, requestedChoiceId) {
  if (typeof requestedChoiceId !== "string") return null;

  const directMatch = options.find((option) => option.id === requestedChoiceId);
  if (directMatch) return directMatch.id;

  // Before runtime keys existed, duplicate source IDs resolved through a Map and
  // therefore selected the final matching option. Keep that behavior for saves
  // containing legacy source IDs.
  for (let index = options.length - 1; index >= 0; index -= 1) {
    if (options[index].sourceId === requestedChoiceId) return options[index].id;
  }

  return null;
}

function normalizeGroupOptions(group, options) {
  const usedSelectionKeys = new Set();

  return (Array.isArray(group?.options) ? group.options : []).map((rawOption) => {
    const candidates = options.filter((option) => (
      option.sourceId === rawOption?.id && !usedSelectionKeys.has(option.id)
    ));
    const exactMatch = candidates.find((option) => (
      option.name === rawOption?.name && option.description === rawOption?.description
    ));
    const match = exactMatch ?? candidates[0] ?? null;
    if (match) usedSelectionKeys.add(match.id);
    return match;
  }).filter(Boolean);
}

function normalizeSelectionGroup(group, stageId, options) {
  const defaultSelectedOptionId = resolveChoiceId(options, group?.defaultSelectedOptionId)
    ?? options[0]?.id
    ?? null;

  return {
    id: typeof group?.id === "string" && group.id ? group.id : `${stageId}-single`,
    selectionMode: group?.selectionMode === "fixed" ? "fixed" : "single",
    previewStyle: typeof group?.previewStyle === "string" ? group.previewStyle : "single",
    defaultSelectedOptionId,
    options,
  };
}

function normalizeStage(rawStage, branchId, branchSourcePath) {
  const requiredLevel = normalizeLevel(rawStage?.requiredLevel);
  const id = `${branchId}-lv${requiredLevel}`;
  const options = (Array.isArray(rawStage?.options) ? rawStage.options : [])
    .map((option, sourceOrdinal) => (
      typeof option?.id === "string"
        ? normalizeOption(option, branchSourcePath, requiredLevel, sourceOrdinal)
        : null
    ))
    .filter(Boolean);
  const hasExplicitSelectionGroups = Array.isArray(rawStage?.selectionGroups)
    && rawStage.selectionGroups.length > 0;
  const rawGroups = hasExplicitSelectionGroups
    ? rawStage.selectionGroups
    : [
        {
          id: `${id}-single`,
          selectionMode: "single",
          previewStyle: "single",
          defaultSelectedOptionId: rawStage?.defaultSelectedOptionId,
          options,
        },
      ];
  const selectionGroups = rawGroups
    .map((group) => normalizeSelectionGroup(
      group,
      id,
      hasExplicitSelectionGroups ? normalizeGroupOptions(group, options) : options,
    ))
    .filter((group) => group.options.length > 0);

  return {
    id,
    localeRef: typeof rawStage?.localeRef === "string" ? rawStage.localeRef : "",
    level: typeof rawStage?.level === "string" ? rawStage.level : `Lv.${requiredLevel}`,
    requiredLevel,
    defaultSelectedOptionId: resolveChoiceId(options, rawStage?.defaultSelectedOptionId)
      ?? selectionGroups[0]?.defaultSelectedOptionId
      ?? null,
    options,
    hasExplicitSelectionGroups,
    selectionGroups,
  };
}

function flatHeroesBySourceSlug(flatHeroes) {
  const result = new Map();

  for (const hero of Array.isArray(flatHeroes) ? flatHeroes : []) {
    const slug = sourceSlug(hero?.sourceUrl);
    if (slug && !result.has(slug)) result.set(slug, hero);
  }

  return result;
}

function normalizeBranch(rawBranch, flatBySlug) {
  const rawId = typeof rawBranch?.id === "string" ? rawBranch.id : "";
  const sourcePath = typeof rawBranch?.sourcePath === "string" ? rawBranch.sourcePath : "";
  const pathSlug = sourceSlug(sourcePath);
  const sourceUrlSlug = sourceSlug(rawBranch?.sourceUrl);
  const flatHero = flatBySlug.get(pathSlug) ?? flatBySlug.get(sourceUrlSlug) ?? null;

  return {
    rawId,
    localeRef: typeof rawBranch?.localeRef === "string" ? rawBranch.localeRef : "",
    sourcePath,
    sourceUrl: typeof rawBranch?.sourceUrl === "string" ? rawBranch.sourceUrl : "",
    flatHeroId: typeof flatHero?.id === "string" ? flatHero.id : null,
    name: typeof rawBranch?.name === "string" ? rawBranch.name : "",
    title: typeof rawBranch?.title === "string" ? rawBranch.title : "",
    description: typeof rawBranch?.description === "string" ? rawBranch.description : "",
    level: normalizeLevel(rawBranch?.level),
    portraitUrl: typeof rawBranch?.portraitUrl === "string" ? rawBranch.portraitUrl : "",
    portraitLocalPath: typeof rawBranch?.portraitLocalPath === "string"
      ? rawBranch.portraitLocalPath
      : "",
    stages: (Array.isArray(rawBranch?.traitStages) ? rawBranch.traitStages : [])
      .map((stage) => normalizeStage(stage, rawId, sourcePath)),
  };
}

export function createHeroTraitModel(heroCatalog, flatHeroes = []) {
  const flatBySlug = flatHeroesBySourceSlug(flatHeroes);

  return {
    sourceUrl: typeof heroCatalog?.sourceUrl === "string" ? heroCatalog.sourceUrl : "",
    crawledAt: typeof heroCatalog?.crawledAt === "string" ? heroCatalog.crawledAt : "",
    branches: (Array.isArray(heroCatalog?.heroes) ? heroCatalog.heroes : [])
      .map((branch) => normalizeBranch(branch, flatBySlug)),
  };
}

export function findHeroTraitBranch(model, identifier) {
  const normalized = normalizedIdentifier(identifier);
  const slug = sourceSlug(identifier);
  if (!normalized) return null;

  return (Array.isArray(model?.branches) ? model.branches : []).find((branch) => (
    normalizedIdentifier(branch.rawId) === normalized
      || normalizedIdentifier(branch.flatHeroId) === normalized
      || sourceSlug(branch.sourcePath) === slug
      || sourceSlug(branch.sourceUrl) === slug
  )) ?? null;
}

function canonicalBranchId(branch) {
  return branch.flatHeroId ?? branch.rawId;
}

function selectedChoicesByStage(selections) {
  const result = new Map();

  for (const selection of Array.isArray(selections) ? selections : []) {
    if (typeof selection?.stageId !== "string") continue;
    const accumulated = result.get(selection.stageId) ?? {
      choiceIds: [],
      choiceTiers: new Map(),
    };
    const incomingChoiceIds = uniqueStrings(selection.choiceIds);
    accumulated.choiceIds = uniqueStrings([
      ...accumulated.choiceIds,
      ...incomingChoiceIds,
    ]);
    for (const [choiceId, tier] of choiceTierMap(selection.choiceTiers)) {
      if (!incomingChoiceIds.includes(choiceId)) continue;
      accumulated.choiceTiers.set(choiceId, tier);
    }
    result.set(selection.stageId, accumulated);
  }

  return result;
}

function selectedTierForGroup(group, requested, selectedChoiceId) {
  const direct = requested.choiceTiers.get(selectedChoiceId);
  if (Number.isInteger(direct)) return direct;

  for (const requestedChoiceId of requested.choiceIds) {
    if (resolveChoiceId(group.options, requestedChoiceId) !== selectedChoiceId) continue;
    const tier = requested.choiceTiers.get(requestedChoiceId);
    if (Number.isInteger(tier)) return tier;
  }
  return null;
}

function selectedChoiceForGroup(group, requestedChoices) {
  if (group.selectionMode === "fixed") {
    return group.defaultSelectedOptionId;
  }

  for (const requestedChoice of requestedChoices) {
    const resolvedChoice = resolveChoiceId(group.options, requestedChoice);
    if (resolvedChoice) return resolvedChoice;
  }

  return group.defaultSelectedOptionId;
}

function normalizeSelections(branch, level, selections) {
  const requestedByStage = selectedChoicesByStage(selections);

  return branch.stages
    .filter((stage) => stage.requiredLevel <= level)
    .map((stage) => {
      const requested = requestedByStage.get(stage.id) ?? {
        choiceIds: [],
        choiceTiers: new Map(),
      };
      const choiceIds = uniqueStrings(
        stage.selectionGroups
          .map((group) => selectedChoiceForGroup(group, requested.choiceIds))
          .filter(Boolean),
      );
      const choiceTiers = Object.fromEntries(stage.selectionGroups
        .map((group) => {
          const choiceId = choiceIds.find((candidate) => (
            group.options.some((option) => option.id === candidate)
          ));
          const tier = choiceId ? selectedTierForGroup(group, requested, choiceId) : null;
          return Number.isInteger(tier) ? [choiceId, tier] : null;
        })
        .filter(Boolean));

      return {
        stageId: stage.id,
        choiceIds,
        ...(Object.keys(choiceTiers).length > 0 ? { choiceTiers } : {}),
      };
    })
    .filter((selection) => selection.choiceIds.length > 0);
}

export function createDefaultHeroTraitState(model, branchIdentifier, level = 90) {
  const branch = findHeroTraitBranch(model, branchIdentifier);
  if (!branch) throw new RangeError(`Unknown hero trait branch: ${branchIdentifier}`);

  const normalizedLevel = normalizeLevel(level);
  return {
    branchId: canonicalBranchId(branch),
    level: normalizedLevel,
    traitSelections: normalizeSelections(branch, normalizedLevel, []),
  };
}

export function normalizeHeroTraitState(model, state) {
  const level = normalizeLevel(state?.level);
  const branch = findHeroTraitBranch(model, state?.branchId);

  if (!branch) {
    return {
      ...(state && typeof state === "object" ? state : {}),
      branchId: null,
      level,
      traitSelections: [],
    };
  }

  return {
    ...state,
    branchId: canonicalBranchId(branch),
    level,
    traitSelections: normalizeSelections(branch, level, state?.traitSelections),
  };
}

export function changeHeroTraitBranch(model, state, branchIdentifier) {
  const next = createDefaultHeroTraitState(model, branchIdentifier, state?.level);
  return {
    ...(state && typeof state === "object" ? state : {}),
    ...next,
  };
}

export function updateHeroTraitChoice(model, state, update) {
  const normalized = normalizeHeroTraitState(model, state);
  const branch = findHeroTraitBranch(model, normalized.branchId);
  if (!branch) return normalized;

  const stage = branch.stages.find((candidate) => candidate.id === update?.stageId);
  if (!stage || stage.requiredLevel > normalized.level) return normalized;

  const group = stage.selectionGroups.find((candidate) => candidate.id === update?.groupId);
  if (!group || group.selectionMode === "fixed") return normalized;
  const choiceId = resolveChoiceId(group.options, update?.choiceId);
  if (!choiceId) return normalized;

  const current = normalized.traitSelections.find((selection) => selection.stageId === stage.id);
  const otherGroupChoices = stage.selectionGroups
    .filter((candidate) => candidate.id !== group.id)
    .map((candidate) => selectedChoiceForGroup(candidate, current?.choiceIds ?? []))
    .filter(Boolean);
  const requestedChoices = [...otherGroupChoices, choiceId];
  const traitSelections = normalizeSelections(
    branch,
    normalized.level,
    normalized.traitSelections.map((selection) => (
      selection.stageId === stage.id
        ? { ...selection, choiceIds: requestedChoices }
        : selection
    )),
  );

  return { ...normalized, traitSelections };
}

export function getHeroTraitStageView(model, state) {
  const normalized = normalizeHeroTraitState(model, state);
  const branch = findHeroTraitBranch(model, normalized.branchId);
  if (!branch) return [];

  const selectedByStage = new Map(
    normalized.traitSelections.map((selection) => [selection.stageId, selection]),
  );

  return branch.stages.map((stage) => {
    const selected = selectedByStage.get(stage.id);
    const selectedChoiceIds = selected?.choiceIds ?? [];
    const selectedChoiceTiers = selected?.choiceTiers ?? {};
    return {
      ...stage,
      locked: stage.requiredLevel > normalized.level,
      selectedChoiceIds: [...selectedChoiceIds],
      selectionGroups: stage.selectionGroups.map((group) => ({
        ...group,
        selectedChoiceId: selectedChoicesByStage([
          { stageId: stage.id, choiceIds: selectedChoiceIds },
        ]).get(stage.id)?.choiceIds.find((choiceId) => (
          group.options.some((option) => option.id === choiceId)
        )) ?? null,
        selectedChoiceTier: group.options
          .map((option) => selectedChoiceTiers[option.id])
          .find(Number.isInteger) ?? null,
      })),
    };
  });
}
