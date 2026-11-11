import {
  HADES_DIVINITY_SHAPE_METADATA,
  autoPlaceSlate,
  canPlaceSlate,
  createDivinityBoard,
  deleteSlateInstance,
  flipPlacedSlateHorizontal,
  flipPlacedSlateVertical,
  isCurrentHadesShapeInstance,
  isFixedOrientationSlateInstance,
  moveSlate,
  placeSlate,
  rotatePlacedSlate,
  unplaceSlate,
} from "./divinityBoardModel.js";
import {
  DIVINITY_GODS,
  addDivinitySlateToBoard,
  canAddDivinitySlate,
  createDivinitySlateInstance,
  diagnoseHadesSelections,
  exportDivinitySlateBoard,
  getDivinitySlateActiveSlotDefinitions,
  getDivinitySlateTemplate,
  getVisibleDivinitySlateTemplates,
  importDivinitySlateBoard,
  isDivinityShapeAllowed,
  isDivinitySlotSelectionEligible,
  projectDivinitySlateOverview,
  resolveAdjacentDivinityCopies,
  setDivinitySlotSelection,
} from "./divinitySlateModel.js";
import { presentGameText as presentSourceGameText } from "./gameTextPresentation.js";
import { HADES_KOREAN_PRESENTATION } from "./hadesKoreanPresentation.js";
import { getCurrentKoreanGameTextSupplement } from "./currentKoreanGameTextSupplement.js";
import { t } from "./i18n.js";

const DIVINITY_EDITOR_EN_COPY = Object.freeze({
  "위쪽": "Up",
  "왼쪽": "Left",
  "아래쪽": "Down",
  "오른쪽": "Right",
  "모든 방향": "All directions",
  "인접 석판": "Adjacent Slate",
  "복사": "Copy",
  "인접 석판 복사": "Copy adjacent Slate",
  "복사 방향": "Copy direction",
  "고정 옵션": "Locked affix",
  "낙인 재능": "Brand Talent",
  "활성 옵션": "Active affixes",
  "비활성 옵션": "Inactive affixes",
  "신격 적용 상한 초과": "Divinity effect cap exceeded",
  "없음": "None",
  "신격 보드 개요": "Divinity board overview",
  "개요": "Overview",
  "배치된 석판": "Placed Slates",
  "신격 적용 상한은 재능, 고정 효과, 복사 효과 순서와 석판 생성·슬롯 순서로 판정됩니다.": "The Divinity effect cap is resolved by Talent, locked-effect, and copy-effect order, followed by Slate creation and slot order.",
  "석판을 선택한 뒤 방향키로 이동하고 회전 단축키(R)를 누르거나 삭제 키로 제거할 수 있습니다.": "Select a Slate, then use the arrow keys to move it, R to rotate it, or Delete to remove it.",
  "마비 효과 보너스 (%)": "Paralysis Effect Bonus (%)",
  "슬래시 확률 (%)": "Steep Strike Chance (%)",
  "강적": "Elite enemy",
  "적 HP 비율 (%)": "Enemy Life (%)",
  "활성 조건 출처 분기": "Activation-condition source branch",
  "인접·비인접 석판 각각 4개 이상": "At least 4 adjacent and 4 non-adjacent Slates",
  "인접·비인접 석판 각각 정확히 4개": "Exactly 4 adjacent and 4 non-adjacent Slates",
  "저주 효과 수": "Curse Effect count",
  "영약 효과를 받는 소환체": "Minion affected by Elixir",
  "적용 수치": "Applied value",
  "대상 거리(미터)": "Target distance (meters)",
  "주술 스킬 레벨": "Spell Skill Level",
  "봉인된 HP 비율 (%)": "Sealed Life (%)",
  "넉백 거리 증가 (%)": "Knockback Distance Increase (%)",
  "초당 수확 횟수": "Reaping events per second",
  "보유한 소환체 수": "Owned Minion count",
  "최근 횟수": "Recent count",
  "공격 막기 확률 (%)": "Attack Block Chance (%)",
  "주술 막기 확률 (%)": "Spell Block Chance (%)",
  "최근 시전한 자극 또는 실드 스킬 횟수": "Recently cast Empower or Defensive Skill count",
  "적중 시 부식 대미지 중첩 수": "Erosion Damage stacks on hit",
  "조건 충족": "Condition met",
  "신상에 비어 있는 장착 슬롯 있음": "Statue has an empty equipment slot",
  "추방 유형": "Banishment type",
  "추방: 투사 중첩 수": "Banishment: Projection stacks",
  "미입력": "Not set",
  "예": "Yes",
  "아니오": "No",
  "선택 안 함": "None selected",
  "미지정": "Unspecified",
  "계산 입력": "Calculation inputs",
  "현재 자료에서 찾을 수 없는 선택": "Selection unavailable in current data",
  "기본 형상": "Default shape",
  "이전 형상 · 현재 구조 미확인": "Legacy shape · current structure unverified",
  "신 선택": "Select god",
  "인접 복사 미리보기": "Adjacent-copy preview",
  "복사 가능한 인접 항목이 없습니다.": "No copyable adjacent entries.",
  "선택되지 않음": "Not selected",
  "현재 자료에서 찾을 수 없음": "Unavailable in current data",
  "선택 유형이 맞지 않음": "Selection type mismatch",
  "이 칸에 배치할 수 없는 항목": "Entry cannot be placed in this slot",
  "현재 형상에서 사용하지 않는 칸에 선택이 남아 있음": "A selection remains in a slot unused by the current shape",
  "이전 저장 형상이라 현재 구조로 계산하지 않음": "Legacy saved shape is not calculated with the current structure",
  "권위 활성": "Authority active",
  "권위 비활성": "Authority inactive",
  "선택 칸": "Selection slot",
  "형상": "Shape",
  "확인이 필요함": "Review required",
  "가로 좌표": "Horizontal coordinate",
  "세로 좌표": "Vertical coordinate",
  "고정 위치": "Fixed position",
  "가로": "horizontal",
  "세로": "vertical",
  "좌표 적용": "Apply coordinates",
  "명왕 신격은 형상 선택으로 방향과 고정 위치를 바꿉니다.": "Change a Nether King Divinity's direction and fixed position by selecting its shape.",
  "이 석판은 고정 형상이라 회전과 뒤집기를 사용하지 않습니다.": "This Slate has a fixed shape and cannot be rotated or flipped.",
  "회전": "Rotate",
  "수평 뒤집기": "Flip horizontally",
  "수직 뒤집기": "Flip vertically",
  "자동 배치": "Auto-place",
  "배치 해제": "Unplace",
  "로컬 보관함에 저장": "Save to local inventory",
  "보관함에서 삭제": "Delete from inventory",
  "비활성": "Inactive",
  "석판": "Slate",
  "배치됨": "placed",
  "비어 있음": "Empty",
  "석판 라이브러리": "Slate library",
  "보관함에 추가": "Add to inventory",
  "배치 형상·슬롯·복사 규칙의 직접 출처가 없어 배치와 계산은 지원하지 않습니다.": "Placement and calculation are unavailable because no direct source defines the shape, slots, or copy rules.",
  "원문 행에 별도 효과 문구 없음": "No separate effect text in the source row",
  "특수 석판 정보 (읽기 전용)": "Special Slate information (read only)",
  "모두 지우기": "Clear all",
  "6×6 신격 보드": "6×6 Divinity board",
  "석판 보관함": "Slate inventory",
  "석판 데이터 내보내기": "Export Slate data",
  "석판 데이터 가져오기": "Import Slate data",
  "가져오기": "Import",
});

