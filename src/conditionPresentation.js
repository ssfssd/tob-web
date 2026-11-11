const CONDITION_OPERATOR_LABELS = Object.freeze({
  equals: "=",
  notEquals: "≠",
  atLeast: "≥",
  atMost: "≤",
  greaterThan: ">",
  lessThan: "<",
  includes: "∋",
});

function normalizedLocale(locale) {
  return locale === "en" ? "en" : "ko";
}

export function formatConditionEvidenceValue(locale, value) {
  const normalized = normalizedLocale(locale);
  if (value === true) return normalized === "ko" ? "켜짐" : "On";
  if (value === false) return normalized === "ko" ? "꺼짐" : "Off";
  if (value === undefined) return normalized === "ko" ? "값 없음" : "No value";
  if (typeof value === "number") {
    return new Intl.NumberFormat(normalized === "ko" ? "ko-KR" : "en-US", {
      maximumFractionDigits: 4,
    }).format(value);
  }
  return String(value ?? "");
}

export function formatConditionDiagnostic(locale, diagnostic = {}) {
  const normalized = normalizedLocale(locale);
  const actual = formatConditionEvidenceValue(normalized, diagnostic.actual);
  if (diagnostic.operator === "truthy" || diagnostic.operator === "falsy") {
    const expected = diagnostic.operator === "truthy"
      ? normalized === "ko" ? "켜짐" : "on"
      : normalized === "ko" ? "꺼짐" : "off";
    return normalized === "ko"
      ? `현재 ${actual} · 조건 ${expected}`
      : `Actual ${actual} · condition ${expected}`;
  }
  const operator = CONDITION_OPERATOR_LABELS[diagnostic.operator] ?? String(diagnostic.operator ?? "");
  const expected = formatConditionEvidenceValue(normalized, diagnostic.expected);
  return `${actual} ${operator} ${expected}`.trim();
}
