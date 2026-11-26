import { matchingTrainingDummy, trainingDummySelection } from "./seasonTrainingDummy.js";
import { usesExtensionInput } from './seasonExtensions.js';
import { downloadJson } from "./downloadJson.js";
import { isOfflineEdition, setPlannerHtml } from "./offlinePresentation.js";
import { createSeasonWorkspace, resetSeasonWorkspace, editSeasonWorkspace, loadSeasonWorkspaces, saveSeasonWorkspace, saveSeasonWorkspaces, deleteSeasonWorkspace, exportSeasonWorkspace, importSeasonWorkspace } from "./seasonWorkspace.js";
import { prepareSeasonMigration } from "./seasonMigration.js";
import { calculateEditorSeasonBuild } from "./seasonAssumedDps.js";
import { seasonPartialDpsReview } from "./seasonCalculationIssues.js";
import { talentSearchKey } from "./seasonBoardScenes.js";
import { renderSeasonPlanner, renderNativeDps, renderEditHistory, renderEffectSources, renderBoardComparison, renderDrawerBar, renderSkillPickerFooter, renderSkillCandidateResult, renderEquippedSkillStats, renderSupportSearchSlots, skillSealSummary, nativeSaveStatus, compareBoardOptions } from "./seasonPlannerView.js";
import { BOARD_TITLES, plannerSearchKey, pickerSearchMatcher } from './seasonEditorTools.js';
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { seasonExclusiveSupportSlots } from "./seasonSupport.js";
import { filterSeasonSelection } from "./seasonSelectionSearch.js";
import { createSeasonEditHistory } from "./seasonEditHistory.js";
import { rebindLogGear } from "./seasonLogGear.js";
import { readLocalGameLog, previewLocalGameLog, applyLocalGameLog } from "./localGameLogImport.js";
import { assertLocalLogAccess } from "./runtimePolicy.js";
import { createSlateEditorState, filterSlateOptions, handleSlateEditorAction, slateEditorBoard, showSlateFootprint, slatePreviewOffsets } from './seasonSlateEditor.js';
import { recommendSeasonWorkspaces, SEASON_ADVISOR_METRICS, preferredSeasonDpsMetric } from './seasonAdvisor.js';
import { RESULT_TABS, seasonCastShareSlots } from './seasonResultPanels.js';
import { rankTrialInputs } from './seasonInputRequirements.js';
import { SEASON_DPS_SKILL_FIELDS, seasonDotWindowTrim, seasonDotWindowRepairs, seasonDotWindowRole, seasonDotWindowMerge } from './seasonDps.js';
import {rankSeasonUpgrades,copySeasonUpgrade,copySeasonSkillTrial,copySeasonGearTrial,GEAR_UPGRADE_SOURCES,BLOCKED_CANDIDATE_PAGE_SIZE,RANKED_CANDIDATE_PAGE_SIZE,CRAFT_RANK_TIERS} from './seasonUpgradeRanking.js';
import { createSeasonEditComparison, encounterInputChanges } from './seasonEditComparison.js';
import { captureShelf, readShelf, SHELF_KEY } from './seasonShelf.js';
import { createItemWorkshop, editItemWorkshop, finishedWorkshopItem, openGearWorkshop } from './seasonItemWorkshop.js';
import { itemGearKind } from './seasonItemCraft.js';
import { activeSkillExtension, nativeElixirOptions, nativeModuleForItem } from './seasonNativeExtensions.js';
import { compareSeasonDamageBreakdown, compareSeasonResourceCosts, compareSeasonSkillLevels, compareSavedGear, previewSlotEdit } from './seasonGearPicker.js';
import { observedManaInputState } from './seasonWorkspaceView.js';
import { getSeasonSelectionOptions, isTwoHandedWeapon, SEASON_GEAR_SLOT_LABELS } from './seasonSelections.js';
import { createDefaultBuild, normalizeBuild } from './engine.js';
import { seasonTalentNodes } from './seasonNativeSelections.js';
import { pactDestinyPath } from './seasonDestiny.js';
import { effectSourceEditor } from './seasonEffectSources.js';
import {prismForm} from './seasonPrismEditor.js';
import {inverseFields,inverseGeometry} from './seasonInverseImage.js';
import { hasRevelation, revelationNodeOptions } from './seasonTheaRevelation.js';
import { encodeBuildCode, decodeBuildCode, buildShareUrl, sharedCodeFromHash } from './seasonBuildCode.js';
import { canLookUpIngameBuild, lookUpIngameBuild } from './seasonIngameBuildCode.js';
import { prepareIngameBuildImport } from './seasonIngameBuildImport.js';
import {customOptionEditorText} from './seasonCustomOptions.js';
import { filterSpiritPicker, SPIRIT_PICKER_GROUPS } from './seasonSpiritPicker.js';
import { newSeasonTalentAllocationIssue } from './seasonAllocation.js';
import {createSeasonDraft} from './seasonDraft.js';
import {SUPPORT_CATEGORIES,supportSearchKey} from './seasonSupportMatrix.js';
import {containsHanScript} from './gameTextPresentation.js';
import {findSeasonScreenshotGearValues,findSeasonScreenshotSkillLevel,seasonScreenshotTargets} from './seasonScreenshotImport.js';
import {normalizeScreenshotRegion,screenshotRegionFromPoints} from './screenshotRecognition.js';

