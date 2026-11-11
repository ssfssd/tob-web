import { resolveEffectConditions } from "./effects.js";

function pushUnique(target, values) {
  for (const value of values) {
    if (!target.includes(value)) target.push(value);
  }
}

function finite(value, label) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new TypeError(`${label} must be finite`);
  return numeric;
}

function formulaResult(value, label, metadata) {
  const numeric = Number(value);
  if (
    !metadata.allowNonFinite &&
    (Number.isNaN(numeric) || (!metadata.allowInfinite && !Number.isFinite(numeric)))
  ) {
    throw new TypeError(`${label} must be finite`);
  }
  return numeric;
}

function bound(value, label) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new TypeError(`${label} must be a number`);
  }
  return value;
}

function roundDigits(value) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 12
  ) {
    throw new TypeError("digits must be an integer from 0 to 12");
  }
  return value;
}

function createTrace(statKey, baseValue, metadata = {}) {
  return {
    statKey,
    public: metadata.public === true,
    baseValue,
    baseSourceId: metadata.sourceId || "base:combat",
    baseEvidence: metadata.evidence || "measured",
    steps: [],
    inputTraceKeys: [],
    effectIds: [],
    excludedEffectIds: [],
  };
}

export function createPanelAccumulator(options = {}) {
  const allowNonFiniteResults = options.allowNonFiniteResults === true;
  const conditionState = options.conditionState;
  const values = new Map();
  const traces = new Map();
  const effects = [];
  const resultMetadata = (metadata = {}) =>
    allowNonFiniteResults ? { ...metadata, allowNonFinite: true } : metadata;

  function initialize(statKey, value, metadata = {}) {
    if (values.has(statKey)) throw new Error(`Channel already initialized: ${statKey}`);
    const numeric = finite(value, statKey);
    const trace = createTrace(statKey, numeric, metadata);
    values.set(statKey, numeric);
    traces.set(statKey, trace);
  }

  function ensure(statKey) {
    const trace = traces.get(statKey);
    if (!trace) throw new Error(`Unknown channel: ${statKey}`);
    return trace;
  }

  function mergeInput(targetTrace, inputKey) {
    if (inputKey === targetTrace.statKey) return;
    const inputTrace = traces.get(inputKey);
    if (!inputTrace) throw new Error(`Unknown input channel: ${inputKey}`);
    pushUnique(targetTrace.inputTraceKeys, [inputKey]);
    pushUnique(targetTrace.effectIds, inputTrace.effectIds);
    pushUnique(targetTrace.excludedEffectIds, inputTrace.excludedEffectIds);
  }

  function resolveExpression(expression, inputs, before, after) {
    return typeof expression === "function" ? expression(inputs, before, after) : expression || "";
  }

  function buildFormula(trace, statKey, kind, before, after, metadata, inputs = {}) {
    return {
      public: metadata.public === true,
      step: {
        kind,
        id: metadata.id || `${statKey}:${kind}:${trace.steps.length}`,
        labelKey: metadata.labelKey || "traceFormula",
        before,
        after,
        inputValues: inputs,
        expression: resolveExpression(metadata.expression, inputs, before, after),
      },
    };
  }

  function commitFormula(trace, formula) {
    if (formula.public) trace.public = true;
    trace.steps.push(formula.step);
  }

  function apply(inputEffect) {
    const effect = resolveEffectConditions(inputEffect, conditionState);
    if (effect.targetKey === "unmodeled") {
      effects.push(effect);
      return;
    }
    const trace = ensure(effect.targetKey);
    if (!effect.applied) {
      effects.push(effect);
      pushUnique(trace.excludedEffectIds, [effect.id]);
      return;
    }

    const before = values.get(effect.targetKey);
    const after =
      effect.operation === "add"
        ? before + effect.value
        : effect.operation === "more"
        ? before * (1 + effect.value / 100)
          : effect.value;
    const numericAfter = formulaResult(after, effect.id, resultMetadata());
    effects.push(effect);
    values.set(effect.targetKey, numericAfter);
    pushUnique(trace.effectIds, [effect.id]);
    trace.steps.push({
      kind: "effect",
      effectId: effect.id,
      operation: effect.operation,
      before,
      operand: effect.value,
      after: numericAfter,
    });
  }

  function combineFrom(targetKey, inputKey, operation, metadata = {}) {
    const targetTrace = ensure(targetKey);
    if (!values.has(inputKey)) throw new Error(`Unknown input channel: ${inputKey}`);
    const before = values.get(targetKey);
    const operand = values.get(inputKey);
    const after = formulaResult(
      operation === "multiply" ? before * operand : before + operand,
      metadata.id || targetKey,
      resultMetadata(metadata),
    );
    const formula = buildFormula(
      targetTrace,
      targetKey,
      "formula",
      before,
      after,
      metadata,
      { [inputKey]: operand },
    );
    mergeInput(targetTrace, inputKey);
    values.set(targetKey, after);
    commitFormula(targetTrace, formula);
  }

  function derive(targetKey, inputKeys, calculate, metadata = {}) {
    const trace = ensure(targetKey);
    const inputEntries = [];
    for (const key of inputKeys) {
      if (!values.has(key)) throw new Error(`Unknown input channel: ${key}`);
      inputEntries.push([key, values.get(key)]);
    }
    const inputs = Object.fromEntries(inputEntries);
    const before = values.get(targetKey);
    const after = formulaResult(
      calculate(inputs, before),
      metadata.id || targetKey,
      resultMetadata(metadata),
    );
    const formula = buildFormula(trace, targetKey, "formula", before, after, metadata, inputs);
    for (const key of inputKeys) mergeInput(trace, key);
    values.set(targetKey, after);
    commitFormula(trace, formula);
  }

  function clamp(statKey, minimum, maximum, metadata = {}) {
    const numericMinimum = bound(minimum, "minimum");
    const numericMaximum = bound(maximum, "maximum");
    if (numericMinimum > numericMaximum) {
      throw new TypeError("minimum must not exceed maximum");
    }
    const trace = ensure(statKey);
    const before = values.get(statKey);
    const after = formulaResult(
      Math.min(numericMaximum, Math.max(numericMinimum, before)),
      metadata.id || statKey,
      resultMetadata(metadata),
    );
    const formula = buildFormula(trace, statKey, "clamp", before, after, metadata, {
      minimum: numericMinimum,
      maximum: numericMaximum,
    });
    values.set(statKey, after);
    commitFormula(trace, formula);
  }

  function round(statKey, digits, metadata = {}) {
    const numericDigits = roundDigits(digits);
    const trace = ensure(statKey);
    const before = values.get(statKey);
    const factor = 10 ** numericDigits;
    const after = formulaResult(
      Math.round(before * factor) / factor,
      metadata.id || statKey,
      resultMetadata(metadata),
    );
    const formula = buildFormula(trace, statKey, "round", before, after, metadata, {
      digits: numericDigits,
    });
    values.set(statKey, after);
    commitFormula(trace, formula);
  }

  function snapshot(publicKeys = []) {
    const publicSet = new Set(publicKeys);
    const collectSteps = (key) => {
      const collected = [];
      const seenSteps = new Set();
      const visitedChannels = new Set();
      const visit = (channelKey) => {
        if (visitedChannels.has(channelKey)) return;
        visitedChannels.add(channelKey);
        const trace = traces.get(channelKey);
        if (!trace) return;
        for (const inputKey of trace.inputTraceKeys) visit(inputKey);
        for (const step of trace.steps) {
          const stepKey = step.effectId ? `effect:${step.effectId}` : `step:${step.id}`;
          if (seenSteps.has(stepKey)) continue;
          seenSteps.add(stepKey);
          collected.push(step);
        }
      };
      visit(key);
      return collected;
    };
    const traceEntries = [...traces.entries()].map(([key, trace]) => {
      const finalValue = values.get(key);
      const lastRound = [...trace.steps].reverse().find((step) => step.kind === "round");
      const resolvedSteps = collectSteps(key);
      return [key, Object.freeze({
        ...trace,
        public: trace.public || publicSet.has(key),
        steps: Object.freeze(resolvedSteps.map((step) => Object.freeze({
          ...step,
          ...(step.inputValues && { inputValues: Object.freeze({ ...step.inputValues }) }),
        }))),
        inputTraceKeys: Object.freeze([...trace.inputTraceKeys]),
        effectIds: Object.freeze([...trace.effectIds]),
        excludedEffectIds: Object.freeze([...trace.excludedEffectIds]),
        rawValue: lastRound ? lastRound.before : finalValue,
        finalValue,
      })];
    });

    return Object.freeze({
      values: Object.freeze(Object.fromEntries(values)),
      effects: Object.freeze([...effects]),
      traces: Object.freeze(Object.fromEntries(traceEntries)),
    });
  }

  return {
    initialize,
    value: (statKey) => values.get(statKey),
    apply,
    addFrom: (targetKey, inputKey, metadata) => combineFrom(targetKey, inputKey, "add", metadata),
    multiplyFrom: (targetKey, inputKey, metadata) => combineFrom(targetKey, inputKey, "multiply", metadata),
    derive,
    clamp,
    round,
    snapshot,
  };
}
