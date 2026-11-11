import {
  createDestinyInstance,
  createEmptyPactSpiritSlot,
  createPactSpiritInstance,
  createUndeterminedDestinyInstance,
  getDestinyView,
  getPactDestinyCapacity,
  getPactRingSlotType,
  getPactSpiritRingSlotOrder,
  getPactSpiritView,
  isPactSpiritRingSlotAvailable,
  normalizePactDestinyState,
  PACT_RING_SLOT_ORDER,
  projectPactDestinyCalculation,
  setUndeterminedDestinySlot,
  updateDestinyRoll,
  updatePactSpiritLevel,
} from "./pactDestinyModel.js";
import { presentGameText as presentDefaultGameText } from "./gameTextPresentation.js";
import { pactPointStyle, renderPactConnections } from "./ingameLayout.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPactIcon(source, fallbackRole) {
  const url = source?.iconUrl || source?.icon_url || source?.localIconPath;
  return url
    ? `<img src="${escapeHtml(url)}" alt="" loading="lazy" />`
    : `<span class="pact-icon is-placeholder" data-role="${escapeHtml(fallbackRole)}" aria-hidden="true">◇</span>`;
}

function createPactGameTextPresenter(editorUi) {
  const customPresenter = typeof editorUi?.presentGameText === "function"
    ? editorUi.presentGameText
    : null;
  return (value, metadata) => {
    const input = {
      value,
      categoryId: metadata.categoryId,
      sourceUrl: metadata.sourceUrl ?? "",
      itemId: metadata.itemId ?? "",
      field: metadata.field,
      optional: Boolean(metadata.optional),
    };
    return customPresenter
      ? customPresenter(input)
      : presentDefaultGameText(value, { locale: "ko", optional: input.optional });
  };
}

function normalizePactSourceSearch(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/\s+/g, " ")
    .trim();
}

function pactSourceNameMatches(name, query) {
  const normalizedQuery = normalizePactSourceSearch(query);
  return !normalizedQuery || normalizePactSourceSearch(name).includes(normalizedQuery);
}

function pactSourceSupport(record) {
  if (record?.structureSupported === false) {
    return { status: "structure-calculation-unsupported", label: "구조·계산 미지원" };
  }
  if (record?.calculationSupported === false) {
    return { status: "calculation-unsupported", label: "계산 미지원" };
  }
  return { status: "supported", label: "" };
}

function sourceOptions(records, selectedId, sourceKind, categoryId, presentText, searchQuery = "") {
  const unresolvedOption = selectedId && !records.some(({ id }) => id === selectedId)
    ? `<option data-source-kind="${escapeHtml(sourceKind)}" data-unresolved="true" selected>[미검증]</option>`
    : "";
  const searchKind = categoryId === "spirits" ? "spirit" : "destiny";
  return unresolvedOption + records.map((record) => {
    const displayName = presentText(record.name, {
      categoryId,
      sourceUrl: record.sourceUrl,
      itemId: record.id,
      field: "name",
      optional: false,
    });
    const support = pactSourceSupport(record);
    const selected = record.id === selectedId;
    const hidden = !selected && !pactSourceNameMatches(displayName, searchQuery);
    const optionLabel = support.label ? `${displayName} · ${support.label}` : displayName;
    return `<option value="${escapeHtml(record.id)}" data-source-kind="${escapeHtml(sourceKind)}" data-pact-search-kind="${searchKind}" data-search-id="${escapeHtml(record.id)}" data-search-name="${escapeHtml(displayName)}" data-structure-supported="${record.structureSupported !== false}" data-calculation-supported="${record.calculationSupported !== false}" data-support-status="${support.status}" ${selected ? "selected" : ""} ${hidden ? "hidden" : ""}>${escapeHtml(optionLabel)}</option>`;
  }).join("");
}

export function applyPactSourceNameFilter(target) {
  if (target?.dataset?.action !== "pact-source-filter") return false;
  const searchKind = target.dataset.sourceKind;
  if (!["spirit", "destiny"].includes(searchKind)) return false;
  const editor = target.closest?.("[data-pact-editor]");
  if (!editor?.querySelectorAll) return true;

  const query = normalizePactSourceSearch(target.value);
  const visibleIds = new Set();
  const candidates = editor.querySelectorAll(`[data-pact-search-kind="${searchKind}"]`);
  for (const candidate of candidates) {
    const matches = pactSourceNameMatches(candidate.dataset?.searchName, query);
    const selectedOption = candidate.tagName === "OPTION" && candidate.selected;
    candidate.hidden = !matches && !selectedOption;
    if (matches && candidate.dataset?.searchId) visibleIds.add(candidate.dataset.searchId);
  }

  const status = editor.querySelector?.(`[data-role="pact-${searchKind}-search-count"]`);
  if (status) {
    const total = Number(target.dataset.totalCount) || visibleIds.size;
    status.textContent = query ? `${visibleIds.size}개 검색됨` : `${total}개 전체`;
  }
  return true;
}

function sourceValue(instance, fallbackSource = "") {
  if (instance && Object.hasOwn(instance, "source")) return instance.source;
  if (instance && Object.hasOwn(instance, "sourceUrl")) return instance.sourceUrl;
  return fallbackSource;
}

function sourceUrlValue(instance, fallbackSource = "") {
  const source = sourceValue(instance, fallbackSource);
  const candidates = [
    instance?.sourceUrl,
    typeof source === "object" ? source?.sourceUrl : null,
    typeof source === "object" ? source?.url : null,
    typeof source === "object" ? source?.page : null,
    typeof source === "string" ? source : null,
    fallbackSource,
  ];
  return candidates.find((value) => typeof value === "string" && value) ?? "";
}

function sourceDisplayEntries(instance, fallbackSource = "") {
  const entries = [];
  const add = (value, field) => {
    if (
      typeof value === "string"
      && value
      && !entries.some((entry) => entry.value === value)
    ) entries.push({ value, field });
  };
  const addSource = (source) => {
    if (typeof source === "string") {
      add(source, "source");
      return;
    }
    if (!source || typeof source !== "object") return;
    for (const field of ["name", "title", "tooltip", "effect", "description", "text", "page"]) {
      add(source[field], `source.${field}`);
    }
  };
  addSource(sourceValue(instance, fallbackSource));
  if (instance && typeof instance === "object") {
    for (const field of ["name", "title", "tooltip", "effect", "description", "text"]) {
      add(instance[field], field);
    }
  }
  return entries;
}

function renderSourceContent(instance, options, presentText) {
  const entries = sourceDisplayEntries(instance, options.fallbackSource);
  if (!entries.length) return '<p data-role="pact-unresolved-source">원문 표기 없음</p>';
  return entries.map(({ value, field }) => (
    `<p data-role="pact-unresolved-source">${escapeHtml(presentText(value, {
      categoryId: options.categoryId,
      sourceUrl: options.sourceUrl,
      itemId: options.itemId,
      field,
      optional: false,
    }))}</p>`
  )).join("");
}

function renderUnresolvedInstance(instance, options, presentText) {
  if (!instance) return "";
  return `
    <div class="pact-unresolved-record" data-role="${options.role}" data-unresolved="true">
      <strong>[미검증]</strong>
      ${renderSourceContent(instance, {
        ...options,
        itemId: options.itemId
          ?? (options.categoryId === "spirits"
            ? instance.spiritId
            : instance.destinyId ?? instance.slotLayoutId ?? instance.layoutId),
        sourceUrl: options.sourceUrl ?? sourceUrlValue(instance, options.fallbackSource),
      }, presentText)}
    </div>
  `;
}

function destinyRecords(model, slotType) {
  return model.destinies.filter((destiny) => destiny.slotType === slotType);
}

function childDestiny(child) {
  return child?.installedDestiny ?? child?.destiny ?? null;
}

function childSlots(undetermined) {
  return Array.isArray(undetermined?.slots) ? undetermined.slots : [];
}

function safeSlotTypeToken(slotType) {
  return ["micro", "medium"].includes(slotType) ? slotType : "unresolved";
}

function destinySourceKind(slotType) {
  return `destiny-${safeSlotTypeToken(slotType)}`;
}

function clearUnresolvedChildDestiny(child) {
  if (Object.hasOwn(child, "installedDestiny")) child.installedDestiny = null;
  if (Object.hasOwn(child, "destiny")) child.destiny = null;
  if (!Object.hasOwn(child, "installedDestiny") && !Object.hasOwn(child, "destiny")) {
    child.installedDestiny = null;
  }
}

