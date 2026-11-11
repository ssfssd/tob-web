import { normalizeBuild } from "./engine.js";
import { findItemById } from "./catalog.js";
import { getIngameHeroArt } from "./ingameHeroArt.js";
import { renderTalentScene, renderPactScene } from "./seasonBoardScenes.js";
import { spriteKeys, columns, rows as spriteRows } from "./data/heroTraitArtwork.generated.js";
import { SS14_CARDS } from "./data/ss14Cards.generated.js";
import { SS14_SUPPORTS } from "./data/ss14Supports.generated.js";
import { seasonHeroOptions, seasonHeroTraitOptions, EMPTY_TRAIT_MEMORY, canMarkTraitMemoryEmpty, traitSlotCount, buildTraitSlots } from "./seasonHeroSelection.js";
import { seasonMemoryOptions, seasonTalentBoards, seasonTalentNodes, seasonSpiritOptions } from "./seasonNativeSelections.js";
import { getSeasonSelectionOptions, SEASON_GEAR_SLOT_LABELS } from "./seasonSelections.js";
import { seasonSupportOptions } from "./seasonSupport.js";
import { seasonDestinyOptions } from './seasonDestiny.js';
import { nativeElixirOptions, nativeModuleOptions, nativeModuleAffixes } from "./seasonNativeExtensions.js";
import { seasonInputRequirements } from "./seasonInputRequirements.js";
import { seasonDpsStatusLabel } from './seasonCalculationIssues.js';
import { seasonEffectSources, effectSourceLabel } from "./seasonEffectSources.js";
import { exportSeasonWorkspace } from "./seasonWorkspace.js";
import { previewLogGearOptions } from "./localGameLogImport.js";
import { renderSeasonNumericStats } from "./seasonNumericStatsView.js";
import { renderSlateEditor } from './seasonSlateEditor.js';
import { RESULT_TABS, renderResultConditions, renderResultAnalysis, renderEditDpsComparison } from './seasonResultPanels.js';
import { RUNTIME_POLICY, LOCAL_LOG_ONLY_MESSAGE } from "./runtimePolicy.js";
import { rollControls, componentControls, memoryControls, destinyControls, extensionControls, characterControls,
  offenseControls, blessingControls, theaControls, dpsControls, dpsResults, componentResults, characterResults, weaponSummary } from "./seasonWorkspaceView.js";

