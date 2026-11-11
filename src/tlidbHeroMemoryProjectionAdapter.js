import { getHeroMemoryEnhancementProfile } from "./heroMemoryModel.js";
import {
  diagnoseHeroMemoryRevivalSlotInstance,
  getHeroMemoryRevivalSlotEffect,
} from "./heroMemoryRevivalSlot.js";
import { normalizeHeroMemoryTypeId } from "./heroMemoryIdentity.js";
import { getExactRuntimeLocalePayload } from "./runtimeLocale.js";
import {
  TOB91_HERO_MEMORY_MODIFIER_RECEIPT,
} from "./data/91tobHeroMemoryInterop.ss13_4.generated.js";
import { TLIDB_RUNTIME_LOCALES as CURRENT_RUNTIME_LOCALES } from "./data/tlidbRuntimeLocales.ss13.generated.js";
import { parseTlidbOtherTooltipCalculation } from "./tlidbOtherTooltipCalculation.js";

const DIRECT_NUMERIC_AUTHORITY = "tlidb-current-ss13-direct-row";
const STRUCTURE_CONFLICT_AUTHORITY = "runtime-structure-conflict-unverified";

function freezeResult(effects, blockers, accounting) {
  const readyEffects = Object.freeze(effects.map((effect) => Object.freeze({
    ...effect,
    ...(effect.roll ? { roll: Object.freeze({ ...effect.roll }) } : {}),
    ...(effect.selectionAuthorityConflictFields ? {
      selectionAuthorityConflictFields: Object.freeze([
        ...effect.selectionAuthorityConflictFields,
      ]),
    } : {}),
    ...(effect.scope ? {
      scope: Object.freeze({
        ...effect.scope,
        skillTypes: Object.freeze([...(effect.scope.skillTypes ?? ["all"])]),
      }),
    } : {}),
  })));
  return Object.freeze({
    effects: readyEffects,
    readyEffects,
    blockers: Object.freeze(blockers.map((blocker) => Object.freeze({ ...blocker }))),
    accounting: Object.freeze({ ...accounting }),
  });
}

function sourceText(value) {
  return String(value ?? "").trim();
}

function canonicalText(value) {
  return sourceText(value).normalize("NFKC").replace(/\s+/gu, " ");
}

function canonicalMemoryTypeId(value) {
  return normalizeHeroMemoryTypeId(typeof value === "string" ? value : "");
}

function selectedMemories(input) {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.memories)) {
    return input.revivalMemory
      ? [...Array.from({ length: 3 }, (_, index) => input.memories[index] ?? null), input.revivalMemory]
      : input.memories;
  }
  if (Array.isArray(input?.hero?.memories)) {
    return input.hero.revivalMemory
      ? [
          ...Array.from({ length: 3 }, (_, index) => input.hero.memories[index] ?? null),
          input.hero.revivalMemory,
        ]
      : input.hero.memories;
  }
  return [];
}

function activeAuthority(input) {
  const dataset = input?.dataset ?? input;
  const registry = input?.registry;
  const report = input?.report ?? dataset?.activeHeroMemoryReport;
  const metadata = CURRENT_RUNTIME_LOCALES?.metadata;
  const valid = Boolean(
    dataset
    && registry?.records
    && report?.activeSeason === "SS13"
    && report?.selectionFilteringComplete === true
    && report?.sourceCollectionComplete === true
    && report?.sourceCoverageComplete === true
    && report?.sourceConflictAudit?.verificationComplete === true
    && report.sourceConflictAudit.currentTlidbCollectedAt === metadata?.collectedAt
    && metadata?.targetSeason === 13
    && metadata?.complete === true
    && metadata?.verificationComplete === true
    && Array.isArray(dataset.memoryTypes)
    && dataset.memoryTypes.length === 3
  );
  const modifierReceipt = input?.heroMemoryInteropReceipt
    ?? TOB91_HERO_MEMORY_MODIFIER_RECEIPT;
  const expectedReceiptEntries = Object.entries(TOB91_HERO_MEMORY_MODIFIER_RECEIPT);
  const modifierAuthorityCurrent = Boolean(
    modifierReceipt
    && Object.keys(modifierReceipt).length === expectedReceiptEntries.length
    && expectedReceiptEntries.every(([key, value]) => modifierReceipt[key] === value)
  );
  return {
    dataset,
    registry,
    report,
    valid,
    modifierReceipt,
    modifierAuthorityCurrent,
  };
}