function derivedSlotTypeLabel(slotType) {
  if (slotType === "micro") return "하위 숙명";
  if (slotType === "medium") return "중위 숙명";
  return "[미검증]";
}

function ringPlacementLabel(ringSlotId) {
  const slotType = getPactRingSlotType(ringSlotId);
  const ordinal = PACT_RING_SLOT_ORDER
    .filter((candidate) => getPactRingSlotType(candidate) === slotType)
    .indexOf(ringSlotId) + 1;
  return `${slotType === "micro" ? "I" : "II"}형 ${ordinal}`;
}

function destinyAttributes(options) {
  if (options.kind === "ring") {
    return `data-spirit-slot-index="${options.spiritSlotIndex}" data-ring-slot-id="${escapeHtml(options.ringSlotId)}"`;
  }
  return `data-spirit-slot-index="${options.spiritSlotIndex}" data-derived-index="${options.derivedIndex}"`;
}

function renderDestinyDetail(model, destiny, options, presentText) {
  if (!destiny) return "";
  const attributes = destinyAttributes(options);
  const rollAction = options.kind === "ring"
    ? "pact-ring-destiny-roll"
    : "pact-undetermined-destiny-roll";
  const clearAction = options.kind === "ring"
    ? "pact-ring-destiny-clear"
    : "pact-undetermined-destiny-clear";
  const view = getDestinyView(model, destiny, options.expectedSlotType);
  if (!view) {
    return `
      ${renderUnresolvedInstance(destiny, {
        categoryId: "destiny",
        role: options.kind === "ring" ? "pact-unresolved-ring-destiny" : "pact-unresolved-derived-destiny",
      }, presentText)}
      <button type="button" data-action="${clearAction}" ${attributes}>미검증 운명 비우기</button>
    `;
  }
  return `
    <div class="pact-destiny-detail">
      ${renderPactIcon(view, "pact-destiny-icon-fallback")}
      <strong>${escapeHtml(presentText(view.name, {
        categoryId: "destiny", sourceUrl: view.sourceUrl, itemId: view.destinyId, field: "name", optional: false,
      }))}</strong>
      <p data-role="pact-destiny-source-affix">${escapeHtml(presentText(view.affixText, {
        categoryId: "destiny", sourceUrl: view.sourceUrl, itemId: view.destinyId, field: "affixText", optional: true,
      }))}</p>
      ${view.rollDefs.length ? `<p data-role="pact-destiny-roll-preview">${escapeHtml(presentText(view.text, {
        categoryId: "destiny", sourceUrl: view.sourceUrl, itemId: view.destinyId, field: "text", optional: true,
      }))}</p>` : ""}
      ${!view.calculationSupported ? `
        <strong class="pact-source-support-badge" data-role="pact-destiny-calculation-unsupported">계산 미지원</strong>
        <p>TLIDB SS13 현재 수치 구조와 계산 참조 구조가 달라 계산에서 제외됩니다.</p>
      ` : ""}
      ${options.pairStatus === "active_paired" ? '<span data-role="dual-kismet-active">이중 천명 활성</span>' : ""}
      ${options.pairStatus === "inactive_unpaired" ? '<span data-role="dual-kismet-inactive">짝이 없어 비활성</span>' : ""}
      ${options.pairStatus === "inactive_over_limit" ? '<span data-role="dual-kismet-inactive">세 번째 이후 비활성</span>' : ""}
      ${view.rollDefs.map((roll, index) => `
        <label class="pact-destiny-roll">
          <span>수치 ${index + 1}</span>
          <small>입력 후 엔터 또는 다른 칸 선택</small>
          <input type="number" data-action="${rollAction}" ${attributes}
            data-roll-key="${escapeHtml(roll.key)}"
            min="${roll.min}" max="${roll.max}" step="${roll.step}"
            value="${escapeHtml(view.rolls[roll.key])}" ${options.locked ? "disabled" : ""} />
        </label>
      `).join("")}
      <button type="button" data-action="${clearAction}" ${attributes}>운명 비우기</button>
    </div>
  `;
}

function renderRingSlot(
  model,
  spiritView,
  spiritSlot,
  spiritSlotIndex,
  ringSlotId,
  pairStatusByLocation,
  ownerUnresolved = false,
  presentText,
  destinySearch,
) {
  const slotType = getPactRingSlotType(ringSlotId);
  const ringSource = spiritView?.rings?.find(({ slotId }) => slotId === ringSlotId);
  const destiny = spiritSlot.rings[ringSlotId].installedDestiny;
  const locked = ownerUnresolved || Boolean(destiny?.unresolved);
  const locationKey = `${spiritSlot.slotId}:ring:${ringSlotId}`;
  const ringClass = slotType === "micro" ? "I" : "II";
  const ringTitle = ringSource?.name
    ? `${ringClass}형 · ${presentText(ringSource.name, {
      categoryId: "spirits",
      sourceUrl: spiritView.sourceUrl,
      itemId: spiritView.spiritId,
      field: `rings.${ringSlotId}.name`,
      optional: false,
    })}`
    : ringPlacementLabel(ringSlotId);
  return `
    <article class="pact-destiny-slot pact-ring-slot" data-role="pact-ring-slot"
      data-ring-slot="${escapeHtml(ringSlotId)}" data-slot-type="${slotType}">
      <h5>${escapeHtml(ringTitle)}</h5>
      <p>${escapeHtml(presentText(ringSource?.effect ?? "", {
        categoryId: "spirits", sourceUrl: spiritView?.sourceUrl, itemId: spiritView?.spiritId,
        field: `rings.${ringSlotId}.effect`, optional: true,
      }))}</p>
      <small>${escapeHtml(presentText(ringSource?.category ?? "", {
        categoryId: "spirits", sourceUrl: spiritView?.sourceUrl, itemId: spiritView?.spiritId,
        field: `rings.${ringSlotId}.category`, optional: true,
      }))}</small>
      <label>운명 선택
        <select data-action="pact-ring-destiny-set"
          data-spirit-slot-index="${spiritSlotIndex}" data-ring-slot-id="${escapeHtml(ringSlotId)}"
          aria-label="${escapeHtml(`${ringPlacementLabel(ringSlotId)} 운명 선택`)}"
          ${locked ? "disabled" : ""}>
          <option value="">선택 안 함</option>
          ${sourceOptions(
            destinyRecords(model, slotType),
            destiny?.destinyId,
            `destiny-${slotType}`,
            "destiny",
            presentText,
            destinySearch,
          )}
        </select>
      </label>
      ${renderDestinyDetail(model, destiny, {
        kind: "ring",
        spiritSlotIndex,
        ringSlotId,
        expectedSlotType: slotType,
        pairStatus: pairStatusByLocation.get(locationKey),
        locked,
      }, presentText)}
    </article>
  `;
}