export const ACTIVE_SEASON_WORKSPACE_KEY = "tob.activeSeasonWorkspace.v1";
const partialDpsKey = id => `tob.partialDpsConfirmation.v1.${id}`;
function describeLoadoutChanges(before,after){
  return {
    gearChanges:compareSavedGear(before,after),
    boardChanges:['hero',...Object.keys(BOARD_TITLES)].flatMap(section=>{
      const rows=compareBoardOptions(before,after,section,{withSlotLabels:true});
      return rows.length?[{section,rows}]:[];
    }),
  };
}
const stringKinds = new Set(["name", "custom-options", "hero-selection", "hero-choice", "skill-selection", "gear-selection", "support-selection", "memory-selection", "slate-affix", "talent-board", "spirit-selection", "destiny-selection", "thea-board", "elixir-selection", "elixir-ingredient", "module-selection", "module-option", "nether-layout", "nether-quality", "nether-banishment"]);
export function readSeasonPlannerEdit(input) {
  const d = input.dataset, kind = d.seasonEdit;
  const dpsField = kind==='dps-input' ? SEASON_DPS_SKILL_FIELDS[d.key?.split(':')[1]] : null;
  const rowIndex = kind === 'elixir-selection' && d.row === undefined ? undefined : Number(d.row);
  return { kind, rowIndex, supportIndex: Number(d.support), slotIndex: Number(d.slot), key: d.key ?? d.choice ?? d.roll,
    value: stringKinds.has(kind) || kind==='bing-event-source' || kind==='memory-tier' ? input.value
      : dpsField?.times || dpsField?.windows ? input.value.trim()
      : String(input.value).trim() === "" ? "" : Number(input.value) };
}
const editKey = e => JSON.stringify([e.kind, e.rowIndex, e.supportIndex, e.slotIndex, e.key]);
const import91SectionLabels=new Map(Object.entries({
  character:'캐릭터 레벨',hero:'히어로·특성·추억',skills:'스킬·보조',gear:'장비',talents:'재능',
  divinity:'신격 석판',pactspirits:'정령·숙명',pact:'정령·숙명',combat:'전투 조건',conditions:'전투 조건',
  custom:'사용자 옵션',customAffixes:'사용자 옵션',options:'빌드 설정',extensions:'추가 설정',
}));
function import91Error({reason,issues=[]}) {
  if(reason==='context-unavailable')return '91TOB 파일을 확인할 데이터를 불러오지 못했습니다.';
  if(reason==='unsupported-external-schema-version'||issues.some(({code})=>
    code==='91tob-client-version-unsupported'||code==='91tob-module-version-unsupported'))
    return '지원하지 않는 91TOB 파일 버전입니다.';
  if(issues.some(({code})=>code==='json-size-limit-exceeded'))return '91TOB 파일이 5MB를 초과합니다.';
  const sections=[...new Set(issues.map(({path})=>import91SectionLabels.get(path?.split(/[.\[]/u)[0])).filter(Boolean))];
  if(sections.length)return `91TOB 파일을 열 수 없습니다. ${sections.join(', ')} 구성을 확인하세요.`;
  return reason==='external-format-unsupported'
    ?'이 91TOB 파일에 가져올 수 없는 구성이 있습니다.'
    :'91TOB 파일 형식을 확인하세요.';
}

const isExtensionHostEdit=kind=>kind==='elixir-selection'||kind==='module-selection';
function filterModuleOptionSelectors(input){
  const region=input.closest('.native-module-options');
  let hasMatch=false;
  for(const selector of region.querySelectorAll('select[data-season-edit="module-option"]'))
    if(filterSeasonSelection(selector,input.value)>0)hasMatch=true;
  region.querySelector('[data-module-option-empty]').hidden=hasMatch;
}
const shelfFits = (entry,kind,index) => entry.kind === kind && (kind === 'gear'
  ? getSeasonSelectionOptions('gear',index).some(o => o.id === entry.item.itemId) : kind !== 'memory' || entry.index === index);

// The current editor has one SS14 document and one calculation. Historical
// build keys are never written here, including when no SS14 copy exists yet.
export function createSeasonPlanner(storage, sourceBuild, { sourceUnavailable = false, recoverDraft = false } = {}) {
  const readPartialDpsConfirmation = id => {
    if (!id) return null;
    try { return storage.getItem(partialDpsKey(id)) || null; }
    catch { return null; }
  };
  const loaded = loadSeasonWorkspaces(storage);
  let selectedId;
  try { selectedId = storage.getItem(ACTIVE_SEASON_WORKSPACE_KEY); } catch { /* Loading error remains visible below. */ }
  const latest = rows => [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  let document = loaded.documents.find(d => d.id === selectedId)
    ?? latest(loaded.documents.filter(d => d.sourceBuild.id === sourceBuild.id)) ?? latest(loaded.documents);
  let error = loaded.error;
  if (!document && sourceUnavailable) error = "저장된 빌드를 읽을 수 없어 원본을 보호하고 있습니다. 저장소 접근을 복구한 뒤 다시 여세요.";
  if (!document && !error) {
    try { document = createSeasonWorkspace(prepareSeasonMigration(sourceBuild)); }
    catch (e) { error = e.message; }
  }
  const draft=recoverDraft&&!error?createSeasonDraft(storage,loaded.documents):null;
  if(draft?.recovered)document=draft.recovered;
  let savedDocument=loaded.documents.find(d=>d.id===document?.id)??null;
  const state = { document, documents: loaded.documents, section: "overview", overlay: null, dirty: !!draft?.recovered, pending: new Map(), error, notice: draft?.recovered?(draft.copied?'미저장 변경을 복구 사본으로 열었습니다.':'미저장 변경을 복구했습니다.'):'', draftError:draft?.error??'', report: null,
    partialDpsConfirmation: readPartialDpsConfirmation(document?.id),
    history: createSeasonEditHistory(), gearIndex: 0, skillIndex: 0, supportIndex: null, picker: null, logImport: null, slateEditor:createSlateEditorState(), resultTab:'stats', analysisMetric:null, analysis:null };
  function defaultSavedDpsMetric() {
    const review=seasonPartialDpsReview(state.document,state.report);
    return review && review.confirmation===state.partialDpsConfirmation ? 'partialDps' : preferredSeasonDpsMetric(state.report);
  }
  let savedTarget = document ? JSON.stringify((savedDocument??document).targetBuild) : "", logRequest = 0;
  let rankingRequested = false;
  if(draft?.recovered&&savedDocument)state.history.record(savedDocument.targetBuild,document.targetBuild);
  function persistDraft(){
    if(!draft||!state.document)return;
    try {
      if(state.dirty)draft.save(state.document,savedDocument);
      else draft.clear();
      state.draftError='';state.draftSaved=state.dirty;
    } catch(e){state.draftSaved=false;state.draftError=e.message||'임시 저장에 실패했습니다. 저장 버튼으로 빌드를 보관하세요.';}
  }
  let root;
  function currentBuildCopy(suffix) {
    const copy=importSeasonWorkspace(exportSeasonWorkspace(state.document));
    copy.targetBuild.name=copy.targetBuild.name.slice(0,160-suffix.length)+suffix;
    return copy;
  }
  function openIncomingCopy(document,notice) {
    api.flush();
    const backup=state.dirty?currentBuildCopy(' · 편집 사본'):null;
    saveSeasonWorkspaces(storage,backup?[backup,document]:[document]);
    api.open(document.id,{preserveCurrent:true});
    state.notice=notice+(backup?' 이전 편집은 사본으로 저장했습니다.':'');
  }
  function captureAnalysisOrigin() {
    if(!state.dirty&&savedDocument?.id===state.document.id)return null;
    return currentBuildCopy(' · 분석 기준 사본');
  }
  const rankControls=['upgradeGroup','upgradeSlot','replacementSlot','upgradeSkill','upgradeSource','upgradeResultDirection','upgradeGearName',
    'assembleEquipment','assembleCraft','assembleRolls','includeUpgradeCorrosion','lockedEquipmentSlots','upgradeCraftTier','upgradeCraftMaximum'];
  const rankBasis=document=>JSON.stringify([document.sourceBuild,document.targetBuild]);
  const rankCopyBasis=document=>JSON.stringify([document.sourceBuild,{...document.targetBuild,name:undefined}]);
  function matchingRankCopy(row,documents){
    const copy=row.saved?documents.find(document=>document.id===row.saved):null;
    return copy&&rankCopyBasis(copy)===row.savedBasis?copy:null;
  }
  function rememberRankCopy(row,document){
    row.saved=document.id;
    row.savedBasis=rankCopyBasis(document);
  }
  function forgetRankCopy(row){
    delete row.saved;
    delete row.savedBasis;
  }
  const gearShelfBasis=rows=>JSON.stringify(rows.filter(row=>row.kind==='gear'));
  function captureRankReturn(document,{blockedIndex,openedIndex,inputIndex}={}) {
    return {basis:rankBasis(document),job:state.upgrades,blockedIndex,openedIndex,inputIndex,
      partialConfirmation:state.upgrades?.partial?state.partialDpsConfirmation:null,
      controls:Object.fromEntries(rankControls.map(key=>[key,state[key]]))};
  }
  try { state.shelfCount=readShelf(storage).length; } catch { /* Opening the shelf reports the storage error. */ }
  function storeEntry(entry) {
    return storeEntries([entry]);
  }
  function writeShelf(list,gearChanged) {
    storage.setItem(SHELF_KEY,JSON.stringify(list));
    state.shelfCount=list.length;
    if(gearChanged&&state.upgrades?.usesShelf){
      state.upgrades=null;
      if(state.resultTab==='analysis')void api.rank();
    }
  }
  function storeEntries(entries) {
    const list=readShelf(storage);
    const signature=({id,name,originalName,...rest})=>JSON.stringify({
      ...rest,name:originalName??name,item:{...rest.item,instanceId:undefined},
    });
    for(let entry of entries) {
      const existing=list.findIndex(row=>signature(row)===signature(entry));
      if(existing>=0) entry=list.splice(existing,1)[0];
      list.push(entry);
    }
    writeShelf(list,entries.some(entry=>entry.kind==='gear'));
    return list;
  }
  function keepConfirmed(kind,index,entry) {
    try { storeEntry(entry??captureShelf(state.document.targetBuild,kind,index)); }
    catch { state.notice='빌드에 적용했습니다. 보관함에 저장하지 못했습니다.'; }
  }
  function openShelf(list,kind,index,all=false) {
    state.shelfCount=list.length;
    state.shelfRows=list.filter(row=>all?row.kind===kind:shelfFits(row,kind,index)).reverse();
    state.overlay={type:'shelf',kind,index,all,counts:Object.fromEntries(['memory','gear','divinity','prism'].map(k=>[k,list.filter(row=>row.kind===k).length]))};
  }
  function shelfGearTargets(entry,build) {
    const main=normalizeBuild(build).gear.slots[0]?.itemId;
    return SEASON_GEAR_SLOT_LABELS.flatMap((_,index)=>
      (index!==1||!isTwoHandedWeapon(main))&&shelfFits(entry,'gear',index)?[index]:[]);
  }
  function previewShelfItem(entry, preferredIndex=entry.index) {
    const panel=state.overlay, baseline=panel.boardDraft??state;
    const build=baseline.document.targetBuild;
    const targets=entry.kind==='prism'
      ?[1,2,3].filter(index=>(panel.all||index===panel.index)&&entry.bindings?.tree&&build.talents?.boards?.[index]?.treeSlug===entry.bindings.tree)
      :panel.all&&entry.kind==='gear'?shelfGearTargets(entry,build):[panel.all?entry.index:panel.index];
    const index=targets.includes(preferredIndex)?preferredIndex:targets.includes(entry.index)?entry.index:targets[0];
    let preview=null,previewError='';
    if(index!==undefined){
      try {
        preview=previewSlotEdit(baseline.document,baseline.report,{kind:'shelf-apply',slotIndex:index,value:entry,
          newSlatePage:entry.kind==='divinity'&&panel.slatePageTarget!=='current'},{includeSnapshot:true});
      } catch (error) {
        if(entry.kind!=='prism')throw error;
        previewError=error.message;
      }
    }
    Object.assign(panel,{candidate:entry.id,candidateIndex:index,candidateTargets:targets,preview,previewError});
  }
  let viewportEvents;
  let customOptionTimer;
  let skillCandidateTimer;
  let mobileEditReturn;
  let editComparison;
  const workshop=()=>state.overlay?.type==='workshop'?state.overlay:
    state.overlay?.type==='gear'&&state.picker?.candidate?state.picker.draft:null;
  function followSkillSwap(edit){
    const panel=state.overlay?.type==='skills'?state.overlay:null;
    if(edit?.kind==='support-swap'){
      if(!panel)return;
      const {rowIndex,supportIndex:from,value:to}=edit;
      const move=index=>index===from?to:index===to?from:index;
      if(panel.index===rowIndex){
        const next=move(panel.supportIndex);
        if(next!==panel.supportIndex)state.focusRole='slot-detail-heading';
        state.supportIndex=panel.supportIndex=next;
        delete panel.skillSwap;
      }
      if(panel.originSlot?.index===rowIndex)panel.originSlot={...panel.originSlot,support:move(panel.originSlot.support)};
      return;
    }
    if(edit?.kind!=='skill-swap')return;
    const {rowIndex:from,value:to}=edit;
    const move=index=>index===from?to:index===to?from:index;
    state.calculationIndex=move(state.calculationIndex);
    state.skillIndex=move(state.skillIndex);
    if(/^[0-4]$/u.test(state.upgradeSkill??''))state.upgradeSkill=String(move(Number(state.upgradeSkill)));
    if(panel){
      panel.index=move(panel.index);
      delete panel.skillSwap;
      if(panel.originSlot)panel.originSlot={...panel.originSlot,index:move(panel.originSlot.index)};
    }
  }
  function saveRankExclusions(document,row){
    if(!row.partialConfirmation)return;
    const report=calculateEditorSeasonBuild(document.targetBuild,{sourceBuild:document.sourceBuild});
    const review=seasonPartialDpsReview(document,report);
    if(review)try{storage.setItem(partialDpsKey(document.id),review.confirmation);}catch{}
  }
  function syncCandidate(){
    const picker=state.picker;
    if(!picker?.candidate||!picker.draft||picker.previewDocument===picker.draft.document)return;
    picker.edit={kind:'shelf-apply',slotIndex:picker.draft.index,value:finishedWorkshopItem(picker.draft)};
    picker.preview=previewSlotEdit(state.document,state.report,picker.edit);
    picker.removalPreview=null;
    picker.previewDocument=picker.draft.document;
  }
  function resetGearCandidate(changes={}) {
    const {query='',filter='',gearKind=''}=state.picker??{};
    state.picker={query,filter,gearKind,candidate:'',...changes};
  }
  function selectGearCandidate(index,id){
    const build=state.document.targetBuild;
    const panel=state.overlay?.type==='gear'&&state.overlay.index===index?state.overlay:null;
    if(panel&&panel.draftBuild!==build){
      panel.draftBuild=build;
      panel.gearDrafts=new Map();
    }
    const draft=itemGearKind(id)?panel?.gearDrafts.get(id)??openGearWorkshop(index,build,id):null;
    if(draft)panel?.gearDrafts.set(id,draft);
    const edit={kind:'gear-selection',slotIndex:index,value:id};
    state.picker={...state.picker,candidate:id,draft,previewDocument:null,removalPreview:null,edit,preview:draft?null:previewSlotEdit(state.document,state.report,edit)};
    if(draft?.pending.size)api.flushWorkshop();
    syncCandidate();
  }
  function selectSkillCandidate(id,level=state.picker?.levels?.[id],auraActive=state.picker?.auraStates?.[id]){
    const support=Number.isInteger(state.supportIndex);
    const rowIndex=state.skillIndex;
    if(!support&&level===undefined){
      const skills=state.document.targetBuild.skills;
      const current=rowIndex<5?skills.active[rowIndex]:skills.passive[rowIndex-5];
      if(current?.skillId&&current.skillId!==id&&current.level!==20
        &&!nativeModuleForItem(id)&&!nativeElixirOptions().some(option=>option.itemId===id))level=current.level;
    }
    const supportRolls=support?state.picker?.supportRolls?.[id]:undefined;
    const supportTier=support?state.picker?.supportTiers?.[id]:undefined;
    const supportConditions=support?state.picker?.supportConditions?.[id]:undefined;
    const edit={kind:support?'support-selection':'skill-selection',
      rowIndex,supportIndex:state.supportIndex??0,value:id,...(level===undefined?{}:{level}),
      ...(auraActive===undefined?{}:{auraActive}),
      ...(supportRolls===undefined?{}:{supportRolls}),
      ...(supportTier===undefined?{}:{supportTier}),
      ...(supportConditions===undefined?{}:{supportConditions}),
      ...(support&&state.picker?.unlockSupportSlot?{unlockSupportSlot:true}:{})};
    const preview=previewSlotEdit(state.document,state.report,edit);
    state.picker={...state.picker,candidate:id,edit,preview,
      levels:{...state.picker?.levels,...(level===undefined?{}:{[id]:level})},
      auraStates:{...state.picker?.auraStates,...(auraActive===undefined?{}:{[id]:auraActive})}};
  }
  function captureCandidateSupportInput(input){
    const id=state.picker?.candidate, condition=input.dataset.candidateSupportCondition;
    const key=condition??input.dataset.candidateSupportRoll;
    const entry=state.picker?.preview?.skill?.entry;
    const control=(condition?entry?.conditionControls:entry?.controls)?.find(control=>control.key===key&&!control.automatic);
    if(!id||!control)return false;
    const group=condition?'supportConditions':'supportRolls';
    const bySupport=state.picker[group]??={};
    const value=input.value===''?'':Number(input.value);
    const values=bySupport[id]??={};
    values[key]=value;
    const valid=value===''||Number.isFinite(value)&&value>=control.min&&value<=control.max&&(!control.integer||Number.isInteger(value));
    if(valid&&key==='sameTargetHits'){
      const {sameTargetHits,...following}=values;
      bySupport[id]={sameTargetHits,...Object.fromEntries(Object.entries(following).filter(([name])=>{
        const repeat=name.match(/^repeat(?:Jump|DelayMs)-(\d+)$/u);
        return !repeat||Number(repeat[1])<Number(value);
      }))};
    }
    return {id,valid};
  }
  function refreshSkillCandidate(input, pending=false) {
    const id=input.dataset.id;
    const value=input.value===''?NaN:Number(input.value);
    const valid=Number.isInteger(value)&&value>=1&&value<=100;
    let status=valid?(pending?'계산 중…':''):'레벨은 1~100으로 입력하세요.';
    if(valid&&!pending){
      try {selectSkillCandidate(id,value);state.error='';}
      catch(error){status=error.message;}
    }
    input.setAttribute?.('aria-invalid',String(!valid));
    paintSkillCandidate(id,status,!valid||Boolean(status&&!pending));
    return valid;
  }
  function refreshCandidateSupportInput(input,pending=false){
    const roll=captureCandidateSupportInput(input);
    if(!roll)return false;
    let status=roll.valid?(pending?'계산 중…':''):'보조 옵션 수치의 허용 범위를 확인하세요.';
    if(roll.valid&&!pending){
      try{
        const oldKeys=state.picker.preview.skill.entry.conditionControls?.map(({key})=>key).join();
        selectSkillCandidate(roll.id);state.error='';
        if(oldKeys!==state.picker.preview.skill.entry.conditionControls?.map(({key})=>key).join()){
          state.focusRole=input.dataset.role;
          api.render();
          return true;
        }
      }
      catch(error){status=error.message;}
    }
    input.setAttribute?.('aria-invalid',String(!roll.valid));
    paintSkillCandidate(roll.id,status,Boolean(status));
    return roll.valid;
  }
  function paintSkillCandidate(id,status,disabled){
    const card=root?.querySelector?.('[data-role="skill-candidate-result"]');
    if(card){
      const details=[...card.querySelectorAll('details[open][data-role]')].map(d=>d.dataset.role);
      // Leave the input in place so the cursor and tab focus stay where the user put them.
      card.hidden=Boolean(status);
      if(!status){
        setPlannerHtml(card,renderSkillCandidateResult(state));
        for(const detail of card.querySelectorAll('details[data-role]'))if(details.includes(detail.dataset.role))detail.open=true;
      }
    }
    const bar=root?.querySelector?.('.drawer-dps');
    if(bar)bar.outerHTML=renderSkillPickerFooter(state,id,status,disabled);
  }
  const recalculate = () => {
    state.dummyComparison = null;
    state.upgrades=null;
    state.analysis = null;
    state.supportImpact = null;
    state.report = state.document ? calculateEditorSeasonBuild(state.document.targetBuild, { sourceBuild: state.document.sourceBuild }) : null;
    if(state.picker?.edit&&state.document){
      state.picker.preview=previewSlotEdit(state.document,state.report,state.picker.edit);
      state.picker.removalPreview=null;
    }
    if (editComparison) state.editComparison = editComparison.update(state.document, state.report);
    persistDraft();
  };
  recalculate();
  if (state.document) {
    editComparison = createSeasonEditComparison(state.document, state.report, describeLoadoutChanges);
    state.editComparison = editComparison.result();
  }
  const api = {
    active: true, state,
    workingDocument() {
      return state.overlay?.type==='board' ? state.overlay.document : state.overlay?.boardDraft?.document ?? state.document;
    },
    openBoard(section) {
      api.flush();
      state.talentPicking=false;
      state.section=section;
      state.overlay={type:'board',section,document:state.document,report:state.report,pending:new Map(),history:createSeasonEditHistory()};
      state.focusRole='board-heading';
    },
    stageBoard(next,{record=true}={}) {
      const draft=state.overlay;
      if(next===draft.document)return;
      const report=next===state.document?state.report:calculateEditorSeasonBuild(next.targetBuild,{sourceBuild:next.sourceBuild});
      if(record&&!draft.history.record(draft.document.targetBuild,next.targetBuild))return;
      Object.assign(draft,{document:next,report});
    },
    restoreBoard(redo=false) {
      const draft=state.overlay;
      if(draft?.type!=='board'||draft.rosterBase)return;
      api.flush();
      const target=draft.history[redo?'redo':'undo'](draft.document.targetBuild);
      if(!target)return;
      const original=JSON.stringify(target)===JSON.stringify(state.document.targetBuild);
      api.stageBoard(original?state.document:{...draft.document,targetBuild:target},{record:false});
      if(draft.section==='divinity')state.slateEditor=createSlateEditorState();
      state.focusRole=(redo?draft.history.canRedo:draft.history.canUndo)?(redo?'board-redo':'board-undo'):'board-heading';
    },
    stageTalentAllocation(next,index,{showLockedInInspector=false}={}) {
      const added=newSeasonTalentAllocationIssue(api.workingDocument().targetBuild,next.targetBuild,index);
      if(added){
        if(showLockedInInspector){state.focusRole='talent-inspector';return;}
        throw new Error(added.reason);
      }
      api.stageBoard(next);
    },
    applyBoard() {
      api.flush();
      const next=state.overlay.document;
      if(next!==state.document && JSON.stringify(next.targetBuild)!==JSON.stringify(state.document.targetBuild)) {
        state.history.record(state.document.targetBuild,next.targetBuild);
        state.document=next;state.dirty=true;state.notice='';recalculate();
        if(state.overlay.section==='divinity'&&next.targetBuild.divinity?.boards?.find(b=>b.boardId===next.targetBuild.divinity.activeBoardId)?.slateInventory.length)keepConfirmed('divinity',0);
      }
      api.closeOverlay();
    },
    resetBuild() {
      if(state.overlay?.type!=='reset-build')return;
      api.flush();
      const next=resetSeasonWorkspace(state.document),build=state.document.targetBuild;
      const entries=[];
      for(const [index,item] of (build.gear?.slots??[]).entries())if(item?.itemId)entries.push(captureShelf(build,'gear',index));
      for(const [index,item] of (build.hero?.memories??[]).entries())if(item)entries.push(captureShelf(build,'memory',index));
      // One shelf write must succeed before changing the current draft.
      if(entries.length)storeEntries(entries);
      state.history.record(build,next.targetBuild);
      state.document=next;state.dirty=true;state.overlay=null;state.section='overview';
      state.picker=null;state.slateEditor=createSlateEditorState();state.pactRoster=null;state.fromOverview=false;
      state.focusRole='reset-build';state.notice='빌드를 초기화했습니다. 되돌리기로 복구할 수 있습니다.';
      recalculate();
    },
    flushWorkshop() {
      const draft = workshop();
      let doc = draft.document;
      for (const edit of draft.pending.values()) doc = editItemWorkshop(draft, doc, edit);
      draft.document = doc;
      draft.pending.clear();
    },
    render(element = root) {
      const bindFocus=element && element !== root;
      root = element;
      if (!root) return;
      // Commit pending fields inside the click action. A blur-triggered dock
      // refresh can otherwise move/remove the button between pointer down/up.
      root.onpointerdown = event => {
        if (event.button === 0 && globalThis.document.activeElement?.matches?.('input[data-season-edit],textarea[data-season-edit],input[data-skill-candidate-level],input[data-candidate-support-roll]')
          && event.target.closest?.('button[data-ss14-action], button[data-action]')) event.preventDefault();
      };
      root.ondragstart = event => api.slateDragStart(event);
      root.oncontextmenu = event => api.talentContextMenu(event);
      const boardCell = target => target?.closest?.('.slate-board-cell');
      const hover = event => {if(state.section==='divinity')showSlateFootprint(root,boardCell(event.target),state.slateDrag);};
      root.onpointerover = event => {if(boardCell(event.target))hover(event);};
      root.onpointerout = event => {
        if(state.section==='divinity'&&boardCell(event.target)&&!boardCell(event.relatedTarget))
          showSlateFootprint(root,boardCell(globalThis.document.activeElement),state.slateDrag);
      };
      if(bindFocus) {
        root.addEventListener?.('focusin',hover);
        root.addEventListener?.('focusout',event=>{
          if(state.section==='divinity'&&boardCell(event.target)&&!boardCell(event.relatedTarget))showSlateFootprint(root,null);
        });
      }
      root.ondragover = event => { if (state.slateDrag && boardCell(event.target)) {event.preventDefault();hover(event);} };
      root.ondrop = event => api.slateDrop(event);
      root.ondragend = () => { state.slateDrag=null;showSlateFootprint(root,null); };
      const previousFocus=globalThis.document.activeElement;
      const modalFocus=previousFocus?.closest?.('[role="dialog"]') ? previousFocus : null;
      const scroll = globalThis.document.querySelector?.(".season-native-scroll")?.scrollTop ?? 0;
      const contentScroll = globalThis.document.querySelector?.('.native-content')?.scrollTop ?? 0;
      const resultScroll = globalThis.document.querySelector?.('.native-dps-dock')?.scrollTop ?? 0;
      const modalScroll = globalThis.document.querySelector?.(".season-native-modal-body")?.scrollTop ?? 0;
      const cardScroll = root.querySelector?.('.pact-cards')?.scrollTop ?? 0;
      const skillBoardScroll = root.querySelector?.('.skill-link-board')?.scrollTop ?? 0;
      const talentMap=root.querySelector?.('.talent-drawer [data-talent-panel]');
      const talentScroll=talentMap?.scrollLeft??0;
      const previousList=root.querySelector?.('.gear-drawer .native-picker-list');
      const listScroll=previousList?.scrollTop??0;
      const candidatePane=root.querySelector?.('.gear-comparison-body[data-candidate]');
      const candidateScroll=candidatePane?.dataset.candidate===state.picker?.candidate?candidatePane?.scrollTop:0;
      const open = [...(globalThis.document.querySelectorAll?.(".season-native details[open][data-role], .season-native-backdrop details[open][data-role]") ?? [])].map(el => el.dataset.role);
      setPlannerHtml(root, renderSeasonPlanner(state));
      if(state.overlay?.type==='effects')api.filterEffects();
      if(state.numericOptionQuery)api.filterNumericOptions();
      api.bindScreenshotRegion(root.querySelector?.('[data-screenshot-preview]'));
      viewportEvents?.abort();
      const backdrop=root.querySelector?.('.gear-drawer-backdrop'), viewport=globalThis.visualViewport;
      if(backdrop && viewport){
        viewportEvents=new AbortController();
        const fit=()=>{
          backdrop.style.setProperty('--editor-top',viewport.offsetTop+'px');
          backdrop.style.setProperty('--editor-height',viewport.height+'px');
        };
        fit();
        viewport.addEventListener('resize',fit,{signal:viewportEvents.signal});
        viewport.addEventListener('scroll',fit,{signal:viewportEvents.signal});
      }
      const cards=root.querySelector?.('.pact-cards');
      if(cards)cards.scrollTop=cardScroll;
      const skillBoard=root.querySelector?.('.skill-link-board');
      if(skillBoard)skillBoard.scrollTop=skillBoardScroll;
      const gearList=root.querySelector?.('.gear-drawer .native-picker-list');
      if(gearList && state.picker?.candidate){
        gearList.scrollTop=listScroll;
        if(state.overlay?.type==='gear'&&candidatePane?.dataset.candidate!==state.picker.candidate){
          const selected=gearList.querySelector?.('[data-picker-option][aria-pressed="true"]:not([hidden])')?.getBoundingClientRect?.();
          const list=gearList.getBoundingClientRect?.();
          if(selected&&list){
            if(selected.top<list.top)gearList.scrollTop+=selected.top-list.top;
            else if(selected.bottom>list.bottom)gearList.scrollTop+=selected.bottom-list.bottom;
          }
        }
      }
      const nextPane=root.querySelector?.('.gear-comparison-body[data-candidate]');
      if(nextPane&&candidateScroll)nextPane.scrollTop=candidateScroll;
      const nextTalentMap=root.querySelector?.('.talent-drawer [data-talent-panel]');
      if(nextTalentMap){
        if(nextTalentMap.dataset.talentPanel===talentMap?.dataset.talentPanel)nextTalentMap.scrollLeft=talentScroll;
        if(state.revealTalentNode){
          const selected=nextTalentMap.querySelector('[data-talent-node][aria-pressed="true"]')?.getBoundingClientRect();
          if(selected){
            const map=nextTalentMap.getBoundingClientRect();
            if(selected.left<map.left)nextTalentMap.scrollLeft+=selected.left-map.left;
            else if(selected.right>map.right)nextTalentMap.scrollLeft+=selected.right-map.right;
          }
        }
      }
      state.revealTalentNode=false;
      for (const field of globalThis.document.querySelectorAll?.("[data-season-edit]") ?? []) {
        const pending = state.pending.get(editKey(readSeasonPlannerEdit(field)));
        if (pending) field.value = pending.value;
      }
      for(const input of root.querySelectorAll?.('[data-module-option-search]')??[])
        if(input.value)filterModuleOptionSelectors(input);
      const panel = globalThis.document.querySelector?.(".season-native-scroll");
      for (const role of open) {
        const detail = globalThis.document.querySelector?.(`[data-role="${role}"]`);
        if (detail) detail.open = true;
      }
      if (panel) panel.scrollTop = scroll;
      const content = globalThis.document.querySelector?.('.native-content');
      if (content) content.scrollTop = contentScroll;
      const results = globalThis.document.querySelector?.('.native-dps-dock');
      if (results) results.scrollTop = resultScroll;
      const modal = globalThis.document.querySelector?.(".season-native-modal-body");
      if (modal) modal.scrollTop = modalScroll;
      if (state.overlay && !state.focusRole && !state.focusField) {
        const dialog=root.querySelector?.('[role="dialog"]');
        const controls=dialog?.querySelectorAll?.('button, input, textarea, select, summary') ?? [];
        const same=modalFocus && Array.from(controls).find(el=>el.tagName===modalFocus.tagName &&
          (el.id ? el.id===modalFocus.id : el.outerHTML===modalFocus.outerHTML));
        (same || dialog?.querySelector('h2[tabindex]'))?.focus?.({preventScroll:true});
      }
      if (state.focusRole) {
        const roleSelector=`[data-role="${state.focusRole}"]`;
        const slateCell=state.focusRole.startsWith('slate-cell-')?root.querySelector?.(`.slate-interactive-board ${roleSelector}`):null;
        let detail = slateCell??globalThis.document.querySelector?.(roleSelector)
          ??(state.focusRole.startsWith('analysis-edit-')?globalThis.document.querySelector?.('[data-role="result-tab-analysis"]'):null);
        if(state.focusRole.startsWith('gear-option-')&&(!detail||detail.closest('[hidden]')))
          detail=root.querySelector?.('[data-role="gear-picker-search"]');
        if (detail) {
          const ancestor=detail.matches?.('summary[data-focus-collapsed]')?detail.parentElement?.parentElement:detail;
          for(let p=ancestor;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
          const focusTarget=detail.matches?.('button,input,select,textarea,summary,[tabindex]') ? detail
            : detail.querySelector?.(detail.tagName==='DETAILS'?'summary':'input,select,textarea');
          focusTarget?.focus({preventScroll:true});
          (focusTarget??detail).scrollIntoView?.({ block: state.focusRole==='skill-selection-pane'?'start':'nearest' });
          if(slateCell)showSlateFootprint(root,slateCell,state.slateDrag);
        }
        state.focusRole = null;
      }
      if(state.focusField){
        const f=state.focusField;
        const scope=f.inResults?root.querySelector?.('#native-result-panel'):
          root.querySelector?.('.season-native-modal-body')??root.querySelector?.('.season-native-scroll');
        const field=[...(scope?.querySelectorAll?.('[data-season-edit]')??[])].find(el=>el.dataset.seasonEdit===f.edit
          && (f.edit!=='memory-roll'||el.type!=='range')
          && (f.row===undefined || el.dataset.row===f.row && el.dataset.support===f.support)
          && ((el.dataset.key??el.dataset.roll)===f.key || (el.dataset.fieldAliases && JSON.parse(el.dataset.fieldAliases).includes(f.key))));
        if(field){
          for(let p=field.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
          field.focus();field.scrollIntoView({block:'center'});
        }
        state.focusField=null;
      }
    },
    openGear(index, browse=true) {
      if (!Number.isInteger(index)||index<0||index>=10) return;
      state.section='gear';
      state.gearIndex=index;
      state.overlay={type:'gear',index,initial:{document:state.document,report:state.report}};
      state.picker=browse?{candidate:'',query:''}:null;
      const worn=state.document.targetBuild.gear?.slots?.[index]?.itemId;
      if(browse&&worn&&state.document.targetBuild.ss14Inputs.gear[index]?.itemId===worn&&itemGearKind(worn))selectGearCandidate(index,worn);
      state.focusRole='gear-drawer-heading';
    },
    openSkill(index,support=null,fromSlot=false) {
      if(!Number.isInteger(index)||index<0||index>=9)return;
      api.flush();
      const current=state.overlay?.type==='skills'?state.overlay:null;
      const rows = state.document.targetBuild.skills;
      const host = index<5 ? rows.active[index] : rows.passive[index-5];
      if (!host?.skillId) support=null;
      state.section='skills';state.skillIndex=index;state.supportIndex=support;
      state.overlay={type:'skills',index,supportIndex:support,returnSection:current?.returnSection,returnRole:current?.returnRole,
        originSlot:current?.originSlot??(fromSlot?{index,support}:null),initial:current?.initial??{document:state.document,report:state.report}};state.picker=null;
      if(Number.isInteger(support)&&support<5&&support===host.unlockedSupportCount)
        state.picker={candidate:'',query:'',unlockSupportSlot:true};
      state.focusRole='slot-detail-heading';
    },
    openMemory(index) {
      state.overlay={...createItemWorkshop('memory',index),document:state.document,slotDraft:true};
      state.focusRole='memory-drawer-heading';
    },
    closeOverlay(equipped=false) {
      if(state.overlay?.type==='share'&&state.overlay.savedList){
        state.focusRole=state.overlay.returnRole;
        state.overlay=state.overlay.savedList;
        state.error='';
        return;
      }
      if(state.overlay?.type==='extensions'&&state.overlay.skillReturn){
        const returnTo=state.overlay.skillReturn;
        state.overlay=returnTo;
        api.openSkill(returnTo.index);
        if(activeSkillExtension(state.document.targetBuild,returnTo.index))state.focusRole='skill-extension-settings';
        return;
      }
      if (state.overlay?.screenshotReturn) {
        state.overlay=state.overlay.screenshotReturn;
        state.focusRole='dialog-heading';
        return;
      }
      if (state.overlay?.type==='screenshot') {
        if (state.overlay.previewUrl) URL.revokeObjectURL(state.overlay.previewUrl);
        state.overlay=state.overlay.filesPanel;
        state.focusRole='dialog-heading';
        return;
      }
      if(['shelf','files'].includes(state.overlay?.type)&&state.overlay.boardDraft){
        state.overlay=state.overlay.boardDraft;
        state.error='';
        state.focusRole='board-heading';
        return;
      }
      if(state.overlay?.type==='shelf'){
        const {slotReturn,all}=state.overlay;
        if(slotReturn && !equipped){
          state.overlay=slotReturn.overlay;
          state.picker=slotReturn.picker;
          state.focusRole='slot-shelf-open';
          return;
        }
        if(all){
          state.overlay=null;
          state.focusRole='home-shelf';
          return;
        }
      }
      if(state.overlay?.type==='board') {
        state.slateEditor=createSlateEditorState();state.pactRoster=null;state.slateDrag=null;
        state.focusRole=state.overlay.returnRole??'board-open-'+state.section;
      } else if (state.overlay?.type==='gear') {
        state.picker=null;
        state.focusRole='gear-slot-'+state.gearIndex;
      } else if(state.overlay?.type==='skills') {
        state.picker=null;state.focusRole='skill-slot-'+state.skillIndex;
        const origin=state.overlay.originSlot;
        if(origin){
          const {index,support}=origin, {active,passive}=state.document.targetBuild.skills;
          const row=index<5?active[index]:passive[index-5];
          state.focusRole=support!==null&&row?.skillId&&support<row.unlockedSupportCount
            ? `skill-socket-${index}-${support}` : `skill-slot-${index}`;
        }
        if(state.overlay.returnSection){
          state.section=state.overlay.returnSection;
          const {returnRole}=state.overlay;
          if(returnRole==='partial-dps-review')state.focusRole=seasonPartialDpsReview(state.document,state.report)?returnRole:'result-tab-calculation';
          else state.focusRole=returnRole?(state.supportImpact?returnRole:'result-tab-analysis'):'edit-calculation-skill';
        }
      } else if(state.overlay?.kind==='memory') {
        state.focusRole='memory-slot-'+state.overlay.index;
      } else if (state.section==='gear'&&state.overlay?.kind==='gear') {
        if(!equipped){
          api.openGear(state.overlay.index,false);
          return;
        }
        state.picker=null;
        state.focusRole='gear-slot-'+state.overlay.index;
      }
      if (!state.focusRole && ['files','saves','share'].includes(state.overlay?.type)) state.focusRole='open-'+state.overlay.type;
      if(state.overlay?.type==='reset-build')state.focusRole='reset-build';
      if(state.overlay?.type==='ring-swap')state.focusRole='ring-swap-open';
      if(state.overlay?.type==='hero')state.focusRole='hero-picker-open';
      if(state.fromOverview){
        state.section='overview';state.fromOverview=false;
        if(state.homeGearRole){state.focusRole=state.homeGearRole;state.homeGearRole=null;}
      }
      if(state.overlay?.analysisReturn){
        state.section=state.overlay.analysisReturn.section;
        state.resultTab='analysis';
        state.focusRole=state.overlay.analysisReturn.role;
      }
      if(state.overlay?.effectReturn){
        const {section,overlay}=state.overlay.effectReturn;
        state.section=section;
        state.overlay=overlay;
        state.focusRole='effect-filter';
        return;
      }
      if(state.overlay?.numericOptionReturn){
        state.section=state.overlay.numericOptionReturn;
        state.resultTab='stats';
        state.focusRole='numeric-option-filter';
      }
      state.overlay=null; state.logImport=null; ++logRequest;
    },
    edit(edit) {
      const next = editSeasonWorkspace(api.workingDocument(), edit);
      if(state.overlay?.type==='board'){api.stageBoard(next);return;}
      state.history.record(state.document.targetBuild, next.targetBuild,
        ['skill-swap','support-swap'].includes(edit.kind)?{...edit}:undefined);
      state.document = next; state.dirty = true; state.error = ""; state.notice = "";
      followSkillSwap(edit);
      recalculate();
    },
    flush() {
      if(state.overlay?.type==='board') {
        const draft=state.overlay;
        if(!draft.pending.size)return;
        let next=draft.document;
        for(const edit of draft.pending.values())next=editSeasonWorkspace(next,edit);
        api.stageBoard(next);draft.pending.clear();return;
      }
      if (!state.pending.size) return;
      let next = state.document;
      for (const edit of state.pending.values()) next = editSeasonWorkspace(next, edit);
      state.history.record(state.document.targetBuild, next.targetBuild);
      state.document = next; state.pending.clear(); state.dirty = true; state.error = ""; state.notice = "";
      recalculate();
    },
    restore(redo = false) {
      if (state.pending.size) {
        try { api.flush(); } catch {
          state.pending.clear(); state.error = ""; state.notice = "적용하지 못한 입력을 취소했습니다."; recalculate(); return;
        }
      }
      const target = redo ? state.history.redo(state.document.targetBuild,followSkillSwap) : state.history.undo(state.document.targetBuild,followSkillSwap);
      if (!target) return;
      state.document = { ...state.document, targetBuild: target };
      state.dirty = Boolean(draft&&!savedDocument) || JSON.stringify(target) !== savedTarget;
      state.error = ""; state.notice = redo ? "다시 실행했습니다." : "이전 편집으로 되돌렸습니다.";
      const panel=state.overlay?.type==='skills'?state.overlay:null;
      if(panel){
        delete panel.skillSwap;
        const {index,supportIndex}=panel;
        const row=index<5?target.skills.active[index]:target.skills.passive[index-5];
        panel.supportIndex=Number.isInteger(supportIndex)&&row?.skillId&&supportIndex<row.unlockedSupportCount?supportIndex:null;
      }
      state.supportIndex = panel?.supportIndex ?? null;
      state.picker = null;
      state.slateEditor = createSlateEditorState();
      recalculate();
    },
    save() {
      api.flush();
      state.document = saveSeasonWorkspace(storage, state.document);
      state.documents = loadSeasonWorkspaces(storage).documents;
      state.dirty = false;
      savedTarget = JSON.stringify(state.document.targetBuild);
      savedDocument=state.document;
      persistDraft();
      state.notice = "SS14 빌드를 저장했습니다.";
      try { storage.setItem(ACTIVE_SEASON_WORKSPACE_KEY, state.document.id); }
      catch { state.notice += " 다음 시작 빌드 선택은 저장하지 못했습니다."; }
    },
    compare(savedId,returnQuery) {
      api.flush();
      const loaded = loadSeasonWorkspaces(storage);
      if (loaded.error) throw new Error(loaded.error);
      state.documents = loaded.documents;
      const candidates=savedId?loaded.documents.filter(document=>document.id===savedId):loaded.documents;
      if(savedId&&!candidates.length)throw new Error('저장 빌드를 찾을 수 없습니다.');
      const fallback=defaultSavedDpsMetric();
      const metric=state.analysisMetric==='partialDps'&&fallback!=='partialDps'?fallback:state.analysisMetric??fallback;
      state.analysis = recommendSeasonWorkspaces(state.document, candidates, metric, {
        baselineReport:state.report,
        useBaselineEnemy:state.analysisUseBaselineEnemy,
        confirmationFor:id=>id===state.document.id?state.partialDpsConfirmation:readPartialDpsConfirmation(id),
        describeEncounterChanges:encounterInputChanges,
        describeLoadoutChanges:(before,after)=>({
          ...describeLoadoutChanges(before,after),
          skillChanges:compareSeasonSkillLevels(before.report,after.report),
        }),
        describeDpsChange:(before,after,dpsBasis)=>({
          dpsBasis,
          ...compareSeasonDamageBreakdown(before,after,dpsBasis),
          ...compareSeasonResourceCosts(before,after,dpsBasis,{allActive:true}),
        }),
      });
      state.analysis.savedId=savedId;
      state.analysis.returnQuery=returnQuery;
    },
    compareSupportImpact(rowIndex) {
      const skill = [...state.document.targetBuild.skills.active, ...state.document.targetBuild.skills.passive][rowIndex];
      if (!skill?.skillId||state.pending.size) return;
      const review=seasonPartialDpsReview(state.document,state.report);
      const partial=review&&review.confirmation===state.partialDpsConfirmation?review:null;
      const metric=partial?'fullDps':preferredSeasonDpsMetric(state.report);
      const linkedDps=report=>report[metric]?.rows?.find(row=>row.rowIndex===rowIndex&&row.id===skill.skillId&&row.supported)?.values.dps;
      const linkedBefore=linkedDps(state.report);
      if(partial&&!Number.isFinite(linkedBefore))return;
      const rows = [];
      for (const [supportIndex, support] of skill.supports.entries()) {
        if (!support?.supportId) continue;
        try {
          const preview = previewSlotEdit(state.document, state.report, {
            kind:'support-selection', rowIndex, supportIndex, value:'',
          }, {metric,includeSnapshot:true});
          if(partial){
            const compared=preview.partialComparison;
            const comparison=compared?.confirmation===partial.confirmation?{...compared,supported:true}
              :{supported:false,reasons:['보조 해제 후 같은 제외 범위와 전투 조건으로 비교할 수 없습니다.']};
            const linkedAfter=linkedDps(preview.candidate.report);
            const linkedSkillDps=comparison.supported&&Number.isFinite(linkedAfter)?{value:linkedAfter,delta:linkedAfter-linkedBefore}:null;
            rows.push({supportIndex,id:support.supportId,comparison,linkedSkillDps});
            continue;
          }
          const resources=preview.dpsBasis===metric?preview:
            compareSeasonResourceCosts(state.report,preview.candidate.report,metric,{rowIndex});
          const {resourceChanges,resourceCosts,resourceRecovery,skillResourceChanges,manaReservationChanges,manaObservationStale,elixirManaBalanceChanges}=resources;
          const {dpsBasis,skillLevels,skillDpsChanges,damageCompositionChanges,damageTypeChanges,damageRoutes,
            skillSpeedChanges,manualUsageChanges,elixirPhaseChanges,numbedDamageChanges,skillNumbedDamageChanges,numbedStateChanges,uptimeChanges}=preview;
          const breakdown=preview.comparison.supported&&dpsBasis===metric ? {
            dpsBasis,skillLevels,skillDpsChanges,damageCompositionChanges,damageTypeChanges,damageRoutes,
            skillSpeedChanges,manualUsageChanges,elixirPhaseChanges,numbedDamageChanges,skillNumbedDamageChanges,numbedStateChanges,uptimeChanges,
          } : null;
          const linkedAfter=linkedDps(preview.candidate.report);
          const linkedSkillDps=preview.comparison.supported&&Number.isFinite(linkedBefore)&&Number.isFinite(linkedAfter)
            ? {value:linkedAfter,delta:linkedAfter-linkedBefore} : null;
          rows.push({supportIndex,id:support.supportId,comparison:preview.comparison,linkedSkillDps,
            breakdown,resources:{resourceChanges,resourceCosts,resourceRecovery,skillResourceChanges,manaReservationChanges,manaObservationStale,elixirManaBalanceChanges}});
        } catch (error) {
          rows.push({supportIndex, id:support.supportId, comparison:{supported:false,reasons:[error.message]}});
        }
      }
      state.supportImpact = {rowIndex, rows, partial:!!partial};
    },
    async rank(){
      if(state.pending.size||state.upgrades?.busy)return;
      rankingRequested=true;
      const group=state.upgradeGroup??'all';
      const replacement=group==='replacement'||group==='manaReplacement';
      const source=state.upgradeSource??'all';
      const usesShelf=(replacement||group==='legendary')&&source!=='catalog';
      const job={busy:true,checked:0,total:0,usesShelf};
      state.upgrades=job;
      const active=()=>state.upgrades===job;
      try{
        const shelf=usesShelf?readShelf(storage):[];
        if(usesShelf)job.shelfBasis=gearShelfBasis(shelf);
        const result=await rankSeasonUpgrades(state.document,state.report,{slot:(replacement?state.replacementSlot:state.upgradeSlot)??'all',group,skill:state.upgradeSkill??'all',
          partialConfirmation:state.partialDpsConfirmation,
          assemble:(replacement?state.assembleEquipment:group==='craft'?state.assembleCraft:group==='gear'&&state.assembleRolls)===true,source,
          includeCorrosion:state.includeUpgradeCorrosion===true,lockedSlots:state.lockedEquipmentSlots,gearName:state.upgradeGearName,
          craftTier:state.upgradeCraftTier,
          craftMaximum:state.upgradeCraftMaximum===true,
          showNonImproving:state.upgradeResultDirection==='nonImproving',
          shelf,active,
          progress(checked,total,phase){
            Object.assign(job,{checked,total,phase});
            const out=root?.querySelector?.('[data-upgrade-progress]');
            if(active()&&out){
              out.textContent=checked+' / '+total;
              const label=root.querySelector('[data-upgrade-phase]');
              if(label)label.textContent=phase==='gear-combinations'?'장비 조합 계산 중':'계산 중';
            }
          }});
        if(active()&&result)Object.assign(job,result,{busy:false});
      }catch(e){
        if(active())Object.assign(job,{busy:false,error:e.message});
      }
      if(active())api.render();
    },
    resetComparison() {
      api.flush();
      state.editComparison = editComparison.reset(state.document, state.report);
      state.notice = '현재 빌드를 자동 비교 기준으로 정했습니다.';
    },
    open(id,{preserveCurrent=false}={}) {
      const loaded = loadSeasonWorkspaces(storage);
      if (loaded.error) throw new Error(loaded.error);
      const next = loaded.documents.find(d => d.id === id);
      if (!next) throw new Error("저장한 빌드를 찾을 수 없습니다.");
      let backup=null;
      if(!preserveCurrent){
        api.flush();
        if(state.dirty&&state.document.id===id){
          state.overlay=null;
          state.error='';
          state.focusRole='open-saves';
          return;
        }
        if(state.dirty)backup=saveSeasonWorkspace(storage,currentBuildCopy(' · 편집 사본'));
      }
      const documents=backup?[...loaded.documents,backup]:loaded.documents;
      state.document = next; state.documents = documents; state.pending.clear(); state.dirty = false; state.overlay = null; state.fromOverview=false; state.error = "";
      state.partialDpsConfirmation=readPartialDpsConfirmation(next.id);
      state.rankTrialOrigin=null;
      state.rankTrialReturn=null;
      state.numericOptionQuery='';
      rankingRequested=false;
      state.calculationIndex=0;
      state.history.clear(); state.supportIndex = null; state.picker = null; savedTarget = JSON.stringify(next.targetBuild);
      savedDocument=next;
      state.slateEditor=createSlateEditorState();
      recalculate();
      state.editComparison = editComparison.reset(state.document, state.report);
      state.notice=next.targetBuild.name+" 빌드를 열었습니다.";
      try { storage.setItem(ACTIVE_SEASON_WORKSPACE_KEY, id); } catch { state.notice = "빌드를 열었지만 다음 시작 선택은 저장하지 못했습니다."; }
      if(backup)state.notice+=' 이전 편집은 사본으로 저장했습니다.';
    },
    openRequirement({section,tab,index=0,supportIndex,ring,type,role,edit,key}) {
      if(tab==='conditions'){
        state.resultTab=tab;state.focusRole=role;
        state.focusField=edit?{edit,key,inResults:true}:null;
        return;
      }
      state.section=section;
      if(section==='gear')state.gearIndex=index;
      if(section==='skills'){state.skillIndex=index;state.supportIndex=null;}
      state.overlay=type?{type,index}:null;
      if(type==='memory')api.openMemory(index);
      if(['talents','pact','divinity'].includes(section)){
        if(section==='talents')state.talentIndex=index;
        if(section==='pact'){state.pactIndex=index;state.pactRing=ring??null;state.pactRoster=null;}
        if(section==='divinity'&&type==='slate-option'){
          const [selectedId,socket]=key.split('|');
          state.slateEditor={...createSlateEditorState(),selectedId,socket};
        }
        api.openBoard(section);
      }
      if(section==='skills'&&(!type||type==='skills'))api.openSkill(index,supportIndex??null);
      if(section==='gear'&&(!type||type==='gear'))api.openGear(index,false);
      state.focusField=edit?{edit,key}:null;
      state.focusRole=role;
    },
    async readBuildFile(file) {
      const panel = state.overlay;
      if (!file || panel?.type !== 'files') return;
      const request = panel.fileRequest = (panel.fileRequest ?? 0) + 1;
      try {
        if (file.size > 8_000_000) throw new Error('빌드 JSON 파일 크기를 확인하세요.');
        const text = await file.text();
        if (panel !== state.overlay || request !== panel.fileRequest) return;
        let candidate;
        try { candidate=JSON.parse(text); } catch { /* The regular importer reports JSON errors. */ }
        if (candidate && !Object.hasOwn(candidate,'schemaVersion') &&
          (Object.hasOwn(candidate,'schema_version') || (candidate.meta && Object.hasOwn(candidate.meta,'build_id')))) {
          const {loadBuildImportValidationContext,validateBuildImportText}=await import('./buildImportValidation.js');
          const context=await loadBuildImportValidationContext().catch(()=>null);
          if (panel !== state.overlay || request !== panel.fileRequest) return;
          if (!context) throw new Error('91TOB 파일을 확인할 데이터를 불러오지 못했습니다.');
          const result=validateBuildImportText(text,context);
          if (!result.ok || result.sourceFormat!=='91tob-bd_document_v1')throw new Error(import91Error(result));
          const copy=createSeasonWorkspace(prepareSeasonMigration(result.build));
          const name=containsHanScript(result.build.name)?'91TOB 빌드':result.build.name;
          copy.targetBuild.name=name.slice(0,147)+' · SS14 이전 검토';
          api.stageImportedCopy(copy,true);
        } else api.importCopy(text);
      } catch(error) {
        if (panel !== state.overlay || request !== panel.fileRequest) return;
        state.error=error.message;
      }
      api.render();
    },
    selectScreenshotImage(file) {
      const panel=state.overlay;
      if (!file||panel?.type!=='screenshot'||isOfflineEdition()) return;
      panel.request=(panel.request??0)+1;
      if (panel.previewUrl) URL.revokeObjectURL(panel.previewUrl);
      Object.assign(panel,{file:null,previewUrl:null,region:null,status:'idle',notice:'',matches:[],texts:[],selected:null,target:null,gearValues:[],valueKeys:[],skillLevel:null,acceptSkillLevel:false});
      if (file.size>16_000_000||!/^image\/(?:png|jpeg|webp|bmp|gif)$/u.test(file.type)) {
        panel.status='error';panel.error='16MB 이하 PNG, JPG, WebP, BMP 또는 GIF를 선택하세요.';
        api.render();return;
      }
      panel.file=file;
      panel.previewUrl=URL.createObjectURL(file);
      void api.recognizeScreenshot(false);
    },
    bindScreenshotRegion(surface) {
      if(!surface||state.overlay?.type!=='screenshot')return;
      const panel=state.overlay,frame=surface.querySelector('[data-screenshot-frame]');
      let drag;
      const point=event=>{
        const box=surface.getBoundingClientRect();
        return {x:(event.clientX-box.left)/box.width,y:(event.clientY-box.top)/box.height};
      };
      const paint=region=>{
        frame.hidden=!region;
        if (region) for(const [property,key] of [['left','x'],['top','y'],['width','width'],['height','height']])
          frame.style[property]=`${region[key]*100}%`;
      };
      surface.onpointerdown=event=>{
        if(event.button!==0||panel.status==='reading'||drag)return;
        drag={pointer:event.pointerId,origin:point(event)};
        surface.setPointerCapture(event.pointerId);
      };
      surface.onpointermove=event=>{
        if(drag?.pointer===event.pointerId)paint(screenshotRegionFromPoints(drag.origin,point(event))??panel.region);
      };
      surface.onpointercancel=()=>{drag=null;paint(panel.region);};
      surface.onpointerup=event=>{
        if(drag?.pointer!==event.pointerId)return;
        const region=screenshotRegionFromPoints(drag.origin,point(event));
        drag=null;
        if(region){panel.region=region;api.render();}else paint(panel.region);
      };
    },
    async recognizeScreenshot(crop) {
      const panel=state.overlay;
      const file=panel?.file;
      if (!file||panel.type!=='screenshot'||panel.status==='reading'||isOfflineEdition()) return;
      const region=crop?normalizeScreenshotRegion(panel.region):null;
      if(crop&&!region)return;
      const request=panel.request=(panel.request??0)+1;
      const active=()=>panel===state.overlay&&panel.request===request;
      let worker;
      Object.assign(panel,{status:'reading',matches:[],texts:[],selected:null,target:null,gearValues:[],valueKeys:[],skillLevel:null,acceptSkillLevel:false,error:'',notice:'',cropped:Boolean(region)});
      api.render();
      try {
        const {loadTesseract,recognizeScreenshotText,cropScreenshotFile}=await import('./screenshotRecognition.js');
        const {findSeasonScreenshotMatches}=await import('./seasonScreenshotImport.js');
        const library=await loadTesseract();
        if (!active()) return;
        worker=await library.createWorker(['kor','eng','chi_sim']);
        if (!active()) return;
        const image=region?await cropScreenshotFile(file,region):file;
        if (!active()) return;
        const texts=await recognizeScreenshotText(worker,image,{detail:Boolean(region)});
        if (active()) Object.assign(panel,{status:'done',texts,matches:findSeasonScreenshotMatches(texts)});
      } catch {
        if (active()) Object.assign(panel,{status:'error',error:'이미지 문자를 읽지 못했습니다. 다른 이미지로 다시 시도하세요.'});
      } finally {
        if (worker) await worker.terminate().catch(()=>{});
        if (active()) api.render();
      }
    },
    applyScreenshotTarget() {
      const panel=state.overlay;
      if (panel?.type!=='screenshot'||panel.status!=='done') return;
      const match=panel.matches.find(row=>row.id===panel.selected);
      const selected=match&&seasonScreenshotTargets(state.document.targetBuild,match).find(row=>row.id===panel.target);
      if (!selected) throw new Error('적용할 빈 슬롯을 다시 선택하세요.');
      if (!selected.edit) {
        api.openMemory(match.index);
        state.overlay.screenshotReturn=panel;
        return;
      }
      if (panel.valueKeys?.length && match.group==='gear') {
        const values=findSeasonScreenshotGearValues(panel.texts??[],panel.matches,match,state.document,selected.edit)
          .filter(row=>panel.valueKeys.includes(row.key));
        if (values.length!==panel.valueKeys.length) throw new Error('선택한 장비 수치를 다시 확인하세요.');
        let next=editSeasonWorkspace(state.document,selected.edit);
        for(const {key,value} of values)next=editSeasonWorkspace(next,{kind:'gear-roll',slotIndex:selected.edit.slotIndex,key,value});
        state.history.record(state.document.targetBuild,next.targetBuild);
        state.document=next;state.dirty=true;state.notice='';recalculate();
      } else if (panel.acceptSkillLevel&&['skills','supports'].includes(match.group)) {
        const level=findSeasonScreenshotSkillLevel(panel.texts??[],match);
        if (level===null||level!==panel.skillLevel) throw new Error('선택한 스킬 레벨을 다시 확인하세요.');
        api.edit({...selected.edit,level});
      } else api.edit(selected.edit);
      panel.target=null;
      panel.gearValues=[];panel.valueKeys=[];
      panel.skillLevel=null;panel.acceptSkillLevel=false;
      panel.notice=match.name+' · '+selected.label+'에 적용';
    },
    async download91File() {
      const panel=state.overlay;
      if (panel?.type!=='files'||panel.exporting91) return;
      const doc=api.workingDocument();
      panel.exporting91=true;
      state.error='';
      api.render();
      try {
        const {createSeason91FileExport}=await import('./season91FileExport.js');
        const text=await createSeason91FileExport(doc);
        if (state.overlay!==panel||api.workingDocument()!==doc) return;
        const name=doc.targetBuild.name.replace(/[<>:"/\\|?*]/gu,'_');
        downloadJson('91TOB-'+name+'.json',text);
      } catch (error) {
        if (state.overlay===panel) state.error=error.message;
      } finally {
        panel.exporting91=false;
        if (state.overlay===panel) api.render();
      }
    },
    importCopy(text) {
      api.stageImportedCopy(importSeasonWorkspace(text));
    },
    stageImportedCopy(next,external=false) {
      exportSeasonWorkspace(next);
      const board=state.overlay?.type==='files'&&state.overlay.boardDraft;
      if(board&&JSON.stringify(board.document.targetBuild)!==JSON.stringify(state.document.targetBuild)) {
        state.overlay.pendingImport=next;
        state.overlay.pendingExternal=external;
        state.error='';
        return;
      }
      api.openImportedCopy(next,external);
    },
    finishBoardImport(apply) {
      const panel=state.overlay;
      if(panel?.type!=='files'||!panel.boardDraft||!panel.pendingImport)return;
      const next=panel.pendingImport;
      state.overlay=panel.boardDraft;
      if(apply)api.applyBoard();
      api.openImportedCopy(next,panel.pendingExternal);
    },
    openImportedCopy(next,external=false) {
      openIncomingCopy(next,external?'91TOB 파일을 SS14 이전 검토 사본으로 열었습니다.':next.targetBuild.name+' 빌드를 새 사본으로 가져왔습니다.');
    },
    async readLog(file) {
      const request = ++logRequest;
      state.logImport = { loading: true }; state.error = ""; api.render();
      try {
        const records = await readLocalGameLog(file);
        if (request !== logRequest) return;
        const index = records.length - 1;
        state.logImport = { records, index, moment: "latest", preview: previewLocalGameLog(records[index]), loading: false };
      } catch (error) {
        if (request !== logRequest) return;
        state.logImport = null; state.error = error.message;
      }
      api.render();
    },
    chooseMemoryOption(value,previous,position) {
      api.flushWorkshop();
      const draft=workshop();
      if(draft?.kind!=='memory'||value===previous)return;
      let doc=draft.document;
      if(previous)doc=editSeasonWorkspace(doc,{kind:'memory-affix',slotIndex:draft.index,key:previous,value:0});
      if(value)doc=editSeasonWorkspace(doc,{kind:'memory-affix',slotIndex:draft.index,key:value,value:1,position});
      draft.document=doc;
    },
    input(event) {
      if(event.target.hasAttribute?.('data-upgrade-gear-name')){
        if(event.isComposing||state.upgradeGearName===event.target.value)return;
        const {value,selectionStart,selectionEnd}=event.target;
        state.upgradeGearName=value;
        rankingRequested=false;
        if(state.upgrades){
          state.upgrades=null;
          state.focusRole='upgrade-gear-name';
          api.render();
          if(selectionStart!=null)root?.querySelector('[data-upgrade-gear-name]')?.setSelectionRange(selectionStart,selectionEnd);
        }
        return;
      }
      if(event.target.hasAttribute?.('data-candidate-support-roll')||
        event.target.type==='number'&&event.target.hasAttribute?.('data-candidate-support-condition')){
        const field=event.target;
        clearTimeout(skillCandidateTimer);
        if(refreshCandidateSupportInput(field,true)&&field.isConnected)skillCandidateTimer=setTimeout(()=>{
          if(field.isConnected)refreshCandidateSupportInput(field);
        },160);
        return;
      }
      if(event.target.hasAttribute?.('data-talent-search')&&state.overlay?.section==='talents'){
        state.overlay.talentSearch={index:Number(event.target.dataset.index),query:event.target.value};
        const query=talentSearchKey(event.target.value);
        const stage=event.target.closest('.tree-stage');
        const results=stage.querySelector('[data-talent-results]');
        results.hidden=!query;
        let found=false;
        for(const row of results.querySelectorAll('[data-talent-search-result]')){
          row.hidden=!query||!row.dataset.talentSearchResult.includes(query);
          found||=!row.hidden;
        }
        results.querySelector('[data-talent-search-empty]').hidden=found;
        for(const node of stage.querySelectorAll('[data-talent-search-node]'))
          node.classList.toggle('tree-search-match',Boolean(query&&node.dataset.talentSearchNode.includes(query)));
        return;
      }
      if(event.target.hasAttribute?.('data-ranking-search')||event.target.hasAttribute?.('data-blocked-candidate-input-only')){
        if(event.isComposing || !state.upgrades)return;
        const panel=event.target.closest('[data-upgrade-results]');
        const search=panel.querySelector('[data-ranking-search]');
        const inputOnly=panel.querySelector('[data-blocked-candidate-input-only]')?.checked??false;
        const exclusionsOpen=panel.querySelector('[data-role="ranking-exclusions"]')?.open===true;
        const {selectionStart,selectionEnd}=search;
        if(search.value!==(state.upgrades.blockedFilter?.query??''))delete state.upgrades.rankedLimit;
        state.upgrades.blockedFilter={query:search.value,inputOnly,exclusionsOpen};
        delete state.upgrades.blockedLimit;
        state.focusRole=event.target===search?'ranking-search':'ranking-input-only';
        api.render();
        if(event.target===search&&selectionStart!=null)
          root?.querySelector('[data-ranking-search]')?.setSelectionRange(selectionStart,selectionEnd);
        return;
      }
      if(event.target.hasAttribute?.('data-memory-search')||event.target.hasAttribute?.('data-destiny-search')){
        const kind=event.target.hasAttribute('data-memory-search')?'memory':'destiny';
        const picker=event.target.closest(`[data-${kind}-picker]`);
        const key=value=>String(value).normalize('NFKC').toLocaleLowerCase('ko').replace(/\s/gu,'');
        const query=key(event.target.value);
        let matches=0;
        for(const option of picker.querySelectorAll(`[data-${kind}-choice]`)){
          option.hidden=!key(option.dataset.search).includes(query);
          if(!option.hidden)matches++;
        }
        picker.querySelector(`[data-${kind}-empty]`).hidden=matches>0;
        return;
      }
      if(event.target.hasAttribute?.('data-skill-candidate-level')){
        const input=event.target;
        state.picker??={candidate:'',query:''};
        state.picker.levels={...state.picker.levels,[input.dataset.id]:input.value===''?NaN:Number(input.value)};
        clearTimeout(skillCandidateTimer);
        if(input.isConnected&&state.picker.candidate===input.dataset.id&&refreshSkillCandidate(input,true)){
          skillCandidateTimer=setTimeout(()=>{
            if(input.isConnected&&state.picker?.candidate===input.dataset.id)refreshSkillCandidate(input);
          },160);
        }
        return;
      }
      if(state.overlay?.inverse&&event.target.dataset?.inverseValue){
        state.overlay.inverse[event.target.dataset.inverseValue]=event.target.value;return;
      }
      if(state.overlay?.type==='board' && event.target.dataset?.seasonEdit) {
        const input=event.target;
        const edit=readSeasonPlannerEdit(input);
        state.overlay.pending.set(editKey(edit),edit);
        const pair=input.closest?.('[data-destiny-roll-pair]');
        if(pair&&input.value!==''&&input.validity.valid){
          const linked=pair.querySelector(input.type==='range'?'input[type=number]':'input[type=range]');
          if(linked)linked.value=input.value;
        }
        const comparison=(input.type==='number'||pair)&&root?.querySelector?.('[data-role="board-change-detail"]');
        if(comparison){
          const bar=root.querySelector('.drawer-dps');
          try {
            api.flush();
            const opened=[...comparison.querySelectorAll('details[open]')].map(detail=>detail.dataset.role);
            const detail=renderBoardComparison(state);
            setPlannerHtml(comparison,detail);
            for(const detail of comparison.querySelectorAll('details[data-role]'))detail.open=opened.includes(detail.dataset.role);
            if(bar)bar.outerHTML=renderDrawerBar(state,Boolean(detail));
            const undo=root.querySelector('[data-role="board-undo"]'), redo=root.querySelector('[data-role="board-redo"]');
            if(undo)undo.disabled=!state.overlay.history.canUndo;
            if(redo)redo.disabled=!state.overlay.history.canRedo;
          } catch(error) {
            comparison.textContent=error.message;
            if(bar){bar.querySelector('strong').textContent='입력 확인';bar.querySelector('small').textContent='전체 DPS';bar.querySelector('[data-ss14-action="board-apply"]').disabled=true;}
          }
        }
        return;
      }
      if (event.target.hasAttribute?.('data-slate-search')) {
        state.slateEditor.query=event.target.value;
        const picker=event.target.closest('.slate-option-picker');
        if(picker)filterSlateOptions(picker,event.target.value);
        return;
      }
      if (event.target.hasAttribute?.("data-numeric-filter")) {
        state.numericOptionQuery=event.target.value;
        api.filterNumericOptions();
        return;
      }
      const input = event.target;
      if (workshop() && input.closest?.('[data-item-workshop]')) {
        if (input.hasAttribute('data-craft-search')) {
          const picker=workshop().craftPicker;
          const panel=input.closest('.craft-affix-picker');
          if(!picker||!panel)return;
          picker.query=input.value;
          const matches=pickerSearchMatcher(input.value,true);
          let found=false;
          for(const option of panel.querySelectorAll('[data-craft-option]')){
            option.hidden=!matches(option.textContent);
            if(!option.hidden)found=true;
          }
          panel.querySelector('[data-craft-empty]').hidden=found;
          return;
        }
        if(input.hasAttribute('data-workshop-corrosion')||input.hasAttribute('data-workshop-corrosion-base')){
          api.run(()=>{
            api.flushWorkshop();
            const draft=workshop();
            const edit=input.hasAttribute('data-workshop-corrosion-base')?{kind:'gear-corrosion-base',value:input.value}:{kind:'gear-corrosion',key:input.dataset.key,value:input.checked};
            draft.document=editItemWorkshop(draft,draft.document,{...edit,slotIndex:draft.index});
            state.focusRole=input.dataset.role;
          });
          return;
        }
        const draft = workshop();
        if (input.hasAttribute('data-workshop-name')) {draft.name=input.value;return;}
        if (input.dataset.seasonEdit) {
          const edit=readSeasonPlannerEdit(input);
          const pair=input.closest?.('.craft-roll-pair,.memory-enhancement-control');
          if(pair && input.value!=='' && input.validity.valid){
            const linked=pair.querySelector(input.type==='range'?'input[type=number]':'input[type=range]');
            if(linked)linked.value=input.value;
          }
          if(draft.kind==='memory')edit.enhancedBase=true;
          if (edit.kind === 'workshop-affix') edit.value=input.value;
          draft.pending.set(editKey(edit),edit);
          const bar=root?.querySelector?.('.drawer-dps');
          if(bar){bar.querySelector('strong').textContent='입력 적용 대기';bar.querySelector('small').textContent='전체 DPS';}
          return;
        }
      }
      if(input.hasAttribute?.('data-saved-build-search')&&state.overlay?.type==='saves'){
        state.overlay.query=input.value;
        const query=plannerSearchKey(input.value);
        const rows=[...root.querySelectorAll('[data-saved-build-name]')];
        for(const row of rows)row.hidden=!row.dataset.savedBuildName.includes(query);
        root.querySelector('[data-saved-build-empty]').hidden=rows.some(row=>!row.hidden);
        return;
      }
      if(input.hasAttribute?.('data-shelf-search')&&state.overlay?.type==='shelf'){
        if(event.isComposing)return;
        state.overlay.query=input.value;
        const matches=pickerSearchMatcher(input.value,['gear','memory','prism'].includes(state.overlay.kind));
        const rows=[...root.querySelectorAll('[data-shelf-record]')];
        for(const row of rows)row.hidden=!matches(row.dataset.shelfRecord);
        if(state.overlay.candidate&&rows.some(row=>row.hidden&&row.querySelector('button[aria-pressed="true"]'))){
          delete state.overlay.renameDraft;
          Object.assign(state.overlay,{candidate:null,candidateIndex:null,candidateTargets:[],preview:null,previewError:''});
          const {selectionStart,selectionEnd}=input;
          state.focusRole='shelf-search';
          api.render();
          if(selectionStart!=null)root.querySelector('[data-shelf-search]')?.setSelectionRange(selectionStart,selectionEnd);
          return;
        }
        root.querySelector('[data-shelf-empty]').hidden=rows.some(row=>!row.hidden);
        return;
      }
      if(input.hasAttribute?.('data-shelf-name')&&state.overlay?.type==='shelf'){
        state.overlay.renameDraft=input.value;
        return;
      }
      if(input.hasAttribute?.('data-spirit-filter')){
        state.pactRoster.query=input.value;
        filterSpiritPicker(root,input.value,state.pactRoster.group??'all');
        return;
      }
      if (input.hasAttribute?.("data-hunter-filter")) {
        if(state.overlay?.type!=='hero')return;
        state.overlay.query=input.value;
        const matches=pickerSearchMatcher(input.value,true);
        const choices=[...root?.querySelectorAll('[data-hunter-name]')??[]];
        for(const choice of choices)choice.hidden=!matches(choice.dataset.hunterName);
        const empty=root?.querySelector('[data-hunter-empty]');
        if(empty)empty.hidden=choices.some(choice=>!choice.hidden);
        return;
      }
      if (input.hasAttribute?.("data-picker-filter")) {
        state.picker ??= { candidate: "", query: "" };
        state.picker.query = input.value;
        const matches = pickerSearchMatcher(input.value,state.section==='gear');
        const picker=input.closest('.native-item-picker');
        const options = [...picker.querySelectorAll('[data-picker-option]')];
        let hiddenSelection = false;
        for (const option of options) {
          option.hidden = !matches(option.dataset.search);
          if (option.hidden && option.dataset.id === state.picker.candidate) hiddenSelection = true;
        }
        if (hiddenSelection) {
          if(state.section==='gear')resetGearCandidate();
          else Object.assign(state.picker,{candidate:'',preview:null,edit:null});
          const caret=input.selectionStart;
          api.render();
          const search=root?.querySelector?.('[data-picker-filter]');
          search?.focus({preventScroll:true});
          if (caret != null) search?.setSelectionRange(caret,caret);
        } else {
          const tabStop = options.find(option => !option.hidden && option.getAttribute('aria-pressed') === 'true')
            ?? options.find(option => !option.hidden);
          for (const option of options) option.tabIndex = option === tabStop ? 0 : -1;
          const count=picker.querySelector('[data-picker-count]');
          if(count)count.textContent=`${options.filter(option=>!option.hidden).length}개`;
          const empty=picker.querySelector('[data-picker-empty]');
          if (empty) empty.hidden=Boolean(tabStop);
          const otherSlots=picker.querySelector('[data-support-search-slots]');
          if(otherSlots)setPlannerHtml(otherSlots,tabStop?'':renderSupportSearchSlots(state,state.skillIndex,state.supportIndex,input.value));
          for (const group of root?.querySelectorAll?.('[data-gear-result-group]') ?? []) {
            group.hidden = !group.querySelector('[data-picker-option]:not([hidden])');
          }
        }
        return;
      }
      if (input.hasAttribute?.('data-support-matrix-search')) {
        state.supportMatrix ??= {};
        state.supportMatrix.query = input.value;
        const key=supportSearchKey(input.value);
        let visible=0;
        for (const row of root?.querySelectorAll('[data-support-matrix-row]')??[]) {
          row.hidden=!row.dataset.supportMatrixRow.includes(key);
          if (!row.hidden) visible++;
        }
        const count=root?.querySelector('[data-support-matrix-count]');
        const empty=root?.querySelector('[data-support-matrix-empty]');
        if (count) count.textContent=`${visible}개`;
        if (empty) empty.hidden=visible>0;
        return;
      }
      if (input.hasAttribute?.("data-effect-filter")) { api.filterEffects(); return; }
      if(input.hasAttribute?.('data-module-option-search')&&state.overlay?.type==='extensions'){
        const searches=state.overlay.moduleSearch??={};
        searches[input.dataset.moduleOptionSearch]=input.value;
        filterModuleOptionSelectors(input);
        return;
      }
      if (input.dataset?.seasonFilter) {
        const select = globalThis.document.getElementById(input.dataset.seasonFilter);
        if (select) filterSeasonSelection(select, input.value);
        return;
      }
      if(!input.dataset?.seasonEdit||input.dataset.seasonEdit==='elixir-ingredient'
        ||state.overlay?.type==='extensions'&&isExtensionHostEdit(input.dataset.seasonEdit))return;
      state.upgrades=null;
      const ranking=root?.querySelector?.('[data-upgrade-results]');
      if(ranking)ranking.hidden=true;
      const edit = readSeasonPlannerEdit(input);
      state.pending.set(editKey(edit), edit);
      if(edit.kind==='custom-options'){
        clearTimeout(customOptionTimer);
        if(!event.isComposing)customOptionTimer=setTimeout(()=>{
          if(input.isConnected&&state.pending.get(editKey(edit))===edit)api.change({target:input});
        },350);
      }
      const bar=root?.querySelector?.('.drawer-dps');
      if(bar){bar.querySelector('strong').textContent='입력 적용 대기';bar.querySelector('small').textContent='전체 DPS';}
      const output = globalThis.document.querySelector?.('[data-role="native-dps"]');
      if (output) {
        output.textContent = "입력 적용 대기";
        output.hidden = false;
        if (output.previousElementSibling?.tagName === 'SMALL') output.previousElementSibling.hidden = false;
      }
      const estimate = root?.querySelector?.('.native-result-summary .native-assumed-line');
      if (estimate) estimate.hidden = true;
      const mobile=root?.querySelector?.('[data-mobile-dps]');
      if(mobile){mobile.textContent="입력 적용 대기";root.querySelector('[data-mobile-delta]').textContent='';}
      const detail = globalThis.document.querySelector?.('[data-role="native-calculation-detail"]');
      if (detail) detail.hidden = true;
      const numeric = globalThis.document.querySelector?.('[data-role="native-numeric-result"]');
      if (numeric) numeric.hidden = true;
      state.analysis = null;
      const analysis = globalThis.document.querySelector?.('[data-role="native-analysis-result"]');
      if (analysis) analysis.hidden = true;
      for (const comparison of globalThis.document.querySelectorAll?.('[data-role="native-edit-comparison"]') ?? []) comparison.hidden = true;
      const history = globalThis.document.querySelector?.('[data-role="edit-history"]');
      if (history) history.outerHTML = renderEditHistory(state);
    },
    change(event) {
      const input = event.target;
      if(input.hasAttribute?.('data-pact-roster-level')){
        const roster=state.pactRoster;
        if(state.overlay?.section!=='pact'||!roster?.id||!state.overlay.rosterBase)return;
        api.run(()=>{
          const level=Number(input.value);
          const next=editSeasonWorkspace(state.overlay.document,{kind:'spirit-level',slotIndex:roster.index,value:level});
          api.stageBoard(next,{record:false});
          (roster.levels??=new Map()).set(roster.id,level);
          state.focusRole='pact-roster-level';
        });
        return;
      }
      if(input.hasAttribute?.('data-candidate-support-tier')){
        clearTimeout(skillCandidateTimer);
        const picker=state.picker,id=picker?.candidate,entry=picker?.preview?.skill?.entry;
        const tier=Number(input.value);
        if(!id||input.value===''||tier===entry?.tier||!entry?.tiers?.some(option=>option.tier===tier))return;
        api.run(()=>{
          const supportTiers={...picker.supportTiers,[id]:tier};
          const supportRolls={...picker.supportRolls};
          delete supportRolls[id];
          state.picker={...picker,supportTiers,supportRolls};
          try{selectSkillCandidate(id);}
          catch(error){state.picker=picker;throw error;}
          state.focusRole='candidate-support-tier';
        });
        return;
      }
      if(input.hasAttribute?.('data-candidate-support-roll')||input.hasAttribute?.('data-candidate-support-condition')){
        clearTimeout(skillCandidateTimer);
        refreshCandidateSupportInput(input);
        return;
      }
      if(input.hasAttribute?.('data-support-grade')&&state.overlay?.type==='skills'&&state.picker){
        Object.assign(state.picker,{supportGrade:input.value,candidate:'',preview:null,edit:null});
        state.focusRole='support-grade';
        api.render();
        return;
      }
      if(input.hasAttribute?.('data-slate-page')&&state.overlay?.section==='divinity'){
        api.run(()=>{
          api.flush();
          api.edit({kind:'slate-page',value:input.value});
          state.slateEditor=createSlateEditorState();
          state.focusRole='slate-page';
        });
        return;
      }
      if(input.hasAttribute?.('data-calculation-skill')){
        state.calculationIndex=Number(input.value);
        state.focusRole='calculation-skill';
        api.render();
        return;
      }
      if(state.section==='gear'&&!state.overlay&&input.hasAttribute?.('data-home-gear-slot')){
        const index=Number(input.value);
        if(Number.isInteger(index)&&index>=0&&index<10){state.gearIndex=index;state.focusRole='home-gear-slot';api.render();}
        return;
      }
      if(state.overlay?.prism && input.hasAttribute?.('data-prism-layout')){
        api.run(()=>api.edit({kind:'extension-input',key:'prism:layout',value:input.checked?1:0}));return;
      }
      if(state.overlay?.inverse&&input.hasAttribute?.('data-inverse-layout')){
        api.run(()=>api.edit({kind:'extension-input',key:'inverse:layout',value:input.checked?1:0}));return;
      }
      if(state.overlay?.inverse&&input.hasAttribute?.('data-inverse-select')){
        state.overlay.inverse.selected=input.value;api.render();return;
      }
      if(state.overlay?.prism && input.dataset?.prismField){
        const form=state.overlay.prism, key=input.dataset.prismField;
        form[key]=input.value;
        if(key==='slug'||key==='rarity')Object.assign(form,prismForm(form).draft);
        api.render();return;
      }
      if (input.hasAttribute?.('data-build-file')) {
        void api.readBuildFile(input.files?.[0]);
        return;
      }
      if (input.hasAttribute?.('data-screenshot-image')) {
        api.selectScreenshotImage(input.files?.[0]);
        return;
      }
      if (input.hasAttribute?.('data-screenshot-target')&&state.overlay?.type==='screenshot') {
        api.run(()=>{
          const panel=state.overlay;
          const match=panel.matches.find(row=>row.id===panel.selected);
          const target=match&&seasonScreenshotTargets(state.document.targetBuild,match).find(row=>row.id===input.value);
          panel.target=target?.id??'';
          panel.valueKeys=[];
          panel.gearValues=findSeasonScreenshotGearValues(panel.texts??[],panel.matches,match,state.document,target?.edit);
          state.focusRole='screenshot-target';
        });return;
      }
      if (input.hasAttribute?.('data-screenshot-gear-value')&&state.overlay?.type==='screenshot') {
        const panel=state.overlay,key=input.dataset.screenshotGearValue;
        if(panel.gearValues?.some(row=>row.key===key)) panel.valueKeys=input.checked
          ? [...new Set([...panel.valueKeys,key])] : panel.valueKeys.filter(value=>value!==key);
        return;
      }
      if (input.hasAttribute?.('data-screenshot-skill-level')&&state.overlay?.type==='screenshot') {
        state.overlay.acceptSkillLevel=input.checked&&Number.isInteger(state.overlay.skillLevel);
        return;
      }
      if(input.hasAttribute?.('data-assemble-rolls')){
        state.assembleRolls=input.checked;
        state.upgrades=null;api.render();return;
      }
      if(input.hasAttribute?.('data-assemble-craft')){
        state.assembleCraft=input.checked;
        state.upgrades=null;api.render();return;
      }
      if(input.hasAttribute?.('data-upgrade-craft-tier')){
        if(!CRAFT_RANK_TIERS.includes(input.value))return;
        state.upgradeCraftTier=input.value;
        state.upgrades=null;
        state.focusRole='upgrade-craft-tier';
        api.render();return;
      }
      if(input.hasAttribute?.('data-upgrade-craft-maximum')){
        state.upgradeCraftMaximum=input.value==='maximum';
        state.upgrades=null;
        state.focusRole='upgrade-craft-maximum';
        api.render();return;
      }
      if(input.hasAttribute?.('data-assemble-equipment')){
        state.assembleEquipment=input.checked;
        state.upgrades=null;api.render();return;
      }
      if(input.hasAttribute?.('data-lock-equipment-slot')){
        const index=Number(input.dataset.lockEquipmentSlot);
        if(!Number.isInteger(index)||!SEASON_GEAR_SLOT_LABELS[index])return;
        const slots=new Set(state.lockedEquipmentSlots);
        if(input.checked)slots.add(index);else slots.delete(index);
        state.lockedEquipmentSlots=[...slots];
        state.upgrades=null;state.focusRole=`locked-equipment-slot-${index}`;api.render();return;
      }
      if(input.hasAttribute?.('data-upgrade-source')){
        if(Object.hasOwn(GEAR_UPGRADE_SOURCES,input.value))state.upgradeSource=input.value;
        state.upgrades=null;api.render();return;
      }
      if(input.hasAttribute?.('data-upgrade-corrosion')){
        state.includeUpgradeCorrosion=input.checked;
        state.upgrades=null;api.render();return;
      }
      if(input.hasAttribute?.('data-upgrade-result-direction')){
        state.upgradeResultDirection=input.value==='nonImproving'?'nonImproving':'improving';
        state.upgrades=null;state.focusRole='upgrade-result-direction';api.render();return;
      }
      if(input.hasAttribute?.('data-upgrade-slot')||input.hasAttribute?.('data-replacement-slot')||input.hasAttribute?.('data-upgrade-skill')){
        if(input.hasAttribute('data-upgrade-skill'))state.upgradeSkill=input.value;
        else if(input.hasAttribute('data-replacement-slot'))state.replacementSlot=input.value;
        else state.upgradeSlot=input.value;
        state.upgrades=null;
        api.render();
        return;
      }
      if(input.hasAttribute?.('data-upgrade-group')){
        state.upgradeGroup=input.value;
        state.upgrades=null;
        api.render();
        return;
      }
      if(state.overlay?.type==='board' && input.dataset?.seasonEdit) {
        api.run(()=>{api.input(event);api.flush();if(input.type==='range'&&input.dataset.role)state.focusRole=input.dataset.role;});return;
      }
      if (workshop() && input.closest?.('[data-item-workshop]')) {
        if(input.hasAttribute('data-memory-option')) {
          api.run(()=>api.chooseMemoryOption(input.value,input.dataset.previous,Number(input.dataset.position)));
          return;
        }
        if(input.hasAttribute('data-craft-tier')) {
          api.run(()=>{
            const draft=workshop(),{family,position,role}=input.dataset;
            api.flushWorkshop();
            draft.document=editItemWorkshop(draft,draft.document,{kind:'workshop-tier',family,position:Number(position),value:input.value});
            draft.craftPicker=null;
            state.focusRole=role;
          });
          return;
        }
        if (input.dataset.seasonEdit) api.run(() => {
          api.input(event);api.flushWorkshop();
          if(input.dataset.seasonEdit==='gear-selection')workshop().craftPicker=null;
          if(input.type==='range'&&input.dataset.role)state.focusRole=input.dataset.role;
        });
        return;
      }
      if(input.hasAttribute?.('data-skill-candidate-level')){
        clearTimeout(skillCandidateTimer);
        refreshSkillCandidate(input);
        return;
      }
      if(input.hasAttribute?.('data-candidate-aura-activation')&&state.picker?.preview?.skill?.activation){
        api.run(()=>{
          selectSkillCandidate(state.picker.candidate,undefined,input.value===''?'':Number(input.value));
          state.focusRole='candidate-aura-activation';
        });
        return;
      }
      if(event.target.hasAttribute?.('data-gear-filter')){
        resetGearCandidate({filter:event.target.value});
        state.focusRole='gear-filter-select';
        api.render();
        return;
      }
      if(input.hasAttribute?.('data-shelf-gear-target')&&state.overlay?.type==='shelf'&&state.overlay.all){
        api.run(()=>{
          const entry=readShelf(storage).find(row=>row.kind==='gear'&&row.id===state.overlay.candidate);
          if(!entry)throw Error('보관 항목을 찾을 수 없습니다.');
          previewShelfItem(entry,Number(input.value));
          state.focusRole='shelf-gear-target';
        });
        return;
      }
      if(input.hasAttribute?.('data-shelf-slate-page')&&state.overlay?.type==='shelf'&&state.overlay.kind==='divinity'){
        if(!['new','current'].includes(input.value))return;
        api.run(()=>{
          const entry=readShelf(storage).find(row=>row.kind==='divinity'&&row.id===state.overlay.candidate);
          if(!entry)throw Error('보관 항목을 찾을 수 없습니다.');
          state.overlay.slatePageTarget=input.value;
          previewShelfItem(entry);
          state.focusRole='shelf-slate-page';
        });
        return;
      }
      if(input.hasAttribute?.('data-skill-tag')){
        const tag=input.dataset.skillTag, tags=new Set(state.picker?.tags??[]);
        if(!tag)tags.clear();
        else if(input.checked)tags.add(tag);
        else tags.delete(tag);
        state.picker={...state.picker,tags:[...tags],candidate:'',preview:null,edit:null};
        api.render();
        const filter=root?.querySelector?.('.skill-tag-filter');
        const focus=tags.size?Array.from(filter?.querySelectorAll?.('[data-skill-tag]')??[]).find(el=>el.dataset.skillTag===tag):filter?.querySelector('summary');
        focus?.focus({preventScroll:true});
        return;
      }
      const useBaselineEnemy=event.target.hasAttribute?.('data-analysis-use-baseline-enemy');
      if (useBaselineEnemy || event.target.hasAttribute?.('data-analysis-metric')) {
        if (useBaselineEnemy || Object.hasOwn(SEASON_ADVISOR_METRICS, event.target.value) ||
            event.target.value==='partialDps'&&defaultSavedDpsMetric()==='partialDps') {
          const previous=state.analysis;
          if(useBaselineEnemy)state.analysisUseBaselineEnemy=event.target.checked;
          else state.analysisMetric=event.target.value;
          state.analysis = null;
          state.focusRole = useBaselineEnemy?'saved-comparison-use-baseline-enemy':'saved-comparison-metric';
          if(previous)api.run(()=>api.compare(previous.savedId,previous.returnQuery));
          else api.render();
        }
        return;
      }
      if (event.target.hasAttribute?.("data-effect-status")) { api.filterEffects(); return; }
      if (event.target.id === "native-log-file") { const file = event.target.files?.[0]; if (file) return api.readLog(file); return; }
      if (event.target.dataset?.logField) {
        const { logField, logRow } = event.target.dataset, local = state.logImport;
        if (!local?.preview) return;
        if (logField === "record") {
          const index = Number(event.target.value);
          if (local.records[index]) { local.index = index; local.preview = previewLocalGameLog(local.records[index], { moment: local.moment }); }
        } else if (logField === "moment") {
          if (["latest", "login"].includes(event.target.value)) {
            local.moment = event.target.value;
            local.preview = previewLocalGameLog(local.records[local.index], { moment: local.moment });
          }
        } else if (logField === "slates") {
          if (local.preview.slates && !local.preview.slates.blocked) local.preview.slates.selected = event.target.checked;
        } else {
          const row = local.preview.rows[Number(logRow)];
          if (row) {
            if (logField === "selected") row.selected = event.target.checked;
            else if (logField === "item") {
              row.itemId = event.target.value; row.selected = !!row.itemId;
              if (row.logGear) row.logGear = rebindLogGear(row.logGear, row.itemId);
            }
            else if (logField === "level") row.level = event.target.value.trim() === "" ? "" : Number(event.target.value);
          }
        }
        api.render(); return;
      }
      if (!event.target.dataset?.seasonEdit) return;
      if(state.overlay?.type==='extensions'&&isExtensionHostEdit(input.dataset.seasonEdit)){
        api.run(()=>{
          api.flush();
          const edit=readSeasonPlannerEdit(input),baseline=state.document;
          const preview=previewSlotEdit(baseline,state.report,edit,{includeSnapshot:true});
          const after=preview.candidate.document.targetBuild.skills.active;
          const changed=baseline.targetBuild.skills.active.flatMap((row,index)=>{
            if(!row?.skillId)return [];
            const next=after[index];
            const lost=row.supports.filter((link,socket)=>link&&link.supportId!==next?.supports?.[socket]?.supportId);
            return row.skillId!==next?.skillId||lost.length?[{index,before:row.skillId,after:next?.skillId,lost}]:[];
          });
          if(changed.length){
            state.overlay.hostPreview={edit,preview,changed,baseline,returnRole:input.dataset.role};
            state.focusRole='extension-host-preview';
          }else{
            api.edit(edit);
            state.focusRole=input.dataset.role;
          }
        });
        return;
      }
      if(input.dataset.seasonEdit==='elixir-ingredient'){
        api.run(()=>{
          api.flush();
          api.edit(readSeasonPlannerEdit(input));
          state.focusRole=input.dataset.role;
        });
        return;
      }
      if(input.dataset.seasonEdit==='custom-options'){
        clearTimeout(customOptionTimer);
        const edit=readSeasonPlannerEdit(input),key=editKey(edit);
        if(!state.pending.has(key) &&
          input.value===customOptionEditorText(state.document.targetBuild.customAffixes))return;
        state.pending.set(key,edit);
      }else api.input(event);
      if (input.dataset.seasonEdit==='support-count' && state.overlay?.type==='skills') {
        api.run(()=>api.flush());
        return;
      }
      if(input.dataset.seasonEdit==='dummy-level'){
        api.run(()=>{
          const isolated=state.pending.size===1;
          const before=matchingTrainingDummy(state.document.targetBuild.ss14Inputs.dps?.enemy);
          const beforeDps=state.report.fullDps;
          api.flush();
          const after=matchingTrainingDummy(state.document.targetBuild.ss14Inputs.dps?.enemy);
          const afterDps=state.report.fullDps;
          if(isolated&&before&&after&&before.level!==after.level&&beforeDps.supported&&afterDps.supported)
            state.dummyComparison={from:before.level,to:after.level,before:beforeDps.dps,after:afterDps.dps};
          state.focusRole='training-dummy-picker';
        });
        return;
      }
      // Number/text fields commit on blur without removing the button that the
      // user is clicking. Selects rebuild their dependent option controls.
      if (event.target.tagName === "INPUT" || input.dataset.seasonEdit==='custom-options') {
        try { api.flush(); state.error = ""; }
        catch (error) { state.error = error.message; }
        if(!state.error && input.dataset.seasonEdit==='custom-options'){
          const presented=customOptionEditorText(state.document.targetBuild.customAffixes);
          if(input.value!==presented)input.value=presented;
        }
        if (!state.error && event.target.dataset.seasonEdit==='dps-input' && event.target.dataset.key?.startsWith('enemy:')) {
          const enemy=state.document.targetBuild.ss14Inputs.dps?.enemy;
          for(const picker of root?.querySelectorAll?.('[data-season-edit="dummy-level"]') ?? []) {
            const selection=trainingDummySelection(enemy);
            picker.querySelector('option[value="custom"]').hidden=selection!=='custom';
            picker.value=selection;
          }
        }
        const bar=root?.querySelector?.('.drawer-dps');
        if(bar&&['gear','skills','extensions'].includes(state.overlay?.type))bar.outerHTML=renderDrawerBar(state);
        const seal=root?.querySelector?.('[data-role="skill-mana-seal"]');
        if(seal&&!state.error)seal.textContent=skillSealSummary(state.report.character.values);
        const skillStats=root?.querySelector?.('[data-role="equipped-skill-level-stats"]');
        if(skillStats&&!state.error){
          const sourceOpen=skillStats.querySelector?.('[data-role="equipped-skill-source"]')?.open;
          setPlannerHtml(skillStats,renderEquippedSkillStats(state));
          const source=skillStats.querySelector?.('[data-role="equipped-skill-source"]');
          if(sourceOpen && source)source.open=true;
        }
        if(!state.error && root?.querySelectorAll){
          const committed=readSeasonPlannerEdit(event.target);
          if(committed.kind==='extension-input'&&/^elixir:[01]:uptime$/u.test(committed.key)) {
            for(const label of root.querySelectorAll('[data-elixir-input]')) {
              const key=label.dataset.elixirInput;
              const row=state.report.componentProjection.rows.find(row=>row.elixirState&&row.extensionControls.some(control=>control.key===key));
              if(row)label.hidden=!usesExtensionInput(state.report,row,key);
            }
          }
          for(const field of root.querySelectorAll('input[data-season-edit]')){
            if(field!==event.target&&editKey(readSeasonPlannerEdit(field))===editKey(committed))field.value=event.target.value;
            if (field.dataset.seasonEdit==='character-input' && field.dataset.key==='observedManaRecovery') {
              const {value,hint} = observedManaInputState(state.document,state.report);
              field.value = String(value);
              const note = field.parentElement?.querySelector('[data-role="mana-observation-hint"]');
              if (note) note.textContent = hint;
            }
          }
        }
        const dock = globalThis.document.querySelector?.(".native-dps-dock");
        if (dock) {
          const scroll = dock.scrollTop;
          const open = [...(dock.querySelectorAll?.("details[open][data-role]") ?? [])].map(el => el.dataset.role);
          dock.outerHTML = renderNativeDps(state);
          const refreshed = globalThis.document.querySelector?.(".native-dps-dock");
          for (const detail of refreshed?.querySelectorAll?.("details[data-role]") ?? [])
            if (open.includes(detail.dataset.role)) detail.open = true;
          if (refreshed) refreshed.scrollTop = scroll;
          if(state.numericOptionQuery)api.filterNumericOptions();
        }
        const status = globalThis.document.querySelector?.('[data-role="native-save-status"]');
        if (status) status.textContent = state.error || nativeSaveStatus(state);
        const history = globalThis.document.querySelector?.('[data-role="edit-history"]');
        if (history) history.outerHTML = renderEditHistory(state);
        const sources = globalThis.document.querySelector?.(".native-slot-effects");
        if (sources) {
          sources.hidden = !!state.error;
          if (!state.error) sources.innerHTML = `<summary>이 슬롯의 효과별 출처</summary>${renderEffectSources(state, state.section === "gear"
            ? `gear.slots.${state.gearIndex}` : `skills.rows.${state.skillIndex}${Number.isInteger(state.supportIndex) ? `.supports.${state.supportIndex}` : ""}`)}`;
        }
        if (!state.error && (event.target.dataset.seasonEdit === "support-count"
          || event.target.dataset.seasonEdit === 'support-condition' && event.target.dataset.key === 'sameTargetHits')) api.render();
        return;
      }
      api.run(() => {
        api.flush();
        if(state.overlay?.type==='extensions'&&input.dataset.role)state.focusRole=input.dataset.role;
      });
    },
    blur(event) {
      const input = event.target;
      const pending=workshop()?.pending??state.pending;
      if (input?.tagName === "INPUT" && input.dataset?.seasonEdit
        && pending.has(editKey(readSeasonPlannerEdit(input)))) api.change(event);
    },
    run(action) {
      try { action(); syncCandidate(); state.error = ""; } catch (e) { state.error = e.message; }
      api.render();
    },
    filterNumericOptions() {
      const searchKey=text=>text.normalize('NFKC').toLocaleLowerCase('ko').replace(/\s/gu,'');
      const query=searchKey(state.numericOptionQuery??'');
      for(const row of globalThis.document.querySelectorAll?.('[data-numeric-row]')??[])
        row.hidden=!searchKey(row.textContent).includes(query);
    },
    filterEffects() {
      const rawQuery = globalThis.document.querySelector("[data-effect-filter]")?.value ?? "";
      const query=rawQuery.trim().toLocaleLowerCase('ko');
      const status = globalThis.document.querySelector("[data-effect-status]")?.value ?? "";
      if(state.overlay?.type==='effects')Object.assign(state.overlay,{query:rawQuery,status});
      for (const row of globalThis.document.querySelectorAll(".native-effect-sources [data-effect-state]"))
        row.hidden = !!status && row.dataset.effectState !== status || !row.textContent.toLocaleLowerCase("ko").includes(query);
    },
    click(event) {
      const target = event.target.closest?.("[data-ss14-action]");
      const legacy = event.target.closest?.("[data-action]");
      if (!target && !legacy) return;
      const d = target?.dataset ?? legacy.dataset;
      const action = d.ss14Action ?? d.action;
      if (action === "open-preserved-build") return false;
      if(action==='return-mobile-edit'||target?.classList?.contains('mobile-dps-bar')){
        const content=root?.querySelector('.native-content');
        const results=content?.querySelector('.native-dps-dock');
        if(action==='return-mobile-edit'){
          const recent=mobileEditReturn?.id===state.document.id&&mobileEditReturn.section===state.section;
          content?.querySelector('main')?.focus({preventScroll:true});
          if(content)content.scrollTop=recent?mobileEditReturn.top:0;
          mobileEditReturn=null;
          return true;
        }
        if(results&&results.getBoundingClientRect().top>content.getBoundingClientRect().top+8)
          mobileEditReturn={id:state.document.id,section:state.section,top:content.scrollTop};
        if(action==='show-mobile-results'){
          results?.focus({preventScroll:true});
          results?.scrollIntoView({block:'start'});
          return true;
        }
      }
      if (action === 'board-show-changes') {
        const detail=root?.querySelector?.('#ss14-board-change-detail');
        const disclosure=detail?.querySelector('details');
        const focusTarget=disclosure?.querySelector('summary')??detail;
        if(disclosure)disclosure.open=true;
        focusTarget?.scrollIntoView({block:'nearest'});
        focusTarget?.focus({preventScroll:true});
        return true;
      }
      if (action === 'look-up-ingame-code') {
        void api.lookUpIngameCode();
        return true;
      }
      if (['share','share-saved','copy-link','copy-code','import-code'].includes(action)) {
        void api.share(action,d.id);
        return true;
      }
      api.run(() => {
        if(action==='toggle-navigation'){state.navCollapsed=!state.navCollapsed;state.focusRole='nav-toggle';return;}
        if(state.section==='overview' && !state.overlay && ['inspect-gear','inspect-skill','inspect-socket','overview-board'].includes(action))state.fromOverview=true;
        if(action==='overview-board' && ['talents','pact','divinity'].includes(d.section)){api.openBoard(d.section);return;}
        if(action==='board-undo'||action==='board-redo'){api.restoreBoard(action==='board-redo');return;}
        if(state.section==='overview'&&!state.overlay) {
          if(d.role==='home-shelf'){
            state.fromOverview=true;state.homeGearRole=d.role;
          }
          const section=target?.closest?.('[data-home-board]')?.dataset?.homeBoard;
          if(['talents','divinity','pact'].includes(section)) {
            state.fromOverview=true;
            api.openBoard(section);
            state.overlay.returnRole=d.role;
            if(section==='talents')state.talentIndex=Number(d.index);
          }
        }
        if(action==='skill-toggle-catalog' && state.overlay?.type==='skills'){
          api.flush();
          state.overlay.boardOnly=!state.overlay.boardOnly;
          state.focusRole='skill-catalog-toggle';
          return;
        }
        if(action==='show-skill-links'&&state.overlay?.type==='skills'){
          state.focusRole=`skill-board-row-${state.overlay.index}`;
          return;
        }
        if(action==='memory-option-pick' && workshop()?.kind==='memory'){
          api.chooseMemoryOption(d.value,d.previous,Number(d.position));
          state.focusRole=d.focus;
          return;
        }
        if(action==='remove-socket' && state.overlay?.type==='skills'){
          api.flush();
          const rowIndex=Number(d.row),supportIndex=Number(d.index),boardOnly=state.overlay.boardOnly;
          api.edit({kind:supportIndex<0?'skill-selection':'support-selection',rowIndex,supportIndex,value:''});
          api.openSkill(rowIndex,supportIndex<0?null:supportIndex);
          state.overlay.boardOnly=boardOnly;
          return;
        }
        if(action==='skills-reset' && state.overlay?.type==='skills'){
          api.flush();
          api.edit({kind:'skills-reset'});
          api.openSkill(0);
          state.overlay.boardOnly=true;
          state.notice='스킬을 초기화했습니다. 되돌리기로 복구할 수 있습니다.';
          return;
        }
        if(action==='open-exclusive-support' && state.overlay?.type==='skills'){
          api.flush();
          const rowIndex=Number(d.row), socket=Number(d.index);
          const {active,passive}=state.document.targetBuild.skills;
          const row=[...active,...passive][rowIndex];
          const slot=seasonExclusiveSupportSlots(SS14_CARDS_EN.records[row?.skillId],rowIndex).find(s=>s.index===socket);
          if (!slot) return;
          api.openSkill(rowIndex,socket);
          state.picker={candidate:'',query:d.searchQuery??'',supportGrade:slot.grades.length>1?'부귀·숭고':slot.grades[0],unlockSupportSlot:row.unlockedSupportCount<=socket};
          state.focusRole='skill-picker-search';
          return;
        }
        if(action==='skill-board-count' && state.overlay?.type==='skills'){
          api.flush();
          const rowIndex=Number(d.row), step=Number(d.step);
          const skills=state.document.targetBuild.skills, row=[...skills.active,...skills.passive][rowIndex];
          if(!row||![-1,1].includes(step))return;
          const count=row.unlockedSupportCount+step;
          api.edit({kind:'support-count',rowIndex,value:count});
          if(rowIndex===state.skillIndex && Number.isInteger(state.supportIndex) && state.supportIndex>=count)api.openSkill(rowIndex);
          return;
        }
        if((action==='skill-swap'||action==='support-swap')&&state.overlay?.type==='skills'){
          const support=Number.isInteger(state.supportIndex);
          if(support!==(action==='support-swap'))return;
          api.flush();
          const edit={kind:action,rowIndex:state.skillIndex,value:Number(d.index),
            ...(support&&{supportIndex:state.supportIndex})};
          const preview=previewSlotEdit(state.document,state.report,edit,{includeSnapshot:true});
          state.overlay.skillSwap={edit,preview,baseline:state.document};
          state.focusRole='skill-swap-preview';
          return;
        }
        if(action==='open-skill-extension'&&state.overlay?.type==='skills'&&!Number.isInteger(state.supportIndex)){
          api.flush();
          const extension=activeSkillExtension(state.document.targetBuild,state.overlay.index);
          if(!extension)return;
          state.overlay={type:'extensions',skillReturn:state.overlay,initial:{document:state.document,report:state.report}};
          state.focusRole=`native-${extension.kind}-${extension.index}-select`;
          return;
        }
        if((action==='extension-host-apply'||action==='extension-host-cancel')&&state.overlay?.type==='extensions'){
          const change=state.overlay.hostPreview;
          if(!change)return;
          if(action==='extension-host-apply'){
            if(change.baseline!==state.document)throw Error('빌드가 바뀌었습니다. 교체를 다시 선택하세요.');
            api.edit(change.edit);
          }
          delete state.overlay.hostPreview;
          state.focusRole=change.returnRole;
          return;
        }
        if(action==='skill-apply-swap'||action==='skill-cancel-swap'){
          const swap=state.overlay?.type==='skills'?state.overlay.skillSwap:null;
          if(!swap)return;
          if(action==='skill-cancel-swap'){
            delete state.overlay.skillSwap;
            state.focusRole='skill-swap-options';
          }else{
            if(swap.baseline!==state.document)return;
            api.edit(swap.edit);
            if(swap.edit.kind==='support-swap')api.openSkill(swap.edit.rowIndex,swap.edit.value);
            else api.openSkill(swap.edit.value);
          }
          return;
        }
        if(state.overlay?.type==='board' && action==='close'){api.closeOverlay();return;}
        if(action==='board-apply' && state.overlay?.type==='board'){api.applyBoard();return;}
        if(!state.overlay && ['talents','pact','divinity'].includes(state.section) && (action==='board-open'||target?.closest?.('[data-board-overview]'))) {
          api.openBoard(state.section);
          if(action==='board-open')return;
        }
        if (action === 'workshop-open') {
          api.flush();
          const index=Number(d.index??state.overlay?.index);
          state.overlay=state.overlay?.type==='gear' && d.kind==='gear'
            ? workshop()??openGearWorkshop(index,state.document.targetBuild,state.picker?.candidate)
            : createItemWorkshop(d.kind??state.overlay?.kind,index);
          state.focusRole="memory-drawer-heading";
          return;
        }
        if (state.overlay?.type==='workshop'&&!action.startsWith('shelf-') || workshop()&&action.startsWith('workshop-')) {
          const draft=workshop();
          if (action === 'close') {api.closeOverlay();return;}
          if (action === 'workshop-category') {
            if (draft.kind!=='gear'||!['base','legendary'].includes(d.category)||draft.category===d.category)return;
            api.flushWorkshop();
            const drafts=draft.categoryDrafts??=new Map();
            drafts.set(draft.category,{document:draft.document,name:draft.name});
            const next=drafts.get(d.category)??createItemWorkshop('gear',draft.index);
            Object.assign(draft,{category:d.category,document:next.document,name:next.name,craftPicker:null});
            state.focusRole='workshop-category-'+d.category;
            return;
          }
          api.flushWorkshop();
          if (action === 'workshop-pick-affix' && draft.kind==='gear') {
            const position=Number(d.position),picker=draft.craftPicker;
            const close=picker?.family===d.family&&picker.position===position;
            draft.craftPicker=close?null:{family:d.family,position,query:''};
            state.focusRole=close?`craft-${d.family}-${position}`:'craft-affix-search';
          } else if (action === 'workshop-select-affix' && draft.kind==='gear' && draft.craftPicker && d.key) {
            const {family,position}=draft.craftPicker;
            draft.document=editItemWorkshop(draft,draft.document,{kind:'workshop-slot',family,position,value:d.key});
            draft.craftPicker=null;
            state.focusRole=`craft-${family}-${position}`;
          } else if (action === 'memory-preset' && draft.kind==='memory') {
            draft.document=editItemWorkshop(draft,draft.document,{kind:action,value:Number(d.quality)});
            state.focusRole=draft.document.targetBuild.hero.memories?.[draft.index]?'memory-level-number':'memory-preset-'+d.quality;
          } else if (action === 'workshop-equip') {
            const entry=draft.kind==='gear'||draft.document.targetBuild.hero.memories[draft.index]?finishedWorkshopItem(draft):null;
            api.edit(entry
              ? {kind:'shelf-apply',slotIndex:draft.index,value:entry}
              : {kind:'memory-selection',slotIndex:draft.index,value:''});
            if(entry)keepConfirmed(draft.kind,draft.index,entry);
            api.closeOverlay(true);
          } else if (action === 'workshop-remove') {
            draft.document=editItemWorkshop(draft,draft.document,{kind:action,value:d.key});
            draft.craftPicker=null;
          } else if (action === 'workshop-store') {
            openShelf(storeEntry(finishedWorkshopItem(draft)),draft.kind,draft.index);
            state.notice='아이템을 제작해 보관함에 넣었습니다.';
          }
          return;
        }
        if(action==='bing-event-add'||action==='bing-event-remove'){api.edit({kind:action,rowIndex:Number(d.row)});return;}
        if (action === "undo" || action === "redo") { api.restore(action === "redo"); return; }
        api.flush();
        if(action.startsWith('shelf-')){
          const list=readShelf(storage);
          const kind=d.kind??state.overlay?.kind,slot=Number(d.index??state.overlay?.index);
          const all=d.scope==='all'||state.overlay?.all===true;
          const boardDraft=state.overlay?.type==='board'?state.overlay:state.overlay?.boardDraft;
          if(action==='shelf-open'||action==='shelf-tab'){
            const editor=state.overlay;
            const fromSlot=editor?.type==='gear'||editor?.type==='workshop'&&editor.slotDraft;
            if(fromSlot && !all && workshop())api.flushWorkshop();
            openShelf(list,kind,slot,all);
            if(boardDraft)state.overlay.boardDraft=boardDraft;
            if(fromSlot && !all)state.overlay.slotReturn={overlay:editor,picker:state.picker};
            else if(editor?.slotReturn)state.overlay.slotReturn=editor.slotReturn;
            if(action==='shelf-tab')state.focusRole='shelf-tab-'+kind;
            return;
          }
          if(action==='shelf-save'){storeEntry(captureShelf(api.workingDocument().targetBuild,kind,slot));state.notice='보관함에 저장했습니다.';return;}
          const pos=list.findIndex(v=>v.id===d.id&&v.kind===kind);
          if(pos<0)throw Error('보관 항목을 찾을 수 없습니다.');
          if(action==='shelf-use'&&(state.overlay?.candidate!==d.id||!state.overlay.preview))
            throw Error('보관함에서 적용할 항목을 선택하세요.');
          let index=all?list[pos].index:slot;
          if(action==='shelf-use' && ['prism','divinity'].includes(kind)){
            if(kind==='prism')index=state.overlay.candidateIndex;
            const newSlatePage=kind==='divinity'&&state.overlay.slatePageTarget!=='current';
            if(boardDraft)state.overlay=boardDraft;
            else api.openBoard(kind==='prism'?'talents':'divinity');
            api.edit({kind:'shelf-apply',slotIndex:index,value:list[pos],newSlatePage});
            if(kind==='prism'){
              state.talentIndex=index;
              const placement=state.overlay.document.targetBuild.talents.placedPrism;
              state.talentNode=placement.nodeId;
              state.overlay.prism={selected:placement.instanceId};
              delete state.overlay.inverse;
            }
            return;
          }
          if(action==='shelf-remove'){
            const {query,slotReturn}=state.overlay;
            list.splice(pos,1);
            writeShelf(list,kind==='gear');
            openShelf(list,kind,slot,all);
            Object.assign(state.overlay,{query,boardDraft,slotReturn});
            return;
          }
          if(action==='shelf-rename'){
            const panel=state.overlay;
            if(panel?.type!=='shelf'||panel.candidate!==d.id)return;
            const name=(panel.renameDraft??list[pos].name).trim();
            if(!name||name.length>160)throw Error('보관함 이름을 1~160자로 입력하세요.');
            if(name!==list[pos].name){
              const updated={...list[pos],name,originalName:list[pos].originalName??list[pos].name};
              list[pos]=updated;
              writeShelf(list,kind==='gear');
              state.shelfRows=state.shelfRows.map(row=>row.id===updated.id?updated:row);
              panel.query='';
            }
            delete panel.renameDraft;
            state.focusRole='shelf-candidate';
            return;
          }
          if(action==='shelf-preview'){
            if(state.overlay?.candidate!==d.id)delete state.overlay.renameDraft;
            const preferred=state.overlay?.candidate===d.id?state.overlay.candidateIndex:all&&kind==='gear'?slot:index;
            previewShelfItem(list[pos],preferred);
            state.focusRole='shelf-candidate';
            return;
          }
          if(action==='shelf-use'){
            if(all&&kind==='gear'){
              index=state.overlay.candidateIndex;
              if(state.overlay.candidate!==d.id||!shelfGearTargets(list[pos],state.document.targetBuild).includes(index))throw Error('장착할 수 있는 부위를 선택하세요.');
            }
            api.edit({kind:'shelf-apply',slotIndex:index,value:list[pos]});
            state.overlay=null;state.picker=null;
            if(kind==='memory')api.openMemory(index);
            if(kind==='gear')api.openGear(index);
            state.slateEditor=createSlateEditorState();state.notice='보관 항목을 적용했습니다.';return;
          }
        }
        if (handleSlateEditorAction(api,action,d)) {
          if (['slate-type','slate-select'].includes(action) || action==='slate-cell' && !state.slateEditor.draft) state.focusRole='slate-inspector';
          return;
        }
        if (action === 'talent-slot') { state.talentIndex=Number(d.index); state.talentNode=null;state.talentPicking=false;if(state.overlay){delete state.overlay.prism;delete state.overlay.inverse;}return; }
        if(action.startsWith('inverse-')&&state.overlay?.section==='talents'){
          const overlay=state.overlay,slotIndex=state.talentIndex;
          if(action==='inverse-open'){overlay.inverse={};delete overlay.prism;}
          else if(action==='inverse-close')delete overlay.inverse;
          else if(action==='inverse-craft')overlay.inverse.craft=!overlay.inverse.craft;
          else if(action==='inverse-create'){
            const key=crypto.randomUUID(),form=overlay.inverse;
            const value=Object.fromEntries(inverseFields.map(([k])=>[k,form[k]===''?null:Number(form[k]??-100)]));
            api.edit({kind:action,slotIndex,key,value});Object.assign(form,{selected:key,craft:false});
          }else if(['inverse-place','inverse-remove','inverse-discard'].includes(action))api.edit({kind:action,slotIndex,key:d.id,value:d.node});
          return;
        }
        if (action.startsWith('prism-')&&state.overlay?.section==='talents') {
          const overlay=state.overlay, slotIndex=state.talentIndex;
          if(action==='prism-open'){overlay.prism={};delete overlay.inverse;}
          else if(action==='prism-close')delete overlay.prism;
          else if(action==='prism-craft')overlay.prism.craft=!overlay.prism.craft;
          else if(action==='prism-create'){
            const key=crypto.randomUUID();
            api.edit({kind:action,slotIndex,key,value:prismForm(overlay.prism).draft});
            Object.assign(overlay.prism,{selected:key,craft:false});
          }else if(['prism-place','prism-remove','prism-discard'].includes(action)){
            api.edit({kind:action,slotIndex,key:d.id,value:d.node});
          }
          return;
        }
        if(action==='talent-picker-open'||action==='talent-picker-close'){state.talentPicking=action==='talent-picker-open';return;}
        if(action==='talent-effects'){state.talentEffects=!state.talentEffects;return;}
        if(action==='talent-reset'){api.edit({kind:'talent-reset',slotIndex:Number(d.index)});return;}
        if(action==='talent-core-group'){state.talentCoreGroup=state.talentCoreGroup===Number(d.value)?null:Number(d.value);return;}
        if(action==='talent-core-select'){
          const doc=api.workingDocument(),build=doc.targetBuild,index=Number(d.index);
          if(state.overlay?.section!=='talents'||index!==(state.talentIndex??0))return;
          const nodes=index===3&&hasRevelation(build)?revelationNodeOptions(build):seasonTalentNodes(build.talents.boards[index]?.treeSlug);
          if(!nodes.some(n=>n.id===d.id&&n.core))return;
          const next=editSeasonWorkspace(doc,{kind:'talent-node',slotIndex:index,key:d.id,value:1});
          api.stageTalentAllocation(next,index);
          state.talentNode=d.id;state.talentCoreGroup=null;return;
        }
        if(action==='talent-choose'){
          api.edit({kind:'talent-board',slotIndex:Number(d.index),value:d.id});
          if(state.overlay)delete state.overlay.talentSearch;
          state.talentNode=null;state.talentCoreGroup=null;state.talentPicking=false;return;
        }
        if (action === 'talent-allocate') { api.allocateTalent(d.id,1,{showLockedInInspector:true}); return; }
        if (action === 'talent-inspect') {
          state.talentNode=d.id;
          state.revealTalentNode=d.talentSearchResult!==undefined;
          state.focusRole='talent-inspector';
          return;
        }
        if (action === 'pact-inspect') {
          if(state.overlay?.rosterBase){
            api.stageBoard(state.overlay.rosterBase,{record:false});delete state.overlay.rosterBase;
          }
          state.pactRoster=null; state.pactIndex=Number(d.index); state.pactRing=d.key??null; state.focusRole='pact-inspector'; return;
        }
        if (action === 'pact-roster') {
          const index=Number(d.index);
          const levels=state.pactRoster?.index===index?state.pactRoster.levels:undefined;
          if(state.overlay?.type==='board'){
            const original=state.overlay.rosterBase??=state.overlay.document;
            if(d.id){
              let candidate=d.id===original.targetBuild.pact?.slots?.[index]?.spirit?.spiritId?original
                :editSeasonWorkspace(original,{kind:'spirit-selection',slotIndex:index,value:d.id});
              const level=levels?.get(d.id);
              if(level!==undefined)candidate=editSeasonWorkspace(candidate,{kind:'spirit-level',slotIndex:index,value:level});
              api.stageBoard(candidate,{record:false});
            }
          }
          state.pactIndex=index;state.pactRoster={index,id:d.id||null,query:state.pactRoster?.query??'',group:state.pactRoster?.group??'all',levels};return;
        }
        if(action==='pact-roster-filter'){
          if(state.pactRoster&&(d.value==='all'||SPIRIT_PICKER_GROUPS.some(([key])=>key===d.value)))state.pactRoster.group=d.value;
          return;
        }
        if (action === 'pact-clear') {api.edit({kind:'spirit-selection',slotIndex:Number(d.index),value:''});state.pactRing=null;return;}
        if (action === 'pact-roster-apply') {
          if(state.overlay?.type==='board'&&state.overlay.rosterBase){
            const draft=state.overlay;
            draft.history.record(draft.rosterBase.targetBuild,draft.document.targetBuild);
            delete draft.rosterBase;
          }
          if (state.pactRoster?.id && state.pactRoster.id!==api.workingDocument().targetBuild.pact?.slots?.[state.pactRoster.index]?.spirit?.spiritId) api.edit({kind:'spirit-selection',slotIndex:state.pactRoster.index,value:state.pactRoster.id});
          state.pactRoster=null; state.pactRing=null; return;
        }
        if (action === 'pact-spend') {
          api.edit({kind:'pact-allocation',slotIndex:Number(d.index),key:'sequence',value:Number(globalThis.document.getElementById('pact-spend-count').value)});
          return;
        }
        if (action === 'fate-slot') {
          const index=Number(d.index);
          const before=api.workingDocument();
          api.edit({kind:'fate-slot',slotIndex:index,value:d.value});
          const after=api.workingDocument();
          if(after===before)return;
          const count=after.targetBuild.pact.slots[index].undeterminedFate?.slots?.length ?? 0;
          const selected=/^extra-([0-4])$/u.exec(state.pactRing);
          if(d.value!=='remove'||!selected||Number(selected[1])>=count)
            state.pactRing=count ? 'extra-'+(count-1) : 'undetermined';
          state.focusRole='pact-inspector';
          return;
        }
        if (action === 'pact-allocation' || action === 'pact-select-destiny') {
          api.edit({kind:action==='pact-allocation'?action:'destiny-selection',slotIndex:Number(d.index),key:d.key,value:action==='pact-allocation'?Number(d.value):d.id??''});
          if(action==='pact-select-destiny'){
            const path=pactDestinyPath(Number(d.index),d.key);
            const report=state.overlay?.type==='board'?state.overlay.report:state.report;
            const missing=report.componentProjection.rows.find(row=>row.path===path)?.destinyRollControls?.find(control=>control.value==='');
            state.focusRole=missing?'pact-roll-'+missing.key:'pact-destiny-choice';
          }
          else if(d.key==='sequence'&&d.focusRole==='pact-destiny-choice')state.focusRole='pact-destiny-choice';
          return;
        }
        if (action === 'talent-step') {
          if(Number(d.index)===(state.talentIndex??0))api.allocateTalent(d.id,Number(d.step),{
            inspector:true,target:d.target===undefined?undefined:Number(d.target),
          });
          return;
        }
        if (action === 'clear-combat-conditions' || action === 'clear-effect-conditions') {
          api.flush();
          api.edit({kind:action});
          state.notice = action==='clear-effect-conditions'?'효과 조건을 자동으로 복원했습니다.':'수동 전투 조건을 초기화했습니다.';
          state.focusRole = 'training-dummy-picker';
          return;
        }
        if(action==='clear-skill-conditions'){
          const rowIndex=Number(d.index);
          api.flush();
          api.edit({kind:action,rowIndex});
          state.notice='이 스킬의 조건을 초기화했습니다.';
          state.focusRole=`dock-skill-conditions-${rowIndex}`;
          return;
        }
        if(action==='balance-cast-share'){
          const rowIndex=Number(d.index);
          api.flush();
          const slot=seasonCastShareSlots(state).find(row=>row.rowIndex===rowIndex);
          if(!Number.isFinite(slot?.remaining))return;
          const key=`${rowIndex}:useShare`;
          api.edit({kind:'dps-input',key,value:slot.remaining});
          state.focusField={edit:'dps-input',key,inResults:true};
          return;
        }
        if (action === 'confirm-dot-allocation') {
          api.flush();
          api.edit({kind:action,key:d.key});
          state.focusRole=`dot-allocation-${d.key}`;
          return;
        }
        if (action === 'assign-dot-window') {
          api.flush();
          const {overlaps:conflicts}=seasonDotWindowRepairs(state.report);
          const conflict=conflicts.find(row=>row.id===d.key && row.start===Number(d.start) && row.stop===Number(d.stop));
          api.edit({kind:action,conflict,winner:Number(d.index)});
          const next=seasonDotWindowRepairs(state.report).overlaps.find(row=>row.id===d.key);
          if (next) state.focusRole=seasonDotWindowRole(next);
          else state.focusField={edit:'dps-input',key:`${d.index}:dotWindows`,inResults:true};
          return;
        }
        if (action === 'trim-dot-window') {
          api.flush();
          const {bounds}=seasonDotWindowRepairs(state.report);
          const bound=bounds.find(row=>row.rowIndex===Number(d.index) && row.end===Number(d.end));
          const edit=seasonDotWindowTrim(state.document.targetBuild,bound);
          if (!edit) throw new Error('측정 구간이 바뀌었습니다. 적용 구간을 다시 확인하세요.');
          api.edit(edit);
          state.focusField={edit:edit.kind,key:edit.key,inResults:true};
          return;
        }
        if (action === 'merge-dot-windows') {
          api.flush();
          const index=Number(d.index);
          const edit=seasonDotWindowRepairs(state.report).sameSlot.includes(index)&&seasonDotWindowMerge(state.document.targetBuild,index);
          if (!edit) throw new Error('겹친 구간이 바뀌었습니다. 적용 구간을 다시 확인하세요.');
          api.edit(edit);
          state.focusField={edit:edit.kind,key:edit.key,inResults:true};
          return;
        }
        if(action==='confirm-partial-dps'){
          const review=!state.pending.size?seasonPartialDpsReview(state.document,state.report):null;
          if(review){
            state.partialDpsConfirmation=state.partialDpsConfirmation===review.confirmation?null:review.confirmation;
            try { storage.setItem(partialDpsKey(state.document.id),state.partialDpsConfirmation??''); }
            catch { state.notice='제외 설정을 이 브라우저에 저장하지 못했습니다.'; }
            if (state.analysis?.metric==='partialDps') state.analysis=null;
            state.upgrades=null;
            state.supportImpact=null;
            state.focusRole='partial-dps-toggle';
          }
          return;
        }
        if (action === 'result-tab') {
          state.showComparisonReasons = d.tab === 'analysis' && d.showReasons === 'true';
          state.showDpsNotes = d.tab === 'calculation' && d.showDps === 'true';
          if (d.tab === 'calculation' && /^[0-8]$/u.test(d.index??'')) state.calculationIndex = Number(d.index);
          if (RESULT_TABS.some(([key]) => key === d.tab)) {
            state.resultTab = d.tab;
            state.focusRole = d.focusRole;
            if(d.tab==='conditions'&&d.field)state.focusField={edit:d.field,key:d.fieldKey,inResults:true,row:d.row,support:d.support};
          }
          if(d.tab==='analysis'&&rankingRequested&&!state.upgrades&&!state.showComparisonReasons)void api.rank();
          return;
        }
        if (action==='support-matrix-category'||action==='support-matrix-selected') {
          if (state.section!=='support-matrix') return;
          state.supportMatrix ??= {};
          if (action==='support-matrix-category'&&Object.hasOwn(SUPPORT_CATEGORIES,d.category)) {
            state.supportMatrix.category=d.category;
            state.focusRole='support-matrix-search';
          } else if (action==='support-matrix-selected') {
            state.supportMatrix.selectedOnly=!state.supportMatrix.selectedOnly;
            state.focusRole='support-matrix-selected';
          }
          return;
        }
        if(action==='rank-options'||action==='rank-gear'){void api.rank();return;}
        if(action==='rank-slot-replacement'||action==='rank-skill-replacement'){
          const index=Number(d.index);
          const skill=action==='rank-skill-replacement';
          const fromGearPicker=!skill&&state.overlay?.type==='gear'&&state.overlay.index===index&&!state.picker?.candidate&&!state.picker?.draft;
          if(state.overlay&&!fromGearPicker||!Number.isInteger(index)||index<0)return;
          const fromImpact=d.fromImpact!==undefined&&state.resultTab==='analysis'&&state.upgradeGroup==='gearImpact'
            &&state.upgrades?.impacts?.some(row=>row.slotIndex===index)&&!state.lockedEquipmentSlots?.includes(index);
          const validTarget=skill?state.document.targetBuild.skills.active[index]?.skillId
            : index<SEASON_GEAR_SLOT_LABELS.length&&(state.section==='gear'||fromImpact);
          if(!validTarget)return;
          api.flush();
          if(fromGearPicker)api.closeOverlay();
          const scope=skill?{upgradeGroup:'skillReplacement',upgradeSkill:String(index)}:{upgradeGroup:'replacement',replacementSlot:String(index),upgradeGearName:''};
          Object.assign(state,{...scope,resultTab:'analysis',
            upgradeResultDirection:'improving',upgrades:null,focusRole:'upgrade-ranking-heading'});
          void api.rank();
          return;
        }
        if(action==='rank-cancel'){rankingRequested=false;state.upgrades=null;return;}
        if(action==='rank-resource-input'){
          const input=state.upgrades?.resources?.[Number(d.index)]?.edit;
          if(!input||state.pending.size)return;
          const destination={section:'combat',edit:input.kind,key:input.key};
          if(input.kind==='support-condition'){
            Object.assign(destination,{section:'skills',index:input.rowIndex,supportIndex:input.supportIndex});
          }else if(input.kind!=='blessing-input')destination.tab='conditions';
          api.openRequirement(destination);
          return;
        }
        if(action==='rank-blocked-more'&&state.upgrades){
          const job=state.upgrades;
          job.blockedLimit=(job.blockedLimit??BLOCKED_CANDIDATE_PAGE_SIZE)+BLOCKED_CANDIDATE_PAGE_SIZE;
          job.blockedFilter={...job.blockedFilter,exclusionsOpen:true};
          state.focusRole='rank-blocked-candidate-'+d.index;
          return;
        }
        if(action==='rank-more'&&state.upgrades){
          const job=state.upgrades;
          job.rankedLimit=(job.rankedLimit??RANKED_CANDIDATE_PAGE_SIZE)+RANKED_CANDIDATE_PAGE_SIZE;
          state.focusRole='ranked-candidate-'+d.index;
          return;
        }
        if(action==='compare-support-impact'){
          const rowIndex=Number(d.index);
          if(state.supportImpact?.rowIndex===rowIndex)state.supportImpact=null;
          else api.compareSupportImpact(rowIndex);
          state.focusRole='support-impact-'+rowIndex;
          return;
        }
        if(action==='inspect-contribution-skill'){
          state.calculationIndex=Number(d.index);
          state.resultTab='calculation';
          state.focusRole='calculation-skill';
          return;
        }
        if(action==='inspect-support-impact'){
          const rowIndex=Number(d.row),socket=Number(d.index);
          const pair=state.supportImpact?.rowIndex===rowIndex&&state.supportImpact.rows.some(row=>row.supportIndex===socket);
          if(!pair)return;
          const section=state.section;
          api.openSkill(rowIndex,socket);
          state.overlay.returnSection=section;
          state.overlay.returnRole='support-impact-edit-'+rowIndex+'-'+socket;
          return;
        }
        if(action==='rank-copy'||action==='rank-open-copy'){
          const job=state.upgrades;
          const row=d.index==='assembled'?job?.assembled:(job?.rankedRows??job?.rows)?.[Number(d.index)];
          if(!row||state.pending.size)return;
          let saved=null;
          if(row.saved){
            const loaded=loadSeasonWorkspaces(storage);
            if(loaded.error)throw Error(loaded.error);
            saved=matchingRankCopy(row,loaded.documents);
          }
          if(action==='rank-open-copy'){
            const origin=captureAnalysisOrigin();
            const baseline=origin??state.document, baselineReport=state.report;
            const returnState=captureRankReturn(baseline,{openedIndex:d.index});
            const copy=saved?null:copySeasonUpgrade(state.document,state.report,row,state.partialDpsConfirmation);
            const changes=[origin,copy].filter(Boolean);
            if(changes.length)saveSeasonWorkspaces(storage,changes);
            if(origin)saveRankExclusions(origin,row);
            if(copy)rememberRankCopy(row,copy);
            saveRankExclusions(copy??saved,row);
            api.open(row.saved,{preserveCurrent:true});
            state.editComparison=editComparison.reset(state.document,state.report,{document:baseline,report:baselineReport});
            state.rankTrialOrigin=baseline.id;
            state.rankTrialReturn=returnState;
            state.resultTab='analysis';
            state.focusRole='return-rank-origin';
            return;
          }
          if(saved)return;
          const copy=copySeasonUpgrade(state.document,state.report,row,state.partialDpsConfirmation);
          const created=saveSeasonWorkspace(storage,copy);
          saveRankExclusions(created,row);
          rememberRankCopy(row,created);
          state.notice=created.targetBuild.name+' 저장됨';
          return;
        }
        if(action==='rank-skill-trial'||action==='rank-gear-trial'){
          const skill=action==='rank-skill-trial';
          const row=(skill?state.upgrades?.blockedSkills:state.upgrades?.blockedGear)?.[Number(d.index)];
          if(!row||state.pending.size)return;
          const inputIndex=d.input===undefined?undefined:Number(d.input);
          const selectedInput=inputIndex===undefined?undefined:row.inputs?.[inputIndex];
          if(inputIndex!==undefined&&!selectedInput)return;
          const metric=state.upgrades.metric;
          const copy=skill?copySeasonSkillTrial(state.document,row):copySeasonGearTrial(state.document,row);
          const origin=captureAnalysisOrigin();
          const baseline=origin??state.document, baselineReport=state.report;
          const returnState=captureRankReturn(baseline,{blockedIndex:Number(d.index),inputIndex});
          saveSeasonWorkspaces(storage,origin?[origin,copy]:[copy]);
          if(origin&&returnState.partialConfirmation)saveRankExclusions(origin,returnState);
          api.open(copy.id,{preserveCurrent:true});
          state.editComparison=editComparison.reset(state.document,state.report,{document:baseline,report:baselineReport});
          state.rankTrialOrigin=baseline.id;
          state.rankTrialReturn=returnState;
          if(!skill&&state.report.fullDps.supported){
            api.openGear(row.edits[0].slotIndex,false);
            state.notice='장비 시험 사본을 열었습니다.';
            return;
          }
          state.section='overview';
          if(skill)state.calculationIndex=row.edits[0].rowIndex;
          state.resultTab='calculation';
          state.showDpsNotes=true;
          state.notice='시험 사본을 열었습니다. 전체 DPS 보류 이유를 확인하세요.';
          state.focusRole='calculation-requirements';
          const result=state.report[metric??preferredSeasonDpsMetric(state.report)];
          const inputs=rankTrialInputs(state.report,result);
          const destination=selectedInput?inputs.find(link=>link.edit===selectedInput.edit&&link.key===selectedInput.key
            &&link.index===selectedInput.index&&link.supportIndex===selectedInput.supportIndex&&link.ring===selectedInput.ring):inputs[0];
          if(destination){
            api.openRequirement(destination);
            state.notice='시험 사본을 열었습니다. 조건을 입력하면 DPS를 다시 계산합니다.';
          }
          return;
        }
        if(action==='return-rank-origin'&&state.rankTrialOrigin){
          const back=state.rankTrialReturn;
          api.open(state.rankTrialOrigin);
          state.section='overview';state.resultTab='analysis';state.focusRole='result-tab-analysis';
          if(back){
            Object.assign(state,back.controls);
            if(back.basis===rankBasis(state.document)&&(!back.job.usesShelf||back.job.shelfBasis===gearShelfBasis(readShelf(storage)))){
              if(!back.job.partial||back.partialConfirmation===state.partialDpsConfirmation){
                state.upgrades=back.job;
                for(const row of [...(back.job.rankedRows??back.job.rows),back.job.assembled])
                  if(row?.saved&&!matchingRankCopy(row,state.documents))forgetRankCopy(row);
                state.upgrades.openBlockedCandidate=back.blockedIndex;
                if(Number.isInteger(back.blockedIndex))state.focusRole='rank-blocked-trial-'+back.blockedIndex+(back.inputIndex>0?'-'+back.inputIndex:'');
                else if(back.openedIndex!==undefined)state.focusRole='rank-open-copy-'+back.openedIndex;
              }else if(defaultSavedDpsMetric()==='partialDps')void api.rank();
            }
          }
          return;
        }
        if (action === 'compare-builds') { api.compare(); return; }
        if (action === 'open-saved-encounter-input') {
          const change=state.analysis?.rows.find(row=>row.id===d.id)?.encounterChanges?.find(
            entry=>entry.tab==='conditions'&&entry.edit==='dps-input'&&entry.key===d.fieldKey);
          if(change){
            api.open(d.id);
            api.openRequirement(change);
          }
          return;
        }
        if (action === 'open-saved-dps-input') {
          const {metric,rows}=state.analysis??{};
          if(!rows?.some(row=>row.id===d.id&&row.calculationIssues?.some(group=>group.cause==='input')))return;
          api.open(d.id);
          state.resultTab='calculation';
          state.showDpsNotes=true;
          state.focusRole='calculation-requirements';
          const inputs=rankTrialInputs(state.report,state.report[metric]);
          if(inputs.length===1)api.openRequirement(inputs[0]);
          return;
        }
        if (action === 'choose-saved-comparison') {
          const comparison=state.analysis;
          const loaded=loadSeasonWorkspaces(storage);
          if(loaded.error)throw Error(loaded.error);
          state.documents=loaded.documents;
          state.overlay={type:'saves',query:comparison?.returnQuery??'',comparisonPicker:true};
          state.focusRole=loaded.documents.some(document=>document.id===comparison?.savedId)
            ?'compare-saved-'+encodeURIComponent(comparison.savedId):'dialog-heading';
          return;
        }
        if (action === 'compare-saved' && state.overlay?.type==='saves' && d.id && d.id!==state.document.id) {
          if(!state.overlay.comparisonPicker)state.analysisMetric=defaultSavedDpsMetric();
          api.compare(d.id,state.overlay.query??'');
          state.overlay=null;
          state.resultTab='analysis';
          state.focusRole='saved-build-comparison';
          return;
        }
        if (action === 'reset-comparison') { api.resetComparison(); return; }
        if (["section", "advisor-open-section", "inspect-skill", "inspect-gear", "inspect-socket", "edit-slot", "requirement"].includes(action)) state.picker = null;
        if (["inspect-skill","inspect-gear"].includes(action) && globalThis.matchMedia?.("(max-width:760px)").matches) state.focusRole = "slot-detail-heading";
        if (action === "section" || action === "advisor-open-section") { state.section = d.section === "dps" ? "combat" : d.section; state.overlay = null; }
        else if (action === "pick-hunter") {
          if(state.overlay?.type!=='hero')return;
          const current=state.document.targetBuild.ss14Inputs.heroSelection?.heroId;
          const edit={kind:'hero-selection',value:d.id};
          const candidate=d.id===current?null:previewSlotEdit(state.document,state.report,edit,{includeSnapshot:true});
          Object.assign(state.overlay,{candidateId:d.id,candidate,baseline:state.document});
          state.focusRole=candidate?'hero-preview':'hero-choice-'+d.id;
        }
        else if(action==='apply-hunter'){
          const overlay=state.overlay;
          if(overlay?.type!=='hero'||!overlay.candidate||overlay.baseline!==state.document)return;
          api.edit({kind:'hero-selection',value:overlay.candidateId});
          api.closeOverlay(true);
        }
        else if (action === "pick-trait") {
          api.edit({ kind: "hero-choice", key: d.level, choiceIndex:Number(d.choiceIndex??0), value: d.value });
        }
        else if(action==='inspect-calculation-skill'){
          const section=state.section;
          api.openSkill(Number(d.index));
          state.overlay.returnSection=section;
          if(d.returnRole==='partial-dps-review')state.overlay.returnRole=d.returnRole;
        }
        else if (action === "inspect-skill") api.openSkill(Number(d.index),null,d.role?.startsWith('skill-slot-'));
        else if (action === "inspect-gear") api.openGear(Number(d.index));
        else if (action === "inspect-socket") {
          const i=Number(d.index);
          api.openSkill(Number(d.row??state.skillIndex),Number.isInteger(i)&&i>=0&&i<5?i:null,d.role?.startsWith('skill-socket-'));
          if(d.boardSocket!==undefined&&globalThis.matchMedia?.('(max-width:899px),(max-height:500px)').matches)
            state.focusRole='skill-selection-pane';
        }
        else if (action === "edit-slot") {
          const section=state.section;
          if (d.type === "gear") api.openGear(Number(d.index));
          else if (d.type === "skills") api.openSkill(Number(d.index));
          else if (d.type === "memory") api.openMemory(Number(d.index));
          else if(['talents','pact','divinity'].includes(d.type)) {
            if(d.type==='talents'){
              state.talentIndex=Number(d.index)||0;
              if(d.analysisReturn){state.talentNode=null;state.talentCoreGroup=null;}
            }
            if(d.type==='pact'){
              state.pactIndex=Number(d.index)||0;
              if(d.analysisReturn){state.pactRing=d.key??null;state.pactRoster=null;}
            }
            api.openBoard(d.type);
            if(d.analysisReturn&&d.type==='pact')state.focusRole='pact-inspector';
            if(d.analysisReturn&&d.type==='divinity'){
              const selectedId=slateEditorBoard(state.document.targetBuild).slateInventory.find(slate=>slate.instanceId===d.key)?.instanceId;
              state.slateEditor={...createSlateEditorState(),selectedId:selectedId??null};
              if(selectedId)state.focusRole='slate-inspector';
            }
          }
          else state.overlay = { type: d.type, index: Number(d.index), ...(d.choiceIndex!==undefined?{choiceIndex:Number(d.choiceIndex)}:{}),
            ...(d.type==='extensions'?{initial:{document:state.document,report:state.report}}:{}) };
          if(d.analysisReturn&&state.overlay)state.overlay.analysisReturn={section,role:d.analysisReturn};
        }
        else if (action === "requirement") {
          api.openRequirement({section:d.section,index:Number(d.index)||0,supportIndex:/^[0-4]$/u.test(d.support??'')?Number(d.support):null,
            ring:d.ring,type:d.type,role:d.focusRole,edit:d.field,key:d.fieldKey});
        }
        else if (action === "close") api.closeOverlay();
        else if (action === "picker-gear-kind") {
          resetGearCandidate({gearKind:d.category,filter:''});
          state.focusRole=d.focusRole??d.role;
        }
        else if (action === "picker-group") {
          resetGearCandidate({filter:d.filter});
          state.focusRole=d.role;
        }
        else if (action === "open-picker") state.picker = { candidate: "", query: "" };
        else if (action === 'skill-picker-reset' && state.overlay?.type==='skills' && state.picker) {
          Object.assign(state.picker,{query:'',tags:[],candidate:'',preview:null,edit:null});
          state.focusRole='skill-picker-search';
        }
        else if (action === 'gear-candidate-list') {
          const {candidate,returnGearOption}=state.picker;
          resetGearCandidate();
          state.focusRole='gear-option-'+(returnGearOption??candidate);
        }
        else if (action === 'skill-candidate-list' && state.picker?.candidate) {
          state.focusRole='skill-option-'+state.picker.candidate;
          Object.assign(state.picker,{candidate:'',preview:null,edit:null});
        }
        else if (action === "cancel-picker") state.picker = null;
        else if(action==='preview-gear-removal'){
          const index=state.gearIndex, worn=state.document.targetBuild.gear?.slots?.[index]?.itemId;
          if(state.overlay?.type!=='gear'||!worn||state.picker?.candidate!==worn)return;
          state.picker.removalPreview=state.picker.removalPreview?null
            :previewSlotEdit(state.document,state.report,{kind:'gear-selection',slotIndex:index,value:''});
          state.focusRole=state.picker.removalPreview?'gear-removal-preview':'gear-removal-toggle';
        }
        else if(action==='view-worn-gear'){
          const index=state.gearIndex,id=state.document.targetBuild.gear?.slots?.[index]?.itemId;
          if(id){
            const returnGearOption=state.picker?.candidate;
            resetGearCandidate({returnGearOption});
            selectGearCandidate(index,id);
            state.focusRole='candidate-detail';
          }
        }
        else if (action === "preview-item") {
          const gear=state.section==='gear', index=gear?state.gearIndex:state.skillIndex;
          if(gear&&state.picker?.candidate===d.id&&workshop())return;
          if(gear)selectGearCandidate(index,d.id);
          else selectSkillCandidate(d.id);
          state.focusRole='candidate-detail';
        }
        else if (action === "equip-item" || action === "clear-slot") {
          if (!["gear-selection", "skill-selection", "support-selection"].includes(d.kind)) throw new Error("선택할 슬롯을 확인하세요.");
          const rowIndex=Number(d.index),supportIndex=Number(d.support);
          const candidate=action==='equip-item'&&d.kind!=='gear-selection'&&state.picker?.candidate===d.id
            && state.skillIndex===rowIndex
            && (d.kind==='support-selection'?state.supportIndex===supportIndex:!Number.isInteger(state.supportIndex));
          if(candidate)selectSkillCandidate(d.id);
          api.edit(candidate?state.picker.edit:{kind:d.kind,slotIndex:rowIndex,rowIndex,
            supportIndex,value:action==='clear-slot'?'':d.id});
          state.picker = null;
          if(action==='equip-item'&&d.kind==='gear-selection')keepConfirmed('gear',Number(d.index));
          if (d.kind==='gear-selection'&&state.overlay?.type==='gear') state.focusRole='gear-drawer-heading';
        }
        else if (action === "effect-sources") state.overlay = { type: "effects" };
        else if (action==='edit-effect-source'&&(!state.overlay||state.overlay.type==='effects')){
          const target=effectSourceEditor(d.sourcePath);
          if(!target)return;
          const section=state.section,overlay=state.overlay&&{...state.overlay,selectedKey:d.sourceKey};
          if(target.type==='gear')api.openGear(target.index);
          else api.openSkill(target.index,target.support);
          if(overlay)state.overlay.effectReturn={section,overlay};
          else state.overlay.numericOptionReturn=section;
        }
        else if (action === "save") api.save();
        else if (action === "saves") { const loaded = loadSeasonWorkspaces(storage); if (loaded.error) throw new Error(loaded.error); state.documents = loaded.documents; state.overlay = { type: "saves" }; }
        else if (action === 'new-build' && state.overlay?.type==='saves' && !state.overlay.deleteCandidate) {
          const blank=createSeasonWorkspace(prepareSeasonMigration(createDefaultBuild()));
          const backup=state.dirty?currentBuildCopy(' · 편집 사본'):null;
          saveSeasonWorkspaces(storage,backup?[backup,blank]:[blank]);
          api.open(blank.id,{preserveCurrent:true});
          state.section='overview';
          state.resultTab='stats';
          state.focusRole='build-name';
          if(backup)state.notice='새 빌드를 열었습니다. 이전 편집은 사본으로 저장했습니다.';
        }
        else if (action === 'request-delete-save' && state.overlay?.type==='saves') {
          const target=state.documents.find(document=>document.id===d.id);
          if(!target)throw Error('저장한 빌드를 찾을 수 없습니다.');
          state.overlay.deleteCandidate=target;
          state.overlay.notice='';
          state.focusRole='dialog-heading';
        }
        else if (action === 'cancel-delete-save' && state.overlay?.type==='saves') {
          state.overlay.deleteCandidate=null;
          state.focusRole='dialog-heading';
        }
        else if (action === 'confirm-delete-save' && state.overlay?.type==='saves' && state.overlay.deleteCandidate) {
          const target=state.overlay.deleteCandidate;
          const active=state.document.id===target.id;
          const draft=active?importSeasonWorkspace(exportSeasonWorkspace(state.document)):null;
          state.documents=deleteSeasonWorkspace(storage,target);
          state.analysis=null;
          for(const job of [state.upgrades,state.rankTrialReturn?.job]){
            for(const row of [...(job?.rankedRows??job?.rows??[]),job?.assembled])
              if(row?.saved===target.id)forgetRankCopy(row);
          }
          if(active||state.rankTrialOrigin===target.id){
            state.rankTrialOrigin=null;
            state.rankTrialReturn=null;
          }
          if(draft){
            state.document=draft;
            savedDocument=null;
            savedTarget=JSON.stringify(draft.targetBuild);
            state.dirty=false;
            state.partialDpsConfirmation=null;
            state.history.clear();
            state.picker=null;
            recalculate();
            state.editComparison=editComparison.reset(state.document,state.report);
            state.notice='저장본을 삭제했습니다. 현재 편집 내용은 화면에 남아 있습니다.';
          }
          state.overlay.deleteCandidate=null;
          state.overlay.notice=active?state.notice:'저장 빌드를 삭제했습니다.';
          state.focusRole='dialog-heading';
        }
        else if (action === "open") api.open(d.id);
        else if(action==='preview-ring-swap'&&!state.overlay) {
          state.overlay={type:'ring-swap',preview:previewSlotEdit(state.document,state.report,{kind:'swap-rings'})};
          state.focusRole='dialog-heading';
        }
        else if(action==='apply-ring-swap'&&state.overlay?.type==='ring-swap'){
          api.edit({kind:'swap-rings'});
          api.closeOverlay();
        }
        else if (action === 'reset-build') {state.overlay={type:'reset-build'};state.focusRole='dialog-heading';}
        else if (action === 'confirm-reset-build') api.resetBuild();
        else if (action === "files") state.overlay = { type: "files", ...(state.overlay?.type==='board'?{boardDraft:state.overlay}:{}) };
        else if (action === 'open-ingame-code' && canLookUpIngameBuild()) state.overlay = {type:'ingame-code',code:'',result:null,busy:false};
        else if (action === 'apply-ingame-build' && state.overlay?.type==='ingame-code' && state.overlay.preview?.document) {
          api.openSharedCopy(state.overlay.preview.document);
          state.notice='인게임 구성의 확인된 항목을 새 사본으로 열었습니다.';
        }
        else if (action === 'board-import-apply') api.finishBoardImport(true);
        else if (action === 'board-import-discard') api.finishBoardImport(false);
        else if (action === "local-log") { assertLocalLogAccess(); state.overlay = { type: "local-log" }; state.logImport = null; ++logRequest; }
        else if (action === "apply-local-log") {
          assertLocalLogAccess();
          if (!state.logImport?.preview || state.logImport.loading) throw new Error("먼저 로컬 로그를 읽고 반영할 슬롯을 선택하세요.");
          api.flush();
          const copy = applyLocalGameLog(state.document, state.logImport.preview);
          const importedSlates = state.logImport.preview.slates?.selected && !state.logImport.preview.slates.blocked;
          openIncomingCopy(copy,'선택한 항목을 새 로그 사본에 반영했습니다.');
          state.logImport = null; ++logRequest;
          state.section = importedSlates ? "divinity" : "skills";
        }
        else if (action === "add-slate") api.edit({ kind: "slate-add", value: globalThis.document.getElementById("native-slate-type").value, key: globalThis.document.getElementById("native-slate-shape").value });
        else if (action === "rotate-slate" || action === "remove-slate") {
          api.edit({ kind: action === "rotate-slate" ? "slate-rotate" : "slate-remove", key: d.id });
          if(action==='remove-slate')state.slateEditor=createSlateEditorState();
        }
        else if (action === "copy") {
          const saved = saveSeasonWorkspace(storage, currentBuildCopy(' · 사본'));
          api.open(saved.id,{preserveCurrent:true});
        } else if (action === "download-build") {
          const doc=api.workingDocument();
          downloadJson("TOB-SS14-"+doc.targetBuild.name.replace(/[<>:"/\\|?*]/gu,"_")+".json",exportSeasonWorkspace(doc));
        } else if (action==='download-91-file') {
          void api.download91File();
        } else if (action==='open-screenshot-import'&&state.overlay?.type==='files'&&!isOfflineEdition()) {
          state.overlay={type:'screenshot',filesPanel:state.overlay,status:'idle',matches:[]};
          state.focusRole='dialog-heading';
        } else if (action==='screenshot-match'&&state.overlay?.type==='screenshot') {
          const panel=state.overlay;
          const match=panel.matches.find(row=>row.id===d.id);
          panel.selected=d.id;panel.target=null;panel.notice='';panel.gearValues=[];panel.valueKeys=[];
          panel.skillLevel=findSeasonScreenshotSkillLevel(panel.texts??[],match);
          panel.acceptSkillLevel=false;
          state.focusRole='screenshot-result-'+d.id;
        } else if (action==='screenshot-apply') {
          api.applyScreenshotTarget();
        } else if (action==='screenshot-read-region'||action==='screenshot-read-full') {
          void api.recognizeScreenshot(action==='screenshot-read-region');
        } else if (action==='screenshot-clear-region'&&state.overlay?.type==='screenshot') {
          state.overlay.region=null;
          state.overlay.error='';
        } else if (action==='screenshot-apply-region'&&state.overlay?.type==='screenshot'&&state.overlay.status!=='reading') {
          const fields=root?.querySelectorAll('[data-screenshot-region]')??[];
          const values=Object.fromEntries([...fields].map(field=>[field.dataset.screenshotRegion,
            field.value.trim()===''?NaN:Number(field.value)/100]));
          const region=normalizeScreenshotRegion(values);
          if (region) {state.overlay.region=region;state.overlay.error='';}
          else state.overlay.error='영역의 너비와 높이는 각각 2% 이상이어야 합니다.';
          state.focusRole='screenshot-apply-region';
        } else if (action === "import") {
          api.importCopy(globalThis.document.getElementById("native-import").value);
        } else if (action === "advisor-apply-game-critical") api.edit({ kind: "game-critical-input", key: d.row });
        else if (action === "advisor-select-thea-board") api.edit({ kind: "thea-board", value: globalThis.document.getElementById("season-thea-board").value });
      });
      return true;
    },
    openSharedCopy(imported) {
      openIncomingCopy(imported,'공유 빌드를 새 사본으로 열었습니다.');
      state.section = 'overview';
    },
    async followShareLink(location, history) {
      const hash = location?.hash;
      const code = sharedCodeFromHash(hash);
      if (code === null) return;
      try {
        const imported = await decodeBuildCode(code);
        if (location.hash !== hash) return;
        api.openSharedCopy(imported);
        api.active = true;
        history.replaceState(history.state, '', location.pathname + location.search);
      } catch (error) {
        if (location.hash !== hash) return;
        state.error = '공유 링크를 열 수 없습니다. ' + error.message;
      }
      api.render();
    },
    async lookUpIngameCode() {
      const panel=state.overlay;
      if(panel?.type!=='ingame-code' || panel.busy || !canLookUpIngameBuild())return;
      panel.code=globalThis.document.getElementById('ingame-build-code')?.value??'';
      panel.busy=true;
      panel.result=null;
      panel.preview=null;
      state.error='';
      api.render();
      try {
        const result=await lookUpIngameBuild(panel.code);
        if(state.overlay!==panel)return;
        panel.preview=prepareIngameBuildImport(result,state.document);
        panel.result=result;
      }
      catch(error) { if(state.overlay===panel)state.error=error.message; }
      finally { panel.busy=false; }
      if(state.overlay===panel)api.render();
    },
    async share(action,id) {
      let panel=state.overlay;
      try {
        if (action==='share'||action==='share-saved') {
          const savedList=action==='share-saved'&&panel?.type==='saves'&&!panel.deleteCandidate?panel:null;
          if(action==='share-saved'&&!savedList)return;
          let source;
          if(savedList){
            const saved=loadSeasonWorkspaces(storage);
            if(saved.error)throw Error(saved.error);
            source=saved.documents.find(document=>document.id===id);
            if(!source)throw Error('저장한 빌드를 찾을 수 없습니다.');
          } else {
            api.flush();
            source=state.document;
          }
          panel={type:'share',code:'',link:'',paste:'',message:'',busy:false,
            ...(savedList&&{savedList,sourceName:source.targetBuild.name,returnRole:'share-saved-'+encodeURIComponent(id)})};
          state.overlay=panel;
          state.error='';
          state.focusRole='dialog-heading';
          api.render();
          panel.code=await encodeBuildCode(source);
          panel.link=buildShareUrl(panel.code);
        } else {
          if (panel?.type!=='share' || panel.busy) return;
          panel.paste=globalThis.document.getElementById('share-paste')?.value??'';
          if (action==='copy-code' || action==='copy-link') {
            const link = action === 'copy-link';
            try { await navigator.clipboard.writeText(link ? panel.link : panel.code); panel.message=link?'공유 링크를 복사했습니다.':'코드를 복사했습니다.'; }
            catch {
              const field=globalThis.document.getElementById(link ? 'share-link' : 'share-code');
              if(state.overlay===panel && field) {
                const status=globalThis.document.getElementById('share-status');
                if(status)status.textContent=link?'선택한 링크를 복사하세요.':'선택한 코드를 복사하세요.';
                field.focus();field.select();return;
              }
            }
          } else {
            panel.busy=true;
            const imported=await decodeBuildCode(panel.paste);
            if(state.overlay!==panel)return;
            api.openSharedCopy(imported);
            api.render();return;
          }
        }
      } catch(error) {
        if(state.overlay===panel)state.error=error.message;
      } finally {if(panel?.type==='share')panel.busy=false;}
      if(state.overlay===panel) {
        panel.paste=globalThis.document?.getElementById('share-paste')?.value??panel.paste;
        api.render();
      }
    },
    allocateTalent(id,step,{inspector=false,target,showLockedInInspector=false}={}) {
      if(state.overlay?.section!=='talents'||(target===undefined&&![-1,1].includes(step)))return;
      const index=state.talentIndex??0,doc=api.workingDocument(),build=doc.targetBuild,board=build.talents?.boards?.[index];
      const nodes=index===3&&hasRevelation(build)?revelationNodeOptions(build):seasonTalentNodes(board?.treeSlug);
      const reflected=id?.startsWith('reflected:')&&inverseGeometry(build,index)?.nodes.find(n=>n.isReflected&&n.storageNodeId===id);
      const node=nodes.find(n=>n.id===(reflected?.flatItemId??id));
      if(!node||(node.core&&!inspector))return;
      if(target!==undefined&&![0,node.max].includes(target))return;
      state.talentNode=id;state.focusRole=inspector?'talent-inspector':'talent-node-'+id;
      if(state.overlay.prism||state.overlay.inverse)return;
      if([build.talents.placedPrism,build.talents.placedInverseImage].some(p=>p?.boardIndex===index&&p.nodeId===id))return;
      const current=node.core?Number(board.coreTalentIds?.includes(id)??false):(reflected?board.reflectedNodePoints:board.nodePoints)?.[id]??0;
      const value=target??current+step;
      if(value===current||value<0||value>node.max)return;
      const next=editSeasonWorkspace(doc,{kind:reflected?'inverse-point':'talent-node',slotIndex:index,key:id,value});
      api.stageTalentAllocation(next,index,{showLockedInInspector});
    },
    talentContextMenu(event) {
      const node=event.target?.closest?.('[data-talent-node]');
      if(!node||state.overlay?.section!=='talents')return;
      event.preventDefault();
      api.run(()=>api.allocateTalent(node.dataset.id,-1));
    },
    slateDragStart(event) {
      const cell=event.target.closest?.('[data-slate-id][draggable="true"]');
      const slate=slateEditorBoard(api.workingDocument().targetBuild).slateInventory.find(s=>s.instanceId===cell?.dataset.slateId);
      if(!slate?.anchor)return;
      state.slateDrag={id:slate.instanceId,dx:Number(cell.dataset.x)-slate.anchor.x,dy:Number(cell.dataset.y)-slate.anchor.y,offsets:slatePreviewOffsets(slate)};
      event.dataTransfer?.setData('text/plain','TOB 석판 이동');
      if(event.dataTransfer)event.dataTransfer.effectAllowed='move';
    },
    slateDrop(event) {
      const cell=event.target.closest?.('[data-ss14-action="slate-cell"]'),drag=state.slateDrag;
      state.slateDrag=null;if(!cell||!drag)return;
      event.preventDefault();
      api.run(()=>{
        if(!state.overlay)api.openBoard('divinity');
        api.flush();api.edit({kind:'slate-move',key:drag.id,value:{x:Number(cell.dataset.x)-drag.dx,y:Number(cell.dataset.y)-drag.dy}});
        Object.assign(state.slateEditor,{selectedId:drag.id,draft:null,moving:false});
      });
    },
    keydown(event) {
      if(event.key==='Enter'&&!event.isComposing&&event.target?.hasAttribute?.('data-shelf-name')){
        event.preventDefault();
        event.target.closest('[data-role="shelf-management"]')?.querySelector('[data-ss14-action="shelf-rename"]')?.click();
        return;
      }
      const pickerControl = event.target?.closest?.('[data-picker-filter], [data-picker-option]');
      if (pickerControl && !event.isComposing && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
        && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        const options = [...pickerControl.closest('.native-item-picker').querySelectorAll('[data-picker-option]:not([hidden])')];
        if (!options.length) return;
        const index = options.indexOf(pickerControl);
        const last = options.length - 1;
        const next = event.key === 'ArrowDown' ? Math.min(index + 1, last) : index < 0 ? last : Math.max(index - 1, 0);
        for (const [position, option] of options.entries()) option.tabIndex = position === next ? 0 : -1;
        event.preventDefault();
        options[next].focus({preventScroll:true});
        options[next].scrollIntoView({block:'nearest'});
        return;
      }
      const talent=event.target?.closest?.('[data-talent-node]');
      if(talent&&state.overlay?.section==='talents'&&event.key==='Delete'&&!event.altKey&&!event.ctrlKey&&!event.metaKey){
        event.preventDefault();api.run(()=>api.allocateTalent(talent.dataset.id,-1));return;
      }
      const memoryPicker=event.target?.closest?.('[data-memory-picker][open]');
      if(event.key==='Escape'&&memoryPicker){
        event.preventDefault();memoryPicker.open=false;memoryPicker.querySelector('summary').focus();return;
      }
      const cell=state.overlay?.section==='divinity' && event.target?.closest?.('[data-slate-id][draggable="true"]');
      const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      if(state.overlay?.section==='divinity'&&(state.slateEditor.draft||state.slateEditor.moving)
        &&!event.altKey&&!event.ctrlKey&&!event.metaKey&&directions[event.key]){
        const anchor=event.target?.closest?.('.slate-interactive-board .slate-board-cell');
        if(anchor){
          event.preventDefault();
          const [dx,dy]=directions[event.key], x=Number(anchor.dataset.x)+dx,y=Number(anchor.dataset.y)+dy;
          const next=anchor.closest('.slate-interactive-board')?.querySelector(`[data-x="${x}"][data-y="${y}"]`);
          next?.focus();
          return;
        }
      }
      if(cell && !event.altKey && !event.ctrlKey && !event.metaKey && (directions[event.key] || event.key==='Delete' || event.key.toLowerCase()==='r')){
        event.preventDefault();
        api.run(()=>{
          api.flush();
          const id=cell.dataset.slateId, x=Number(cell.dataset.x), y=Number(cell.dataset.y);
          state.focusRole='slate-cell-'+x+'-'+y;
          if(event.key==='Delete'){
            api.edit({kind:'slate-unplace',key:id});
            state.slateEditor={...createSlateEditorState(),selectedId:id};
            state.focusRole='slate-inspector';
          } else if(event.key.toLowerCase()==='r') {
            api.edit({kind:'slate-rotate',key:id});
            Object.assign(state.slateEditor,{selectedId:id,draft:null,moving:false,socket:null});
            const rotatedCell=slateEditorBoard(api.workingDocument().targetBuild).cells.find(c=>c.slateInstanceId===id);
            if(rotatedCell)state.focusRole='slate-cell-'+rotatedCell.x+'-'+rotatedCell.y;
          } else {
            const slate=slateEditorBoard(api.workingDocument().targetBuild).slateInventory.find(item=>item.instanceId===id);
            const [dx,dy]=directions[event.key];
            api.edit({kind:'slate-move',key:id,value:{x:slate.anchor.x+dx,y:slate.anchor.y+dy}});
            Object.assign(state.slateEditor,{selectedId:id,draft:null,moving:false});
            state.focusRole='slate-cell-'+(x+dx)+'-'+(y+dy);
          }
        });
        return;
      }
      if(state.overlay?.type==='board'||workshop()){
        if(event.key==='Escape'){event.preventDefault();api.run(()=>api.closeOverlay());return;}
        if((event.ctrlKey||event.metaKey)&&['s','z','y'].includes(event.key.toLowerCase())){
          if(state.overlay?.type==='board'&&!event.altKey&&['z','y'].includes(event.key.toLowerCase())
            &&!event.target?.closest?.('input,textarea,select,[contenteditable=true]')){
            event.preventDefault();api.run(()=>api.restoreBoard(event.shiftKey||event.key.toLowerCase()==='y'));return;
          }
          if(event.key.toLowerCase()==='s'||!event.target?.closest?.('input,textarea'))event.preventDefault();
          return;
        }
      }
      const editingText = event.target?.closest?.("input, textarea, select, [contenteditable=true]");
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !editingText && ["z", "y"].includes(event.key.toLowerCase())) {
        event.preventDefault(); api.run(() => api.restore(event.shiftKey || event.key.toLowerCase() === "y")); return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); api.run(() => api.save()); }
      if (event.key === "Escape" && state.overlay) { event.preventDefault(); api.run(() => { api.flush(); api.closeOverlay(); }); }
      if (event.key === "Tab" && state.overlay) {
        const nodes = [...(globalThis.document.querySelectorAll?.('.season-native-modal button:not([disabled]), .season-native-modal input:not([disabled]), .season-native-modal select:not([disabled]), .season-native-modal textarea:not([disabled]), .season-native-modal summary, .season-native-modal a[href]') ?? [])].filter(el => el.tabIndex >= 0 && el.getClientRects?.().length);
        const first = nodes[0], last = nodes.at(-1);
        if (event.shiftKey && globalThis.document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && globalThis.document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    },
  };
  return api;
}