const esc = v => String(v ?? "").replace(/[&<>"']/gu, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const tabs = [["hero", "히어로·추억"], ["skills", "스킬"], ["gear", "장비"], ["talents", "재능"], ["divinity", "신격"], ["pact", "정령"], ["combat", "전투 조건"]];
const title = id => {
  const record = SS14_CARDS.records[id] ?? SS14_SUPPORTS.records[id];
  return record?.season === "SS14" && record.koreanTextVerified ? record.name : "한국어 이름 미제공";
};
const icon = id => {
  const item = findItemById(id), src = item?.localIconPath || item?.iconUrl || nativeElixirOptions().find(o => o.itemId === id)?.iconUrl;
  return src && /^(?:\.?\/?assets\/|https:\/\/cdn\.tlidb\.com\/)/u.test(src) ? `<img src="${esc(src)}" alt="" loading="lazy" />` : `<span aria-hidden="true">＋</span>`;
};
const button = (text, action, attrs = "") => `<button type="button" data-ss14-action="${action}" ${attrs}>${text}</button>`;
const field = (label, kind, value, attrs = "") => `<label>${esc(label)}<input type="number" data-season-edit="${kind}" value="${esc(value)}" ${attrs} /></label>`;
const select = (label, id, kind, value, options, attrs = "", search = false) => `${search ? `<label>이름 검색<input type="search" data-season-filter="${id}" aria-label="${esc(label)} 이름 검색" /></label>` : ""}<label>${esc(label)}<select id="${id}" aria-label="${esc(label)}" data-season-edit="${kind}" ${attrs}><option value="">${kind === "hero-choice" ? "미정" : "선택 안 함"}</option>${value && !options.some(o => String(o.id) === String(value)) ? `<option value="${esc(value)}" selected>이전 선택 보존 · SS14 원문 미확보</option>` : ""}${options.map(o => `<option value="${esc(o.id)}"${String(o.id) === String(value) ? " selected" : ""}>${esc(o.name)}</option>`).join("")}</select></label>`;
const slot = (id, label, type, index) => button(`${icon(id)}<span><small>${esc(label)}</small><strong>${id ? esc(title(id)) : "선택하기"}</strong></span>`, "edit-slot", `data-type="${type}" data-index="${index}" class="native-slot ${id ? "is-filled" : ""}" aria-label="${esc(label)} 편집" title="${esc(label)} · ${id ? esc(title(id)) : "선택하기"}"`);

function traitEmblem(heroId, trait, level) {
  const name = trait?.iconUrl?.split("/").pop()?.toLowerCase().replaceAll("_", "");
  const index = name ? spriteKeys.indexOf(heroId?.replace(/^hero-tlidb-com-cn-/u, "") + "/" + name) : -1;
  if (index < 0) return `<span class="stage-emblem" aria-hidden="true"><b>${level}</b></span>`;
  const x = 100 * (index % columns) / (columns - 1);
  const y = 100 * Math.floor(index / columns) / (spriteRows - 1);
  return `<span class="stage-emblem" aria-hidden="true"><i style="background-size:${columns * 100}% ${spriteRows * 100}%;background-position:${x}% ${y}%"></i></span>`;
}
function heroPanel(s) {
  const b = s.document.targetBuild, id = b.hero?.branchId, hero = seasonHeroOptions().find(h => h.id === id);
  const art = getIngameHeroArt(id), choices = seasonHeroTraitOptions(id);
  const portraits = art ? `<img class="hunter-portrait" src="${esc(art)}" alt="" />` : !hero
    ? `<div class="hunter-preview" aria-hidden="true">${["rehan_1", "thea_1", "carino_1"].map(name => `<img src="./assets/ingame-heroes/${name}.png" alt="">`).join("")}</div>` : "";
  return `<div class="hunter-scene"><div class="hunter-showcase">${portraits}<div class="hunter-caption"><h2>${esc(hero?.name ?? "히어로 선택")}</h2>${hero ? `<p>${esc(hero.title)}</p>` : ""}
    <div class="hunter-controls">${field("레벨", "hero-level", b.heroLevel ?? 90, 'min="1" max="100" step="1" aria-label="히어로 레벨"')}${button(hero ? "히어로 변경" : "히어로 선택", "edit-slot", 'data-type="hero"')}</div></div></div>
    <div class="hunter-path"><h2>히어로 특성</h2>${[1, 45, 60, 75].map((level, i) => {
      const slots=buildTraitSlots(b,level), count=traitSlotCount(id,level);
      const buttons=Array.from({length:count},(_,slot)=>{
      const key=slots[slot],trait=choices.find(t=>t.key===key);
      const tier = key && s.report.componentProjection.rows.find(r=>r.control?.recordKey===key)?.control.tier;
      const label = key === EMPTY_TRAIT_MEMORY ? "추억 미장착" : trait?.name ?? "특성 선택";
      const caption=`${level}레벨${count>1?` · 특성 ${slot+1}`:""}`;
      return button(`${traitEmblem(id,trait,level)}<span><small>${caption}</small><strong>${esc(label)}</strong></span>${tier?`<small>${tier}단계</small>`:""}`,"edit-slot",`data-type="traits" data-index="${level}" data-choice-index="${slot}" class="hunter-trait" aria-label="${caption} 특성 편집"`);
      }).join("");
      const memory = i ? b.hero?.memories?.[i - 1] : null;
      return `<div class="hunter-stage"><div class="hunter-stage-choices">${buttons}</div>${i ? button(`${icon(memory?.memoryTypeId)}<span>${esc(seasonMemoryOptions(i - 1).name)}</span>${memory ? `<small>+${memory.enhancement}</small>` : ""}`, "edit-slot", `data-type="memory" data-index="${i - 1}" class="hunter-memory"`) : ""}</div>`;
    }).join("")}</div></div>`;
}
function itemSource(id, label) {
  const r = SS14_CARDS.records[id] ?? SS14_SUPPORTS.records[id];
  if (!r || r.season !== "SS14") return "";
  const link = /^https:\/\/tlidb\.com\/(?:ko|en)\//u.test(r.sourceUrl ?? "")
    ? `<a href="${esc(r.sourceUrl)}" target="_blank" rel="noreferrer">SS14 원문 보기</a>` : "";
  return `<details class="native-option-source" data-role="slot-source-${esc(id)}"><summary>옵션 출처 · ${esc(label)}</summary><strong>${esc(title(id))}</strong>${r.koreanTextVerified ? `<p>${esc(r.detail)}</p>` : "<p>한국어 원문 미제공</p>"}${link}</details>`;
}
const sourceStats = {
  damage: "대미지", hit_damage: "적중 대미지", spell_damage: "주술 대미지", attack_damage: "공격 대미지",
  cold_damage: "냉기 대미지", fire_damage: "화염 대미지", lightning_damage: "번개 대미지", erosion_damage: "부식 대미지",
  physical_damage: "물리 대미지", elemental_damage: "원소 대미지", area_damage: "범위 대미지", projectile_damage: "투사체 대미지",
  cast_speed: "시전 속도", attack_speed: "공격 속도", strength: "힘", dexterity: "민첩", intelligence: "지혜",
  projectile_speed: "투사체 속도", movement_speed: "이동 속도", all_attributes: "모든 속성",
  all_stats: "모든 속성", max_life: "최대 HP", max_mana: "최대 MP", max_energy_shield: "최대 보호막",
  gear_energy_shield: "장비 보호막", gear_armor: "장비 아머", gear_evasion: "장비 회피", armor: "아머", evasion: "회피",
  cold_resistance: "냉기 저항", fire_resistance: "화염 저항", lightning_resistance: "번개 저항", erosion_resistance: "부식 저항",
  critical_strike_rating: "크리티컬 수치", critical_strike_damage: "크리티컬 대미지", double_damage_chance: "더블 대미지 확률",
  "spell-cold-damage-min": "최소 냉기 대미지", "spell-cold-damage-max": "최대 냉기 대미지", "added-damage-effectiveness": "추가 대미지 효율",
  "cast-time": "시전 시간", "mana-cost": "MP 소모", "cooldown": "쿨타임", "projectile-quantity": "투사체 수량",
};
export function renderEffectSources(s, path = null) {
  const rows = seasonEffectSources(s.report).filter(r => !path || r.path === path);
  const status = { direct: "직접 대미지 반영", selected: "선택 수치", inactive: "조건 미충족", blocked: "확인 필요", mechanic: "특수 효과 규칙" };
  return `<section class="native-effect-sources" aria-label="선택 효과별 출처">
    ${!path ? `<label>효과·출처 검색<input type="search" data-effect-filter aria-label="효과·출처 검색" /></label><label>표시 상태<select data-effect-status><option value="">전체</option>${Object.entries(status).map(([k,v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>` : ""}
    ${s.report.theaAverage ? "<p>아래 수치는 전투 시작 상태입니다. 전체 DPS는 선택한 시간 동안의 평균입니다.</p>" : ""}
    <div class="native-effect-list">${rows.map((r, i) => {
      const stat = r.effect?.stat ?? "", label = sourceStats[stat] ?? sourceStats[stat.replace(/^skill-/u, "").replaceAll("-", "_")]
        ?? (r.status === "mechanic" ? "발동·특수 효과" : r.status === "blocked" ? "미확인 효과" : `선택 효과 ${i + 1}`);
      const percent = r.effect?.unit === "percent" || ["more", "add_percent"].includes(r.effect?.operation);
      const value = r.value === null ? "" : `${r.value.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}${percent ? "%" : ""}${r.effect?.operation === "more" ? " 별도" : ""}`;
      return `<details class="native-effect-row" data-effect-state="${r.status}" data-role="effect-${esc(r.key)}"><summary><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${status[r.status]}</small><span class="native-effect-summary-owner">${esc(r.origin)} · ${esc(r.name || "한국어 이름 미제공")}</span></summary>
        <p class="native-effect-owner">${esc(r.origin)} · ${esc(r.name || "한국어 이름 미제공")}</p>
        ${r.appliedTo?.length ? `<p>적용 스킬: ${esc(r.appliedTo.join(", "))}</p>` : ""}
        ${r.status === "selected" ? "<p>선택한 수치입니다. 직접 대미지 반영 여부는 위의 적용 상태와 구분합니다.</p>" : ""}
        ${r.reason ? `<p>${/[가-힣]/u.test(r.reason) && !/\p{Script=Han}/u.test(r.reason) ? esc(r.reason) : "SS14 효과 또는 조건을 확인해야 합니다."}</p>` : ""}
        ${r.detail ? `<p class="native-effect-original">${esc(r.detail)}</p>` : "<p>한국어 원문 일부 미제공</p>"}
        ${/^https:\/\/tlidb\.com\/(?:en|ko)\//u.test(r.receipt?.sourceUrl ?? "") ? `<a href="${esc(r.receipt.sourceUrl)}" target="_blank" rel="noreferrer">SS14 원문 보기</a>` : ""}</details>`;
    }).join("") || "<p>이 슬롯에서 확인된 효과가 없습니다.</p>"}</div></section>`;
}
function itemPicker(s, category, index, supportIndex, current) {
  const support = Number.isInteger(supportIndex), kind = support ? "support-selection" : category === "gear" ? "gear-selection" : "skill-selection";
  const options = support ? seasonSupportOptions() : getSeasonSelectionOptions(category, index);
  const selected = s.picker?.candidate ?? current ?? "";
  const query = s.picker?.query ?? "";
  const key = value => String(value).normalize("NFKC").toLocaleLowerCase("ko").replace(/\s/gu, "");
  const match = option => key(`${option.name} ${(SS14_CARDS.records[option.id] ?? SS14_SUPPORTS.records[option.id])?.detail ?? ""}`).includes(key(query));
  const card = SS14_CARDS.records[selected] ?? SS14_SUPPORTS.records[selected];
  return `<div class="native-item-picker" aria-label="슬롯 아이템 선택">
    <header><label>이름·효과 검색<input type="search" data-picker-filter value="${esc(query)}" aria-label="이름·효과 검색" /></label>${current ? button("고른 아이템 보기", "cancel-picker") : ""}<small data-picker-count>${options.filter(match).length}개</small></header>
    <div class="native-picker-columns"><div class="native-picker-list" aria-label="아이템 후보">${options.map(o => button(`${icon(o.id)}<span>${esc(o.name)}</span>`, "preview-item",
      `data-id="${esc(o.id)}" data-picker-option data-search="${esc(`${o.name} ${(SS14_CARDS.records[o.id] ?? SS14_SUPPORTS.records[o.id])?.detail ?? ""}`)}" aria-pressed="${selected === o.id}"${match(o) ? "" : " hidden"}`)).join("")}</div>
    <article class="native-picker-card" aria-label="아이템 미리보기">${card ? `${icon(selected)}<h3>${esc(title(selected))}</h3><p>${card.koreanTextVerified ? esc(card.detail) : "한국어 원문 미제공"}</p>
      ${button("이 슬롯에 장착", "equip-item", `data-kind="${kind}" data-index="${index}" data-support="${support ? supportIndex : ""}" data-id="${esc(selected)}"`)}`
      : "<p>후보를 선택하면 효과와 설명을 확인할 수 있습니다.</p>"}</article></div></div>`;
}
function equipmentPanel(s, category) {
  const b = normalizeBuild(s.document.targetBuild), gear = category === "gear";
  const rows = [...b.skills.active, ...b.skills.passive];
  const selected = gear ? s.gearIndex ?? 0 : s.skillIndex ?? 0;
  const id = gear ? b.gear.slots[selected]?.itemId : rows[selected]?.skillId;
  const label = i => gear ? SEASON_GEAR_SLOT_LABELS[i] : `${i < 5 ? i === 0 ? "주력" : "액티브" : "패시브"} ${i < 5 ? i + 1 : i - 4}`;
  const row = rows[selected], support = !gear && Number.isInteger(s.supportIndex) && s.supportIndex < row.unlockedSupportCount ? s.supportIndex : null;
  const selectedId = support === null ? id : row.supports[support]?.supportId;
  const art = gear && getIngameHeroArt(b.hero?.branchId);
  const positions = gear ? [2, 3, 4, 5, 6, 9, 7, 8, 0, 1] : rows.map((_, i) => i);
  return `<div class="loadout-scene ${gear ? "gear-scene" : "skill-scene"}" data-role="slot-workspace">
    <div class="loadout-stage">${art ? `<img class="loadout-portrait" src="${esc(art)}" alt="">` : ""}
    <nav class="${gear ? "equipment-sockets" : "skill-rail"}" aria-label="${gear ? "장비" : "스킬"} 슬롯">${positions.map(i => {
      const current = gear ? b.gear.slots[i]?.itemId : rows[i]?.skillId;
      return button(`${icon(current)}<span class="slot-label">${esc(label(i))}</span>`,
        gear ? "inspect-gear" : "inspect-skill", `data-index="${i}" aria-label="${esc(label(i))} 편집" title="${esc(label(i))} · ${current ? esc(title(current)) : "빈 슬롯"}" aria-pressed="${selected === i}"`);
    }).join("")}</nav>${!gear ? skillSockets(row, id, support) : ""}</div>
    <section class="native-slot-detail" aria-label="선택 슬롯 편집">
      <header>${selectedId ? `<span class="detail-icon" aria-hidden="true">${icon(selectedId)}</span>` : ""}<small>${esc(label(selected))}</small><h2>${selectedId ? esc(title(selectedId)) : gear ? "장비 선택" : support === null ? "스킬 선택" : `보조 ${support + 1} 선택`}</h2></header>
      ${slotEditor({ ...s, overlay: { type: category, index: selected, supportIndex: support } })}
      ${selectedId && !s.picker ? `<details class="native-slot-effects" data-role="selected-slot-effects"><summary>이 슬롯의 효과별 출처</summary>${renderEffectSources(s, gear ? `gear.slots.${selected}` : `skills.rows.${selected}${support === null ? "" : `.supports.${support}`}`)}</details>` : ""}
      ${itemSource(selectedId, support === null ? label(selected) : `${label(selected)} · 보조 ${support + 1}`)}
      ${!gear ? button("영약·모듈화 편집", "edit-slot", 'data-type="extensions"') : ""}
    </section></div>`;
}
function skillSockets(row, id, selectedSupport) {
  const sockets = Array.from({length: 5}, (_, i) => {
    const open = i < row.unlockedSupportCount;
    const text = open ? `보조 ${i + 1}` : `보조 ${i + 1} · 미개방`;
    const contents = `${open ? icon(row.supports[i]?.supportId) : '<span aria-hidden="true">−</span>'}<small>${text}</small>`;
    return open ? button(contents, "inspect-socket", `class="link-node" data-position="${i}" data-index="${i}" aria-label="보조 ${i + 1} 편집" aria-pressed="${selectedSupport === i}"`)
      : `<span class="link-node locked" data-position="${i}">${contents}</span>`;
  });
  return `<nav class="socket-constellation" aria-label="선택 스킬 소켓"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 16 82 37 82 72 18 72 18 37Z"/>${["50 16", "82 37", "82 72", "18 72", "18 37"].map((point, i) => `<path d="M50 50 ${point}" class="${i < row.unlockedSupportCount ? "open-link" : "closed-link"}"/>`).join("")}</svg>
    ${button(`${icon(id)}<small>${id ? esc(title(id)) : "메인"}</small>`, "inspect-socket", `class="link-node main-node" data-index="-1" aria-label="메인 스킬 편집" aria-pressed="${selectedSupport === null}"`)}${sockets.join("")}</nav>`;
}
function talentPanel(s) {
  return renderTalentScene(s,{button,esc,select,icon})+theaControls(s.document,s.report,{});
}
function pactPanel(s) {
  return renderPactScene(s,{button,esc,select,icon});
}
function combatPanel(s) {
  const recovery=s.report.fullDps.burstRecovery;
  const editor=recovery?`<fieldset><legend>크리에이티브 대폭발 · 기발 회복</legend>
    <p>관측 시작을 0ms로 두고 실제 매직 버스트 발동을 빠짐없이 순서대로 기록하세요. 오버로드 시전 자체나 장벽 폭발 적중은 발동으로 세지 않습니다.</p>
    ${(s.document.targetBuild.ss14Inputs.bingBurstEvents??[]).map((e,i)=>{
      const field=(key,label,max)=>`<label>${label}<input type="number" min="0" max="${max}" step="1" aria-label="${i+1}번 ${label}" data-season-edit="bing-event" data-row="${i}" data-key="${key}" value="${e[key]??''}"></label>`;
      const r=recovery.rows[i], unit=n=>n==null?'미확인':n;
      return `<fieldset><legend>발동 ${i+1}</legend>${field('ms','시각 (ms)',86400000)}
        <label>발동 종류<select aria-label="${i+1}번 발동 종류" data-season-edit="bing-event-source" data-key="source" data-row="${i}"><option value="">선택</option>${[['normal','일반 시전'],['overload','창의 오버로드']].map(([id,label])=>`<option value="${id}"${e.source===id?' selected':''}>${label}</option>`).join('')}</select></label>
        ${field('charges','실제 소모 충전',1000)}${field('before','발동 직전 기발 (선택)',100)}
        ${r?`<p>기본 ${unit(r.base)} · 추가 ${unit(r.extra)} · 실제 회복 ${unit(r.credited)}${r.extra===null && r.groupAmount?' · 제한 적용 전 추가량 '+r.groupAmount:''}${r.reason?' · '+esc(r.reason):''}</p>`:''}
        ${button('발동 삭제','bing-event-remove',`data-row="${i}"`)}</fieldset>`;
    }).join('')}${button('발동 추가','bing-event-add')}${button('회복 계산','apply')}
    ${recovery.problem?`<p>${esc(recovery.problem)}</p>`:''}
    ${recovery.total!==null?`<p>기본·추가 합계 ${recovery.total} · 실제 회복 합계 ${recovery.credited??'직전 기발 확인 필요'}</p>`:''}
    <small>1초 제한의 기본 회복 적용 범위와 일반·오버로드 공유 여부는 미확인입니다. 회복을 추가 대미지나 발동 횟수로 환산하지 않습니다.</small></fieldset>`:'';
  return `${editor}${dpsControls(s.document, s.report, {})}<details data-role="native-critical-input"><summary>스킬 기본 크리티컬</summary>${offenseControls(s.document, s.report, {})}</details><details data-role="season-character-input"><summary>캐릭터 기본 수치·효과 조건</summary>${characterControls(s.document, s.report, {})}</details><details data-role="native-blessing-input"><summary>축복 중첩</summary>${blessingControls(s.document, s.report, {})}</details>${theaControls(s.document, s.report, {})}<details data-role="native-extension-input"><summary>영약·특수 효과 조건</summary>${extensionControls(s.report, {})}</details>`;
}
function divinityPanel(s) {
  const conditions=netherConditions(s.report);
  return `${renderSlateEditor(s)}${conditions?`<details class="slate-combat-conditions" data-role="slate-combat-conditions"><summary>석판 전투 조건</summary>${conditions}</details>`:''}`;
}
function netherConditions(report) {
  const controls=report.componentProjection.rows.filter(r=>r.group==='divinity').flatMap(r=>r.conditionControls).filter(c=>c.conditionGroup.startsWith('nether-'));
  return controls.filter((c,i)=>controls.findIndex(o=>o.conditionGroup===c.conditionGroup)===i).map(c=> c.kind==='boolean'
    ? select(c.expression,`nether-condition-${c.key}`,'component-condition',c.value,[{id:0,name:'미충족'},{id:1,name:'충족'}],`data-key="${esc(c.key)}"`)
    : field(c.expression,'component-condition',c.value,`min="0" max="${c.max}" step="1" data-key="${esc(c.key)}"`)).join('');
}
function slotEditor(s) {
  const { type, index } = s.overlay, b = normalizeBuild(s.document.targetBuild);
  if (type === "extensions") {
    const original = s.document.targetBuild;
    const elixirs = nativeElixirOptions(), modules = nativeModuleOptions(), affixes = nativeModuleAffixes();
    return `<div class="native-extension-selection"><section><h3>영약</h3><p>액티브 2·3번 칸</p>${[0, 1].map(i => {
      const id = original.skills?.elixirs?.[i]?.skillId, choice = elixirs.find(o => o.id === id);
      return `<fieldset><legend>영약 ${i + 1}</legend>${select(`영약 ${i + 1}`, `native-elixir-${i}`, "elixir-selection", id, elixirs, `data-slot="${i}"`, true)}${choice ? `<p>${esc(choice.detail)}</p>` : ""}</fieldset>`;
    }).join("")}</section><section><h3>모듈화</h3>${[0, 1, 2, 3, 4].map(i => {
      const config = original.skills?.active?.[i]?.modularization;
      return `<details data-role="native-module-${i}"${config ? " open" : ""}><summary>액티브 ${i + 1} 모듈</summary>${select(`액티브 ${i + 1} 모듈`, `native-module-${i}`, "module-selection", config?.modularizationSkillId, modules, `data-slot="${i}"`, true)}${config ? [0, 1, 2].map(n => `${select(`모듈 ${i + 1} 옵션 ${n + 1}`, `native-module-${i}-${n}`, "module-option", config.moduleOptionIds[n], affixes, `data-slot="${i}" data-key="${n}"`, true)}<p>${esc(affixes.find(a => a.id === config.moduleOptionIds[n])?.detail ?? "")}</p>`).join("") : ""}</details>`;
    }).join("")}</section></div><details class="native-extension-conditions" data-role="native-extension-conditions"><summary>영약·모듈 전투 조건</summary>${extensionControls(s.report, {})}${dpsControls(s.document, s.report, {})}${theaControls(s.document, s.report, {})}</details>`;
  }
  if (type === "hero") {
    return `<label>히어로 검색<input type="search" data-hunter-filter aria-label="히어로 이름·특성 검색"></label><div class="hunter-gallery">${seasonHeroOptions().map(h => {
      const art = getIngameHeroArt(h.id);
      return button(`${art ? `<img src="${esc(art)}" alt="" loading="lazy">` : ""}<span><strong>${esc(h.name)}</strong><small>${esc(h.title)}</small></span>`,
        "pick-hunter", `data-id="${esc(h.id)}" data-hunter-name="${esc(h.name + " " + h.title)}" aria-pressed="${b.hero.branchId === h.id}"`);
    }).join("")}</div><p hidden data-hunter-empty>검색 결과가 없습니다.</p>`;
  }
  if (type === "traits") {
    const id = s.document.targetBuild.hero?.branchId;
    const choices = seasonHeroTraitOptions(id);
    const stages = [1, 45, 60, 75];
    return `${!s.document.targetBuild.ss14Inputs.heroSelection && !(traitSlotCount(id,45)===2 && b.hero?.traitSelections?.length) ? `<p>히어로를 선택하면 SS14 특성으로 편집할 수 있습니다.</p>${select("SS14 히어로", "native-hero", "hero-selection", "", seasonHeroOptions().map(h => ({ id: h.id, name: `${h.name} · ${h.title}` })))}` : (stages.includes(index) ? [index] : stages).map(level => {
      const slot=Math.min(s.overlay.choiceIndex??0,traitSlotCount(id,level)-1), slots=buildTraitSlots(s.document.targetBuild,level), key=slots[slot];
      const options = choices.filter(t => t.level === level);
      const choose = (value, content, className) => button(content, "pick-trait",
        `class="${className}" data-level="${level}" data-choice-index="${slot}" data-value="${esc(value)}" aria-pressed="${(key ?? "") === value}" ${value && slots.some((k,i)=>i!==slot && k===value)?"disabled":""}`);
      return `<fieldset><legend>${level}레벨 특성${traitSlotCount(id,level)>1?` · ${slot+1}번 칸`:""}</legend><div class="trait-deck">${options.map(t => {
        const tiers = t.description.split(/\n(?=레벨 \d+\s*\n)/u);
        const tier = s.report.componentProjection.rows.find(r=>r.control?.recordKey===t.key)?.control.tier;
        const preview = tiers.find(text => tier && text.startsWith(`레벨 ${tier}\n`)) ?? tiers[0];
        return `<article>${choose(t.key, `${traitEmblem(id, t, level)}<strong>${esc(t.name)}</strong><span>${esc(preview)}</span>`, "trait-choice")}
          ${tiers.length > 1 ? `<details><summary>단계별 효과</summary><p>${esc(t.description)}</p></details>` : ""}</article>`;
      }).join("")}</div>
        <div class="trait-clear">${choose("", "미정", "trait-setting")}${canMarkTraitMemoryEmpty(b, level) ? choose(EMPTY_TRAIT_MEMORY, "추억 미장착", "trait-setting") : ""}</div></fieldset>`;
    }).join("")}${componentControls(s.report, {})}`;
  }
  if (type === "memory") {
    const options = seasonMemoryOptions(index), memory = b.hero.memories[index];
    return `${select(options.name, "native-memory", "memory-selection", memory?.baseAttributeId, options.bases, `data-slot="${index}"`)}${memory ? `${field("강화 단계", "memory-enhancement", memory.enhancement, `data-slot="${index}" min="1" max="50" step="1"`)}<details data-role="native-memory-affixes"><summary>고정·랜덤 옵션 선택</summary>${options.affixes.map(o => `<label>${esc(o.name)}<select data-season-edit="memory-affix" data-slot="${index}" data-key="${o.id}"><option value="0">선택 안 함</option><option value="1"${memory.affixRolls?.[o.groupId]?.tierId === o.tierId ? " selected" : ""}>선택</option></select></label>`).join("")}</details>${memoryControls(s.report, {})}` : ""}`;
  }
  if (type === "skills" || type === "gear") {
    const isGear = type === "gear", row = index < 5 ? b.skills.active[index] : b.skills.passive[index - 5];
    const id = isGear ? b.gear.slots[index]?.itemId : row.skillId;
    const component = s.report.components.find(c => c.category === type && c.id === id);
    const entry = component?.calculations?.find(r => (isGear ? r.slotIndex : r.rowIndex) === index);
    const label = isGear ? SEASON_GEAR_SLOT_LABELS[index] : `스킬 칸 ${index + 1}`;
    const c = s.overlay.supportIndex;
    const current = !isGear && Number.isInteger(c) ? row.supports[c]?.supportId : id;
    if (s.picker || !current) return itemPicker(s, type, index, c, current);
    const actions = `<div class="native-slot-actions">${button(isGear ? "장비 교체" : "스킬 교체", "open-picker")}${button("슬롯 비우기", "clear-slot", `data-kind="${isGear ? "gear-selection" : Number.isInteger(c) ? "support-selection" : "skill-selection"}" data-index="${index}" data-support="${Number.isInteger(c) ? c : ""}"`)}</div>`;
    if (!isGear && Number.isInteger(c)) {
      const calculation = s.report.components.filter(component => component.category === "supports")
        .flatMap(component => component.calculations ?? []).find(entry => entry.rowIndex === index && entry.supportIndex === c);
      return `${actions}<fieldset><legend>보조 ${c + 1}</legend>${field(`보조 ${c + 1} 레벨`, "support-level", row.supports[c].level, `data-row="${index}" data-support="${c}" min="1" max="100" step="1"`)}
        ${calculation?.tiers?.length ? `<label>옵션 등급<select data-season-edit="support-tier" data-row="${index}" data-support="${c}">${calculation.tiers.map(t => `<option value="${t.tier}"${t.tier === calculation.tier ? " selected" : ""}>T${t.tier}</option>`).join("")}</select></label>` : ""}
        ${(calculation?.controls ?? []).map((control, n) => field(`보조 옵션 ${n + 1} (${control.min}~${control.max})`, "support-roll", control.value,
          `data-row="${index}" data-support="${c}" data-key="${esc(control.key)}" min="${control.min}" max="${control.max}" step="any"`)).join("")}
        ${(calculation?.conditionControls ?? []).map(control => `${control.sourceText?`<details><summary>조건 원문</summary><p>${esc(control.sourceText)}</p></details>`:''}${field(control.label, "support-condition", control.value,
          `data-row="${index}" data-support="${c}" data-key="${esc(control.key)}" min="${control.min}" max="${control.max}" step="1" ${control.automatic?'disabled':''}`)}`).join("")}</fieldset>`;
    }
    return `${actions}${isGear && index < 2 ? weaponSummary(s.document.targetBuild, index) : ''}
      ${isGear ? entry ? rollControls(component, entry, {}) : "" : id ? `${field("스킬 레벨", "skill-level", row.level, `data-row="${index}" min="1" max="100" step="1"`)}${field("보조 칸 수", "support-count", row.unlockedSupportCount, `data-row="${index}" min="0" max="5" step="1"`)}` : ""}`;
  }
  if (type === "talents") {
    const board = b.talents.boards[index];
    return `${select(`재능 패널 ${index + 1}`, "native-board", "talent-board", board?.treeSlug, seasonTalentBoards(), `data-slot="${index}"`, true)}<div class="native-talent-nodes">${seasonTalentNodes(board?.treeSlug).map(n => `<label><strong>${esc(n.name)}</strong><small>${esc(n.detail)}</small><small>해금 ${n.required}포인트</small><input aria-label="${esc(n.name)} ${n.id} 포인트" type="number" min="0" max="${n.max}" step="1" data-season-edit="talent-node" data-slot="${index}" data-key="${n.id}" value="${n.core ? Number(board?.coreTalentIds?.includes(n.id)) : board?.nodePoints?.[n.id] ?? 0}" /></label>`).join("")}</div>`;
  }
  if (type === "pact") {
    const spirit = b.pact.slots[index]?.spirit, options = seasonSpiritOptions(), selected = options.find(o => o.id === spirit?.spiritId);
    return `${select(`정령 ${index + 1}`, "native-spirit", "spirit-selection", spirit?.spiritId, options, `data-slot="${index}"`, true)}${selected ? `${select("정령 레벨", "native-spirit-level", "spirit-level", spirit.level, selected.levels.map(n => ({ id: n, name: `${n}레벨` })), `data-slot="${index}"`)}<p>${esc(selected.korean.parsed.levelAffixes.find(r => r.level === spirit.level)?.affixes.join("\n"))}</p>${selected.korean.parsed.rings.map(r => `<p>${esc(r.name)} · ${esc(r.effect)}</p>${select(`${r.name} 운명`, `native-destiny-${index}-${r.slotId}`, 'destiny-selection', b.pact.slots[index].rings?.[r.slotId]?.installedDestiny?.destinyId, seasonDestinyOptions(r.slotId), `data-slot="${index}" data-key="${r.slotId}"`, true)}`).join("")}` : ""}`;
  }
  return "";
}
function localLogPanel(s) {
  if (!RUNTIME_POLICY.allowGameLogs) return `<p>${esc(LOCAL_LOG_ONLY_MESSAGE)}</p>`;
  const local = s.logImport;
  return `<p>게임 로그는 이 브라우저에서만 읽습니다. 파일과 원문을 저장하거나 전송하지 않습니다.</p>
    <label>게임 로그 선택<input id="native-log-file" type="file" accept=".log,.txt,text/plain" /></label>
    ${local?.loading ? '<p role="status">로그인 기록을 읽고 있습니다.</p>' : ""}
    ${local?.preview ? `<label>로그인 기록<select data-log-field="record">${local.records.map((r, i) => `<option value="${i}"${i === local.index ? " selected" : ""}>${i + 1}번째 기록 · ${r.character?.Level ?? "미확인"}레벨 · 장비 ${r.gear.length} / 스킬 ${r.skills.length} / 석판 ${r.slates.length}</option>`).join("")}</select></label>
      <label>가져올 시점<select data-log-field="moment"><option value="latest"${local.moment !== "login" ? " selected" : ""}>마지막 변경까지</option><option value="login"${local.moment === "login" ? " selected" : ""}>로그인 시점</option></select></label>
      <p role="status">선택: 장비 ${local.preview.rows.filter(r => r.category === "gear" && r.selected && !r.blocked).length}/${local.preview.rows.filter(r => r.category === "gear").length} · 스킬/보조 ${local.preview.rows.filter(r => r.category !== "gear" && r.selected && !r.blocked).length}/${local.preview.rows.filter(r => r.category !== "gear").length}. 제외한 항목은 현재 빌드의 구성을 유지합니다.</p>
      <details class="native-option-source" open data-role="log-import-scope"><summary>반영 범위 확인</summary>${local.preview.warnings.map(w => `<p>${esc(w)}</p>`).join("")}</details>
      ${local.preview.changeCount ? `<details class="native-log-history" data-role="log-change-history" open><summary>로그인 이후 변경 ${local.preview.changeCount}건</summary><ol>${local.preview.changes.map(c => `<li>${esc(c.action === "Reset" ? ({ "-1": "장비", "-6": "스킬", "-4": "신격" })[c.page] : effectSourceLabel(c.page === -1 ? `gear.slots.${({1:2,2:0,3:1,4:3,5:4,6:7,7:8,8:6,9:5,10:9})[c.index]}` : "", c.page === -6 ? "skills" : "divinity"))} · ${c.page === -6 && c.action !== "Reset" ? `슬롯 ${c.index} · ` : ""}${({Add:"장착", Update:"변경", Delete:"해제", Reset:"목록 초기화"})[c.action]}${c.status === "superseded" ? " · 교체 전 아이템" : ""}<small>기록 ${c.sourceLine}행</small></li>`).join("")}</ol>${local.preview.changeCount > 200 ? "<p>최근 200건을 표시합니다. 슬롯에는 모든 변경을 반영했습니다.</p>" : ""}</details>` : ""}
      <div class="native-log-preview">${local.preview.rows.map((row, i) => `<article class="native-log-row">
        <label><input type="checkbox" data-log-field="selected" data-log-row="${i}"${row.selected ? " checked" : ""}${row.blocked ? " disabled" : ""} />${esc(row.label)} 반영</label>
        ${row.removed ? "<strong>슬롯 비우기</strong>" : `<label>SS14 항목<select data-log-field="item" data-log-row="${i}"${row.blocked ? " disabled" : ""}><option value="">일치 항목 미확인 · 직접 선택</option>${row.options.map(o => `<option value="${esc(o.id)}"${row.itemId === o.id ? " selected" : ""}>${esc(o.name)}</option>`).join("")}</select></label>`}
        ${row.category !== "gear" && !row.removed ? `<label>기록된 레벨<input type="number" min="1" max="100" step="1" data-log-field="level" data-log-row="${i}" value="${esc(row.level)}"${row.blocked ? " disabled" : ""} /></label>` : ""}
        <small>${esc(row.note)}</small>${logGearPreview(row)}</article>`).join("") || "가져올 장비·스킬 슬롯이 없습니다."}</div>
      ${logSlatePreview(local.preview.slates)}
      ${button("선택한 항목을 새 사본에 반영", "apply-local-log", local.preview.rows.some(r => r.selected && !r.blocked) || local.preview.slates?.selected && !local.preview.slates.blocked ? "" : "disabled")}` : ""}`;
}
function logSlatePreview(slates) {
  if (!slates) return "";
  return `<section data-role="log-slate-preview"><label><input type="checkbox" data-log-field="slates"${slates.selected ? " checked" : ""}${slates.blocked ? " disabled" : ""} />석판 옵션·전체 배치 반영</label>
    <p>${slates.empty ? "기록된 빈 보드로 사본의 석판을 모두 해제합니다." : `석판 ${slates.rows.length}개 · ${slates.board.cells.length}칸`}</p>
    <div class="native-divinity-board" role="img" aria-label="로그 석판 배치 미리보기">${Array.from({ length: 36 }, (_, i) => {
      const n = slates.rows.findIndex(row => row.cells.some(c => c.x === i % 6 && c.y === Math.floor(i / 6)));
      return `<span class="${n >= 0 ? "is-filled" : ""}" title="${esc(n >= 0 ? slates.rows[n].name : "빈 칸")}">${n >= 0 ? n + 1 : ""}</span>`;
    }).join("")}</div>
    ${slates.rows.map((row, i) => `<details open><summary>${i + 1}. ${esc(row.name)} · ${row.cells.map(c => `(${c.x + 1}, ${c.y + 1})`).join(" ")}</summary>${row.options.map(o => `<p>${esc(o.detail)}</p>`).join("")}</details>`).join("")}
    ${slates.reasons.map(r => `<p role="status">${esc(r)}</p>`).join("")}</section>`;
}
function logGearPreview(row) {
  const options = previewLogGearOptions(row);
  if (!options) return "";
  return `<details class="native-option-source" data-role="log-gear-options" open><summary>장비 옵션 수치 · ${options.status === "mapped" ? "SS14 연결 완료" : "확인 필요"}</summary>
    ${options.logOptions.map(o => `<p>${esc(o.detail)}${o.reason ? ` · ${esc(o.reason)}` : ""}</p>`).join("")}
    ${options.reasons.map(r => `<p role="status">${esc(r)}</p>`).join("")}</details>`;
}
export function renderEditHistory(s) {
  return `<div class="native-edit-history" data-role="edit-history" aria-label="편집 기록">${button("↶ 되돌리기", "undo", `title="되돌리기 (Ctrl+Z)"${s.history?.canUndo || s.pending.size ? "" : " disabled"}`)}${button("↷ 다시 실행", "redo", `title="다시 실행 (Ctrl+Shift+Z)"${s.history?.canRedo ? "" : " disabled"}`)}</div>`;
}
function overlay(s) {
  if (!s.overlay) return "";
  const type = s.overlay.type;
  let content;
  if (type === "saves") content = s.documents.map(d => `<article class="native-save-row"><span>${esc(d.targetBuild.name)}</span>${button("열기", "open", `data-id="${esc(d.id)}" aria-label="${esc(d.targetBuild.name)} 열기"`)}</article>`).join("") || "저장된 SS14 빌드가 없습니다.";
  else if (type === "files") content = `${button("사본 저장", "copy")}${RUNTIME_POLICY.allowGameLogs ? button("게임 로그 가져오기", "local-log") : `<p>${esc(LOCAL_LOG_ONLY_MESSAGE)}</p><p>빌드는 이 브라우저에 저장됩니다. 다른 기기로 옮기거나 작업을 종료하기 전 빌드 JSON을 보관하세요.</p>`}<label>TOB SS14 빌드 내보내기<textarea readonly aria-label="TOB SS14 빌드 내보내기">${esc(exportSeasonWorkspace(s.document))}</textarea></label><label>TOB SS14 빌드 가져오기<textarea id="native-import" aria-label="TOB SS14 빌드 가져오기"></textarea></label>${button("가져오기", "import")}<details><summary>이전 시즌 보관함</summary><button type="button" data-action="open-preserved-build">이전 시즌 빌드 열기</button></details>`;
  else if (type === "share") content = `<div class="build-share-panel"><label>공유 링크<input type="text" id="share-link" aria-label="공유 링크" readonly value="${esc(s.overlay.link)}" /></label>${button("공유 링크 복사","copy-link",s.overlay.link?"":"disabled")}<p>받은 사람이 링크를 열면 이 빌드의 사본이 열립니다.</p><p id="share-status" role="status">${esc(s.overlay.message)}</p></div>
    <details data-role="share-code-tools"><summary>빌드 코드로 공유하거나 가져오기</summary><label>내 빌드 코드<textarea id="share-code" readonly spellcheck="false" aria-label="내 빌드 코드">${esc(s.overlay.code)}</textarea></label>${button("코드 복사","copy-code",s.overlay.code?"":"disabled")}<label>받은 빌드 코드<textarea id="share-paste" spellcheck="false" placeholder="TOB14-1.…" aria-label="받은 빌드 코드">${esc(s.overlay.paste)}</textarea></label>${button("새 사본으로 열기","import-code")}</details>`;
  else if (type === "local-log") content = localLogPanel(s);
  else if (type === "effects") content = renderEffectSources(s);
  else content = slotEditor(s);
  const titles = { share: "빌드 공유", saves: "저장 빌드", files: "빌드 파일", "local-log": "게임 로그 가져오기", effects: "효과별 출처", hero: "히어로 선택", traits: "히어로 특성", memory: "히어로 추억", talents: "재능 편집", pact: "정령 편집", extensions: "영약·모듈화" };
  const heading = titles[type] ?? "빌드 편집";
  return `<div class="season-native-backdrop"><section role="dialog" aria-modal="true" aria-label="SS14 ${heading}" class="season-native-modal"><header><h2>${heading}</h2>${button("닫기", "close", 'aria-label="편집 닫기"')}</header>${s.error ? `<p role="alert">${esc(s.error)}</p>` : ""}<div class="season-native-modal-body">${content}</div><footer>${!["share","local-log", "files", "saves", "effects", "hero"].includes(type) ? button("적용", "apply") : ""}${button("닫기", "close")}</footer></section></div>`;
}
export function renderNativeDps(s) {
  const dps = s.report.fullDps;
  const requirements = seasonInputRequirements(s.report);
  const tie = s.report.theaAverage?.projectileTie;
  const active = s.resultTab ?? 'stats';
  const panels = {
    stats: () => `<div data-role="native-numeric-result"${s.pending.size ? ' hidden' : ''}>${renderSeasonNumericStats(s.report)}</div>`,
    calculation: () => `<div data-role="native-calculation-detail"${s.pending.size ? ' hidden' : ''}>${dpsResults(s.report)}<details data-role="native-defense-detail"><summary>자원·방어</summary>${characterResults(s.report)}</details><details data-role="native-effect-detail"><summary>효과별 근거</summary>${componentResults(s.report)}</details></div>`,
    conditions: () => renderResultConditions(s),
    analysis: () => renderResultAnalysis(s),
  };
  return `<aside class="native-dps-dock" id="native-dps-summary" tabindex="-1" aria-label="SS14 계산 결과">
    <div class="native-result-summary"><small>SS14 전체 DPS</small><strong data-role="native-dps">${s.pending.size ? '입력 적용 대기' : dps.supported ? dps.dps.toLocaleString('ko-KR', { maximumFractionDigits:2 }) : seasonDpsStatusLabel(s.report)}</strong>
    <p>${s.pending.size ? '변경한 입력을 확인하세요.' : tie ? `기존 투사체 우선 추정 · 새 시전 우선 ${tie.newCastFirstDps === null ? '계산 불가' : tie.newCastFirstDps.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) + ' DPS'}` : dps.supported ? '현재 빌드·전투 조건 기준' : '수치 탭에서 계산 가능한 항목을 확인하세요.'}</p>
    ${dps.burstRecovery?`<p>크리에이티브 대폭발 · ${dps.burstRecovery.total!==null?`기발 회복 ${dps.burstRecovery.total} (상한 적용 전)`:dps.burstRecovery.rows.length?'회복 미확정 · 전투 조건에서 발동별 결과 확인':'전투 조건에서 매직 버스트 발동 기록 입력'}</p>`:''}
    ${renderEditDpsComparison(s, true)}
    ${requirements.length ? `<details data-role="numeric-dps-requirements"><summary>전체 DPS 확인 항목</summary><div class="native-requirements" aria-label="계산에 필요한 입력">${requirements.map(r => button(esc(r.label), 'requirement', `data-type="${r.type ?? ''}" data-section="${r.section ?? 'hero'}" data-focus-role="${r.role ?? ''}"`)).join('')}</div></details>` : ''}
    <div class="native-result-actions">${button('다시 계산', 'apply')}${button('효과별 출처', 'effect-sources')}</div></div>
    <nav class="native-result-tabs" aria-label="계산 결과 보기">${RESULT_TABS.map(([key,label]) => button(label, 'result-tab', `data-tab="${key}" aria-pressed="${active === key}" aria-controls="native-result-panel"`)).join('')}</nav>
    <section id="native-result-panel" class="native-result-panel" aria-label="${RESULT_TABS.find(([key]) => key === active)?.[1] ?? '수치'}">${(panels[active] ?? panels.stats)()}</section></aside>`;
}
export function renderSeasonPlanner(s) {
  if (!s.document) return `<main class="season-native"><h1>TOB · SS14</h1><p role="alert">${esc(s.error)}</p><button data-action="open-preserved-build">이전 시즌 빌드 열기</button></main>`;
  const report = s.report, dps = report.fullDps;
  const body = s.section === "hero" ? heroPanel(s) : ["skills", "gear"].includes(s.section) ? equipmentPanel(s, s.section)
    : s.section === "talents" ? talentPanel(s) : s.section === "pact" ? pactPanel(s)
      : s.section === "divinity" ? divinityPanel(s) : combatPanel(s);
  return `<div class="season-native" data-role="ss14-main-editor"><header class="planner-header"><strong class="native-brand">TOB <small>SS14</small></strong><label class="build-chip"><input id="ss14BuildName" aria-label="빌드 이름" data-season-edit="name" value="${esc(s.document.targetBuild.name)}" maxlength="160" /></label>${renderEditHistory(s)}<div class="header-primary-actions">${button("저장", "save")}${button("불러오기", "saves")}${button("공유", "share")}${button("빌드 파일", "files")}</div><span role="status" data-role="native-save-status">${esc(s.notice || (s.dirty ? "저장하지 않은 변경" : s.document.revision ? "저장됨" : "새 SS14 사본"))}</span></header>
    <nav class="quick-category-menu" aria-label="빌드 편집 메뉴">${tabs.map(([id, label]) => button(label, "section", `data-section="${id}" aria-pressed="${s.section === id}"`)).join("")}</nav>
    <div class="native-content"><main class="season-native-scroll"><section class="planner-section ${s.section === "hero" ? "hero-section" : ""}"><a class="scene-dps-jump" href="#native-dps-summary">전체 DPS ↓</a><h1>${esc(tabs.find(([id]) => id === s.section)?.[1])}</h1>${s.error ? `<p role="alert">${esc(s.error)}</p>` : ""}${body}</section></main>
    ${renderNativeDps(s)}</div>
    ${overlay(s)}</div>`;
}