function blockerBase(context, reason, extra = {}) {
  return {
    reason,
    categoryId: "heroMemory",
    memorySlotIndex: context.memorySlotIndex ?? null,
    memoryInstanceId: context.memoryInstanceId ?? null,
    memoryTypeId: context.memoryTypeId ?? null,
    component: context.component ?? null,
    ...extra,
  };
}

function blockerKey(blocker) {
  return [
    blocker.reason,
    blocker.memorySlotIndex,
    blocker.memoryInstanceId,
    blocker.component,
    blocker.affixId,
    blocker.tierId,
    blocker.rollKey,
    blocker.sourceText,
  ].join("\u0000");
}

function pushBlocker(blockers, seen, context, reason, extra = {}) {
  const entry = blockerBase(context, reason, extra);
  const key = blockerKey(entry);
  if (seen.has(key)) return;
  seen.add(key);
  blockers.push(entry);
}

function memoryTypeById(dataset, memoryTypeId) {
  const canonicalId = canonicalMemoryTypeId(memoryTypeId);
  return dataset.memoryTypes.find((memoryType) => (
    canonicalMemoryTypeId(memoryType.flatCatalogId ?? memoryType.slotId) === canonicalId
    || memoryType.slotId === memoryTypeId
    || memoryType.legacySlotIds?.includes(memoryTypeId)
  ));
}

function allRevivalGroups(dataset) {
  return Object.entries(dataset?.revivalCatalog?.sections ?? {}).flatMap(([section, groups]) => (
    (Array.isArray(groups) ? groups : []).map((group) => ({ group, section }))
  ));
}