function renderUndetermined(
  model,
  spiritSlot,
  spiritSlotIndex,
  pairStatusByLocation,
  ownerUnresolved = false,
  presentText,
  destinySearch,
) {
  const undetermined = spiritSlot.undeterminedFate;
  const layout = undetermined
    ? model.undeterminedLayouts.find(({ id }) => id === undetermined.slotLayoutId)
    : null;
  const children = childSlots(undetermined);
  const displayedSlotTypes = layout?.slots ?? children.map((child) => child?.slotType);
  const microCount = displayedSlotTypes.filter((slotType) => slotType === "micro").length;
  const mediumCount = displayedSlotTypes.filter((slotType) => slotType === "medium").length;
  const unresolvedLayout = Boolean(undetermined?.unresolved || (undetermined && !layout));
  const unresolvedCore = Boolean(
    undetermined?.destiny && !getDestinyView(model, undetermined.destiny, "undetermined"),
  );
  const layoutLocked = ownerUnresolved || unresolvedLayout || unresolvedCore;
  const childrenLocked = ownerUnresolved || unresolvedLayout;
  return `
    <section class="pact-undetermined-slot" data-role="pact-undetermined-slot"
      data-spirit-slot-index="${spiritSlotIndex}">
      <h5>미정 숙명</h5>
      <p>미정 숙명이 제공하는 운명 슬롯은 합계 5개까지 선택할 수 있습니다.</p>
      <p data-role="pact-undetermined-layout-summary">하위 숙명 ${microCount} · 중위 숙명 ${mediumCount}</p>
      <button type="button" data-action="pact-undetermined-config-open"
        data-spirit-slot-index="${spiritSlotIndex}" aria-haspopup="dialog"
        aria-controls="pact-undetermined-config-dialog" ${layoutLocked ? "disabled" : ""}>미정 숙명 슬롯 설정</button>
      ${unresolvedLayout ? renderUnresolvedInstance(undetermined, {
        categoryId: "destiny",
        role: "pact-unresolved-undetermined",
      }, presentText) : ""}
      ${unresolvedCore && !unresolvedLayout ? renderUnresolvedInstance(undetermined.destiny, {
        categoryId: "destiny",
        role: "pact-unresolved-undetermined-core",
      }, presentText) : ""}
      ${undetermined ? `
        <button type="button" data-action="pact-undetermined-clear"
          data-spirit-slot-index="${spiritSlotIndex}">${unresolvedLayout || unresolvedCore ? "미검증 미정 숙명 비우기" : "미정 숙명 비우기"}</button>
        ${children.length ? `<div class="pact-derived-destiny-grid">
          ${children.map((child, derivedIndex) => {
            const slotType = child?.slotType;
            const installedDestiny = childDestiny(child);
            const selected = installedDestiny?.destinyId;
            const locationKey = `${spiritSlot.slotId}:undetermined:derived:${derivedIndex}`;
            const locked = childrenLocked
              || !["micro", "medium"].includes(slotType)
              || Boolean(installedDestiny?.unresolved);
            return `
              <article class="pact-derived-destiny-slot" data-role="pact-derived-destiny-slot"
                data-derived-index="${derivedIndex}" data-slot-type="${safeSlotTypeToken(slotType)}">
                <h5>${escapeHtml(derivedSlotTypeLabel(slotType))} 슬롯 ${derivedIndex + 1}</h5>
                <label>운명 선택
                  <select data-action="pact-undetermined-destiny-set"
                    data-spirit-slot-index="${spiritSlotIndex}" data-derived-index="${derivedIndex}"
                    aria-label="${escapeHtml(`${derivedSlotTypeLabel(slotType)} 슬롯 ${derivedIndex + 1} 운명 선택`)}"
                    ${locked ? "disabled" : ""}>
                    <option value="">선택 안 함</option>
                    ${sourceOptions(
                      destinyRecords(model, slotType),
                      selected,
                      destinySourceKind(slotType),
                      "destiny",
                      presentText,
                      destinySearch,
                    )}
                  </select>
                </label>
                ${renderDestinyDetail(model, installedDestiny, {
                  kind: "derived",
                  spiritSlotIndex,
                  derivedIndex,
                  expectedSlotType: slotType,
                  pairStatus: pairStatusByLocation.get(locationKey),
                  locked,
                }, presentText)}
              </article>
            `;
          }).join("")}
        </div>` : ""}
      ` : ""}
    </section>
  `;
}

function renderUndeterminedConfigDialog(draft) {
  if (!draft) return "";
  const micro = Math.max(0, Number(draft.micro) || 0);
  const medium = Math.max(0, Number(draft.medium) || 0);
  const total = micro + medium;
  const atLimit = total >= 5;
  return `
    <div class="pact-undetermined-config-backdrop" data-action="pact-undetermined-config-cancel"></div>
    <section id="pact-undetermined-config-dialog" class="pact-undetermined-config-dialog"
      data-role="pact-undetermined-config-dialog" data-spirit-slot-index="${draft.spiritSlotIndex}"
      role="dialog" aria-modal="true" aria-labelledby="pact-undetermined-config-title">
      <h3 id="pact-undetermined-config-title">미정 숙명 슬롯 설정</h3>
      <p>하위 숙명 슬롯과 중위 숙명 슬롯은 합계 5개까지 설정할 수 있습니다.</p>
      <div class="pact-undetermined-config-counter">
        <strong>하위 숙명</strong>
        <button type="button" data-action="pact-undetermined-config-adjust" data-slot-type="micro"
          data-delta="-1" aria-label="하위 숙명 슬롯 줄이기" ${micro <= 0 ? "disabled" : ""}>−</button>
        <output data-role="pact-undetermined-micro-count" aria-live="polite">${micro}</output>
        <button type="button" data-action="pact-undetermined-config-adjust" data-slot-type="micro"
          data-delta="1" aria-label="하위 숙명 슬롯 늘리기" ${atLimit ? "disabled" : ""}>+</button>
      </div>
      <div class="pact-undetermined-config-counter">
        <strong>중위 숙명</strong>
        <button type="button" data-action="pact-undetermined-config-adjust" data-slot-type="medium"
          data-delta="-1" aria-label="중위 숙명 슬롯 줄이기" ${medium <= 0 ? "disabled" : ""}>−</button>
        <output data-role="pact-undetermined-medium-count" aria-live="polite">${medium}</output>
        <button type="button" data-action="pact-undetermined-config-adjust" data-slot-type="medium"
          data-delta="1" aria-label="중위 숙명 슬롯 늘리기" ${atLimit ? "disabled" : ""}>+</button>
      </div>
      <output class="pact-undetermined-config-total" data-role="pact-undetermined-total-count"
        aria-live="polite">${total} / 5</output>
      <div class="pact-undetermined-config-actions">
        <button type="button" data-action="pact-undetermined-config-cancel">취소</button>
        <button type="button" data-action="pact-undetermined-config-confirm"
          ${total <= 0 || total > 5 ? "disabled" : ""}>확인</button>
      </div>
    </section>
  `;
}

export function createPactUndeterminedConfigDraft(model, inputState, spiritSlotIndex) {
  const state = normalizePactDestinyState(model, inputState);
  if (!validIndex(spiritSlotIndex, state.slots.length)) return null;
  const spiritSlot = state.slots[spiritSlotIndex];
  const undetermined = spiritSlot.undeterminedFate;
  const unresolvedLayout = undetermined && !model.undeterminedLayouts.some(({ id }) => (
    id === undetermined.slotLayoutId
  ));
  if (
    !spiritSlot.spirit
    || spiritSlot.spirit.unresolved
    || undetermined?.unresolved
    || undetermined?.destiny?.unresolved
    || unresolvedLayout
  ) return null;
  const slots = childSlots(undetermined);
  return {
    spiritSlotIndex,
    micro: slots.filter(({ slotType }) => slotType === "micro").length,
    medium: slots.filter(({ slotType }) => slotType === "medium").length,
  };
}

export function updatePactUndeterminedConfigDraft(input, command) {
  if (!input || !["micro", "medium"].includes(command?.slotType)) return input ?? null;
  const micro = Math.max(0, Math.trunc(Number(input.micro) || 0));
  const medium = Math.max(0, Math.trunc(Number(input.medium) || 0));
  const slotType = command.slotType;
  const delta = Math.trunc(Number(command.delta) || 0);
  const current = slotType === "micro" ? micro : medium;
  const other = slotType === "micro" ? medium : micro;
  const next = Math.max(0, Math.min(5 - other, current + delta));
  return {
    spiritSlotIndex: input.spiritSlotIndex,
    micro: slotType === "micro" ? next : micro,
    medium: slotType === "medium" ? next : medium,
  };
}

export function resolvePactUndeterminedConfigLayout(model, draft) {
  const micro = Math.max(0, Math.trunc(Number(draft?.micro) || 0));
  const medium = Math.max(0, Math.trunc(Number(draft?.medium) || 0));
  if (micro + medium < 1 || micro + medium > 5) return null;
  return model.undeterminedLayouts.find(({ slots }) => (
    slots.length === micro + medium
      && slots.filter((slotType) => slotType === "micro").length === micro
      && slots.filter((slotType) => slotType === "medium").length === medium
  )) ?? null;
}

