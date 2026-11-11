export const HAN_SCRIPT_PATTERN = /(?:\p{Unified_Ideograph}|[々〇\uF900-\uFAFF]|[\u{2F800}-\u{2FA1F}])/u;
const UNRESOLVED_TLIDB_TOKEN_PATTERN = /#skillstone,\s*\d+,\s*affix#|\$[+-]?sp\d+\$/u;

export function containsHanScript(value) {
  return HAN_SCRIPT_PATTERN.test(String(value ?? ""));
}

function textLines(value) {
  const lines = [];
  for (const match of value.matchAll(/([^\r\n]*)(\r\n|\r|\n|$)/gu)) {
    if (!match[0]) break;
    lines.push({ text: match[1], newline: match[2] });
  }
  return lines;
}

function localizeTlidbPageChrome(value, locale) {
  if (locale !== "ko" || !/[\r\n]/u.test(value)) return value;
  return textLines(value)
    .map((line) => {
      const text = line.text === "Simple"
        ? "요약"
        : line.text === "Details"
          ? "상세"
          : line.text;
      return `${text}${line.newline}`;
    })
    .join("");
}

export function presentGameText(
  value,
  { locale = "ko", unavailableText, partialUnavailableText, optional = false } = {},
) {
  if (typeof value !== "string") return value;
  // Decode source formatting only in the display copy; never alter source or calculation data.
  const localizedValue = localizeTlidbPageChrome(value.replaceAll("\\n", "\n"), locale);
  const hasUnresolvedToken = UNRESOLVED_TLIDB_TOKEN_PATTERN.test(localizedValue);
  if (!containsHanScript(localizedValue) && !hasUnresolvedToken) return localizedValue;

  const lines = textLines(localizedValue);
  const newline = lines.find((line) => line.newline)?.newline ?? "\n";
  const safeText = lines
    .filter((line) => !containsHanScript(line.text) && !UNRESOLVED_TLIDB_TOKEN_PATTERN.test(line.text))
    .map((line) => `${line.text}${line.newline}`)
    .join("");
  // Even optional effect descriptions must disclose an unresolved source token.
  if (optional && !hasUnresolvedToken) return safeText.trim() ? safeText : "";
  const placeholder = unavailableText
    ?? (locale === "ko" ? "한국어 원문 미제공" : "Localized source unavailable");
  if (!safeText.trim()) return placeholder;
  const partialPlaceholder = partialUnavailableText
    ?? unavailableText
    ?? (locale === "ko" ? "한국어 원문 일부 미제공" : "Localized source partially unavailable");
  return /(?:\r\n|\n|\r)$/u.test(safeText)
    ? `${safeText}${partialPlaceholder}`
    : `${safeText}${newline}${partialPlaceholder}`;
}
