import { loadActiveRuntimeCatalog } from "./activeRuntimeData.js";
import { attachActiveRuntimeDatasetLocaleRefs } from "./activeRuntimeLocaleData.js";
import {
  createDefaultHeroTraitState,
  createHeroTraitModel,
  findHeroTraitBranch,
  updateHeroTraitChoice,
} from "./heroTraitModel.js";
import { partitionHeroCatalogBySeason } from "./heroSeasonScope.js";
import { parseTlidbOtherTooltipCalculation } from "./tlidbOtherTooltipCalculation.js";

const TRACE_VERSION = "tlidb-hero-trait-projection-v1";
const SAFE_UNCONDITIONAL_LINE = /^[+-]\s*\d+(?:\.\d+)?\s*%\s*Movement Speed$/iu;
const SHA256 = /^[0-9a-f]{64}$/iu;
const CONFIGURATION_ONLY_SKILL_DAMAGE_STAGES = new Set(["licorice-note-lv1"]);

function freezeNested(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freezeNested));
  if (!value || typeof value !== "object") return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, freezeNested(entry)]),
  ));
}

function freezeResult(result) {
  return freezeNested(result);
}

function sourceIdForOption(option) {
  return String(option?.id ?? "").trim();
}

function blocker(reason, option = null, extra = {}) {
  return {
    type: "hero-trait",
    reason,
    sourceItemId: sourceIdForOption(option) || null,
    projectionEntryId: sourceIdForOption(option) || null,
    sourceText: "",
    ...extra,
  };
}

function pageReceipt(runtime, branch, locale) {
  const receipt = runtime?.sourcePagesBySourcePath?.[branch?.sourcePath]?.[locale];
  const canonicalCnUrl = runtime?.sourceUrlsBySourcePath?.[branch?.sourcePath];
  const expectedUrl = typeof canonicalCnUrl === "string"
    ? canonicalCnUrl.replace("https://tlidb.com/cn/", `https://tlidb.com/${locale}/`)
    : "";
  if (
    !receipt
    || receipt.url !== expectedUrl
    || !SHA256.test(receipt.sha256 ?? "")
  ) return null;
  return receipt;
}

function exactLocaleAuthority(runtime, branch, stage, option) {
  const record = runtime?.registry?.records?.[option?.localeRef];
  const locale = record?.locales?.en;
  const receipt = pageReceipt(runtime, branch, "en");
  if (
    record?.kind !== "hero-trait"
    || record.sourcePath !== branch.sourcePath
    || !locale
    || typeof locale.name !== "string"
    || !locale.name.trim()
    || typeof locale.description !== "string"
    || !locale.description.trim()
    || typeof locale.sourceRecordKey !== "string"
    || !locale.sourceRecordKey
    || locale.sourceRecordKey !== option.localeRef
    || locale.sourcePageRef !== `hero:${branch.sourcePath}#en`
    || Number(locale.requiredLevel) !== Number(stage.requiredLevel)
    || !receipt
  ) return null;
  return { record, locale, receipt };
}

function parserItem(line, authority) {
  return {
    categoryId: "hero",
    tlidbText: {
      en: {
        sourceUrl: authority.receipt.url,
        sourceRecordKey: authority.locale.sourceRecordKey,
        sourcePageSha256: authority.receipt.sha256,
        sourceFieldStatus: { detail: "exact" },
        sourcePageVersion: "SS13",
        activeBaselineSeason: "SS13",
        sourceSeasonEvidence: {
          verificationComplete: true,
          actualSeason: 13,
          sourcePageVersion: "SS13",
          activeBaselineSeason: "SS13",
        },
        detail: line,
      },
    },
  };
}

function safeParsedEffect(line, authority) {
  if (!SAFE_UNCONDITIONAL_LINE.test(line)) return null;
  const parsed = parseTlidbOtherTooltipCalculation(parserItem(line, authority));
  if (parsed.blockers.length !== 0 || parsed.effects.length !== 1) return null;
  const [effect] = parsed.effects;
  if (
    effect.sourceText !== line
    || effect.stat !== "movement_speed"
    || effect.operation !== "increase"
    || !Number.isFinite(Number(effect.value))
    || effect.roll
    || effect.condition
    || effect.conditionRequirements
    || effect.conditionMetadata
    || effect.per
  ) return null;
  return effect;
}

function stageSelectionIsCanonical(stage, selection) {
  if (!selection || !Array.isArray(selection.choiceIds)) return false;
  const choiceIds = selection.choiceIds;
  if (choiceIds.length !== stage.selectionGroups.length) return false;
  if (new Set(choiceIds).size !== choiceIds.length) return false;
  if (choiceIds.some((choiceId) => !stage.options.some((option) => option.id === choiceId))) {
    return false;
  }
  return stage.selectionGroups.every((group) => {
    const selected = choiceIds.filter((choiceId) => (
      group.options.some((option) => option.id === choiceId)
    ));
    if (group.selectionMode === "fixed") {
      return selected.length === 1 && selected[0] === group.defaultSelectedOptionId;
    }
    return selected.length === 1;
  });
}