function renderSpiritSlot(
  model,
  spiritSlot,
  spiritSlotIndex,
  pairStatusByLocation,
  presentText,
  searches,
) {
  const view = spiritSlot.spirit ? getPactSpiritView(model, spiritSlot.spirit) : null;
  const hasSpirit = Boolean(spiritSlot.spirit);
  const unresolvedSpirit = hasSpirit && !view;
  if (view && !view.structureSupported) {
    return `
      <article class="pact-spirit-slot is-source-only" data-role="pact-spirit-slot"
        data-slot-index="${spiritSlotIndex}" data-spirit-slot-id="${escapeHtml(spiritSlot.slotId)}">
        <h4>정령 ${spiritSlotIndex + 1}</h4>
        <label>정령 선택
          <select data-action="pact-spirit-set" data-slot-index="${spiritSlotIndex}"
            aria-label="정령 ${spiritSlotIndex + 1} 선택">
            <option value="">선택 안 함</option>
            ${sourceOptions(
              model.spirits,
              view.spiritId,
              "spirit",
              "spirits",
              presentText,
              searches.spirit,
            )}
          </select>
        </label>
        <div class="pact-spirit-detail">
          ${renderPactIcon(view, "pact-spirit-icon-fallback")}
          <strong>${escapeHtml(presentText(view.name, {
            categoryId: "spirits", sourceUrl: view.sourceUrl, itemId: view.catalogId || view.spiritId,
            field: "name", optional: false,
          }))}</strong>
          <p>${escapeHtml(presentText(view.detail, {
            categoryId: "spirits", sourceUrl: view.sourceUrl, itemId: view.catalogId || view.spiritId,
            field: "detail", optional: false,
          }))}</p>
          <strong class="pact-source-support-badge" data-role="pact-source-only-spirit">구조·계산 미지원</strong>
          <small>TLIDB SS13 한국어 원문은 확인됐지만 링·레벨 구조가 없어 계산하지 않습니다.</small>
          <button type="button" data-action="pact-spirit-clear" data-slot-index="${spiritSlotIndex}">정령 선택 비우기</button>
        </div>
      </article>
    `;
  }
  const spiritMeta = view
    ? [
      presentText(view.type, {
        categoryId: "spirits", sourceUrl: view.sourceUrl, itemId: view.spiritId,
        field: "type", optional: true,
      }),
      presentText(view.rarity, {
        categoryId: "spirits", sourceUrl: view.sourceUrl, itemId: view.spiritId,
        field: "rarity", optional: true,
      }),
    ].filter(Boolean).join(" · ")
    : "";
  return `
    <article class="pact-spirit-slot" data-role="pact-spirit-slot"
      data-slot-index="${spiritSlotIndex}" data-spirit-slot-id="${escapeHtml(spiritSlot.slotId)}">
      <h4>정령 ${spiritSlotIndex + 1}</h4>
      <label>정령 선택
        <select data-action="pact-spirit-set" data-slot-index="${spiritSlotIndex}"
          aria-label="정령 ${spiritSlotIndex + 1} 선택"
          ${unresolvedSpirit ? "disabled" : ""}>
          <option value="">선택 안 함</option>
          ${sourceOptions(
            model.spirits,
            spiritSlot.spirit?.spiritId,
            "spirit",
            "spirits",
            presentText,
            searches.spirit,
          )}
        </select>
      </label>
      ${hasSpirit ? `
        <div class="pact-spirit-detail">
          ${view ? `
            ${renderPactIcon(view, "pact-spirit-icon-fallback")}
            <strong>${escapeHtml(presentText(view.name, {
              categoryId: "spirits", sourceUrl: view.sourceUrl, itemId: view.spiritId, field: "name", optional: false,
            }))}</strong>
            ${spiritMeta ? `<p data-role="pact-spirit-meta">${escapeHtml(spiritMeta)}</p>` : ""}
            <p>${escapeHtml(presentText(view.overview, {
              categoryId: "spirits", sourceUrl: view.sourceUrl, itemId: view.spiritId, field: "overview", optional: true,
            }))}</p>
            <label>레벨
              <select data-action="pact-spirit-level" data-slot-index="${spiritSlotIndex}" value="${view.level}"
                aria-label="정령 ${spiritSlotIndex + 1} 레벨">
                ${Array.from({ length: 6 }, (_, index) => {
                  const level = index + 1;
                  return `<option value="${level}" ${level === view.level ? "selected" : ""}>${level}</option>`;
                }).join("")}
              </select>
            </label>
            <section class="pact-source-affix" data-role="pact-spirit-main-affix">
              <h5>${escapeHtml(presentText(view.mainAffix.name, {
                categoryId: "spirits", sourceUrl: view.sourceUrl, itemId: view.spiritId,
                field: "mainAffix.name", optional: true,
              }))}</h5>
              <p>${escapeHtml(presentText(view.mainAffix.effect, {
                categoryId: "spirits", sourceUrl: view.sourceUrl, itemId: view.spiritId,
                field: "mainAffix.effect", optional: true,
              }))}</p>
              <p>${escapeHtml(presentText(view.mainAffix.category, {
                categoryId: "spirits", sourceUrl: view.sourceUrl, itemId: view.spiritId,
                field: "mainAffix.category", optional: true,
              }))}</p>
            </section>
            <section class="pact-source-affixes" data-role="pact-spirit-level-affixes">
              <h5>레벨 ${view.level} 효과</h5>
              <ul>${view.levelAffixes.map((affix, affixIndex) => `<li>${escapeHtml(presentText(affix, {
                categoryId: "spirits", sourceUrl: view.sourceUrl, itemId: view.spiritId,
                field: `levelAffixes.${view.level}.${affixIndex}`, optional: true,
              }))}</li>`).join("")}</ul>
            </section>
            ${view.calculationLimitation ? `
              <strong data-role="pact-spirit-calculation-partial">
                현재 TLIDB SS13 원문에서 확인되지 않은 레벨 효과 ${view.calculationLimitation.omittedCount}개는 계산에서 제외됩니다.
              </strong>
            ` : ""}
          ` : renderUnresolvedInstance(spiritSlot.spirit, {
            categoryId: "spirits",
            role: "pact-unresolved-spirit",
          }, presentText)}
          <div class="pact-destiny-grid is-ring-grid" data-active-ring="${escapeHtml(searches.activeRing)}">
            ${(view ? view.rings.map(({ slotId }) => slotId) : PACT_RING_SLOT_ORDER).map((ringSlotId) => (
              `<div ${searches.activeRing === ringSlotId ? "" : "hidden"}>${renderRingSlot(
                model,
                view,
                spiritSlot,
                spiritSlotIndex,
                ringSlotId,
                pairStatusByLocation,
                unresolvedSpirit,
                presentText,
                searches.destiny,
              )}</div>`
            )).join("")}
          </div>
          <div ${searches.activeRing === "undetermined" ? "" : "hidden"}>${renderUndetermined(
            model,
            spiritSlot,
            spiritSlotIndex,
            pairStatusByLocation,
            unresolvedSpirit,
            presentText,
            searches.destiny,
          )}</div>
          <button type="button" data-action="pact-spirit-clear" data-slot-index="${spiritSlotIndex}">${unresolvedSpirit ? "미검증 정령과 선택한 운명 비우기" : "정령과 선택한 운명 비우기"}</button>
        </div>
      ` : ""}
    </article>
  `;
}

function collectUsage(state) {
  const usage = { micro: 0, medium: 0 };
  const count = (destiny, fallbackSlotType) => {
    if (!destiny) return;
    const slotType = fallbackSlotType;
    if (slotType === "micro") usage.micro += 1;
    if (slotType === "medium") usage.medium += 1;
  };
  for (const slot of state.slots) {
    for (const ringSlotId of PACT_RING_SLOT_ORDER) {
      count(slot.rings[ringSlotId].installedDestiny, getPactRingSlotType(ringSlotId));
    }
    for (const child of childSlots(slot.undeterminedFate)) count(childDestiny(child), child?.slotType);
  }
  for (const destiny of state.legacyUnassigned?.smallSlots ?? []) count(destiny, "micro");
  for (const destiny of state.legacyUnassigned?.mediumSlots ?? []) count(destiny, "medium");
  for (const undetermined of state.legacyUnassigned?.undetermined ?? []) {
    for (const child of childSlots(undetermined)) {
      count(childDestiny(child), child?.slotType);
    }
  }
  return usage;
}

