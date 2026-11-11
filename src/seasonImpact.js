import { getSelectedItems, normalizeBuild } from "./engine.js";
import { SS14_CARDS } from "./data/ss14Cards.generated.js";
import { SS14_SUPPORTS } from "./data/ss14Supports.generated.js";
import { compareSeasonSkillValues } from "./seasonCalculation.js";

const normalizedText = (value) => String(value ?? "").replace(/\s+/gu, " ").trim();

const currentPreview = { generatedAt: SS14_SUPPORTS.generatedAt,
  records: { ...SS14_CARDS.records, ...SS14_SUPPORTS.records } };

export function buildSeasonImpact(build, preview = currentPreview) {
  const normalized = normalizeBuild(build);
  const selected = new Map(getSelectedItems(normalized).map((item) => [item.id, item]));
  // Unknown saved IDs must not silently disappear when normalization drops them.
  for (const ids of Object.values(build?.selections ?? {})) {
    if (Array.isArray(ids)) for (const id of ids) if (id && !selected.has(id)) selected.set(id, { id });
  }
  const items = [...selected.values()].map((item) => {
    const before = item.tlidbText?.ko;
    const after = preview.records?.[item.id];
    const beforeVerified = normalized.patchSnapshot.season === "SS13"
      && before?.sourcePageVersion === "SS13" && before?.sourceFieldStatus?.detail === "exact"
      && typeof before.detail === "string" && !/[\p{Script=Han}]/u.test(before.detail);
    const afterVerified = after?.season === "SS14" && after?.status === "collected-preview" && after.koreanTextVerified;
    const comparable = beforeVerified && afterVerified && before.sourceRecordKey === after.sourceRecordKey;
    const changed = comparable && (normalizedText(before.detail) !== normalizedText(after.detail) || normalizedText(before.name) !== normalizedText(after.name));
    return { id: item.id, name: before?.name && !/[\p{Script=Han}]/u.test(before.name) ? before.name : "한국어 이름 미제공",
      status: comparable ? changed ? "text-changed" : "text-unchanged" : "unverified",
      before: beforeVerified ? { text: before.detail, sourceUrl: before.sourceUrl, hash: before.sourcePageSha256 } : null,
      after: afterVerified ? { text: after.detail, sourceUrl: after.sourceUrl, hash: after.sourcePageSha256, fetchedAt: after.fetchedAt } : null,
      reason: comparable ? null : !afterVerified ? "SS14 한국어 카드 미확보·미검증" : "동일 항목의 SS13 원문 대조 미완료" };
  });
  return { schemaVersion: 1, buildId: normalized.id, buildKey: JSON.stringify(normalized), generatedAt: preview.generatedAt,
    status: "text-evidence-only", sourceSeason: normalized.patchSnapshot.season, targetSeason: "SS14", items,
    counts: { total: items.length, changed: items.filter((item) => item.status === "text-changed").length,
      unchanged: items.filter((item) => item.status === "text-unchanged").length,
      unverified: items.filter((item) => item.status === "unverified").length },
    metrics: [], calculationReady: false, skillComparison: compareSeasonSkillValues(build),
    limitations: ["원문 변화는 빌드 전체 성능 변화와 다릅니다. 계산이 가능한 스킬 자체 수치는 별도 표에서 확인하세요.",
      "선택 항목의 카드만 대조합니다. 제작·히어로 특성·재능 경로와 신규·삭제 콘텐츠는 별도 검증이 필요합니다."] };
}
