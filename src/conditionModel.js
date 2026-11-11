export const CONDITION_SCHEMA_VERSION = 1;

const ENEMY_TYPES = new Set(["normal", "elite", "boss"]);
const ENEMY_DISTANCE_BANDS = new Set(["", "close", "nearby", "far"]);
const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const RESISTANCE_KEYS = ["fire", "cold", "lightning", "erosion"];
const CONDITION_OPERATORS = new Set([
  "equals",
  "notEquals",
  "atLeast",
  "atMost",
  "greaterThan",
  "lessThan",
  "truthy",
  "falsy",
  "includes",
]);

export const SUPPORTED_CONDITION_PATHS = Object.freeze([
  "enemy.type",
  "enemy.isBoss",
  "enemy.level",
  "enemy.armor",
  "enemy.affliction",
  "enemy.ailmentCount",
  "enemy.resistances.fire",
  "enemy.resistances.cold",
  "enemy.resistances.lightning",
  "enemy.resistances.erosion",
  "enemy.distance",
  "enemy.distanceBand",
  "enemy.witherStacks",
  "enemy.paralysisStacks",
  "reaping.durationSeconds",
  "reaping.eventsPerSecond",
  "regain.missingLife",
  "regain.missingShield",
  "recent.acted",
  "recent.killed",
  "recent.wasHit",
  "recent.consumed",
  "recent.moved",
  "recent.usedWarcry",
  "recent.evaded",
  "recent.moveDistanceMeters",
  "recent.killStack",
  "recent.warcrySkillUseCount",
  "recent.spellBurstActivationCount",
  "recent.reapingCount",
]);

export const SUPPORTED_NAMED_CONDITION_PREFIXES = Object.freeze([
  "charges",
  "blessings",
  "statuses",
  "heroStacks",
  "stacks",
  "buffs",
  "debuffs",
  "recentFlags",
  "playerStates",
  "playerResources",
  "enemyStates",
]);

const SUPPORTED_CONDITION_PATH_SET = new Set(SUPPORTED_CONDITION_PATHS);
const SUPPORTED_NAMED_CONDITION_PREFIX_SET = new Set(SUPPORTED_NAMED_CONDITION_PREFIXES);

const LIMITS = {
  level: [1, 100],
  armor: [0, 1_000_000_000],
  affliction: [0, 100],
  ailmentCount: [0, 999],
  resistance: [-100, 100],
  distance: [0, 100],
  reaping: [0, Number.MAX_SAFE_INTEGER],
  regain: [0, Number.MAX_SAFE_INTEGER],
  moveDistance: [0, Number.MAX_SAFE_INTEGER],
  counter: [0, Number.MAX_SAFE_INTEGER],
  paralysisStack: [0, 10],
  stack: [0, 999],
};

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function normalizeBoolean(value, fallback) {
  if (value === true || value === 1 || value === "true") return true;
  if (value === false || value === 0 || value === "false") return false;
  return fallback;
}

function normalizeNumber(value, [minimum, maximum], fallback, round = false) {
  if (value === null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const bounded = Math.max(minimum, Math.min(maximum, number));
  return round ? Math.round(bounded) : bounded;
}

function normalizeNumberMap(input, limits = LIMITS.stack) {
  if (!isRecord(input)) return {};
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => key && !BLOCKED_KEYS.has(key))
      .map(([key, value]) => [key, normalizeNumber(value, limits, undefined, true)])
      .filter(([, value]) => value !== undefined),
  );
}

function normalizeBooleanMap(input) {
  if (!isRecord(input)) return {};
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => key && !BLOCKED_KEYS.has(key))
      .map(([key, value]) => [key, normalizeBoolean(value, undefined)])
      .filter(([, value]) => value !== undefined),
  );
}