function renderContractOrbit(model, state, editorUi, presentText) {
  return `<div class="ingame-pact-orbit" aria-label="계약 링">${renderPactConnections()}${state.slots.map((slot, index) => {
    const spirit = slot.spirit ? getPactSpiritView(model, slot.spirit) : null;
    const name = spirit ? presentText(spirit.name, { categoryId: "spirits", sourceUrl: spirit.sourceUrl, itemId: spirit.spiritId, field: "name" }) : "정령 선택";
    return `<button class="ingame-pact-spirit" style="${pactPointStyle(index, -1)}" data-action="pact-slot-activate" data-slot-index="${index}" aria-label="정령 ${index + 1}: ${escapeHtml(name)}" aria-pressed="${editorUi.activeSlotIndex === index && !editorUi.ringSlotId}">${spirit ? renderPactIcon(spirit, "pact-orbit-fallback") : "+"}<strong>${escapeHtml(name)}</strong><small>${spirit ? `레벨 ${spirit.level}` : `정령 ${index + 1}`}</small></button>${(spirit ? getPactSpiritRingSlotOrder(spirit) : PACT_RING_SLOT_ORDER).map((ringSlotId, ringIndex) => {
      const ring = spirit?.rings?.find((item) => item.slotId === ringSlotId);
      const destiny = getDestinyView(model, slot.rings?.[ringSlotId]?.installedDestiny, getPactRingSlotType(ringSlotId));
      const label = destiny ? presentText(destiny.name, { categoryId: "destiny", sourceUrl: destiny.sourceUrl, field: "name" }) : ringPlacementLabel(ringSlotId);
      const available = spirit && spirit.structureSupported !== false;
      return `<button class="ingame-pact-node ${getPactRingSlotType(ringSlotId)} ${destiny ? "is-filled" : ""}" style="${pactPointStyle(index, ringIndex)}" data-action="pact-ring-activate" data-slot-index="${index}" data-ring-slot-id="${ringSlotId}" aria-label="정령 ${index + 1} ${escapeHtml(label)}" title="${escapeHtml(label)}" aria-pressed="${editorUi.activeSlotIndex === index && editorUi.ringSlotId === ringSlotId}" ${available ? "" : "disabled"}>${renderPactIcon(destiny || ring, "pact-ring-fallback")}</button>`;
    }).join("")}<button class="ingame-pact-node undetermined" style="${pactPointStyle(index, 9)}" data-action="pact-ring-activate" data-slot-index="${index}" data-ring-slot-id="undetermined" aria-label="정령 ${index + 1} 미정 숙명" title="미정 숙명" ${spirit?.structureSupported ? "" : "disabled"}>${renderPactIcon({ iconUrl: spirit?.defaultUndeterminedFateIconUrl }, "pact-undetermined-fallback")}</button>${spirit?.mainAffix?.icon_url ? `<span class="ingame-pact-main-affix" style="${pactPointStyle(index, -2)}" aria-hidden="true">${renderPactIcon(spirit.mainAffix, "pact-main-fallback")}</span>` : ""}`;
  }).join("")}</div>`;
}

function legacySlotType(legacyKind) {
  if (legacyKind === "smallSlots") return "micro";
  if (legacyKind === "mediumSlots") return "medium";
  return null;
}

function legacyPlacementTargets(model, state, legacyKind) {
  const slotType = legacySlotType(legacyKind);
  const targets = [];
  for (const [spiritSlotIndex, slot] of state.slots.entries()) {
    if (!slot.spirit || slot.spirit.unresolved) continue;
    const selectedSpirit = model.spirits.find(({ id }) => id === slot.spirit.spiritId);
    if (slotType) {
      for (const ringSlotId of getPactSpiritRingSlotOrder(selectedSpirit)) {
        if (
          getPactRingSlotType(ringSlotId) === slotType
          && !slot.rings[ringSlotId].installedDestiny
        ) {
          targets.push({
            value: { kind: "ring", spiritSlotIndex, ringSlotId },
            label: `정령 ${spiritSlotIndex + 1} · ${ringPlacementLabel(ringSlotId)}`,
          });
        }
      }
      if (
        !slot.undeterminedFate?.unresolved
        && !slot.undeterminedFate?.destiny?.unresolved
      ) {
        for (const [derivedIndex, child] of childSlots(slot.undeterminedFate).entries()) {
          if (child?.slotType === slotType && !childDestiny(child)) {
            targets.push({
              value: { kind: "derived", spiritSlotIndex, derivedIndex },
              label: `정령 ${spiritSlotIndex + 1} · 미정 숙명 · ${derivedSlotTypeLabel(child.slotType)} 슬롯 ${derivedIndex + 1}`,
            });
          }
        }
      }
    } else if (legacyKind === "undetermined" && !slot.undeterminedFate) {
      targets.push({
        value: { kind: "undetermined", spiritSlotIndex },
        label: `정령 ${spiritSlotIndex + 1} · 빈 미정 숙명`,
      });
    }
  }
  return targets;
}

function renderLegacyPlacementOptions(model, state, legacyKind) {
  return legacyPlacementTargets(model, state, legacyKind).map(({ value, label }) => (
    `<option value="${escapeHtml(JSON.stringify(value))}">${escapeHtml(label)}</option>`
  )).join("");
}

function renderLegacyEntry(model, state, legacyKind, legacyIndex, instance, presentText) {
  if (!instance) return "";
  const slotType = legacySlotType(legacyKind);
  const isUndetermined = legacyKind === "undetermined";
  const view = isUndetermined
    ? getDestinyView(model, instance.destiny, "undetermined")
    : getDestinyView(model, instance, slotType);
  const unresolvedChildren = isUndetermined
    ? childSlots(instance).map((child) => ({
      child,
      destiny: childDestiny(child),
    })).filter(({ child, destiny }) => destiny && !getDestinyView(model, destiny, child?.slotType))
    : [];
  const unresolved = Boolean(instance.unresolved || !view || unresolvedChildren.length);
  const kindLabel = legacyKind === "smallSlots"
    ? "하위 숙명"
    : legacyKind === "mediumSlots" ? "중위 숙명" : "미정 숙명";
  return `
    <li class="pact-legacy-entry" data-role="pact-legacy-entry"
      data-legacy-kind="${legacyKind}" data-legacy-index="${legacyIndex}">
      <div class="pact-legacy-entry-detail">
        <strong>${kindLabel} ${legacyIndex + 1}${unresolved ? " · [미검증]" : ""}</strong>
        ${view?.name ? `<span>${escapeHtml(presentText(view.name, {
          categoryId: "destiny", sourceUrl: view.sourceUrl, itemId: view.destinyId,
          field: "name", optional: false,
        }))}</span>` : ""}
        ${instance.unresolved || !view
          ? renderUnresolvedInstance(instance, {
            categoryId: "destiny",
            role: isUndetermined ? "pact-unresolved-legacy-undetermined" : "pact-unresolved-legacy-destiny",
          }, presentText)
          : ""}
        ${unresolvedChildren.map(({ destiny }, childIndex) => renderUnresolvedInstance(destiny, {
          categoryId: "destiny",
          role: "pact-unresolved-legacy-child-destiny",
          childIndex,
        }, presentText)).join("")}
      </div>
      <label>수동 배치 위치
        <select data-action="pact-legacy-place" data-legacy-kind="${legacyKind}"
          data-legacy-index="${legacyIndex}">
          <option value="">배치 위치 선택</option>
          ${renderLegacyPlacementOptions(model, state, legacyKind)}
        </select>
      </label>
      <button type="button" data-action="pact-legacy-remove"
        data-legacy-kind="${legacyKind}" data-legacy-index="${legacyIndex}">이전 저장 항목 제거</button>
    </li>
  `;
}

function renderLegacyUnassigned(model, state, presentText) {
  if (!state.legacyUnassigned) return "";
  const entries = [];
  for (const legacyKind of ["smallSlots", "mediumSlots", "undetermined"]) {
    for (const [legacyIndex, instance] of (state.legacyUnassigned[legacyKind] ?? []).entries()) {
      if (instance) entries.push(renderLegacyEntry(
        model,
        state,
        legacyKind,
        legacyIndex,
        instance,
        presentText,
      ));
    }
  }
  if (!entries.length) return "";
  return `
    <section class="pact-editor-section pact-legacy-unassigned" data-role="pact-legacy-unassigned">
      <h3>이전 저장의 위치 미확정 선택</h3>
      <p>자동 배치하지 않은 이전 저장 항목입니다. 원하는 빈 위치에 직접 배치하거나 제거하세요.</p>
      <ul class="pact-legacy-entry-list">${entries.join("")}</ul>
    </section>
  `;
}

