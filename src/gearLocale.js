import {
  getRuntimeLocaleText,
  renderRuntimeLocaleText,
  resolveRuntimeLocaleRef,
} from "./runtimeLocale.js";

const SOURCE_ONLY_STATUS = /(?:absent|conflict|source-only|preserved-cn)/i;

function isIsolatedCurrentSourceRef(registry, refOrPath) {
  const limitation = registry?.metadata?.sourceLimitations?.unresolvedCurrentSourceRefs;
  return limitation?.refLookup?.[refOrPath] === true
    || limitation?.sourceRecordLookup?.[refOrPath] === true;
}

function isolatedCurrentSourceRefMessage(registry, refOrPath, locale) {
  if (!isIsolatedCurrentSourceRef(registry, refOrPath)) return "";
  const limitation = registry?.metadata?.sourceLimitations?.unresolvedCurrentSourceRefs;
  return limitation?.userMessage?.[locale]
    ?? (locale === "ko" ? "현재 출처 참조 미연결" : "Current source reference unresolved");
}

export function getGearRecordLocale(registry, refOrPath, requestedLocale) {
  if (isIsolatedCurrentSourceRef(registry, refOrPath)) return null;
  const localeRef = resolveRuntimeLocaleRef(registry, refOrPath);
  const status = localeRef ? registry?.records?.[localeRef]?.status : "";
  return SOURCE_ONLY_STATUS.test(String(status ?? "")) ? null : requestedLocale;
}

export function getGearLocaleText(registry, refOrPath, locale, fallback = "") {
  const unresolvedMessage = isolatedCurrentSourceRefMessage(registry, refOrPath, locale);
  if (unresolvedMessage) return unresolvedMessage;
  const recordLocale = getGearRecordLocale(registry, refOrPath, locale);
  if (!recordLocale) return locale === "ko" ? "한국어 원문 미제공" : "Localized source unavailable";
  return getRuntimeLocaleText(
    registry,
    refOrPath,
    recordLocale,
    fallback,
  );
}

export function renderGearLocaleText(registry, refOrPath, locale, values = {}, fallback = "") {
  const unresolvedMessage = isolatedCurrentSourceRefMessage(registry, refOrPath, locale);
  if (unresolvedMessage) return unresolvedMessage;
  const recordLocale = getGearRecordLocale(registry, refOrPath, locale);
  if (!recordLocale) return locale === "ko" ? "한국어 원문 미제공" : "Localized source unavailable";
  return renderRuntimeLocaleText(
    registry,
    refOrPath,
    recordLocale,
    values,
    fallback,
  );
}