function normalizeEnemy(input, partial) {
  const source = isRecord(input) ? input : {};
  const result = {};
  const defaults = createDefaultConditionState().automatic.enemy;

  if (!partial || hasOwn(source, "type")) {
    if (ENEMY_TYPES.has(source.type)) result.type = source.type;
    else if (!partial) result.type = defaults.type;
  }
  if (!partial || hasOwn(source, "isBoss")) {
    const value = normalizeBoolean(source.isBoss, partial ? undefined : defaults.isBoss);
    if (value !== undefined) result.isBoss = value;
  }
  if (!partial || hasOwn(source, "distanceBand")) {
    if (ENEMY_DISTANCE_BANDS.has(source.distanceBand)) result.distanceBand = source.distanceBand;
    else if (!partial) result.distanceBand = defaults.distanceBand;
  }
  for (const [key, limits] of [
    ["level", LIMITS.level],
    ["armor", LIMITS.armor],
    ["affliction", LIMITS.affliction],
    ["ailmentCount", LIMITS.ailmentCount],
    ["distance", LIMITS.distance],
    ["witherStacks", LIMITS.counter],
    ["paralysisStacks", LIMITS.paralysisStack],
  ]) {
    if (partial && (!hasOwn(source, key) || source[key] === null)) continue;
    const value = normalizeNumber(
      source[key],
      limits,
      partial ? undefined : defaults[key],
      key === "level" || key === "ailmentCount",
    );
    if (value !== undefined) result[key] = value;
  }

  const resistanceSource = isRecord(source.resistances) ? source.resistances : {};
  const resistances = {};
  for (const key of RESISTANCE_KEYS) {
    if (partial && (!hasOwn(resistanceSource, key) || resistanceSource[key] === null)) continue;
    const value = normalizeNumber(
      resistanceSource[key],
      LIMITS.resistance,
      partial ? undefined : defaults.resistances[key],
    );
    if (value !== undefined) resistances[key] = value;
  }
  if (!partial || Object.keys(resistances).length) result.resistances = resistances;
  return result;
}