function renderSourceOnlyDestinies(model, state, presentText, destinySearch) {
  const records = model?.sourceOnlyDestinies ?? [];
  if (!records.length) return "";
  const selectedIds = new Set(state.sourceOnlyDestinyIds ?? []);
  return `
    <section class="pact-editor-section pact-source-only-destinies" data-role="pact-source-only-destinies">
      <h3>SS13 신규 운명 원문</h3>
      <p>TLIDB 한국어 원문은 확인됐지만 슬롯 위치와 계약판 구조는 확인되지 않아 계산하지 않습니다.</p>
      <div class="pact-source-only-list">
        ${records.map((record) => {
          const displayName = presentText(record.name, {
            categoryId: "destiny", sourceUrl: record.sourceUrl, itemId: record.catalogId || record.id,
            field: "name", optional: false,
          });
          return `
          <label class="pact-source-only-destiny" data-destiny-id="${escapeHtml(record.id)}"
            data-pact-search-kind="destiny" data-search-id="${escapeHtml(record.id)}"
            data-search-name="${escapeHtml(displayName)}"
            ${pactSourceNameMatches(displayName, destinySearch) ? "" : "hidden"}>
            <input type="checkbox" data-action="pact-source-only-destiny-toggle"
              data-destiny-id="${escapeHtml(record.id)}" ${selectedIds.has(record.id) ? "checked" : ""} />
            <strong>${escapeHtml(displayName)}</strong>
            <span>${escapeHtml(presentText(record.detail, {
              categoryId: "destiny", sourceUrl: record.sourceUrl, itemId: record.catalogId || record.id,
              field: "detail", optional: false,
            }))}</span>
            <small class="pact-source-support-badge" data-role="pact-source-support-badge">구조·계산 미지원</small>
            <small>TLIDB SS13 한국어 원문은 확인됐지만 슬롯 위치와 계약판 구조가 없어 계산하지 않습니다.</small>
          </label>
        `;
        }).join("")}
      </div>
    </section>
  `;
}

export function renderPactEditor(model, inputState, editorUi = {}) {
  const state = normalizePactDestinyState(model, inputState);
  const presentText = createPactGameTextPresenter(editorUi);
  const searches = {
    spirit: String(editorUi.spiritSearch ?? ""),
    destiny: String(editorUi.destinySearch ?? ""),
    activeRing: editorUi.ringSlotId ?? "",
  };
  const projection = projectPactDestinyCalculation(model, state);
  const pairStatusByLocation = new Map(
    projection.rules
      .filter(({ origin }) => origin === "dual_kismet_pair")
      .map(({ locationKey, status }) => [locationKey, status]),
  );
  const usage = collectUsage(state);
  const capacity = getPactDestinyCapacity(state);
  const activeSlotIndex = Number.isInteger(editorUi.activeSlotIndex)
    && editorUi.activeSlotIndex >= 0 && editorUi.activeSlotIndex < state.slots.length
    ? editorUi.activeSlotIndex : 0;
  return `
    <div class="pact-editor" data-pact-editor data-topology-version="${escapeHtml(state.topologyVersion)}">
      <header class="pact-editor-header">
        <h2>정령·운명</h2>
        <p>정령 또는 계약 링을 선택해 효과와 운명을 편집하세요.</p>
        <details class="pact-search-disclosure"><summary>정령·운명 검색</summary><div class="pact-source-searches">
          <label for="pact-spirit-search">정령 이름 검색
            <input id="pact-spirit-search" type="search" data-action="pact-source-filter"
              data-source-kind="spirit" data-total-count="${model.spirits.length}"
              value="${escapeHtml(searches.spirit)}" placeholder="TLIDB 한국어 이름 입력"
              aria-describedby="pact-spirit-search-count" autocomplete="off" />
            <output id="pact-spirit-search-count" data-role="pact-spirit-search-count">
              ${model.spirits.filter((record) => pactSourceNameMatches(presentText(record.name, {
                categoryId: "spirits", sourceUrl: record.sourceUrl, itemId: record.id,
                field: "name", optional: false,
              }), searches.spirit)).length}개 ${searches.spirit.trim() ? "검색됨" : "전체"}
            </output>
          </label>
          <label for="pact-destiny-search">운명 이름 검색
            <input id="pact-destiny-search" type="search" data-action="pact-source-filter"
              data-source-kind="destiny" data-total-count="${model.destinies.length}"
              value="${escapeHtml(searches.destiny)}" placeholder="TLIDB 한국어 이름 입력"
              aria-describedby="pact-destiny-search-count" autocomplete="off" />
            <output id="pact-destiny-search-count" data-role="pact-destiny-search-count">
              ${model.destinies.filter((record) => pactSourceNameMatches(presentText(record.name, {
                categoryId: "destiny", sourceUrl: record.sourceUrl, itemId: record.id,
                field: "name", optional: false,
              }), searches.destiny)).length}개 ${searches.destiny.trim() ? "검색됨" : "전체"}
            </output>
          </label>
        </div>
        </details><div class="pact-capacity" data-role="pact-capacity">
          <strong>하위 숙명 ${usage.micro} / ${capacity.micro}</strong>
          <strong>중위 숙명 ${usage.medium} / ${capacity.medium}</strong>
        </div>
      </header>
      <nav class="pact-slot-tabs" aria-label="정령 슬롯">
        ${state.slots.map((slot, index) => {
          const spirit = slot.spirit ? getPactSpiritView(model, slot.spirit) : null;
          const name = spirit ? presentText(spirit.name, {
            categoryId: "spirits", sourceUrl: spirit.sourceUrl, itemId: spirit.spiritId,
            field: "name", optional: false,
          }) : slot.spirit ? "미검증 정령" : "정령 선택";
          return `<button type="button" data-action="pact-slot-activate" data-slot-index="${index}"
            aria-pressed="${index === activeSlotIndex}" aria-controls="pact-slot-panel-${index}">
            <span>정령 ${index + 1}</span><strong>${escapeHtml(name)}</strong>
          </button>`;
        }).join("")}
      </nav>
      ${renderContractOrbit(model, state, { ...editorUi, activeSlotIndex }, presentText)}
      <section class="pact-editor-section ingame-pact-inspector">
        <div class="pact-spirit-grid">
          ${state.slots.map((slot, index) => `<div id="pact-slot-panel-${index}" data-pact-slot-panel="${index}"
            ${index === activeSlotIndex ? "" : "hidden"}>${renderSpiritSlot(
            model,
            slot,
            index,
            pairStatusByLocation,
            presentText,
            searches,
          )}</div>`).join("")}
        </div>
      </section>
      ${renderSourceOnlyDestinies(model, state, presentText, searches.destiny)}
      ${renderLegacyUnassigned(model, state, presentText)}
      ${renderUndeterminedConfigDialog(editorUi.undeterminedDraft)}
    </div>
  `;
}

function readIndex(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : null;
}

function readNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function readPlacementTarget(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value ?? ""));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function readPactEditorCommand(target) {
  const dataset = target?.dataset;
  const type = dataset?.action;
  if (typeof type !== "string" || !type.startsWith("pact-")) return null;
  const slotIndex = readIndex(dataset.slotIndex);
  const spiritSlotIndex = readIndex(dataset.spiritSlotIndex);
  const derivedIndex = readIndex(dataset.derivedIndex);
  switch (type) {
    case "pact-spirit-set":
      return slotIndex === null ? null : { type, slotIndex, spiritId: String(target.value ?? "") };
    case "pact-spirit-level": {
      const level = readNumber(target.value);
      return slotIndex === null || level === null ? null : { type, slotIndex, level };
    }
    case "pact-spirit-clear":
      return slotIndex === null ? null : { type, slotIndex };
    case "pact-source-only-destiny-toggle":
      return dataset.destinyId ? { type, destinyId: dataset.destinyId } : null;
    case "pact-ring-destiny-set":
      return spiritSlotIndex === null || !dataset.ringSlotId ? null : {
        type,
        spiritSlotIndex,
        ringSlotId: dataset.ringSlotId,
        destinyId: String(target.value ?? ""),
      };
    case "pact-ring-destiny-roll": {
      const value = readNumber(target.value);
      return spiritSlotIndex === null || !dataset.ringSlotId || value === null ? null : {
        type,
        spiritSlotIndex,
        ringSlotId: dataset.ringSlotId,
        rollKey: dataset.rollKey,
        value,
      };
    }
    case "pact-ring-destiny-clear":
      return spiritSlotIndex === null || !dataset.ringSlotId ? null : {
        type,
        spiritSlotIndex,
        ringSlotId: dataset.ringSlotId,
      };
    case "pact-undetermined-layout":
      return spiritSlotIndex === null ? null : {
        type,
        spiritSlotIndex,
        layoutId: String(target.value ?? ""),
      };
    case "pact-undetermined-destiny-set":
      return spiritSlotIndex === null || derivedIndex === null ? null : {
        type,
        spiritSlotIndex,
        derivedIndex,
        destinyId: String(target.value ?? ""),
      };
    case "pact-undetermined-destiny-roll": {
      const value = readNumber(target.value);
      return spiritSlotIndex === null || derivedIndex === null || value === null ? null : {
        type,
        spiritSlotIndex,
        derivedIndex,
        rollKey: dataset.rollKey,
        value,
      };
    }
    case "pact-undetermined-destiny-clear":
      return spiritSlotIndex === null || derivedIndex === null ? null : {
        type,
        spiritSlotIndex,
        derivedIndex,
      };
    case "pact-undetermined-clear":
      return spiritSlotIndex === null ? null : { type, spiritSlotIndex };
    case "pact-legacy-remove": {
      const legacyIndex = readIndex(dataset.legacyIndex);
      return legacyIndex === null || !dataset.legacyKind ? null : {
        type,
        legacyKind: dataset.legacyKind,
        legacyIndex,
      };
    }
    case "pact-legacy-place": {
      const legacyIndex = readIndex(dataset.legacyIndex);
      const placementTarget = readPlacementTarget(target.value ?? dataset.target);
      return legacyIndex === null || !dataset.legacyKind || !placementTarget ? null : {
        type,
        legacyKind: dataset.legacyKind,
        legacyIndex,
        target: placementTarget,
      };
    }
    default:
      return null;
  }
}

