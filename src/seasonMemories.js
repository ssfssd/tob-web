import { SS14_MEMORIES } from "./data/ss14Memories.generated.js";
import { normalizeHeroMemoryTypeId } from "./heroMemoryIdentity.js";
import { bindMemoryRolls, validMemoryRollValue } from "./seasonMemoryRolls.js";

const safeKo = (text) => typeof text === "string" && /[가-힣]/u.test(text) && !/\p{Script=Han}/u.test(text) ? text : "한국어 원문 미제공";
function resolve(ref, type, data) {
  const page = ref && data.pages[`en/${ref.slug}`];
  const owner = data.pages[`en/${type.sourcePath}`]?.name;
  const matches = page?.rows.filter((r) => r.id === ref.modifierId && r.source === owner) ?? [];
  const row = matches.length === 1 && page.season === "SS14" ? matches[0] : null;
  const ko = row && data.pages[`ko/${ref.slug}`]?.rows.find((r) => r.id === row.id);
  return { page, row, ko };
}

// Historical structure supplies identity only. Enhancement and revival values
// are not interpolated; only current table rows enter the numeric parser.
export function seasonMemoryRows(build, data = SS14_MEMORIES) {
  const result = []; const memories = Array.isArray(build?.hero?.memories) ? build.hero.memories : [];
  const instances = memories.filter(Boolean).map((m) => m.instanceId);
  for (const [index, memory] of memories.entries()) {
    if (!memory) continue;
    const type = data.types.find((t) => t.flatCatalogId === normalizeHeroMemoryTypeId(memory.memoryTypeId));
    const path = `hero.memories.${index}`;
    const item = { id: type?.flatCatalogId, tlidbText: { ko: { name: safeKo(data.pages[`ko/${type?.sourcePath}`]?.name) } } };
    const push = (suffix, ref, reason = "", extra = {}) => {
      const { page, row, ko } = type ? resolve(ref, type, data) : {};
      result.push({ path: `${path}.${suffix}`, item, page, record: row ? `data-modifier-id:${row.id}` : null,
        text: row?.text ?? "", koText: { name: item.tlidbText.ko.name, detail: ko?.text },
        reason: reason || (!row ? "SS14 추억의 동일 옵션 ID·소속 원문 미확보" : ""), ...extra });
    };
    const fixed = memory.fixedAffixIds ?? []; const random = memory.randomAffixIds ?? [];
    const invalid = !type || index > 2 || data.types.indexOf(type) !== index
      || !memory.instanceId || instances.filter((id) => id === memory.instanceId).length !== 1
      || !Number.isInteger(memory.enhancement) || memory.enhancement < 1 || memory.enhancement > 50
      || !Array.isArray(fixed) || !Array.isArray(random) || fixed.length > 2 || random.length > 2
      || new Set([...fixed, ...random]).size !== fixed.length + random.length;
    if (invalid || memory.profitLoss || memory.revivalAffixId || memory.valueModifierPercent) {
      push("unsupported", null, invalid ? "추억 종류·칸·강화·옵션 개수·중복 선택을 확인하세요."
        : "부활·영고성쇠·추가 배율이 적용된 추억은 SS14 변환 수치 미검증으로 합산하지 않습니다.");
      continue;
    }
    const base = type.baseGroups.find((g) => g.id === memory.baseAttributeId);
    const options = (base?.rows ?? []).map((ref) => ({ ref, ...resolve(ref, type, data) })).filter((r) => r.row);
    const binding = build.ss14Inputs?.memoryBases?.[index];
    const selected = options.find((o) => Number(o.row.id) === binding?.modifierId);
    const bound = selected && binding.instanceId === memory.instanceId && binding.baseAttributeId === base.id
      && binding.enhancement === memory.enhancement && binding.sourcePageSha256 === selected.page.sourcePageSha256;
    push("base", bound ? selected.ref : base?.rows[0], bound ? "" : "강화 환산은 추정하지 않습니다. SS14 현재 기본 옵션 수치를 직접 확인하세요.", {
      koText: { name: item.tlidbText.ko.name, detail: bound ? selected.ko?.text : "기본 옵션 수치 확인 필요" },
      memoryControl: options.length ? { key: String(index), instanceId: memory.instanceId, baseAttributeId: base.id,
        enhancement: memory.enhancement, value: bound ? binding.modifierId : "",
        options: options.map((o) => ({ value: Number(o.row.id), label: safeKo(o.ko?.text), sourcePageSha256: o.page.sourcePageSha256 })) } : null,
    });
    for (const [kind, ids] of [["fixed", fixed], ["random", random]]) for (const id of ids) {
      const group = type.affixGroups.find((g) => g.kind === kind && g.id === id);
      const config = memory.affixRolls?.[id];
      const tier = group?.tiers.find((t) => t.tierId === config?.tierId);
      // Legacy roll order is not a source-backed mapping to current ranges.
      const resolved = resolve(tier?.ref, type, data);
      const ranged = resolved.row?.rollFragments?.some((f) => /[()]/u.test(f));
      if (ranged) {
        const bound = bindMemoryRolls({ ...resolved, memory, index, id, tierId: tier.tierId, kind, bindings: build.ss14Inputs?.memoryRolls });
        push(`${kind}.${id}`, tier.ref, bound.reason, { text: bound.text, memoryRollControls: bound.controls,
          koText: { name: item.tlidbText.ko.name, detail: bound.koText } });
      } else push(`${kind}.${id}`, tier?.ref, Object.keys(config?.rolls ?? {}).length ? "추억 범위 선택값의 SS14 수치 연결 미검증" : "");
    }
    if (memory.traitLevelBonus) push("trait-level", null, "추억의 히어로 특성 레벨 보정은 자동 가산하지 않습니다. SS14 특성의 최종 단계를 별도로 확인하세요.");
  }
  if (build?.hero?.revivalMemory) result.push({ path: "hero.revivalMemory", reason: "SS14 부활 추가 칸과 배율 계산 미검증" });
  return result;
}

