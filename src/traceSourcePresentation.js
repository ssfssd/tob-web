export const TRACE_SOURCE_LABEL_AUTHORITY = Object.freeze({
  APP_I18N: "app-i18n",
  CATALOG_LOCALIZED: "catalog-localized",
  RUNTIME_LOCALIZED: "runtime-localized",
  TLIDB_EXACT_LOCALE: "tlidb-exact-locale",
  UNVERIFIED: "unverified",
});

const VERIFIED_AUTHORITIES = new Set([
  TRACE_SOURCE_LABEL_AUTHORITY.APP_I18N,
  TRACE_SOURCE_LABEL_AUTHORITY.CATALOG_LOCALIZED,
  TRACE_SOURCE_LABEL_AUTHORITY.RUNTIME_LOCALIZED,
  TRACE_SOURCE_LABEL_AUTHORITY.TLIDB_EXACT_LOCALE,
]);

export function presentTraceSourceLabel({
  locale,
  sourceLabel,
  unavailableLabel,
  authority = TRACE_SOURCE_LABEL_AUTHORITY.UNVERIFIED,
} = {}) {
  const fallback = typeof unavailableLabel === "string" ? unavailableLabel.trim() : "";
  const label = typeof sourceLabel === "string" ? sourceLabel.trim() : "";
  if (!label) return fallback;
  if (locale === "ko" && !VERIFIED_AUTHORITIES.has(authority)) return fallback;
  return label;
}