function allInstanceIds(state) {
  const ids = new Set();
  const add = (instance) => {
    if (typeof instance?.instanceId === "string" && instance.instanceId) ids.add(instance.instanceId);
  };
  for (const slot of state.slots) {
    add(slot.spirit);
    for (const ringSlotId of PACT_RING_SLOT_ORDER) add(slot.rings[ringSlotId].installedDestiny);
    add(slot.undeterminedFate);
    add(slot.undeterminedFate?.destiny);
    for (const child of childSlots(slot.undeterminedFate)) add(childDestiny(child));
  }
  for (const field of ["smallSlots", "mediumSlots"]) {
    for (const destiny of state.legacyUnassigned?.[field] ?? []) add(destiny);
  }
  for (const undetermined of state.legacyUnassigned?.undetermined ?? []) {
    add(undetermined);
    add(undetermined?.destiny);
    for (const child of childSlots(undetermined)) add(childDestiny(child));
  }
  return ids;
}

function nextInstanceId(state, prefix) {
  const safePrefix = String(prefix).replace(/[^a-zA-Z0-9_-]+/g, "-");
  const ids = allInstanceIds(state);
  let suffix = 1;
  while (ids.has(`${safePrefix}-${suffix}`)) suffix += 1;
  return `${safePrefix}-${suffix}`;
}

function validIndex(value, size) {
  return Number.isInteger(value) && value >= 0 && value < size;
}

function validRingSlotId(value) {
  return PACT_RING_SLOT_ORDER.includes(value);
}

function reducedCapacityRejection(state) {
  const usage = collectUsage(state);
  const capacity = getPactDestinyCapacity(state);
  for (const slotType of ["micro", "medium"]) {
    if (usage[slotType] > capacity[slotType]) {
      return {
        status: "capacity-exceeded",
        slotType,
        usage: usage[slotType],
        newCapacity: capacity[slotType],
      };
    }
  }
  return null;
}

function reduceLegacyCommandWithStatus(model, state, command) {
  if (!["pact-legacy-remove", "pact-legacy-place"].includes(command?.type)) return null;
  const legacyKind = command.legacyKind;
  const legacyIndex = command.legacyIndex;
  const legacyItems = state.legacyUnassigned?.[legacyKind];
  if (
    !["smallSlots", "mediumSlots", "undetermined"].includes(legacyKind)
    || !validIndex(legacyIndex, legacyItems?.length ?? 0)
    || !legacyItems[legacyIndex]
  ) return { state, status: "unchanged" };

  const nextState = normalizePactDestinyState(model, state);
  const source = nextState.legacyUnassigned[legacyKind][legacyIndex];
  if (command.type === "pact-legacy-remove") {
    nextState.legacyUnassigned[legacyKind][legacyIndex] = null;
    const rejection = legacyKind === "undetermined"
      ? reducedCapacityRejection(nextState)
      : null;
    if (rejection) return { state, ...rejection };
    return { state: nextState, status: "applied" };
  }

  const target = command.target;
  const spiritSlotIndex = target?.spiritSlotIndex;
  if (!validIndex(spiritSlotIndex, nextState.slots.length)) return { state, status: "unchanged" };
  const spiritSlot = nextState.slots[spiritSlotIndex];
  if (!spiritSlot.spirit || spiritSlot.spirit.unresolved) return { state, status: "unchanged" };

  const slotType = legacySlotType(legacyKind);
  if (slotType && target?.kind === "ring") {
    const selectedSpirit = model.spirits.find(({ id }) => id === spiritSlot.spirit.spiritId);
    if (
      !validRingSlotId(target.ringSlotId)
      || !isPactSpiritRingSlotAvailable(selectedSpirit, target.ringSlotId)
      || getPactRingSlotType(target.ringSlotId) !== slotType
      || spiritSlot.rings[target.ringSlotId].installedDestiny
    ) return { state, status: "unchanged" };
    spiritSlot.rings[target.ringSlotId].installedDestiny = source;
  } else if (slotType && target?.kind === "derived") {
    const undetermined = spiritSlot.undeterminedFate;
    if (
      !undetermined
      || undetermined.unresolved
      || undetermined.destiny?.unresolved
      || !validIndex(target.derivedIndex, childSlots(undetermined).length)
    ) return { state, status: "unchanged" };
    const child = childSlots(undetermined)[target.derivedIndex];
    if (child?.slotType !== slotType || childDestiny(child)) return { state, status: "unchanged" };
    child.installedDestiny = source;
  } else if (legacyKind === "undetermined" && target?.kind === "undetermined") {
    if (spiritSlot.undeterminedFate) return { state, status: "unchanged" };
    spiritSlot.undeterminedFate = source;
  } else {
    return { state, status: "unchanged" };
  }

  nextState.legacyUnassigned[legacyKind][legacyIndex] = null;
  const usage = collectUsage(nextState);
  const capacity = getPactDestinyCapacity(nextState);
  for (const capacitySlotType of ["micro", "medium"]) {
    if (usage[capacitySlotType] > capacity[capacitySlotType]) {
      return {
        state,
        status: "capacity-exceeded",
        slotType: capacitySlotType,
        usage: usage[capacitySlotType],
        capacity: capacity[capacitySlotType],
      };
    }
  }
  return { state: nextState, status: "applied" };
}

function ringCapacityRejection(model, state, command) {
  if (command?.type !== "pact-ring-destiny-set" || !command.destinyId) return null;
  if (!validIndex(command.spiritSlotIndex, state.slots.length)) return null;
  if (!validRingSlotId(command.ringSlotId)) return null;
  const slot = state.slots[command.spiritSlotIndex];
  const ring = slot?.rings?.[command.ringSlotId];
  const slotType = getPactRingSlotType(command.ringSlotId);
  const selectedSpirit = model.spirits.find(({ id }) => id === slot?.spirit?.spiritId);
  const destiny = model.destinies.find(({ id }) => id === command.destinyId);
  if (
    !slot?.spirit
    || slot.spirit.unresolved
    || !isPactSpiritRingSlotAvailable(selectedSpirit, command.ringSlotId)
    || !ring
    || ring.installedDestiny
    || destiny?.slotType !== slotType
  ) return null;
  const usage = collectUsage(state)[slotType];
  const capacity = getPactDestinyCapacity(state)[slotType];
  return usage >= capacity ? { status: "capacity-exceeded", slotType, usage, capacity } : null;
}