export function validSeasonMemoryRolls(build) {
  const bindings = build?.ss14Inputs?.memoryRolls;
  if (bindings === undefined) return true;
  if (!bindings || typeof bindings !== "object" || Array.isArray(bindings)) return false;
  const controls = seasonMemoryRows(build).flatMap((r) => r.memoryRollControls ?? []);
  return Object.entries(bindings).every(([key, b]) => {
    if (!/^hero\.memories\.[0-2]\.(fixed|random)\.[\w-]+:roll_[1-9]\d*$/u.test(key)
      || !b || typeof b !== "object" || typeof b.instanceId !== "string" || typeof b.affixId !== "string"
      || typeof b.tierId !== "string" || !Number.isInteger(b.modifierId) || b.modifierId <= 0
      || !/^[a-f0-9]{64}$/u.test(b.sourcePageSha256) || typeof b.value !== "number" || !Number.isFinite(b.value)) return false;
    const control = controls.find((c) => c.key === key && c.sourcePageSha256 === b.sourcePageSha256 && c.modifierId === b.modifierId);
    return !control || validMemoryRollValue(control, b.value);
  });
}

export function validSeasonMemoryBases(build) {
  const bindings = build?.ss14Inputs?.memoryBases;
  if (bindings === undefined) return true;
  if (!bindings || typeof bindings !== "object" || Array.isArray(bindings)) return false;
  return Object.entries(bindings).every(([key, b]) => /^[0-2]$/u.test(key) && b && typeof b === "object"
    && typeof b.instanceId === "string" && typeof b.baseAttributeId === "string"
    && Number.isInteger(b.modifierId) && b.modifierId > 0 && Number.isInteger(b.enhancement)
    && b.enhancement >= 1 && b.enhancement <= 50 && /^[a-f0-9]{64}$/u.test(b.sourcePageSha256));
}
