import { normalizeBuild } from "./engine.js";
import { findItemById } from "./catalog.js";
import { getIngameHeroArt } from "./ingameHeroArt.js";
import { talentTreeIcon } from "./ingameUiAssets.js";
import { renderTalentScene, renderPactScene, renderPactRosterSelection, pactRingImage, boardTalentNodes } from "./seasonBoardScenes.js";
import {customOptionEditorText} from './seasonCustomOptions.js';
import { spriteKeys, columns, rows as spriteRows } from "./data/heroTraitArtwork.generated.js";
import { SS14_CARDS } from "./data/ss14Cards.generated.js";
import { ss14GearIcons } from "./data/ss14GearIcons.generated.js";
import { ss14SkillIcons } from "./data/ss14SkillIcons.generated.js";
import { SS14_KOREAN_SKILL_LEVELS } from "./data/ss14KoreanSkillLevels.generated.js";
import { SS14_SUPPORTS } from "./data/ss14Supports.generated.js";
import { seasonHeroOptions, seasonHeroTraitOptions, EMPTY_TRAIT_MEMORY, canMarkTraitMemoryEmpty, traitSlotCount, buildTraitSlots } from "./seasonHeroSelection.js";
import { seasonMemoryOptions, seasonTalentBoards, seasonTalentNodes, seasonSpiritOptions, selectedSeasonSpirit } from "./seasonNativeSelections.js";
import { memoryQualities, memoryQuality, enhancedMemoryBase } from './seasonMemoryQuality.js';
import { memoryTraitTier } from './seasonMemories.js';
import { finishedWorkshopItem } from './seasonItemWorkshop.js';
import { getSeasonPickerOptions, getSeasonSelectionOptions, SEASON_GEAR_SLOT_LABELS, isTwoHandedWeapon } from "./seasonSelections.js";
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { getSkillEnergyUsage, SUPPORT_SLOT_ENERGY_COSTS, PASSIVE_SUPPORT_SLOT_ENERGY_COSTS } from "./skillRuntimeModel.js";
import { formatAppDateTime } from "./dateTimePresentation.js";
import { seasonExclusiveSupportSlots, seasonSupportOptions, seasonSupportItem, seasonSupportKoreanCard, supportFitsSocket } from "./seasonSupport.js";
import { seasonDestinyOptions, pactNodeActive } from './seasonDestiny.js';
import { nativeElixirOptions, nativeModuleOptions, nativeModuleAffixes } from "./seasonNativeExtensions.js";
import { seasonDpsStatusLabel } from './seasonCalculationIssues.js';
import { seasonEffectSources, effectSourceLabel } from "./seasonEffectSources.js";
import { exportSeasonWorkspace } from "./seasonWorkspace.js";
import { previewLogGearOptions } from "./localGameLogImport.js";
import { renderSeasonNumericStats } from "./seasonNumericStatsView.js";
import { compareSeasonDamageBreakdown, compareSeasonResourceCosts, compareSeasonSkillLevels, gearFilters, previewSlotEdit } from './seasonGearPicker.js';
import { seasonSkillCalculationLevel, seasonSkillLevelState, seasonSkillSlotCalculation } from './seasonSkillLevels.js';
import { auraActivationControl } from './seasonNetherModifiers.js';
import { craftFamilySlots, craftOptions, itemGearKind } from './seasonItemCraft.js';
import { corrosionCard, corrosionOptions,corrosionBasePool } from './seasonCorrosion.js';
import { calculateSeasonBuild } from './seasonBuild.js';
import { renderReasons } from './seasonResultPanels.js';
import { renderDamageBreakdown, renderResourceChanges, renderSkillLevelChanges, renderSlotPreview, shelfTools, mobileDpsBar } from './seasonEditorTools.js';
import { renderSlateEditor,slateEditorBoard } from './seasonSlateEditor.js';
import { regularSlateFamilies } from './seasonDivinity.js';
import { nativeSlateOptions } from './seasonNativeDivinity.js';
import { compareSeasonDpsSnapshots, SEASON_ADVISOR_METRICS } from './seasonAdvisor.js';
import { RESULT_TABS, renderResultConditions, renderResultAnalysis, renderEditDpsComparison, renderNumbedCalculation, renderSkillCalculation, renderSkillConversion, renderElixirDamageRoutes, renderWeaponDamageRoutes, renderSkillElixirDps, renderDamageRouteChanges } from './seasonResultPanels.js';
import {renderSeasonSupportMatrix} from './seasonSupportMatrix.js';
import {isOfflineEdition} from './offlinePresentation.js';
import {screenshotGroups,seasonScreenshotTargets} from './seasonScreenshotImport.js';
import { RUNTIME_POLICY, LOCAL_LOG_ONLY_MESSAGE } from "./runtimePolicy.js";
import { canLookUpIngameBuild } from './seasonIngameBuildCode.js';
import { presentGameText, seasonKoreanCardDetail } from './gameTextPresentation.js';
import { MOON_LUNAR_RING_ID } from './seasonSupportRolls.js';
import { labeledGearRolls,rollControls, destinyControls, extensionControls, characterControls,renderBuffActivation,
  offenseControls, blessingControls, theaControls, dpsControls, dpsResults, componentResults, characterResults, weaponSummary } from "./seasonWorkspaceView.js";

