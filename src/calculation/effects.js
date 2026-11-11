import { diagnoseConditions } from "../conditionModel.js";

export const CALCULATION_TRACE_VERSION = "effect-trace-v1";

const OPERATIONS = new Set(["add", "more", "set"]);
const EVIDENCE_VALUES = new Set(["measured", "structured", "inferred", "unsupported"]);

function textOr(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeConditionRequirements(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((requirement) => requirement && typeof requirement === "object" && !Array.isArray(requirement))
    .map((requirement) => Object.freeze({
      id: textOr(requirement.id, textOr(requirement.path)),
      label: textOr(requirement.label),
      path: textOr(requirement.path),
      operator: textOr(requirement.operator, "equals"),
      expected: requirement.expected,
    }))
    .filter(({ path }) => path);
}

function freezeDiagnostics(diagnostics) {
  return Object.freeze(diagnostics.map((diagnostic) => Object.freeze({ ...diagnostic })));
}

export function createEffect(input = {}) {
  const id = textOr(input.id, "effect:unknown");
  const sourceId = textOr(input.sourceId, "unknown");
  const targetKey = textOr(input.targetKey, "unmodeled");
  const requestedOperation = textOr(input.operation, "add");
  const operationIsSupported = OPERATIONS.has(requestedOperation);
  const operation = operationIsSupported ? requestedOperation : "add";
  const evidence = EVIDENCE_VALUES.has(input.evidence) ? input.evidence : "unsupported";
  const valueIsValid = typeof input.value === "number" && Number.isFinite(input.value);
  const numericValue = valueIsValid ? input.value : null;
  const explicitlyInactive = input.applied === false;
  const applied =
    !explicitlyInactive &&
    evidence !== "unsupported" &&
    targetKey !== "unmodeled" &&
    operationIsSupported &&
    valueIsValid;

  let inactiveReason = textOr(input.inactiveReason);
  if (!inactiveReason && evidence === "unsupported") inactiveReason = "unsupported-effect";
  if (!inactiveReason && targetKey === "unmodeled") inactiveReason = "unmodeled-target";
  if (!inactiveReason && !operationIsSupported) inactiveReason = "unsupported-operation";
  if (!inactiveReason && !valueIsValid) inactiveReason = "invalid-value";
  if (!inactiveReason && explicitlyInactive) inactiveReason = "inactive-condition";

  const effect = {
    id,
    sourceId,
    sourceLabel: textOr(input.sourceLabel, sourceId),
    sourceIconUrl: textOr(input.sourceIconUrl),
    categoryId: textOr(input.categoryId),
    targetKey,
    operation,
    value: valueIsValid ? numericValue : null,
    evidence,
    applied,
    order: Number.isFinite(Number(input.order)) ? Number(input.order) : 0,
  };

  for (const field of [
    "unit",
    "valueOrigin",
    "semanticTargetKey",
    "sourceAlias",
    "sourceItemId",
    "sourceText",
    "sourceUrl",
    "sourceRollAlias",
    "sourceRecordKey",
    "sourceModifierId",
    "rollId",
    "authorityStatus",
    "slotId",
    "variant",
    "dependency",
  ]) {
    const value = textOr(input[field]);
    if (value) effect[field] = value;
  }
  if (typeof input.requestedValue === "number" && Number.isFinite(input.requestedValue)) {
    effect.requestedValue = input.requestedValue;
  }
  if (input.clamped === true) effect.clamped = true;

  const conditionRequirements = normalizeConditionRequirements(input.conditionRequirements);
  if (conditionRequirements.length) {
    effect.conditionRequirements = Object.freeze(conditionRequirements);
  }
  if (!applied) effect.inactiveReason = inactiveReason || "inactive-condition";
  return Object.freeze(effect);
}

export function resolveEffectConditions(effect, conditionState) {
  const requirements = Array.isArray(effect?.conditionRequirements)
    ? effect.conditionRequirements
    : [];
  if (!requirements.length) return effect;

  const diagnosis = diagnoseConditions(conditionState, requirements);
  const active = freezeDiagnostics(diagnosis.active);
  const unmet = freezeDiagnostics(diagnosis.unmet);
  const unsupported = freezeDiagnostics(diagnosis.unsupported);
  const conditionsSatisfied = unmet.length === 0 && unsupported.length === 0;
  const applied = effect.applied && conditionsSatisfied;
  const resolved = {
    ...effect,
    applied,
    conditionEvaluation: Object.freeze({
      satisfied: conditionsSatisfied,
      active,
      unmet,
      unsupported,
    }),
  };

  if (!applied) {
    resolved.inactiveReason = effect.applied
      ? unsupported.length
        ? "unsupported-effect"
        : "inactive-condition"
      : effect.inactiveReason || "inactive-condition";
  } else {
    delete resolved.inactiveReason;
  }
  return Object.freeze(resolved);
}