function derivedCapacityRejection(model, state, command) {
  if (command?.type !== "pact-undetermined-destiny-set" || !command.destinyId) return null;
  if (!validIndex(command.spiritSlotIndex, state.slots.length)) return null;
  const slot = state.slots[command.spiritSlotIndex];
  const undetermined = slot?.undeterminedFate;
  if (
    !slot?.spirit
    || slot.spirit.unresolved
    || undetermined?.unresolved
    || !validIndex(command.derivedIndex, childSlots(undetermined).length)
  ) return null;
  const child = childSlots(undetermined)[command.derivedIndex];
  if (!child || typeof child !== "object") return null;
  const destiny = model.destinies.find(({ id }) => id === command.destinyId);
  if (childDestiny(child) || destiny?.slotType !== child?.slotType) return null;
  const usage = collectUsage(state)[child.slotType];
  const capacity = getPactDestinyCapacity(state)[child.slotType];
  return usage >= capacity
    ? { status: "capacity-exceeded", slotType: child.slotType, usage, capacity }
    : null;
}

function capacityReductionRejection(model, state, command) {
  if (![
    "pact-undetermined-layout",
    "pact-undetermined-clear",
    "pact-spirit-set",
    "pact-spirit-clear",
  ].includes(command?.type)) return null;
  const slotIndex = command.type.startsWith("pact-spirit-")
    ? command.slotIndex
    : command.spiritSlotIndex;
  if (!validIndex(slotIndex, state.slots.length)) return null;

  const nextState = reducePactEditorCommandState(model, state, command);
  if (JSON.stringify(nextState) === JSON.stringify(state)) return null;
  return reducedCapacityRejection(nextState);
}

function reducePactEditorCommandState(model, inputState, command) {
  const state = normalizePactDestinyState(model, inputState);
  if (!command || typeof command.type !== "string") return state;

  if (command.type === "pact-source-only-destiny-toggle") {
    const destiny = model.sourceOnlyDestinies?.find(({ id }) => id === command.destinyId);
    if (!destiny) return state;
    const selectedIds = new Set(state.sourceOnlyDestinyIds ?? []);
    if (selectedIds.has(destiny.id)) selectedIds.delete(destiny.id);
    else selectedIds.add(destiny.id);
    if (selectedIds.size) state.sourceOnlyDestinyIds = [...selectedIds];
    else delete state.sourceOnlyDestinyIds;
    return state;
  }

  if (["pact-spirit-set", "pact-spirit-level", "pact-spirit-clear"].includes(command.type)) {
    if (!validIndex(command.slotIndex, state.slots.length)) return state;
    const slot = state.slots[command.slotIndex];
    if (command.type === "pact-spirit-set" && slot.spirit?.unresolved) return state;
    if (command.type === "pact-spirit-clear" || (command.type === "pact-spirit-set" && !command.spiritId)) {
      state.slots[command.slotIndex] = createEmptyPactSpiritSlot(slot.slotId);
      return state;
    }
    if (command.type === "pact-spirit-level") {
      const selectedSpirit = model.spirits.find(({ id }) => id === slot.spirit?.spiritId);
      if (slot.spirit && selectedSpirit?.structureSupported !== false) {
        slot.spirit = updatePactSpiritLevel(model, slot.spirit, command.level);
      }
      return state;
    }
    const spirit = model.spirits.find(({ id }) => id === command.spiritId);
    if (!spirit || slot.spirit?.spiritId === spirit.id) return state;
    const replacement = createEmptyPactSpiritSlot(slot.slotId);
    replacement.spirit = createPactSpiritInstance(
      model,
      spirit.id,
      nextInstanceId(state, `pact-spirit-${spirit.id}`),
    );
    state.slots[command.slotIndex] = replacement;
    return state;
  }

  if (!validIndex(command.spiritSlotIndex, state.slots.length)) return state;
  const slot = state.slots[command.spiritSlotIndex];
  if (!slot.spirit) return state;
  const selectedSpirit = model.spirits.find(({ id }) => id === slot.spirit.spiritId);
  if (selectedSpirit?.structureSupported === false) return state;

  if (["pact-ring-destiny-set", "pact-ring-destiny-roll", "pact-ring-destiny-clear"].includes(command.type)) {
    if (!validRingSlotId(command.ringSlotId)) return state;
    if (!isPactSpiritRingSlotAvailable(selectedSpirit, command.ringSlotId)) return state;
    const ring = slot.rings[command.ringSlotId];
    const expectedSlotType = getPactRingSlotType(command.ringSlotId);
    if (
      command.type === "pact-ring-destiny-set"
      && (slot.spirit.unresolved || ring.installedDestiny?.unresolved)
    ) return state;
    if (command.type === "pact-ring-destiny-clear" || (command.type === "pact-ring-destiny-set" && !command.destinyId)) {
      ring.installedDestiny = null;
      return state;
    }
    if (command.type === "pact-ring-destiny-roll") {
      if (ring.installedDestiny) {
        ring.installedDestiny = updateDestinyRoll(
          model,
          ring.installedDestiny,
          command.rollKey,
          command.value,
          expectedSlotType,
        );
      }
      return state;
    }
    const destiny = model.destinies.find(({ id }) => id === command.destinyId);
    if (!destiny || destiny.slotType !== expectedSlotType || ring.installedDestiny?.destinyId === destiny.id) {
      return state;
    }
    ring.installedDestiny = createDestinyInstance(
      model,
      destiny.id,
      nextInstanceId(state, `pact-destiny-${destiny.id}`),
    );
    return state;
  }

  if (command.type === "pact-undetermined-layout") {
    if (
      slot.spirit.unresolved
      || slot.undeterminedFate?.unresolved
      || slot.undeterminedFate?.destiny?.unresolved
    ) return state;
    if (!command.layoutId) {
      slot.undeterminedFate = null;
      return state;
    }
    const layout = model.undeterminedLayouts.find(({ id }) => id === command.layoutId);
    if (!layout || slot.undeterminedFate?.slotLayoutId === layout.id) return state;
    slot.undeterminedFate = createUndeterminedDestinyInstance(
      model,
      layout.id,
      nextInstanceId(state, `pact-undetermined-${layout.id}`),
    );
    return state;
  }

  if (command.type === "pact-undetermined-clear") {
    slot.undeterminedFate = null;
    return state;
  }

  const undetermined = slot.undeterminedFate;
  const children = childSlots(undetermined);
  if (!undetermined || !validIndex(command.derivedIndex, children.length)) return state;
  const child = children[command.derivedIndex];
  if (!child || typeof child !== "object") return state;
  if (command.type === "pact-undetermined-destiny-clear"
    || (command.type === "pact-undetermined-destiny-set" && !command.destinyId)) {
    if (undetermined.unresolved) clearUnresolvedChildDestiny(child);
    else slot.undeterminedFate = setUndeterminedDestinySlot(model, undetermined, command.derivedIndex, null);
    return state;
  }
  if (command.type === "pact-undetermined-destiny-roll") {
    const installedDestiny = childDestiny(child);
    if (!installedDestiny) return state;
    const destiny = updateDestinyRoll(
      model,
      installedDestiny,
      command.rollKey,
      command.value,
      child.slotType,
    );
    slot.undeterminedFate = setUndeterminedDestinySlot(model, undetermined, command.derivedIndex, destiny);
    return state;
  }
  if (command.type === "pact-undetermined-destiny-set") {
    const installedDestiny = childDestiny(child);
    if (slot.spirit.unresolved || undetermined.unresolved || installedDestiny?.unresolved) return state;
    const destiny = model.destinies.find(({ id }) => id === command.destinyId);
    if (!destiny || destiny.slotType !== child.slotType || installedDestiny?.destinyId === destiny.id) {
      return state;
    }
    const instance = createDestinyInstance(
      model,
      destiny.id,
      nextInstanceId(state, `pact-derived-destiny-${destiny.id}`),
    );
    slot.undeterminedFate = setUndeterminedDestinySlot(model, undetermined, command.derivedIndex, instance);
  }
  return state;
}

export function reducePactEditorCommandWithStatus(model, inputState, command) {
  const state = normalizePactDestinyState(model, inputState);
  const legacyResult = reduceLegacyCommandWithStatus(model, state, command);
  if (legacyResult) return legacyResult;
  const rejection = ringCapacityRejection(model, state, command)
    ?? derivedCapacityRejection(model, state, command)
    ?? capacityReductionRejection(model, state, command);
  if (rejection) return { state, ...rejection };
  const nextState = reducePactEditorCommandState(model, state, command);
  return {
    state: nextState,
    status: JSON.stringify(nextState) === JSON.stringify(state) ? "unchanged" : "applied",
  };
}

export function reducePactEditorCommand(model, inputState, command) {
  return reducePactEditorCommandWithStatus(model, inputState, command).state;
}
