import { containsHanScript } from "./gameTextPresentation.js";

const TRANSLATABLE_GEAR_LOCALE_STATUS = /^(?:exact|exact-structural|localized-current-tlidb-template)$/u;
const TEMPLATE_PLACEHOLDER = /\{\{([^{}]+)\}\}/gu;
const UNRESOLVED_TEMPLATE_PLACEHOLDER = /\{\{[^{}]+\}\}/u;
const NUMBER_TOKEN_PATTERN = "([+\\-−]?(?:\\d+(?:[.,]\\d+)*|\\.\\d+))";
const translationIndexCache = new WeakMap();

function localePayload(record, locale) {
  return record?.[locale] ?? record?.locales?.[locale] ?? null;
}

function unavailableLocaleText(locale) {
  return locale === "ko" ? "한국어 원문 미제공" : "Localized source unavailable";
}

function normalizeLineEndings(value) {
  return String(value ?? "").replace(/\r\n|\r/gu, "\n");
}

function canonicalTemplateText(value) {
  return normalizeLineEndings(value).replace(/\s+/gu, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function compileTemplate(sourceTemplate, localizedTemplate) {
  const canonicalSource = canonicalTemplateText(sourceTemplate);
  const captureKeys = [];
  let pattern = "^";
  let cursor = 0;
  for (const match of canonicalSource.matchAll(TEMPLATE_PLACEHOLDER)) {
    pattern += escapeRegExp(canonicalSource.slice(cursor, match.index));
    pattern += NUMBER_TOKEN_PATTERN;
    captureKeys.push(match[1]);
    cursor = match.index + match[0].length;
  }
  if (!captureKeys.length) return null;
  pattern += `${escapeRegExp(canonicalSource.slice(cursor))}$`;
  const localizedKeys = [...String(localizedTemplate).matchAll(TEMPLATE_PLACEHOLDER)]
    .map((match) => match[1]);
  if (localizedKeys.some((key) => !captureKeys.includes(key))) return null;
  return {
    pattern: new RegExp(pattern, "u"),
    captureKeys,
    localizedTemplate: String(localizedTemplate).trim(),
  };
}

function addCandidate(candidates, sourceText, localizedText) {
  const values = candidates.get(sourceText) ?? new Set();
  values.add(localizedText);
  candidates.set(sourceText, values);
}

function createTranslationIndex(registry, locale) {
  let localeIndexes = translationIndexCache.get(registry);
  if (!localeIndexes) {
    localeIndexes = new Map();
    translationIndexCache.set(registry, localeIndexes);
  }
  if (localeIndexes.has(locale)) return localeIndexes.get(locale);

  const literalCandidates = new Map();
  const templateCandidates = new Map();
  for (const record of Object.values(registry?.records ?? {})) {
    if (!TRANSLATABLE_GEAR_LOCALE_STATUS.test(String(record?.status ?? ""))) continue;
    const sourcePayload = localePayload(record, "cn");
    const localizedPayload = localePayload(record, locale);
    const sourceText = sourcePayload?.text;
    const localizedText = localizedPayload?.text;
    if (typeof sourceText === "string" && typeof localizedText === "string") {
      const sourceKey = normalizeLineEndings(sourceText).trim();
      const exactLocalizedText = normalizeLineEndings(localizedText).trim();
      if (sourceKey && exactLocalizedText && !containsHanScript(exactLocalizedText)) {
        addCandidate(literalCandidates, sourceKey, exactLocalizedText);
      }
    }

    const sourceTemplate = sourcePayload?.renderTemplate;
    const localizedTemplate = localizedPayload?.renderTemplate;
    if (
      typeof sourceTemplate === "string"
      && typeof localizedTemplate === "string"
      && !containsHanScript(localizedTemplate)
    ) {
      const templateKey = `${canonicalTemplateText(sourceTemplate)}\u0000${localizedTemplate.trim()}`;
      templateCandidates.set(templateKey, { sourceTemplate, localizedTemplate });
    }
  }

  const literals = new Map(
    [...literalCandidates].map(([sourceText, localizedTexts]) => [
      sourceText,
      localizedTexts.size === 1 ? [...localizedTexts][0] : null,
    ]),
  );
  const templates = [...templateCandidates.values()]
    .map(({ sourceTemplate, localizedTemplate }) => compileTemplate(sourceTemplate, localizedTemplate))
    .filter(Boolean);
  const index = { literals, templates };
  localeIndexes.set(locale, index);
  return index;
}

function renderTemplateMatch(template, match) {
  const values = new Map();
  for (const [index, key] of template.captureKeys.entries()) {
    const value = match[index + 1];
    if (values.has(key) && values.get(key) !== value) return "";
    values.set(key, value);
  }
  const rendered = template.localizedTemplate.replace(
    TEMPLATE_PLACEHOLDER,
    (placeholder, key) => values.get(key) ?? placeholder,
  );
  return UNRESOLVED_TEMPLATE_PLACEHOLDER.test(rendered) || containsHanScript(rendered) ? "" : rendered;
}

function resolveCore(index, sourceText) {
  const sourceKey = normalizeLineEndings(sourceText).trim();
  if (index.literals.has(sourceKey)) {
    const localizedText = index.literals.get(sourceKey);
    return localizedText ? { text: localizedText, complete: true } : { text: "", complete: false };
  }

  const canonicalSource = canonicalTemplateText(sourceKey);
  const candidates = new Set();
  for (const template of index.templates) {
    const match = template.pattern.exec(canonicalSource);
    if (!match) continue;
    const rendered = renderTemplateMatch(template, match);
    if (rendered) candidates.add(rendered);
  }
  return candidates.size === 1
    ? { text: [...candidates][0], complete: true }
    : { text: "", complete: false };
}

function resolveSegment(index, source, locale) {
  if (!containsHanScript(source)) return { text: source, complete: true };
  const leadingWhitespace = source.match(/^\s*/u)?.[0] ?? "";
  const trailingWhitespace = source.match(/\s*$/u)?.[0] ?? "";
  const resolved = resolveCore(index, source);
  return resolved.complete
    ? { text: `${leadingWhitespace}${resolved.text}${trailingWhitespace}`, complete: true }
    : { text: `${leadingWhitespace}${unavailableLocaleText(locale)}${trailingWhitespace}`, complete: false };
}

export function resolveCustomAffixText(registry, value, locale = "ko") {
  const source = String(value ?? "");
  if (!containsHanScript(source)) return { text: source, complete: true };
  const index = registry && typeof registry === "object"
    ? createTranslationIndex(registry, locale)
    : { literals: new Map(), templates: [] };
  const wholeText = resolveSegment(index, source, locale);
  if (wholeText.complete) return wholeText;
  if (!/(?:\r\n|\r|\n)/u.test(source)) return wholeText;

  let complete = true;
  const text = source
    .split(/(\r\n|\r|\n)/u)
    .map((part) => {
      if (/^(?:\r\n|\r|\n)$/u.test(part)) return part;
      const resolved = resolveSegment(index, part, locale);
      complete &&= resolved.complete;
      return resolved.text;
    })
    .join("");
  return { text, complete };
}

export function presentCustomAffixText(registry, value, locale = "ko") {
  return resolveCustomAffixText(registry, value, locale).text;
}