function selectedStageMap(heroState) {
  const result = new Map();
  for (const selection of Array.isArray(heroState?.traitSelections)
    ? heroState.traitSelections
    : []) {
    if (typeof selection?.stageId !== "string" || result.has(selection.stageId)) {
      return null;
    }
    result.set(selection.stageId, selection);
  }
  return result;
}

function traceKey(option, authority, lineIndex, effect) {
  return [
    TRACE_VERSION,
    encodeURIComponent(option.id),
    encodeURIComponent(authority.locale.sourceRecordKey),
    `line-${lineIndex}`,
    encodeURIComponent(effect.stat),
    encodeURIComponent(effect.operation),
  ].join(":");
}

export async function loadTlidbHeroTraitCalculationRuntime(flatHeroes) {
  const activeCatalog = await loadActiveRuntimeCatalog();
  if (activeCatalog?.metadata?.activeSeason !== "SS13") {
    throw new Error("TLIDB SS13 hero trait runtime is required");
  }
  const heroOverlay = activeCatalog.metadata?.tlidbSs13RuntimeOverlay?.heroCatalog;
  if (
    heroOverlay?.verificationComplete !== true
    || Number(heroOverlay.targetSeason) !== 13
    || Number(heroOverlay.expectedHeroes) !== 26
  ) throw new Error("Verified TLIDB SS13 hero trait receipts are required");

  const attached = await attachActiveRuntimeDatasetLocaleRefs(
    "hero_catalog",
    activeCatalog.datasets.hero_catalog,
  );
  const seasonScope = partitionHeroCatalogBySeason(attached.dataset, flatHeroes);
  const model = createHeroTraitModel(
    seasonScope.activeHeroCatalog,
    seasonScope.activeFlatHeroes,
  );
  return Object.freeze({
    model,
    registry: attached.registry,
    sourceUrlsBySourcePath: heroOverlay.sourceUrlsBySourcePath,
    sourcePagesBySourcePath: heroOverlay.sourcePagesBySourcePath,
    activeSeason: activeCatalog.metadata.activeSeason,
  });
}

/**
 * Projects only exact, unconditional, single-value hero-trait lines. Every
 * selected line outside that deliberately narrow authority is retained as a
 * fail-closed blocker instead of being inferred from the structural dataset.
 */
