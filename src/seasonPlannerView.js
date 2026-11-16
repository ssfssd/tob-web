import { normalizeBuild } from "./engine.js";
import { findItemById } from "./catalog.js";
import { getIngameHeroArt } from "./ingameHeroArt.js";
import { renderTalentScene, renderPactScene } from "./seasonBoardScenes.js";
import { spriteKeys, columns, rows as spriteRows } from "./data/heroTraitArtwork.generated.js";
import { SS14_CARDS } from "./data/ss14Cards.generated.js";
import { SS14_SUPPORTS } from "./data/ss14Supports.generated.js";
import { seasonHeroOptions, seasonHeroTraitOptions, EMPTY_TRAIT_MEMORY, canMarkTraitMemoryEmpty, traitSlotCount, buildTraitSlots } from "./seasonHeroSelection.js";
import { seasonMemoryOptions, seasonTalentBoards, seasonTalentNodes, seasonSpiritOptions } from "./seasonNativeSelections.js";
import { memoryQualities, memoryQuality, enhancedMemoryBase } from './seasonMemoryQuality.js';
import { memoryTraitTier } from './seasonMemories.js';
import { finishedWorkshopItem } from './seasonItemWorkshop.js';
import { getSeasonSelectionOptions, SEASON_GEAR_SLOT_LABELS, isTwoHandedWeapon } from "./seasonSelections.js";
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { getSkillEnergyUsage } from "./skillRuntimeModel.js";
import { formatAppDateTime } from "./dateTimePresentation.js";
import { seasonSupportOptions, supportFitsSocket } from "./seasonSupport.js";
import { seasonDestinyOptions } from './seasonDestiny.js';
import { nativeElixirOptions, nativeModuleOptions, nativeModuleAffixes } from "./seasonNativeExtensions.js";
import { seasonInputRequirements } from "./seasonInputRequirements.js";
import { seasonDpsStatusLabel } from './seasonCalculationIssues.js';
import { seasonEffectSources, effectSourceLabel } from "./seasonEffectSources.js";
import { exportSeasonWorkspace } from "./seasonWorkspace.js";
import { previewLogGearOptions } from "./localGameLogImport.js";
import { renderSeasonNumericStats } from "./seasonNumericStatsView.js";
import { gearFilters, previewSlotEdit } from './seasonGearPicker.js';
import { craftOptions, itemGearKind } from './seasonItemCraft.js';
import { calculateSeasonBuild } from './seasonBuild.js';
import { renderReasons } from './seasonResultPanels.js';
import { renderSlotPreview, shelfTools, mobileDpsBar } from './seasonEditorTools.js';
import { renderSlateEditor,slateEditorBoard } from './seasonSlateEditor.js';
import { regularSlateFamilies } from './seasonDivinity.js';
import { nativeSlateOptions } from './seasonNativeDivinity.js';
import { compareSeasonDpsSnapshots } from './seasonAdvisor.js';
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
  const portraits = art ? `<img class="hunter-portrait" src="${esc(art)}" alt="">` : "";
  return `<div class="hunter-scene"><div class="hunter-showcase">${portraits}<div class="hunter-caption"><h2>${esc(hero?.name ?? "히어로 선택")}</h2>${hero ? `<p>${esc(hero.title)}</p>` : ""}
    <div class="hunter-controls">${field("레벨", "hero-level", b.heroLevel ?? 90, 'min="1" max="100" step="1" aria-label="히어로 레벨"')}${button(hero ? "히어로 변경" : "히어로 선택", "edit-slot", 'data-type="hero"')}</div></div></div>
    <section class="memory-loadout"><h2>장착한 추억</h2><div class="memory-slots">${[45,60,75].map((level,i)=>{
      const options=seasonMemoryOptions(i), memory=b.hero?.memories?.[i];
      const base=options.bases.find(option=>option.id===memory?.baseAttributeId);
      const native=memory?.ss14BaseModel===1&&enhancedMemoryBase(options.baseGroups.find(g=>g.id===memory.baseAttributeId),memory.ss14Quality,memory.enhancement);
      const detail=memory?[native?.ko||base?.name, memoryQuality(memory.ss14Quality)?.name, `강화 +${memory.enhancement}`].filter(Boolean).join(" · "):"미장착";
      return button(`<small>${level}레벨 특성</small><strong>${esc(options.name)}</strong><span>${esc(detail)}</span>`,"edit-slot",`data-type="memory" data-role="memory-slot-${i}" data-index="${i}" aria-haspopup="dialog" class="memory-slot"`);
    }).join("")}</div></section>
    <div class="hunter-path"><h2>히어로 특성</h2>${[1, 45, 60, 75].map(level => {
      const slots=buildTraitSlots(b,level), count=traitSlotCount(id,level);
      const buttons=Array.from({length:count},(_,slot)=>{
      const key=slots[slot],trait=choices.find(t=>t.key===key);
      const tier = key && s.report.componentProjection.rows.find(r=>r.control?.recordKey===key)?.control.tier;
      const label = key === EMPTY_TRAIT_MEMORY ? "추억 미장착" : trait?.name ?? "특성 선택";
      const caption=`${level}레벨${count>1?` · 특성 ${slot+1}`:""}`;
      return button(`${traitEmblem(id,trait,level)}<span><small>${caption}</small><strong>${esc(label)}</strong></span>${tier?`<small>${tier}단계</small>`:""}`,"edit-slot",`data-type="traits" data-index="${level}" data-choice-index="${slot}" class="hunter-trait" aria-label="${caption} 특성 편집"`);
      }).join("");
      return `<div class="hunter-stage"><div class="hunter-stage-choices">${buttons}</div></div>`;
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
function drawerDps(s, comparison, action, status='') {
  const format=n=>Number.isFinite(n)?n.toLocaleString('ko-KR',{maximumFractionDigits:2}):'미확정';
  const current=s.report.fullDps.supported?s.report.fullDps.dps:null;
  const values=comparison?format(comparison.baseValue)+' → '+format(comparison.value):format(current);
  const delta=comparison?.supported?(comparison.delta>0?'+':'')+format(comparison.delta):comparison?'비교 보류':'';
  return `<div class="drawer-dps" aria-label="전체 DPS와 적용"><div aria-live="polite"><small>전체 DPS ${delta?'<b>'+delta+'</b>':''}</small><strong>${status||values}</strong></div>${action}</div>`;
}
function itemPicker(s, category, index, supportIndex, current) {
  if (category==='gear' && index===1 && isTwoHandedWeapon(normalizeBuild(s.document.targetBuild).gear.slots[0]?.itemId))
    return '<p>양손 무기를 먼저 교체하거나 해제하세요.</p>'+ (current ? button('서브 무기 해제','clear-slot','data-kind="gear-selection" data-index="1"') : '');
  const support = Number.isInteger(supportIndex), kind = support ? "support-selection" : category === "gear" ? "gear-selection" : "skill-selection";
  const host = support ? [...s.document.targetBuild.skills.active, ...s.document.targetBuild.skills.passive][index] : null;
  const all = support ? seasonSupportOptions().filter(o => supportFitsSocket(o.id, SS14_CARDS_EN.records[host?.skillId], index, supportIndex)) : getSeasonSelectionOptions(category, index);
  const family=s.picker?.gearKind??'';
  const pool=category==='gear'&&family?all.filter(o=>itemGearKind(o.id)===family):all;
  const labelsFor = category === 'gear' ? gearFilters : id => {
    const card=(support ? SS14_SUPPORTS : SS14_CARDS).records[id];
    return (card?.tags ?? []).filter(tag=>/[가-힣]/u.test(tag) && !/\p{Script=Han}/u.test(tag));
  };
  const filters=[...new Set(pool.flatMap(o=>labelsFor(o.id)))].filter(f=>!['제작','레전드'].includes(f)).sort((a,b)=>a.localeCompare(b,'ko'));
  const filterLabel=category==='gear'?'장비 분류':'스킬 태그';
  const options=s.picker?.filter?pool.filter(o=>labelsFor(o.id).includes(s.picker.filter)):pool;
  const selected = s.picker?.candidate ?? current ?? "";
  const query = s.picker?.query ?? "";
  const key = value => String(value).normalize("NFKC").toLocaleLowerCase("ko").replace(/\s/gu, "");
  const match = option => key(`${option.name} ${(SS14_CARDS.records[option.id] ?? SS14_SUPPORTS.records[option.id])?.detail ?? ""}`).includes(key(query));
  const card = SS14_CARDS.records[selected] ?? SS14_SUPPORTS.records[selected];
  const equip = button("이 슬롯에 장착", "equip-item", `data-kind="${kind}" data-index="${index}" data-support="${support ? supportIndex : ""}" data-id="${esc(selected)}"`);
  if(s.drawer) s.drawer.bar=drawerDps(s,s.picker?.preview?.comparison,card?equip:button('후보 선택','equip-item','disabled'));
  const detail = card && `<p>${card.koreanTextVerified ? esc(card.detail) : "한국어 원문 미제공"}</p>`;
  const preview = s.picker?.preview ? renderSlotPreview(s.picker.preview,sourceStats,esc) : "";
  const oldOptions = category==="gear" && current && selected!==current ? `<details><summary>현재 장비 옵션 · ${esc(title(current))}</summary><p>${SS14_CARDS.records[current]?.koreanTextVerified?esc(SS14_CARDS.records[current].detail):'한국어 원문 미제공'}</p></details>` : "";
  return `<div class="native-item-picker" aria-label="슬롯 아이템 선택">
    ${category==='gear'?`<nav class="native-slot-actions" aria-label="장비 종류">${[['','전체'],['base','제작 장비'],['legendary','레전드 장비']].map(([id,label])=>button(label,'picker-gear-kind',`data-category="${id}" aria-pressed="${family===id}"`)).join('')}</nav>`:''}
    <header>${filters.length?`<label>${filterLabel}<select data-gear-filter aria-label="${filterLabel}"><option value="">전체</option>${filters.map(f=>`<option${f===s.picker?.filter?' selected':''}>${esc(f)}</option>`).join('')}</select></label>`:''}<label>이름·효과 검색<input type="search" data-picker-filter value="${esc(query)}" aria-label="이름·효과 검색" /></label>${current ? button(category==='gear'?'장착 옵션 편집':'고른 아이템 보기', "cancel-picker") : ""}<small data-picker-count>${options.filter(match).length}개</small></header><p data-picker-empty${options.some(match) ? " hidden" : ""}>선택할 후보가 없습니다. 검색어나 슬롯을 확인하세요.</p>
    <div class="native-picker-columns"><div class="native-picker-list" aria-label="아이템 후보">${options.map(o => button(`${icon(o.id)}<span>${esc(o.name)}</span>`, "preview-item",
      `data-id="${esc(o.id)}" data-picker-option data-search="${esc(`${o.name} ${(SS14_CARDS.records[o.id] ?? SS14_SUPPORTS.records[o.id])?.detail ?? ""}`)}" aria-pressed="${selected === o.id}"${match(o) ? "" : " hidden"}`)).join("")}</div>
    <article class="native-picker-card" aria-label="아이템 미리보기" data-role="candidate-detail" tabindex="-1">${card ? category==="gear"
      ? `<h3>${esc(title(selected))}</h3><div class="gear-comparison-body" tabindex="0" aria-label="옵션 및 수치 비교">${detail}${preview}${oldOptions}</div>${equip}`
      : `${icon(selected)}<h3>${esc(title(selected))}</h3>${preview}${equip}${detail}`
      : "<p>후보를 선택하면 효과와 설명을 확인할 수 있습니다.</p>"}</article></div></div>`;
}
function skillEnergy(skills) {
  const energy = getSkillEnergyUsage(skills);
  return `<p data-role="skill-energy">스킬 에너지 <strong>${energy.used} / ${energy.maximum}</strong> · ${energy.over ? '초과 ' + energy.over : '남은 ' + energy.remaining}</p>`;
}
function equipmentPanel(s, category) {
  const b = normalizeBuild(s.document.targetBuild), gear = category === "gear";
  const rows = [...b.skills.active, ...b.skills.passive];
  const selected = gear ? s.gearIndex ?? 0 : s.skillIndex ?? 0;
  const id = gear ? b.gear.slots[selected]?.itemId : rows[selected]?.skillId;
  const label = i => gear ? SEASON_GEAR_SLOT_LABELS[i] : `${i < 5 ? i === 0 ? "주력" : "액티브" : "패시브"} ${i < 5 ? i + 1 : i - 4}`;
  const positions = gear ? [0,1,2,3,4,5,6,9,7,8] : rows.map((_, i) => i);
  if (!gear) return `<div class="skill-overview" data-role="slot-workspace"><nav class="equipped-list" aria-label="스킬 슬롯"><h2>스킬 슬롯</h2>${skillEnergy(b.skills)}${rows.map((r,i)=>`<section class="skill-chain">
    ${button(`${icon(r.skillId)}<span><small>${label(i)}</small><strong>${r.skillId?esc(title(r.skillId)):'미장착'}</strong></span>`,'inspect-skill',`data-index="${i}" data-role="skill-slot-${i}" aria-haspopup="dialog"`)}
    <div class="chain-supports">${Array.from({length:r.unlockedSupportCount},(_,n)=>button(`${icon(r.supports[n]?.supportId)}<span><small>보조 ${n+1}</small><strong>${r.supports[n]?.supportId?esc(title(r.supports[n].supportId)):'미장착'}</strong></span>`,'inspect-socket',`data-row="${i}" data-index="${n}" aria-haspopup="dialog"${r.skillId ? "" : ' disabled title="먼저 이 칸에 스킬을 장착하세요"'}`)).join('')}</div></section>`).join('')}</nav>${button("영약·모듈화 편집", "edit-slot", 'data-type="extensions"')}</div>`;
  const slots = `<nav class="equipped-list" aria-label="${gear ? "장비" : "스킬"} 슬롯"><h2>${gear ? "장비 슬롯" : "스킬 슬롯"}</h2><div>${positions.map(i => {
      const current = gear ? b.gear.slots[i]?.itemId : rows[i]?.skillId;
      return button(`${icon(current)}<span><small>${esc(label(i))}</small><strong>${current ? esc(title(current)) : "미장착"}</strong></span>`,
        gear ? "inspect-gear" : "inspect-skill", `data-index="${i}" ${gear?`data-role="gear-slot-${i}" aria-haspopup="dialog" aria-expanded="${s.overlay?.type==='gear'&&selected===i}"`:`aria-pressed="${selected===i}"`}`);
    }).join("")}</div></nav>`;
  return `<div class="gear-slot-overview" data-role="slot-workspace">${slots}${selected<2&&id?weaponSummary(s.document.targetBuild,selected):''}</div>`;
}
function skillSockets(row, id, selectedSupport) {
  if (!id && !row.unlockedSupportCount) return "";
  const socket=(label,item,index)=>button(`<small>${label}</small><strong>${item?esc(title(item)):"미장착"}</strong>`,"inspect-socket",
    `data-index="${index}" aria-pressed="${(selectedSupport??-1)===index}"${index >= 0 && !id ? ' disabled title="먼저 이 칸에 스킬을 장착하세요"' : ""}`);
  return `<nav class="linked-skills" aria-label="선택 스킬 소켓">${socket("메인 스킬",id,-1)}${Array.from({length:row.unlockedSupportCount},(_,i)=>socket("보조 "+(i+1),row.supports[i]?.supportId,i)).join("")}</nav>`;
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
  return `${editor}${dpsControls(s.document, s.report, {}, true)}<details data-role="native-critical-input"><summary>스킬 기본 크리티컬</summary>${offenseControls(s.document, s.report, {})}</details><details data-role="season-character-input"><summary>캐릭터 기본 수치·효과 조건</summary>${characterControls(s.document, s.report, {})}</details><details data-role="native-blessing-input"><summary>축복 중첩</summary>${blessingControls(s.document, s.report, {})}</details>${theaControls(s.document, s.report, {})}<details data-role="native-extension-input"><summary>영약·특수 효과 조건</summary>${extensionControls(s.report, {})}</details>`;
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
    }).join("")}</section></div><details class="native-extension-conditions" data-role="native-extension-conditions"><summary>영약·모듈 전투 조건</summary>${extensionControls(s.report, {})}${dpsControls(s.document, s.report, {}, true)}${theaControls(s.document, s.report, {})}</details>`;
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
    const seen=new Set();
    const bases=options.baseGroups.map(group=>({id:group.id,name:enhancedMemoryBase(group,1,1)?.label})).filter(o=>{
      if(seen.has(o.name)&&o.id!==memory?.baseAttributeId)return false;
      seen.add(o.name);return true;
    });
    const base = select("기본 속성", "native-memory", "memory-selection", memory?.baseAttributeId, bases, `data-slot="${index}"`);
    if (!memory) return base;
    const quality = memoryQuality(memory.ss14Quality);
    const tiers = ['fixed','random'].map(kind=>{
      const ids=memory[kind+'AffixIds']??[], count=kind==='fixed'?2:quality?.randomLimit??2;
      return Array.from({length:Math.min(count,ids.length+1)},(_,n)=>{
        const id=ids[n],previous=id?id+'|'+memory.affixRolls?.[id]?.tierId:'';
        const choices=options.affixes.filter(o=>o.kind===kind&&(o.groupId===id||!ids.includes(o.groupId)));
        const label=(kind==='fixed'?'고유':'랜덤')+' 옵션 '+(n+1);
        const families=new Map();
        for(const o of choices)if(!families.has(o.groupId)||o.id===previous)families.set(o.groupId,o);
        const levels=choices.filter(o=>o.groupId===id);
        return `<div class="memory-affix-line"><label>${label}<select data-memory-option data-previous="${esc(previous)}" aria-label="${label}"><option value="">미장착</option>${[...families.values()].map(o=>`<option value="${esc(o.id)}"${o.id===previous?' selected':''}>${esc(o.name)}</option>`).join('')}</select></label>${levels.length>1?select(label+' 등급','memory-tier-'+kind+n,'memory-tier',memory.affixRolls[id].tierId,levels.map(o=>({id:o.tierId,name:'T'+o.tier+' · '+o.name})),`data-slot="${index}" data-key="${esc(id)}"`):''}</div>`;
      }).join('');
    }).join('');
    const baseRow=s.report.componentProjection.rows.find(r=>r.path==='hero.memories.'+index+'.base');
    return base + select('추억 희귀도','native-memory-quality','memory-quality',memory.ss14Quality,
      memoryQualities.map(q=>({id:q.id,name:q.name+' · 최대 강화 '+q.maxLevel})), `data-slot="${index}"`)
      + `<label>강화 단계<select aria-label="강화 단계" data-season-edit="memory-enhancement" data-slot="${index}">${Array.from({length:quality?.maxLevel??50},(_,i)=>`<option value="${i+1}"${i+1===memory.enhancement?' selected':''}>+${i+1}</option>`).join('')}</select></label>`
      + `<p class="memory-base-result">기본 속성 · <strong>${esc(baseRow?.detail??'희귀도 선택 필요')}</strong></p><fieldset data-role="native-memory-affixes"><legend>추억 옵션</legend>${tiers}</fieldset>`
      + memoryControls(s.report, {}, index,true);
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
    const itemType = isGear ? "장비" : Number.isInteger(c) ? "보조 스킬" : "스킬";
    const actions = `<div class="native-slot-actions">${button(itemType+" 교체", "open-picker")}${button(itemType+" 해제", "clear-slot", `data-kind="${isGear ? "gear-selection" : Number.isInteger(c) ? "support-selection" : "skill-selection"}" data-index="${index}" data-support="${Number.isInteger(c) ? c : ""}"`)}</div>`;
    if (!isGear && Number.isInteger(c)) {
      const calculation = s.report.components.filter(component => component.category === "supports")
        .flatMap(component => component.calculations ?? []).find(entry => entry.rowIndex === index && entry.supportIndex === c);
      return `${actions}<fieldset><legend>보조 ${c + 1}</legend>${field(`보조 ${c + 1} 레벨`, "support-level", row.supports[c].level, `data-row="${index}" data-support="${c}" min="1" max="100" step="1"`)}
        ${calculation?.tiers?.length ? `<label>옵션 등급<select data-season-edit="support-tier" data-row="${index}" data-support="${c}">${calculation.tier == null ? '<option value="" selected disabled>등급 선택</option>' : ""}${calculation.tiers.map(t => `<option value="${t.tier}"${t.tier === calculation.tier ? " selected" : ""}>T${t.tier}</option>`).join("")}</select></label>` : ""}
        ${(calculation?.controls ?? []).map((control, n) => field(`보조 옵션 ${n + 1} (${control.min}~${control.max})`, "support-roll", control.value,
          `data-row="${index}" data-support="${c}" data-key="${esc(control.key)}" min="${control.min}" max="${control.max}" step="any"`)).join("")}
        ${(calculation?.conditionControls ?? []).map(control => `${control.sourceText?`<details><summary>조건 원문</summary><p>${esc(control.sourceText)}</p></details>`:''}${field(control.label, "support-condition", control.value,
          `data-row="${index}" data-support="${c}" data-key="${esc(control.key)}" min="${control.min}" max="${control.max}" step="1" ${control.automatic?'disabled':''}`)}`).join("")}</fieldset>`;
    }
    return `${actions}${isGear && index < 2 ? weaponSummary(s.document.targetBuild, index) : ''}
      ${isGear ? (entry ? rollControls(component, entry, {}) : "") + craftFields(s.report,index) : id ? `${field("스킬 레벨", "skill-level", row.level, `data-row="${index}" min="1" max="100" step="1"`)}${field("보조 칸 수", "support-count", row.unlockedSupportCount, `data-row="${index}" min="0" max="5" step="1"`)}` : ""}`;
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
function craftFields(report,index,choices) {
  return report.componentProjection.rows.filter(r=>r.path.startsWith(`gear.slots.${index}.crafts.`)).map(row=>{
    const choice=choices?.find(o=>o.modifierId===row.receipt?.sourceRecordKey && row.path.endsWith('.'+o.affixId));
    const inputs=(row.extensionControls??[]).map((c,i)=>field(`수치 ${i+1} (${c.min}~${c.max})`,'extension-input',c.value,`data-key="${esc(c.key)}" min="${c.min}" max="${c.max}" step="any"`)).join('');
    return `<fieldset><legend>${esc(choice?.name??row.detail??row.name)}</legend>${inputs}${choice?button('옵션 제거','workshop-remove',`data-key="${esc(choice.key)}"`):''}</fieldset>`;
  }).join('');
}
function workshopView(s) {
  const draft=s.overlay, {kind,index,document:doc}=draft, build=doc.targetBuild;
  const report=calculateSeasonBuild(build), gear=kind==='gear';
  const item=gear?build.gear?.slots?.[index]:build.hero?.memories?.[index];
  let form='';
  if (gear) {
    const options=getSeasonSelectionOptions('gear',index).filter(o=>itemGearKind(o.id)===draft.category);
    form=`<nav class="native-slot-actions" aria-label="제작할 장비 종류">${[['base','제작 장비'],['legendary','레전드 장비']].map(([key,label])=>button(label,'workshop-category',`data-category="${key}" aria-pressed="${draft.category===key}"`)).join('')}</nav>`;
    form+=select(draft.category==='base'?'기본 장비':'레전드 장비','workshop-base','gear-selection',item?.itemId,options,`data-slot="${index}"`,true);
    if(item?.itemId) {
      const component=report.components.find(r=>r.category==='gear'&&r.id===item.itemId);
      const entry=component?.calculations?.find(r=>r.slotIndex===index);
      if(entry) form+=rollControls(component,entry,{});
      const choices=craftOptions(item.itemId);
      if(draft.category==='base'){
        form+=choices.length?select('제작 옵션 추가·등급 변경','workshop-craft','workshop-affix','',choices.map(o=>({id:o.key,name:o.name})),`data-slot="${index}"`,true):'<p>이 기본 장비에 연결된 SS14 제작 옵션이 없습니다.</p>';
        form+=craftFields(report,index,choices);
      }
    }
  } else {
    form=slotEditor({...s,document:doc,report,overlay:{type:'memory',index}});
    let preview='';
    const level=[45,60,75][index];
    const tier=(build,calculation)=>{
      const choices=buildTraitSlots(build,level);
      const actual=calculation.componentProjection.rows.find(r=>r.control?.recordKey&&choices.includes(r.control.recordKey)&&r.control.tier);
      const value=actual?.control.tier??memoryTraitTier(build,level).tier;
      return value?value+'단계':build.hero?.memories?.[index]?'확인 필요':'미장착';
    };
    if(s.drawer)s.drawer.bar=drawerDps(s,null,button('이 슬롯에 장착','workshop-equip','disabled'));
    if(item || draft.slotDraft&&s.document.targetBuild.hero.memories?.[index]) {
      const edit=item?{kind:'shelf-apply',slotIndex:index,value:finishedWorkshopItem(draft)}:{kind:'memory-selection',slotIndex:index,value:''};
      const p=previewSlotEdit(s.document,s.report,edit);
      const equip=button(item?'이 슬롯에 장착':'추억 해제','workshop-equip');
      if(s.drawer)s.drawer.bar=drawerDps(s,p.comparison,equip);
      preview=`<section class="memory-preview"><strong>${level}레벨 특성 · ${tier(s.document.targetBuild,s.report)} → ${tier(build,report)}</strong>${renderSlotPreview(p,sourceStats,esc)}</section>`
        +equip;
    }
    const shelf=draft.slotDraft?button('보관함에서 장착','shelf-open',`data-kind="memory" data-index="${index}"`):'';
    return `<section data-item-workshop class="memory-workbench"><div class="memory-fields">${form}</div><div class="memory-decisions">${preview}${shelf}<details><summary>보관함에 저장</summary><label>보관할 이름<input type="text" data-workshop-name maxlength="100" value="${esc(draft.name)}" placeholder="아이템 이름 사용"></label>${button('제작 후 보관함에 넣기','workshop-store',item?'':'disabled')}</details></div></section>`;
  }
  const edit = item?.itemId ? {kind:'shelf-apply',slotIndex:index,value:finishedWorkshopItem(draft)} : null;
  const locked = index===1 && isTwoHandedWeapon(normalizeBuild(s.document.targetBuild).gear.slots[0]?.itemId);
  const preview = edit && !locked && previewSlotEdit(s.document,s.report,edit);
  if (locked) form+='<p>서브 무기를 장착하려면 양손 무기를 먼저 교체하거나 해제하세요.</p>';
  const equip = button('이 슬롯에 장착','workshop-equip',edit&&!locked?'':'disabled');
  s.drawer.bar=drawerDps(s,preview?.comparison,equip);
  return `<section data-item-workshop class="memory-workbench"><div class="memory-fields">${form}</div><div class="memory-decisions">${preview ? renderSlotPreview(preview,sourceStats,esc) : ''}${equip}<label>보관할 이름<input type="text" data-workshop-name maxlength="100" value="${esc(draft.name)}" placeholder="아이템 이름 사용"></label>${button('제작 후 보관함에 넣기','workshop-store',edit?'':'disabled')}</div></section>`;
}
const boardTitles={talents:'재능',pact:'정령',divinity:'신격 석판'};
function boardScene(s){
  const helpers={button,esc,select,icon};
  if(s.section==='talents')return renderTalentScene(s,helpers)+(s.boardOverview?'':theaControls(s.document,s.report,{}));
  if(s.section==='pact')return renderPactScene(s,helpers);
  return s.boardOverview?renderSlateEditor(s):divinityPanel(s);
}
function boardOverview(s){
  const open=button(boardTitles[s.section]+' 편집','board-open',`aria-haspopup="dialog" data-role="board-open-${s.section}"`);
  const build=s.document.targetBuild;
  const shelf=s.section==='talents'?shelfTools('prism',s.talentIndex??0,build.talents?.placedPrism?.boardIndex===(s.talentIndex??0),button)
    :s.section==='divinity'?shelfTools('divinity',0,!!slateEditorBoard(build).slateInventory.length,button):'';
  return `<section data-board-overview>${open}${s.overlay?.type==='board'?'':boardScene({...s,boardOverview:true})}</section>${shelf}`;
}
function boardOptions(snapshot,section){
  const entries=new Map();
  const build=snapshot.document.targetBuild;
  if(section==='talents'){
    const trees=seasonTalentBoards();
    for(const [i,b] of (build.talents?.boards??[]).entries()){
      const tree=trees.find(t=>t.id===b?.treeSlug);
      if(tree)entries.set('panel'+i,{name:'재능 패널 '+(i+1),value:tree.name});
    }
  }else if(section==='divinity'){
    const types=nativeSlateOptions();
    for(const [i,slate] of slateEditorBoard(build).slateInventory.entries()){
      const pos=slate.anchor;
      const name=regularSlateFamilies.find(f=>f.id===slate.regularFamily)?.name??types.find(t=>t.id===slate.slateId)?.name;
      entries.set('piece'+slate.instanceId,{name:'석판 '+(i+1),value:[name,pos?`${pos.x+1}열 ${pos.y+1}행`:'미배치',slate.shape.length+'칸',((slate.rotation??0)*90)+'°'].filter(Boolean).join(' · ')});
    }
  }
  for(const row of snapshot.report.componentProjection.rows.filter(r=>r.group===section)){
    const ring=/\.rings\.(inner|mid)Ring(\d+)/u.exec(row.path);
    const name=ring?(ring[1]==='inner'?'내환 ':'중환 ')+ring[2]+' · '+row.name:row.name;
    const slot=/^pact\.slots\.(\d+)\.spirit$/u.exec(row.path);
    const level=slot&&build.pact.slots[Number(slot[1])]?.spirit?.level;
    const value=[row.detail,section==='talents'?row.selectionCount+'포인트':'',level?level+'레벨':'',row.inactive?.length?'비활성':''].filter(Boolean).join(' · ');
    const amounts=row.effects.filter(e=>sourceStats[e.stat]&&Number.isFinite(e.value)).map(e=>sourceStats[e.stat]+' '+e.value+(e.unit==='percent'?'%':'')).join(' · ');
    if(value||amounts)entries.set(row.path,{name,value,amounts});
  }
  return entries;
}
function boardApply(s){
  return button('빌드에 적용','board-apply',s.overlay.document===s.document&&!s.overlay.pending.size?'disabled':'');
}
export function renderDrawerBar(s){
  if(s.overlay.type==='board') {
    const draft=s.overlay;
    return drawerDps(s,compareSeasonDpsSnapshots(s,draft),boardApply(s));
  }
  const initial=s.overlay.initial;
  const comparison=initial&&initial.document!==s.document?compareSeasonDpsSnapshots(initial,s):null;
  return drawerDps(s,comparison,button('편집 완료','close'),s.error?'입력 확인':s.pending.size?'입력 적용 대기':'');
}
export function renderBoardComparison(s){
  const draft=s.overlay,section=draft.section;
  const after={...s,document:draft.document,report:draft.report,boardOverview:false};
  const result=compareSeasonDpsSnapshots(s,after),fmt=n=>Number.isFinite(n)?n.toLocaleString('ko-KR',{maximumFractionDigits:2}):'미확정';
  const beforeRows=boardOptions(s,section),afterRows=boardOptions(after,section);
  const changed=[];
  for(const key of new Set([...beforeRows.keys(),...afterRows.keys()])){
    const a=beforeRows.get(key),b=afterRows.get(key);
    if(a?.value===b?.value&&a?.name===b?.name&&a?.amounts===b?.amounts)continue;
    const scaled=a&&b&&a.amounts!==b.amounts&&a.value===b.value;
    const label=v=>v?(a&&b&&a.name!==b.name?v.name+' · ':'')+((scaled?v.amounts:v.value)||v.amounts||'없음'):'없음';
    changed.push(`<li><b>${esc(b?.name??a.name)}</b><div><small>현재</small> ${esc(label(a))}</div><div><small>변경</small> ${esc(label(b))}</div></li>`);
  }
  const amount=result.supported?`<b class="board-delta">${result.delta>0?'+':''}${fmt(result.delta)} DPS</b>`:'';
  const reasons=result.reasons.length?`<details><summary>비교 보류 사유</summary><ul>${result.reasons.map(r=>'<li>'+esc(r)+'</li>').join('')}</ul></details>`:'';
  return `<h3>전체 DPS</h3><p><span>현재 → 변경 후</span><strong>${fmt(result.baseValue)} → ${fmt(result.value)}</strong>${amount}</p>${reasons}
    <h4>변경 옵션</h4>${changed.length?`<ul class="board-option-diff">${changed.join('')}</ul>`:'<p>변경된 옵션이 없습니다.</p>'}
    ${boardApply(s)}${button('취소','close')}`;
}
function boardDrawer(s){
  const draft=s.overlay,section=draft.section;
  const after={...s,document:draft.document,report:draft.report,boardOverview:false};
  return `<div class="season-native-backdrop gear-drawer-backdrop"><button class="gear-drawer-scrim" type="button" data-ss14-action="close" tabindex="-1" aria-label="편집창 닫기"></button>
    <section role="dialog" aria-modal="true" aria-label="${boardTitles[section]} 편집" class="season-native-modal gear-drawer board-drawer">
    <header><h2 data-role="board-heading" tabindex="-1">${boardTitles[section]} 편집</h2>${button('닫기','close','aria-label="편집 닫기"')}</header>
    ${s.error?`<p role="alert">${esc(s.error)}</p>`:''}
    <div class="season-native-modal-body board-workbench"><div class="board-edit-fields">${boardScene(after)}</div>
    <aside class="board-comparison" aria-label="적용 전후 비교">${renderBoardComparison(s)}</aside></div>${renderDrawerBar(s)}</section></div>`;
}
function overlay(s) {
  if (!s.overlay) return "";
  const type = s.overlay.type;
  if(type==='board')return boardDrawer(s);
  s={...s,drawer:{}};
  if(type==='skills'||type==='workshop'){
    const index=s.overlay.index,skill=type==='skills',b=normalizeBuild(s.document.targetBuild),row=[...b.skills.active,...b.skills.passive][index];
    const name=skill?(index===0?'주력 스킬':index<5?'액티브 '+(index+1):'패시브 '+(index-4)):s.overlay.kind==='gear'?SEASON_GEAR_SLOT_LABELS[index]+' 제작':seasonMemoryOptions(index).name;
    const id=skill&&(Number.isInteger(s.supportIndex)?row.supports[s.supportIndex]?.supportId:row.skillId);
    return `<div class="season-native-backdrop gear-drawer-backdrop"><button class="gear-drawer-scrim" type="button" data-ss14-action="close" tabindex="-1" aria-label="편집창 닫기"></button>
      <section role="dialog" aria-modal="true" aria-label="SS14 ${esc(name)}" class="season-native-modal gear-drawer slot-side-editor"><header><h2 data-role="${skill?'slot-detail-heading':'memory-drawer-heading'}" tabindex="-1">${esc(name)}</h2>${button('닫기','close','aria-label="편집 닫기"')}</header>
      ${s.error?`<p role="alert">${esc(s.error)}</p>`:''}<div class="season-native-modal-body">${skill?skillEnergy(b.skills)+skillSockets(row,row.skillId,s.supportIndex)+slotEditor(s)+(id&&!s.picker?itemSource(id,s.supportIndex==null?name:name+' · 보조 '+(s.supportIndex+1))+`<details><summary>이 슬롯의 효과별 출처</summary>${renderEffectSources(s,'skills.rows.'+index+(s.supportIndex==null?'':'.supports.'+s.supportIndex))}</details>`:''):workshopView(s)}</div>${s.drawer.bar??renderDrawerBar(s)}</section></div>`;
  }
  if (type === "gear") {
    const index=s.overlay.index, id=normalizeBuild(s.document.targetBuild).gear.slots[index]?.itemId;
    const label=SEASON_GEAR_SLOT_LABELS[index], picking=!!s.picker || !id;
    return `<div class="season-native-backdrop gear-drawer-backdrop"><button class="gear-drawer-scrim" type="button" data-ss14-action="close" tabindex="-1" aria-label="장비창 닫기"></button>
      <section role="dialog" aria-modal="true" aria-label="${esc(label)} 장비 편집" class="season-native-modal gear-drawer">
      <header><div><h2 data-role="gear-drawer-heading" tabindex="-1">${esc(label)}</h2><p>현재 장착 · <strong>${id?esc(title(id)):'미장착'}</strong></p></div>${button("닫기","close",'aria-label="편집 닫기"')}</header>
      ${s.error?`<p role="alert">${esc(s.error)}</p>`:''}
      <div class="season-native-modal-body">${shelfTools("gear",index,!!id,button)}${slotEditor(s)}
      ${id&&!picking?`<details class="native-slot-effects"><summary>이 슬롯의 효과별 출처</summary>${renderEffectSources(s,`gear.slots.${index}`)}</details>${itemSource(id,label)}`:''}
      </div>${s.drawer.bar??renderDrawerBar(s)}</section></div>`;
  }
  let content;
  if (type === "saves") content = [...s.documents].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(d => `<article class="native-save-row"><span><strong>${esc(d.targetBuild.name)}</strong>${d.id===s.document.id?' · 편집 중':''}<br><time datetime="${esc(d.updatedAt)}">${esc(formatAppDateTime(d.updatedAt))}</time></span>${button("열기", "open", `data-id="${esc(d.id)}" aria-label="${esc(d.targetBuild.name)} 열기"`)}</article>`).join("") || "저장된 SS14 빌드가 없습니다.";
  else if(type==="workshop") content=workshopView(s);
  else if(type==="shelf") {
    const wearable=['gear','memory'].includes(s.overlay.kind);
    content=(wearable?button(s.overlay.kind==='gear'?'새 장비 제작':'새 추억 제작','workshop-open'):'')+
      (s.shelfRows.length?s.shelfRows.map(v=>{
        const attrs=`data-id="${esc(v.id)}"`, selected=wearable&&v.id===s.overlay.candidate;
        return `<article class="native-save-row"><strong>${esc(v.name)}</strong>${wearable?button("교체 전후 비교","shelf-preview",attrs):""}${selected?renderSlotPreview(s.overlay.preview,sourceStats,esc):""}${button(wearable?"장착":"적용","shelf-use",attrs)}${button("보관 해제","shelf-remove",attrs)}</article>`;
      }).join(""):"<p>이 슬롯에 사용할 보관 항목이 없습니다.</p>");
  }
  else if (type === "files") content = `${button("사본 저장", "copy")}${RUNTIME_POLICY.allowGameLogs ? button("게임 로그 가져오기", "local-log") : `<p>${esc(LOCAL_LOG_ONLY_MESSAGE)}</p><p>빌드는 이 브라우저에 저장됩니다. 다른 기기로 옮기거나 작업을 종료하기 전 빌드 JSON을 보관하세요.</p>`}${button("JSON 파일로 저장","download-build")}<label>JSON 파일을 사본으로 열기<input type="file" accept=".json,application/json" data-build-file></label><details><summary>JSON 텍스트로 옮기기</summary><label>TOB SS14 빌드 내보내기<textarea readonly aria-label="TOB SS14 빌드 내보내기">${esc(exportSeasonWorkspace(s.document))}</textarea></label><label>TOB SS14 빌드 가져오기<textarea id="native-import" aria-label="TOB SS14 빌드 가져오기"></textarea></label>${button("가져오기", "import")}</details><details><summary>이전 시즌 보관함</summary><button type="button" data-action="open-preserved-build">이전 시즌 빌드 열기</button></details>`;
  else if (type === "share") content = `<div class="build-share-panel"><label>공유 링크<input type="text" id="share-link" aria-label="공유 링크" readonly value="${esc(s.overlay.link)}" /></label>${button("공유 링크 복사","copy-link",s.overlay.link?"":"disabled")}<p>받은 사람이 링크를 열면 이 빌드의 사본이 열립니다.</p><p id="share-status" role="status">${esc(s.overlay.message)}</p></div>
    <details data-role="share-code-tools"><summary>빌드 코드로 공유하거나 가져오기</summary><label>내 빌드 코드<textarea id="share-code" readonly spellcheck="false" aria-label="내 빌드 코드">${esc(s.overlay.code)}</textarea></label>${button("코드 복사","copy-code",s.overlay.code?"":"disabled")}<label>받은 빌드 코드<textarea id="share-paste" spellcheck="false" placeholder="TOB14-1.…" aria-label="받은 빌드 코드">${esc(s.overlay.paste)}</textarea></label>${button("새 사본으로 열기","import-code")}</details>`;
  else if (type === "local-log") content = localLogPanel(s);
  else if (type === "effects") content = renderEffectSources(s);
  else content = slotEditor(s);
  if(type==="memory")content=shelfTools("memory",s.overlay.index,!!s.document.targetBuild.hero?.memories?.[s.overlay.index],button)+content;
  const titles = { shelf:"보관함", share: "빌드 공유", saves: "저장 빌드", files: "빌드 파일", "local-log": "게임 로그 가져오기", effects: "효과별 출처", hero: "히어로 선택", traits: "히어로 특성", memory: "히어로 추억", talents: "재능 편집", pact: "정령 편집", extensions: "영약·모듈화" };
  const heading = type==='workshop'?(s.overlay.kind==='gear'?'장비 제작':'추억 제작'):type==='memory'?seasonMemoryOptions(s.overlay.index).name:titles[type] ?? "빌드 편집";
  return `<div class="season-native-backdrop"><section role="dialog" aria-modal="true" aria-label="SS14 ${heading}" class="season-native-modal"><header><h2 tabindex="-1" data-role="dialog-heading">${heading}</h2>${button("닫기", "close", 'aria-label="편집 닫기"')}</header>${s.error ? `<p role="alert">${esc(s.error)}</p>` : ""}<div class="season-native-modal-body">${content}</div><footer>${!["workshop","shelf","share","local-log", "files", "saves", "effects", "hero"].includes(type) ? button("적용", "apply") : ""}${button("닫기", "close")}</footer></section></div>`;
}
export function renderNativeDps(s) {
  const dps = s.report.fullDps;
  const requirements = seasonInputRequirements(s.report);
  const tie = s.report.theaAverage?.projectileTie;
  const active = s.resultTab ?? 'stats';
  const panels = {
    stats: () => `<div data-role="native-numeric-result"${s.pending.size ? ' hidden' : ''}>${renderSeasonNumericStats(s.report)}</div>`,
    calculation: () => `<div data-role="native-calculation-detail"${s.pending.size ? ' hidden' : ''}>${dpsResults(s.report,reasons=>renderReasons(s,reasons))}<details data-role="native-defense-detail"><summary>자원·방어</summary>${characterResults(s.report)}</details><details data-role="native-effect-detail"><summary>효과별 근거</summary>${componentResults(s.report)}</details></div>`,
    conditions: () => renderResultConditions(s),
    analysis: () => renderResultAnalysis(s),
  };
  return `<aside class="native-dps-dock" id="native-dps-summary" tabindex="-1" aria-label="SS14 계산 결과">
    ${mobileDpsBar(s)}<div class="native-result-summary">${s.report.assumedDps ? renderAssumedDps(s) : ''}<small>SS14 전체 DPS · 입력한 전투 조건</small><strong data-role="native-dps">${s.pending.size ? '입력 적용 대기' : dps.supported ? dps.dps.toLocaleString('ko-KR', { maximumFractionDigits:2 }) : seasonDpsStatusLabel(s.report)}</strong>
    <p>${s.pending.size ? '변경한 입력을 확인하세요.' : tie ? `기존 투사체 우선 추정 · 새 시전 우선 ${tie.newCastFirstDps === null ? '계산 불가' : tie.newCastFirstDps.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) + ' DPS'}` : dps.supported ? '현재 빌드·전투 조건 기준' : '수치 탭에서 계산 가능한 항목을 확인하세요.'}</p>
    ${dps.burstRecovery?`<p>크리에이티브 대폭발 · ${dps.burstRecovery.total!==null?`기발 회복 ${dps.burstRecovery.total} (상한 적용 전)`:dps.burstRecovery.rows.length?'회복 미확정 · 전투 조건에서 발동별 결과 확인':'전투 조건에서 매직 버스트 발동 기록 입력'}</p>`:''}
    ${renderEditDpsComparison(s, true)}
    ${requirements.length ? `<details data-role="numeric-dps-requirements"><summary>전체 DPS 확인 항목</summary><div class="native-requirements" aria-label="계산에 필요한 입력">${renderReasons(s,dps.blockers)}</div></details>` : ''}
    <div class="native-result-actions">${button('다시 계산', 'apply')}${button('효과별 출처', 'effect-sources')}</div></div>
    <nav class="native-result-tabs" aria-label="계산 결과 보기">${RESULT_TABS.map(([key,label]) => button(label, 'result-tab', `data-tab="${key}" aria-pressed="${active === key}" aria-controls="native-result-panel"`)).join('')}</nav>
    <section id="native-result-panel" class="native-result-panel" aria-label="${RESULT_TABS.find(([key]) => key === active)?.[1] ?? '수치'}">${(panels[active] ?? panels.stats)()}</section></aside>`;
}
function renderAssumedDps(s) {
  const estimate=s.report.assumedDps, delta=s.editComparison?.assumedDelta;
  const fmt=n=>n.toLocaleString('ko-KR',{maximumFractionDigits:2});
  return `<small>가동률 100% · 방어 적용 전 DPS</small><strong data-role="assumed-dps">${s.pending.size?'입력 적용 대기':estimate.supported?fmt(estimate.dps):'확인 필요'}</strong>
    <p>적 아머·저항·관통 제외${estimate.defaults.length?' · '+estimate.defaults.join(' · '):''}${!s.pending.size&&Number.isFinite(delta)?' · 직전 대비 '+(delta>0?'+':'')+fmt(delta):''}</p>
    ${!s.pending.size?`<details data-role="native-uptime-details"><summary>가동률과 DPS 적용 내역</summary>
      <p>가동률 = 효과가 켜진 시간 ÷ 측정 시간 × 100. 10초 중 6초 유지하면 60%입니다.</p>
      ${estimate.uptimeDetails?.length?`<ul>${estimate.uptimeDetails.map(row=>`<li><b>${esc(row.name)}</b><br>입력 조건 ${esc(row.setting)} · 방어 전 ${esc(row.assumed)}<br>${esc(row.method)}</li>`).join('')}</ul>`:'<p>이 빌드에서 별도로 가동률을 가정한 효과가 없습니다.</p>'}
      ${button('전투 조건 보기','result-tab','data-tab="conditions"')}</details>`:''}
    ${!s.pending.size&&!estimate.supported?`<details data-role="assumed-dps-reasons"><summary>가정 계산에 필요한 항목</summary>${renderReasons(s,estimate.blockers)}</details>`:''}`;
}
export function renderSeasonPlanner(s) {
  if (!s.document) return `<main class="season-native"><h1>TOB · SS14</h1><p role="alert">${esc(s.error)}</p><button data-action="open-preserved-build">이전 시즌 빌드 열기</button></main>`;
  const report = s.report, dps = report.fullDps;
  const body = s.section === "hero" ? heroPanel(s) : ["skills", "gear"].includes(s.section) ? equipmentPanel(s, s.section)
    : boardTitles[s.section] ? boardOverview(s) : combatPanel(s);
  return `<div class="season-native" data-role="ss14-main-editor"><header class="planner-header"${s.overlay?' inert':''}><strong class="native-brand">TOB <small>SS14</small></strong><label class="build-chip"><input id="ss14BuildName" aria-label="빌드 이름" data-season-edit="name" value="${esc(s.document.targetBuild.name)}" maxlength="160" /></label>${renderEditHistory(s)}<div class="header-primary-actions">${button("저장", "save")}${button("불러오기", "saves", 'data-role="open-saves"')}${button("공유", "share", 'data-role="open-share"')}${button("빌드 파일", "files", 'data-role="open-files"')}</div><span role="status" data-role="native-save-status">${esc(s.notice || (s.dirty ? "저장하지 않은 변경" : s.document.revision ? "저장됨" : "새 SS14 사본"))}</span></header>
    <nav class="quick-category-menu"${s.overlay?' inert':''} aria-label="빌드 편집 메뉴">${tabs.map(([id, label]) => button(label, "section", `data-section="${id}" aria-pressed="${s.section === id}"`)).join("")}</nav>
    <div class="native-content"${s.overlay?' inert':''}><main class="season-native-scroll"><section class="planner-section ${s.section === "hero" ? "hero-section" : ""}"><a class="scene-dps-jump" href="#native-dps-summary">전체 DPS ↓</a><h1>${esc(tabs.find(([id]) => id === s.section)?.[1])}</h1>${s.error ? `<p role="alert">${esc(s.error)}</p>` : ""}${body}</section></main>
    ${renderNativeDps(s)}</div>
    ${overlay(s)}</div>`;
}