function pageReceipt(payload) {
  const sourcePageRef = String(payload?.sourcePageRef ?? "");
  const match = sourcePageRef.match(/^(memory:[^#]+)#ko$/u);
  if (!match) return null;
  const page = CURRENT_RUNTIME_LOCALES.metadata.pages?.[match[1]]?.locales?.ko;
  if (
    !page?.url?.startsWith("https://tlidb.com/ko/")
    || !/^[a-f0-9]{64}$/iu.test(page.sha256 ?? "")
    || typeof payload?.sourceRecordKey !== "string"
    || !payload.sourceRecordKey
  ) return null;
  return {
    sourceUrl: page.url,
    sourcePageSha256: page.sha256,
    sourceRecordKey: payload.sourceRecordKey,
    sourceLocale: "ko",
    sourcePageRef,
  };
}

function exactRecordReceipt(record, registry) {
  if (
    record?.numericAuthority !== DIRECT_NUMERIC_AUTHORITY
    || record?.localeAuthority !== "tlidb-current-ss13-exact-ko"
    || (record?.numericAuthorityConflictFields?.length ?? 0) > 0
    || typeof record?.localeRef !== "string"
    || !record.localeRef
  ) return null;
  const payload = getExactRuntimeLocalePayload(registry, record.localeRef, "ko");
  if (!payload || canonicalText(payload.text) !== canonicalText(record.text)) return null;
  const receipt = pageReceipt(payload);
  return receipt ? { payload, receipt } : null;
}

function rollValueIsValid(value, definition) {
  const numeric = Number(value);
  const minimum = Number(definition?.min);
  const maximum = Number(definition?.max);
  const step = Number(definition?.step ?? 1);
  if (
    !Number.isFinite(numeric)
    || !Number.isFinite(minimum)
    || !Number.isFinite(maximum)
    || !Number.isFinite(step)
    || step <= 0
    || numeric < minimum
    || numeric > maximum
  ) return false;
  const units = (numeric - minimum) / step;
  return Math.abs(units - Math.round(units)) < 1e-8;
}

function validateRollConfiguration(record, config, context, blockers, blockerKeys) {
  const definitions = Array.isArray(record?.rollDefs) ? record.rollDefs : [];
  const expectedKeys = new Set(definitions.map(({ key }) => key));
  const rawRolls = config?.rolls;
  const rolls = rawRolls && typeof rawRolls === "object" && !Array.isArray(rawRolls)
    ? rawRolls
    : {};
  if (rawRolls !== undefined && rolls !== rawRolls) {
    pushBlocker(
      blockers,
      blockerKeys,
      context,
      "hero-memory-roll-configuration-invalid",
    );
  }
  for (const definition of definitions) {
    if (!Object.hasOwn(rolls, definition.key)) {
      pushBlocker(
        blockers,
        blockerKeys,
        context,
        "hero-memory-roll-selection-required",
        { rollKey: definition.key },
      );
    } else if (!rollValueIsValid(rolls[definition.key], definition)) {
      pushBlocker(
        blockers,
        blockerKeys,
        context,
        "hero-memory-roll-selection-invalid",
        {
          rollKey: definition.key,
          selectedRoll: rolls[definition.key],
          roll: { min: definition.min, max: definition.max, step: definition.step },
        },
      );
    }
  }
  for (const key of Object.keys(rolls)) {
    if (!expectedKeys.has(key)) {
      pushBlocker(
        blockers,
        blockerKeys,
        context,
        "hero-memory-roll-key-unrecognized",
        { rollKey: key },
      );
    }
  }
  return {
    valid: definitions.every((definition) => rollValueIsValid(rolls[definition.key], definition))
      && Object.keys(rolls).every((key) => expectedKeys.has(key)),
    rolls,
    definitions,
  };
}

function effectScope(stat) {
  const normalized = String(stat ?? "").toLowerCase();
  const actor = normalized.includes("minion") ? "minion" : "self";
  let skillTypes = ["all"];
  if (/(?:^|_)attack(?:_|$)/u.test(normalized) && !normalized.includes("spell")) {
    skillTypes = ["attack"];
  } else if (/(?:^|_)spell(?:_|$)/u.test(normalized) && !normalized.includes("attack")) {
    skillTypes = ["spell"];
  }
  return { actor, skillTypes };
}

function canonicalProjectionStat(stat) {
  if (stat === "minion_critical_rating") return "minion-critical-strike-rating";
  return stat;
}

function exactRangeDefinition(effect, definitions, usedKeys) {
  const minimum = Number(effect?.roll?.min);
  const maximum = Number(effect?.roll?.max);
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return null;
  return definitions.find((definition) => (
    !usedKeys.has(definition.key)
    && Number(definition.min) === minimum
    && Number(definition.max) === maximum
  )) ?? null;
}

function sourceValuePrecision(effect) {
  const value = Number(effect?.value);
  if (!Number.isFinite(value)) return 0;
  const candidates = String(effect?.sourceText ?? "").match(/[+\-]?\d+(?:\.\d+)?/gu) ?? [];
  const exact = candidates.find((candidate) => Number(candidate) === value);
  return exact?.includes(".") ? exact.split(".")[1].length : 0;
}

function applyValueModifier(value, modifierPercent, precision) {
  const numericValue = Number(value);
  const numericModifier = Number(modifierPercent);
  const numericPrecision = Math.max(0, Number(precision) || 0);
  if (!Number.isFinite(numericValue) || !Number.isFinite(numericModifier)) return null;
  return Number((numericValue * (1 + numericModifier / 100)).toFixed(numericPrecision));
}

function modifierEvidence(authority, modifierPercent, sourceRecordKey, extra = {}) {
  if (!authority.modifierAuthorityCurrent || !Number.isFinite(Number(modifierPercent))) return null;
  return {
    modifierPercent: Number(modifierPercent),
    authority: authority.modifierReceipt.authority,
    sourceUrl: authority.modifierReceipt.publicDatasetUrl,
    sourceSha256: authority.modifierReceipt.publicDatasetSha256,
    sourceRecordKey,
    ...extra,
  };
}

function parseExactRecord({
  record,
  receipt,
  ownerFlatCatalogId,
  context,
  rollConfiguration,
  valueModifier,
  blockers,
  blockerKeys,
}) {
  const syntheticItem = {
    id: `heroMemory-runtime:${context.memorySlotIndex}:${context.component}:${record.localeRef}`,
    categoryId: "heroMemory",
    tlidbText: {
      ko: {
        detail: record.text,
        sourceUrl: receipt.sourceUrl,
        sourceRecordKey: receipt.sourceRecordKey,
        sourcePageSha256: receipt.sourcePageSha256,
        sourcePageVersion: "SS13",
        sourceSeasonEvidence: {
          verificationComplete: true,
          actualSeason: 13,
          sourcePageVersion: "SS13",
        },
        sourceFieldStatus: { detail: "exact" },
      },
    },
  };
  const parsed = parseTlidbOtherTooltipCalculation(syntheticItem);
  const blockedLines = new Set();
  for (const parserBlocker of parsed.blockers) {
    blockedLines.add(parserBlocker.sourceText);
    pushBlocker(
      blockers,
      blockerKeys,
      context,
      `hero-memory-tooltip-${parserBlocker.reason}`,
      {
        sourceText: parserBlocker.sourceText,
        sourceUrl: receipt.sourceUrl,
        sourceRecordKey: receipt.sourceRecordKey,
      },
    );
  }

  if (!parsed.effects.length) return [];
  if (context.component === "base") {
    const numericValue = Number(record.numericValue);
    if (
      parsed.effects.length !== 1
      || !Number.isFinite(numericValue)
      || Number(parsed.effects[0].value) !== numericValue
    ) {
      pushBlocker(
        blockers,
        blockerKeys,
        context,
        "hero-memory-base-numeric-authority-mismatch",
        { sourceText: record.text, sourceRecordKey: receipt.sourceRecordKey },
      );
      return [];
    }
  }

  const usedRangeKeys = new Set();
  const effects = [];
  for (const [effectIndex, effect] of parsed.effects.entries()) {
    if (blockedLines.has(effect.sourceText)) continue;
    let output = { ...effect, stat: canonicalProjectionStat(effect.stat) };
    let selectionRollKey = null;
    let selectedRoll = null;
    if (effect.roll) {
      const definition = exactRangeDefinition(
        effect,
        rollConfiguration?.definitions ?? [],
        usedRangeKeys,
      );
      if (!definition) {
        pushBlocker(
          blockers,
          blockerKeys,
          context,
          "hero-memory-roll-range-authority-mismatch",
          { sourceText: effect.sourceText },
        );
        continue;
      }
      usedRangeKeys.add(definition.key);
      selectionRollKey = definition.key;
      selectedRoll = Number(rollConfiguration.rolls[definition.key]);
      if (!rollValueIsValid(selectedRoll, definition)) continue;
      output = { ...output, value: selectedRoll };
    }
    if (valueModifier) {
      const definition = selectionRollKey
        ? (rollConfiguration?.definitions ?? []).find(({ key }) => key === selectionRollKey)
        : null;
      const adjustedValue = applyValueModifier(
        output.value,
        valueModifier.modifierPercent,
        valueModifier.precision ?? definition?.precision ?? sourceValuePrecision(output),
      );
      if (!Number.isFinite(adjustedValue)) {
        pushBlocker(
          blockers,
          blockerKeys,
          context,
          "hero-memory-modifier-value-invalid",
          { sourceText: effect.sourceText },
        );
        continue;
      }
      output = { ...output, value: adjustedValue };
    }
    effects.push({
      ...output,
      id: `hero-memory:${context.memorySlotIndex}:${context.component}:${effectIndex}`,
      calculationReady: true,
      categoryId: "heroMemory",
      origin: context.component,
      projectionEntryId: `hero-memory:${context.memorySlotIndex}:${context.component}`,
      sourceItemId: context.memoryTypeId,
      flatCatalogItemId: ownerFlatCatalogId ?? context.memoryTypeId,
      runtimeSourceId: record.localeRef,
      memorySlotIndex: context.memorySlotIndex,
      memoryInstanceId: context.memoryInstanceId,
      memoryTypeId: context.memoryTypeId,
      affixId: context.affixId ?? null,
      tierId: context.tierId ?? null,
      scope: effectScope(output.stat),
      sourceUrl: receipt.sourceUrl,
      sourceRecordKey: receipt.sourceRecordKey,
      sourcePageSha256: receipt.sourcePageSha256,
      sourceLocale: receipt.sourceLocale,
      ...(record.selectionAuthorityConflictFields?.length ? {
        selectionAuthorityConflictFields: [...record.selectionAuthorityConflictFields],
      } : {}),
      ...(valueModifier ? {
        valueModifierPercent: valueModifier.modifierPercent,
        valueModifierAuthority: valueModifier.authority,
        valueModifierSourceUrl: valueModifier.sourceUrl,
        valueModifierSourceSha256: valueModifier.sourceSha256,
        valueModifierSourceRecordKey: valueModifier.sourceRecordKey,
      } : {}),
      ...(selectionRollKey ? { selectionRollKey, selectedRoll } : {}),
    });
  }
  return effects;
}

function numericAuthorityBlocker(record, context, blockers, blockerKeys) {
  if (record?.numericAuthority === STRUCTURE_CONFLICT_AUTHORITY
    || (record?.numericAuthorityConflictFields?.length ?? 0) > 0) {
    pushBlocker(
      blockers,
      blockerKeys,
      context,
      "hero-memory-direct-row-structure-conflict",
      {
        sourceText: record?.text ?? "",
        conflictFields: [...(record?.numericAuthorityConflictFields ?? [])],
      },
    );
    return;
  }
  if (context.component === "base" && record?.isExtrapolated === true) {
    pushBlocker(
      blockers,
      blockerKeys,
      context,
      "hero-memory-base-enhancement-extrapolated",
      { sourceText: record?.text ?? "" },
    );
    return;
  }
  pushBlocker(
    blockers,
    blockerKeys,
    context,
    "hero-memory-numeric-authority-unverified",
    {
      sourceText: record?.text ?? "",
      numericAuthority: record?.numericAuthority ?? null,
    },
  );
}

function projectRecord({
  record,
  registry,
  ownerFlatCatalogId,
  context,
  config,
  valueModifier,
  blockers,
  blockerKeys,
}) {
  if (!record) {
    pushBlocker(blockers, blockerKeys, context, "hero-memory-selected-record-unavailable");
    return [];
  }
  if (
    record.numericAuthority !== DIRECT_NUMERIC_AUTHORITY
    || (record.numericAuthorityConflictFields?.length ?? 0) > 0
  ) {
    numericAuthorityBlocker(record, context, blockers, blockerKeys);
    return [];
  }
  const exact = exactRecordReceipt(record, registry);
  if (!exact) {
    pushBlocker(
      blockers,
      blockerKeys,
      context,
      "hero-memory-current-ss13-receipt-mismatch",
      { sourceText: record.text ?? "", localeRef: record.localeRef ?? null },
    );
    return [];
  }
  const rollConfiguration = context.component === "base"
    ? { valid: true, rolls: {}, definitions: [] }
    : validateRollConfiguration(record, config, context, blockers, blockerKeys);
  if (!rollConfiguration.valid) return [];
  return parseExactRecord({
    record,
    receipt: exact.receipt,
    ownerFlatCatalogId,
    context,
    rollConfiguration,
    valueModifier,
    blockers,
    blockerKeys,
  });
}

function selectedAffixProjection({
  ids,
  groups,
  kind,
  memory,
  registry,
  memoryType,
  context,
  blockers,
  blockerKeys,
  valueModifier,
}) {
  const effects = [];
  const seenIds = new Set();
  for (const [selectionIndex, affixId] of (Array.isArray(ids) ? ids : []).entries()) {
    const affixContext = {
      ...context,
      component: kind,
      affixId,
      affixSelectionIndex: selectionIndex,
    };
    if (typeof affixId !== "string" || !affixId || seenIds.has(affixId)) {
      pushBlocker(
        blockers,
        blockerKeys,
        affixContext,
        seenIds.has(affixId)
          ? "hero-memory-affix-selection-duplicate"
          : "hero-memory-affix-selection-invalid",
      );
      continue;
    }
    seenIds.add(affixId);
    const group = groups.find(({ id }) => id === affixId);
    if (!group) {
      pushBlocker(
        blockers,
        blockerKeys,
        affixContext,
        "hero-memory-affix-selection-not-in-memory-type",
      );
      continue;
    }
    const config = memory.affixRolls?.[affixId];
    const tierId = config?.tierId;
    const tier = group.tierOptions?.find((candidate) => candidate.tierId === tierId);
    const tierContext = { ...affixContext, tierId: tierId ?? null };
    if (!tier) {
      pushBlocker(
        blockers,
        blockerKeys,
        tierContext,
        "hero-memory-affix-tier-selection-invalid",
      );
      continue;
    }
    effects.push(...projectRecord({
      record: tier,
      registry,
      ownerFlatCatalogId: group.ownerFlatCatalogId ?? memoryType.flatCatalogId,
      context: tierContext,
      config,
      valueModifier,
      blockers,
      blockerKeys,
    }));
  }
  return effects;
}

/**
 * Converts saved hero-memory selections into exact current-TLIDB SS13 effects.
 * The active dataset/registry bundle is supplied by loadActiveHeroMemoryDataset;
 * this function is intentionally synchronous so callers can cache or generate
 * that authority outside the calculation hot path.
 */
export function adaptTlidbHeroMemoryProjectionEffects(input, authorityInput) {
  const memories = selectedMemories(input);
  const authority = activeAuthority(authorityInput);
  const effects = [];
  const blockers = [];
  const blockerKeys = new Set();
  const selected = memories
    .map((memory, memorySlotIndex) => ({ memory, memorySlotIndex }))
    .filter(({ memory }) => memory && typeof memory === "object");

  if (!selected.length) {
    return freezeResult([], [], {
      selectedMemoryCount: 0,
      consumedMemoryCount: 0,
      readyEffectCount: 0,
      blockerCount: 0,
      authorityCurrent: authority.valid,
    });
  }
  if (!authority.valid) {
    pushBlocker(
      blockers,
      blockerKeys,
      {},
      "hero-memory-current-ss13-authority-unavailable",
    );
    return freezeResult([], blockers, {
      selectedMemoryCount: selected.length,
      consumedMemoryCount: 0,
      readyEffectCount: 0,
      blockerCount: blockers.length,
      authorityCurrent: false,
    });
  }

  const { dataset, registry } = authority;
  const configuredAffixKeys = new Set();
  const standardMemories = memories.slice(0, 3);
  const revivalMemory = memories[3];
  const revivalSlotEffects = standardMemories
    .map((memory) => getHeroMemoryRevivalSlotEffect(memory, dataset))
    .filter(Boolean);
  const revivalSlotEffect = revivalMemory && revivalSlotEffects.length === 1
    ? revivalSlotEffects[0]
    : null;
  const revivalSlotDiagnosis = revivalMemory && revivalSlotEffect
    ? diagnoseHeroMemoryRevivalSlotInstance(revivalMemory, revivalSlotEffect, dataset)
    : null;
  let consumedMemoryCount = 0;
  for (const { memory, memorySlotIndex } of selected) {
    const memoryType = memoryTypeById(dataset, memory.memoryTypeId);
    const canonicalId = canonicalMemoryTypeId(memory.memoryTypeId);
    const context = {
      memorySlotIndex,
      memoryInstanceId: typeof memory.instanceId === "string" ? memory.instanceId : null,
      memoryTypeId: canonicalId || null,
      component: "memory",
    };
    if (!memoryType) {
      pushBlocker(
        blockers,
        blockerKeys,
        context,
        "hero-memory-type-selection-invalid",
      );
      continue;
    }
    const expectedType = dataset.memoryTypes[memorySlotIndex];
    if (
      expectedType
      && canonicalMemoryTypeId(expectedType.flatCatalogId ?? expectedType.slotId)
        !== canonicalMemoryTypeId(memoryType.flatCatalogId ?? memoryType.slotId)
    ) {
      pushBlocker(
        blockers,
        blockerKeys,
        context,
        "hero-memory-slot-type-mismatch",
        { expectedMemoryTypeId: expectedType.flatCatalogId },
      );
      continue;
    }
    consumedMemoryCount += 1;
    context.memoryTypeId = memoryType.flatCatalogId;

    const enhancement = Number(memory.enhancement);
    const hasValueModifier = Object.hasOwn(memory, "valueModifierPercent");
    const baseGroup = memoryType.baseAttributeGroups?.find(({ id }) => id === memory.baseAttributeId);
    const baseContext = {
      ...context,
      component: "base",
      baseAttributeId: memory.baseAttributeId ?? null,
      enhancement: Number.isInteger(enhancement) ? enhancement : null,
    };
    let baseValueModifier = null;
    if (memory.profitLoss === true) {
      baseValueModifier = modifierEvidence(
        authority,
        authority.modifierReceipt?.profitLossBaseAttributeModifierPercent,
        "base_attribute_modifier_percent",
        { precision: baseGroup?.precision },
      );
      if (!baseValueModifier) {
        pushBlocker(
          blockers,
          blockerKeys,
          baseContext,
          "hero-memory-modifier-authority-unavailable",
        );
      }
    } else if (hasValueModifier) {
      baseValueModifier = revivalSlotDiagnosis?.valid === true
        ? modifierEvidence(
            authority,
            revivalSlotEffect.valueModifierPercent,
            `${revivalSlotEffect.sourceGroupId}:${revivalSlotEffect.sourceTierId}:value_modifier_percent`,
            { precision: baseGroup?.precision },
          )
        : null;
      if (!baseValueModifier) {
        pushBlocker(
          blockers,
          blockerKeys,
          baseContext,
          authority.modifierAuthorityCurrent
            ? "hero-memory-revival-slot-configuration-invalid"
            : "hero-memory-modifier-authority-unavailable",
        );
      }
    }
    if (!baseGroup || !Number.isInteger(enhancement)) {
      pushBlocker(
        blockers,
        blockerKeys,
        baseContext,
        "hero-memory-base-selection-invalid",
      );
    } else if ((!memory.profitLoss && !hasValueModifier) || baseValueModifier) {
      const baseRecord = baseGroup.enhancementValues?.find(
        ({ enhancementLevel }) => Number(enhancementLevel) === enhancement,
      );
      effects.push(...projectRecord({
        record: baseRecord,
        registry,
        ownerFlatCatalogId: baseGroup.ownerFlatCatalogId ?? memoryType.flatCatalogId,
        context: baseContext,
        valueModifier: baseValueModifier,
        blockers,
        blockerKeys,
      }));
    }

    const profile = getHeroMemoryEnhancementProfile(enhancement);
    const fixedIds = Array.isArray(memory.fixedAffixIds) ? memory.fixedAffixIds : [];
    const randomIds = Array.isArray(memory.randomAffixIds) ? memory.randomAffixIds : [];
    if (fixedIds.length !== profile.affixLimit) {
      pushBlocker(
        blockers,
        blockerKeys,
        { ...context, component: "fixed" },
        "hero-memory-fixed-affix-count-invalid",
        { expectedCount: profile.affixLimit, actualCount: fixedIds.length },
      );
    }
    if (randomIds.length > profile.affixLimit) {
      pushBlocker(
        blockers,
        blockerKeys,
        { ...context, component: "random" },
        "hero-memory-random-affix-count-invalid",
        { maximumCount: profile.affixLimit, actualCount: randomIds.length },
      );
    }
    effects.push(...selectedAffixProjection({
      ids: fixedIds,
      groups: memoryType.fixedAffixGroups ?? [],
      kind: "fixed",
      memory,
      registry,
      memoryType,
      context,
      blockers,
      blockerKeys,
      valueModifier: null,
    }));
    let randomValueModifier = null;
    if (hasValueModifier && randomIds.length) {
      randomValueModifier = revivalSlotDiagnosis?.valid === true
        ? modifierEvidence(
            authority,
            revivalSlotEffect.valueModifierPercent,
            `${revivalSlotEffect.sourceGroupId}:${revivalSlotEffect.sourceTierId}:value_modifier_percent`,
          )
        : null;
      if (!randomValueModifier) {
        pushBlocker(
          blockers,
          blockerKeys,
          { ...context, component: "random" },
          authority.modifierAuthorityCurrent
            ? "hero-memory-revival-slot-configuration-invalid"
            : "hero-memory-modifier-authority-unavailable",
          { valueModifierPercent: memory.valueModifierPercent },
        );
      }
    }
    if (!hasValueModifier || randomValueModifier) {
      effects.push(...selectedAffixProjection({
        ids: randomIds,
        groups: memoryType.randomAffixGroups ?? [],
        kind: "random",
        memory,
        registry,
        memoryType,
        context,
        blockers,
        blockerKeys,
        valueModifier: randomValueModifier,
      }));
    }

    if (memory.revivalAffixId) {
      const revivalEntry = allRevivalGroups(dataset).find(
        ({ group }) => group.id === memory.revivalAffixId,
      );
      const config = memory.affixRolls?.[memory.revivalAffixId];
      const tierId = config?.tierId;
      const revivalContext = {
        ...context,
        component: "revival",
        affixId: memory.revivalAffixId,
        tierId: tierId ?? null,
      };
      if (!revivalEntry) {
        pushBlocker(
          blockers,
          blockerKeys,
          revivalContext,
          "hero-memory-revival-selection-invalid",
        );
      } else if (revivalEntry.section === "moonPhaseAffixGroups") {
        pushBlocker(
          blockers,
          blockerKeys,
          revivalContext,
          "hero-memory-moon-phase-effect-authority-unavailable",
          { sourceText: revivalEntry.group.previewText ?? "" },
        );
      } else {
        const tier = revivalEntry.group.tierOptions?.find(
          (candidate) => candidate.tierId === tierId,
        );
        if (!tier) {
          pushBlocker(
            blockers,
            blockerKeys,
            revivalContext,
            "hero-memory-affix-tier-selection-invalid",
          );
        } else {
          effects.push(...projectRecord({
            record: tier,
            registry,
            ownerFlatCatalogId:
              revivalEntry.group.ownerFlatCatalogId
              ?? revivalEntry.group.flatCatalogId
              ?? memoryType.flatCatalogId,
            context: revivalContext,
            config,
            blockers,
            blockerKeys,
          }));
        }
      }
    }

    const selectedAffixIds = new Set([
      ...fixedIds,
      ...randomIds,
      ...(memory.revivalAffixId ? [memory.revivalAffixId] : []),
    ]);
    for (const affixId of Object.keys(memory.affixRolls ?? {})) {
      configuredAffixKeys.add(`${memorySlotIndex}:${affixId}`);
      if (!selectedAffixIds.has(affixId)) {
        pushBlocker(
          blockers,
          blockerKeys,
          { ...context, component: "affix-config", affixId },
          "hero-memory-affix-configuration-unselected",
        );
      }
    }

    if (Number(memory.traitLevelBonus) !== 0) {
      pushBlocker(
        blockers,
        blockerKeys,
        { ...context, component: "trait-level" },
        "hero-memory-trait-level-bonus-authority-unavailable",
        { traitLevelBonus: memory.traitLevelBonus },
      );
    }
  }

  return freezeResult(effects, blockers, {
    selectedMemoryCount: selected.length,
    consumedMemoryCount,
    readyEffectCount: effects.length,
    blockerCount: blockers.length,
    configuredAffixCount: configuredAffixKeys.size,
    authorityCurrent: true,
  });
}