export function adaptTlidbHeroTraitProjectionEffects(heroState, runtime) {
  const hasSelections = Array.isArray(heroState?.traitSelections)
    && heroState.traitSelections.length > 0;
  if (!hasSelections) {
    return freezeResult({
      active: false,
      effects: [],
      readyEffects: [],
      blockers: [],
      selectedOptions: [],
      accounting: {
        selectedOptionCount: 0,
        sourceLineCount: 0,
        readyEffectCount: 0,
        blockerCount: 0,
      },
    });
  }

  const blockers = [];
  const effects = [];
  const selectedOptions = [];
  let sourceLineCount = 0;
  const branch = findHeroTraitBranch(runtime?.model, heroState?.branchId);
  if (!branch || !branch.flatHeroId || heroState.branchId !== branch.flatHeroId) {
    blockers.push(blocker("hero-trait-canonical-branch-unresolved", null, {
      sourceId: String(heroState?.branchId ?? ""),
    }));
    return freezeResult({
      active: true,
      effects,
      readyEffects: effects,
      blockers,
      selectedOptions,
      accounting: {
        selectedOptionCount: 0,
        sourceLineCount,
        readyEffectCount: effects.length,
        blockerCount: blockers.length,
      },
    });
  }

  const selections = selectedStageMap(heroState);
  if (!selections) {
    blockers.push(blocker("hero-trait-stage-selection-duplicate"));
  } else {
    const level = Number(heroState?.level);
    const availableStages = branch.stages.filter((candidate) => candidate.requiredLevel <= level);
    const availableStageIds = new Set(availableStages.map(({ id }) => id));
    if (
      selections.size !== availableStages.length
      || [...selections.keys()].some((stageId) => !availableStageIds.has(stageId))
    ) {
      blockers.push(blocker("hero-trait-canonical-stage-set-invalid"));
    }
    for (const stage of availableStages) {
      const selection = selections.get(stage.id);
      if (!stageSelectionIsCanonical(stage, selection)) {
        blockers.push(blocker("hero-trait-canonical-stage-selection-invalid", null, {
          sourceId: stage.id,
          stageId: stage.id,
        }));
        continue;
      }

      for (const choiceId of selection.choiceIds) {
        const option = stage.options.find((candidate) => candidate.id === choiceId);
        const authority = exactLocaleAuthority(runtime, branch, stage, option);
        if (!authority) {
          blockers.push(blocker("hero-trait-current-ss13-receipt-unavailable", option, {
            stageId: stage.id,
          }));
          continue;
        }

        const optionBlockerStart = blockers.length;
        const optionEffectStart = effects.length;
        const lines = authority.locale.description
          .split(/\r?\n/u)
          .map((line) => line.trim())
          .filter(Boolean);
        sourceLineCount += lines.length;
        const safeCandidates = lines
          .map((line, lineIndex) => ({
            line,
            lineIndex,
            effect: safeParsedEffect(line, authority),
          }))
          .filter(({ effect }) => effect);
        const duplicateSafeLines = new Set(
          safeCandidates
            .filter(({ line }, index, candidates) => (
              candidates.some((candidate, candidateIndex) => (
                candidateIndex !== index && candidate.line === line
              ))
            ))
            .map(({ line }) => line),
        );

        for (const [lineIndex, line] of lines.entries()) {
          const safe = safeCandidates.find((candidate) => candidate.lineIndex === lineIndex);
          if (!safe || duplicateSafeLines.has(line)) {
            blockers.push(blocker(
              duplicateSafeLines.has(line)
                ? "hero-trait-duplicate-exact-effect-line"
                : "hero-trait-complex-or-conditional-effect-unmodeled",
              option,
              {
                stageId: stage.id,
                sourceText: line,
                sourceUrl: authority.receipt.url,
                sourceRecordKey: authority.locale.sourceRecordKey,
                sourcePageSha256: authority.receipt.sha256,
                sourceLineIndex: lineIndex,
                ...(CONFIGURATION_ONLY_SKILL_DAMAGE_STAGES.has(stage.id)
                  ? { skillDamageApplicability: "configuration-only" }
                  : {}),
              },
            ));
            continue;
          }

          const key = traceKey(option, authority, lineIndex, safe.effect);
          effects.push({
            ...safe.effect,
            scope: { actor: "self", skillTypes: ["all"] },
            categoryId: "hero",
            sourceItemId: option.id,
            sourceId: option.id,
            projectionEntryId: option.id,
            sourceLabel: authority.locale.name,
            sourceUrl: authority.receipt.url,
            sourceRecordKey: authority.locale.sourceRecordKey,
            sourcePageSha256: authority.receipt.sha256,
            sourceLineIndex: lineIndex,
            authorityTraceKey: key,
            traceKey: key,
            calculationReady: true,
          });
        }

        selectedOptions.push({
          sourceItemId: option.id,
          sourceId: option.id,
          projectionEntryId: option.id,
          sourceLabel: authority.locale.name,
          sourceUrl: authority.receipt.url,
          sourceRecordKey: authority.locale.sourceRecordKey,
          receipt: {
            sourcePageVersion: "SS13",
            sourcePageSha256: authority.receipt.sha256,
            sourceFieldStatus: "exact",
          },
          stageId: stage.id,
          readyEffectCount: effects.length - optionEffectStart,
          blockerCount: blockers.length - optionBlockerStart,
        });
      }
    }
  }

  return freezeResult({
    active: true,
    effects,
    readyEffects: effects,
    blockers,
    selectedOptions,
    accounting: {
      selectedOptionCount: selectedOptions.length,
      sourceLineCount,
      readyEffectCount: effects.length,
      blockerCount: blockers.length,
    },
  });
}

/**
 * Audits every selectable option in each current branch. The summary describes
 * chooser capability, not the currently selected build: `partial` means at
 * least one option has a directly calculable exact effect, while
 * `structural-only` means the full branch can be selected and stored but none
 * of its option effects currently pass the calculation authority gate.
 */
export function summarizeTlidbHeroTraitBranchSupport(runtime) {
  const branches = Array.isArray(runtime?.model?.branches) ? runtime.model.branches : [];
  return freezeResult(branches.map((branch) => {
    const optionCount = branch.stages.reduce(
      (total, stage) => total + stage.selectionGroups.reduce(
        (stageTotal, group) => stageTotal + group.options.length,
        0,
      ),
      0,
    );
    let inspectedOptionCount = 0;
    let readyOptionCount = 0;
    let blockedOptionCount = 0;

    if (!branch.flatHeroId || optionCount === 0) {
      return {
        branchId: branch.flatHeroId ?? branch.rawId ?? null,
        status: "unavailable",
        optionCount,
        inspectedOptionCount,
        readyOptionCount,
        blockedOptionCount,
      };
    }

    for (const stage of branch.stages) {
      for (const group of stage.selectionGroups) {
        for (const option of group.options) {
          let state = createDefaultHeroTraitState(runtime.model, branch.flatHeroId, 100);
          state = updateHeroTraitChoice(runtime.model, state, {
            stageId: stage.id,
            groupId: group.id,
            choiceId: option.id,
          });
          const projection = adaptTlidbHeroTraitProjectionEffects(state, runtime);
          const selectedOption = projection.selectedOptions.find(
            ({ sourceItemId }) => sourceItemId === option.id,
          );
          if (!selectedOption) continue;
          inspectedOptionCount += 1;
          if (selectedOption.readyEffectCount > 0) readyOptionCount += 1;
          if (selectedOption.blockerCount > 0) blockedOptionCount += 1;
        }
      }
    }

    return {
      branchId: branch.flatHeroId,
      status: inspectedOptionCount !== optionCount
        ? "unavailable"
        : readyOptionCount > 0
          ? "partial"
          : "structural-only",
      optionCount,
      inspectedOptionCount,
      readyOptionCount,
      blockedOptionCount,
    };
  }));
}
