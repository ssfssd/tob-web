import { presentGameText } from "./gameTextPresentation.js";

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  }
  return value;
}

export function tlidbPageSlug(value) {
  try {
    const url = new URL(String(value ?? ""));
    if (url.hostname !== "tlidb.com" && !url.hostname.endsWith(".tlidb.com")) return "";
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");
  } catch {
    return "";
  }
}

function recordLocales(record) {
  return record?.locales && typeof record.locales === "object" ? record.locales : record;
}

function localePayload(record, locale) {
  const locales = recordLocales(record);
  return locales?.[locale] && typeof locales[locale] === "object" ? locales[locale] : null;
}

function payloadField(payload, field) {
  if (!payload || typeof payload !== "object") return undefined;
  if (Object.hasOwn(payload, field)) return payload[field];
  if (payload.fields && Object.hasOwn(payload.fields, field)) return payload.fields[field];
  return undefined;
}

function firstText(payload, fields) {
  for (const field of fields) {
    const value = payloadField(payload, field);
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function unavailableLocaleText(locale) {
  return locale === "ko" ? "한국어 원문 미제공" : "Localized source unavailable";
}

function addEntries(target, source, kind) {
  for (const [key, value] of Object.entries(source ?? {})) {
    if (Object.hasOwn(target, key) && JSON.stringify(target[key]) !== JSON.stringify(value)) {
      throw new Error(`Conflicting TLIDB ${kind}: ${key}`);
    }
    target[key] = value;
  }
}

export function createRuntimeLocaleRegistry(...catalogs) {
  const records = {};
  const refs = {};
  for (const catalog of catalogs.filter(Boolean)) {
    addEntries(records, catalog.records, "record");
    addEntries(refs, catalog.refs, "ref");
  }
  return Object.freeze({ records: Object.freeze(records), refs: Object.freeze(refs) });
}

export function resolveRuntimeLocaleRef(registry, refOrPath) {
  if (typeof refOrPath !== "string" || !refOrPath) return "";
  if (Object.hasOwn(registry?.records ?? {}, refOrPath)) return refOrPath;
  return registry?.refs?.[refOrPath] ?? "";
}

export function getRuntimeLocalePayload(registry, refOrPath, locale) {
  const localeRef = resolveRuntimeLocaleRef(registry, refOrPath);
  if (!localeRef) return null;
  const record = registry.records[localeRef];
  return localePayload(record, locale) ?? localePayload(record, "cn") ?? null;
}

export function getExactRuntimeLocalePayload(registry, refOrPath, locale) {
  const localeRef = resolveRuntimeLocaleRef(registry, refOrPath);
  if (!localeRef) return null;
  const record = registry.records[localeRef];
  const direct = localePayload(record, locale);
  if (direct) return direct;

  const exactSourceRefs = record?.tlidbEvidence?.literalTextMatchRefs;
  if (!Array.isArray(exactSourceRefs) || exactSourceRefs.length !== 1) return null;
  const exactSourceRecord = registry.records[exactSourceRefs[0]];
  return exactSourceRecord ? localePayload(exactSourceRecord, locale) : null;
}

export function getRuntimeDisplayLocalePayload(registry, refOrPath, locale) {
  const exact = getExactRuntimeLocalePayload(registry, refOrPath, locale);
  if (exact) return exact;
  const localeRef = resolveRuntimeLocaleRef(registry, refOrPath);
  if (!localeRef) return null;
  const record = registry.records[localeRef];
  if (record?.localeAuthority !== "tlidb-current-ss13-semantic-template") return null;
  const semantic = record?.semanticLocales?.[locale];
  return semantic && typeof semantic === "object" ? semantic : null;
}

export function getRuntimeLocaleField(registry, refOrPath, locale, field, fallback = "") {
  const localeRef = resolveRuntimeLocaleRef(registry, refOrPath);
  if (!localeRef) return presentGameText(fallback, { locale });
  const localized = getRuntimeDisplayLocalePayload(registry, localeRef, locale);
  const localizedValue = payloadField(localized, field);
  if (localizedValue !== undefined && localizedValue !== null && localizedValue !== "") {
    return presentGameText(localizedValue, { locale });
  }
  return unavailableLocaleText(locale);
}

export function getRuntimeLocaleText(registry, refOrPath, locale, fallback = "") {
  const payload = getRuntimeDisplayLocalePayload(registry, refOrPath, locale);
  const text = firstText(payload, ["text", "name", "title", "description", "overview", "detail"]);
  if (text) return presentGameText(text, { locale });
  const localeRef = resolveRuntimeLocaleRef(registry, refOrPath);
  return localeRef ? unavailableLocaleText(locale) : presentGameText(fallback, { locale });
}

export function renderRuntimeLocaleText(registry, refOrPath, locale, values = {}, fallback = "") {
  const payload = getRuntimeDisplayLocalePayload(registry, refOrPath, locale);
  const template = firstText(payload, ["renderTemplate", "text", "description", "detail"])
    || getRuntimeLocaleText(registry, refOrPath, locale, fallback);
  const rendered = String(template).replace(
    /\{\{([^{}]+)\}\}|\{([^{}]+)\}/g,
    (placeholder, doubleKey, singleKey) => {
      const key = doubleKey ?? singleKey;
      return Object.hasOwn(values, key) ? String(values[key]) : placeholder;
    },
  );
  const complete = /\{\{[^{}]+\}\}|\{[^{}]+\}/.test(rendered)
    ? getRuntimeLocaleText(registry, refOrPath, locale, fallback)
    : rendered;
  return presentGameText(complete, { locale });
}

function runtimePathSegments(path, datasetName) {
  const value = String(path);
  const pointerPrefixes = [
    `/datasets/${datasetName}/`,
    `datasets/${datasetName}/`,
    `/${datasetName}/`,
    `${datasetName}/`,
    `${datasetName}#/`,
  ];
  const pointerPrefix = pointerPrefixes.find((prefix) => value.startsWith(prefix));
  if (pointerPrefix) {
    return value.slice(pointerPrefix.length).split("/").filter(Boolean).map((segment) => {
      const decoded = segment.replaceAll("~1", "/").replaceAll("~0", "~");
      return /^\d+$/.test(decoded) ? Number(decoded) : decoded;
    });
  }
  if (!value.startsWith(`${datasetName}.`)) return [];
  const source = value.slice(datasetName.length + 1);
  const segments = [];
  const re = /(?:^|\.)([^.[\]]+)|\[(\d+)\]/g;
  let match;
  while ((match = re.exec(source))) {
    segments.push(match[1] ?? Number(match[2]));
  }
  return segments;
}

export function attachRuntimeLocaleRefs(datasetName, dataset, refs = {}) {
  const copy = cloneValue(dataset);
  for (const [path, localeRef] of Object.entries(refs)) {
    const segments = runtimePathSegments(path, datasetName);
    if (!segments.length) continue;
    let target = copy;
    for (const segment of segments) {
      target = target?.[segment];
      if (target === undefined || target === null) break;
    }
    if (!target || typeof target !== "object") {
      throw new Error(`TLIDB locale ref path does not resolve to an object: ${path}`);
    }
    if (target.localeRef && target.localeRef !== localeRef) {
      throw new Error(`Conflicting TLIDB locale ref at runtime path: ${path}`);
    }
    target.localeRef = localeRef;
  }
  return copy;
}