function normalizeRecent(input, partial) {
  const source = isRecord(input) ? input : {};
  const defaults = createDefaultConditionState().automatic.recent;
  const result = {};
  for (const key of ["acted", "killed", "wasHit", "consumed", "moved", "usedWarcry", "evaded"]) {
    if (partial && !hasOwn(source, key)) continue;
    const value = normalizeBoolean(source[key], partial ? undefined : defaults[key]);
    if (value !== undefined) result[key] = value;
  }
  if (!partial || (hasOwn(source, "moveDistanceMeters") && source.moveDistanceMeters !== null)) {
    const value = normalizeNumber(
      source.moveDistanceMeters,
      LIMITS.moveDistance,
      partial ? undefined : defaults.moveDistanceMeters,
    );
    if (value !== undefined) result.moveDistanceMeters = value;
  }
  for (const key of ["killStack", "warcrySkillUseCount", "spellBurstActivationCount", "reapingCount"]) {
    if (partial && (!hasOwn(source, key) || source[key] === null)) continue;
    const value = normalizeNumber(
      source[key],
      LIMITS.counter,
      partial ? undefined : defaults[key],
      true,
    );
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function normalizeReaping(input, partial) {
  const source = isRecord(input) ? input : {};
  const defaults = createDefaultConditionState().automatic.reaping;
  const result = {};
  for (const key of ["durationSeconds", "eventsPerSecond"]) {
    if (partial && (!hasOwn(source, key) || source[key] === null)) continue;
    const value = normalizeNumber(
      source[key],
      LIMITS.reaping,
      partial ? undefined : defaults[key],
    );
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function normalizeRegain(input, partial) {
  const source = isRecord(input) ? input : {};
  const defaults = createDefaultConditionState().automatic.regain;
  const result = {};
  for (const key of ["missingLife", "missingShield"]) {
    if (partial && (!hasOwn(source, key) || source[key] === null)) continue;
    const value = normalizeNumber(
      source[key],
      LIMITS.regain,
      partial ? undefined : defaults[key],
    );
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function normalizeContext(input, partial = false) {
  const source = isRecord(input) ? input : {};
  const result = {};

  if (!partial || hasOwn(source, "enemy")) {
    const enemy = normalizeEnemy(source.enemy, partial);
    if (!partial || Object.keys(enemy).length) result.enemy = enemy;
  }
  if (!partial || hasOwn(source, "recent")) {
    const recent = normalizeRecent(source.recent, partial);
    if (!partial || Object.keys(recent).length) result.recent = recent;
  }
  if (!partial || hasOwn(source, "reaping")) {
    const reaping = normalizeReaping(source.reaping, partial);
    if (!partial || Object.keys(reaping).length) result.reaping = reaping;
  }
  if (!partial || hasOwn(source, "regain")) {
    const regain = normalizeRegain(source.regain, partial);
    if (!partial || Object.keys(regain).length) result.regain = regain;
  }

  for (const key of ["charges", "blessings", "heroStacks", "stacks"]) {
    if (partial && !hasOwn(source, key)) continue;
    const values = normalizeNumberMap(
      source[key],
      key === "heroStacks" ? LIMITS.counter : LIMITS.stack,
    );
    if (!partial && key === "stacks" && !hasOwn(values, "deflection")) {
      values.deflection = 0;
    }
    if (!partial || Object.keys(values).length) result[key] = values;
  }
  for (const key of [
    "statuses",
    "buffs",
    "debuffs",
    "recentFlags",
    "playerStates",
    "playerResources",
    "enemyStates",
  ]) {
    if (partial && !hasOwn(source, key)) continue;
    const values = normalizeBooleanMap(source[key]);
    if (!partial || Object.keys(values).length) result[key] = values;
  }
  return result;
}

export function createDefaultConditionState() {
  return {
    schemaVersion: CONDITION_SCHEMA_VERSION,
    automatic: {
      enemy: {
        type: "normal",
        isBoss: false,
        level: 90,
        armor: 0,
        affliction: 0,
        resistances: { fire: 0, cold: 0, lightning: 0, erosion: 0 },
        distance: 0,
        distanceBand: "",
        witherStacks: 0,
        paralysisStacks: 0,
      },
      reaping: { durationSeconds: 0, eventsPerSecond: 0 },
      regain: { missingLife: 0, missingShield: 0 },
      recent: {
        acted: false,
        killed: false,
        wasHit: false,
        consumed: false,
        moved: false,
        usedWarcry: false,
        evaded: false,
        moveDistanceMeters: 0,
        killStack: 0,
        warcrySkillUseCount: 0,
        spellBurstActivationCount: 0,
        reapingCount: 0,
      },
      charges: {},
      blessings: {},
      statuses: {},
      heroStacks: {},
      stacks: { deflection: 0 },
      buffs: {},
      debuffs: {},
      recentFlags: {},
      playerStates: {},
      playerResources: {},
      enemyStates: {},
    },
    overrides: {},
  };
}

export function normalizeConditionState(input) {
  const source = isRecord(input) ? input : {};
  return {
    schemaVersion: CONDITION_SCHEMA_VERSION,
    automatic: normalizeContext(source.automatic),
    overrides: normalizeContext(source.overrides, true),
  };
}

export function resolveConditionValues(input) {
  const { automatic, overrides } = normalizeConditionState(input);
  return {
    enemy: {
      ...automatic.enemy,
      ...(overrides.enemy ?? {}),
      resistances: {
        ...automatic.enemy.resistances,
        ...(overrides.enemy?.resistances ?? {}),
      },
    },
    reaping: { ...automatic.reaping, ...(overrides.reaping ?? {}) },
    regain: { ...automatic.regain, ...(overrides.regain ?? {}) },
    recent: { ...automatic.recent, ...(overrides.recent ?? {}) },
    charges: { ...automatic.charges, ...(overrides.charges ?? {}) },
    blessings: { ...automatic.blessings, ...(overrides.blessings ?? {}) },
    statuses: { ...automatic.statuses, ...(overrides.statuses ?? {}) },
    heroStacks: { ...automatic.heroStacks, ...(overrides.heroStacks ?? {}) },
    stacks: { ...automatic.stacks, ...(overrides.stacks ?? {}) },
    buffs: { ...automatic.buffs, ...(overrides.buffs ?? {}) },
    debuffs: { ...automatic.debuffs, ...(overrides.debuffs ?? {}) },
    recentFlags: { ...automatic.recentFlags, ...(overrides.recentFlags ?? {}) },
    playerStates: { ...automatic.playerStates, ...(overrides.playerStates ?? {}) },
    playerResources: { ...automatic.playerResources, ...(overrides.playerResources ?? {}) },
    enemyStates: { ...automatic.enemyStates, ...(overrides.enemyStates ?? {}) },
  };
}

function pathSegments(path) {
  if (typeof path !== "string") return [];
  const segments = path.split(".").filter(Boolean);
  return segments.some((segment) => BLOCKED_KEYS.has(segment)) ? [] : segments;
}

function readPath(record, path) {
  const segments = pathSegments(path);
  if (!segments.length) return undefined;
  let value = record;
  for (const segment of segments) {
    if (!isRecord(value) || !hasOwn(value, segment)) return undefined;
    value = value[segment];
  }
  return value;
}

function hasPath(record, path) {
  const segments = pathSegments(path);
  if (!segments.length) return false;
  let value = record;
  for (const segment of segments) {
    if (!isRecord(value) || !hasOwn(value, segment)) return false;
    value = value[segment];
  }
  return true;
}

function requirementIsMet(actual, operator, expected) {
  switch (operator) {
    case "equals":
      return Object.is(actual, expected);
    case "notEquals":
      return !Object.is(actual, expected);
    case "atLeast":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "atMost":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "greaterThan":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "lessThan":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "truthy":
      return Boolean(actual);
    case "falsy":
      return !actual;
    case "includes":
      return (Array.isArray(actual) || typeof actual === "string") && actual.includes(expected);
    default:
      return false;
  }
}

export function isSupportedConditionPath(path) {
  if (SUPPORTED_CONDITION_PATH_SET.has(path)) return true;
  const segments = pathSegments(path);
  return segments.length === 2
    && SUPPORTED_NAMED_CONDITION_PREFIX_SET.has(segments[0])
    && Boolean(segments[1]);
}

export function diagnoseConditions(input, requirements = []) {
  const normalized = normalizeConditionState(input);
  const resolved = resolveConditionValues(normalized);
  const diagnostics = (Array.isArray(requirements) ? requirements : [])
    .filter((requirement) => isRecord(requirement) && typeof requirement.path === "string")
    .map((requirement) => {
      const operator = typeof requirement.operator === "string" ? requirement.operator : "equals";
      const actual = readPath(resolved, requirement.path);
      const forced = hasPath(normalized.overrides, requirement.path);
      const pathSupported = isSupportedConditionPath(requirement.path);
      const operatorSupported = CONDITION_OPERATORS.has(operator);
      const supported = pathSupported && operatorSupported;
      return {
        id: typeof requirement.id === "string" ? requirement.id : requirement.path,
        label: typeof requirement.label === "string" ? requirement.label : "",
        path: requirement.path,
        operator,
        expected: requirement.expected,
        actual,
        satisfied: supported && requirementIsMet(actual, operator, requirement.expected),
        supported,
        ...(!supported && {
          unsupportedReason: pathSupported
            ? "unsupported-condition-operator"
            : "unsupported-condition-path",
        }),
        forced,
        source: forced ? "override" : "automatic",
      };
    });

  return {
    resolved,
    diagnostics,
    active: diagnostics.filter(({ satisfied }) => satisfied),
    unmet: diagnostics.filter(({ satisfied }) => !satisfied),
    unsupported: diagnostics.filter(({ supported }) => !supported),
    forced: diagnostics.filter(({ forced }) => forced),
  };
}

export function cloneConditionState(input) {
  return normalizeConditionState(input);
}