function editorCopy(locale, koreanText) {
  return locale === "en" ? DIVINITY_EDITOR_EN_COPY[koreanText] ?? koreanText : koreanText;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function displayGameText(presenter, value, context = {}) {
  const displayed = typeof presenter === "function"
    ? presenter({ value, ...context })
    : presentSourceGameText(value, {
      locale: context.locale ?? "ko",
      optional: Boolean(context.optional),
    });
  return displayed === undefined || displayed === null ? "" : String(displayed);
}

function localizedHadesTemplateText(templateId, field, locale, fallback) {
  const template = HADES_KOREAN_PRESENTATION.templates?.[templateId];
  const localized = field === "name"
    ? template?.nameByLocale?.[locale]
    : template?.detailByLocale?.[locale];
  return localized ?? fallback;
}

function editorPresenter(locale, presenter) {
  return (input = {}) => {
    const value = localizedHadesTemplateText(
      input.templateId,
      input.field,
      locale,
      input.value,
    );
    return typeof presenter === "function"
      ? presenter({ ...input, value })
      : presentSourceGameText(value, { locale, optional: Boolean(input.optional) });
  };
}

function selectionPresentationContext(candidate, field, optional = false) {
  const itemId = Number.isInteger(candidate?.legacyId)
    ? `slates-divinity-talent-${candidate.legacyId}`
    : String(candidate?.id ?? "").startsWith("hades-")
      ? `slates-${candidate.id}`
      : candidate?.id;
  return {
    itemId,
    categoryId: "slates",
    sourceUrl: candidate?.sourceUrl,
    field,
    optional,
  };
}

function templatePresentationContext(template, field) {
  return {
    categoryId: "slates",
    templateId: template?.id,
    field,
  };
}

function selectionId(selection) {
  return selection?.valueId ?? selection?.id;
}

function slotDefinition(template, slotKey) {
  return template?.slotDefinitions.find((slot) => slot.key === slotKey);
}

function isHadesTemplate(templateOrId) {
  const templateId = typeof templateOrId === "string" ? templateOrId : templateOrId?.id;
  return typeof templateId === "string" && templateId.startsWith("hades_");
}

const COPY_DIRECTION_UI_LABELS = Object.freeze({
  up: "위쪽",
  left: "왼쪽",
  down: "아래쪽",
  right: "오른쪽",
  all: "모든 방향",
});

function copyDirectionUiLabel(direction, suffix = "복사", locale) {
  const directionLabel = COPY_DIRECTION_UI_LABELS[direction] ?? "인접 석판";
  return `${editorCopy(locale, directionLabel)} ${editorCopy(locale, suffix)}`;
}

function slotUiLabel(template, slot, locale) {
  if (isHadesTemplate(template)) {
    const fixed = slot?.key?.match(/^fixed_(\d+)$/u);
    if (fixed) return `${editorCopy(locale, "고정 옵션")} ${fixed[1]}`;
    const imprint = slot?.key?.match(/^imprint_(\d+)$/u);
    if (imprint) return `${editorCopy(locale, "낙인 재능")} ${imprint[1]}`;
  }
  if (slot?.copyRule?.direction) {
    return copyDirectionUiLabel(slot.copyRule.direction, "인접 석판 복사", locale);
  }
  if (slot?.specialEffectOptions?.length > 1) return editorCopy(locale, "복사 방향");
  if (slot?.specialEffectOptions?.length === 1) return editorCopy(locale, "인접 석판 복사");
  return null;
}

function sourceCandidates({ template, instance, slot, divinityCatalog, hadesCatalog, locale = "ko" }) {
  if (slot.copyRule) {
    return [{
      id: slot.key,
      valueId: slot.key,
      valueType: "copy_slot",
      name: slot.label,
      text: slot.label,
      sourceKind: "copy",
      uiLabel: slotUiLabel(template, slot, locale),
    }];
  }
  if (slot.specialEffectOptions) {
    return slot.specialEffectOptions.map((option) => ({
      ...option,
      valueId: option.id,
      valueType: "special_effect",
      sourceKind: "special_effect",
      uiLabel: copyDirectionUiLabel(option.direction, "복사", locale),
    }));
  }

  const source = isHadesTemplate(template)
    ? (slot.key.startsWith("imprint_")
      ? [...new Map([...hadesCatalog, ...divinityCatalog].map((record) => [record.id, record])).values()]
      : hadesCatalog)
    : divinityCatalog;
  return source.filter((selection) => isDivinitySlotSelectionEligible({
    templateId: template.id,
    shapeId: instance.shapeId,
    slotKey: slot.key,
    selection,
    godSlug: instance.godSlug,
  })).map((selection) => ({
    ...selection,
    valueId: selection.id,
    sourceKind: selection.category ?? selection.slotKind ?? selection.valueType,
  }));
}

function partialSourceUnavailableText(locale) {
  return locale === "ko"
    ? "한국어 원문 일부 미제공"
    : "Localized source partially unavailable";
}

function appendPartialSourceStatus(candidate, text, locale) {
  if (candidate?.sourceDetailStatus !== "source-language-mixed") return text;
  if (/한국어 원문 일부 미제공|Localized source partially unavailable/u.test(text)) return text;
  return [text, partialSourceUnavailableText(locale)].filter(Boolean).join(" · ");
}

function mixedSourceSafeText(candidate, locale) {
  const sourceText = locale === "ko"
    ? candidate?.text
    : candidate?.calculationText ?? candidate?.text;
  return presentSourceGameText(sourceText, { locale, optional: true });
}

function optionLabel(candidate, presenter, locale = "ko") {
  if (candidate.uiLabel) return candidate.uiLabel;
  const sourceName = candidate.name || candidate.valueId;
  const name = displayGameText(
    presenter,
    sourceName,
    selectionPresentationContext(candidate, "name"),
  );
  const displayedText = selectionDetail(candidate, presenter, locale);
  return displayedText && displayedText !== name ? `${name} · ${displayedText}` : name;
}

function selectionDetail(candidate, presenter, locale) {
  const supplement = locale === "ko"
    ? getCurrentKoreanGameTextSupplement(candidate, "detail")
    : null;
  const detailSource = supplement?.complete === true && supplement?.presentation === "replace"
    ? supplement.text
    : candidate.text;
  const text = displayGameText(
    presenter,
    detailSource,
    selectionPresentationContext(candidate, "detail", true),
  );
  const safeText = supplement?.complete
    ? text || presentSourceGameText(supplement.text, { locale, optional: true })
    : candidate?.sourceDetailStatus === "source-language-mixed"
      ? text || mixedSourceSafeText(candidate, locale)
      : text;
  return supplement?.complete
    ? safeText
    : appendPartialSourceStatus(candidate, safeText, locale);
}

function renderOverviewAffixList(affixes, state, presenter, locale) {
  return `<section class="divinity-overview-affixes" data-affix-state="${state}">
    <h4>${editorCopy(locale, state === "active" ? "활성 옵션" : "비활성 옵션")}</h4>
    ${affixes.length ? `<ul>${affixes.map((affix) => {
      const sourceName = affix.name ?? affix.valueId ?? affix.id ?? "";
      const structuralCopyLabel = affix.valueType === "special_effect" && affix.direction
        ? copyDirectionUiLabel(affix.direction, "복사", locale)
        : null;
      const name = structuralCopyLabel ?? displayGameText(
        presenter,
        sourceName,
        selectionPresentationContext(affix, "name"),
      );
      const text = structuralCopyLabel ? "" : selectionDetail(affix, presenter, locale);
      return `<li data-affix-kind="${escapeHtml(affix.affixKind)}" data-source-value-id="${escapeHtml(affix.valueId ?? affix.id ?? "")}">
        <strong>${escapeHtml(name)}</strong>
        ${text && text !== name ? `<span>${escapeHtml(text)}</span>` : ""}
        ${affix.reason === "divinity_effect_cap_reached" ? `<small>${editorCopy(locale, "신격 적용 상한 초과")}</small>` : ""}
      </li>`;
    }).join("")}</ul>` : `<p>${editorCopy(locale, "없음")}</p>`}
  </section>`;
}

function renderDivinityOverview(board, divinityCatalog, hadesCatalog, presenter, locale) {
  const overview = projectDivinitySlateOverview(board, {
    talentCatalog: [...divinityCatalog, ...hadesCatalog],
  });
  const instanceById = new Map(board.slateInventory.map((instance) => [instance.instanceId, instance]));
  return `<section class="divinity-editor-overview" data-role="divinity-editor-overview" aria-label="${editorCopy(locale, "신격 보드 개요")}">
    <h3>${editorCopy(locale, "개요")}</h3>
    <div class="divinity-overview-legend">
      <span data-state="active" data-count="${overview.effectiveAffixes.length}"><i aria-hidden="true"></i>${editorCopy(locale, "활성 옵션")} ${overview.effectiveAffixes.length}</span>
      <span data-state="inactive" data-count="${overview.suppressedAffixes.length}"><i aria-hidden="true"></i>${editorCopy(locale, "비활성 옵션")} ${overview.suppressedAffixes.length}</span>
      <span data-state="placed" data-count="${overview.effectivePlacedSlateIds.length}"><i aria-hidden="true"></i>${editorCopy(locale, "배치된 석판")} ${overview.effectivePlacedSlateIds.length}</span>
    </div>
    <section class="divinity-overview-placed" data-role="divinity-placed-slate-list">
      <h4>${editorCopy(locale, "배치된 석판")}</h4>
      ${overview.effectivePlacedSlateIds.length ? `<ul>${overview.effectivePlacedSlateIds.map((instanceId) => {
        const instance = instanceById.get(instanceId);
        const template = getDivinitySlateTemplate(instance?.slateId);
        const name = displayGameText(
          presenter,
          template?.name ?? instance?.slateId ?? instanceId,
          templatePresentationContext(template, "name"),
        );
        return `<li data-instance-id="${escapeHtml(instanceId)}">${escapeHtml(name)}</li>`;
      }).join("")}</ul>` : `<p>${editorCopy(locale, "없음")}</p>`}
    </section>
    <div class="divinity-overview-affix-groups">
      ${renderOverviewAffixList(overview.effectiveAffixes, "active", presenter, locale)}
      ${renderOverviewAffixList(overview.suppressedAffixes, "inactive", presenter, locale)}
    </div>
    <small>${editorCopy(locale, "신격 적용 상한은 재능, 고정 효과, 복사 효과 순서와 석판 생성·슬롯 순서로 판정됩니다.")}</small>
    <small>${editorCopy(locale, "석판을 선택한 뒤 방향키로 이동하고 회전 단축키(R)를 누르거나 삭제 키로 제거할 수 있습니다.")}</small>
  </section>`;
}

const BANISHMENT_ARCHETYPES = Object.freeze([
  { value: "Demolisher", labelByLocale: HADES_KOREAN_PRESENTATION.banishmentNamesByLocale.demolisher },
  { value: "Steep Strike", labelByLocale: HADES_KOREAN_PRESENTATION.banishmentNamesByLocale.steep_strike },
  { value: "Shadow Strike", labelByLocale: HADES_KOREAN_PRESENTATION.banishmentNamesByLocale.shadow_strike },
  { value: "Spell Burst", labelByLocale: HADES_KOREAN_PRESENTATION.banishmentNamesByLocale.spell_burst },
  { value: "Ill Omen", labelByLocale: HADES_KOREAN_PRESENTATION.banishmentNamesByLocale.ill_omen },
  { value: "Quagmire", labelByLocale: HADES_KOREAN_PRESENTATION.banishmentNamesByLocale.quagmire },
  { value: "Projection", labelByLocale: HADES_KOREAN_PRESENTATION.banishmentNamesByLocale.projection },
  { value: "Provision", labelByLocale: HADES_KOREAN_PRESENTATION.banishmentNamesByLocale.provision },
  { value: "Tangle", labelByLocale: HADES_KOREAN_PRESENTATION.banishmentNamesByLocale.tangle },
  { value: "Indomitable", labelByLocale: HADES_KOREAN_PRESENTATION.banishmentNamesByLocale.indomitable },
]);

function normalizeBanishmentArchetypeId(value) {
  return String(value ?? "").trim().toLocaleLowerCase("en-US").replace(/[\s-]+/gu, "_");
}

const BANISHMENT_ARCHETYPE_VALUE_BY_ID = new Map(BANISHMENT_ARCHETYPES.map(({ value }) => (
  [normalizeBanishmentArchetypeId(value), value]
)));

function canonicalBanishmentArchetype(value) {
  return BANISHMENT_ARCHETYPE_VALUE_BY_ID.get(normalizeBanishmentArchetypeId(value)) ?? null;
}

const BANISHMENT_ARCHETYPE_CONFIG_FIELDS = Object.freeze({
  Demolisher: [
    { key: "banishmentParalysisEffectBonus", label: "마비 효과 보너스 (%)", type: "number", min: 0, step: 0.1 },
    {
      key: "banishmentConditionActive",
      labelByLocale: {
        ko: HADES_KOREAN_PRESENTATION.inputLabels.banishmentParalyzedEnemy,
        en: "Paralyzed enemies",
      },
      type: "boolean",
    },
  ],
  "Steep Strike": [
    { key: "banishmentSteepStrikeChance", label: "슬래시 확률 (%)", type: "number", min: 0, step: 0.1 },
  ],
  "Shadow Strike": [
    {
      key: "banishmentConditionActive",
      labelByLocale: {
        ko: HADES_KOREAN_PRESENTATION.inputLabels.banishmentMobilityAttackUsed,
        en: "After using Attack Mobility Skill",
      },
      type: "boolean",
    },
  ],
  "Spell Burst": [
    {
      key: "banishmentSpellBurstAtCap",
      labelByLocale: {
        ko: HADES_KOREAN_PRESENTATION.inputLabels.banishmentSpellBurstAtCap,
        en: "Spell Burst charges at cap",
      },
      type: "boolean",
    },
  ],
  "Ill Omen": [
    {
      key: "banishmentConditionActive",
      labelByLocale: {
        ko: HADES_KOREAN_PRESENTATION.inputLabels.banishmentDealingDamageOverTime,
        en: "When dealing Damage over Time",
      },
      type: "boolean",
    },
    { key: "banishmentEnemyElite", label: "강적", type: "boolean" },
    { key: "banishmentEnemyLifePercent", label: "적 HP 비율 (%)", type: "number", min: 0, max: 100, step: 0.1 },
  ],
  Quagmire: [
    {
      key: "banishmentActivationBranch",
      label: "활성 조건 출처 분기",
      type: "select",
      options: [
        {
          value: "general-banishment-at-least-four",
          label: "인접·비인접 석판 각각 4개 이상",
          labelByLocale: { ko: "인접·비인접 석판 각각 4개 이상", en: "At least 4 adjacent and 4 non-adjacent Slates" },
        },
        {
          value: "quagmire-exactly-four",
          label: "인접·비인접 석판 각각 정확히 4개",
          labelByLocale: { ko: "인접·비인접 석판 각각 정확히 4개", en: "Exactly 4 adjacent and 4 non-adjacent Slates" },
        },
      ],
    },
    { key: "banishmentCurseEffectCount", label: "저주 효과 수", type: "number", min: 0, step: 1 },
  ],
  Projection: [
    {
      key: "banishmentProjectionStacks",
      label: `${HADES_KOREAN_PRESENTATION.banishmentNames.projection} 중첩 수`,
      type: "number",
      min: 0,
      max: 5,
      step: 1,
    },
  ],
  Provision: [
    { key: "banishmentMinionAffectedByElixir", label: "영약 효과를 받는 소환체", type: "boolean" },
  ],
  Tangle: [
    {
      key: "banishmentNearestSyntheticTroopMaxLife",
      labelByLocale: {
        ko: HADES_KOREAN_PRESENTATION.inputLabels.banishmentNearestSyntheticTroopMaxLife,
        en: "Nearest Synthetic Troop Minion maximum Life",
      },
      type: "number",
      min: 0,
      step: 1,
    },
  ],
  Indomitable: [
    {
      key: "banishmentConditionActive",
      labelByLocale: {
        ko: HADES_KOREAN_PRESENTATION.inputLabels.banishmentLethalHit,
        en: "When taking Fatal Damage",
      },
      type: "boolean",
    },
  ],
});

const BANISHMENT_ARCHETYPE_CONFIG_KEYS = new Set(
  Object.values(BANISHMENT_ARCHETYPE_CONFIG_FIELDS)
    .flat()
    .map((field) => field.key),
);

const LEGACY_BANISHMENT_BRANCHES = new Map([
  ["general", "general-banishment-at-least-four"],
  ["general-banishment-at-least-four", "general-banishment-at-least-four"],
  ["quagmire-exactly-four", "quagmire-exactly-four"],
]);

function migrateBanishmentAuthorityConfig(...sources) {
  const config = Object.assign({}, ...sources.filter((source) => (
    source && typeof source === "object" && !Array.isArray(source)
  )));
  if (!Object.hasOwn(config, "banishmentActivationBranch")) {
    const legacyProfile = typeof config.banishmentProfile === "string"
      ? config.banishmentProfile
      : typeof config.banishmentProfile?.id === "string"
        ? config.banishmentProfile.id
        : null;
    const migratedBranch = LEGACY_BANISHMENT_BRANCHES.get(legacyProfile);
    if (migratedBranch) config.banishmentActivationBranch = migratedBranch;
  }
  delete config.banishmentProfile;
  return config;
}

const CONDITION_CONFIG_IDS = new Set([
  "90000201",
  "90000212",
  "92100001",
  "92100006",
  "92100017",
]);

const HADES_NUMBER_CONFIG_FIELDS = Object.freeze({
  "90000002": [{ key: "roll", label: "적용 수치", min: 14, max: 16, step: 1 }],
  "90000003": [{ key: "roll", label: "적용 수치", min: 13, max: 17, step: 1 }],
  "90000004": [{ key: "roll", label: "적용 수치", min: 12, max: 18, step: 1 }],
  "90000005": [{ key: "roll", label: "적용 수치", min: 1, max: 29, step: 1 }],
  "90000006": [{ key: "roll", label: "적용 수치", min: 14, max: 16, step: 1 }],
  "92100002": [{ key: "distanceMeters", label: "대상 거리(미터)", min: 0, step: 0.1 }],
  "92100003": [{ key: "spellSkillLevelBonus", label: "주술 스킬 레벨", min: 0, step: 1 }],
  "92100004": [{ key: "sealedLifePercent", label: "봉인된 HP 비율 (%)", min: 0, max: 100, step: 0.1 }],
  "92100007": [{ key: "knockbackDistanceIncrease", label: "넉백 거리 증가 (%)", min: 0, step: 0.1 }],
  "92100010": [{ key: "reapingEventsPerSecond", label: "초당 수확 횟수", min: 0, step: 0.1 }],
  "92100012": [{ key: "activeMinions", label: "보유한 소환체 수", min: 0, step: 1 }],
  "92100013": [{ key: "recentCount", label: "최근 횟수", min: 0, step: 1 }],
  "92100015": [{ key: "distanceMeters", label: "대상 거리(미터)", min: 0, step: 0.1 }],
  "92100018": [
    { key: "attackBlockChance", label: "공격 막기 확률 (%)", min: 0, max: 100, step: 0.1 },
    { key: "spellBlockChance", label: "주술 막기 확률 (%)", min: 0, max: 100, step: 0.1 },
  ],
  "92100020": [{ key: "empowerDefensiveRecentCasts", label: "최근 시전한 자극 또는 실드 스킬 횟수", min: 0, step: 1 }],
  "92100021": [{ key: "erosionHitStacks", label: "적중 시 부식 대미지 중첩 수", min: 0, step: 1 }],
});

function hadesStableTalentId(selection) {
  const candidates = [
    selectionId(selection),
    selection?.sourceRecordKey,
    ...(Array.isArray(selection?.sourceDataIds) ? selection.sourceDataIds : []),
  ];
  for (const candidate of candidates) {
    const match = String(candidate ?? "").match(/(\d{8})$/u);
    if (match) return match[1];
  }
  return "";
}

function hadesConfigFields(template, slot, selection, authorityConfig = {}) {
  const valueId = hadesStableTalentId(selection);
  const fields = [];
  if (CONDITION_CONFIG_IDS.has(valueId)) {
    fields.push({ key: "conditionActive", label: "조건 충족", type: "boolean" });
  }
  fields.push(...(HADES_NUMBER_CONFIG_FIELDS[valueId] ?? []).map((field) => ({
    ...field,
    type: "number",
  })));
  if (valueId === "92000006") {
    fields.push({
      key: "statueHasEmptySlot",
      label: "신상에 비어 있는 장착 슬롯 있음",
      type: "boolean",
    });
  }
  if (template?.id === "hades_banishment" && slot?.key === "imprint_1") {
    fields.push({
      key: "banishmentArchetype",
      label: "추방 유형",
      type: "select",
      options: BANISHMENT_ARCHETYPES,
    });
    const selectedArchetype = canonicalBanishmentArchetype(
      authorityConfig.banishmentArchetype
        ?? selection?.config?.banishmentArchetype,
    );
    fields.push(...(BANISHMENT_ARCHETYPE_CONFIG_FIELDS[selectedArchetype] ?? []));
  }
  return fields;
}

function hadesConfigFieldLabel(field, locale) {
  return field.labelByLocale?.[locale === "en" ? "en" : "ko"]
    ?? editorCopy(locale, field.label);
}

function renderHadesConfigControl(field, instance, slot, config, locale) {
  const fieldLabel = hadesConfigFieldLabel(field, locale);
  const commonAttributes = `data-action="divinity-slot-set" data-command-type="divinity-slot-config-set" data-instance-id="${escapeHtml(instance.instanceId)}" data-slot-key="${escapeHtml(slot.key)}" data-config-key="${escapeHtml(field.key)}" data-config-type="${escapeHtml(field.type)}"`;
  const controlAttributes = (initialValue) => (
    `${commonAttributes} data-config-initial-value="${escapeHtml(initialValue)}"`
  );
  if (field.type === "boolean") {
    const selectedValue = config[field.key] === true
      ? "true"
      : config[field.key] === false
        ? "false"
        : "";
    return `<label>${escapeHtml(fieldLabel)}
      <select ${controlAttributes(selectedValue)}>
        <option value="" ${selectedValue === "" ? "selected" : ""}>${editorCopy(locale, "미입력")}</option>
        <option value="true" ${selectedValue === "true" ? "selected" : ""}>${editorCopy(locale, "예")}</option>
        <option value="false" ${selectedValue === "false" ? "selected" : ""}>${editorCopy(locale, "아니오")}</option>
      </select>
    </label>`;
  }
  if (field.type === "select") {
    const configuredValue = config[field.key]
      ?? (field.key === "banishmentActivationBranch" ? config.banishmentProfile : "")
      ?? "";
    const rawSelectedValue = typeof configuredValue?.id === "string"
      ? configuredValue.id
      : String(configuredValue);
    const candidateValue = field.key === "banishmentArchetype"
      ? canonicalBanishmentArchetype(rawSelectedValue)
      : rawSelectedValue;
    const optionValues = field.options.map((option) => (
      typeof option === "string" ? option : option.value
    ));
    const selectedValue = optionValues.includes(candidateValue) ? candidateValue : "";
    return `<label>${escapeHtml(fieldLabel)}
      <select ${controlAttributes(selectedValue)}>
        <option value="">${editorCopy(locale, "선택 안 함")}</option>
        ${field.options.map((option) => {
          const value = typeof option === "string" ? option : option.value;
          const label = typeof option === "string"
            ? option
            : option.labelByLocale?.[locale]
              ?? editorCopy(locale, option.label)
              ?? option.value;
          return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
        }).join("")}
      </select>
    </label>`;
  }
  const configuredValue = config[field.key];
  const value = configuredValue !== null
    && configuredValue !== ""
    && Number.isFinite(Number(configuredValue))
    ? Number(configuredValue)
    : "";
  const range = [
    Number.isFinite(field.min) ? `min="${field.min}"` : "",
    Number.isFinite(field.max) ? `max="${field.max}"` : "",
    Number.isFinite(field.step) ? `step="${field.step}"` : "",
  ].filter(Boolean).join(" ");
  return `<label>${escapeHtml(fieldLabel)}
    <input type="number" ${controlAttributes(value)} ${range} value="${escapeHtml(value)}" placeholder="${editorCopy(locale, "미지정")}" />
  </label>`;
}

function renderHadesSelectionConfig(template, instance, slot, selection, locale) {
  if (!isHadesTemplate(template) || !selection) return "";
  const authorityConfig = instance.hadesAuthorityConfig
    && typeof instance.hadesAuthorityConfig === "object"
    ? instance.hadesAuthorityConfig
    : {};
  const fields = hadesConfigFields(template, slot, selection, authorityConfig);
  if (!fields.length) return "";
  const selectionConfig = selection.config && typeof selection.config === "object"
    ? selection.config
    : {};
  const config = template.id === "hades_banishment" && slot.key === "imprint_1"
    ? { ...selectionConfig, ...authorityConfig }
    : selectionConfig;
  return `<fieldset class="hades-runtime-config" data-role="hades-runtime-config" data-slot-key="${escapeHtml(slot.key)}">
    <legend>${editorCopy(locale, "계산 입력")}</legend>
    ${fields.map((field) => renderHadesConfigControl(field, instance, slot, config, locale)).join("")}
  </fieldset>`;
}

function renderSlot({ template, instance, slot, divinityCatalog, hadesCatalog, presenter, locale }) {
  const selectedSelection = instance.slotSelectionsByKey?.[slot.key];
  const selectedId = selectionId(selectedSelection);
  const candidates = sourceCandidates({
    template,
    instance,
    slot,
    divinityCatalog,
    hadesCatalog,
    locale,
  });
  const selectedCandidate = candidates.find((candidate) => (
    candidate.valueId === selectedId || candidate.legacyRuntimeId === selectedId
  ));
  const selectedIsPresent = !selectedId || Boolean(selectedCandidate);
  const activeSelectedId = selectedCandidate?.valueId ?? selectedId;
  const locked = Boolean(slot.selectionLocked);
  const appUiLabel = slotUiLabel(template, slot, locale);
  const label = appUiLabel ?? displayGameText(
    presenter,
    slot.label,
    templatePresentationContext(template, "detail"),
  );
  return `<div class="divinity-slot" data-role="divinity-slot" data-instance-id="${escapeHtml(instance.instanceId)}" data-slot-key="${escapeHtml(slot.key)}">
    <label>${escapeHtml(label)}
      <select data-action="divinity-slot-set" data-instance-id="${escapeHtml(instance.instanceId)}"
        data-slot-key="${escapeHtml(slot.key)}" ${locked ? "disabled data-selection-locked=\"true\"" : ""}>
        <option value="">${editorCopy(locale, "선택 안 함")}</option>
        ${!selectedIsPresent ? `<option value="${escapeHtml(selectedId)}" selected data-source-value-id="${escapeHtml(selectedId)}">${escapeHtml(selectedSelection?.name ? optionLabel(selectedSelection, presenter, locale) : editorCopy(locale, "현재 자료에서 찾을 수 없는 선택"))}</option>` : ""}
        ${candidates.map((candidate) => (
          `<option value="${escapeHtml(candidate.valueId)}" data-source-value-id="${escapeHtml(candidate.valueId)}" data-source-kind="${escapeHtml(candidate.sourceKind)}" ${candidate.valueId === activeSelectedId ? "selected" : ""}>${escapeHtml(optionLabel(candidate, presenter, locale))}</option>`
        )).join("")}
      </select>
    </label>
    ${renderHadesSelectionConfig(template, instance, slot, selectedSelection, locale)}
  </div>`;
}

function shapeOptionLabel(template, shapeId, index, locale) {
  if (isHadesTemplate(template)) {
    return HADES_KOREAN_PRESENTATION.templates?.[template.id]
      ?.shapeLabelsByLocale?.[locale]?.[shapeId]
      ?? template.shapeLabels?.[shapeId]
      ?? `${locale === "en" ? "Legacy shape" : "이전 형상"} ${shapeId}`;
  }
  return template.allowedShapeIds.length === 1
    ? editorCopy(locale, "기본 형상")
    : `${editorCopy(locale, "형상")} ${String.fromCharCode(65 + index)}`;
}

function renderShapeOptions(template, selectedShapeId, locale) {
  const legacyOption = !isHadesTemplate(template) || template.allowedShapeIds.includes(selectedShapeId)
    ? ""
    : `<option value="${escapeHtml(selectedShapeId)}" selected data-legacy-hades-shape="true">${editorCopy(locale, "이전 형상 · 현재 구조 미확인")}</option>`;
  return legacyOption + template.allowedShapeIds.map((shapeId, index) => (
    `<option value="${escapeHtml(shapeId)}" ${isHadesTemplate(template) ? `data-hades-layout="${escapeHtml(shapeId)}"` : ""} ${shapeId === selectedShapeId ? "selected" : ""}>${shapeOptionLabel(template, shapeId, index, locale)}</option>`
  )).join("");
}

function renderGodSelection(instance, template, presenter, locale) {
  if (!template.requiresGodSelection) return "";
  return `<label>${editorCopy(locale, "신 선택")}
    <select data-action="divinity-god-set" data-instance-id="${escapeHtml(instance.instanceId)}">
      <option value="">${editorCopy(locale, "선택 안 함")}</option>
      ${DIVINITY_GODS.map((god) => (
        `<option value="${escapeHtml(god.slug)}" ${god.slug === instance.godSlug ? "selected" : ""}>${escapeHtml(displayGameText(presenter, god.name, {
          categoryId: "talents",
          treeSlug: god.slug,
          sourceName: god.talentMainGodName,
          field: "name",
        }))}</option>`
      )).join("")}
    </select>
  </label>`;
}

const COPY_TEMPLATE_IDS = new Set([
  "starfire",
  "moth_fire",
  "void_gap",
  "residence_of_stars",
]);

function renderCopyPreview(board, instance, divinityCatalog, hadesCatalog, presenter, locale) {
  if (!COPY_TEMPLATE_IDS.has(instance.slateId)) return "";
  const copies = resolveAdjacentDivinityCopies({
    board,
    targetInstanceId: instance.instanceId,
    talentCatalog: [...divinityCatalog, ...hadesCatalog],
  });
  return `<section class="divinity-copy-preview" data-role="divinity-copy-preview" data-instance-id="${escapeHtml(instance.instanceId)}">
    <h5>${editorCopy(locale, "인접 복사 미리보기")}</h5>
    ${copies.length ? `<ul>${copies.map((copy) => (
      `<li data-copy-type="${escapeHtml(copy.copyType)}" data-copy-direction="${escapeHtml(copy.direction)}" data-source-instance-id="${escapeHtml(copy.sourceInstanceId)}">${escapeHtml(optionLabel(copy, presenter, locale))}</li>`
    )).join("")}</ul>` : `<p data-copy-empty="true">${editorCopy(locale, "복사 가능한 인접 항목이 없습니다.")}</p>`}
  </section>`;
}

const HADES_DIAGNOSTIC_MESSAGES = {
  missing_selection: "선택되지 않음",
  unknown_selection: "현재 자료에서 찾을 수 없음",
  invalid_value_type: "선택 유형이 맞지 않음",
  invalid_category: "이 칸에 배치할 수 없는 항목",
  inactive_shape_slot_selection: "현재 형상에서 사용하지 않는 칸에 선택이 남아 있음",
  legacy_hades_shape_unverified: "이전 저장 형상이라 현재 구조로 계산하지 않음",
};

function renderHadesState(instance, divinityCatalog, hadesCatalog, presenter, locale) {
  if (!isHadesTemplate(instance.slateId)) return "";
  const template = getDivinitySlateTemplate(instance.slateId);
  const state = diagnoseHadesSelections(instance, [...hadesCatalog, ...divinityCatalog]);
  const activeSlots = getDivinitySlateActiveSlotDefinitions(template, instance.shapeId);
  const fixedSlots = activeSlots.filter((slot) => slot.key.startsWith("fixed_"));
  const imprintSlots = activeSlots.filter((slot) => slot.key.startsWith("imprint_"));
  const selectedCount = (slots) => slots.filter((slot) => (
    Boolean(selectionId(instance.slotSelectionsByKey?.[slot.key]))
  )).length;
  const fixedCount = state.fixedTalentIds?.length ?? selectedCount(fixedSlots);
  const imprintCount = state.imprintTalentIds?.length ?? selectedCount(imprintSlots);
  const diagnostics = state.diagnostics ?? [];
  return `<section class="hades-state" data-role="hades-state" data-hades-type="${escapeHtml(template.hadesType ?? template.id)}">
    <p data-role="hades-authority" data-authority-active="${Boolean(state.authorityActive)}"><strong>${editorCopy(locale, state.authorityActive ? "권위 활성" : "권위 비활성")}</strong> · ${escapeHtml(displayGameText(presenter, template.description, templatePresentationContext(template, "detail")))}</p>
    <p data-role="hades-fixed-count">${editorCopy(locale, "고정 옵션")} ${fixedCount}/${fixedSlots.length}</p>
    <p data-role="hades-imprint-count">${editorCopy(locale, "낙인 재능")} ${imprintCount}/${imprintSlots.length}</p>
    ${diagnostics.length ? `<ul>${diagnostics.map((diagnostic) => (
      `<li data-diagnostic-code="${escapeHtml(diagnostic.code)}" data-slot-key="${escapeHtml(diagnostic.slotKey ?? "")}">${escapeHtml(
        diagnostic.slotKey
          ? slotUiLabel(template, slotDefinition(template, diagnostic.slotKey), locale) ?? editorCopy(locale, "선택 칸")
          : editorCopy(locale, "형상"),
      )}: ${escapeHtml(editorCopy(locale, HADES_DIAGNOSTIC_MESSAGES[diagnostic.code] ?? "확인이 필요함"))}</li>`
    )).join("")}</ul>` : ""}
  </section>`;
}

function renderInventoryItem({ board, instance, divinityCatalog, hadesCatalog, selectedInstanceId, presenter, locale }) {
  const template = getDivinitySlateTemplate(instance.slateId);
  if (!template) return "";
  const selected = instance.instanceId === selectedInstanceId;
  const anchor = instance.anchor ?? { x: 0, y: 0 };
  const activeSlots = getDivinitySlateActiveSlotDefinitions(template, instance.shapeId);
  const currentHadesShape = isHadesTemplate(template) && isCurrentHadesShapeInstance(instance)
    ? HADES_DIVINITY_SHAPE_METADATA.shapes[instance.shapeId]
    : null;
  const fixedAnchor = currentHadesShape?.fixedAnchor;
  const positionControl = fixedAnchor
    ? `<p data-role="hades-fixed-position">${editorCopy(locale, "고정 위치")} · ${editorCopy(locale, "가로")} ${fixedAnchor.x} · ${editorCopy(locale, "세로")} ${fixedAnchor.y}</p>`
    : `<form data-action="divinity-slate-move" data-instance-id="${escapeHtml(instance.instanceId)}">
      <label>${editorCopy(locale, "가로 좌표")} <input name="x" type="number" min="0" max="5" value="${anchor.x}" /></label>
      <label>${editorCopy(locale, "세로 좌표")} <input name="y" type="number" min="0" max="5" value="${anchor.y}" /></label>
      <button type="submit">${editorCopy(locale, "좌표 적용")}</button>
    </form>`;
  const orientationControls = currentHadesShape
    ? `<p data-role="hades-fixed-orientation">${editorCopy(locale, "명왕 신격은 형상 선택으로 방향과 고정 위치를 바꿉니다.")}</p>`
    : isFixedOrientationSlateInstance(instance)
      ? `<p data-role="divinity-fixed-orientation">${editorCopy(locale, "이 석판은 고정 형상이라 회전과 뒤집기를 사용하지 않습니다.")}</p>`
      : `<button type="button" data-action="divinity-slate-rotate" data-instance-id="${escapeHtml(instance.instanceId)}" data-turns="1">${editorCopy(locale, "회전")}</button>
      <button type="button" data-action="divinity-slate-flip-horizontal" data-instance-id="${escapeHtml(instance.instanceId)}">${editorCopy(locale, "수평 뒤집기")}</button>
      <button type="button" data-action="divinity-slate-flip-vertical" data-instance-id="${escapeHtml(instance.instanceId)}">${editorCopy(locale, "수직 뒤집기")}</button>`;
  return `<article class="divinity-inventory-item" data-role="divinity-inventory-item" data-instance-id="${escapeHtml(instance.instanceId)}" data-selected="${selected}">
    <header>
      <h4>${escapeHtml(displayGameText(presenter, template.name, templatePresentationContext(template, "name")))}</h4>
      <p>${escapeHtml(displayGameText(presenter, template.description, templatePresentationContext(template, "detail")))}</p>
    </header>
    ${renderGodSelection(instance, template, presenter, locale)}
    <label>${editorCopy(locale, "형상")}
      <select data-action="divinity-shape-set" data-instance-id="${escapeHtml(instance.instanceId)}">
        ${renderShapeOptions(template, instance.shapeId, locale)}
      </select>
    </label>
    <div class="divinity-slots">
      ${activeSlots.map((slot) => renderSlot({
        template,
        instance,
        slot,
        divinityCatalog,
        hadesCatalog,
        presenter,
        locale,
      })).join("")}
    </div>
    ${renderCopyPreview(board, instance, divinityCatalog, hadesCatalog, presenter, locale)}
    ${renderHadesState(instance, divinityCatalog, hadesCatalog, presenter, locale)}
    ${positionControl}
    <div class="divinity-instance-actions">
      <button type="button" data-action="divinity-slate-auto-place" data-instance-id="${escapeHtml(instance.instanceId)}">${editorCopy(locale, "자동 배치")}</button>
      ${orientationControls}
      <button type="button" data-action="divinity-slate-unplace" data-instance-id="${escapeHtml(instance.instanceId)}">${editorCopy(locale, "배치 해제")}</button>
      <button type="button" data-action="store-divinity-slate-inventory" data-instance-id="${escapeHtml(instance.instanceId)}">${editorCopy(locale, "로컬 보관함에 저장")}</button>
      <button type="button" data-action="divinity-slate-delete" data-instance-id="${escapeHtml(instance.instanceId)}">${editorCopy(locale, "보관함에서 삭제")}</button>
    </div>
  </article>`;
}

function renderBoard(board, presenter, locale) {
  const instanceById = new Map(board.slateInventory.map((instance) => [instance.instanceId, instance]));
  const cellOwner = new Map(board.cells.map((cell) => [`${cell.x}:${cell.y}`, cell.slateInstanceId]));
  return `<div class="divinity-board-grid" data-role="divinity-board" role="grid" aria-label="${escapeHtml(t(locale, "divinityBoardLabel"))}" data-width="6" data-height="6">
    ${Array.from({ length: 6 }, (_, y) => Array.from({ length: 6 }, (_, x) => {
      const instanceId = cellOwner.get(`${x}:${y}`);
      const instance = instanceById.get(instanceId);
      const template = instance ? getDivinitySlateTemplate(instance.slateId) : null;
      const name = template
        ? displayGameText(presenter, template.name, templatePresentationContext(template, "name"))
        : "";
      const maskActive = board.mask?.[x]?.[y] === 1;
      const stateLabel = !maskActive
        ? editorCopy(locale, "비활성")
        : instance
          ? `${name || editorCopy(locale, "석판")} ${editorCopy(locale, "배치됨")}`
          : editorCopy(locale, "비어 있음");
      const coordinateLabel = locale === "en"
        ? `row ${y + 1}, column ${x + 1} · ${stateLabel}`
        : `${y + 1}행 ${x + 1}열 · ${stateLabel}`;
      return `<div class="divinity-board-cell" data-role="divinity-board-cell" data-x="${x}" data-y="${y}" data-mask-active="${maskActive ? 1 : 0}" ${instanceId ? `data-action="divinity-instance-select" tabindex="0"` : `tabindex="-1"`} role="gridcell" aria-label="${escapeHtml(coordinateLabel)}" aria-disabled="${maskActive ? "false" : "true"}" ${instanceId ? `data-instance-id="${escapeHtml(instanceId)}"` : ""}>${escapeHtml(name)}</div>`;
    }).join("")).join("")}
  </div>`;
}

function renderTemplateLibrary(board, presenter, locale) {
  return `<section class="divinity-template-library" data-role="divinity-template-library">
    <h3>${editorCopy(locale, "석판 라이브러리")}</h3>
    ${getVisibleDivinitySlateTemplates().map((template) => {
      const templateName = displayGameText(
        presenter,
        template.name,
        templatePresentationContext(template, "name"),
      );
      return `<article data-role="divinity-template" data-template-id="${escapeHtml(template.id)}">
        <span class="divinity-template-icon is-placeholder" data-role="divinity-template-icon-fallback" aria-hidden="true">◇</span>
        <h4>${escapeHtml(templateName)}</h4>
        <p>${escapeHtml(displayGameText(presenter, template.description, templatePresentationContext(template, "detail")))}</p>
        <button type="button" data-action="divinity-template-add" data-template-id="${escapeHtml(template.id)}" data-shape-id="${escapeHtml(template.defaultShapeId)}" aria-label="${escapeHtml(`${templateName} ${editorCopy(locale, "보관함에 추가")}`)}" ${canAddDivinitySlate(board, template.id) ? "" : "disabled"}>${editorCopy(locale, "보관함에 추가")}</button>
      </article>`;
    }).join("")}
  </section>`;
}

function renderSourceOnlyCatalog(sourceOnlyCatalog, presenter, locale) {
  return `<details class="divinity-source-only-catalog" data-role="divinity-source-only-catalog">
    <summary>${locale === "en" ? `Current SS13 display-only entries: ${sourceOnlyCatalog.length}` : `현재 SS13 표시 전용 항목 ${sourceOnlyCatalog.length}개`}</summary>
    <p>${editorCopy(locale, "배치 형상·슬롯·복사 규칙의 직접 출처가 없어 배치와 계산은 지원하지 않습니다.")}</p>
    <ul>${sourceOnlyCatalog.map((record, index) => {
      const name = displayGameText(
        presenter,
        record.name,
        selectionPresentationContext(record, "name"),
      );
      const detail = record.sourceDetailStatus === "exact"
        ? displayGameText(
          presenter,
          record.text,
          selectionPresentationContext(record, "detail", true),
        )
        : record.sourceDetailStatus === "source-language-mixed"
          ? presentSourceGameText(record.text, { locale })
          : editorCopy(locale, "원문 행에 별도 효과 문구 없음");
      const disambiguation = record.displayDisambiguation;
      return `<li data-source-only-index="${index + 1}" data-selection-supported="false" data-placement-supported="false" data-calculation-supported="false">
        <strong>${escapeHtml(name)}</strong>
        <span>${escapeHtml(detail)}</span>
        ${disambiguation ? `<small data-role="source-only-disambiguation">${locale === "en" ? "Display distinction" : "앱 표시용 구분"} ${disambiguation.ordinal}/${disambiguation.sameNameCount}</small>` : ""}
        <small>${escapeHtml(locale === "en" ? "Unsupported in the current runtime" : record.unsupportedReason)}</small>
      </li>`;
    }).join("")}</ul>
  </details>`;
}

function renderSourceOnlySpecialSlates(records, presenter, locale) {
  if (!records.length) return "";
  return `<section class="divinity-source-only-special-slates" data-role="divinity-source-only-special-slates" data-category-id="slates">
    <h3>${editorCopy(locale, "특수 석판 정보 (읽기 전용)")} ${records.length}${locale === "en" ? "" : "개"}</h3>
    <ul>${records.map((record, index) => {
      const name = displayGameText(
        presenter,
        record.name,
        selectionPresentationContext(record, "name"),
      );
      const detail = displayGameText(
        presenter,
        record.text,
        selectionPresentationContext(record, "detail", true),
      );
      return `<li data-special-slate-index="${index + 1}" data-selection-supported="false" data-placement-supported="false" data-calculation-supported="false">
        <strong>${escapeHtml(name)}</strong>
        <span>${escapeHtml(detail)}</span>
        <small>${escapeHtml(locale === "en" ? "Unsupported in the current runtime" : record.unsupportedReason)}</small>
      </li>`;
    }).join("")}</ul>
  </section>`;
}

export function renderDivinityEditor({
  board,
  divinityCatalog = [],
  hadesCatalog = [],
  sourceOnlyCatalog = [],
  sourceOnlySpecialSlateCatalog = [],
  uiState = {},
  locale = "ko",
  presentGameText: presenter,
} = {}) {
  if (!board) throw new TypeError("board is required");
  const localizedPresenter = editorPresenter(locale, presenter);
  return `<section class="divinity-editor" data-divinity-editor>
    <header class="divinity-editor-header">
      <h2>${escapeHtml(t(locale, "divinityEditorTitle"))}</h2>
      <button type="button" data-action="divinity-board-reset">${editorCopy(locale, "모두 지우기")}</button>
    </header>
    ${renderDivinityOverview(board, divinityCatalog, hadesCatalog, localizedPresenter, locale)}
    ${renderTemplateLibrary(board, localizedPresenter, locale)}
    ${renderSourceOnlySpecialSlates(sourceOnlySpecialSlateCatalog, localizedPresenter, locale)}
    ${renderSourceOnlyCatalog(sourceOnlyCatalog, localizedPresenter, locale)}
    <section class="divinity-board-panel">
      <h3>${editorCopy(locale, "6×6 신격 보드")}</h3>
      ${renderBoard(board, localizedPresenter, locale)}
    </section>
    <section class="divinity-inventory" data-role="divinity-inventory">
      <h3>${editorCopy(locale, "석판 보관함")}</h3>
      ${board.slateInventory.map((instance) => renderInventoryItem({
        board,
        instance,
        divinityCatalog,
        hadesCatalog,
        selectedInstanceId: uiState.selectedInstanceId,
        presenter: localizedPresenter,
        locale,
      })).join("")}
    </section>
    <section class="divinity-json-tools" data-role="divinity-json-tools">
      <button type="button" data-action="divinity-json-export">${editorCopy(locale, "석판 데이터 내보내기")}</button>
      <form data-action="divinity-json-import">
        <label>${editorCopy(locale, "석판 데이터 가져오기")}
          <textarea name="json">${escapeHtml(uiState.importText ?? uiState.exportedJson ?? "")}</textarea>
        </label>
        <button type="submit">${editorCopy(locale, "가져오기")}</button>
      </form>
    </section>
  </section>`;
}

function nonEmpty(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readInteger(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function readFiniteNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function formValue(target, name) {
  return target?.elements?.namedItem?.(name)?.value;
}

export function readDivinityEditorCommand(target) {
  const dataset = target?.dataset;
  const type = dataset?.action;
  if (typeof type !== "string" || !type.startsWith("divinity-")) return null;
  const instanceId = nonEmpty(dataset.instanceId);

  switch (type) {
    case "divinity-template-add": {
      const templateId = nonEmpty(dataset.templateId);
      if (!templateId) return null;
      const shapeId = nonEmpty(dataset.shapeId);
      return shapeId ? { type, templateId, shapeId } : { type, templateId };
    }
    case "divinity-slate-delete":
    case "divinity-slate-auto-place":
    case "divinity-slate-flip-horizontal":
    case "divinity-slate-flip-vertical":
    case "divinity-slate-unplace":
      return instanceId ? { type, instanceId } : null;
    case "divinity-god-set":
      return instanceId ? { type, instanceId, godSlug: String(target.value ?? "") } : null;
    case "divinity-shape-set": {
      const shapeId = nonEmpty(String(target.value ?? ""));
      return instanceId && shapeId ? { type, instanceId, shapeId } : null;
    }
    case "divinity-slot-set": {
      const slotKey = nonEmpty(dataset.slotKey);
      const configKey = nonEmpty(dataset.configKey);
      if (instanceId && slotKey && configKey) {
        const configType = dataset.configType;
        if (configType === "boolean") {
          const rawValue = String(target.value ?? "");
          const value = rawValue === "true"
            ? true
            : rawValue === "false"
              ? false
              : typeof target.checked === "boolean"
                ? target.checked
                : null;
          return { type: "divinity-slot-config-set", instanceId, slotKey, configKey, value };
        }
        if (configType === "number") {
          const value = readFiniteNumber(target.value);
          return value === undefined
            ? null
            : { type: "divinity-slot-config-set", instanceId, slotKey, configKey, value };
        }
        if (configType === "select") {
          const value = nonEmpty(String(target.value ?? ""));
          return {
            type: "divinity-slot-config-set",
            instanceId,
            slotKey,
            configKey,
            value: value ?? null,
          };
        }
        return null;
      }
      return instanceId && slotKey
        ? { type, instanceId, slotKey, valueId: String(target.value ?? "") }
        : null;
    }
    case "divinity-slate-move": {
      const x = readInteger(formValue(target, "x") ?? dataset.x);
      const y = readInteger(formValue(target, "y") ?? dataset.y);
      return instanceId && x !== null && y !== null
        ? { type, instanceId, position: { x, y } }
        : null;
    }
    case "divinity-slate-rotate": {
      const turns = dataset.turns === undefined ? 1 : readInteger(dataset.turns);
      return instanceId && turns !== null ? { type, instanceId, turns } : null;
    }
    case "divinity-board-reset":
    case "divinity-json-export":
      return { type };
    case "divinity-json-import":
      return { type, serialized: String(formValue(target, "json") ?? target.value ?? "") };
    default:
      return null;
  }
}

function success(board, extra = {}) {
  return { ok: true, board, error: null, ...extra };
}

function failure(board, code, message) {
  return { ok: false, board, error: { code, message } };
}

function findInstance(board, instanceId) {
  return board.slateInventory.find((instance) => instance.instanceId === instanceId);
}

function replaceInstance(board, nextInstance) {
  return {
    ...board,
    slateInventory: board.slateInventory.map((instance) => (
      instance.instanceId === nextInstance.instanceId ? nextInstance : instance
    )),
  };
}

function nextInstanceId(board, templateId) {
  const prefix = `divinity-${templateId}`;
  const existing = new Set(board.slateInventory.map((instance) => instance.instanceId));
  let index = 1;
  while (existing.has(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

function nextCreatedOrder(board) {
  return board.slateInventory.reduce(
    (maximum, instance) => Math.max(maximum, instance.createdOrder ?? 0),
    0,
  ) + 1;
}

function setHadesSlotConfig(instance, slotKey, configKey, value) {
  const template = getDivinitySlateTemplate(instance.slateId);
  const slot = slotDefinition(template, slotKey);
  const selection = instance.slotSelectionsByKey?.[slotKey];
  if (!isHadesTemplate(template) || !slot || !selection) {
    throw new RangeError(`Configuration is not available for ${instance.slateId}.${slotKey}`);
  }
  const storedAuthorityConfig = instance.hadesAuthorityConfig
    && typeof instance.hadesAuthorityConfig === "object"
    ? instance.hadesAuthorityConfig
    : {};
  const field = hadesConfigFields(template, slot, selection, storedAuthorityConfig)
    .find((candidate) => candidate.key === configKey);
  if (!field) throw new RangeError(`Unknown configuration ${instance.slateId}.${slotKey}.${configKey}`);

  if (value !== null) {
    if (field.type === "boolean" && typeof value !== "boolean") {
      throw new TypeError(`${configKey} must be boolean`);
    }
    if (field.type === "number") {
      if (!Number.isFinite(value)) throw new TypeError(`${configKey} must be a finite number`);
      if (Number.isFinite(field.min) && value < field.min) throw new RangeError(`${configKey} is below its minimum`);
      if (Number.isFinite(field.max) && value > field.max) throw new RangeError(`${configKey} is above its maximum`);
    }
    if (field.type === "select" && !field.options.some((option) => (
      (typeof option === "string" ? option : option.value) === value
    ))) {
      throw new RangeError(`${configKey} has an unknown option`);
    }
  }

  const authorityField = template.id === "hades_banishment"
    && slotKey === "imprint_1"
    && configKey.startsWith("banishment");
  const legacyAuthorityConfig = Object.fromEntries(
    Object.entries(selection.config ?? {}).filter(([key]) => key.startsWith("banishment")),
  );
  const config = authorityField
    ? migrateBanishmentAuthorityConfig(legacyAuthorityConfig, storedAuthorityConfig)
    : { ...(selection.config ?? {}) };
  if (configKey === "banishmentArchetype") {
    for (const key of BANISHMENT_ARCHETYPE_CONFIG_KEYS) delete config[key];
  }
  if (value === null) delete config[configKey];
  else config[configKey] = value;
  const nextSelection = { ...selection };
  if (authorityField) {
    const selectionConfig = Object.fromEntries(
      Object.entries(selection.config ?? {}).filter(([key]) => !key.startsWith("banishment")),
    );
    if (Object.keys(selectionConfig).length) nextSelection.config = selectionConfig;
    else delete nextSelection.config;
  } else if (Object.keys(config).length) nextSelection.config = config;
  else delete nextSelection.config;
  const nextInstance = {
    ...instance,
    slotSelectionsByKey: {
      ...instance.slotSelectionsByKey,
      [slotKey]: nextSelection,
    },
  };
  if (authorityField) {
    if (Object.keys(config).length) nextInstance.hadesAuthorityConfig = config;
    else delete nextInstance.hadesAuthorityConfig;
  }
  return nextInstance;
}

function resolveSelection(context, instance, slotKey, valueId) {
  const template = getDivinitySlateTemplate(instance.slateId);
  const slot = slotDefinition(template, slotKey);
  if (!slot) return undefined;
  return sourceCandidates({
    template,
    instance,
    slot,
    divinityCatalog: context.divinityCatalog ?? [],
    hadesCatalog: context.hadesCatalog ?? [],
  }).find((candidate) => (
    candidate.valueId === valueId || candidate.legacyRuntimeId === valueId
  ));
}

function changeShape(board, instance, shapeId) {
  if (!isDivinityShapeAllowed(instance.slateId, shapeId)) {
    throw new RangeError(`Shape ${shapeId} is not allowed for ${instance.slateId}`);
  }
  const anchor = instance.anchor ? { ...instance.anchor } : null;
  let nextBoard = anchor ? unplaceSlate(board, instance.instanceId) : board;
  const template = getDivinitySlateTemplate(instance.slateId);
  const activeSlotKeys = new Set(
    getDivinitySlateActiveSlotDefinitions(template, shapeId).map((slot) => slot.key),
  );
  const slotSelectionsByKey = Object.fromEntries(
    Object.entries(instance.slotSelectionsByKey ?? {})
      .filter(([slotKey]) => activeSlotKeys.has(slotKey)),
  );
  const nextInstance = createDivinitySlateInstance({
    instanceId: instance.instanceId,
    templateId: instance.slateId,
    shapeId,
    godSlug: instance.godSlug,
    rotation: instance.rotation,
    flippedH: instance.flippedH,
    flippedV: instance.flippedV,
    affixIds: instance.affixIds,
    slotSelectionsByKey,
    hadesAuthorityConfig: instance.hadesAuthorityConfig,
    createdOrder: instance.createdOrder,
  });
  nextBoard = replaceInstance(nextBoard, nextInstance);
  if (!anchor) return nextBoard;
  const nextAnchor = HADES_DIVINITY_SHAPE_METADATA.shapes[shapeId]?.fixedAnchor ?? anchor;
  if (!canPlaceSlate(nextBoard, instance.instanceId, nextAnchor)) {
    throw new RangeError(`Slate ${instance.instanceId} cannot use shape ${shapeId} at ${nextAnchor.x},${nextAnchor.y}`);
  }
  return placeSlate(nextBoard, instance.instanceId, nextAnchor);
}

export function reduceDivinityEditorCommand(context = {}, board, command) {
  if (!board) throw new TypeError("board is required");
  if (!command || typeof command.type !== "string" || !command.type.startsWith("divinity-")) {
    return failure(board, "unknown_command", "지원하지 않는 신격 편집 명령입니다.");
  }

  try {
    if (command.type === "divinity-template-add") {
      const template = getDivinitySlateTemplate(command.templateId);
      if (!template || !canAddDivinitySlate(board, command.templateId)) {
        throw new RangeError(`Template ${command.templateId} cannot be added`);
      }
      const shapeId = command.shapeId ?? template.defaultShapeId;
      const instance = createDivinitySlateInstance({
        instanceId: nextInstanceId(board, template.id),
        templateId: template.id,
        shapeId,
        createdOrder: nextCreatedOrder(board),
      });
      return success(addDivinitySlateToBoard(board, instance), { instanceId: instance.instanceId });
    }

    if (command.type === "divinity-board-reset") {
      return success(createDivinityBoard({
        boardId: board.boardId,
        width: board.width,
        height: board.height,
      }));
    }

    if (command.type === "divinity-json-export") {
      return success(board, { exportedJson: exportDivinitySlateBoard(board) });
    }

    if (command.type === "divinity-json-import") {
      const imported = importDivinitySlateBoard(command.serialized);
      if (imported.width !== 6 || imported.height !== 6) {
        throw new RangeError("Divinity editor only accepts a 6x6 board");
      }
      return success(imported);
    }

    const instance = findInstance(board, command.instanceId);
    if (!instance) throw new RangeError(`Unknown slate instanceId: ${command.instanceId}`);

    if (command.type === "divinity-slate-delete") {
      return success(deleteSlateInstance(board, instance.instanceId));
    }

    if (command.type === "divinity-god-set") {
      const template = getDivinitySlateTemplate(instance.slateId);
      if (!template?.requiresGodSelection) throw new RangeError(`${instance.slateId} does not select a god`);
      const godSlug = command.godSlug || undefined;
      if (godSlug && !DIVINITY_GODS.some((god) => god.slug === godSlug)) {
        throw new RangeError(`Unknown divinity god: ${godSlug}`);
      }
      const { godSlug: ignoredGodSlug, ...withoutGod } = instance;
      const nextInstance = {
        ...withoutGod,
        ...(godSlug ? { godSlug } : {}),
        slotSelectionsByKey: {},
      };
      return success(replaceInstance(board, nextInstance));
    }

    if (command.type === "divinity-shape-set") {
      return success(changeShape(board, instance, command.shapeId));
    }

    if (command.type === "divinity-slot-set") {
      const template = getDivinitySlateTemplate(instance.slateId);
      const slot = slotDefinition(template, command.slotKey);
      if (!slot) throw new RangeError(`Unknown slot ${instance.slateId}.${command.slotKey}`);
      if (!command.valueId) {
        if (slot.selectionLocked) throw new RangeError(`${instance.slateId}.${slot.key} is locked`);
        return success(replaceInstance(
          board,
          setDivinitySlotSelection(instance, command.slotKey, null),
        ));
      }
      const selection = resolveSelection(context, instance, command.slotKey, command.valueId);
      if (!selection) {
        throw new RangeError(`Selection ${command.valueId} is not eligible for ${instance.slateId}.${command.slotKey}`);
      }
      return success(replaceInstance(
        board,
        setDivinitySlotSelection(instance, command.slotKey, selection),
      ));
    }

    if (command.type === "divinity-slot-config-set") {
      return success(replaceInstance(
        board,
        setHadesSlotConfig(instance, command.slotKey, command.configKey, command.value),
      ));
    }

    if (command.type === "divinity-slate-auto-place") {
      return success(autoPlaceSlate(board, instance.instanceId));
    }

    if (command.type === "divinity-slate-move") {
      const x = Number(command.position?.x);
      const y = Number(command.position?.y);
      if (!Number.isInteger(x) || !Number.isInteger(y)) throw new TypeError("Move position must be integer coordinates");
      return success(moveSlate(board, instance.instanceId, { x, y }));
    }

    if (command.type === "divinity-slate-rotate") {
      return success(rotatePlacedSlate(board, instance.instanceId, command.turns ?? 1));
    }

    if (command.type === "divinity-slate-flip-horizontal") {
      return success(flipPlacedSlateHorizontal(board, instance.instanceId));
    }

    if (command.type === "divinity-slate-flip-vertical") {
      return success(flipPlacedSlateVertical(board, instance.instanceId));
    }

    if (command.type === "divinity-slate-unplace") {
      return success(unplaceSlate(board, instance.instanceId));
    }

    return failure(board, "unknown_command", `지원하지 않는 신격 편집 명령: ${command.type}`);
  } catch (error) {
    return failure(
      board,
      "command_failed",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function reduceDivinityEditorConfigTargets(context, board, targets = []) {
  let nextBoard = board;
  for (const target of targets) {
    const initialValue = target?.dataset?.configInitialValue;
    if (typeof initialValue === "string" && String(target.value ?? "") === initialValue) continue;
    const command = readDivinityEditorCommand(target);
    if (command?.type !== "divinity-slot-config-set") continue;
    const result = reduceDivinityEditorCommand(context, nextBoard, command);
    if (!result.ok) return result;
    nextBoard = result.board;
  }
  return success(nextBoard);
}
