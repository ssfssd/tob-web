import { normalizeBuild } from "./engine.js";
import { SEASON_DAMAGE_TYPE_LABELS } from './seasonDps.js';
import { findItemById } from "./catalog.js";
import { getIngameHeroArt } from "./ingameHeroArt.js";
import { talentTreeIcon, seasonGearCardIcon } from "./ingameUiAssets.js";
import { renderTalentScene, renderPactScene, pactRingImage, boardTalentNodes } from "./seasonBoardScenes.js";
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
import { memoryTraitTier, seasonMemoryRows } from './seasonMemories.js';
import { finishedWorkshopItem, workshopMemoryNeedsQuality } from './seasonItemWorkshop.js';
import { getSeasonPickerOptions, getSeasonSelectionOptions, SEASON_GEAR_SLOT_LABELS, isTwoHandedWeapon } from "./seasonSelections.js";
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { getSkillEnergyUsage, SUPPORT_SLOT_ENERGY_COSTS, PASSIVE_SUPPORT_SLOT_ENERGY_COSTS } from "./skillRuntimeModel.js";
import { formatAppDateTime } from "./dateTimePresentation.js";
import { seasonExclusiveSupportSlots, seasonSupportOptions, seasonSupportItem, seasonSupportKoreanCard, seasonSupportGrade, seasonSupportRequiredSlot, supportFitsSocket } from "./seasonSupport.js";
import { seasonDestinyOptions, pactNodeActive, pactRingDisplayName } from './seasonDestiny.js';
import { activeSkillExtension, nativeElixirOptions, nativeModuleOptions, nativeModuleAffixes } from "./seasonNativeExtensions.js";
import { seasonElixirIngredientOptions } from './seasonElixirIngredients.js';
import { compareSeasonPartialDps, seasonDpsStatusLabel, seasonPartialDpsReview } from './seasonCalculationIssues.js';
import { seasonEffectSources, effectSourceLabel, effectSourceEditor } from "./seasonEffectSources.js";
import { exportSeasonWorkspace, seasonSkillSwapIssue, seasonSupportSwapAllowed } from "./seasonWorkspace.js";
import { previewLogGearOptions } from "./localGameLogImport.js";
import { renderSeasonNumericStats } from "./seasonNumericStatsView.js";
import { seasonStatLabel } from './seasonNumericStats.js';
import { compareSeasonDamageBreakdown, compareSeasonResourceCosts, compareSeasonSkillLevels, gearFilters, previewSlotEdit } from './seasonGearPicker.js';
import { seasonSkillCalculationLevel, seasonSkillLevelState, seasonSkillSlotCalculation } from './seasonSkillLevels.js';
import { auraActivationControl } from './seasonNetherModifiers.js';
import { craftFamilySlots, craftOptions, itemGearKind } from './seasonItemCraft.js';
import { corrosionCard, corrosionOptions,corrosionBasePool } from './seasonCorrosion.js';
import { calculateSeasonBuild, seasonGearSlotRollEntry } from './seasonBuild.js';
import { parseSeasonComponentLines } from './seasonComponents.js';
import { seasonExtensionRows } from './seasonExtensions.js';
import { renderReasons } from './seasonResultPanels.js';
import { renderDamageBreakdown, renderResourceChanges, renderSkillLevelChanges, renderSlotPreview, shelfTools, mobileDpsBar, plannerSearchKey, pickerSearchMatcher, BOARD_TITLES, renderBoardOptionChanges } from './seasonEditorTools.js';
import { renderSlateEditor,slateEditorBoard,slatePreviewOffsets } from './seasonSlateEditor.js';
import { regularSlateFamilies,seasonSlateOptionSource,season91SlateExportIssue } from './seasonDivinity.js';
import { nativeSlateOptions } from './seasonNativeDivinity.js';
import { compareSeasonDpsSnapshots, SEASON_ADVISOR_METRICS } from './seasonAdvisor.js';
import { RESULT_TABS, renderResultConditions, renderResultAnalysis, renderEditDpsComparison, renderNumbedCalculation, renderSkillCalculation, renderSkillConversion, renderElixirDamageRoutes, renderWeaponDamageRoutes, renderSkillElixirDps, renderDamageRouteChanges, renderRemovedSkillSupports, selectedSkillInputIssues } from './seasonResultPanels.js';
import {renderSeasonSupportMatrix} from './seasonSupportMatrix.js';
import {describeSeasonPrism} from './seasonPrismPlacement.js';
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
  const src = item?.localIconPath || ss14GearIcons[id] || seasonGearCardIcon(id) || item?.iconUrl || current || nativeElixirOptions().find(o => o.itemId === id)?.iconUrl;
  const relative = src?.startsWith('/assets/') ? '.' + src : src;
  const fallback = id ? esc(title(id).slice(0,2)) : '＋';
  return relative && /^(?:\.?\/?assets\/|https:\/\/cdn\.tlidb\.com\/)/u.test(relative)
    ? `<img src="${esc(relative)}" alt="" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false" /><span aria-hidden="true" hidden>${fallback}</span>`
    : `<span aria-hidden="true">${fallback}</span>`;
};
const button = (text, action, attrs = "") => `<button type="button" data-ss14-action="${action}" ${attrs}>${text}</button>`;
const field = (label, kind, value, attrs = "") => `<label>${esc(label)}<input type="number" data-season-edit="${kind}" value="${esc(value)}" ${attrs} /></label>`;
const select = (label, id, kind, value, options, attrs = "", search = false) => `${search ? `<label>이름 검색<input type="search" data-season-filter="${id}" aria-label="${esc(label)} 이름 검색" /></label>` : ""}<label>${esc(label)}<select id="${id}" aria-label="${esc(label)}" data-season-edit="${kind}" ${attrs}><option value="">${kind === "hero-choice" ? "미정" : "선택 안 함"}</option>${value && !options.some(o => String(o.id) === String(value)) ? `<option value="${esc(value)}" selected>이전 선택 보존 · SS14 원문 미확보</option>` : ""}${options.map(o => `<option value="${esc(o.id)}"${String(o.id) === String(value) ? " selected" : ""}${o.searchText?` data-search-text="${esc(o.searchText)}"`:''}>${esc(o.name)}</option>`).join("")}</select></label>`;
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
    <div class="hunter-controls">${field("레벨", "hero-level", b.heroLevel ?? 90, 'min="1" max="100" step="1" aria-label="히어로 레벨"')}${button(hero ? "히어로 변경" : "히어로 선택", "edit-slot", 'data-type="hero" data-role="hero-picker-open"')}</div></div></div>
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
  const level = seasonSkillLevelState(entry).level ?? fallbackLevel;
  const baseLevel = support ? seasonSupportItem(id)?.tlidbText.en.cardLevel ?? 20 : 20;
  const exact = source && card?.season === 'SS14' && card.koreanTextVerified && card.sourceUrl === source.url
    && !(entry?.tier != null && card.supportTiers?.length)
    ? source.groups.find(([, levels]) => levels.includes(level)) : null;
  if (exact) {
    const detail = exact[0].split(',').map(index => source.lines[Number(index)]).join('\n');
    return `<small>Lv.${level} 원문</small><p>${esc(presentGameText(detail))}</p>`;
  }
  if (!card?.koreanTextVerified) return skillCardText(card);
  const tierDetail = entry?.tier != null && card.supportTiers?.length ? seasonKoreanCardDetail(card,entry.tier) : '';
  const reference = tierDetail ? `<p>${esc(tierDetail)}</p>` : skillCardText(card);
  if (level === baseLevel) return `<small>Lv.${baseLevel} 원문</small>${reference}`;
  return `<small>Lv.${level} 한국어 원문 미제공</small><details data-role="skill-level-reference"><summary>Lv.${baseLevel} 참고 원문</summary>${reference}</details>`;
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
  minion_physical_damage_to_erosion_damage:"소환체 물리 → 부식 전환",
  minion_physical_damage_as_erosion_damage:"소환체 물리 → 부식 추가 획득",
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
function addedDamageSourceStat(stat) {
  const match=/^(?:(?:spell|attack)_(physical|fire|cold|lightning|erosion)_damage_|supported-skill-added-(physical|fire|cold|lightning|erosion)-damage-)(min|max)$/u.exec(stat);
  if(!match)return undefined;
  return `${match[3]==='min'?'최소':'최대'} ${SEASON_DAMAGE_TYPE_LABELS[match[1]??match[2]]} 추가 대미지`;
}
export function renderEffectSources(s, path = null) {
  const rows = seasonEffectSources(s.report).filter(r => !path || r.path === path);
  const {query='',status:filter='',selectedKey}=s.overlay?.type==='effects'?s.overlay:{};
  const status = { direct: "직접 대미지 반영", selected: "선택 수치", inactive: "조건 미충족", "not-applicable":"해당 없음", blocked: "확인 필요", mechanic: "특수 효과 규칙" };
  const phasedRoutes=s.report.fullDps?.rows.some(row=>row.supported&&row.elixirDamageRoutes?.states.length);
  return `<section class="native-effect-sources" aria-label="선택 효과별 출처">
    ${!path ? `<label>효과·출처 검색<input type="search" data-effect-filter data-role="effect-filter" aria-label="효과·출처 검색" value="${esc(query)}" /></label><label>표시 상태<select data-effect-status><option value="">전체</option>${Object.entries(status).map(([k,v]) => `<option value="${k}"${k===filter?' selected':''}>${v}</option>`).join("")}</select></label>` : ""}
    ${s.report.theaAverage ? `<p>${phasedRoutes?'전환·추가 획득은 계산한 영약 구간을 반영합니다. 그 외 수치는 전투 시작 상태입니다.':'아래 수치는 전투 시작 상태입니다.'} 전체 DPS는 선택한 시간 동안의 평균입니다.</p>` : ""}
    <div class="native-effect-list">${rows.map(r => {
      const stat = r.effect?.stat ?? '', normalized=stat.replace(/^skill-/u,'').replaceAll('-','_');
      const label = sourceStats[stat] ?? sourceStats[normalized] ?? addedDamageSourceStat(stat)
        ?? seasonStatLabel(stat,r.group) ?? seasonStatLabel(normalized,r.group)
        ?? (r.status === 'mechanic' ? '발동·특수 효과' : r.status === 'blocked' ? '미확인 효과' : '효과 이름 미제공');
      const percent = r.effect?.unit === "percent" || ["more", "add_percent"].includes(r.effect?.operation);
      const value = r.value === null ? "" : `${r.value.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}${percent ? "%" : ""}${r.effect?.operation === "more" ? " 별도" : ""}`;
      const owner=r.name===r.origin?r.origin:r.origin+' · '+(r.name||'한국어 이름 미제공');
      const links=r.sourceConflict?.filter(source=>/^https:\/\/tlidb\.com\/(?:en|ko)\//u.test(source.url))
        .map(source=>`<a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.language)} 원문</a>`).join(' · ');
      const editor=!path&&effectSourceEditor(r.path)?button('슬롯 편집','edit-effect-source',`data-source-path="${esc(r.path)}" data-source-key="${esc(r.key)}" aria-label="${esc(owner)} 슬롯 편집"`):'';
      return `<details class="native-effect-row" data-effect-state="${r.status}" data-role="effect-${esc(r.key)}"${r.key===selectedKey?' open':''}><summary><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${status[r.status]}</small><span class="native-effect-summary-owner">${esc(owner)}</span></summary>
        ${r.appliedTo?.length ? `<p>적용 스킬: ${esc(r.appliedTo.join(", "))}</p>` : ""}
        ${r.reason ? `<p>${/[가-힣]/u.test(r.reason) && !/\p{Script=Han}/u.test(r.reason) ? esc(r.reason) : "SS14 효과 또는 조건을 확인해야 합니다."}</p>` : ""}
        ${r.detail ? `<p class="native-effect-original">${r.group==='custom'?'입력값 · ':''}${esc(r.detail)}</p>` : "<p>한국어 원문 일부 미제공</p>"}
        ${links || (/^https:\/\/tlidb\.com\/(?:en|ko)\//u.test(r.receipt?.sourceUrl ?? "") ? `<a href="${esc(r.receipt.sourceUrl)}" target="_blank" rel="noreferrer">SS14 원문 보기</a>` : "")}${editor}</details>`;
    }).join("") || "<p>이 슬롯에서 확인된 효과가 없습니다.</p>"}</div></section>`;
}
function renderBuildSlotPreview(s, preview, options) {
  return renderSlotPreview(preview,esc,{...options,partialConfirmation:s.pending?.size?null:s.partialDpsConfirmation});
}
function drawerDps(s, comparison, action, {status='',assumedComparison,energyChange,traitChange,partialComparison,skillSpeedChanges,afterLabel='현재 DPS · 전투 조건 변경'}={}) {
  const format=n=>Number.isFinite(n)?n.toLocaleString('ko-KR',{maximumFractionDigits:2}):'미확정';
  const current=s.report.fullDps.supported?s.report.fullDps.dps:null;
  const estimate=s.report.assumedDps?.supported?s.report.assumedDps.dps:null;
  const review=!comparison&&!status&&!s.pending?.size?seasonPartialDpsReview(s.document,s.report):null;
  const partialCandidate=partialComparison??review;
  const partial=!status&&!s.pending?.size&&partialCandidate?.confirmation===s.partialDpsConfirmation?partialCandidate:null;
  const compareAssumed=!comparison?.supported&&assumedComparison?.supported;
  const showEstimate=!comparison&&current===null&&Number.isFinite(estimate);
  const hasComparisonValue=Number.isFinite(comparison?.baseValue)||Number.isFinite(comparison?.value);
  const changedEncounter=comparison?.encounterMatches===false;
  const hasDelta=comparison?.supported&&Math.abs(comparison.delta)>=.005;
  const unchanged=comparison?.supported&&!hasDelta&&format(comparison.baseValue)===format(comparison.value);
  const label=partial?'부분 DPS · 미지원 제외':compareAssumed||showEstimate?SEASON_ADVISOR_METRICS.assumedDps:changedEncounter?afterLabel:'전체 DPS';
  let values=format(showEstimate?estimate:current);
  if(partial){
    const before=format(partial.baseValue),after=format(partial.value??partial.dps);
    values=Number.isFinite(partial.baseValue)&&before!==after?`${before} → ${after}`:after;
  }else if(compareAssumed){
    const before=format(assumedComparison.baseValue),after=format(assumedComparison.value);
    values=before===after?after:`${before} → ${after}`;
  }else if(changedEncounter||unchanged){
    values=format(comparison.value);
  }else if(hasComparisonValue){
    values=`${format(comparison.baseValue)} → ${format(comparison.value)}`;
  }else if(comparison){
    values='비교 보류';
  }
  const change=partial?(partial.delta??0):compareAssumed?assumedComparison.delta:hasDelta?comparison.delta:0;
  const delta=Math.abs(change)>=.005?(change>0?'+':'')+format(change):'';
  const energy=energyChange?`<small data-role="candidate-energy">에너지 ${energyChange.before.used}/${energyChange.before.maximum} → ${energyChange.after.used}/${energyChange.after.maximum}</small>`:'';
  const trait=traitChange?`<small data-role="memory-trait-preview">${esc(traitChange)}</small>`:'';
  const fixedRate=unchanged&&skillSpeedChanges?.some(row=>Number.isFinite(row.fixedManualRate));
  return `<div class="drawer-dps" aria-label="${partial?'부분':compareAssumed||showEstimate?'방어 전':'전체'} DPS와 적용"><div aria-live="polite"><small>${label} ${delta?'<b>'+delta+'</b>':''}</small><strong>${status||values}</strong>${energy}${trait}${fixedRate?'<small>전투 조건의 사용 횟수 유지</small>':''}</div>${action}</div>`;
}
export function renderSkillPickerFooter(s, id=s.picker?.candidate, status='', disabled=false) {
  const support=Number.isInteger(s.supportIndex);
  const kind=support?'support-selection':'skill-selection';
  const attrs=`data-kind="${kind}" data-index="${s.skillIndex}" data-support="${support?s.supportIndex:''}" data-id="${esc(id)}"`;
  const label=support&&s.picker?.unlockSupportSlot?'칸 열고 장착':'이 슬롯에 장착';
  const action=id?button(label,'equip-item',`${attrs}${disabled?' disabled':''}`):button('후보 선택','equip-item','disabled');
  const preview=status?null:s.picker?.preview;
  return drawerDps(s,preview?.comparison,action,{status,assumedComparison:preview?.assumedComparison,
    energyChange:preview?.skill?.energyChange,partialComparison:preview?.partialComparison});
}
function renderSkillSwapPreview(swap){
  const {rowIndex,value}=swap.edit;
  const build=swap.preview.candidate.document.targetBuild;
  const slots=[...build.skills.active,...build.skills.passive];
  if(swap.edit.kind==='support-swap'){
    const from=swap.edit.supportIndex;
    const lines=[[from,value],[value,from]].flatMap(([a,b])=>{
      const link=slots[rowIndex].supports[b];
      return link?[`<li><small>보조 ${a+1} → 보조 ${b+1}</small><strong>${esc(title(link.supportId))} · Lv.${link.level}</strong></li>`]:[];
    });
    return `<section class="skill-swap-preview" data-role="skill-swap-preview" tabindex="-1" aria-label="보조 이동 미리보기"><h3>보조 이동 미리보기</h3><ul>${lines.join('')}</ul></section>`;
  }
  const label=index=>index===0?'주력':index<5?`액티브 ${index+1}`:`패시브 ${index-4}`;
  const rows=[[rowIndex,value],[value,rowIndex]].filter(([,to])=>slots[to].skillId).map(([from,to])=>{
    const skill=slots[to];
    const supports=skill.supports.flatMap((support,index)=>support?[`보조 ${index+1} · ${title(support.supportId)} Lv.${support.level}`]:[]);
    const conditions=build.ss14Inputs.dps?.skills?.[to];
    const selectedConditions=[['시전 배분','useShare','%'],['적중률','hitChance','%'],['시전','castRate','회/초']]
      .flatMap(([name,key,unit])=>Number.isFinite(conditions?.[key])?[`${name} ${conditions[key]}${unit}`]:[]);
    return `<li><small>${label(from)} → ${label(to)}</small><strong>${esc(title(skill.skillId))} · Lv.${skill.level}</strong>
      ${supports.map(link=>`<span>${esc(link)}</span>`).join('')}
      ${selectedConditions.length?`<span data-role="skill-swap-conditions-${to}">${esc(selectedConditions.join(' · '))}</span>`:''}</li>`;
  });
  const {comparison}=swap.preview;
  const baseline=comparison.encounterMatches===false&&Number.isFinite(comparison.baseValue)
    ?`<p>이동 전 전체 DPS <strong>${comparison.baseValue.toLocaleString('ko-KR',{maximumFractionDigits:2})}</strong></p>`:'';
  return `<section class="skill-swap-preview" data-role="skill-swap-preview" tabindex="-1" aria-label="슬롯 이동 미리보기"><h3>슬롯 이동 미리보기</h3><ul>${rows.join('')}</ul>${baseline}</section>`;
}
const formatCandidateDps=value=>Number.isFinite(value)?value.toLocaleString('ko-KR',{maximumFractionDigits:2}):'';
function skillCandidateComparison(s,id,entry,slotDps,basis){
  const skills=s.document?.targetBuild.skills, index=s.skillIndex, socket=s.supportIndex;
  const support=Number.isInteger(socket);
  const row=index<5?skills?.active?.[index]:skills?.passive?.[index-5];
  const equipped=support?row?.supports?.[socket]:row;
  const oldId=support?equipped?.supportId:equipped?.skillId;
  if(!id||(!oldId&&!slotDps))return '';
  const current=seasonSkillSlotCalculation(s.report,index,socket);
  const before=seasonSkillLevelState(current,equipped?.level);
  const after=seasonSkillLevelState(entry);
  const rows=[];
  const add=(label,a,b,format=value=>value)=>{
    if(a!==b&&a!=null&&b!=null)rows.push(`<tr><th scope="row">${label}</th><td>${esc(format(a))}</td><td>${esc(format(b))}</td></tr>`);
  };
  if(slotDps)add(`${support?'연결 스킬':'이 스킬'} ${basis==='assumedDps'?'방어 전 ':''}DPS`,slotDps.from,slotDps.to,formatCandidateDps);
  if(oldId&&oldId!==id)add('스킬',title(oldId),title(id));
  if(oldId)add('기본 레벨',before.base,after.base);
  if(oldId&&(before.bonus||after.bonus)&&before.confirmed&&after.confirmed)add('적용 레벨',before.level,after.level);
  if(!support&&before.confirmed&&after.confirmed){
    for(const [key,label] of [['averageHit','스킬 자체 평균 적중'],['dotDps','스킬 자체 지속 DPS'],['manaCost','기본 MP 소모'],['castTime','기본 시전 시간 (초)'],['cooldown','기본 쿨타임 (초)']]){
      const a=current.values?.[key], b=entry.values?.[key];
      if(Number.isFinite(a)&&Number.isFinite(b))add(label,a,b,value=>value.toLocaleString('ko-KR',{maximumFractionDigits:3}));
    }
  }
  return rows.length?`<table class="slot-dps-table skill-replacement-diff" data-role="skill-replacement-diff" aria-label="스킬 교체 전후">
    <thead><tr><th scope="col">항목</th><th scope="col">장착 중</th><th scope="col">후보</th></tr></thead><tbody>${rows.join('')}</tbody></table>
    ${oldId?`<details data-role="candidate-worn-skill-effect"><summary>장착 중 효과</summary>${skillLevelEffects(oldId,current,support,equipped.level)}</details>`:''}`:'';
}
export function renderSkillCandidateResult(s) {
  const preview=s.picker?.preview;
  const removed=preview?.skill?.removedSupports;
  const entry=preview?.skill?.entry;
  const activation=preview?.skill?.activation;
  const id=s.picker?.candidate;
  const support=Number.isInteger(s.supportIndex);
  const basis=preview?.dpsBasis;
  const slotDps=preview?.skillDpsChanges?.find(row=>row.index===s.skillIndex);
  const total=basis==='assumedDps'?preview?.assumedComparison:preview?.comparison;
  const inlineDps=slotDps&&(formatCandidateDps(slotDps.from)!==formatCandidateDps(total?.baseValue)
    ||formatCandidateDps(slotDps.to)!==formatCandidateDps(total?.value))?slotDps:null;
  const detailsPreview=inlineDps?{...preview,skillDpsChanges:preview.skillDpsChanges.filter(row=>row!==inlineDps)}:preview;
  const routeChanges=renderDamageRouteChanges(preview?.damageRoutes,{role:'candidate-damage-route-changes'});
  return renderRemovedSkillSupports(removed)+skillCandidateComparison(s,id,entry,inlineDps,basis)
    +(support?appliedSkillLevel(entry):renderSkillLevelStats(entry,preview?.skill?.growthMultiplier))
    +(activation?renderBuffActivation(activation,activation.value,{binding:'data-role="candidate-aura-activation" data-candidate-aura-activation'}):'')
    +(id?`<div class="skill-candidate-effect" aria-label="스킬 효과">${skillLevelEffects(id,entry,support,s.picker.levels?.[id])}</div>`:'')
    +renderSkillLevelChanges(preview?.skillLevels,esc,{role:'candidate-skill-level-changes'})
    +routeChanges
    +(detailsPreview?renderBuildSlotPreview(s,detailsPreview,{showDps:false,showResourcesInline:true,extraDetails:
      renderSkillElixirDps(preview.skill?.elixirDpsStates,'candidate')
      +(routeChanges?'':renderElixirDamageRoutes(preview.skill?.elixirDamageRoutes,'candidate')
        ||renderWeaponDamageRoutes(preview.skill?.weaponDamageRoutes,'candidate')
        ||renderSkillConversion(preview.skill?.conversion,'candidate'))}):'');
}
function renderCandidateSupportOptions(picker,id){
  const entry=picker?.preview?.skill?.entry;
  const rolls=entry?.controls??[];
  const tiers=entry?.tiers??[];
  const conditions=entry?.conditionControls?.filter(control=>!control.automatic)??[];
  if(!tiers.length&&!rolls.length&&!conditions.length)return '';
  const grade=tiers.length?`<label>옵션 등급<select data-candidate-support-tier data-role="candidate-support-tier">${entry.tier==null?'<option value="" selected disabled>등급 선택</option>':''}${tiers.map(({tier})=>
    `<option value="${tier}"${tier===entry.tier?' selected':''}>T${tier}</option>`).join('')}</select></label>`:'';
  return `<fieldset aria-label="후보 보조 옵션"><legend>보조 옵션</legend>${grade}${rolls.map((control,index)=>{
    const value=picker.supportRolls?.[id]?.[control.key]??control.value;
    return `<label>${index+1}번 (${control.min}~${control.max})<input type="number" min="${control.min}" max="${control.max}" step="any" value="${esc(value)}" data-candidate-support-roll="${esc(control.key)}" data-role="candidate-support-roll-${esc(control.key)}" aria-label="보조 옵션 ${index+1} 수치"></label>`;
  }).join('')}${conditions.map(control=>{
    const key=esc(control.key), value=picker.supportConditions?.[id]?.[control.key]??control.value;
    const attrs=`data-candidate-support-condition="${key}" data-role="candidate-support-condition-${key}"`;
    const field=control.choices?.length
      ? `<select ${attrs}><option value="">선택</option>${control.choices.map(([option,label])=>
        `<option value="${option}"${option===value?' selected':''}>${esc(label)}</option>`).join('')}</select>`
      : `<input type="number" ${attrs} min="${control.min}" max="${control.max}" step="${control.integer?'1':'any'}" value="${esc(value)}">`;
    return `<label>${esc(control.label)}${field}</label>`;
  }).join('')}</fieldset>`;
}
function renderGearSkillChanges(preview, labels) {
  return renderSkillLevelChanges(preview?.skillLevels,esc,{...labels,role:'gear-skill-level-changes'})
    +renderDamageRouteChanges(preview?.damageRoutes,{...labels,role:'gear-damage-routes'});
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
function memoryEffectChanges(before,after,index){
  const prefix=`hero.memories.${index}.`;
  const effects=report=>new Map(report.componentProjection.rows.filter(row=>row.path.startsWith(prefix)&&row.detail)
    .map(row=>[row.path,row.appliedDetail??row.detail]));
  const worn=effects(before), candidate=effects(after);
  const rows=[...new Set([...worn.keys(),...candidate.keys()])].flatMap(key=>{
    const from=worn.get(key), to=candidate.get(key);
    return from===to?[]:[`<tr><td>${esc(from??'—')}</td><td>${esc(to??'—')}</td></tr>`];
  });
  return rows.length?`<table class="slot-dps-table memory-effect-changes" data-role="memory-effect-changes" aria-label="추억 효과 변화">
    <thead><tr><th scope="col">장착 중</th><th scope="col">후보</th></tr></thead><tbody>${rows.join('')}</tbody></table>`:'';
}
function memoryTraitChange(before,after,index){
  const level=[45,60,75][index];
  const tier=({document,report})=>{
    const build=document.targetBuild;
    const choices=buildTraitSlots(build,level);
    const actual=report.componentProjection.rows.find(row=>row.control?.recordKey&&choices.includes(row.control.recordKey)&&row.control.tier);
    const value=actual?.control.tier??memoryTraitTier(build,level).tier;
    return value?value+'단계':build.hero?.memories?.[index]?'확인 필요':'미장착';
  };
  const from=tier(before), to=tier(after);
  return '특성 '+(from===to?to:from+' → '+to);
}
function shelfCandidateDetails(s,entry,index){
  const candidate=s.overlay.preview?.candidate;
  if(!candidate)return '';
  const templatePaths=new Set(candidate.report.componentProjection.rows.filter(r=>r.group==='divinity'&&r.slateControls).map(r=>r.path));
  const boardRows=[...boardOptions(candidate,'divinity')];
  const line=([,r])=>[r.label??r.name,r.value].filter(Boolean).join(' · ');
  const rows=entry.kind==='gear'?gearCardLines(candidate,entry.item.itemId,index)
    :entry.kind==='memory'?candidate.report.componentProjection.rows.filter(r=>r.path.startsWith(`hero.memories.${index}.`)).map(r=>{
      const values=(r.memoryRollControls??[]).map(c=>Number.isFinite(c.value)?c.value:'미입력');
      return [r.appliedDetail??r.detail,values.length?values.join(' / '):''].filter(Boolean).join(' · ');
    }):boardRows.filter(([key])=>!templatePaths.has(key)).map(line);
  const list=values=>`<ul class="shelf-option-list">${values.filter(Boolean).map(t=>'<li>'+esc(/[가-힣]/u.test(t)&&!/\p{Script=Han}/u.test(t)?t:'한국어 원문 일부 미제공')+'</li>').join('')}</ul>`;
  const templates=entry.kind==='divinity'?boardRows.filter(([key])=>templatePaths.has(key)).map(line):[];
  const changes=entry.kind==='memory'?memoryEffectChanges(s.report,candidate.report,index):'';
  return (changes?changes+`<details><summary>후보 효과</summary>${list(rows)}</details>`:list(rows))
    +(templates.length?'<details><summary>석판 고유 효과·원문</summary>'+list(templates)+'</details>':'');
}
function shelfMemoryLines({item,index,bindings}) {
  const memories=[];
  memories[index]=item;
  const rows=seasonMemoryRows({hero:{memories},ss14Inputs:{
    memoryBases:{[index]:bindings?.base},memoryRolls:bindings?.rolls,
  }});
  const base=seasonMemoryOptions(index).bases.find(option=>option.id===item.baseAttributeId);
  return rows.flatMap(row=>{
    const detail=row.path.endsWith('.base')&&row.reason?base?.name:row.koText?.detail;
    return detail&&/[가-힣]/u.test(detail)&&!/\p{Script=Han}/u.test(detail)?[detail]:[];
  });
}
const shelfGearLineCache = new WeakMap();
function shelfGearLines(entry) {
  if (shelfGearLineCache.has(entry)) return shelfGearLineCache.get(entry);
  const {item,index,bindings,craftRolls}=entry, id=item.itemId;
  const slots=[];
  slots[index]=item;
  const build={patchSnapshot:{season:'SS14'},gear:{slots},
    ss14Inputs:{gear:{[index]:bindings},extensionInputs:craftRolls}};
  const inspected=seasonGearSlotRollEntry(build,index);
  const rolls=inspected?labeledGearRolls({id},inspected):[];
  const labels=new Set(rolls.map(roll=>roll.label));
  const rollLines=rolls.flatMap(({label,value,min,max})=>{
    if(!Number.isFinite(value)||value<min||value>max||/^옵션 \d+ · 한국어 원문 미제공$/u.test(label))return [];
    const resolved=label.replace(/\(-?\d+(?:\.\d+)?[–~]-?\d+(?:\.\d+)?\)/u,String(value));
    return [resolved===label?label+' · '+value:resolved];
  });
  const crafts=Object.keys(item.crafts??{}).length
    ?seasonExtensionRows(build,{parseLines:parseSeasonComponentLines,craftSlot:index,requireBindings:false}).map(row=>row.detail)
    :[];
  const fixed=gearEffectLines(corrosionCard(SS14_CARDS.records[id],bindings,'ko'),id,index).filter(line=>!labels.has(line));
  const options=[...new Set((inspected?.logOptions?.filter(row=>!row.reason).map(row=>row.detail)??[...rollLines,...crafts,...fixed])
    .filter(line=>line&&/[가-힣]/u.test(line)&&!/\p{Script=Han}/u.test(line)))];
  shelfGearLineCache.set(entry,options);
  return options;
}
function gearCandidateEditor(s,index,current) {
    const id=s.picker.candidate;
    const removal=current===id?s.picker.removalPreview:null;
    return `<article class="native-picker-card gear-candidate-page" data-role="candidate-detail" aria-label="장비 후보 편집" tabindex="-1">
      <nav aria-label="장비 후보 탐색">${button(current===id?'교체 후보 보기':'‹ 장비 목록','gear-candidate-list')}${current===id
        ?button('해제 전후 보기','preview-gear-removal',`data-role="gear-removal-toggle" aria-expanded="${!!removal}"`)
          +(removal?'':removeGearButton(index))
        :current?button('장착 장비','view-worn-gear'):''}</nav>
      ${removal?`<div data-role="gear-removal-preview" tabindex="-1">${renderBuildSlotPreview(s,removal,{action:'해제',extraDetails:renderGearSkillChanges(removal,{before:'해제 전',after:'해제 후'})})}</div>`:''}
      <div class="gear-comparison-body" data-candidate="${esc(id)}">${workshopView(s,s.picker.draft,true)}</div></article>`;
}
export function renderSupportSearchSlots(s,index,supportIndex,query){
  if(!query.trim()||!Number.isInteger(supportIndex))return '';
  const {active,passive}=s.document.targetBuild.skills;
  const host=SS14_CARDS_EN.records[[...active,...passive][index]?.skillId];
  const matches=pickerSearchMatcher(query),slots=new Set();
  for(const {id,name} of seasonSupportOptions()){
    if(seasonSupportGrade(name)==='일반'||!matches(name))continue;
    const slot=seasonSupportRequiredSlot(seasonSupportItem(id)?.tlidbText.en);
    if(slot!==null&&slot!==supportIndex&&supportFitsSocket(id,host,index,slot))slots.add(slot);
  }
  return [...slots].sort((a,b)=>a-b).map(slot=>button(`보조 ${slot+1}에서 검색`, 'open-exclusive-support',
    `data-row="${index}" data-index="${slot}" data-search-query="${esc(query)}"`)).join('');
}

function itemPicker(s, category, index, supportIndex, current) {
  if (category==='gear' && index===1 && isTwoHandedWeapon(normalizeBuild(s.document.targetBuild).gear.slots[0]?.itemId))
    return '<p>양손 무기를 먼저 교체하거나 해제하세요.</p>'+ (current ? button('서브 무기 해제','clear-slot','data-kind="gear-selection" data-index="1"') : '');
  const editGearCandidate=category==='gear'&&s.picker?.candidate&&s.picker.draft;
  const support = Number.isInteger(supportIndex), kind = support ? "support-selection" : category === "gear" ? "gear-selection" : "skill-selection";
  const host = support ? [...s.document.targetBuild.skills.active, ...s.document.targetBuild.skills.passive][index] : null;
  const all = support ? seasonSupportOptions().filter(o => supportFitsSocket(o.id, SS14_CARDS_EN.records[host?.skillId], index, supportIndex)) : getSeasonPickerOptions(category, index, current);
  const family=s.picker?.gearKind??'';
  const supportGrade=support?s.picker?.supportGrade??'':'';
  const grades=support?new Set(all.map(o=>seasonSupportGrade(o.name))):null;
  const pool=category==='gear'&&family?all.filter(o=>itemGearKind(o.id)===family)
    :supportGrade?all.filter(o=>supportGrade==='부귀·숭고'?seasonSupportGrade(o.name)!=='일반':seasonSupportGrade(o.name)===supportGrade):all;
  const labelsFor = category === 'gear' ? id => gearFilters(id,index) : id => {
    const card=(support ? SS14_SUPPORTS : SS14_CARDS).records[id];
    return (card?.tags ?? []).filter(tag=>/[가-힣]/u.test(tag) && !/\p{Script=Han}/u.test(tag));
  };
  const ordered = ['힘','민첩','지혜'];
  const tagPool=support?all:pool;
  const filters=[...new Set(tagPool.flatMap(o=>labelsFor(o.id)))].filter(f=>!['제작','레전드'].includes(f)).sort((a,b)=>
    (ordered.includes(a)?ordered.indexOf(a):ordered.length)-(ordered.includes(b)?ordered.indexOf(b):ordered.length)||a.localeCompare(b,'ko'));
  const filterLabel=category==='gear'?'장비 분류':'스킬 태그';
  const selectedTags=s.picker?.tags??[];
  const options=category==='gear' ? (s.picker?.filter?pool.filter(o=>labelsFor(o.id).includes(s.picker.filter)):pool)
    : pool.filter(o=>selectedTags.every(tag=>labelsFor(o.id).includes(tag)));
  const selected = s.picker?.candidate ?? current ?? "";
  const query = s.picker?.query ?? "";
  const gear = category==='gear';
  const matches = pickerSearchMatcher(query,gear);
  const searchTexts = new Map(options.map(({id,name})=>{
    const card=SS14_CARDS.records[id]??SS14_SUPPORTS.records[id];
    const details=gear?[...labelsFor(id),...gearEffectLines(card,id,index).filter(line=>!(/\p{Script=Han}/u.test(line)))].join(' '):card?.detail??'';
    return [id,`${name} ${details}`];
  }));
  const match = option => matches(searchTexts.get(option.id));
  const gearKinds = [['base','제작 장비'],['legendary','레전드 장비'],['','기타 장비']];
  const gearGroups = gear && !family ? gearKinds.map(([kind,label]) => ({
    kind,label,items:options.filter(o => itemGearKind(o.id) === kind),
  })) : null;
  const visibleOptions = (gearGroups?.flatMap(group => group.items) ?? options).filter(match);
  const tabStop = visibleOptions.find(option => option.id === selected)?.id ?? visibleOptions[0]?.id;
  const card = SS14_CARDS.records[selected] ?? seasonSupportKoreanCard(selected);
  const supportsPreview = !support || Boolean(seasonSupportItem(selected));
  const equip = button("이 슬롯에 장착", "equip-item", `data-kind="${kind}" data-index="${index}" data-support="${support ? supportIndex : ""}" data-id="${esc(selected)}"`);
  if(s.drawer) s.drawer.bar=category==='gear'
    ?drawerDps(s,s.picker?.preview?.comparison,card?equip:button('후보 선택','equip-item','disabled'),s.picker?.preview??undefined)
    :renderSkillPickerFooter(s,card?selected:'','',!supportsPreview);
  const gearLines = category==='gear' ? gearEffectLines(card,selected,index) : [];
  const localizedLines = gearLines.filter(line=>/[가-힣]/u.test(line)&&!/\p{Script=Han}/u.test(line));
  const detail = gearEffectList(localizedLines) + (card&&category==='gear'&&(!card.koreanTextVerified||localizedLines.length<gearLines.length)
    ? '<p>한국어 원문 일부 미제공</p>' : '');
  const preview = s.picker?.preview ? renderBuildSlotPreview(s,s.picker.preview,{showDps:!s.drawer,showOptionsInline:category==='gear',extraDetails:category==='gear'?renderGearSkillChanges(s.picker.preview):''}) : "";
  const oldOptions=category==='gear'&&current&&selected&&selected!==current?equippedGearDetails(s,current,index):'';
  const counts=new Map();
  if(!gear)for(const o of tagPool)for(const tag of new Set(labelsFor(o.id)))counts.set(tag,(counts.get(tag)??0)+1);
  const gradePicker=grades&&grades.size>1?`<label>보조 등급<select data-support-grade data-role="support-grade" aria-label="보조 등급">
    ${['',...(grades.has('부귀')&&grades.has('숭고')?['부귀·숭고']:[]),...['일반','부귀','숭고'].filter(grade=>grades.has(grade))].map(grade=>
      `<option value="${grade}"${grade===supportGrade?' selected':''}>${grade||'전체'}</option>`).join('')}</select></label>`:'';
  const tagBar=gear||!filters.length?'':`<details class="skill-tag-filter"${selectedTags.length&&!s.picker?.candidate?' open':''}><summary>태그${selectedTags.length?' · '+esc(selectedTags.join(', ')):''}</summary><div class="skill-tag-list" role="group" aria-label="스킬 태그">${['',...filters.sort((a,b)=>counts.get(b)-counts.get(a))].map(tag=>
    `<label><input type="checkbox" data-skill-tag="${esc(tag)}"${(tag?selectedTags.includes(tag):!selectedTags.length)?' checked':''}>${esc(tag||'전체')} <small>(${tag?counts.get(tag):tagPool.length})</small></label>`).join('')}</div></details>`;
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
  const filterButton=f=>button(esc(f||'모든 분류'),'picker-group',`data-filter="${esc(f)}" data-role="gear-filter-${esc(f)}" aria-pressed="${(s.picker?.filter??'')===f}"`);
  const option=f=>`<option value="${esc(f)}"${f===s.picker?.filter?' selected':''}>${esc(f)}</option>`;
  const filterSelect = filters.length ? `<label>${filterLabel}<select data-gear-filter data-role="gear-filter-select" aria-label="${filterLabel}"><option value="">전체</option>${groups.map(([label,names])=>label?`<optgroup label="${label}">${names.map(option).join('')}</optgroup>`:names.map(option).join('')).join('')}</select></label>` : '';
  const wornAction=gear&&current&&s.picker?.draft ? (selected===current
    ?button('장착 해제','clear-slot',`data-kind="gear-selection" data-index="${index}"`)
    :button('장착 장비','view-worn-gear')):current?button(gear?'장착 옵션 편집':'장착 스킬','cancel-picker'):'';
  const skillRows=[...s.document.targetBuild.skills.active,...s.document.targetBuild.skills.passive];
  const candidateLevel=id=>s.picker?.levels?.[id]??(id===current
    ?support?skillRows[index].supports[supportIndex].level:skillRows[index].level
    :support?seasonSupportItem(id)?.tlidbText.en.cardLevel??20:20);
  const levelInput=card&&!gear&&supportsPreview?`<label class="skill-candidate-level">기본 레벨<input type="number" min="1" max="100" step="1" data-skill-candidate-level data-id="${esc(selected)}" data-role="candidate-level-${esc(selected)}" aria-label="${esc(title(selected))} 후보 레벨" value="${candidateLevel(selected)}"></label>`:'';
  const optionButton=o=>button(`${icon(o.id)}<span>${esc(o.name)}</span>${gear&&o.id===current?'<small class="gear-option-equipped">장착 중</small>':''}`, "preview-item",
    `data-id="${esc(o.id)}" data-picker-option data-search="${esc(searchTexts.get(o.id))}" aria-pressed="${selected===o.id}" tabindex="${o.id===tabStop?0:-1}" data-role="${gear?'gear':'skill'}-option-${esc(o.id)}"${match(o)?"":" hidden"}`);
  const resultGroups = gearGroups ? gearGroups.map(({kind,label,items}) => {
    return items.length ? `<div class="gear-result-group" data-gear-result-group="${kind}" role="group" aria-label="${label}"${items.some(match) ? '' : ' hidden'}><span aria-hidden="true">${label}</span>${items.map(optionButton).join('')}</div>` : '';
  }).join('') : options.map(o => gear ? optionButton(o) : `<div class="skill-candidate-row">${optionButton(o)}</div>`).join('');
  const emptyHidden=visibleOptions.length?' hidden':'';
  const emptyResults=gear&&(family||s.picker?.filter)
    ? `<div data-picker-empty${emptyHidden}><span role="status">검색 결과 없음</span>${button('모든 분류 검색','picker-gear-kind','data-category="" data-focus-role="gear-picker-search"')}</div>`
    : !gear&&(pool.length||support)
      ? `<div data-picker-empty${emptyHidden}><span role="status">검색 결과 없음</span>${support?`<div data-support-search-slots>${visibleOptions.length?'':renderSupportSearchSlots(s,index,supportIndex,query)}</div>`:''}${button('검색·태그 초기화','skill-picker-reset')}</div>`
      : `<p data-picker-empty role="status"${emptyHidden}>검색 결과 없음</p>`;
  const skillCandidate=!gear&&card&&s.picker?.candidate;
  return `<div class="native-item-picker ${gear?'equipment-catalog'+(filters.length?'':' category-only'):'skill-catalog'}${editGearCandidate?' has-candidate-editor':''}${skillCandidate?' has-skill-candidate':''}" aria-label="슬롯 아이템 선택">
    ${gear?`<nav class="catalog-rail" aria-label="장비 종류"><div>${gearKinds.map(([id,label])=>button(id?label:'전체','picker-gear-kind',`data-category="${id}" data-role="gear-kind-${id}" aria-pressed="${family===id}"`)).join('')}</div>
    ${filters.length?`<div class="catalog-groups" aria-label="장비 분류">${filterButton('')}${groups.map(([label,names])=>`<div class="catalog-family"${label?' role="group" aria-label="'+esc(label)+'"':''}>${names.map(filterButton).join('')}</div>`).join('')}</div><div class="catalog-mobile-filter">${filterSelect}</div>`:''}</nav>`:''}
    <header><input type="search" data-picker-filter data-role="${gear?'gear':'skill'}-picker-search" value="${esc(query)}" aria-label="이름·효과 검색" placeholder="이름·효과 검색" />${gear?'':`<output data-picker-count aria-label="검색 결과 수">${visibleOptions.length}개</output>`}${editGearCandidate?'':wornAction}${gear&&!s.picker?.candidate?button('교체 추천','rank-slot-replacement',`data-index="${index}" aria-label="${esc(SEASON_GEAR_SLOT_LABELS[index])} 교체 추천"`):''}</header>${gradePicker||tagBar?`<div class="skill-catalog-filters">${gradePicker}${tagBar}</div>`:''}${emptyResults}
    <div class="native-picker-columns"><div class="native-picker-list" aria-label="아이템 후보">${resultGroups}</div>
    ${editGearCandidate?gearCandidateEditor(s,index,current):card ? `<article class="native-picker-card" aria-label="아이템 미리보기" data-role="candidate-detail" tabindex="-1">${gear
      ? `<h3>${esc(title(selected))}</h3><div class="gear-comparison-body" data-candidate="${esc(selected)}" tabindex="0" aria-label="옵션 및 수치 비교">${preview}${detail}${oldOptions}</div>`
      : `${skillCandidate?button('‹ 스킬 목록','skill-candidate-list','class="show-skill-candidates"'):''}<header class="skill-candidate-identity">${icon(selected)}<h3>${esc(title(selected))}</h3></header>${levelInput}${support?renderCandidateSupportOptions(s.picker,selected):''}<div data-role="skill-candidate-result">${s.picker?.candidate?renderSkillCandidateResult(s):`<div class="skill-candidate-effect" aria-label="스킬 효과">${skillLevelEffects(selected,null,support,candidateLevel(selected))}</div>`}</div>`}</article>` : ''}</div></div>`;
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
  const restoration=entry?.mechanics?.find(effect=>effect.utility==='restoration');
  const showHit = Number.isFinite(values.averageHit) && (values.averageHit>0 || !entry.damageCapabilities?.dot);
  const stats = [
    ['20레벨 이후 대미지 배율',growthMultiplier,'', '×'],
    ['스킬 자체 평균 적중',showHit?values.averageHit:null],
    Number.isFinite(values.dotDps)?['스킬 자체 지속 DPS',values.dotDps]:['스킬 자체 DPS',showHit?null:values.baseDps],
    ...(restoration?[
      ['기본 HP 회복',restoration.lifePercent,`% (최대 HP 기준, ${restoration.lifeDuration}초)`],
      ['기본 MP 회복',restoration.mana,` (${restoration.manaDuration}초)`],
    ]:[]),
    ['기본 MP 소모',values.manaCost], ['기본 시전 시간',values.castTime,'초'], ['기본 쿨타임',values.cooldown,'초'],
  ].filter(([, value])=>Number.isFinite(value));
  const number = value => value.toLocaleString('ko-KR',{maximumFractionDigits:3});
  return `<section data-role="skill-level-stats" aria-label="레벨별 스킬 수치"><strong>Lv.${level} 스킬 수치</strong>${bonus?` <small>기본 ${base} ${bonus>0?'+':''}${bonus}</small>`:''}
    ${stats.length?`<dl class="native-stat-list">${stats.map(([label,value,unit,prefix])=>
      `<div class="native-stat-cell"><dt>${label}</dt><dd>${prefix??''}${number(value)}${unit??''}</dd></div>`).join('')}</dl>`:''}
    ${entry?.missingAddedDamageEffectiveness?'<small>이 레벨의 추가 대미지 효율 미확인</small>':''}</section>`;
}

function equippedSkillLinks(s,row,index) {
  const links=row.supports.slice(0,row.unlockedSupportCount).flatMap((link,socket)=>{
    if(!link?.supportId)return [];
    const name=title(link.supportId);
    const {text,description}=skillSlotLevelDisplay(s.report,index,link.level,socket);
    return [button(`${icon(link.supportId)}<span><strong>${esc(name)}</strong><small>보조 ${socket+1} · Lv.${text}</small></span>`,
      'inspect-socket',`data-row="${index}" data-index="${socket}" aria-label="보조 ${socket+1} · ${esc(name)} · Lv.${text}"${description?` aria-description="${esc(description)}"`:''}`)];
  });
  return links.length?`<nav class="equipped-skill-links" aria-label="연결된 보조 스킬">${links.join('')}</nav>`:'';
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

function supportCountExceedsEnergy(skills,rowIndex,count) {
  const group=rowIndex<5?'active':'passive';
  const index=rowIndex<5?rowIndex:rowIndex-5;
  const rows=skills[group].map((row,i)=>i===index?{...row,unlockedSupportCount:count}:row);
  return getSkillEnergyUsage({...skills,[group]:rows}).over>0;
}

function skillSlotLevelDisplay(report,rowIndex,base,supportIndex) {
  const entry=seasonSkillSlotCalculation(report,rowIndex,supportIndex);
  const {level,bonus,confirmed}=seasonSkillLevelState(entry,base);
  const needsCheck=entry?.levelUnavailable===true||Boolean(bonus&&!confirmed);
  const note=bonus?`레벨 ${base} → ${level}`:needsCheck?`레벨 ${base}`:'';
  return {
    text:`${level??base}${needsCheck?'?':''}`,
    description:note+(needsCheck?' · 확인 필요':''),
  };
}

function equipmentPanel(s, category) {
  const b = normalizeBuild(s.document.targetBuild), gear = category === "gear";
  const rows = [...b.skills.active, ...b.skills.passive];
  const selected = s.gearIndex ?? 0;
  const label = i => gear ? SEASON_GEAR_SLOT_LABELS[i] : i===0?'주력':i<5?`액티브 ${i+1}`:`패시브 ${i-4}`;
  const positions = gear ? [0,1,2,3,4,5,6,9,7,8] : rows.map((_, i) => i);
  if (!gear) return `<div class="skill-overview" data-role="slot-workspace"><nav class="equipped-list" aria-label="스킬 슬롯"><h2>스킬</h2>${skillEnergy(b.skills)}${rows.map((r,i)=>{
    const main=r.skillId?skillSlotLevelDisplay(s.report,i,r.level):null;
    return `<section class="skill-chain">
    ${button(`${r.skillId?icon(r.skillId):'<span class="empty-slot-mark" aria-hidden="true">＋</span>'}<span><small>${label(i)}</small>${r.skillId?`<strong>${esc(title(r.skillId))}</strong>`:''}</span>${main?`<small class="chain-skill-level">Lv.${main.text}</small>`:''}`,'inspect-skill',`data-index="${i}" data-role="skill-slot-${i}" aria-label="${esc(label(i)+' · '+(r.skillId?title(r.skillId)+` · 기본 레벨 ${r.level}`:'미장착'))}"${main?.description?` title="${esc(main.description)}" aria-description="${esc(main.description)}"`:''} aria-haspopup="dialog"`)}
    ${r.skillId?`<div class="chain-supports">${Array.from({length:5},(_,n)=>{
      if(n>r.unlockedSupportCount)return '<span class="chain-locked" aria-hidden="true">–</span>';
      const next=n===r.unlockedSupportCount;
      const linked=r.supports[n]?.supportId;
      const energy=(i<5?SUPPORT_SLOT_ENERGY_COSTS:PASSIVE_SUPPORT_SLOT_ENERGY_COSTS)[n];
      const lowEnergy=next&&supportCountExceedsEnergy(b.skills,i,n+1);
      const base=r.supports[n]?.level;
      const level=linked?skillSlotLevelDisplay(s.report,i,base,n):null;
      const name=`${label(i)} ${title(r.skillId)} · 보조 ${n+1} · ${next?`${lowEnergy?'에너지 부족':'칸 열기'} · 에너지 +${energy}`:linked?`${title(linked)} · 기본 레벨 ${base}`:'미장착'}`;
      const tip=level?.description?`${name} · ${level.description}`:name;
      return button(linked?`${icon(linked)}<span class="skill-board-level" aria-hidden="true">${level.text}</span>`:next?'+'+energy:'＋','inspect-socket',`data-row="${i}" data-index="${n}" data-role="skill-socket-${i}-${n}"${next?' class="chain-open-next"':''} aria-label="${esc(name)}" title="${esc(tip)}"${level?.description?` aria-description="${esc(level.description)}"`:''} aria-haspopup="dialog"${lowEnergy?' disabled':''}`);
    }).join('')}</div>`:''}</section>`;
  }).join('')}</nav>${button("영약·모듈화", "edit-slot", 'data-type="extensions"')}</div>`;
  const shelf=button('보관함','shelf-open',`data-kind="gear" data-scope="all" data-index="${selected}" data-role="home-shelf"`);
  const swap=b.gear.slots[7]?.itemId||b.gear.slots[8]?.itemId
    ?button('반지 교환','preview-ring-swap','data-role="ring-swap-open"'): '';
  const slots = `<nav class="equipped-list" aria-label="장비 슬롯"><header class="equipment-heading"><h2>장비</h2><div class="native-slot-actions">${swap}${shelf}</div></header><div class="gear-slots">${positions.map(i => {
      const current = b.gear.slots[i]?.itemId;
      return button(`${current?icon(current):'<span class="empty-slot-mark" aria-hidden="true">＋</span>'}<span><small>${esc(label(i))}</small>${current?`<strong>${esc(title(current))}</strong>`:''}</span>`,
        "inspect-gear", `data-index="${i}" data-role="gear-slot-${i}"${current?' class="is-filled"':''} aria-label="${esc(label(i)+' · '+(current?title(current):'미장착'))}" aria-haspopup="dialog" aria-expanded="${s.overlay?.type==='gear'&&selected===i}"`);
    }).join("")}</div></nav>`;
  const tools=s.section==='gear'?`<div class="home-gear-tools"><select aria-label="장비 부위" data-home-gear-slot data-role="home-gear-slot">${SEASON_GEAR_SLOT_LABELS.map((name,i)=>`<option value="${i}"${i===selected?' selected':''}>${esc(name)}</option>`).join('')}</select>${button('장비 제작','workshop-open',`data-kind="gear" data-index="${selected}"`)}${button('교체 추천','rank-slot-replacement',`data-index="${selected}" aria-label="${esc(label(selected))} 교체 추천"`)}</div>`:'';
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
      const lowEnergy=!!row.skillId&&count<costs.length&&supportCountExceedsEnergy(skills,index,count+1);
      const cells=slots.map((id,n)=>{
        const locked=n>count,label=n?'보조 '+n:name;
        const next=locked&&n===count+1&&Boolean(row.skillId);
        const desc=(n?name+' · ':'')+label+' · '+(next?`${lowEnergy?'에너지 부족':'칸 열기'} · 에너지 +${costs[n-1]}`:locked?'잠김':id?title(id):'미장착');
        const active=s.overlay.index===index && (s.supportIndex??-1)===n-1;
        const art=id?icon(id):'';
        const symbol=locked&&!next?'–':art.startsWith('<img')?art:id?esc(title(id).slice(0,2)):'＋';
        const base=n?row.supports[n-1]?.level:row.level;
        const display=id?skillSlotLevelDisplay(s.report,index,base,n?n-1:undefined):null;
        const level=display?`<span class="skill-board-level" aria-hidden="true">${display.text}</span>`:'';
        const levelHelp=display?.description;
        const tip=levelHelp?`${desc} · ${levelHelp}`:desc;
        const select=button(symbol+level+(n?'':'<small>'+name+'</small>'), 'inspect-socket', `data-row="${index}" data-index="${n-1}" data-board-socket${next?' class="chain-open-next"':''} aria-pressed="${active}" aria-label="${esc(desc)}" title="${esc(tip)}"${levelHelp?` aria-description="${esc(levelHelp)}"`:''}${locked&&(!next||lowEnergy)||n&&!row.skillId?' disabled':''}`);
        const remove=id?button('×','remove-socket',`class="skill-socket-remove" data-row="${index}" data-index="${n-1}" aria-label="${esc(desc)} 해제" title="해제"`):'';
        return `<div class="skill-board-socket">${select}${remove}</div>`;
      }).join('');
      const step=(dir,disabled)=>button(dir>0?'+':'−','skill-board-count',`data-row="${index}" data-step="${dir}" aria-label="${name} 보조 칸 ${dir>0?'추가':'줄이기'}${dir>0&&lowEnergy?' · 에너지 부족':''}"${disabled?' disabled':''}`);
      return `<div class="skill-board-row" role="group" aria-label="${name}" data-role="skill-board-row-${index}" tabindex="-1">${cells}<div class="skill-board-steps">${step(-1,!row.skillId||!count||!!row.supports[count-1]?.supportId)}<span>${energy.rows[index].used}</span>${step(1,!row.skillId||count>=5||lowEnergy)}</div></div>`;
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
function elixirIngredientFields(build,bottle){
  const ids=build.skills.elixirs?.[bottle]?.ingredientIds??[];
  const choices=seasonElixirIngredientOptions(build,bottle,ids);
  const fields=[...ids,...(choices.length?['']:[])].map((id,position)=>{
    const options=id?seasonElixirIngredientOptions(build,bottle,ids.filter((_,i)=>i!==position)):choices;
    const role=`elixir-ingredient-${bottle}-${position}`;
    return select(`약재 ${position+1}`,role,'elixir-ingredient',id,options,`data-slot="${bottle}" data-key="${position}" data-role="${role}"`);
  });
  return fields.length?`<fieldset><legend>약재</legend>${fields.join('')}</fieldset>`:'';
}
function slotEditor(s) {
  const { type, index } = s.overlay, b = normalizeBuild(s.document.targetBuild);
  if (type === "extensions") {
    const original = s.document.targetBuild;
    const elixirs = nativeElixirOptions(), modules = nativeModuleOptions();
    const affixes=nativeModuleAffixes().map(option=>({...option,searchText:`${option.name} ${option.detail}`}));
    const skillRows=original.skills.active.flatMap((_,index)=>activeSkillExtension(original,index)?[index]:[]);
    const conditionFields=extensionControls(s.report,{}, {onlyElixirsAndModules:true})
      +dpsControls(s.document,s.report,{},false,{skillRows})+(skillRows.length?theaControls(s.document,s.report,{}):'');
    const conditions=conditionFields?`<details class="native-extension-conditions" data-role="native-extension-conditions"><summary>영약·모듈 전투 조건</summary>${conditionFields}</details>`:'';
    return `<div class="native-extension-selection"><section><h3>영약</h3>${[0, 1].map(i => {
      const id = original.skills?.elixirs?.[i]?.skillId, choice = elixirs.find(o => o.id === id);
      const activeIndex = choice ? original.skills.active.findIndex(slot => slot?.skillId === choice.itemId) : -1;
      const placement = activeIndex===0?'주력':activeIndex>0?`액티브 ${activeIndex + 1}번 칸`:id?'장착 위치 확인 필요':'빈 액티브 칸에 장착';
      return `<fieldset><legend>영약 ${i + 1}</legend>${select(`영약 ${i + 1}`, `native-elixir-${i}`, "elixir-selection", id, elixirs, `data-slot="${i}" data-role="native-elixir-${i}-select" aria-describedby="native-elixir-placement-${i}"`, true)}<p id="native-elixir-placement-${i}">${placement}</p>${choice ? `<p>${esc(choice.detail)}</p>${elixirIngredientFields(original,i)}` : ""}</fieldset>`;
    }).join("")}</section><section><h3>모듈화</h3>${[0, 1, 2, 3, 4].map(i => {
      const config = original.skills?.active?.[i]?.modularization;
      const label=i===0?'주력 모듈':`액티브 ${i+1} 모듈`;
      const chosen=modules.find(option=>option.id===config?.modularizationSkillId);
      const optionFields=config?[0,1,2].map(n=>{
        const role=`native-module-${i}-${n}`;
        const selected=affixes.find(a=>a.id===config.moduleOptionIds[n]);
        const choices=affixes.filter(option=>option===selected||!config.moduleOptionIds.includes(option.id));
        return select(`모듈 ${i+1} 옵션 ${n+1}`,role,'module-option',config.moduleOptionIds[n],choices,
          `data-slot="${i}" data-key="${n}" data-role="${role}"`)+(selected?`<p>${esc(selected.detail)}</p>`:'');
      }).join(''):'';
      const optionEditor=config?`<section class="native-module-options"><label>옵션 검색<input type="search" data-module-option-search="${i}" data-role="module-option-search-${i}" aria-label="${label} 옵션 이름·효과 검색" placeholder="이름·효과 검색" value="${esc(s.overlay.moduleSearch?.[i])}"></label><p data-module-option-empty role="status" hidden>검색 결과 없음</p>${optionFields}</section>`:'';
      return `<details data-role="native-module-${i}"${config ? " open" : ""}><summary>${label}${chosen?' · '+esc(chosen.name):''}</summary>${select(label, `native-module-${i}`, "module-selection", config?.modularizationSkillId, modules, `data-slot="${i}" data-role="native-module-${i}-select"`, true)}${optionEditor}</details>`;
    }).join("")}</section></div>${conditions}`;
  }
  if (type === "hero") {
    const {candidateId,candidate,query=''}=s.overlay;
    const options=seasonHeroOptions();
    const chosen=options.find(h=>h.id===candidateId);
    const matches=pickerSearchMatcher(query,true);
    const name=h=>`${h.name} ${h.title}`;
    const lostTraits=b.hero.traitSelections?.reduce((count,trait)=>count+(trait.choiceIds?.length??0),0)??0;
    const lostMemories=(b.hero.memories?.filter(Boolean).length??0)+Number(Boolean(b.hero.revivalMemory));
    const baseTrait=candidate&&seasonHeroTraitOptions(candidateId).find(t=>buildTraitSlots(candidate.candidate.document.targetBuild,1).includes(t.key));
    const preview=candidate&&chosen?`<section class="hunter-preview" data-role="hero-preview" tabindex="-1" aria-label="히어로 변경 미리보기"><h3>${esc(chosen.name)} · ${esc(chosen.title)}</h3>
      ${baseTrait?`<p>기본 특성 · ${esc(baseTrait.name)}</p>`:''}${lostTraits||lostMemories?`<p>변경 시 해제 · 특성 ${lostTraits}개 · 추억 ${lostMemories}개</p>`:''}
      ${candidate.candidate.report.fullDps.blockers.some(reason=>/레벨 히어로 특성/u.test(reason))?'<p>특성 선택 후 DPS 계산</p>':''}</section>`:'';
    return `${preview}<label>히어로 검색<input type="search" data-hunter-filter value="${esc(query)}" aria-label="히어로 이름·칭호 검색"></label><div class="hunter-gallery">${options.map(h => {
      const art = getIngameHeroArt(h.id);
      return button(`${art ? `<img src="${esc(art)}" alt="" loading="lazy">` : ""}<span><strong>${esc(h.name)}</strong><small>${esc(h.title)}</small></span>`,
        "pick-hunter", `data-id="${esc(h.id)}" data-role="hero-choice-${esc(h.id)}" data-hunter-name="${esc(name(h))}" aria-pressed="${(candidateId??b.hero.branchId)===h.id}"${matches(name(h))?'':' hidden'}`);
    }).join("")}</div><p data-hunter-empty${options.some(h=>matches(name(h)))?' hidden':''}>검색 결과가 없습니다.</p>`;
  }
  if (type === "traits") {
    const id = s.document.targetBuild.hero?.branchId;
    const choices = seasonHeroTraitOptions(id);
    const stages = [1, 45, 60, 75];
    return `${!s.document.targetBuild.ss14Inputs.heroSelection && !(traitSlotCount(id,45)===2 && b.hero?.traitSelections?.length) ? button('히어로 선택','edit-slot','data-type="hero"') : (stages.includes(index) ? [index] : stages).map(level => {
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
    const presetsOpen=workshopMemoryNeedsQuality(memory);
    return base + (presetsOpen?presets:'') + '<div class="memory-fine-level">' + select('추억 희귀도','native-memory-quality','memory-quality',memory.ss14Quality,
      memoryQualities.map(q=>({id:q.id,name:q.name})), `data-slot="${index}"`)
      + `<div class="memory-enhancement-control"><label for="memory-enhancement-${index}">강화 단계</label>
        <input id="memory-enhancement-${index}" type="number" min="1" max="${quality?.maxLevel??50}" step="1" value="${memory.enhancement}" inputmode="numeric" data-role="memory-level-number" data-season-edit="memory-enhancement" data-slot="${index}">
        <input type="range" min="1" max="${quality?.maxLevel??50}" step="1" value="${memory.enhancement}" aria-label="강화 단계 슬라이더" data-role="memory-level-slider" data-season-edit="memory-enhancement" data-slot="${index}"></div>`
      + '</div>' + (presetsOpen?'':`<details class="memory-quick-presets"><summary>최대 강화로 설정</summary>${presets}</details>`)
      + `<fieldset data-role="native-memory-affixes"><legend>추억 옵션</legend>${tiers}</fieldset>`;
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
    const hostLink=!isGear&&Number.isInteger(c)&&row.skillId
      ?button(`‹ ${esc(title(row.skillId))}`,'inspect-skill',`data-index="${index}" class="equipped-skill-parent" aria-label="${esc(title(row.skillId))} 연결 스킬로 돌아가기"`):'';
    const identity = isGear ? '' : `<header class="equipped-skill-identity">${icon(current)}<div>${hostLink}<h3>${esc(title(current))}</h3></div></header>`;
    const extension=!isGear&&!Number.isInteger(c)?activeSkillExtension(s.document.targetBuild,index):null;
    const extensionSettings=extension?button(extension.kind==='module'?'모듈 옵션 편집':'영약 설정 편집','open-skill-extension','data-role="skill-extension-settings"'):'';
    const actions = `${identity}<div class="native-slot-actions">${button("교체", "open-picker", `aria-label="${itemType} 교체"`)}${button("해제", "clear-slot", `aria-label="${itemType} 해제" data-kind="${isGear ? "gear-selection" : Number.isInteger(c) ? "support-selection" : "skill-selection"}" data-index="${index}" data-support="${Number.isInteger(c) ? c : ""}"`)}${extensionSettings}</div>`;
    if (!isGear && Number.isInteger(c)) {
      const calculation = s.report.components.filter(component => component.category === "supports")
        .flatMap(component => component.calculations ?? []).find(entry => entry.rowIndex === index && entry.supportIndex === c);
      const destinations=row.supports.map((link,to)=>seasonSupportSwapAllowed(row,index,c,to)
        ?button(esc(`보조 ${to+1} · ${link?title(link.supportId):'빈 칸'}`),'support-swap',`data-index="${to}"`):'').join('');
      const move=destinations?`<details data-role="skill-swap-options"><summary>보조 칸 이동</summary><div class="native-slot-actions">${destinations}</div></details>`:'';
      return `${actions}${move}<fieldset><legend class="panel-heading-accessible">보조 ${c + 1}</legend>${field(`보조 ${c + 1} 레벨`, "support-level", row.supports[c].level, `data-row="${index}" data-support="${c}" min="1" max="100" step="1"`)}
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
    const restrictions=new Set();
    const destinations=!isGear?(index<5?b.skills.active:b.skills.passive).map((slot,i)=>{
      const destination=index<5?i:i+5;
      if(destination===index)return '';
      const name=destination===0?'주력':index<5?'액티브 '+(i+1):'패시브 '+(i+1);
      const issue=seasonSkillSwapIssue(b.skills,index,destination);
      if(issue?.id)restrictions.add(title(issue.id));
      return button(esc(name+' · '+(slot.skillId?title(slot.skillId):'빈 칸')),'skill-swap',
        `data-index="${destination}"${issue?` disabled aria-describedby="skill-swap-restriction"`:''}`);
    }).join(''):'';
    const move=destinations?`<details data-role="skill-swap-options"><summary>슬롯 이동</summary><div class="native-slot-actions">${destinations}</div>
      ${restrictions.size?`<small id="skill-swap-restriction">이동 제한 · ${esc([...restrictions].join(', '))}</small>`:''}</details>`:'';
    return `${actions}${isGear?'':equippedSkillLinks(s,row,index)}${move}${isGear && index < 2 ? weaponSummary(s.document.targetBuild, index) : ''}
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
function craftFields(report,index,choices,crafts={},picker) {
  return `<div class="craft-families">${[['craft_prefix','접두'],['craft_suffix','접미']].map(([family,label])=>{
    const pool=choices.filter(o=>o.family===family);
    const slots=craftFamilySlots(crafts,family);
    const rows=slots.map((c,position)=>{
      const slotName=label+' '+(position+1);
      const attrs=`data-family="${family}" data-position="${position}"`;
      const items=pool.filter(o=>!crafts?.[o.affixId]||o.affixId===c?.affixId);
      const choice=c&&items.find(o=>o.affixId===c.affixId&&o.tierId===c.tierId);
      const row=c&&report.componentProjection.rows.find(r=>r.path===`gear.slots.${index}.crafts.${c.affixId}`);
      const id='craft-'+family+'-'+position;
      const open=picker?.family===family&&picker.position===position;
      const tiers=choice?items.filter(item=>item.affixId===choice.affixId).sort((a,b)=>Number(a.tier)-Number(b.tier)):[];
      const directTier=position<3&&tiers.length>1;
      const tierSelect=directTier?`<select data-craft-tier ${attrs} data-role="${id}-tier" aria-label="${slotName} 등급">${tiers.map(item=>`<option value="${esc(item.key)}"${item===choice?' selected':''}>T${esc(item.tier)}</option>`).join('')}</select>`:'';
      const toggle=(!c||choice)&&position<3?button(choice?`<small>${slotName}${directTier?'':' · T'+esc(choice.tier)}</small><span>${esc(choice.text)}</span>`:'＋ '+slotName,
        'workshop-pick-affix',`${attrs} data-role="${id}" class="craft-affix-toggle" aria-label="${slotName} ${choice?'옵션 변경':'추가'}" aria-expanded="${open}"${open?` aria-controls="${id}-choices"`:''}${items.length?'':' disabled'}`)
        :esc(row?.detail??'옵션 확인 필요');
      let options='';
      if(open){
        const matches=pickerSearchMatcher(picker.query,true);
        const rows=items.map(option=>{
          const text=`T${option.tier} · ${option.text}`;
          return {text,option,visible:matches(text)};
        });
        options=`<section class="craft-affix-picker" id="${id}-choices" aria-label="${slotName} 옵션·등급"><input type="search" data-craft-search data-role="craft-affix-search" value="${esc(picker.query)}" placeholder="옵션·등급 검색" aria-label="${slotName} 옵션 검색" />
          <div class="craft-affix-choices">${rows.map(({text,option,visible})=>button(esc(text),'workshop-select-affix',`data-key="${esc(option.key)}" data-craft-option aria-pressed="${option===choice}"${visible?'':' hidden'}`)).join('')}</div><p data-craft-empty${rows.some(row=>row.visible)?' hidden':''}>검색 결과 없음</p></section>`;
      }
      return `<div class="craft-affix">${directTier?`<div class="craft-affix-header">${toggle}${tierSelect}</div>`:toggle}${options}${craftRollInputs(row,slotName,choice?.text)}${choice?button('옵션 제거','workshop-remove',`data-key="${esc(choice.key)}" aria-label="${slotName} 제거"`):''}</div>`;
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
function removeGearButton(index){
  return button('장착 해제','clear-slot',`data-kind="gear-selection" data-index="${index}"`);
}

function workshopView(s,draft=s.overlay,embedded=false) {
  const {kind,index,document:doc}=draft, build=doc.targetBuild;
  const report=calculateSeasonBuild(build), gear=kind==='gear';
  const item=gear?build.gear?.slots?.[index]:build.hero?.memories?.[index];
  let form='';
  if (gear) {
    if(!embedded){
      const options=getSeasonSelectionOptions('gear',index).filter(o=>itemGearKind(o.id)===draft.category);
      form=`<nav class="native-slot-actions" aria-label="제작할 장비 종류">${[['base','제작 장비'],['legendary','레전드 장비']].map(([key,label])=>button(label,'workshop-category',`data-category="${key}" data-role="workshop-category-${key}" aria-pressed="${draft.category===key}"`)).join('')}</nav>`;
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
        form+=choices.length||Object.keys(item.crafts??{}).length?craftFields(report,index,choices,item.crafts,draft.craftPicker):'<p>제작 옵션 없음</p>';
      }
    }
  } else {
    form=slotEditor({...s,document:doc,report,overlay:{...draft,type:'memory',index}});
    let preview='', trait='';
    const needsQuality=workshopMemoryNeedsQuality(item);
    if(s.drawer)s.drawer.bar=drawerDps(s,null,button('이 슬롯에 장착','workshop-equip','disabled'),
      needsQuality?{status:'추억 희귀도 선택 필요'}:undefined);
    if(!needsQuality&&(item || draft.slotDraft&&s.document.targetBuild.hero.memories?.[index])) {
      const edit=item?{kind:'shelf-apply',slotIndex:index,value:finishedWorkshopItem(draft)}:{kind:'memory-selection',slotIndex:index,value:''};
      const p=previewSlotEdit(s.document,s.report,edit);
      const equip=button(item?'이 슬롯에 장착':'추억 해제','workshop-equip');
      trait=memoryTraitChange(s,{document:doc,report},index);
      if(s.drawer)s.drawer.bar=drawerDps(s,p.comparison,equip,{...p,traitChange:trait});
      preview=renderBuildSlotPreview(s,p,{showDps:!s.drawer});
    }
    const options=seasonMemoryOptions(index), prefix='hero.memories.'+index+'.';
    const effects=report.componentProjection.rows.filter(r=>r.path.startsWith(prefix)&&r.detail);
    const changes=memoryEffectChanges(s.report,report,index);
    const effectList=effects.length?`<ul aria-label="추억 효과">${effects.map(r=>`<li>${esc(r.appliedDetail??r.detail)}</li>`).join('')}</ul>`:'';
    const summary=item||trait?`<section class="memory-card"><header>${icon(options.flatCatalogId)}<div><strong>${esc(options.name)}</strong>${!s.drawer&&trait?`<small>${esc(trait)}</small>`:''}</div></header>${changes}${changes&&effectList?`<details><summary>후보 효과</summary>${effectList}</details>`:effectList}</section>`:'';
    const shelf=draft.slotDraft?button('보관함에서 장착','shelf-open',`data-kind="memory" data-index="${index}" data-role="slot-shelf-open"`):'';
    return `<section data-item-workshop class="memory-workbench"><div class="memory-fields">${form}</div><div class="memory-decisions">${summary}${preview}${shelf}<details><summary>보관함에 저장</summary><label>보관할 이름<input type="text" data-workshop-name maxlength="100" value="${esc(draft.name)}" placeholder="아이템 이름 사용"></label>${button('제작 후 보관함에 넣기','workshop-store',item&&!needsQuality?'':'disabled')}</details></div></section>`;
  }
  const edit = embedded?s.picker.edit:item?.itemId ? {kind:'shelf-apply',slotIndex:index,value:finishedWorkshopItem(draft)} : null;
  const locked = index===1 && isTwoHandedWeapon(normalizeBuild(s.document.targetBuild).gear.slots[0]?.itemId);
  const removal = embedded && s.picker.removalPreview;
  const preview = edit && !locked && !removal && (embedded?s.picker.preview:previewSlotEdit(s.document,s.report,edit));
  if (locked) form+='<p>서브 무기를 장착하려면 양손 무기를 먼저 교체하거나 해제하세요.</p>';
  const equip = removal?removeGearButton(index):button('장착하고 보관','workshop-equip',edit&&!locked?'':'disabled');
  s.drawer.bar=drawerDps(s,preview?.comparison,equip,preview??undefined);
  const stats=report.componentProjection.rows.filter(r=>r.path.startsWith(`gear.slots.${index}.crafts.`));
  const card=stats.length?`<section class="craft-item-card" aria-label="제작 옵션 미리보기"><strong>${esc(title(item.itemId))}</strong>${stats.map(r=>`<p>${esc(r.detail||'한국어 원문 미제공')}</p>`).join('')}</section>`:'';
  if(embedded){
    const id=item.itemId, mods=gearCardLines({document:doc,report},id,index,{includeUnlabeled:false});
    const worn=s.document.targetBuild.gear?.slots?.[index]?.itemId;
    return `<section data-item-workshop class="candidate-workshop">
      <header class="candidate-identity">${icon(id)}<h3>${esc(title(id))}${worn===id?'<small>장착 중</small>':''}</h3></header>
      ${form?`<div class="candidate-options">${form}</div>`:''}
      <aside class="candidate-receipt" aria-label="후보 장비 카드">
      ${preview?renderBuildSlotPreview(s,preview,{showDps:false,showOptionsInline:true,extraDetails:renderGearSkillChanges(preview)}):''}
      ${gearEffectList(mods)}
      ${worn&&worn!==id?equippedGearDetails(s,worn,index):''}${itemSource(id,build.ss14Inputs.gear[index])}</aside></section>`;
  }
  return `<section data-item-workshop class="memory-workbench"><div class="memory-fields">${form}</div><div class="memory-decisions">${preview ? renderBuildSlotPreview(s,preview,{showDps:false,showOptionsInline:true,extraDetails:renderGearSkillChanges(preview)}) : ''}${card}<details><summary>보관만</summary><label>보관할 이름<input type="text" data-workshop-name maxlength="100" value="${esc(draft.name)}" placeholder="아이템 이름 사용"></label>${button('보관함에 저장','workshop-store',edit?'':'disabled')}</details></div></section>`;
}
const boardTitles=BOARD_TITLES;
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
      const installed=slot.rings?.[r.slotId]?.installedDestiny;
      const name=pactRingDisplayName(r,installed);
      return button(pactRingImage(r,installed,icon),'pact-inspect',`class="${pactNodeActive(slot,r.slotId)?'':'inactive'}" data-index="${i}" data-key="${esc(r.slotId)}" data-role="home-ring-${i}-${esc(r.slotId)}" aria-label="정령 ${i+1} · ${esc(name)} · ${esc(r.category)} ${esc(r.slotId.at(-1))}" title="${esc(name)}"`);
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
  if(section==='hero'){
    const id=build.hero?.branchId;
    const projection=snapshot.report.componentProjection.rows;
    const controls=new Map(projection.filter(row=>row.group==='hero'&&row.control?.recordKey).map(row=>[row.control.recordKey,row.control]));
    const choices=id?new Map(seasonHeroTraitOptions(id).map(trait=>[trait.key,trait.name])):new Map();
    if(id){
      const hero=seasonHeroOptions().find(option=>option.id===id);
      entries.set('hero',{name:'히어로',value:[hero?.name??'한국어 이름 미제공',`Lv.${build.heroLevel??build.hero?.level??90}`].join(' · ')});
    }
    for(const level of [1,45,60,75]){
      const slots=buildTraitSlots(build,level);
      for(const [index,key] of slots.entries()){
        if(!key)continue;
        const name=`${level}레벨 특성${traitSlotCount(id,level)>1?' '+(index+1):''}`;
        const control=controls.get(key);
        const value=key===EMPTY_TRAIT_MEMORY?'추억 미장착':[
          choices.get(key)??'한국어 이름 미제공',control?.tier?`${control.tier}단계`:'단계 확인 필요',
        ].join(' · ');
        entries.set(`trait-${level}-${index}`,{name,value});
      }
      if(level===1)continue;
      const index=[45,60,75].indexOf(level),memory=build.hero?.memories?.[index];
      if(!memory)continue;
      const name=`${level}레벨 추억`;
      const value=[seasonMemoryOptions(index).name,memoryQuality(memory.ss14Quality)?.name,`강화 +${memory.enhancement}`].filter(Boolean).join(' · ');
      entries.set(`memory-${index}`,{name,value});
      for(const row of projection.filter(row=>row.path.startsWith(`hero.memories.${index}.`))){
        const detail=row.appliedDetail??row.detail;
        if(detail&&/[가-힣]/u.test(detail)&&!/\p{Script=Han}/u.test(detail))
          entries.set(row.path,{name:name+' 옵션',value:detail});
      }
    }
    return entries;
  }
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
      const name=regularSlateFamilies.find(f=>f.id===slate.regularFamily)?.name??types.find(t=>t.id===slate.slateId)?.name??'이전 석판';
      const shape=slatePreviewOffsets(slate).map(([x,y])=>({x,y}));
      const value=[pos?`${pos.x+1}열 ${pos.y+1}행`:'미배치',shape.length+'칸',((slate.rotation??0)*90)+'°'].join(' · ');
      entries.set('piece'+slate.instanceId,{name,label:`석판 ${i+1} · ${name}`,value,shape});
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
    const source=section==='divinity'?seasonSlateOptionSource(row.itemId):'';
    if(value||amounts)entries.set(row.path,{name,value,amounts,source});
  }
  return entries;
}
export function compareBoardOptions(before,after,section,{withSlotLabels=false}={}){
  const beforeRows=boardOptions(before,section),afterRows=boardOptions(after,section);
  const build=after.document.targetBuild;
  const slateBoard=section==='divinity'&&withSlotLabels?slateEditorBoard(build):null;
  const changed=[];
  for(const key of new Set([...beforeRows.keys(),...afterRows.keys()])){
    const a=beforeRows.get(key),b=afterRows.get(key);
    const shapeChanged=a?.shape&&b?.shape&&JSON.stringify(a.shape)!==JSON.stringify(b.shape);
    const showSource=a?.source&&b?.source&&a.source!==b.source&&a.value===b.value;
    if(!shapeChanged&&!showSource&&a?.value===b?.value&&a?.name===b?.name&&a?.amounts===b?.amounts)continue;
    const scaled=a&&b&&a.amounts!==b.amounts&&a.value===b.value;
    const label=v=>v?(a&&b&&a.name!==b.name?v.name+' · ':'')+((scaled?v.amounts:v.value)||v.amounts||'없음')+(showSource?' · '+v.source:''):'없음';
    const title=b?.label??a?.label??b?.name??a.name;
    const talentSlot=withSlotLabels&&/^talents\.boards\.(\d+)\./u.exec(key);
    const spiritSlot=withSlotLabels&&/^pact\.slots\.(\d+)\./u.exec(key);
    const panel=withSlotLabels&&section==='talents'&&(talentSlot||/^panel(\d+)$/u.exec(key));
    const memory=withSlotLabels&&section==='hero'&&/^(?:memory-|hero\.memories\.)([0-2])(?:\.|$)/u.exec(key);
    let editTarget;
    if(panel){
      const index=Number(panel[1]);
      editTarget={type:'talents',index,label:`재능 패널 ${index+1}`};
    }else if(memory){
      const index=Number(memory[1]);
      editTarget={type:'memory',index,label:`${[45,60,75][index]}레벨 추억`};
    }else if(spiritSlot){
      const index=Number(spiritSlot[1]),slot=build.pact?.slots?.[index];
      const ring=/\.rings\.(inner|mid)Ring([1-6])(?:\.|$)/u.exec(key);
      const extra=/\.undeterminedFate\.slots\.([0-4])(?:\.|$)/u.exec(key)?.[1];
      const destination=!slot?.spirit?'':ring?`${ring[1]}Ring${ring[2]}`:key.includes('.undeterminedFate')
        ?(extra!==undefined&&slot.undeterminedFate?.slots?.[Number(extra)]?'extra-'+extra:'undetermined'):key.endsWith('.main')?'outer':'';
      const detail=!destination?'':ring?`${ring[1]==='inner'?'내환':'중환'} ${ring[2]}`:destination==='outer'?'외환':destination.startsWith('extra-')?`미정 숙명 ${Number(extra)+1}`:'미정 숙명';
      editTarget={type:'pact',index,key:destination,label:`정령 ${index+1}${detail?' '+detail:''}`};
    }else if(slateBoard){
      const i=slateBoard.slateInventory.findIndex(slate=>{
        const path=`divinity.${slateBoard.boardId}.${slate.instanceId}`;
        return key===`piece${slate.instanceId}`||key===path||key.startsWith(path+'.');
      });
      editTarget={type:'divinity',index:i+1,key:slateBoard.slateInventory[i]?.instanceId,label:i<0?'신격 석판':`석판 ${i+1}`};
    }
    const prefix=talentSlot?`재능 패널 ${Number(talentSlot[1])+1} · `:spiritSlot?`정령 ${Number(spiritSlot[1])+1} · `:'';
    changed.push({title:prefix+title,before:label(a),after:label(b),...(editTarget&&{editTarget}),
      ...(shapeChanged&&{shapeChange:{before:a.shape,after:b.shape}})});
  }
  return changed;
}
function boardApply(s){
  return button('빌드에 적용','board-apply',s.overlay.document===s.document&&!s.overlay.pending.size?'disabled':'');
}
export function renderDrawerBar(s,hasBoardChanges=false){
  if(s.overlay.type==='extensions'&&s.overlay.hostPreview){
    const {preview,edit}=s.overlay.hostPreview;
    const actions=`<div class="board-dps-actions">${button('취소','extension-host-cancel')}${button(edit.value?'교체 적용':'해제 적용','extension-host-apply')}</div>`;
    return drawerDps(s,preview.comparison,actions,preview);
  }
  if(s.overlay.type==='board') {
    const draft=s.overlay;
    const comparison=draft.document===s.document?null:compareSeasonDpsSnapshots(s,draft);
    const assumedComparison=comparison&&!comparison.supported?compareSeasonDpsSnapshots(s,draft,'assumedDps'):null;
    const apply=boardApply(s);
    const actions=hasBoardChanges?`<div class="board-dps-actions">${button('변경 내역','board-show-changes','aria-controls="ss14-board-change-detail"')}${apply}</div>`:apply;
    const partialComparison=comparison&&!comparison.supported&&!draft.pending.size?compareSeasonPartialDps(s,draft,comparison):null;
    return drawerDps(s,comparison,actions,{assumedComparison,partialComparison});
  }
  const initial=s.overlay.initial;
  const comparison=initial&&initial.document!==s.document?compareSeasonDpsSnapshots(initial,s):null;
  const assumedComparison=comparison&&!comparison.supported?compareSeasonDpsSnapshots(initial,s,'assumedDps'):null;
  const partialComparison=comparison&&!comparison.supported?compareSeasonPartialDps(initial,s,comparison):null;
  return drawerDps(s,comparison,button('편집 완료','close'),{
    status:s.error?'입력 확인':s.pending.size?'입력 적용 대기':'',assumedComparison,partialComparison});
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
  const options=renderBoardOptionChanges(compareBoardOptions(s,after,section),esc,{
    label:section==='divinity'?'배치·옵션 변경':'변경 옵션',role:'board-option-changes',
  });
  const uniqueReasons=new Set(result.reasons.map(reason=>{
    const other=reason.replace(/^(기준|현재): /u,(_,side)=>side==='기준'?'현재: ':'기준: ');
    return other!==reason&&result.reasons.includes(other)?reason.slice(4):reason;
  }));
  const reasons=uniqueReasons.size?`<details data-role="board-dps-reasons"><summary>전체 DPS 보류 사유</summary><ul>${[...uniqueReasons].map(r=>'<li>'+esc(r)+'</li>').join('')}</ul></details>`:'';
  return `${options}${levels}${dpsChanges}${renderResourceChanges({...resources,dpsBasis},esc,{board:true})}${reasons}`;
}
function boardDrawer(s){
  const draft=s.overlay,section=draft.section;
  const changes=renderBoardComparison(s);
  const history=button('↶','board-undo',`data-role="board-undo" aria-label="이 편집 되돌리기" title="이 편집 되돌리기 (Ctrl+Z)"${draft.rosterBase||!draft.history?.canUndo?' disabled':''}`)
    +button('↷','board-redo',`data-role="board-redo" aria-label="이 편집 다시 실행" title="이 편집 다시 실행 (Ctrl+Shift+Z)"${draft.rosterBase||!draft.history?.canRedo?' disabled':''}`);
  const after={...s,document:draft.document,report:draft.report,boardOverview:false,slateInspectorSeparated:section==='divinity',
    talentInspectorSeparated:section==='talents',pactInspectorSeparated:section==='pact',
    talentComparisonBoards:section==='talents'?s.document.targetBuild.talents?.boards:undefined};
  const inspector=section==='divinity'?renderSlateEditor(after,{inspectorOnly:true})
    :section==='talents'?renderTalentScene(after,{button,esc,icon},{inspectorOnly:true})
    :renderPactScene(after,{button,esc,select,icon},{inspectorOnly:true});
  const fileTools=section==='divinity'?`${button('가져오기','files','title="전체 빌드 파일 가져오기"')}${button('내보내기','download-build','title="편집 중인 석판을 포함한 전체 빌드"')}${button('보관','shelf-save',`data-kind="divinity" data-index="0" title="현재 석판 배치 보관"${slateEditorBoard(draft.document.targetBuild).slateInventory.length?'':' disabled'}`)}${button('보관함','shelf-open','data-kind="divinity" data-index="0"')}`:'';
  return `<div class="season-native-backdrop gear-drawer-backdrop"><button class="gear-drawer-scrim" type="button" data-ss14-action="close" tabindex="-1" aria-label="편집창 닫기"></button>
    <section role="dialog" aria-modal="true" aria-label="${boardTitles[section]} 편집" class="season-native-modal gear-drawer board-drawer${section==='divinity'?' slate-drawer':section==='talents'?' talent-drawer':' pact-drawer'}">
    <header><h2 data-role="board-heading" tabindex="-1">${boardTitles[section]} 편집</h2><div class="board-header-actions">${history}${fileTools}</div>${button('닫기','close','aria-label="편집 닫기"')}</header>
    ${s.error?`<p role="alert">${esc(s.error)}</p>`:''}
    <div class="season-native-modal-body board-workbench"><div class="board-edit-fields">${boardScene(after)}</div>
    <aside class="board-comparison" aria-label="선택 항목">${inspector}<div id="ss14-board-change-detail" data-role="board-change-detail" tabindex="-1">${changes}</div></aside></div>${renderDrawerBar(s,Boolean(changes))}</section></div>`;
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
    const swap=skill?s.overlay.skillSwap:null;
    const swapActions=swap?`<div class="board-dps-actions">${button('취소','skill-cancel-swap')}${button('이동 적용','skill-apply-swap')}</div>`:'';
    const swapFooter=swap?drawerDps(s,swap.preview.comparison,swapActions,{...swap.preview,afterLabel:'이동 후 전체 DPS'}):'';
    return `<div class="season-native-backdrop gear-drawer-backdrop"><button class="gear-drawer-scrim" type="button" data-ss14-action="close" tabindex="-1" aria-label="편집창 닫기"></button>
      <section role="dialog" aria-modal="true" aria-label="SS14 ${esc(name)}" class="season-native-modal gear-drawer slot-side-editor${skill?' skill-workspace':' workshop-workspace'}"><header><h2 data-role="${skill?'slot-detail-heading':'memory-drawer-heading'}" tabindex="-1">${esc(name)}${skill&&Number.isInteger(s.supportIndex)?' · 보조 '+(s.supportIndex+1):''}</h2>${skill&&!swap?`<div class="skill-header-actions">${button('연결판','show-skill-links','class="show-skill-links" aria-label="선택한 스킬의 연결판 보기"')}${button('닫기','close','aria-label="편집 닫기"')}</div>`:button('닫기','close','aria-label="편집 닫기"')}</header>
      ${s.error?`<p role="alert">${esc(s.error)}</p>`:''}<div class="season-native-modal-body">${swap?renderSkillSwapPreview(swap):skill?`<div id="skill-selection-pane" class="skill-selection-pane" data-role="skill-selection-pane" tabindex="-1"${s.overlay.boardOnly?' hidden':''}>${s.overlay.boardOnly?'':exclusiveSupportLinks(s,row)+slotEditor(s)+(id&&!s.picker?`<details class="editor-details"><summary>스킬 상세</summary>${itemSource(id,undefined,supportTier)}${renderEffectSources(s,'skills.rows.'+index+(s.supportIndex==null?'':'.supports.'+s.supportIndex))}</details>`:'')}</div>${skillLinkBoard(s,b.skills)}`:workshopView(s)}</div>${swapFooter||(s.drawer.bar??renderDrawerBar(s))}</section></div>`;
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
  let content, shelfFooter='';
  if (type === 'saves') {
    const deleting=s.overlay.deleteCandidate;
    const query=plannerSearchKey(s.overlay.query);
    const rows=[...s.documents].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(d=>{
      const active=d.id===s.document.id, name=esc(d.targetBuild.name);
      const key=plannerSearchKey(d.targetBuild.name), visible=key.includes(query);
      const attrs=`data-id="${esc(d.id)}"`;
      const opened=`<strong>${name}</strong><span class="saved-build-meta"><time datetime="${esc(d.updatedAt)}">${esc(formatAppDateTime(d.updatedAt))}</time>${active?'<small>편집 중</small>':''}</span>`;
      const html=`<article class="native-save-row ss14-saved-build-row" data-saved-build-name="${esc(key)}"${visible?'':' hidden'}>
        ${button(opened,'open',`${attrs} class="saved-build-open" aria-label="${name} 열기"`)}
        <div>${active?'':button('DPS 비교','compare-saved',`${attrs} data-role="compare-saved-${encodeURIComponent(d.id)}" aria-label="${name} DPS 비교"`)}
        ${button('공유','share-saved',`${attrs} data-role="share-saved-${encodeURIComponent(d.id)}" aria-label="${name} 저장본 공유"`)}
        ${button('삭제','request-delete-save',`${attrs} aria-label="${name} 삭제"`)}</div></article>`;
      return {html,visible};
    });
    const search=rows.length>1?`<input type="search" data-saved-build-search aria-label="빌드 이름 검색" placeholder="빌드 이름 검색" value="${esc(s.overlay.query??'')}">`:'';
    content=deleting
      ? `<p><strong>${esc(deleting.targetBuild.name)}</strong> 저장본을 삭제할까요?</p>
        ${deleting.id===s.document.id?'<p>편집 내용은 이 화면에 남습니다. 다시 열려면 새로 저장하세요.</p>':''}
        <div class="native-slot-actions">${button('취소','cancel-delete-save')}${button('저장본 삭제','confirm-delete-save')}</div>`
      : `${button('새 빌드','new-build')}${s.overlay.notice?`<p role="status">${esc(s.overlay.notice)}</p>`:''}
        ${rows.length?`${search}${rows.map(row=>row.html).join('')}<p data-saved-build-empty role="status"${rows.some(row=>row.visible)?' hidden':''}>검색 결과 없음</p>`:'저장된 SS14 빌드가 없습니다.'}`;
  }
  else if(type==="shelf") {
    const {kind,all,counts,query=''}=s.overlay,wearable=['gear','memory'].includes(kind);
    const labels={memory:'추억',gear:'장비',divinity:'신격 석판',prism:'프리즘'};
    const matches=pickerSearchMatcher(query,wearable||kind==='prism');
    const talentBoards=kind==='prism'?new Map(seasonTalentBoards().map(tree=>[tree.id,tree.name])):null;
    const variants=new Map();
    if(kind==='gear')for(const entry of s.shelfRows){
      const key=entry.item.itemId;
      if(!variants.has(key))variants.set(key,[]);
      variants.get(key).push(shelfGearLines(entry));
    }
    const filters=all?`<nav class="shelf-categories" aria-label="보관함 분류">${Object.entries(labels).map(([key,name])=>button(name+' '+counts[key],'shelf-tab',`data-kind="${key}" data-role="shelf-tab-${key}" aria-pressed="${kind===key}"`)).join('')}</nav>`:'';
    const rows=s.shelfRows.map(v=>{
      const prism=kind==='prism'?describeSeasonPrism(v.item):null;
      let detail;
      if(kind==='gear')detail=[SEASON_GEAR_SLOT_LABELS[v.index],title(v.item.itemId),...gearFilters(v.item.itemId,v.index)].filter(Boolean);
      else if(kind==='memory')detail=[seasonMemoryOptions(v.index).name,memoryQuality(v.item.ss14Quality)?.name,'강화 +'+v.item.enhancement];
      else if(kind==='divinity')detail=['배치 '+new Set((v.item.cells??[]).map(cell=>cell.slateInstanceId).filter(Boolean)).size+'개'];
      else detail=[prism.name,v.item.rarity==='legendary'?'레전드':v.item.rarity==='rare'?'레어':'',talentBoards.get(v.bindings?.tree)];
      const options=kind==='gear'?shelfGearLines(v):kind==='memory'?shelfMemoryLines(v):prism?.lines??[];
      const peers=kind==='gear'?variants.get(v.item.itemId):[];
      const different=peers.length>1?options.filter(line=>peers.some(peer=>!peer.includes(line))):[];
      const summary=(kind==='memory'?options:prism?options.slice(-1):different).slice(0,2).join(' · ');
      const search=[v.name,...detail,...options].filter(Boolean).join(' ');
      const visible=matches(search);
      const attrs=`data-id="${esc(v.id)}"`,selected=visible&&v.id===s.overlay.candidate;
      const meta=kind==='gear'?[detail[0],v.name!==detail[1]?detail[1]:'']:kind==='memory'?detail.slice(1):detail;
      return {visible,selected:selected?v:null,prism,html:`<article class="shelf-record" data-shelf-record="${esc(search)}"${visible?'':' hidden'}>${button(`${kind==='gear'?icon(v.item.itemId):kind==='memory'?icon(seasonMemoryOptions(v.index).flatCatalogId):''}<span><strong>${esc(v.name)}</strong><small>${esc([...meta,summary].filter(Boolean).join(' · '))}</small></span>`,'shelf-preview',`${attrs} aria-pressed="${selected}" aria-label="${esc([v.name,summary,'선택'].filter(Boolean).join(' '))}"`)}</article>`};
    });
    const searchLabel=labels[kind]+(wearable||kind==='prism'?' 이름·옵션 검색':' 검색');
    const selectedRow=rows.find(row=>row.selected),selected=selectedRow?.selected,attrs=selected?`data-id="${esc(selected.id)}"`:'';
    const targets=s.overlay.candidateTargets??[], index=s.overlay.candidateIndex;
    const gearTargetLabel=slot=>{
      const id=s.document.targetBuild.gear.slots[slot]?.itemId;
      return SEASON_GEAR_SLOT_LABELS[slot]+' · '+(id?title(id):'미장착');
    };
    const newSlatePage=s.overlay.slatePageTarget!=='current';
    const target=selected&&kind==='divinity'
      ? `<label>불러올 위치<select data-shelf-slate-page data-role="shelf-slate-page"><option value="new">새 페이지</option><option value="current"${newSlatePage?'':' selected'}>현재 페이지</option></select></label>`
      :selected&&kind==='prism'
      ?(targets.length?'<small>'+esc(talentBoards.get(selected.bindings?.tree)??'재능 패널')+' · 패널 '+(index+1)+'</small>':'<p>보관할 때와 같은 전문 재능 패널을 선택하세요.</p>')
      :selected&&all&&kind==='gear'?targets.length>1
      ?`<label>장착 부위<select data-shelf-gear-target data-role="shelf-gear-target">${targets.map(slot=>`<option value="${slot}"${slot===index?' selected':''}>${esc(gearTargetLabel(slot))}</option>`).join('')}</select></label>`
      :targets.length===1?`<small>${esc(SEASON_GEAR_SLOT_LABELS[index])}</small>`:'<p>장착할 수 있는 부위 없음</p>':'';
    const preview=selected?s.overlay.preview:null;
    const memoryCandidate=kind==='memory'?preview?.candidate:null;
    const enhancement=memoryCandidate?selected.item.enhancement:undefined;
    const wornEnhancement=memoryCandidate?s.document.targetBuild.hero?.memories?.[index]?.enhancement:undefined;
    const enhancementChange=memoryCandidate&&wornEnhancement!==enhancement
      ?`<p data-role="shelf-memory-enhancement">강화 ${wornEnhancement==null?'미장착':'+'+wornEnhancement} → +${enhancement}</p>`:'';
    const compared=preview?renderBuildSlotPreview(s,preview,{showDps:false,showOptionsInline:wearable}):'';
    const layout=kind==='divinity'&&preview?`<div class="shelf-slate-layouts" role="group" aria-label="신격 석판 배치 비교">${[
      ['현재 배치',s.overlay.boardDraft?.document??s.document],['보관 배치',preview.candidate.document],
    ].map(([label,document])=>`<figure><figcaption>${label}</figcaption>${renderSlateEditor({document},{readOnly:true})}</figure>`).join('')}</div>`:'';
    const options=selected?(selectedRow.prism
      ?'<ul class="shelf-option-list">'+selectedRow.prism.lines.map(line=>'<li>'+esc(line)+'</li>').join('')+'</ul>'
      :shelfCandidateDetails(s,selected,s.overlay.candidateIndex)):'';
    const placementError=selected&&s.overlay.previewError?`<p role="status">${esc(s.overlay.previewError)}</p>`:'';
    const detail=selected?`<h3>${esc(selected.name)}</h3>${target}${placementError}${layout}${enhancementChange}${wearable?compared+options:options+compared}${renderGearSkillChanges(preview)}<details data-role="shelf-management"><summary>관리</summary>
      <label>보관함 이름<input type="text" data-shelf-name maxlength="160" value="${esc(s.overlay.renameDraft??selected.name)}"></label>
      <div class="native-slot-actions">${button('이름 저장','shelf-rename',attrs)}${button('보관 해제','shelf-remove',attrs)}</div></details>`:'<span class="shelf-no-selection">아이템 선택</span>';
    if(selected){
      const label=kind==='divinity'?(newSlatePage?'새 페이지에 추가':'현재 페이지 교체'):wearable?'장착':'편집창에 적용';
      const apply=button(label,'shelf-use',attrs+(preview?'':' disabled'));
      const traitChange=memoryCandidate?memoryTraitChange(s,memoryCandidate,index):'';
      shelfFooter=drawerDps(s,preview?.comparison,apply,preview?{...preview,traitChange}:{status:placementError?'배치 불가':'적용 위치 확인'});
    }
    content=`<div class="shelf-toolbar">${filters}<input type="search" data-shelf-search data-role="shelf-search" aria-label="${searchLabel}" placeholder="${searchLabel}" value="${esc(query)}"></div><div class="shelf-workbench"><div class="shelf-records" aria-label="보관한 ${labels[kind]}">${rows.map(row=>row.html).join('')}<p data-shelf-empty${rows.some(row=>row.visible)?' hidden':''}>${rows.length?'검색 결과 없음':'보관한 '+labels[kind]+' 없음'}</p>${wearable&&!all?button(kind==='gear'?'새 장비 제작':'새 추억 제작','workshop-open'):''}</div><aside class="shelf-candidate" aria-label="선택한 보관 항목" data-role="shelf-candidate" tabindex="-1">${detail}</aside></div>`;
  }
  else if (type === 'ring-swap') {
    const slots=normalizeBuild(s.document.targetBuild).gear.slots;
    const name=index=>slots[index]?.itemId?title(slots[index].itemId):'미장착';
    content=`<table class="slot-dps-table" aria-label="반지 교환 전후"><thead><tr><th scope="col">장착 부위</th><th scope="col">교환 전</th><th scope="col">교환 후</th></tr></thead>
      <tbody>${[7,8].map(index=>`<tr><th scope="row">${esc(SEASON_GEAR_SLOT_LABELS[index])}</th><td>${esc(name(index))}</td><td>${esc(name(15-index))}</td></tr>`).join('')}</tbody></table>
      ${renderBuildSlotPreview(s,s.overlay.preview,{showOptionsInline:true,action:'교환'})}`;
  }
  else if (type === 'reset-build') content='<p>현재 구성을 비웁니다. 장비·추억은 보관함에 남고 저장된 빌드는 유지됩니다.</p>';
  else if (type === "files") {
    const board=s.overlay.boardDraft,doc=board?.document??s.document;
    const pending=s.overlay.pendingImport;
    const exportIssue=season91SlateExportIssue(doc.targetBuild);
    const export91=exportIssue
      ? button('91TOB 파일로 저장','download-91-file','disabled aria-describedby="slate-page-export-note"')
        +`<small id="slate-page-export-note">${esc(exportIssue)} TOB JSON으로 저장하세요.</small>`
      : button(s.overlay.exporting91?'91TOB 확인 중…':'91TOB 파일로 저장','download-91-file',s.overlay.exporting91?'disabled':'');
    const filePicker=export91+(!board&&!isOfflineEdition()?button('스크린샷 가져오기','open-screenshot-import'):'')
      +(!board&&canLookUpIngameBuild()?button('인게임 빌드코드 조회','open-ingame-code'):'')+'<label>빌드 JSON 열기 <small>TOB · 91TOB</small><input type="file" accept=".json,application/json" aria-label="빌드 JSON 열기" data-build-file></label>';
    content = pending?`<section aria-label="석판 변경 확인"><h3>미적용 석판 변경</h3><p>${esc(pending.targetBuild.name)} 빌드를 열기 전에 현재 변경을 선택하세요.</p><div class="board-import-actions">${button('석판 변경 보존 후 열기','board-import-apply')}${button('석판 변경 버리고 열기','board-import-discard')}${button('석판 편집으로','close')}</div></section>`
    : `${board?'':`${button("사본 저장", "copy")}${RUNTIME_POLICY.allowGameLogs ? button("게임 로그 가져오기", "local-log") : `<details><summary>게임 로그 가져오기 안내</summary><p>${esc(LOCAL_LOG_ONLY_MESSAGE)}</p></details>`}`}${button("TOB JSON으로 저장","download-build")}${filePicker}<details><summary>JSON 텍스트로 옮기기</summary><label>TOB SS14 빌드 내보내기<textarea readonly aria-label="TOB SS14 빌드 내보내기">${esc(exportSeasonWorkspace(doc))}</textarea></label><label>TOB SS14 빌드 가져오기<textarea id="native-import" aria-label="TOB SS14 빌드 가져오기"></textarea></label>${button("가져오기", "import")}</details>${board?button('석판 편집으로','close'):'<details><summary>이전 시즌 보관함</summary><button type="button" data-action="open-preserved-build">이전 시즌 빌드 열기</button></details>'}`;
  }
  else if (type === "share") content = `${s.overlay.savedList?`<p><strong>${esc(s.overlay.sourceName)}</strong> 저장본</p>`:''}<div class="build-share-panel"><label>공유 링크<input type="text" id="share-link" aria-label="공유 링크" readonly value="${esc(s.overlay.link)}" /></label>${button("공유 링크 복사","copy-link",s.overlay.link?"":"disabled")}<p id="share-status" role="status">${esc(s.overlay.message)}</p></div>
    ${s.overlay.savedList?'':`<details data-role="share-code-tools"><summary>빌드 코드로 공유하거나 가져오기</summary><label>내 빌드 코드<textarea id="share-code" readonly spellcheck="false" aria-label="내 빌드 코드">${esc(s.overlay.code)}</textarea></label>${button("코드 복사","copy-code",s.overlay.code?"":"disabled")}<label>받은 빌드 코드<textarea id="share-paste" spellcheck="false" placeholder="TOB14-1.…" aria-label="받은 빌드 코드">${esc(s.overlay.paste)}</textarea></label>${button("새 사본으로 열기","import-code")}</details>`}`;
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
  else if(type==='extensions'&&s.overlay.hostPreview){
    const {changed}=s.overlay.hostPreview;
    content=`<section class="skill-swap-preview" data-role="extension-host-preview" tabindex="-1" aria-label="스킬 교체 미리보기"><h3>스킬 교체 미리보기</h3><ul>${changed.map(row=>{
      const slot=row.index===0?'주력':`액티브 ${row.index+1}`;
      const before=title(row.before),after=row.after?title(row.after):'미장착';
      return `<li><small>${slot}</small><strong>${esc(before)} → ${esc(after)}</strong>${row.lost.length?`<span>해제되는 보조 · ${esc(row.lost.map(link=>`${title(link.supportId)} Lv.${link.level}`).join(' · '))}</span>`:''}</li>`;
    }).join('')}</ul></section>`;
  }
  else content = slotEditor(s);
  if(type==="memory")content=shelfTools("memory",s.overlay.index,!!s.document.targetBuild.hero?.memories?.[s.overlay.index],button)+content;
  const titles = { 'reset-build':'빌드 초기화', shelf:"보관함", share: "빌드 공유", saves: "저장 빌드", files: "빌드 파일", screenshot:'스크린샷 가져오기', "local-log": "게임 로그 가져오기", effects: "효과별 출처", hero: "히어로 선택", traits: "히어로 특성", memory: "히어로 추억", talents: "재능 편집", pact: "정령 편집", extensions: "영약·모듈화" };
  const heading = type==='ring-swap'?'좌우 반지 교환':type==='workshop'?(s.overlay.kind==='gear'?'장비 제작':'추억 제작'):type==='memory'?seasonMemoryOptions(s.overlay.index).name:type==='ingame-code'?'인게임 빌드코드 조회':titles[type] ?? "빌드 편집";
  const heroCandidate=type==='hero'?s.overlay.candidate:null;
  const footer = type==='hero' ? drawerDps(s,heroCandidate?.comparison,button('히어로 적용','apply-hunter',heroCandidate?'':'disabled'),heroCandidate??undefined)
    : type==='shelf' ? shelfFooter : ['saves','share'].includes(type) ? '' : type==='extensions' ? renderDrawerBar(s) : type==='ring-swap'
    ? `<footer>${button('교환','apply-ring-swap')}${button('취소','close')}</footer>`
    : `<footer>${type==='reset-build'?button('초기화','confirm-reset-build')+button('취소','close'):`${!["workshop","shelf","share","local-log", "files", "saves", "effects", "hero", "screenshot", "ingame-code"].includes(type) ? button("적용", "apply") : ""}${button("닫기", "close")}`}</footer>`;
  return `<div class="season-native-backdrop"><section role="dialog" aria-modal="true" aria-label="SS14 ${heading}" class="season-native-modal${['files','reset-build','screenshot'].includes(type)?' file-transfer-modal':''}${type==='extensions'?' extension-workspace':type==='hero'?' hero-workspace':''}"><header><h2 tabindex="-1" data-role="dialog-heading">${heading}</h2>${type==='share'&&s.overlay.savedList?button('목록으로','close','aria-label="저장 목록으로"'):button("닫기", "close", 'aria-label="편집 닫기"')}</header>${s.error ? `<p role="alert">${esc(s.error)}</p>` : ""}<div class="season-native-modal-body">${content}</div>${footer}</section></div>`;
}
export function renderNativeDps(s) {
  const dps = s.report.fullDps;
  const active = s.resultTab ?? 'stats';
  const review = !s.pending.size ? seasonPartialDpsReview(s.document,s.report) : null;
  const partial = review?.confirmation===s.partialDpsConfirmation ? review : null;
  const showEstimate = !partial && s.report.assumedDps?.supported && !dps.supported && !s.pending.size;
  const hasSkill = s.report.components.some(component=>component.category==='skills');
  const blockedStatus = hasSkill ? seasonDpsStatusLabel(s.report) : '스킬 미장착';
  const status = s.pending.size ? '입력 적용 대기' : dps.supported || partial
    ? (partial?.dps??dps.dps).toLocaleString('ko-KR', { maximumFractionDigits:2 }) : blockedStatus;
  const dpsLink = hasSkill && !dps.supported && !s.pending.size && active !== 'calculation'
    ? review ? button(partial?'제외 항목 보기':'미지원 항목 보기','result-tab',
      'data-tab="calculation" data-focus-role="partial-dps-review"')
      : button(blockedStatus === '입력 필요' ? (showEstimate?'전체 DPS 입력':'입력 항목 보기') : '보류 이유 보기',
        'result-tab', 'data-tab="calculation" data-show-dps="true" data-focus-role="calculation-requirements"') : '';
  const panels = {
    stats: () => `<div data-role="native-numeric-result"${s.pending.size ? ' hidden' : ''}>${renderSeasonNumericStats(s.report,{query:s.numericOptionQuery})}</div>`,
    calculation: () => {
      const sharedSkillIssues = new Set();
      if (!dps.supported && !review) {
        const seen = new Set();
        for (const row of dps.rows) {
          for (const reason of new Set(selectedSkillInputIssues(dps,row))) {
            if (seen.has(reason)) sharedSkillIssues.add(reason);
            seen.add(reason);
          }
        }
      }
      const skill = renderSkillCalculation(s,{partial:!!partial,showIssues:!review,sharedSkillIssues});
      const requirements = dps.supported||partial ? '' : renderDpsRequirements(s,{hideExact:!!review,sharedSkillIssues});
      const breakdown = (showEstimate ? s.report.assumedDps.rows : dps.rows).length
        ? dpsResults(s.report, { embedded: true,partial:!!partial }) : '';
      const excludedByReason=new Map();
      for(const row of review?.excluded??[]){
        const card=SS14_CARDS.records[row.id];
        const index=row.rowIndex;
        const slot=index===0?'주력':index<5?`액티브 ${index+1}`:`패시브 ${index-4}`;
        const label=`${slot} · ${card?.koreanTextVerified?card.name:'스킬'}`;
        const edit=button(esc(label),'inspect-calculation-skill',`data-index="${index}" data-return-role="partial-dps-review" aria-label="${esc(label)} 편집"`);
        for(const reason of new Set(row.blockers)){
          if(!excludedByReason.has(reason))excludedByReason.set(reason,[]);
          excludedByReason.get(reason).push(edit);
        }
      }
      const excluded=review?`<details data-role="partial-dps-review"${partial?' open':''}><summary>${partial?'DPS에서 제외한 항목':'TOB 미지원 항목'}</summary>
        <ul>${[...excludedByReason].map(([reason,slots])=>`<li><div>${esc(reason)}</div><div class="excluded-skill-slots">${slots.join('')}</div></li>`).join('')}</ul>
        ${button(partial?'제외 취소':'91TOB에서도 미지원일 때 제외','confirm-partial-dps',`data-role="partial-dps-toggle" aria-pressed="${!!partial}"`)}</details>`:'';
      return `<div data-role="native-calculation-detail"${s.pending.size ? ' hidden' : ''}>${excluded}${s.showDpsNotes ? requirements+skill : skill+requirements}${partial?'':renderUptimeDetails(s)}${breakdown}${renderCalculationNotes(s)}</div>`;
    },
    conditions: () => renderResultConditions(s),
    analysis: () => renderResultAnalysis(s,{partial}),
  };
  return `<aside class="native-dps-dock" id="native-dps-summary" tabindex="-1" aria-label="SS14 계산 결과">
    ${mobileDpsBar(s,esc(blockedStatus),{partial,review})}
    ${button('‹ 편집으로','return-mobile-edit','class="mobile-edit-return" aria-label="빌드 편집으로 돌아가기"')}
    <div class="native-result-summary">${showEstimate ? renderAssumedDps(s, true) : ''}<small${showEstimate ? ' hidden' : ''}>${partial?'부분 DPS · 미지원 제외':'전체 DPS'}</small><strong data-role="native-dps"${showEstimate ? ' hidden' : ''}>${status}</strong>
    ${s.rankTrialOrigin?button('기준 빌드 분석으로 돌아가기','return-rank-origin','data-role="return-rank-origin"'):''}
    ${partial?'':renderEditDpsComparison(s, true)}
    ${dpsLink}
    ${s.pending.size ? `<div class="native-result-actions">${button('계산 적용', 'apply')}</div>` : ''}</div>
    <nav class="native-result-tabs" aria-label="계산 결과 보기">${RESULT_TABS.map(([key,label]) => button(label, 'result-tab', `data-tab="${key}" data-role="result-tab-${key}" aria-pressed="${active === key}" aria-controls="native-result-panel"`)).join('')}</nav>
    <section id="native-result-panel" class="native-result-panel" aria-label="${RESULT_TABS.find(([key]) => key === active)?.[1] ?? '수치'}">${(panels[active] ?? panels.stats)()}</section></aside>`;
}
function renderDpsRequirements(s,{hideExact,sharedSkillIssues}) {
  const dps=s.report.fullDps;
  const estimate=s.report.assumedDps;
  const selectedIndex=s.calculationIndex??dps.rows[0]?.rowIndex;
  const selected=dps.rows.find(row=>row.rowIndex===selectedIndex);
  const inline=new Set(s.showDpsNotes?[]:selectedSkillInputIssues(dps,selected));
  const blockers=hideExact?[]:dps.blockers.filter(reason=>!inline.has(reason)||
    dps.rows.some(row=>row!==selected&&row.blockers.includes(reason)));
  const exactReasons=new Set(dps.blockers);
  const estimateReasons=estimate?.supported===false?estimate.blockers.filter(reason=>!exactReasons.has(reason)):[];
  return blockers.length || estimateReasons.length ? `<details class="native-calculation-notes" data-role="calculation-requirements"${s.showDpsNotes||sharedSkillIssues.size?' open':''}><summary>전체 DPS 보류 이유</summary>
    <div class="native-requirements" data-role="numeric-dps-requirements" aria-label="계산에 필요한 입력">${renderReasons(s,blockers)}
    ${estimateReasons.length?`<section data-role="assumed-dps-reasons" aria-label="방어 전 DPS 보류 이유"><h3>방어 전 DPS</h3>${renderReasons(s,estimateReasons,estimate)}</section>`:''}</div></details>` : '';
}
function renderCalculationNotes(s) {
  const dps=s.report.fullDps;
  return `<details class="native-calculation-notes" data-role="calculation-notes"><summary>계산 상세</summary>
    ${s.report.assumedDps && dps.supported ? renderAssumedDps(s) : ''}
    ${renderNumbedCalculation(s)}
    ${dps.burstRecovery?`<details><summary>크리에이티브 대폭발 · 기발 회복</summary><p>${dps.burstRecovery.total!==null?`기발 회복 ${dps.burstRecovery.total} (상한 적용 전)`:dps.burstRecovery.rows.length?'회복 미확정 · 전투 조건에서 발동별 결과 확인':'전투 조건에서 매직 버스트 발동 기록 입력'}</p></details>`:''}
    <details data-role="native-effect-detail"><summary>근거·지원 범위</summary>${button('효과별 출처', 'effect-sources')}${button('특성 지원표', 'section', 'data-section="support-matrix"')}
      <details><summary>카드별 검증 내역</summary>${componentResults(s.report)}</details>
      <details data-role="native-defense-detail"><summary>자원·방어 계산 근거</summary>${characterResults(s.report)}</details></details></details>`;
}
function renderObservedElixirUptime(s) {
  const assumed=!s.report.fullDps.supported&&s.report.assumedDps?.supported;
  const uptime=assumed?(s.report.assumedDps.timedElixirPhases??s.report.assumedDps.elixirUptime)
    :(s.report.theaAverage?.elixirPhases??s.report.elixirUptime);
  if(!uptime?.supported)return '';
  const fmt=value=>value.toLocaleString('ko-KR',{maximumFractionDigits:2});
  const mp=value=>Number.isFinite(value)?fmt(value):'확인 필요';
  const basis=assumed?'방어 전 DPS':'전체 DPS';
  const result=assumed?s.report.assumedDps:s.report.fullDps;
  const combinedChannelCost=uptime.states.some(row=>row.channelCostTotalOnly);
  const partial=uptime.states.length>1;
  const mpByState=row=>{
    if(uptime.timed&&!Number.isFinite(row.manaPerSecond))return '—';
    const value=row.channelCostTotalOnly?row.manaExcludingCombinedChannels:row.manaPerSecond;
    const contribution=row.channelCostTotalOnly?row.weightedManaExcludingCombinedChannels:row.weightedManaPerSecond;
    if(row.channelCostTotalOnly&&value===undefined)return '—';
    return mp(value)+(partial&&Number.isFinite(contribution)?`<small class="elixir-mp-contribution">반영 ${fmt(contribution)}</small>`:'');
  };
  return `<details data-role="observed-elixir-uptime"><summary>${uptime.timed?'전투 시간표의 영약 가동률':'영약 유지율'} · ${basis}</summary>
    <ul>${uptime.rows.map(row=>`<li>${esc(row.name)} · ${fmt(row.uptime)}%</li>`).join('')}</ul>
    <table class="slot-dps-table" aria-label="영약 상태별 DPS 기여와 MP"><thead><tr><th scope="col">활성 영약</th><th scope="col">시간 비율</th><th scope="col">상태 DPS</th><th scope="col">반영 DPS</th><th scope="col">수동 소모 MP/초${combinedChannelCost?'<small class="elixir-mp-contribution">상태별 집중 제외</small>':''}</th></tr></thead>
      <tbody>${uptime.states.map(row=>`<tr><th scope="row">${row.active.map((on,i)=>on?esc(uptime.rows[i].name):'').filter(Boolean).join(' · ')||'없음'}</th><td>${fmt(row.uptime)}%</td><td>${fmt(row.dps)}</td><td>${fmt(row.weightedDps)}</td><td>${mpByState(row)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><th scope="row" colspan="3">${basis}</th><td>${fmt(result.dps)}</td><td>${mp(result.manualResources?.manaPerSecond)}</td></tr></tfoot></table>
    ${uptime.timed?'<p>지속 대미지와 후속타는 대미지가 발생한 시점의 영약 상태에 집계합니다.</p>':''}
    ${combinedChannelCost||uptime.combinedChannelCost?'<p>집중 스킬의 MP 소모는 전체 관측 차감 횟수로 계산해 합계에 포함합니다.</p>':''}
    ${button('영약 조건 편집','requirement',`data-section="combat" data-focus-role="${uptime.timed?'season-thea-controls':'native-extension-input'}"`)}</details>`;
}
function renderAssumedDps(s, primary = false) {
  const estimate=s.report.assumedDps;
  const fmt=n=>n.toLocaleString('ko-KR',{maximumFractionDigits:2});
  return `<div class="native-assumed-line${primary?' is-primary':''}"><span>${SEASON_ADVISOR_METRICS.assumedDps}</span><strong data-role="assumed-dps">${s.pending.size?'입력 적용 대기':estimate.supported?fmt(estimate.dps):'확인 필요'}</strong></div>`;
}
function renderUptimeDetails(s) {
  const estimate=s.report.assumedDps;
  const exact=s.report.fullDps.supported;
  if(s.pending.size||(!exact&&!estimate?.supported))return '';
  const observed=renderObservedElixirUptime(s);
  const rows=estimate?.uptimeDetails??[];
  if(exact&&!rows.length&&!observed)return '';
  const fmt=value=>value.toLocaleString('ko-KR',{maximumFractionDigits:2});
  return `<details data-role="native-uptime-details"><summary>가동률 적용 내역 · ${exact?'전체 DPS':'방어 전 DPS'}</summary>
      ${exact?'':`<p>적 아머·저항·관통 제외${estimate.defaults.length?' · '+esc(estimate.defaults.join(' · ')):''}</p>`}
      ${rows.length?`<ul>${rows.map(row=>{
        const applied=exact?row.setting:row.assumed;
        const contribution=exact?row.inputContribution:row.contribution;
        const alternateDps=exact?row.contribution:row.inputContribution;
        const alternate=[row.setting!==row.assumed?esc(exact?row.assumed:row.setting):'',
          Number.isFinite(alternateDps)&&(!Number.isFinite(contribution)||fmt(alternateDps)!==fmt(contribution))?`${fmt(alternateDps)} DPS`:''].filter(Boolean);
        const other=alternate.length?` <small>${exact?'방어 전':'입력'} ${alternate.join(' · ')}</small>`:'';
        const edit=row.input?button('조건 수정','requirement',`data-section="combat" data-field="${esc(row.input.edit)}" data-field-key="${esc(row.input.key)}" aria-label="${esc(row.name)} 조건 수정"`):'';
        return `<li><b>${esc(row.name)}</b>${edit}<br>${row.buffState?'':'적용 '}${esc(applied)}${Number.isFinite(contribution)?` · ${fmt(contribution)} DPS`:''}${other}<br>${esc(row.method)}</li>`;
      }).join('')}</ul>`:''}
      ${observed}${button('전투 조건 보기','result-tab','data-tab="conditions"')}</details>`;
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
  const body = scene.section === "overview" ? `<div class="build-overview">${heroPanel(scene)}<div class="overview-loadout">${equipmentPanel(scene,'skills')}${equipmentPanel(scene,'gear')}</div>${homeBoards(scene)}</div>` : s.section === "hero" ? heroPanel(s) : ["skills", "gear"].includes(s.section) ? equipmentPanel(s, s.section)
    : boardTitles[s.section] ? boardOverview(s) : s.section==='support-matrix'?renderSeasonSupportMatrix(s):combatPanel(s);
  return `<div class="season-native" data-role="ss14-main-editor"><header class="planner-header"${s.overlay?' inert':''}><strong class="native-brand">TOB <small>SS14</small></strong><label class="build-chip"><input id="ss14BuildName" aria-label="빌드 이름" data-role="build-name" data-season-edit="name" value="${esc(s.document.targetBuild.name)}" maxlength="160" /></label>${renderEditHistory(s)}<div class="header-primary-actions">${button("저장", "save")}${button("불러오기", "saves", 'data-role="open-saves"')}${button("공유", "share", 'data-role="open-share"')}${button("빌드 파일", "files", 'data-role="open-files"')}${button('초기화','reset-build','data-role="reset-build" aria-label="빌드 초기화"')}</div><span role="status" data-role="native-save-status">${esc(nativeSaveStatus(s))}</span></header>
    <nav class="quick-category-menu${s.navCollapsed?' is-folded':''}"${s.overlay?' inert':''} aria-label="빌드 편집 메뉴">${button(s.navCollapsed?'☰':'‹','toggle-navigation',`class="nav-toggle" data-role="nav-toggle" aria-label="메뉴 ${s.navCollapsed?'펼치기':'접기'}" aria-expanded="${!s.navCollapsed}"`)}${tabs.filter(([id])=>id!=='support-matrix').map(([id, label]) => button(label, "section", `data-section="${id}" aria-pressed="${scene.section === id}"`)).join("")}</nav>
    <div class="native-content"${s.overlay?' inert':''}><main class="season-native-scroll" tabindex="-1"><section class="planner-section ${scene.section === "hero" ? "hero-section" : ""}"><h1${hasPanelHeading?' class="panel-heading-accessible"':''}>${esc(tabs.find(([id]) => id === scene.section)?.[1])}</h1>${s.error&&!['board','files'].includes(s.overlay?.type) ? `<p role="alert">${esc(s.error)}</p>` : ""}${body}</section></main>
    ${renderNativeDps(s)}</div>
    ${overlay(s)}</div>`;
}