const esc = v => String(v ?? "").replace(/[&<>"']/gu, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const tabs = [["overview", "빌드"], ["hero", "히어로·추억"], ["skills", "스킬"], ["gear", "장비"], ["talents", "재능"], ["divinity", "신격"], ["pact", "정령"], ["combat", "전투 조건"], ["support-matrix", "특성 지원표"]];
const title = id => {
  const record = SS14_CARDS.records[id] ?? seasonSupportKoreanCard(id);
  return record?.season === "SS14" && record.koreanTextVerified ? record.name : "한국어 이름 미제공";
};
const icon = id => {
  const item = findItemById(id);
  const current = ss14SkillIcons[id] ?? ss14SkillIcons[seasonSupportKoreanCard(id)?.itemId];
  const src = item?.localIconPath || ss14GearIcons[id] || item?.iconUrl || current || nativeElixirOptions().find(o => o.itemId === id)?.iconUrl;
  const relative = src?.startsWith('/assets/') ? '.' + src : src;
  const fallback = id ? esc(title(id).slice(0,2)) : '＋';
  return relative && /^(?:\.?\/?assets\/|https:\/\/cdn\.tlidb\.com\/)/u.test(relative)
    ? `<img src="${esc(relative)}" alt="" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false" /><span aria-hidden="true" hidden>${fallback}</span>`
    : `<span aria-hidden="true">${fallback}</span>`;
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
  return `<div class="hunter-scene"><h2 class="hunter-heading">히어로 · 추억</h2><div class="hunter-showcase">${portraits}<div class="hunter-caption">${hero ? `<h3>${esc(hero.name)}</h3>` : ""}
    <div class="hunter-controls">${field("레벨", "hero-level", b.heroLevel ?? 90, 'min="1" max="100" step="1" aria-label="히어로 레벨"')}${button(hero ? "히어로 변경" : "히어로 선택", "edit-slot", 'data-type="hero"')}</div></div></div>
    <div class="hunter-path">${[1,45,60,75].map((level,stage)=>{
      const i=stage-1;
      let memorySlot='';
      if (i>=0) {
      const options=seasonMemoryOptions(i), memory=b.hero?.memories?.[i];
      const base=options.bases.find(option=>option.id===memory?.baseAttributeId);
      const native=memory?.ss14BaseModel===1&&enhancedMemoryBase(options.baseGroups.find(g=>g.id===memory.baseAttributeId),memory.ss14Quality,memory.enhancement);
      const detail=memory?[native?.ko||base?.name, memoryQuality(memory.ss14Quality)?.name, `강화 +${memory.enhancement}`].filter(Boolean).join(" · "):"미장착";
      memorySlot=button(`${icon(options.flatCatalogId)}<span><strong>${esc(options.name)}</strong><small>${esc(detail)}</small></span>`,"edit-slot",`data-type="memory" data-role="memory-slot-${i}" data-index="${i}" aria-label="${level}레벨 특성 ${esc(options.name)} ${esc(detail)}" aria-haspopup="dialog" class="memory-slot"`);
      }
      const slots=buildTraitSlots(b,level), count=traitSlotCount(id,level);
      const buttons=Array.from({length:count},(_,slot)=>{
      const key=slots[slot],trait=choices.find(t=>t.key===key);
      const tier = key && s.report.componentProjection.rows.find(r=>r.control?.recordKey===key)?.control.tier;
      const label = key === EMPTY_TRAIT_MEMORY ? "추억 미장착" : trait?.name ?? "특성 선택";
      const caption=`${level}레벨${count>1?` · 특성 ${slot+1}`:""}`;
      return button(`${traitEmblem(id,trait,'＋')}<span><strong>${esc(label)}</strong></span>${tier?`<small>${tier}단계</small>`:""}`,"edit-slot",`data-type="traits" data-index="${level}" data-choice-index="${slot}" class="hunter-trait" aria-label="${caption} 특성 편집 · ${esc(label)}"`);
      }).join("");
      return `<div class="hunter-stage"><b class="hunter-level">${level}레벨</b><div class="hunter-stage-choices">${buttons}</div>${memorySlot}</div>`;
    }).join("")}</div></div>`;
}
function skillCardText(card) {
  if (!card?.koreanTextVerified) return '<p>한국어 원문 미제공</p>';
  const lines = (card.detail ?? '').split('\n').map(line => line.trim()).filter(Boolean);
  const simple = lines.indexOf('Simple');
  const details = lines.indexOf('Details');
  const paragraph = rows => rows.length ? '<p>'+esc(presentGameText([...new Set(rows)].join('\n')))+'</p>' : '';
  if (simple < 0 || (details >= 0 && details < simple)) return paragraph(lines);
  const description = paragraph(lines.slice(simple + 1, details >= 0 ? details : undefined));
  const extra = paragraph(lines.slice(0, simple))+(details >= 0 ? paragraph(lines.slice(details + 1)) : '');
  return description+(extra ? '<details><summary>스킬 상세</summary>'+extra+'</details>' : '');
}
function skillLevelEffects(id, entry, support, fallbackLevel = 20) {
  const card = support ? seasonSupportKoreanCard(id) : SS14_CARDS.records[id];
  const source = SS14_KOREAN_SKILL_LEVELS[id];
  const level = entry?.level ?? fallbackLevel;
  const baseLevel = support ? seasonSupportItem(id)?.tlidbText.en.cardLevel ?? 20 : 20;
  const exact = source && card?.season === 'SS14' && card.koreanTextVerified && card.sourceUrl === source.url
    && !(entry?.tier != null && card.supportTiers?.length)
    ? source.groups.find(([, levels]) => levels.includes(level)) : null;
  if (exact) {
    const detail = exact[0].split(',').map(index => source.lines[Number(index)]).join('\n');
    return `<small>Lv.${level} 원문</small><p>${esc(presentGameText(detail))}</p>`;
  }
  if (entry?.tier != null && card?.supportTiers?.length) {
    const detail = seasonKoreanCardDetail(card,entry.tier);
    if (detail) return `<small>Lv.${baseLevel} 원문</small><p>${esc(detail)}</p>`;
  }
  return `${card?.koreanTextVerified ? `<small>Lv.${baseLevel} 원문</small>` : ''}${skillCardText(card)}`;
}
function itemSource(id, binding, tier) {
  const r = corrosionCard(SS14_CARDS.records[id] ?? seasonSupportKoreanCard(id),binding,'ko');
  if (!r || r.season !== "SS14") return "";
  const link = /^https:\/\/tlidb\.com\/(?:ko|en)\//u.test(r.sourceUrl ?? "")
    ? `<a href="${esc(r.sourceUrl)}" target="_blank" rel="noreferrer">SS14 원문 보기</a>` : "";
  const pool=binding?.corrosion?.implicit&&corrosionBasePool(id);
  const baseLink=pool?` <a href="https://tlidb.com/ko/${encodeURIComponent(pool.slug)}" target="_blank" rel="noreferrer">침식 기본 원문</a>`:'';
  return `<details class="native-option-source" data-role="slot-source-${esc(id)}"><summary>옵션 원문</summary><p>${esc(seasonKoreanCardDetail(r,tier) || '한국어 원문 미제공')}</p>${link}${baseLink}</details>`;
}
const sourceStats = {
  damage: "대미지", hit_damage: "적중 대미지", spell_damage: "주술 대미지", attack_damage: "공격 대미지",
  cold_damage: "냉기 대미지", fire_damage: "화염 대미지", lightning_damage: "번개 대미지", erosion_damage: "부식 대미지",
  physical_damage: "물리 대미지", elemental_damage: "원소 대미지", area_damage: "범위 대미지", projectile_damage: "투사체 대미지",
  physical_damage_as_fire:"물리 대미지에서 화염 추가 획득",physical_damage_as_cold:"물리 대미지에서 냉기 추가 획득",
  physical_damage_as_lightning:"물리 대미지에서 번개 추가 획득",
  cast_speed: "시전 속도", attack_speed: "공격 속도", strength: "힘", dexterity: "민첩", intelligence: "지혜",
  projectile_speed: "투사체 속도", movement_speed: "이동 속도", all_attributes: "모든 속성",
  max_terra_charges: "지면 에너지 최대 중첩 수", terra_charge_restoration_speed: "지면 에너지 회복 속도",
  gear_numbed_additional_stacks: "마취 추가 중첩", gear_numbed_critical_bonus: "번개 크리티컬 시 마취 효과",
  reaping_duration: "수확 시간", reaping_recovery_speed: "수확 회복 속도", reaping_shield_charge: "수확 시 보호막 충전",
  all_stats: "모든 속성", max_life: "최대 HP", max_mana: "최대 MP", max_energy_shield: "최대 보호막",
  gear_energy_shield: "장비 보호막", gear_armor: "장비 아머", gear_evasion: "장비 회피", armor: "아머", evasion: "회피",
  cold_resistance: "냉기 저항", fire_resistance: "화염 저항", lightning_resistance: "번개 저항", erosion_resistance: "부식 저항",
  critical_strike_rating: "크리티컬 수치", critical_strike_damage: "크리티컬 대미지", double_damage_chance: "더블 대미지 확률",
  "spell-cold-damage-min": "최소 냉기 대미지", "spell-cold-damage-max": "최대 냉기 대미지", "added-damage-effectiveness": "추가 대미지 효율",
  "cast-time": "시전 시간", "mana-cost": "MP 소모", "cooldown": "쿨타임", "projectile-quantity": "투사체 수량",
};
export function renderEffectSources(s, path = null) {
  const rows = seasonEffectSources(s.report).filter(r => !path || r.path === path);
  const status = { direct: "직접 대미지 반영", selected: "선택 수치", inactive: "조건 미충족", "not-applicable":"해당 없음", blocked: "확인 필요", mechanic: "특수 효과 규칙" };
  return `<section class="native-effect-sources" aria-label="선택 효과별 출처">
    ${!path ? `<label>효과·출처 검색<input type="search" data-effect-filter aria-label="효과·출처 검색" /></label><label>표시 상태<select data-effect-status><option value="">전체</option>${Object.entries(status).map(([k,v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>` : ""}
    ${s.report.theaAverage ? "<p>아래 수치는 전투 시작 상태입니다. 전체 DPS는 선택한 시간 동안의 평균입니다.</p>" : ""}
    <div class="native-effect-list">${rows.map((r, i) => {
      const stat = r.effect?.stat ?? "", label = sourceStats[stat] ?? sourceStats[stat.replace(/^skill-/u, "").replaceAll("-", "_")]
        ?? (r.status === "mechanic" ? "발동·특수 효과" : r.status === "blocked" ? "미확인 효과" : `선택 효과 ${i + 1}`);
      const percent = r.effect?.unit === "percent" || ["more", "add_percent"].includes(r.effect?.operation);
      const value = r.value === null ? "" : `${r.value.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}${percent ? "%" : ""}${r.effect?.operation === "more" ? " 별도" : ""}`;
      const owner=r.name===r.origin?r.origin:r.origin+' · '+(r.name||'한국어 이름 미제공');
      return `<details class="native-effect-row" data-effect-state="${r.status}" data-role="effect-${esc(r.key)}"><summary><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${status[r.status]}</small><span class="native-effect-summary-owner">${esc(owner)}</span></summary>
        ${r.appliedTo?.length ? `<p>적용 스킬: ${esc(r.appliedTo.join(", "))}</p>` : ""}
        ${r.reason ? `<p>${/[가-힣]/u.test(r.reason) && !/\p{Script=Han}/u.test(r.reason) ? esc(r.reason) : "SS14 효과 또는 조건을 확인해야 합니다."}</p>` : ""}
        ${r.detail ? `<p class="native-effect-original">${r.group==='custom'?'입력값 · ':''}${esc(r.detail)}</p>` : "<p>한국어 원문 일부 미제공</p>"}
        ${/^https:\/\/tlidb\.com\/(?:en|ko)\//u.test(r.receipt?.sourceUrl ?? "") ? `<a href="${esc(r.receipt.sourceUrl)}" target="_blank" rel="noreferrer">SS14 원문 보기</a>` : ""}</details>`;
    }).join("") || "<p>이 슬롯에서 확인된 효과가 없습니다.</p>"}</div></section>`;
}
function drawerDps(s, comparison, action, status='', assumedComparison, energyChange) {
  const format=n=>Number.isFinite(n)?n.toLocaleString('ko-KR',{maximumFractionDigits:2}):'미확정';
  const current=s.report.fullDps.supported?s.report.fullDps.dps:null;
  const estimate=s.report.assumedDps?.supported?s.report.assumedDps.dps:null;
  const compareAssumed=!comparison?.supported&&assumedComparison?.supported;
  const showEstimate=!comparison&&current===null&&Number.isFinite(estimate);
  const hasComparisonValue=Number.isFinite(comparison?.baseValue)||Number.isFinite(comparison?.value);
  const changedEncounter=comparison?.encounterMatches===false;
  const hasDelta=comparison?.supported&&Math.abs(comparison.delta)>=.005;
  const unchanged=comparison?.supported&&!hasDelta&&format(comparison.baseValue)===format(comparison.value);
  const label=compareAssumed||showEstimate?SEASON_ADVISOR_METRICS.assumedDps:changedEncounter?'현재 DPS · 전투 조건 변경':'전체 DPS';
  let values=format(showEstimate?estimate:current);
  if(compareAssumed){
    const before=format(assumedComparison.baseValue),after=format(assumedComparison.value);
    values=before===after?after:`${before} → ${after}`;
  }else if(changedEncounter||unchanged){
    values=format(comparison.value);
  }else if(hasComparisonValue){
    values=`${format(comparison.baseValue)} → ${format(comparison.value)}`;
  }else if(comparison){
    values='비교 보류';
  }
  const change=compareAssumed?assumedComparison.delta:hasDelta?comparison.delta:0;
  const delta=Math.abs(change)>=.005?(change>0?'+':'')+format(change):'';
  const energy=energyChange?`<small data-role="candidate-energy">에너지 ${energyChange.before.used}/${energyChange.before.maximum} → ${energyChange.after.used}/${energyChange.after.maximum}</small>`:'';
  return `<div class="drawer-dps" aria-label="${compareAssumed||showEstimate?'방어 전':'전체'} DPS와 적용"><div aria-live="polite"><small>${label} ${delta?'<b>'+delta+'</b>':''}</small><strong>${status||values}</strong>${energy}</div>${action}</div>`;
}
export function renderSkillPickerFooter(s, id=s.picker?.candidate, status='', disabled=false) {
  const support=Number.isInteger(s.supportIndex);
  const kind=support?'support-selection':'skill-selection';
  const attrs=`data-kind="${kind}" data-index="${s.skillIndex}" data-support="${support?s.supportIndex:''}" data-id="${esc(id)}"`;
  const label=support&&s.picker?.unlockSupportSlot?'칸 열고 장착':'이 슬롯에 장착';
  const action=id?button(label,'equip-item',`${attrs}${disabled?' disabled':''}`):button('후보 선택','equip-item','disabled');
  const preview=status?null:s.picker?.preview;
  return drawerDps(s,preview?.comparison,action,status,preview?.assumedComparison,preview?.skill?.energyChange);
}
export function renderSkillCandidateResult(s) {
  const preview=s.picker?.preview;
  const removed=preview?.skill?.removedSupports;
  const entry=preview?.skill?.entry;
  const activation=preview?.skill?.activation;
  const id=s.picker?.candidate;
  const support=Number.isInteger(s.supportIndex);
  return (support?appliedSkillLevel(entry):renderSkillLevelStats(entry,preview?.skill?.growthMultiplier))
    +(activation?renderBuffActivation(activation,activation.value,{binding:'data-role="candidate-aura-activation" data-candidate-aura-activation'}):'')
    +(id?`<div class="skill-candidate-effect" aria-label="스킬 효과">${skillLevelEffects(id,entry,support,s.picker.levels?.[id])}</div>`:'')
    +(removed?.length?`<p data-role="skill-removed-supports">보조 해제 예정 · ${removed.map(id=>esc(title(id))).join(' · ')}</p>`:'')
    +(preview?renderSlotPreview(preview,esc,{showDps:false,showResourcesInline:true,extraDetails:
      renderSkillElixirDps(preview.skill?.elixirDpsStates,'candidate')
      +(renderElixirDamageRoutes(preview.skill?.elixirDamageRoutes,'candidate')
        ||renderWeaponDamageRoutes(preview.skill?.weaponDamageRoutes,'candidate')
        ||renderSkillConversion(preview.skill?.conversion,'candidate'))}):'');
}
function renderGearSkillChanges(preview) {
  return renderSkillLevelChanges(preview?.skillLevels,esc,{role:'gear-skill-level-changes'})
    +renderDamageRouteChanges(preview?.damageRoutes,{role:'gear-damage-routes'});
}
function gearEffectLines(card,id,index) {
  if (!card?.koreanTextVerified) return [];
  const metadata=new Set([...(card.tags??[]),...gearFilters(id,index),SEASON_GEAR_SLOT_LABELS[index],...(index===4?['목']:[])]);
  return [...new Set((card.detail??'').split('\n').map(line=>line.trim()).filter(line=>
    line&&!metadata.has(line)&&!card.flavorReceipt?.lines?.includes(line)&&!/^[\p{P}\p{S}\s]+$/u.test(line)))];
}
function gearEffectList(lines) {
  return lines.length ? `<ul class="gear-effect-list" aria-label="장비 옵션">${lines.map(line=>`<li>${esc(line)}</li>`).join('')}</ul>` : '';
}
function gearCardLines(s,id,index,{ includeUnlabeled = true } = {}){
  const component=s.report.components.find(r=>r.category==='gear'&&r.id===id);
  const entry=component?.calculations?.find(r=>r.slotIndex===index);
  const binding=s.document.targetBuild.ss14Inputs.gear[index];
  const controls=entry?labeledGearRolls(component,entry).filter(c => includeUnlabeled || !/^옵션 \d+ · 한국어 원문 미제공$/u.test(c.label)):[];
  const resolved=corrosionCard(SS14_CARDS.records[id],binding,'ko');
  const lines=gearEffectLines(resolved,id,index).filter(line=>!/\p{Script=Han}/u.test(line));
  const values=(label,rolls)=>rolls.length?label+' · '+rolls.map(c=>Number.isFinite(c.value)?c.value:'미입력').join(' / '):label;
  const mods=entry?.logOptions?.map(r=>r.detail)??[
    ...lines.map(label=>values(label,controls.filter(c=>c.label===label))),
    ...controls.filter(c=>!lines.includes(c.label)).map(c=>values(c.label,[c]))
  ];
  const crafted=s.report.componentProjection.rows.filter(r=>r.path.startsWith(`gear.slots.${index}.crafts.`)).map(r=>r.appliedDetail??r.detail??'한국어 원문 미제공');
  return [...mods,...crafted].map(t=>/[가-힣]/u.test(t)&&!/\p{Script=Han}/u.test(t)?t:'한국어 원문 일부 미제공');
}
function equippedGearDetails(s,id,index){
  const binding=s.document.targetBuild.ss14Inputs.gear[index];
  const list=gearCardLines(s,id,index).map(t=>`<li>${esc(t)}</li>`).join('');
  return `<details><summary>장착 중 · ${esc(title(id))}</summary>${list?`<ul>${list}</ul>`:''}${itemSource(id,binding)}</details>`;
}
function shelfCandidateDetails(s,entry,index){
  const candidate=s.overlay.preview?.candidate;
  if(!candidate)return '';
  const templatePaths=new Set(candidate.report.componentProjection.rows.filter(r=>r.group==='divinity'&&r.slateControls).map(r=>r.path));
  const boardRows=[...boardOptions(candidate,entry.kind==='prism'?'talents':'divinity')];
  const line=([,r])=>[r.name,r.value].filter(Boolean).join(' · ');
  const rows=entry.kind==='gear'?gearCardLines(candidate,entry.item.itemId,index)
    :entry.kind==='memory'?candidate.report.componentProjection.rows.filter(r=>r.path.startsWith(`hero.memories.${index}.`)).map(r=>{
      const values=(r.memoryRollControls??[]).map(c=>Number.isFinite(c.value)?c.value:'미입력');
      return [r.appliedDetail??r.detail,values.length?values.join(' / '):''].filter(Boolean).join(' · ');
    }):boardRows.filter(([key])=>entry.kind==='prism'?key==='talents.placedPrism':!templatePaths.has(key)).map(line);
  const list=values=>`<ul class="shelf-option-list">${values.filter(Boolean).map(t=>'<li>'+esc(/[가-힣]/u.test(t)&&!/\p{Script=Han}/u.test(t)?t:'한국어 원문 일부 미제공')+'</li>').join('')}</ul>`;
  const templates=entry.kind==='divinity'?boardRows.filter(([key])=>templatePaths.has(key)).map(line):[];
  return list(rows)+(templates.length?'<details><summary>석판 고유 효과·원문</summary>'+list(templates)+'</details>':'');
}
function itemPicker(s, category, index, supportIndex, current) {
  if (category==='gear' && index===1 && isTwoHandedWeapon(normalizeBuild(s.document.targetBuild).gear.slots[0]?.itemId))
    return '<p>양손 무기를 먼저 교체하거나 해제하세요.</p>'+ (current ? button('서브 무기 해제','clear-slot','data-kind="gear-selection" data-index="1"') : '');
  if(category==='gear' && s.picker?.candidate && s.picker.draft){
    const id=s.picker.candidate;
    return `<div class="gear-candidate-page" data-role="candidate-detail" tabindex="-1">
      <nav aria-label="장비 후보 탐색">${button('‹ 장비 목록','gear-candidate-list')}${current===id
        ?button('장착 해제','clear-slot',`data-kind="gear-selection" data-index="${index}"`)
        :current?button('장착 장비','view-worn-gear'):''}</nav>
      <div class="gear-comparison-body" data-candidate="${esc(id)}">${workshopView(s,s.picker.draft,true)}</div></div>`;
  }
  const support = Number.isInteger(supportIndex), kind = support ? "support-selection" : category === "gear" ? "gear-selection" : "skill-selection";
  const host = support ? [...s.document.targetBuild.skills.active, ...s.document.targetBuild.skills.passive][index] : null;
  const all = support ? seasonSupportOptions().filter(o => supportFitsSocket(o.id, SS14_CARDS_EN.records[host?.skillId], index, supportIndex)) : getSeasonPickerOptions(category, index, current);
  const family=s.picker?.gearKind??'';
  const pool=category==='gear'&&family?all.filter(o=>itemGearKind(o.id)===family):all;
  const labelsFor = category === 'gear' ? id => gearFilters(id,index) : id => {
    const card=(support ? SS14_SUPPORTS : SS14_CARDS).records[id];
    return (card?.tags ?? []).filter(tag=>/[가-힣]/u.test(tag) && !/\p{Script=Han}/u.test(tag));
  };
  const ordered = ['힘','민첩','지혜'];
  const filters=[...new Set(pool.flatMap(o=>labelsFor(o.id)))].filter(f=>!['제작','레전드'].includes(f)).sort((a,b)=>
    (ordered.includes(a)?ordered.indexOf(a):ordered.length)-(ordered.includes(b)?ordered.indexOf(b):ordered.length)||a.localeCompare(b,'ko'));
  const filterLabel=category==='gear'?'장비 분류':'스킬 태그';
  const selectedTags=s.picker?.tags??[];
  const options=category==='gear' ? (s.picker?.filter?pool.filter(o=>labelsFor(o.id).includes(s.picker.filter)):pool)
    : pool.filter(o=>selectedTags.every(tag=>labelsFor(o.id).includes(tag)));
  const selected = s.picker?.candidate ?? current ?? "";
  const query = s.picker?.query ?? "";
  const key = value => String(value).normalize("NFKC").toLocaleLowerCase("ko").replace(/\s/gu, "");
  const match = option => key(`${option.name} ${(SS14_CARDS.records[option.id] ?? SS14_SUPPORTS.records[option.id])?.detail ?? ""}`).includes(key(query));
  const card = SS14_CARDS.records[selected] ?? seasonSupportKoreanCard(selected);
  const supportsPreview = !support || Boolean(seasonSupportItem(selected));
  const equip = button("이 슬롯에 장착", "equip-item", `data-kind="${kind}" data-index="${index}" data-support="${support ? supportIndex : ""}" data-id="${esc(selected)}"`);
  if(s.drawer) s.drawer.bar=category==='gear'
    ?drawerDps(s,s.picker?.preview?.comparison,card?equip:button('후보 선택','equip-item','disabled'),'',s.picker?.preview?.assumedComparison)
    :renderSkillPickerFooter(s,card?selected:'','',!supportsPreview);
  const gearLines = category==='gear' ? gearEffectLines(card,selected,index) : [];
  const localizedLines = gearLines.filter(line=>/[가-힣]/u.test(line)&&!/\p{Script=Han}/u.test(line));
  const detail = gearEffectList(localizedLines) + (card&&category==='gear'&&(!card.koreanTextVerified||localizedLines.length<gearLines.length)
    ? '<p>한국어 원문 일부 미제공</p>' : '');
  const preview = s.picker?.preview ? renderSlotPreview(s.picker.preview,esc,{showDps:!s.drawer,extraDetails:category==='gear'?renderGearSkillChanges(s.picker.preview):''}) : "";
  const oldOptions=category==='gear'&&current&&selected&&selected!==current?equippedGearDetails(s,current,index):'';
  const gear = category==='gear';
  const counts=new Map();
  if(!gear)for(const o of pool)for(const tag of new Set(labelsFor(o.id)))counts.set(tag,(counts.get(tag)??0)+1);
  const tagBar=gear||!filters.length?'':`<details class="skill-tag-filter"${selectedTags.length&&!s.picker?.candidate?' open':''}><summary>태그${selectedTags.length?' · '+esc(selectedTags.join(', ')):''}</summary><div class="skill-tag-list" role="group" aria-label="스킬 태그">${['',...filters.sort((a,b)=>counts.get(b)-counts.get(a))].map(tag=>
    `<label><input type="checkbox" data-skill-tag="${esc(tag)}"${(tag?selectedTags.includes(tag):!selectedTags.length)?' checked':''}>${esc(tag||'전체')}</label>`).join('')}</div></details>`;
  // Keep each weapon family under its handedness in both versions of the picker.
  const groups = [];
  if (gear && index < 2) {
    for (const hand of ['한손','양손']) {
      const names = new Set(pool.map(o=>gearFilters(o.id,index,hand)).flatMap(row =>
        row.filter(tag => filters.includes(tag) && tag !== hand && !row.includes(hand + tag))));
      if (names.size) groups.push([hand, [hand,...filters.filter(tag => names.has(tag))]]);
    }
  }
  const other = filters.filter(tag => !groups.some(([,names]) => names.includes(tag))
    && !groups.some(([hand,names]) => names.includes(hand + tag)));
  if (other.length) groups.push(['',other]);
  const filterButton=f=>button(esc(f||'모든 분류'),'picker-group',`data-filter="${esc(f)}" aria-pressed="${(s.picker?.filter??'')===f}"`);
  const option=f=>`<option value="${esc(f)}"${f===s.picker?.filter?' selected':''}>${esc(f)}</option>`;
  const filterSelect = filters.length ? `<label>${filterLabel}<select data-gear-filter aria-label="${filterLabel}"><option value="">전체</option>${groups.map(([label,names])=>label?`<optgroup label="${label}">${names.map(option).join('')}</optgroup>`:names.map(option).join('')).join('')}</select></label>` : '';
  const wornAction=gear&&current&&s.picker?.draft ? (selected===current
    ?button('장착 해제','clear-slot',`data-kind="gear-selection" data-index="${index}"`)
    :button('장착 장비','view-worn-gear')):current?button(gear?'장착 옵션 편집':'장착 스킬','cancel-picker'):'';
  const skillRows=[...s.document.targetBuild.skills.active,...s.document.targetBuild.skills.passive];
  const candidateLevel=id=>s.picker?.levels?.[id]??(id===current
    ?support?skillRows[index].supports[supportIndex].level:skillRows[index].level
    :support?seasonSupportItem(id)?.tlidbText.en.cardLevel??20:20);
  const levelInput=card&&!gear&&supportsPreview?`<label class="skill-candidate-level">레벨<input type="number" min="1" max="100" step="1" data-skill-candidate-level data-id="${esc(selected)}" data-role="candidate-level-${esc(selected)}" aria-label="${esc(title(selected))} 후보 레벨" value="${candidateLevel(selected)}"></label>`:'';
  const optionButton=o=>button(`${icon(o.id)}<span>${esc(o.name)}</span>`, "preview-item",
    `data-id="${esc(o.id)}" data-picker-option data-search="${esc(`${o.name} ${(SS14_CARDS.records[o.id] ?? SS14_SUPPORTS.records[o.id])?.detail ?? ""}`)}" aria-pressed="${selected===o.id}"${gear?' data-role="gear-option-'+esc(o.id)+'"':''}${match(o)?"":" hidden"}`);
  const gearKinds = [['base','제작 장비'],['legendary','레전드 장비'],['','기타 장비']];
  const resultGroups = gear && !family ? gearKinds.map(([kind,label]) => {
    const items = options.filter(o => itemGearKind(o.id) === kind);
    return items.length ? `<div class="gear-result-group" data-gear-result-group="${kind}" role="group" aria-label="${label}"${items.some(match) ? '' : ' hidden'}><span aria-hidden="true">${label}</span>${items.map(optionButton).join('')}</div>` : '';
  }).join('') : options.map(o => gear ? optionButton(o) : `<div class="skill-candidate-row">${optionButton(o)}</div>`).join('');
  return `<div class="native-item-picker ${gear?'equipment-catalog'+(filters.length?'':' category-only'):'skill-catalog'}" aria-label="슬롯 아이템 선택">
    ${gear?`<nav class="catalog-rail" aria-label="장비 종류"><div>${gearKinds.map(([id,label])=>button(id?label:'전체','picker-gear-kind',`data-category="${id}" aria-pressed="${family===id}"`)).join('')}</div>
    ${filters.length?`<div class="catalog-groups" aria-label="장비 분류">${filterButton('')}${groups.map(([label,names])=>`<div class="catalog-family"${label?' role="group" aria-label="'+esc(label)+'"':''}>${names.map(filterButton).join('')}</div>`).join('')}</div><div class="catalog-mobile-filter">${filterSelect}</div>`:''}</nav>`:''}
    <header><input type="search" data-picker-filter value="${esc(query)}" aria-label="이름·효과 검색" placeholder="이름·효과 검색" />${wornAction}</header>${tagBar}<p data-picker-empty role="status"${options.some(match) ? " hidden" : ""}>검색 결과 없음</p>
    <div class="native-picker-columns"><div class="native-picker-list" aria-label="아이템 후보">${resultGroups}</div>
    ${card ? `<article class="native-picker-card" aria-label="아이템 미리보기" data-role="candidate-detail" tabindex="-1">${gear
      ? `<h3>${esc(title(selected))}</h3><div class="gear-comparison-body" data-candidate="${esc(selected)}" tabindex="0" aria-label="옵션 및 수치 비교">${detail}${preview}${oldOptions}</div>`
      : `<header class="skill-candidate-identity">${icon(selected)}<h3>${esc(title(selected))}</h3></header>${levelInput}<div data-role="skill-candidate-result">${s.picker?.candidate?renderSkillCandidateResult(s):`<div class="skill-candidate-effect" aria-label="스킬 효과">${skillLevelEffects(selected,null,support,candidateLevel(selected))}</div>`}</div>`}</article>` : ''}</div></div>`;
}
function skillEnergy(skills) {
  const energy = getSkillEnergyUsage(skills);
  return `<p data-role="skill-energy">에너지 <strong>${energy.used} / ${energy.maximum}</strong>${energy.over?' · 초과 '+energy.over:''}</p>`;
}
function appliedSkillLevel(entry) {
  const {level,bonus,confirmed}=seasonSkillLevelState(entry);
  if (!Number.isInteger(level) || !bonus && !entry?.levelUnavailable) return '';
  const adjustment=bonus===0?'':` (${bonus>0?'+':''}${bonus})`;
  return `<small data-role="applied-skill-level">${confirmed?'적용 레벨':'계산 확인이 필요한 레벨'} ${level}${adjustment}</small>`;
}
function renderSkillLevelStats(entry, growthMultiplier) {
  const {base,level,bonus,confirmed}=seasonSkillLevelState(entry);
  if (!Number.isInteger(level)) return '';
  if (!confirmed)
    return `<section data-role="skill-level-stats" aria-label="레벨별 스킬 수치">${appliedSkillLevel(entry) || `<strong>Lv.${level} 수치 확인 필요</strong>`}</section>`;
  const values = entry?.values ?? {};
  const showHit = Number.isFinite(values.averageHit) && (values.averageHit>0 || !entry.damageCapabilities?.dot);
  const stats = [
    ['20레벨 이후 대미지 배율',growthMultiplier,'', '×'],
    showHit?['스킬 자체 평균 적중',values.averageHit]:['스킬 자체 DPS',values.baseDps],
    ['기본 MP 소모',values.manaCost], ['기본 시전 시간',values.castTime,'초'], ['기본 쿨타임',values.cooldown,'초'],
  ].filter(([, value])=>Number.isFinite(value));
  const number = value => value.toLocaleString('ko-KR',{maximumFractionDigits:3});
  return `<section data-role="skill-level-stats" aria-label="레벨별 스킬 수치"><strong>Lv.${level} 스킬 수치</strong>${bonus?` <small>기본 ${base} ${bonus>0?'+':''}${bonus}</small>`:''}
    ${stats.length?`<dl class="native-stat-list">${stats.map(([label,value,unit,prefix])=>
      `<div class="native-stat-cell"><dt>${label}</dt><dd>${prefix??''}${number(value)}${unit??''}</dd></div>`).join('')}</dl>`:''}
    ${entry?.missingAddedDamageEffectiveness?'<small>이 레벨의 추가 대미지 효율 미확인</small>':''}</section>`;
}

function equippedSkillResourceCost(report,index) {
  const number=value=>value.toLocaleString('ko-KR',{maximumFractionDigits:2});
  const row=report.fullDps.rows.find(r=>r.rowIndex===index);
  const reservations=report.character.manaReservations?.filter(r=>r.rowIndex===index)??[];
  const values=[];
  if (Number.isFinite(row?.manaPerUse)) values.push([row.channelCost?'시작 시 MP':'시전당 MP',number(row.manaPerUse)]);
  if (row?.lifePerUse>0) values.push([row.channelCost?'시작 시 HP':'시전당 HP',number(row.lifePerUse)]);
  if (reservations.length) {
    const known=reservations.every(r=>!r.blocked&&(r.active===false||Number.isFinite(r.applied)));
    const percent=known?reservations.reduce((sum,r)=>sum+(r.active===false?0:r.applied),0):null;
    values.push(['이 스킬의 봉인 MP',known?`${number(percent)}%`:'확인 필요']);
  }
  return values.length?`<dl class="native-stat-list" data-role="equipped-skill-resource-cost" aria-label="보조와 장비가 반영된 자원 소모">${values.map(([label,value])=>
    `<div class="native-stat-cell"><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`:'';
}

export function renderEquippedSkillStats(s) {
  const support = Number.isInteger(s.supportIndex);
  const entry = seasonSkillSlotCalculation(s.report,s.skillIndex,s.supportIndex);
  const slots = s.document?.targetBuild?.skills;
  const slot = s.skillIndex < 5 ? slots?.active[s.skillIndex] : slots?.passive[s.skillIndex - 5];
  const id = support ? slot?.supports[s.supportIndex]?.supportId : entry?.itemId;
  const stats = support ? appliedSkillLevel(entry) : renderSkillLevelStats(entry,seasonSkillCalculationLevel(s.report,s.skillIndex).growthMultiplier);
  const base = support ? slot?.supports[s.supportIndex]?.level : slot?.level;
  const activation=auraActivationControl(s.report.componentProjection,s.skillIndex);
  return stats+(activation?renderBuffActivation(activation,activation.value,{slot:true}):'')+equippedSkillResourceCost(s.report,s.skillIndex)
    +(id?`<details class="skill-candidate-effect" data-role="equipped-skill-source"><summary>스킬 효과</summary>${skillLevelEffects(id,entry,support,base)}</details>`:'');
}

function exclusiveSupportLinks(s, row) {
  const index = s.skillIndex;
  const links = seasonExclusiveSupportSlots(SS14_CARDS_EN.records[row?.skillId],index);
  return links.length?`<nav class="skill-calc-actions" aria-label="부귀·숭고 보조 칸">${links.map(({index:socket,grades})=>
    button(`${grades.join('·')} · 보조 ${socket+1}${socket>=row.unlockedSupportCount?' 미리보기':''}`,
      'open-exclusive-support',`data-row="${index}" data-index="${socket}"`)).join('')}</nav>`:'';
}

function equipmentPanel(s, category) {
  const b = normalizeBuild(s.document.targetBuild), gear = category === "gear";
  const rows = [...b.skills.active, ...b.skills.passive];
  const selected = s.gearIndex ?? 0;
  const label = i => gear ? SEASON_GEAR_SLOT_LABELS[i] : i===0?'주력':i<5?`액티브 ${i+1}`:`패시브 ${i-4}`;
  const positions = gear ? [0,1,2,3,4,5,6,9,7,8] : rows.map((_, i) => i);
  if (!gear) return `<div class="skill-overview" data-role="slot-workspace"><nav class="equipped-list" aria-label="스킬 슬롯"><h2>스킬</h2>${skillEnergy(b.skills)}${rows.map((r,i)=>`<section class="skill-chain">
    ${button(`${r.skillId?icon(r.skillId):'<span class="empty-slot-mark" aria-hidden="true">＋</span>'}<span><small>${label(i)}</small>${r.skillId?`<strong>${esc(title(r.skillId))}</strong>`:''}</span>`,'inspect-skill',`data-index="${i}" data-role="skill-slot-${i}" aria-label="${esc(label(i)+' · '+(r.skillId?title(r.skillId):'미장착'))}" aria-haspopup="dialog"`)}
    ${r.skillId?`<div class="chain-supports">${Array.from({length:5},(_,n)=>{
      if(n>=r.unlockedSupportCount)return '<span class="chain-locked" aria-hidden="true">–</span>';
      const linked=r.supports[n]?.supportId, name='보조 '+(n+1)+' '+(linked?title(linked):'미장착');
      return button(linked?icon(linked)+'<small>'+esc(title(linked))+'</small>':'＋','inspect-socket',`data-row="${i}" data-index="${n}" aria-label="${esc(name)}" title="${esc(name)}" aria-haspopup="dialog"`);
    }).join('')}</div>`:''}</section>`).join('')}</nav>${button("영약·모듈화", "edit-slot", 'data-type="extensions"')}</div>`;
  const shelf=button('보관함','shelf-open',`data-kind="gear" data-scope="all" data-index="${selected}" data-role="home-shelf"`);
  const slots = `<nav class="equipped-list" aria-label="장비 슬롯"><header class="equipment-heading"><h2>장비</h2>${shelf}</header><div class="gear-slots">${positions.map(i => {
      const current = b.gear.slots[i]?.itemId;
      return button(`${current?icon(current):'<span class="empty-slot-mark" aria-hidden="true">＋</span>'}<span><small>${esc(label(i))}</small>${current?`<strong>${esc(title(current))}</strong>`:''}</span>`,
        "inspect-gear", `data-index="${i}" data-role="gear-slot-${i}"${current?' class="is-filled"':''} aria-label="${esc(label(i)+' · '+(current?title(current):'미장착'))}" aria-haspopup="dialog" aria-expanded="${s.overlay?.type==='gear'&&selected===i}"`);
    }).join("")}</div></nav>`;
  const tools=s.section==='gear'?`<div class="home-gear-tools"><select aria-label="제작 장비 부위" data-home-gear-slot data-role="home-gear-slot">${SEASON_GEAR_SLOT_LABELS.map((name,i)=>`<option value="${i}"${i===selected?' selected':''}>${esc(name)}</option>`).join('')}</select>${button('장비 제작','workshop-open',`data-kind="gear" data-index="${selected}"`)}</div>`:'';
  return `<div class="gear-slot-overview" data-role="slot-workspace">${slots}${tools}</div>`;
}
function skillLinkBoard(s,skills) {
  const energy=getSkillEnergyUsage(skills);
  const groups=[[skills.active,SUPPORT_SLOT_ENERGY_COSTS,0],[skills.passive,PASSIVE_SUPPORT_SLOT_ENERGY_COSTS,5]];
  const blocks=groups.map(([rows,costs,start])=>{
    const header=`<div class="skill-board-row skill-board-costs"><b>${start?'패시브':'액티브'}</b>${costs.map(cost=>'<span>+'+cost+'</span>').join('')}<span>에너지</span></div>`;
    return header+rows.map((row,i)=>{
      const index=start+i, name=index===0?'주력 스킬':(start?'패시브 ':'액티브 ')+(i+1);
      const slots=[row.skillId,...costs.map((_,n)=>row.supports[n]?.supportId)];
      const count=row.unlockedSupportCount;
      const cells=slots.map((id,n)=>{
        const locked=n>count,label=n?'보조 '+n:name;
        const desc=(n?name+' · ':'')+label+' · '+(locked?'잠김':id?title(id):'미장착');
        const active=s.overlay.index===index && (s.supportIndex??-1)===n-1;
        const art=id?icon(id):'';
        const symbol=locked?'–':art.startsWith('<img')?art:id?esc(title(id).slice(0,2)):'＋';
        const entry=id&&seasonSkillSlotCalculation(s.report,index,n?n-1:undefined);
        const base=n?row.supports[n-1]?.level:row.level;
        const {level:effective,bonus,confirmed}=seasonSkillLevelState(entry,base);
        const needsCheck=!!(entry?.levelUnavailable || bonus&&!confirmed);
        const level=id?`<span class="skill-board-level" aria-hidden="true">${effective??base}${needsCheck?'?':''}</span>`:'';
        const levelHelp=bonus?`레벨 ${base} → ${effective}${needsCheck?' · 확인 필요':''}`:needsCheck?`레벨 ${base} · 확인 필요`:'';
        const tip=levelHelp?`${desc} · ${levelHelp}`:desc;
        const select=button(symbol+level+(n?'':'<small>'+name+'</small>'), 'inspect-socket', `data-row="${index}" data-index="${n-1}" aria-pressed="${active}" aria-label="${esc(desc)}" title="${esc(tip)}"${levelHelp?` aria-description="${esc(levelHelp)}"`:''}${locked||n&&!row.skillId?' disabled':''}`);
        const remove=id?button('×','remove-socket',`class="skill-socket-remove" data-row="${index}" data-index="${n-1}" aria-label="${esc(desc)} 해제" title="해제"`):'';
        return `<div class="skill-board-socket">${select}${remove}</div>`;
      }).join('');
      const step=(dir,disabled)=>button(dir>0?'+':'−','skill-board-count',`data-row="${index}" data-step="${dir}" aria-label="${name} 보조 칸 ${dir>0?'추가':'줄이기'}"${disabled?' disabled':''}`);
      return `<div class="skill-board-row" aria-label="${name}">${cells}<div class="skill-board-steps">${step(-1,!row.skillId||!count||!!row.supports[count-1]?.supportId)}<span>${energy.rows[index].used}</span>${step(1,!row.skillId||count>=5)}</div></div>`;
    }).join('');
  }).join('');
  const mana=s.report.character.values;
  const canReset=[...skills.active,...skills.passive].some((row,i)=>row.skillId||row.supports.some(Boolean)||row.unlockedSupportCount!==(i<5?1:0))||skills.elixirs?.some(Boolean);
  return `<aside class="skill-link-board" aria-label="스킬 연결판"><header>${button(s.overlay.boardOnly?'스킬 목록 열기':'스킬 목록 접기','skill-toggle-catalog',`data-role="skill-catalog-toggle" aria-controls="skill-selection-pane" aria-expanded="${!s.overlay.boardOnly}"`)}${skillEnergy(skills)}</header>${blocks}<footer><span data-role="skill-mana-seal">${skillSealSummary(mana)}</span>${button('스킬 초기화','skills-reset',`data-role="skills-reset"${canReset?'':' disabled'}`)}</footer></aside>`;
}
export function skillSealSummary(mana) {
  const fmt=n=>n.toLocaleString('ko-KR',{maximumFractionDigits:2});
  return 'MP 봉인 '+(Number.isFinite(mana.reservedManaPercent)?fmt(mana.reservedManaPercent)+'%':'미확인')+(Number.isFinite(mana.unreservedMana)?' · 사용 가능 MP '+fmt(mana.unreservedMana):'');
}
function combatPanel(s) {
  const recovery=s.report.fullDps.burstRecovery;
  const editor=recovery?`<details data-role="burst-recovery-editor"><summary>크리에이티브 대폭발 · 기발 회복</summary>
    <details><summary>발동 기록 기준</summary><p>관측 시작을 0ms로 두고 실제 매직 버스트 발동을 빠짐없이 순서대로 기록하세요. 오버로드 시전 자체나 장벽 폭발 적중은 발동으로 세지 않습니다.</p>
    <p>1초 제한의 기본 회복 적용 범위와 일반·오버로드 공유 여부는 미확인입니다. 회복을 추가 대미지나 발동 횟수로 환산하지 않습니다.</p></details>
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
    </details>`:'';
  return `${dpsControls(s.document, s.report, {}, true)}
    <details data-role="combat-extra-fields"><summary>추가 전투 조건</summary>
      <details data-role="season-character-input"><summary>기본 속성·효과 조건</summary>${characterControls(s.document, s.report, {})}</details>
      <details data-role="native-critical-input"><summary>스킬 기본 크리티컬</summary>${offenseControls(s.document, s.report, {})}</details>
      <details data-role="native-blessing-input"><summary>축복 중첩</summary>${blessingControls(s.document, s.report, {})}</details>
      ${theaControls(s.document, s.report, {})}${editor}
      <details data-role="native-extension-input"><summary>영약·특수 효과 조건</summary>${extensionControls(s.report, {})}</details>
      <details class="combat-custom-options" data-role="combat-custom-options"><summary>사용자 옵션</summary><textarea id="ss14-custom-options" aria-label="사용자 옵션" data-role="custom-options" data-season-edit="custom-options" rows="3">${esc(customOptionEditorText(s.document.targetBuild.customAffixes))}</textarea></details>
    </details>`;
}
function divinityPanel(s) {
  const conditions=netherConditions(s.report);
  return `${renderSlateEditor(s,{hideInspector:s.slateInspectorSeparated})}${conditions?`<details class="slate-combat-conditions" data-role="slate-combat-conditions"><summary>석판 전투 조건</summary>${conditions}</details>`:''}`;
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
    return `${!s.document.targetBuild.ss14Inputs.heroSelection && !(traitSlotCount(id,45)===2 && b.hero?.traitSelections?.length) ? select("히어로 선택", "native-hero", "hero-selection", "", seasonHeroOptions().map(h => ({ id: h.id, name: `${h.name} · ${h.title}` }))) : (stages.includes(index) ? [index] : stages).map(level => {
      const slot=Math.min(s.overlay.choiceIndex??0,traitSlotCount(id,level)-1), slots=buildTraitSlots(s.document.targetBuild,level), key=slots[slot];
      const options = choices.filter(t => t.level === level);
      const choose = (value, content, className) => button(content, "pick-trait",
        `class="${className}" data-level="${level}" data-choice-index="${slot}" data-value="${esc(value)}" aria-pressed="${(key ?? "") === value}" ${value && slots.some((k,i)=>i!==slot && k===value)?"disabled":""}`);
      return `<fieldset><legend>${level}레벨 특성${traitSlotCount(id,level)>1?` · ${slot+1}번 칸`:""}</legend><div class="trait-deck">${options.map(t => {
        const tiers = t.description.split(/\n(?=레벨 \d+\s*\n)/u);
        const tier = s.report.componentProjection.rows.find(r=>r.control?.recordKey===t.key)?.control.tier;
        const preview = tiers.find(text => tier && text.startsWith(`레벨 ${tier}\n`)) ?? tiers[0];
        return `<article>${choose(t.key, `${traitEmblem(id, t, level)}<strong>${esc(t.name)}${tier?` · ${tier}단계`:''}</strong><span>${esc(preview)}</span>`, "trait-choice")}
          ${tiers.length > 1 ? `<details><summary>단계별 효과</summary><p>${esc(t.description)}</p></details>` : ""}</article>`;
      }).join("")}</div>
        <div class="trait-clear">${choose("", "미정", "trait-setting")}${canMarkTraitMemoryEmpty(b, level) ? choose(EMPTY_TRAIT_MEMORY, "추억 미장착", "trait-setting") : ""}</div></fieldset>`;
    }).join("")}`;
  }
  if (type === "memory") {
    const options = seasonMemoryOptions(index), memory = b.hero.memories[index];
    const quality = memoryQuality(memory ? memory.ss14Quality : s.overlay.memoryPreset);
    const enhancement=memory?.enhancement??quality?.maxLevel;
    const byLabel=new Map();
    for (const group of options.baseGroups) {
      const model=enhancedMemoryBase(group,1,1);
      const label=model?.label??options.bases.find(o=>o.id===group.id)?.name;
      if (!byLabel.has(label) || group.id===memory?.baseAttributeId) byLabel.set(label,{
        id:group.id,name:enhancedMemoryBase(group,quality?.id,enhancement)?.ko??label
      });
    }
    const bases=[...byLabel.values()];
    const base = select("기본 속성", "native-memory", "memory-selection", memory?.baseAttributeId, bases, `data-slot="${index}"`);
    const presets=`<fieldset class="memory-presets"><legend>희귀도별 최대 강화</legend><div>${memoryQualities.map(q=>button(`<small>${q.name}</small><strong>+${q.maxLevel}</strong>`,'memory-preset',`data-role="memory-preset-${q.id}" data-quality="${q.id}" aria-label="${q.name} 최대 강화 +${q.maxLevel}" aria-pressed="${quality?.id===q.id&&enhancement===q.maxLevel}"`)).join('')}</div></fieldset>`;
    if (!memory) return base+presets;
    const tiers = ['fixed','random'].map(kind=>{
      const ids=memory[kind+'AffixIds']??[], count=kind==='fixed'?2:quality?.randomLimit??2;
      return Array.from({length:Math.min(count,ids.length+1)},(_,n)=>{
        const id=ids[n],previous=id?id+'|'+memory.affixRolls?.[id]?.tierId:'';
        const choices=options.affixes.filter(o=>o.kind===kind&&(o.groupId===id||!ids.includes(o.groupId)));
        const label=(kind==='fixed'?'고유':'랜덤')+' 옵션 '+(n+1);
        const families=new Map();
        for(const o of choices)if(!families.has(o.groupId)||o.id===previous)families.set(o.groupId,o);
        const levels=choices.filter(o=>o.groupId===id);
        const ranges=s.report.componentProjection.rows.find(r=>r.path==='hero.memories.'+index+'.'+kind+'.'+id)?.memoryRollControls??[];
        const role=`memory-option-${kind}-${n}`;
        const choose=(value,name)=>button(esc(name),'memory-option-pick',`data-memory-choice data-search="${esc(name)}" data-value="${esc(value)}" data-previous="${esc(previous)}" data-position="${n}" data-focus="${role}" aria-pressed="${value===previous}"`);
        const selected=choices.find(o=>o.id===previous);
        const picker=`<details data-memory-picker><summary data-role="${role}" aria-label="${label} 선택">${esc(selected?.name??'옵션 선택')}</summary><div class="memory-option-menu"><input type="search" data-memory-search aria-label="${label} 검색" placeholder="옵션 검색"><div class="memory-option-list">${choose('','미장착')}${[...families.values()].map(o=>choose(o.id,o.name)).join('')}<p data-memory-empty hidden>검색 결과 없음</p></div></div></details>`;
        const tier=levels.length>1?`<select class="memory-affix-tier" aria-label="${label} 등급" data-season-edit="memory-tier" data-slot="${index}" data-key="${esc(id)}">${levels.map(o=>`<option value="${esc(o.tierId)}"${o.id===previous?' selected':''}>T${o.tier}</option>`).join('')}</select>`:'';
        const inputs=ranges.map((c,i)=>`<div class="memory-roll-control"><input type="range" data-season-edit="memory-roll" data-role="memory-roll-${kind}-${n}-${i}" data-key="${esc(c.key)}" min="${c.min}" max="${c.max}" step="${10**-Math.max(...[c.min,c.max].map(v=>(String(v).split('.')[1]??'').length))}" value="${c.value===''?c.min:c.value}" ${c.value===''?'aria-valuetext="미입력"':''} aria-label="${label} 수치 ${i+1} 슬라이더">${field(`수치${ranges.length>1?' '+(i+1):''} (${c.min}~${c.max})`,'memory-roll',c.value,
          `data-key="${esc(c.key)}" min="${c.min}" max="${c.max}" step="any" aria-label="${label} 수치 ${i+1}"`)}</div>`).join('');
        return `<div class="memory-affix-line"><span>${label}</span><div class="memory-affix-selection">${tier}${picker}</div>${inputs}</div>`;
      }).join('');
    }).join('');
    return base + '<div class="memory-fine-level">' + select('추억 희귀도','native-memory-quality','memory-quality',memory.ss14Quality,
      memoryQualities.map(q=>({id:q.id,name:q.name})), `data-slot="${index}"`)
      + `<label>강화 단계 <output data-memory-level>+${memory.enhancement}</output><input type="range" min="1" max="${quality?.maxLevel??50}" step="1" value="${memory.enhancement}" aria-label="강화 단계" data-role="memory-level-slider" data-season-edit="memory-enhancement" data-slot="${index}"></label>`
      + `</div><details class="memory-quick-presets"><summary>최대 강화로 설정</summary>${presets}</details><fieldset data-role="native-memory-affixes"><legend>추억 옵션</legend>${tiers}</fieldset>`;
  }
  if (type === "skills" || type === "gear") {
    const isGear = type === "gear", row = index < 5 ? b.skills.active[index] : b.skills.passive[index - 5];
    const id = isGear ? b.gear.slots[index]?.itemId : row.skillId;
    const component = s.report.components.find(c => c.category === type && c.id === id);
    const entry = component?.calculations?.find(r => (isGear ? r.slotIndex : r.rowIndex) === index);
    const c = s.overlay.supportIndex;
    const current = !isGear && Number.isInteger(c) ? row.supports[c]?.supportId : id;
    if (s.picker || !current) return itemPicker(s, type, index, c, current);
    const itemType = isGear ? "장비" : Number.isInteger(c) ? "보조 스킬" : "스킬";
    const identity = isGear ? '' : `<header class="equipped-skill-identity">${icon(current)}<div><h3>${esc(title(current))}</h3></div></header>`;
    const actions = `${identity}<div class="native-slot-actions">${button("교체", "open-picker", `aria-label="${itemType} 교체"`)}${button("해제", "clear-slot", `aria-label="${itemType} 해제" data-kind="${isGear ? "gear-selection" : Number.isInteger(c) ? "support-selection" : "skill-selection"}" data-index="${index}" data-support="${Number.isInteger(c) ? c : ""}"`)}</div>`;
    if (!isGear && Number.isInteger(c)) {
      const calculation = s.report.components.filter(component => component.category === "supports")
        .flatMap(component => component.calculations ?? []).find(entry => entry.rowIndex === index && entry.supportIndex === c);
      return `${actions}<fieldset><legend class="panel-heading-accessible">보조 ${c + 1}</legend>${field(`보조 ${c + 1} 레벨`, "support-level", row.supports[c].level, `data-row="${index}" data-support="${c}" min="1" max="100" step="1"`)}
        <div data-role="equipped-skill-level-stats">${renderEquippedSkillStats(s)}</div>
        ${calculation?.tiers?.length ? `<label>옵션 등급<select data-season-edit="support-tier" data-row="${index}" data-support="${c}">${calculation.tier == null ? '<option value="" selected disabled>등급 선택</option>' : ""}${calculation.tiers.map(t => `<option value="${t.tier}"${t.tier === calculation.tier ? " selected" : ""}>T${t.tier}</option>`).join("")}</select></label>` : ""}
        ${(calculation?.controls ?? []).map((control, n) => field(`${current===MOON_LUNAR_RING_ID?'환형 공격 발동 확률':`보조 옵션 ${n + 1}`} (${control.min}~${control.max})`, "support-roll", control.value,
          `data-row="${index}" data-support="${c}" data-key="${esc(control.key)}" min="${control.min}" max="${control.max}" step="any"`)).join("")}
        ${(calculation?.conditionControls ?? []).map(control => {
          const attrs=`data-row="${index}" data-support="${c}" data-key="${esc(control.key)}" ${control.automatic?'disabled':''}`;
          const input=control.choices
            ? `<label>${esc(control.label)}<select data-season-edit="support-condition" ${attrs}><option value="">선택</option>${control.choices.map(([value,label])=>`<option value="${value}"${control.value===value?' selected':''}>${esc(label)}</option>`).join('')}</select></label>`
            : field(control.label,"support-condition",control.value,`${attrs} min="${control.min}" max="${control.max}" step="1"`);
          return `${control.sourceText?`<details><summary>조건 원문</summary><p>${esc(control.sourceText)}</p></details>`:''}${input}`;
        }).join("")}</fieldset>`;
    }
    return `${actions}${isGear && index < 2 ? weaponSummary(s.document.targetBuild, index) : ''}
      ${isGear ? (entry ? rollControls(component, entry, {}) : "") + s.report.componentProjection.rows.filter(r=>r.path.startsWith(`gear.slots.${index}.crafts.`)).map(r=>`<fieldset><legend>${esc(r.detail??r.name)}</legend>${craftRollInputs(r)}</fieldset>`).join('') : id ? `${field("스킬 레벨", "skill-level", row.level, `data-row="${index}" min="1" max="100" step="1"`)}<div data-role="equipped-skill-level-stats">${renderEquippedSkillStats(s)}</div>${field("보조 칸 수", "support-count", row.unlockedSupportCount, `data-row="${index}" min="0" max="5" step="1"`)}` : ""}`;
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
    ${local.preview.changeCount ? `<details class="native-log-history" data-role="log-change-history"><summary>로그인 이후 변경 ${local.preview.changeCount}건</summary><ol>${local.preview.changes.map(c => `<li>${esc(c.action === "Reset" ? ({ "-1": "장비", "-6": "스킬", "-4": "신격" })[c.page] : effectSourceLabel(c.page === -1 ? `gear.slots.${({1:2,2:0,3:1,4:3,5:4,6:7,7:8,8:6,9:5,10:9})[c.index]}` : "", c.page === -6 ? "skills" : "divinity"))} · ${c.page === -6 && c.action !== "Reset" ? `슬롯 ${c.index} · ` : ""}${({Add:"장착", Update:"변경", Delete:"해제", Reset:"목록 초기화"})[c.action]}${c.status === "superseded" ? " · 교체 전 아이템" : ""}<small>기록 ${c.sourceLine}행</small></li>`).join("")}</ol>${local.preview.changeCount > 200 ? "<p>최근 200건을 표시합니다. 슬롯에는 모든 변경을 반영했습니다.</p>" : ""}</details>` : ""}
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
function craftRollInputs(row,slotName='',sourceText='') {
  const controls=row?.extensionControls??[];
  // Use an exact Korean source line only when each roll maps unambiguously.
  const lines=sourceText.split('\n').flatMap(line=>{
    const ranges=[...line.matchAll(/\((-?\d+(?:\.\d+)?)–(-?\d+(?:\.\d+)?)\)/gu)];
    return ranges.map(r=>({text:line.trim(),min:Number(r[1]),max:Number(r[2]),single:ranges.length===1}));
  });
  const matched=lines.length===controls.length&&lines.every((line,i)=>line.single&&line.min===controls[i].min&&line.max===controls[i].max&&/[가-힣]/u.test(line.text)&&!/\p{Script=Han}/u.test(line.text));
  return controls.map((v,i)=>{
    const label=matched?lines[i].text:`수치 ${i+1} (${v.min}~${v.max})`, attrs=`data-key="${esc(v.key)}" min="${v.min}" max="${v.max}"`;
    const accessible=slotName?`${slotName} · ${label}`:label;
    const number=field(label,'extension-input',v.value,attrs+` step="any" aria-label="${esc(accessible)}"`);
    if(!slotName||!Number.isFinite(v.value)||v.min===v.max)return number;
    const step=10**-Math.max(...[v.min,v.max].map(n=>String(n).split('.')[1]?.length??0));
    return `<div class="craft-roll-pair craft-option-roll">${number}<input type="range" data-season-edit="extension-input" data-role="craft-slider-${esc(v.key)}" aria-label="${esc(accessible+' 조절')}" ${attrs} value="${v.value}" step="${step}"></div>`;
  }).join('');
}
function craftFields(report,index,choices,crafts={}) {
  return `<div class="craft-families">${[['craft_prefix','접두'],['craft_suffix','접미']].map(([family,label])=>{
    const pool=choices.filter(o=>o.family===family);
    const slots=craftFamilySlots(crafts,family);
    const rows=slots.map((c,position)=>{
      const slotName=label+' '+(position+1);
      const attrs=`data-family="${family}" data-position="${position}"`;
      const items=pool.filter(o=>!crafts?.[o.affixId]||o.affixId===c?.affixId);
      if(!c)return button('＋ '+slotName,'workshop-add-slot',`${attrs} aria-label="${slotName} 추가" class="craft-affix" ${items.length?'':'disabled'}`);
      const choice=items.find(o=>o.affixId===c.affixId&&o.tierId===c.tierId);
      const row=report.componentProjection.rows.find(r=>r.path===`gear.slots.${index}.crafts.${c.affixId}`);
      const id='craft-'+family+'-'+position;
      const picker=choice&&position<3?`<label>${slotName}<select id="${id}" data-workshop-slot ${attrs} data-role="${id}" aria-label="${slotName} 옵션·등급">${items.map(o=>`<option value="${esc(o.key)}"${o===choice?' selected':''}>T${esc(o.tier)} · ${esc(o.text)}</option>`).join('')}</select></label><details><summary>옵션 검색</summary><input type="search" data-season-filter="${id}" aria-label="${slotName} 옵션 검색"></details>`:esc(row?.detail??'옵션 확인 필요');
      return `<div class="craft-affix">${picker}${craftRollInputs(row,slotName,choice?.text)}${choice?button('옵션 제거','workshop-remove',`data-key="${esc(choice.key)}" aria-label="${slotName} 제거"`):''}</div>`;
    });
    return `<section aria-label="${label} 옵션"><h3>${label} <small>${slots.filter(Boolean).length}/3</small></h3>${rows.join('')}</section>`;
  }).join('')}</div>`;
}
function legendaryRollInput(control,slot,label){
  const {min,max,value,key}=control;
  const attrs=`data-season-edit="gear-roll" data-slot="${slot}" data-roll="${esc(key)}" min="${min}" max="${max}"`;
  const step=10**-Math.max(...[min,max].map(n=>String(n).split('.')[1]?.length??0));
  const slider=Number.isFinite(value)&&min<max?`<input type="range" ${attrs} data-role="gear-slider-${esc(key)}" aria-label="${esc(label)} 조절" value="${value}" step="${step}">`:'';
  return `<div class="craft-roll-pair legendary-roll">${slider}<input type="number" ${attrs} aria-label="${esc(label)}" step="any" placeholder="${min}–${max}" value="${esc(value)}"></div>`;
}
function workshopView(s,draft=s.overlay,embedded=false) {
  const {kind,index,document:doc}=draft, build=doc.targetBuild;
  const report=calculateSeasonBuild(build), gear=kind==='gear';
  const item=gear?build.gear?.slots?.[index]:build.hero?.memories?.[index];
  let form='';
  if (gear) {
    if(!embedded){
      const options=getSeasonSelectionOptions('gear',index).filter(o=>itemGearKind(o.id)===draft.category);
      form=`<nav class="native-slot-actions" aria-label="제작할 장비 종류">${[['base','제작 장비'],['legendary','레전드 장비']].map(([key,label])=>button(label,'workshop-category',`data-category="${key}" aria-pressed="${draft.category===key}"`)).join('')}</nav>`;
      const bases=select(draft.category==='base'?'기본 장비':'레전드 장비','workshop-base','gear-selection',item?.itemId,options,`data-slot="${index}"`,true);
      form+=item?.itemId?`<details><summary>${esc(title(item.itemId))} · 변경</summary>${bases}</details>`:bases;
    }
    if(item?.itemId) {
      const component=report.components.find(r=>r.category==='gear'&&r.id===item.itemId);
      const entry=component?.calculations?.find(r=>r.slotIndex===index);
      const binding=build.ss14Inputs.gear[index];
      const displayed=new Set();
      if(draft.category==='legendary' && !binding?.logGear && !item.corrupted && !item.affixText?.trim() && !item.legendaryDraft?.corrodedSlotIds?.length && !Object.keys(item.crafts??{}).length){
        const options=corrosionOptions(item.itemId);
        const controls=entry?labeledGearRolls(component,entry):[];
        const pool=corrosionBasePool(item.itemId);
        if(pool){
          const active=pool.rows.find(r=>r.id===binding?.corrosion?.implicit?.id);
          form+=`<fieldset class="legendary-base"><legend>침식 기본</legend><div><select aria-label="침식 기본" data-workshop-corrosion-base data-role="corrosion-base"><option value="">미적용</option>${pool.rows.map(r=>`<option value="${esc(r.id)}"${r===active?' selected':''}>${esc(r.ko)}</option>`).join('')}</select>`;
          for(const c of controls.filter(c=>c.implicit&&active)){
            displayed.add('base:'+c.sourceText);
            form+=legendaryRollInput(c,index,`침식 기본 수치 ${c.min}~${c.max}`);
          }
          form+='</div></fieldset>';
        }
        if(options.length)form+=`<fieldset class="legendary-corrosion"><legend>침식</legend>${options.map(o=>{
          const on=binding?.corrosion?.selected.includes(o.base);
          const label=on?o.corroded:o.normal,lines=(on?o.replacement:o.original).split('\n').map(t=>t.trim());
          const fields=controls.filter(c=>!c.implicit&&lines.includes(c.sourceText?.trim())).map(c=>{
            displayed.add(c.sourceText);
            return legendaryRollInput(c,index,`${c.label} 수치 ${c.min}~${c.max}`);
          }).join('');
          return `<div class="legendary-option"><label><input type="checkbox" role="switch" aria-label="침식 · ${esc(label)}" data-workshop-corrosion data-key="${esc(o.base)}" data-role="corrosion-${esc(o.base)}"${on?' checked':''}><span>${esc(label)}</span></label>${fields}</div>`;
        }).join('')}</fieldset>`;
      }
      if(entry) form+=rollControls(component,{...entry,controls:entry.controls?.filter(c=>!displayed.has((c.implicit?'base:':'')+c.sourceText))},{});
      const choices=craftOptions(item.itemId);
      if(draft.category==='base'){
        form+=choices.length||Object.keys(item.crafts??{}).length?craftFields(report,index,choices,item.crafts):'<p>제작 옵션 없음</p>';
      }
    }
  } else {
    form=slotEditor({...s,document:doc,report,overlay:{...draft,type:'memory',index}});
    let preview='', trait='';
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
      if(s.drawer)s.drawer.bar=drawerDps(s,p.comparison,equip,'',p.assumedComparison);
      const before=tier(s.document.targetBuild,s.report), after=tier(build,report);
      trait=`<small class="memory-trait-preview">특성 ${before===after?after:before+' → '+after}</small>`;
      preview=renderSlotPreview(p,esc,{showDps:!s.drawer});
    }
    const options=seasonMemoryOptions(index), prefix='hero.memories.'+index+'.';
    const effects=report.componentProjection.rows.filter(r=>r.path.startsWith(prefix)&&r.detail);
    const summary=item||trait?`<section class="memory-card"><header>${icon(options.flatCatalogId)}<div><strong>${esc(options.name)}</strong>${trait}</div></header>${effects.length?`<ul aria-label="추억 효과">${effects.map(r=>`<li>${esc(r.appliedDetail??r.detail)}</li>`).join('')}</ul>`:''}</section>`:'';
    const shelf=draft.slotDraft?button('보관함에서 장착','shelf-open',`data-kind="memory" data-index="${index}"`):'';
    return `<section data-item-workshop class="memory-workbench"><div class="memory-fields">${form}</div><div class="memory-decisions">${summary}${preview}${shelf}<details><summary>보관함에 저장</summary><label>보관할 이름<input type="text" data-workshop-name maxlength="100" value="${esc(draft.name)}" placeholder="아이템 이름 사용"></label>${button('제작 후 보관함에 넣기','workshop-store',item?'':'disabled')}</details></div></section>`;
  }
  const edit = embedded?s.picker.edit:item?.itemId ? {kind:'shelf-apply',slotIndex:index,value:finishedWorkshopItem(draft)} : null;
  const locked = index===1 && isTwoHandedWeapon(normalizeBuild(s.document.targetBuild).gear.slots[0]?.itemId);
  const preview = edit && !locked && (embedded?s.picker.preview:previewSlotEdit(s.document,s.report,edit));
  if (locked) form+='<p>서브 무기를 장착하려면 양손 무기를 먼저 교체하거나 해제하세요.</p>';
  const equip = button('장착하고 보관','workshop-equip',edit&&!locked?'':'disabled');
  s.drawer.bar=drawerDps(s,preview?.comparison,equip,'',preview?.assumedComparison);
  const stats=report.componentProjection.rows.filter(r=>r.path.startsWith(`gear.slots.${index}.crafts.`));
  const card=stats.length?`<section class="craft-item-card" aria-label="제작 옵션 미리보기"><strong>${esc(title(item.itemId))}</strong>${stats.map(r=>`<p>${esc(r.detail||'한국어 원문 미제공')}</p>`).join('')}</section>`:'';
  if(embedded){
    const id=item.itemId, mods=gearCardLines({document:doc,report},id,index,{includeUnlabeled:false});
    const worn=s.document.targetBuild.gear?.slots?.[index]?.itemId;
    return `<section data-item-workshop class="candidate-workshop">
      <aside class="candidate-receipt" aria-label="후보 장비 카드"><header>${icon(id)}<h3>${esc(title(id))}</h3></header>
      ${gearEffectList(mods)}
      ${preview?renderSlotPreview(preview,esc,{showDps:false,extraDetails:renderGearSkillChanges(preview)}):''}
      ${worn&&worn!==id?equippedGearDetails(s,worn,index):''}${itemSource(id,build.ss14Inputs.gear[index])}</aside>
      ${form?`<div class="candidate-options">${form}</div>`:''}</section>`;
  }
  return `<section data-item-workshop class="memory-workbench"><div class="memory-fields">${form}</div><div class="memory-decisions">${card}${preview ? renderSlotPreview(preview,esc,{showDps:false,extraDetails:renderGearSkillChanges(preview)}) : ''}<details><summary>보관만</summary><label>보관할 이름<input type="text" data-workshop-name maxlength="100" value="${esc(draft.name)}" placeholder="아이템 이름 사용"></label>${button('보관함에 저장','workshop-store',edit?'':'disabled')}</details></div></section>`;
}
const boardTitles={talents:'재능',pact:'정령',divinity:'신격 석판'};
function homeBoards(s) {
  const build=s.document.targetBuild, trees=seasonTalentBoards(), spirits=seasonSpiritOptions();
  const heading=section=>`<h2>${button(boardTitles[section],'overview-board',`data-section="${section}" data-role="board-open-${section}" aria-label="${boardTitles[section]}" aria-haspopup="dialog"`)}</h2>`;
  const talentRows=Array.from({length:4},(_,i)=>{
    const board=build.talents?.boards?.[i],tree=trees.find(t=>t.id===board?.treeSlug);
    const name=tree?.name??'패널 선택',art=tree&&talentTreeIcon({slug:tree.id});
    const locked=i===1&&!build.talents?.boards?.[0]?.treeSlug&&!tree;
    const coreGroups=new Map();
    for(const node of (tree?boardTalentNodes(build,i):[])) {
      if(node.core&&(!coreGroups.has(node.required)||board.coreTalentIds?.includes(node.id)))coreGroups.set(node.required,node);
    }
    const panel=button(art?`<img src="${esc(art)}" alt="">`:'＋','talent-slot',`data-index="${i}" data-role="home-tree-${i}" aria-label="재능 패널 ${i+1} · ${esc(name)}" title="${esc(name)}"${locked?' disabled':''}`);
    const cores=tree?[...coreGroups.values()].map((node,n)=>{
      const equipped=board.coreTalentIds?.includes(node.id);
      const label=`패널 ${i+1} 핵심 재능 · ${node.required}포인트 · ${equipped?node.name:'선택'}`;
      return button(equipped?icon(node.id):'＋','talent-inspect',`data-index="${i}" data-id="${esc(node.id)}" data-role="home-core-${i}-${n}" aria-label="${esc(label)}" title="${esc(label)}"`);
    }).join(''):button('＋','talent-slot',`data-index="${i}" data-role="home-core-pick-${i}" aria-label="패널 ${i+1} 선택 후 핵심 재능 편집"${locked?' disabled':''}`);
    return `<div class="home-tree-row">${panel}${cores}<span>${esc(tree?.name??('패널 '+(i+1)))}</span></div>`;
  }).join('');
  const pactRows=Array.from({length:3},(_,i)=>{
    const slot=build.pact?.slots?.[i],o=selectedSeasonSpirit(slot?.spirit?.spiritId,spirits);
    const name=o?.name??(slot?.spirit?'한국어 이름 미제공':'미장착');
    const spirit=button(`<b>${o?icon(o.id):'＋'}</b><span>${esc(name)}</span>${o?`<small>Lv.${esc(slot.spirit.level)}</small>`:''}`,slot?.spirit?'pact-inspect':'pact-roster',`data-index="${i}" data-role="home-spirit-${i}" aria-label="정령 ${i+1} · ${esc(name)}"`);
    const rings=(o?.korean.parsed.rings??[]).map(r=>{
      return button(pactRingImage(r,slot.rings?.[r.slotId]?.installedDestiny,icon),'pact-inspect',`class="${pactNodeActive(slot,r.slotId)?'':'inactive'}" data-index="${i}" data-key="${esc(r.slotId)}" data-role="home-ring-${i}-${esc(r.slotId)}" aria-label="정령 ${i+1} · ${esc(r.name)} · ${esc(r.category)} ${esc(r.slotId.at(-1))}" title="${esc(r.name)}"`);
    }).join('');
    const extras=o?[['outer','외환 효과','◎'],['undetermined','미정 숙명','◇']].map(([key,label,mark])=>button(mark,'pact-inspect',`data-index="${i}" data-key="${key}" data-role="home-ring-${i}-${key}" aria-label="정령 ${i+1} ${label}" title="${label}"`)).join(''):'';
    return `<div class="home-spirit-row">${spirit}${o?`<div>${rings}${extras}</div>`:''}</div>`;
  }).join('');
  return `<nav class="overview-boards" aria-label="보드 편집"><section data-home-board="talents">${heading('talents')}${talentRows}</section><section data-home-board="divinity">${heading('divinity')}${renderSlateEditor({...s,slateEditor:null,boardOverview:true},{compact:true})}</section><section data-home-board="pact">${heading('pact')}${pactRows}</section></nav>`;
}
function boardScene(s){
  const helpers={button,esc,select,icon};
  if(s.section==='talents')return renderTalentScene(s,helpers);
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
    const placement=section==='talents'&&({prism:build.talents?.placedPrism,inverse:build.talents?.placedInverseImage})[row.itemId];
    const location=placement?`패널 ${placement.boardIndex+1} · ${placement.x+1}열 ${placement.y+1}행`:'';
    const value=[row.appliedDetail??row.detail,location||(section==='talents'?row.selectionCount+'포인트':''),level?level+'레벨':'',row.inactive?.length?'비활성':''].filter(Boolean).join(' · ');
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
    const comparison=draft.document===s.document?null:compareSeasonDpsSnapshots(s,draft);
    const assumedComparison=comparison&&!comparison.supported?compareSeasonDpsSnapshots(s,draft,'assumedDps'):null;
    return drawerDps(s,comparison,boardApply(s),'',assumedComparison);
  }
  const initial=s.overlay.initial;
  const comparison=initial&&initial.document!==s.document?compareSeasonDpsSnapshots(initial,s):null;
  const assumedComparison=comparison&&!comparison.supported?compareSeasonDpsSnapshots(initial,s,'assumedDps'):null;
  return drawerDps(s,comparison,button('편집 완료','close'),s.error?'입력 확인':s.pending.size?'입력 적용 대기':'',assumedComparison);
}
export function renderBoardComparison(s){
  const draft=s.overlay,section=draft.section;
  const after={...s,document:draft.document,report:draft.report,boardOverview:false,slateInspectorSeparated:section==='divinity'};
  if(draft.document===s.document)return '';
  const result=compareSeasonDpsSnapshots(s,after);
  const basis=result.supported?'fullDps':'assumedDps';
  const comparable=result.supported||compareSeasonDpsSnapshots(s,after,basis).supported;
  const labels={before:'적용 전',after:'적용 후'};
  const levels=renderSkillLevelChanges(compareSeasonSkillLevels(s.report,after.report),esc,labels);
  const breakdown=comparable?compareSeasonDamageBreakdown(s.report,after.report,basis):null;
  const dpsChanges=breakdown?renderDamageBreakdown({...breakdown,dpsBasis:basis},esc,labels)
    +renderDamageRouteChanges(breakdown.damageRoutes,labels):'';
  const dpsBasis=comparable?basis:'fullDps';
  const resources=compareSeasonResourceCosts(s.report,after.report,dpsBasis,{allActive:true});
  const beforeRows=boardOptions(s,section),afterRows=boardOptions(after,section);
  const changed=[];
  for(const key of new Set([...beforeRows.keys(),...afterRows.keys()])){
    const a=beforeRows.get(key),b=afterRows.get(key);
    if(a?.value===b?.value&&a?.name===b?.name&&a?.amounts===b?.amounts)continue;
    const scaled=a&&b&&a.amounts!==b.amounts&&a.value===b.value;
    const label=v=>v?(a&&b&&a.name!==b.name?v.name+' · ':'')+((scaled?v.amounts:v.value)||v.amounts||'없음'):'없음';
    changed.push(`<li><b>${esc(b?.name??a.name)}</b><div>${esc(label(a))} → ${esc(label(b))}</div></li>`);
  }
  const uniqueReasons=new Set(result.reasons.map(reason=>{
    const other=reason.replace(/^(기준|현재): /u,(_,side)=>side==='기준'?'현재: ':'기준: ');
    return other!==reason&&result.reasons.includes(other)?reason.slice(4):reason;
  }));
  const reasons=uniqueReasons.size?`<details data-role="board-dps-reasons"><summary>전체 DPS 보류 사유</summary><ul>${[...uniqueReasons].map(r=>'<li>'+esc(r)+'</li>').join('')}</ul></details>`:'';
  return `${changed.length?`<details data-role="board-option-changes" class="board-option-changes"><summary>변경 옵션 ${changed.length}개</summary><ul class="board-option-diff">${changed.join('')}</ul></details>`:''}${levels}${dpsChanges}${renderResourceChanges({...resources,dpsBasis},esc,{board:true})}${reasons}`;
}
function boardDrawer(s){
  const draft=s.overlay,section=draft.section;
  const after={...s,document:draft.document,report:draft.report,boardOverview:false,slateInspectorSeparated:section==='divinity',talentInspectorSeparated:section==='talents'};
  const fileTools=section==='divinity'?`${button('가져오기','files','title="전체 빌드 파일 가져오기"')}${button('내보내기','download-build','title="편집 중인 석판을 포함한 전체 빌드"')}${button('보관','shelf-save',`data-kind="divinity" data-index="0" title="현재 석판 배치 보관"${slateEditorBoard(draft.document.targetBuild).slateInventory.length?'':' disabled'}`)}${button('보관함','shelf-open','data-kind="divinity" data-index="0"')}`:'';
  return `<div class="season-native-backdrop gear-drawer-backdrop"><button class="gear-drawer-scrim" type="button" data-ss14-action="close" tabindex="-1" aria-label="편집창 닫기"></button>
    <section role="dialog" aria-modal="true" aria-label="${boardTitles[section]} 편집" class="season-native-modal gear-drawer board-drawer${section==='divinity'?' slate-drawer':section==='talents'?' talent-drawer':''}">
    <header><h2 data-role="board-heading" tabindex="-1">${boardTitles[section]} 편집</h2>${fileTools?`<div class="board-header-actions">${fileTools}</div>`:''}${button('닫기','close','aria-label="편집 닫기"')}</header>
    ${s.error?`<p role="alert">${esc(s.error)}</p>`:''}
    <div class="season-native-modal-body board-workbench"><div class="board-edit-fields">${boardScene(after)}</div>
    <aside class="board-comparison" aria-label="선택 항목">${section==='pact'&&s.pactRoster?renderPactRosterSelection(after,{button,esc,icon}):''}${section==='divinity'?renderSlateEditor(after,{inspectorOnly:true}):section==='talents'?renderTalentScene(after,{button,esc,icon},{inspectorOnly:true}):''}<div data-role="board-change-detail">${renderBoardComparison(s)}</div></aside></div>${renderDrawerBar(s)}</section></div>`;
}
function screenshotPanel(s) {
  const panel=s.overlay;
  const selected=panel.matches.find(row=>row.id===panel.selected);
  const targets=selected?seasonScreenshotTargets(s.document.targetBuild,selected):[];
  const groups=Object.entries(screenshotGroups).map(([id,label])=>{
    const rows=panel.matches.filter(row=>row.group===id);
    return rows.length?`<section><h3>${label}</h3><div>${rows.map(row=>button(esc(row.name),'screenshot-match',
      `data-id="${esc(row.id)}" data-role="screenshot-result-${esc(row.id)}" aria-pressed="${row===selected}"`)).join('')}</div></section>`:'';
  }).join('');
  const options=targets.map(row=>`<option value="${esc(row.id)}"${row.id===panel.target?' selected':''}>${esc(row.label)}</option>`).join('');
  const {region}=panel,reading=panel.status==='reading';
  const fields=[['x','왼쪽',0],['y','위쪽',0],['width','너비',1],['height','높이',1]];
  const percent=value=>Math.round(value*1000)/10;
  const preview=panel.previewUrl?`<div class="ss14-screenshot-preview" data-screenshot-preview><img src="${esc(panel.previewUrl)}" alt="스크린샷 미리보기" draggable="false"><span data-screenshot-frame aria-hidden="true"${region?'':' hidden'}${region?` style="left:${percent(region.x)}%;top:${percent(region.y)}%;width:${percent(region.width)}%;height:${percent(region.height)}%"`:''}></span></div>
    <div class="ss14-screenshot-target">${button('전체 다시 읽기','screenshot-read-full',reading?'disabled':'')}${button('영역 읽기','screenshot-read-region',reading||!region?'disabled':'')}${button('영역 지우기','screenshot-clear-region',reading||!region?'disabled':'')}</div>
    <details data-role="screenshot-region-fields"><summary>영역 좌표 (%)</summary><div class="ss14-screenshot-target">${fields.map(([key,label,value])=>`<label>${label}<input type="number" min="0" max="100" step="0.1" data-screenshot-region="${key}" value="${percent(region?.[key]??value)}"${reading?' disabled':''}></label>`).join('')}${button('좌표 적용','screenshot-apply-region',`data-role="screenshot-apply-region"${reading?' disabled':''}`)}</div></details>`:'';
  return `<section class="ss14-screenshot-panel"><label>스크린샷 파일<input type="file" aria-label="스크린샷 파일" data-screenshot-image accept="image/png,image/jpeg,image/webp,image/bmp,image/gif"></label>
    ${panel.file?`<small>${esc(panel.file.name)} · 드래그로 영역 선택</small>`:''}
    ${preview}${reading?'<p role="status">이미지 읽는 중…</p>':''}${panel.error?`<p role="alert">${esc(panel.error)}</p>`:''}
    ${panel.status==='done'&&panel.matches.length?`<h3>${panel.cropped?'영역':'전체'} 인식 결과</h3>`:''}
    ${panel.status==='done'&&!panel.matches.length?'<p>일치하는 SS14 이름이 없습니다.</p>':''}
    ${groups}${selected?`<div class="ss14-screenshot-target">${targets.length?`<label>대상 슬롯<select aria-label="대상 슬롯" data-screenshot-target data-role="screenshot-target"><option value="">선택</option>${options}</select></label>`:'<p>선택 가능한 슬롯이 없습니다.</p>'}</div>
    ${panel.gearValues?.length?`<fieldset class="ss14-screenshot-options"><legend>읽어낸 장비 옵션</legend>${panel.gearValues.map(row=>`<label><input type="checkbox" data-screenshot-gear-value="${esc(row.key)}"${panel.valueKeys.includes(row.key)?' checked':''}><span>${esc(row.label)}</span><strong>${row.value}${row.label.includes('%')?'%':''}</strong></label>`).join('')}</fieldset>`:''}
    ${panel.target&&Number.isInteger(panel.skillLevel)?`<div class="ss14-screenshot-options"><label><input type="checkbox" data-screenshot-skill-level${panel.acceptSkillLevel?' checked':''}><span>읽어낸 기본 레벨</span><strong>${panel.skillLevel}</strong></label></div>`:''}
    ${targets.length?button(selected.group==='memories'?'편집 열기':'적용','screenshot-apply',panel.target?'':'disabled'):''}`:''}
    ${panel.notice?`<p role="status">${esc(panel.notice)}</p>`:''}</section>`;
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
    const supportTier=Number.isInteger(s.supportIndex)?s.report.components.find(c=>c.category==='supports'&&c.id===id)
      ?.calculations?.find(c=>c.rowIndex===index&&c.supportIndex===s.supportIndex)?.tier:undefined;
    return `<div class="season-native-backdrop gear-drawer-backdrop"><button class="gear-drawer-scrim" type="button" data-ss14-action="close" tabindex="-1" aria-label="편집창 닫기"></button>
      <section role="dialog" aria-modal="true" aria-label="SS14 ${esc(name)}" class="season-native-modal gear-drawer slot-side-editor${skill?' skill-workspace':' workshop-workspace'}"><header><h2 data-role="${skill?'slot-detail-heading':'memory-drawer-heading'}" tabindex="-1">${esc(name)}${skill&&Number.isInteger(s.supportIndex)?' · 보조 '+(s.supportIndex+1):''}</h2>${button('닫기','close','aria-label="편집 닫기"')}</header>
      ${s.error?`<p role="alert">${esc(s.error)}</p>`:''}<div class="season-native-modal-body">${skill?`<div id="skill-selection-pane" class="skill-selection-pane"${s.overlay.boardOnly?' hidden':''}>${s.overlay.boardOnly?'':exclusiveSupportLinks(s,row)+slotEditor(s)+(id&&!s.picker?`<details class="editor-details"><summary>스킬 상세</summary>${itemSource(id,undefined,supportTier)}${renderEffectSources(s,'skills.rows.'+index+(s.supportIndex==null?'':'.supports.'+s.supportIndex))}</details>`:'')}</div>${skillLinkBoard(s,b.skills)}`:workshopView(s)}</div>${s.drawer.bar??renderDrawerBar(s)}</section></div>`;
  }
  if (type === "gear") {
    const index=s.overlay.index, id=normalizeBuild(s.document.targetBuild).gear.slots[index]?.itemId;
    const label=SEASON_GEAR_SLOT_LABELS[index], picking=!!s.picker || !id;
    return `<div class="season-native-backdrop gear-drawer-backdrop"><button class="gear-drawer-scrim" type="button" data-ss14-action="close" tabindex="-1" aria-label="장비창 닫기"></button>
      <section role="dialog" aria-modal="true" aria-label="${esc(label)} 장비 편집" class="season-native-modal gear-drawer equipment-drawer">
      <header><div><h2 data-role="gear-drawer-heading" tabindex="-1">${esc(label)}</h2>${id?`<small>${esc(title(id))}</small>`:''}</div><div class="gear-header-actions">${shelfTools("gear",index,!!id,button,!!s.picker?.candidate&&!!s.picker.draft)}${button("닫기","close",'aria-label="편집 닫기"')}</div></header>
      ${s.error?`<p role="alert">${esc(s.error)}</p>`:''}
      <div class="season-native-modal-body">${slotEditor(s)}
      ${id&&!picking?`<details class="native-slot-effects" data-role="gear-slot-details"><summary>장비 상세</summary>${itemSource(id,s.document.targetBuild.ss14Inputs.gear[index])}${renderEffectSources(s,`gear.slots.${index}`)}</details>`:''}
      </div>${s.drawer.bar??renderDrawerBar(s)}</section></div>`;
  }
  let content;
  if (type === "saves") content = [...s.documents].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(d => `<article class="native-save-row"><span><strong>${esc(d.targetBuild.name)}</strong>${d.id===s.document.id?' · 편집 중':''}<br><time datetime="${esc(d.updatedAt)}">${esc(formatAppDateTime(d.updatedAt))}</time></span>${button("열기", "open", `data-id="${esc(d.id)}" aria-label="${esc(d.targetBuild.name)} 열기"`)}</article>`).join("") || "저장된 SS14 빌드가 없습니다.";
  else if(type==="shelf") {
    const {kind,all,counts,query=''}=s.overlay,wearable=['gear','memory'].includes(kind);
    const labels={memory:'추억',gear:'장비',divinity:'신격 석판',prism:'프리즘'};
    const filters=all?`<nav class="shelf-categories" aria-label="보관함 분류">${Object.entries(labels).map(([key,name])=>button(name+' '+counts[key],'shelf-tab',`data-kind="${key}" data-role="shelf-tab-${key}" aria-pressed="${kind===key}"`)).join('')}</nav>`:'';
    const rows=s.shelfRows.map(v=>{
      let detail;
      if(kind==='gear')detail=[SEASON_GEAR_SLOT_LABELS[v.index],title(v.item.itemId),...gearFilters(v.item.itemId,v.index)].filter(Boolean);
      else if(kind==='memory')detail=[seasonMemoryOptions(v.index).name,memoryQuality(v.item.ss14Quality)?.name,'강화 +'+v.item.enhancement];
      else if(kind==='divinity')detail=['배치 '+new Set((v.item.cells??[]).map(cell=>cell.slateInstanceId).filter(Boolean)).size+'개'];
      else detail=['재능 패널 '+(v.index+1),v.item.name];
      const search=[v.name,...detail].filter(Boolean).join(' ').toLocaleLowerCase('ko');
      const visible=search.includes(query.trim().toLocaleLowerCase('ko'));
      const attrs=`data-id="${esc(v.id)}"`,selected=v.id===s.overlay.candidate;
      const meta=kind==='gear'?[detail[0],v.name!==detail[1]?detail[1]:'']:detail;
      return {visible,html:`<article class="shelf-record" data-shelf-record="${esc(search)}"${visible?'':' hidden'}>${button(`${kind==='gear'?icon(v.item.itemId):kind==='memory'?icon(seasonMemoryOptions(v.index).flatCatalogId):''}<span><strong>${esc(v.name)}</strong><small>${esc(meta.filter(Boolean).join(' · '))}</small></span>`,'shelf-preview',`${attrs} aria-pressed="${selected}" aria-label="${esc(v.name)} 선택"`)}</article>`};
    });
    const searchLabel=labels[kind]+' 검색';
    const selected=s.shelfRows.find(v=>v.id===s.overlay.candidate),attrs=selected?`data-id="${esc(selected.id)}"`:'';
    const detail=selected?`<h3>${esc(selected.name)}</h3>${shelfCandidateDetails(s,selected,s.overlay.candidateIndex)}${renderSlotPreview(s.overlay.preview,esc)}${renderGearSkillChanges(s.overlay.preview)}<div class="shelf-candidate-actions">${button(wearable?'장착':'편집창에 적용','shelf-use',attrs)}<details><summary>관리</summary>${button('보관 해제','shelf-remove',attrs)}</details></div>`:'<span class="shelf-no-selection">아이템 선택</span>';
    content=`<div class="shelf-toolbar">${filters}<input type="search" data-shelf-search aria-label="${searchLabel}" placeholder="${searchLabel}" value="${esc(query)}"></div><div class="shelf-workbench"><div class="shelf-records" aria-label="보관한 ${labels[kind]}">${rows.map(row=>row.html).join('')}<p data-shelf-empty${rows.some(row=>row.visible)?' hidden':''}>${rows.length?'검색 결과 없음':'보관한 '+labels[kind]+' 없음'}</p>${wearable&&!all?button(kind==='gear'?'새 장비 제작':'새 추억 제작','workshop-open'):''}</div><aside class="shelf-candidate" aria-label="선택한 보관 항목" data-role="shelf-candidate" tabindex="-1">${detail}</aside></div>`;
  }
  else if (type === 'reset-build') content='<p>현재 구성을 비웁니다. 장비·추억은 보관함에 남고 저장된 빌드는 유지됩니다.</p>';
  else if (type === "files") {
    const board=s.overlay.boardDraft,doc=board?.document??s.document;
    const pending=s.overlay.pendingImport;
    const export91=button(s.overlay.exporting91?'91TOB 확인 중…':'91TOB 파일로 저장','download-91-file',s.overlay.exporting91?'disabled':'');
    const filePicker=export91+(!board&&!isOfflineEdition()?button('스크린샷 가져오기','open-screenshot-import'):'')
      +(!board&&canLookUpIngameBuild()?button('인게임 빌드코드 조회','open-ingame-code'):'')+'<label>빌드 JSON 열기 <small>TOB · 91TOB</small><input type="file" accept=".json,application/json" aria-label="빌드 JSON 열기" data-build-file></label>';
    content = pending?`<section aria-label="석판 변경 확인"><h3>미적용 석판 변경</h3><p>${esc(pending.targetBuild.name)} 빌드를 열기 전에 현재 변경을 선택하세요.</p><div class="board-import-actions">${button('석판 적용 후 열기','board-import-apply')}${button('석판 변경 버리고 열기','board-import-discard')}${button('석판 편집으로','close')}</div></section>`
    : `${board?'':`${button("사본 저장", "copy")}${RUNTIME_POLICY.allowGameLogs ? button("게임 로그 가져오기", "local-log") : `<details><summary>게임 로그 가져오기 안내</summary><p>${esc(LOCAL_LOG_ONLY_MESSAGE)}</p></details>`}`}${button("JSON 파일로 저장","download-build")}${filePicker}<details><summary>JSON 텍스트로 옮기기</summary><label>TOB SS14 빌드 내보내기<textarea readonly aria-label="TOB SS14 빌드 내보내기">${esc(exportSeasonWorkspace(doc))}</textarea></label><label>TOB SS14 빌드 가져오기<textarea id="native-import" aria-label="TOB SS14 빌드 가져오기"></textarea></label>${button("가져오기", "import")}</details>${board?button('석판 편집으로','close'):'<details><summary>이전 시즌 보관함</summary><button type="button" data-action="open-preserved-build">이전 시즌 빌드 열기</button></details>'}`;
  }
  else if (type === "share") content = `<div class="build-share-panel"><label>공유 링크<input type="text" id="share-link" aria-label="공유 링크" readonly value="${esc(s.overlay.link)}" /></label>${button("공유 링크 복사","copy-link",s.overlay.link?"":"disabled")}<p>받은 사람이 링크를 열면 이 빌드의 사본이 열립니다.</p><p id="share-status" role="status">${esc(s.overlay.message)}</p></div>
    <details data-role="share-code-tools"><summary>빌드 코드로 공유하거나 가져오기</summary><label>내 빌드 코드<textarea id="share-code" readonly spellcheck="false" aria-label="내 빌드 코드">${esc(s.overlay.code)}</textarea></label>${button("코드 복사","copy-code",s.overlay.code?"":"disabled")}<label>받은 빌드 코드<textarea id="share-paste" spellcheck="false" placeholder="TOB14-1.…" aria-label="받은 빌드 코드">${esc(s.overlay.paste)}</textarea></label>${button("새 사본으로 열기","import-code")}</details>`;
  else if (type === 'ingame-code') {
    const {code,result,preview,busy}=s.overlay;
    const rows=preview?.rows.map(row=>`<li>${esc(row.label)} · ${row.reason?esc(row.reason):`${esc(row.name)}${row.level?` Lv.${row.level}`:''}${(row.supports??[]).map(s=>` · ${esc(s.name)} Lv.${s.level}`).join('')}${row.rollCount?` · 옵션 수치 ${row.rollCount}개`:''}`}</li>`).join('');
    content=`<label>인게임 빌드코드<input type="text" id="ingame-build-code" maxlength="2048" autocomplete="off" spellcheck="false" value="${esc(code)}" ${busy?'disabled':''}></label>
      <small>조회 버튼을 누르면 코드만 미니토치 변환기로 보냅니다.</small>${button(busy?'조회 중…':'조회','look-up-ingame-code',busy?'disabled':'')}
      ${result?`<section aria-label="조회 결과"><strong>${esc(result.title||'인게임 빌드')}</strong><p>${[result.season||'시즌 확인 필요',result.main].filter(Boolean).map(esc).join(' · ')}</p>
        ${preview?.reason?`<p>${esc(preview.reason)}</p>`:''}${rows?`<ul>${rows}</ul>`:''}
        ${preview?.document?`<p>위에서 확인된 항목을 사본에 넣습니다. 캐릭터 레벨과 전투 조건은 사본에서 확인하세요.</p>${button('확인된 항목을 새 사본으로 열기','apply-ingame-build')}`:''}</section>`:''}`;
  }
  else if (type === "local-log") content = localLogPanel(s);
  else if (type==='screenshot') content=screenshotPanel(s);
  else if (type === "effects") content = renderEffectSources(s);
  else content = slotEditor(s);
  if(type==="memory")content=shelfTools("memory",s.overlay.index,!!s.document.targetBuild.hero?.memories?.[s.overlay.index],button)+content;
  const titles = { 'reset-build':'빌드 초기화', shelf:"보관함", share: "빌드 공유", saves: "저장 빌드", files: "빌드 파일", screenshot:'스크린샷 가져오기', "local-log": "게임 로그 가져오기", effects: "효과별 출처", hero: "히어로 선택", traits: "히어로 특성", memory: "히어로 추억", talents: "재능 편집", pact: "정령 편집", extensions: "영약·모듈화" };
  const heading = type==='workshop'?(s.overlay.kind==='gear'?'장비 제작':'추억 제작'):type==='memory'?seasonMemoryOptions(s.overlay.index).name:type==='ingame-code'?'인게임 빌드코드 조회':titles[type] ?? "빌드 편집";
  const footer = type==='extensions' ? renderDrawerBar(s) : `<footer>${type==='reset-build'?button('초기화','confirm-reset-build')+button('취소','close'):`${!["workshop","shelf","share","local-log", "files", "saves", "effects", "hero", "screenshot", "ingame-code"].includes(type) ? button("적용", "apply") : ""}${button("닫기", "close")}`}</footer>`;
  return `<div class="season-native-backdrop"><section role="dialog" aria-modal="true" aria-label="SS14 ${heading}" class="season-native-modal${['files','reset-build','screenshot'].includes(type)?' file-transfer-modal':''}${type==='extensions'?' extension-workspace':''}"><header><h2 tabindex="-1" data-role="dialog-heading">${heading}</h2>${button("닫기", "close", 'aria-label="편집 닫기"')}</header>${s.error ? `<p role="alert">${esc(s.error)}</p>` : ""}<div class="season-native-modal-body">${content}</div>${footer}</section></div>`;
}
export function renderNativeDps(s) {
  const dps = s.report.fullDps;
  const active = s.resultTab ?? 'stats';
  const showEstimate = s.report.assumedDps?.supported && !dps.supported && !s.pending.size;
  const hasSkill = s.report.components.some(component=>component.category==='skills');
  const blockedStatus = !hasSkill ? '스킬 미장착' : seasonDpsStatusLabel(s.report) === '입력 필요' ? '입력 필요' : '계산 보류';
  const status = s.pending.size ? '입력 적용 대기' : dps.supported ? dps.dps.toLocaleString('ko-KR', { maximumFractionDigits:2 }) : blockedStatus;
  const dpsLink = hasSkill && !dps.supported && !showEstimate && !s.pending.size && active !== 'calculation'
    ? button(blockedStatus === '입력 필요' ? '입력 항목 보기' : '보류 이유 보기', 'result-tab', 'data-tab="calculation" data-show-dps="true"') : '';
  const panels = {
    stats: () => `<div data-role="native-numeric-result"${s.pending.size ? ' hidden' : ''}>${renderSeasonNumericStats(s.report)}</div>`,
    calculation: () => {
      const skill = renderSkillCalculation(s);
      const requirements = dps.supported ? '' : renderDpsRequirements(s);
      const breakdown = (showEstimate ? s.report.assumedDps.rows : dps.rows).length ? dpsResults(s.report, { embedded: true }) : '';
      return `<div data-role="native-calculation-detail"${s.pending.size ? ' hidden' : ''}>${s.showDpsNotes ? requirements+skill : skill+requirements}${breakdown}${renderCalculationNotes(s)}</div>`;
    },
    conditions: () => renderResultConditions(s),
    analysis: () => renderResultAnalysis(s),
  };
  return `<aside class="native-dps-dock" id="native-dps-summary" tabindex="-1" aria-label="SS14 계산 결과">
    ${mobileDpsBar(s)}
    <div class="native-result-summary">${showEstimate ? renderAssumedDps(s, true) : ''}<small${showEstimate ? ' hidden' : ''}>전체 DPS</small><strong data-role="native-dps"${showEstimate ? ' hidden' : ''}>${status}</strong>
    ${renderEditDpsComparison(s, true)}
    ${dpsLink}
    ${s.pending.size ? `<div class="native-result-actions">${button('계산 적용', 'apply')}</div>` : ''}</div>
    <nav class="native-result-tabs" aria-label="계산 결과 보기">${RESULT_TABS.map(([key,label]) => button(label, 'result-tab', `data-tab="${key}" data-role="result-tab-${key}" aria-pressed="${active === key}" aria-controls="native-result-panel"`)).join('')}</nav>
    <section id="native-result-panel" class="native-result-panel" aria-label="${RESULT_TABS.find(([key]) => key === active)?.[1] ?? '수치'}">${(panels[active] ?? panels.stats)()}</section></aside>`;
}
function renderDpsRequirements(s) {
  const blockers=s.report.fullDps.blockers;
  const estimate=s.report.assumedDps;
  const exactReasons=new Set(blockers);
  const estimateReasons=estimate?.supported===false?estimate.blockers.filter(reason=>!exactReasons.has(reason)):[];
  return blockers.length || estimateReasons.length ? `<details class="native-calculation-notes" data-role="calculation-requirements"${s.showDpsNotes?' open':''}><summary>전체 DPS 보류 이유</summary>
    <div class="native-requirements" data-role="numeric-dps-requirements" aria-label="계산에 필요한 입력">${renderReasons(s,blockers)}
    ${estimateReasons.length?`<section data-role="assumed-dps-reasons" aria-label="방어 전 DPS 보류 이유"><h3>방어 전 DPS</h3>${renderReasons(s,estimateReasons,estimate)}</section>`:''}</div></details>` : '';
}
function renderCalculationNotes(s) {
  const dps=s.report.fullDps;
  return `<details class="native-calculation-notes" data-role="calculation-notes"><summary>계산 상세</summary>
    ${s.report.assumedDps && dps.supported ? renderAssumedDps(s) : ''}
    ${s.report.assumedDps ? renderAssumedDpsDetails(s) : ''}
    ${renderObservedElixirUptime(s)}
    ${renderNumbedCalculation(s)}
    ${dps.burstRecovery?`<details><summary>크리에이티브 대폭발 · 기발 회복</summary><p>${dps.burstRecovery.total!==null?`기발 회복 ${dps.burstRecovery.total} (상한 적용 전)`:dps.burstRecovery.rows.length?'회복 미확정 · 전투 조건에서 발동별 결과 확인':'전투 조건에서 매직 버스트 발동 기록 입력'}</p></details>`:''}
    <details data-role="native-effect-detail"><summary>근거·지원 범위</summary>${button('효과별 출처', 'effect-sources')}${button('특성 지원표', 'section', 'data-section="support-matrix"')}
      <details><summary>카드별 검증 내역</summary>${componentResults(s.report)}</details>
      <details data-role="native-defense-detail"><summary>자원·방어 계산 근거</summary>${characterResults(s.report)}</details></details></details>`;
}
function renderObservedElixirUptime(s) {
  const assumed=!s.report.fullDps.supported&&s.report.assumedDps?.supported;
  const uptime=assumed?s.report.assumedDps.elixirUptime:s.report.elixirUptime;
  if(!uptime?.supported)return '';
  const fmt=value=>value.toLocaleString('ko-KR',{maximumFractionDigits:2});
  const mp=value=>Number.isFinite(value)?fmt(value):'확인 필요';
  const basis=assumed?'방어 전 DPS':'전체 DPS';
  const result=assumed?s.report.assumedDps:s.report.fullDps;
  return `<details data-role="observed-elixir-uptime"><summary>영약 유지율 · ${basis}</summary>
    <ul>${uptime.rows.map(row=>`<li>${esc(row.name)} · ${fmt(row.uptime)}%</li>`).join('')}</ul>
    <table class="slot-dps-table" aria-label="영약 상태별 DPS 기여와 MP"><thead><tr><th scope="col">활성 영약</th><th scope="col">시간 비율</th><th scope="col">상태 DPS</th><th scope="col">반영 DPS</th><th scope="col">MP/초</th></tr></thead>
      <tbody>${uptime.states.map(row=>`<tr><th scope="row">${row.active.map((on,i)=>on?esc(uptime.rows[i].name):'').filter(Boolean).join(' · ')||'없음'}</th><td>${fmt(row.uptime)}%</td><td>${fmt(row.dps)}</td><td>${fmt(row.weightedDps)}</td><td>${mp(row.manaPerSecond)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><th scope="row" colspan="3">${basis}</th><td>${fmt(result.dps)}</td><td>${mp(result.manualResources?.manaPerSecond)}</td></tr></tfoot></table>
    ${button('영약 조건 편집','requirement','data-section="combat" data-focus-role="native-extension-input"')}</details>`;
}
function renderAssumedDps(s, primary = false) {
  const estimate=s.report.assumedDps;
  const fmt=n=>n.toLocaleString('ko-KR',{maximumFractionDigits:2});
  return `<div class="native-assumed-line${primary?' is-primary':''}"><span>${SEASON_ADVISOR_METRICS.assumedDps}</span><strong data-role="assumed-dps">${s.pending.size?'입력 적용 대기':estimate.supported?fmt(estimate.dps):'확인 필요'}</strong></div>`;
}
function renderAssumedDpsDetails(s) {
  const estimate=s.report.assumedDps;
  const fmt=value=>value.toLocaleString('ko-KR',{maximumFractionDigits:2});
  return `${!s.pending.size?`<details data-role="native-uptime-details"><summary>가동률과 DPS 적용 내역</summary>
      <p>적 아머·저항·관통 제외${estimate.defaults.length?' · '+esc(estimate.defaults.join(' · ')):''}</p>
      ${estimate.uptimeDetails?.length?`<ul>${estimate.uptimeDetails.map(row=>{
        const amounts=[['입력 조건',row.inputContribution],['방어 전',row.contribution]]
          .filter(([,value])=>Number.isFinite(value)).map(([label,value])=>`${label} ${fmt(value)} DPS`);
        return `<li><b>${esc(row.name)}</b><br>${row.setting===row.assumed?`적용 ${esc(row.assumed)}`:`입력 ${esc(row.setting)} → 방어 전 ${esc(row.assumed)}`}${amounts.length?`<br>${amounts.join(' · ')}`:''}<br>${esc(row.method)}</li>`;
      }).join('')}</ul>`:''}
      ${button('전투 조건 보기','result-tab','data-tab="conditions"')}</details>`:''}`;
}
export function nativeSaveStatus(s) {
  return s.draftError||s.notice||(s.dirty?(s.draftSaved?'임시 저장됨':'저장하지 않은 변경'):s.document.revision?'저장됨':'새 SS14 사본');
}
export function renderSeasonPlanner(s) {
  if (!s.document) return `<main class="season-native"><h1>TOB · SS14</h1><p role="alert">${esc(s.error)}</p><button data-action="open-preserved-build">이전 시즌 빌드 열기</button></main>`;
  // Keep the build overview behind slot editors; their internal section still
  // selects the correct controls and calculation paths.
  const scene=s.fromOverview&&s.overlay?{...s,section:'overview'}:s;
  const hasPanelHeading = ['overview', 'hero', 'skills', 'gear'].includes(scene.section);
  const body = scene.section === "overview" ? `<div class="build-overview">${heroPanel(scene)}${equipmentPanel(scene,'skills')}${equipmentPanel(scene,'gear')}${homeBoards(scene)}</div>` : s.section === "hero" ? heroPanel(s) : ["skills", "gear"].includes(s.section) ? equipmentPanel(s, s.section)
    : boardTitles[s.section] ? boardOverview(s) : s.section==='support-matrix'?renderSeasonSupportMatrix(s):combatPanel(s);
  return `<div class="season-native" data-role="ss14-main-editor"><header class="planner-header"${s.overlay?' inert':''}><strong class="native-brand">TOB <small>SS14</small></strong><label class="build-chip"><input id="ss14BuildName" aria-label="빌드 이름" data-season-edit="name" value="${esc(s.document.targetBuild.name)}" maxlength="160" /></label>${renderEditHistory(s)}<div class="header-primary-actions">${button("저장", "save")}${button("불러오기", "saves", 'data-role="open-saves"')}${button("공유", "share", 'data-role="open-share"')}${button("빌드 파일", "files", 'data-role="open-files"')}${button('초기화','reset-build','data-role="reset-build" aria-label="빌드 초기화"')}</div><span role="status" data-role="native-save-status">${esc(nativeSaveStatus(s))}</span></header>
    <nav class="quick-category-menu${s.navCollapsed?' is-folded':''}"${s.overlay?' inert':''} aria-label="빌드 편집 메뉴">${button(s.navCollapsed?'☰':'‹','toggle-navigation',`class="nav-toggle" data-role="nav-toggle" aria-label="메뉴 ${s.navCollapsed?'펼치기':'접기'}" aria-expanded="${!s.navCollapsed}"`)}${tabs.filter(([id])=>id!=='support-matrix').map(([id, label]) => button(label, "section", `data-section="${id}" aria-pressed="${scene.section === id}"`)).join("")}</nav>
    <div class="native-content"${s.overlay?' inert':''}><main class="season-native-scroll"><section class="planner-section ${scene.section === "hero" ? "hero-section" : ""}"><h1${hasPanelHeading?' class="panel-heading-accessible"':''}>${esc(tabs.find(([id]) => id === scene.section)?.[1])}</h1>${s.error&&s.overlay?.type!=='board' ? `<p role="alert">${esc(s.error)}</p>` : ""}${body}</section></main>
    ${renderNativeDps(s)}</div>
    ${overlay(s)}</div>`;
}
