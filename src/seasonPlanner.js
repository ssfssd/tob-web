import { matchingTrainingDummy } from "./seasonTrainingDummy.js";
import { downloadJson } from "./downloadJson.js";
import { isOfflineEdition, setPlannerHtml } from "./offlinePresentation.js";
import { createSeasonWorkspace, resetSeasonWorkspace, editSeasonWorkspace, loadSeasonWorkspaces, saveSeasonWorkspace, exportSeasonWorkspace, importSeasonWorkspace } from "./seasonWorkspace.js";
import { prepareSeasonMigration } from "./seasonMigration.js";
import { calculateEditorSeasonBuild } from "./seasonAssumedDps.js";
import { renderSeasonPlanner, renderNativeDps, renderEditHistory, renderEffectSources, renderBoardComparison, renderDrawerBar, renderSkillPickerFooter, renderSkillCandidateResult, renderEquippedSkillStats, skillSealSummary, nativeSaveStatus } from "./seasonPlannerView.js";
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { seasonExclusiveSupportSlots } from "./seasonSupport.js";
import { filterSeasonSelection } from "./seasonSelectionSearch.js";
import { createSeasonEditHistory } from "./seasonEditHistory.js";
import { rebindLogGear } from "./seasonLogGear.js";
import { readLocalGameLog, previewLocalGameLog, applyLocalGameLog } from "./localGameLogImport.js";
import { assertLocalLogAccess } from "./runtimePolicy.js";
import { createSlateEditorState, handleSlateEditorAction, slateEditorBoard, showSlateFootprint, slatePreviewOffsets } from './seasonSlateEditor.js';
import { recommendSeasonWorkspaces, SEASON_ADVISOR_METRICS, preferredSeasonDpsMetric } from './seasonAdvisor.js';
import { RESULT_TABS } from './seasonResultPanels.js';
import { SEASON_DPS_SKILL_FIELDS, seasonDotWindowAssignment } from './seasonDps.js';
import {rankSeasonUpgrades,copySeasonUpgrade,copySeasonSkillTrial,GEAR_UPGRADE_SOURCES} from './seasonUpgradeRanking.js';
import { createSeasonEditComparison } from './seasonEditComparison.js';
import { captureShelf, readShelf, SHELF_KEY } from './seasonShelf.js';
import { createItemWorkshop, editItemWorkshop, finishedWorkshopItem, openGearWorkshop } from './seasonItemWorkshop.js';
import { itemGearKind } from './seasonItemCraft.js';
import { compareSeasonResourceCosts, previewSlotEdit } from './seasonGearPicker.js';
import { observedManaInputState } from './seasonWorkspaceView.js';
import { getSeasonSelectionOptions } from './seasonSelections.js';
import { seasonTalentNodes } from './seasonNativeSelections.js';
import {prismForm} from './seasonPrismEditor.js';
import {inverseFields,inverseGeometry} from './seasonInverseImage.js';
import { hasRevelation, revelationNodeOptions } from './seasonTheaRevelation.js';
import { encodeBuildCode, decodeBuildCode, buildShareUrl, sharedCodeFromHash } from './seasonBuildCode.js';
import { canLookUpIngameBuild, lookUpIngameBuild } from './seasonIngameBuildCode.js';
import { prepareIngameBuildImport } from './seasonIngameBuildImport.js';
import {customOptionEditorText} from './seasonCustomOptions.js';
import { filterSpiritPicker, SPIRIT_PICKER_GROUPS } from './seasonSpiritPicker.js';
import { inspectSeasonAllocation } from './seasonAllocation.js';
import {createSeasonDraft} from './seasonDraft.js';
import {SUPPORT_CATEGORIES,supportSearchKey} from './seasonSupportMatrix.js';
import {containsHanScript} from './gameTextPresentation.js';
import {findSeasonScreenshotGearValues,findSeasonScreenshotSkillLevel,seasonScreenshotTargets} from './seasonScreenshotImport.js';
import {normalizeScreenshotRegion,screenshotRegionFromPoints} from './screenshotRecognition.js';

export const ACTIVE_SEASON_WORKSPACE_KEY = "tob.activeSeasonWorkspace.v1";
const stringKinds = new Set(["name", "custom-options", "hero-selection", "hero-choice", "skill-selection", "gear-selection", "support-selection", "memory-selection", "slate-affix", "talent-board", "spirit-selection", "destiny-selection", "thea-board", "elixir-selection", "module-selection", "module-option", "nether-layout", "nether-quality", "nether-banishment"]);
export function readSeasonPlannerEdit(input) {
  const d = input.dataset, kind = d.seasonEdit;
  const dpsField = kind==='dps-input' ? SEASON_DPS_SKILL_FIELDS[d.key?.split(':')[1]] : null;
  return { kind, rowIndex: Number(d.row), supportIndex: Number(d.support), slotIndex: Number(d.slot), key: d.key ?? d.choice ?? d.roll,
    value: stringKinds.has(kind) || kind==='bing-event-source' || kind==='memory-tier' ? input.value
      : dpsField?.times || dpsField?.windows ? input.value.trim()
      : String(input.value).trim() === "" ? "" : Number(input.value) };
}
const editKey = e => JSON.stringify([e.kind, e.rowIndex, e.supportIndex, e.slotIndex, e.key]);
const shelfFits = (entry,kind,index) => entry.kind === kind && (kind === 'gear'
  ? getSeasonSelectionOptions('gear',index).some(o => o.id === entry.item.itemId) : kind !== 'memory' || entry.index === index);

// The current editor has one SS14 document and one calculation. Historical
// build keys are never written here, including when no SS14 copy exists yet.
export function createSeasonPlanner(storage, sourceBuild, { sourceUnavailable = false, recoverDraft = false } = {}) {
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
    history: createSeasonEditHistory(), gearIndex: 0, skillIndex: 0, supportIndex: null, picker: null, logImport: null, slateEditor:createSlateEditorState(), resultTab:'stats', analysisMetric:null, analysis:null };
  let savedTarget = document ? JSON.stringify((savedDocument??document).targetBuild) : "", logRequest = 0;
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
  try { state.shelfCount=readShelf(storage).length; } catch { /* Opening the shelf reports the storage error. */ }
  function storeEntry(entry) {
    return storeEntries([entry]);
  }
  function storeEntries(entries) {
    const list=readShelf(storage);
    const signature=({id,...rest})=>JSON.stringify({...rest,item:{...rest.item,instanceId:undefined}});
    for(let entry of entries) {
      const existing=list.findIndex(row=>signature(row)===signature(entry));
      if(existing>=0) entry=list.splice(existing,1)[0];
      list.push(entry);
    }
    storage.setItem(SHELF_KEY,JSON.stringify(list));
    state.shelfCount=list.length;
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
  let viewportEvents;
  let customOptionTimer;
  let skillCandidateTimer;
  let editComparison;
  const workshop=()=>state.overlay?.type==='workshop'?state.overlay:
    state.overlay?.type==='gear'&&state.picker?.candidate?state.picker.draft:null;
  function syncCandidate(){
    const picker=state.picker;
    if(!picker?.candidate||!picker.draft||picker.previewDocument===picker.draft.document)return;
    picker.edit={kind:'shelf-apply',slotIndex:picker.draft.index,value:finishedWorkshopItem(picker.draft)};
    picker.preview=previewSlotEdit(state.document,state.report,picker.edit);
    picker.previewDocument=picker.draft.document;
  }
  function selectGearCandidate(index,id){
    const draft=itemGearKind(id)?openGearWorkshop(index,state.document.targetBuild,id):null;
    const edit={kind:'gear-selection',slotIndex:index,value:id};
    state.picker={...state.picker,candidate:id,draft,previewDocument:null,edit,preview:draft?null:previewSlotEdit(state.document,state.report,edit)};
    syncCandidate();
  }
  function selectSkillCandidate(id,level=state.picker?.levels?.[id],auraActive=state.picker?.auraStates?.[id]){
    const support=Number.isInteger(state.supportIndex);
    const edit={kind:support?'support-selection':'skill-selection',
      rowIndex:state.skillIndex,supportIndex:state.supportIndex??0,value:id,...(level===undefined?{}:{level}),
      ...(auraActive===undefined?{}:{auraActive}),
      ...(support&&state.picker?.unlockSupportSlot?{unlockSupportSlot:true}:{})};
    const preview=previewSlotEdit(state.document,state.report,edit);
    state.picker={...state.picker,candidate:id,edit,preview,
      levels:{...state.picker?.levels,...(level===undefined?{}:{[id]:level})},
      auraStates:{...state.picker?.auraStates,...(auraActive===undefined?{}:{[id]:auraActive})}};
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
    if(bar)bar.outerHTML=renderSkillPickerFooter(state,id,status,!valid||Boolean(status&&!pending));
    return valid;
  }
  const recalculate = () => {
    state.upgrades=null;
    state.analysis = null;
    state.supportImpact = null;
    state.report = state.document ? calculateEditorSeasonBuild(state.document.targetBuild, { sourceBuild: state.document.sourceBuild }) : null;
    if(state.picker?.edit&&state.document)
      state.picker.preview=previewSlotEdit(state.document,state.report,state.picker.edit);
    if (editComparison) state.editComparison = editComparison.update(state.document, state.report);
    persistDraft();
  };
  recalculate();
  if (state.document) {
    editComparison = createSeasonEditComparison(state.document, state.report);
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
      state.overlay={type:'board',section,document:state.document,report:state.report,pending:new Map()};
      state.focusRole='board-heading';
    },
    stageBoard(next) {
      const report=calculateEditorSeasonBuild(next.targetBuild,{sourceBuild:next.sourceBuild});
      Object.assign(state.overlay,{document:next,report});
    },
    stageTalentAllocation(next,index) {
      const path='talents.boards.'+index;
      const key=issue=>JSON.stringify([issue.reason,issue.nodeId]);
      const before=new Set(inspectSeasonAllocation(api.workingDocument().targetBuild).issues.filter(i=>i.path===path).map(key));
      const added=inspectSeasonAllocation(next.targetBuild).issues.find(i=>i.path===path&&!before.has(key(i)));
      if(added)throw new Error(added.reason);
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
        if (event.button === 0 && globalThis.document.activeElement?.matches?.('input[data-season-edit],textarea[data-season-edit],input[data-skill-candidate-level]')
          && event.target.closest?.('button[data-ss14-action], button[data-action]')) event.preventDefault();
      };
      root.ondragstart = event => api.slateDragStart(event);
      root.oncontextmenu = event => api.talentContextMenu(event);
      const boardCell = target => target?.closest?.('.slate-board-cell');
      const hover = event => {if(state.section==='divinity')showSlateFootprint(root,boardCell(event.target),state.slateDrag);};
      root.onpointerover = hover;
      root.onpointerout = event => {
        if(state.section==='divinity'&&boardCell(event.target)&&!boardCell(event.relatedTarget))showSlateFootprint(root,null);
      };
      if(bindFocus) {
        root.addEventListener?.('focusin',hover);
        root.addEventListener?.('focusout',root.onpointerout);
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
      const previousList=root.querySelector?.('.gear-drawer .native-picker-list');
      const listScroll=previousList?.scrollTop??0;
      const candidatePane=root.querySelector?.('.gear-comparison-body[data-candidate]');
      const candidateScroll=candidatePane?.dataset.candidate===state.picker?.candidate?candidatePane?.scrollTop:0;
      const open = [...(globalThis.document.querySelectorAll?.(".season-native details[open][data-role], .season-native-backdrop details[open][data-role]") ?? [])].map(el => el.dataset.role);
      setPlannerHtml(root, renderSeasonPlanner(state));
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
      for (const field of globalThis.document.querySelectorAll?.("[data-season-edit]") ?? []) {
        const pending = state.pending.get(editKey(readSeasonPlannerEdit(field)));
        if (pending) field.value = pending.value;
      }
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
        const detail = globalThis.document.querySelector?.(`[data-role="${state.focusRole}"]`);
        if (detail) {
          for(let p=detail;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
          const focusTarget=detail.matches?.('button,input,select,textarea,summary,[tabindex]') ? detail : detail.querySelector?.('input,select,textarea');
          focusTarget?.focus({preventScroll:true});
          detail.scrollIntoView?.({ block: "nearest" });
        }
        state.focusRole = null;
      }
      if(state.focusField){
        const f=state.focusField;
        const scope=f.inResults?root.querySelector?.('#native-result-panel'):
          root.querySelector?.('.season-native-modal-body')??root.querySelector?.('.season-native-scroll');
        const field=[...(scope?.querySelectorAll?.('[data-season-edit]')??[])].find(el=>el.dataset.seasonEdit===f.edit
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
    openSkill(index,support=null) {
      if(!Number.isInteger(index)||index<0||index>=9)return;
      api.flush();
      const initial=state.overlay?.type==='skills'?state.overlay.initial:null;
      const rows = state.document.targetBuild.skills;
      const host = index<5 ? rows.active[index] : rows.passive[index-5];
      if (!host?.skillId) support=null;
      state.section='skills';state.skillIndex=index;state.supportIndex=support;
      const returnSection=state.overlay?.type==='skills'?state.overlay.returnSection:null;
      const returnRole=state.overlay?.type==='skills'?state.overlay.returnRole:null;
      state.overlay={type:'skills',index,supportIndex:support,returnSection,returnRole,initial:initial??{document:state.document,report:state.report}};state.picker=null;
      state.focusRole='slot-detail-heading';
    },
    openMemory(index) {
      state.overlay={...createItemWorkshop('memory',index),document:state.document,slotDraft:true};
      state.focusRole='memory-drawer-heading';
    },
    closeOverlay(equipped=false) {
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
      if(state.overlay?.type==='board') {
        state.slateEditor=createSlateEditorState();state.pactRoster=null;state.slateDrag=null;
        state.focusRole=state.overlay.returnRole??'board-open-'+state.section;
      } else if (state.overlay?.type==='gear') {
        state.picker=null;
        state.focusRole='gear-slot-'+state.gearIndex;
      } else if(state.overlay?.type==='skills') {
        state.picker=null;state.focusRole='skill-slot-'+state.skillIndex;
        if(state.overlay.returnSection){
          state.section=state.overlay.returnSection;
          state.focusRole=state.overlay.returnRole
            ? (state.supportImpact?state.overlay.returnRole:'result-tab-analysis')
            : 'edit-calculation-skill';
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
      if(state.fromOverview){
        state.section='overview';state.fromOverview=false;
        if(state.homeGearRole){state.focusRole=state.homeGearRole;state.homeGearRole=null;}
      }
      state.overlay=null; state.logImport=null; ++logRequest;
    },
    edit(edit) {
      const next = editSeasonWorkspace(api.workingDocument(), edit);
      if(state.overlay?.type==='board'){api.stageBoard(next);return;}
      state.history.record(state.document.targetBuild, next.targetBuild);
      state.document = next; state.dirty = true; state.error = ""; state.notice = "";
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
      const target = redo ? state.history.redo(state.document.targetBuild) : state.history.undo(state.document.targetBuild);
      if (!target) return;
      state.document = { ...state.document, targetBuild: target };
      state.dirty = Boolean(draft&&!savedDocument) || JSON.stringify(target) !== savedTarget;
      state.error = ""; state.notice = redo ? "다시 실행했습니다." : "이전 편집으로 되돌렸습니다.";
      state.supportIndex = null;
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
    compare() {
      api.flush();
      const loaded = loadSeasonWorkspaces(storage);
      if (loaded.error) throw new Error(loaded.error);
      state.documents = loaded.documents;
      state.analysis = recommendSeasonWorkspaces(state.document, loaded.documents, state.analysisMetric ?? preferredSeasonDpsMetric(state.report));
    },
    compareSupportImpact(rowIndex) {
      const skill = [...state.document.targetBuild.skills.active, ...state.document.targetBuild.skills.passive][rowIndex];
      if (!skill?.skillId) return;
      const metric=preferredSeasonDpsMetric(state.report);
      const rows = [];
      for (const [supportIndex, support] of skill.supports.entries()) {
        if (!support?.supportId) continue;
        try {
          const preview = previewSlotEdit(state.document, state.report, {
            kind:'support-selection', rowIndex, supportIndex, value:'',
          }, {metric,includeSnapshot:true});
          const resources=preview.dpsBasis===metric?preview:
            compareSeasonResourceCosts(state.report,preview.candidate.report,metric,{rowIndex});
          const {resourceChanges,resourceCosts,resourceRecovery,manaObservationStale}=resources;
          rows.push({supportIndex,id:support.supportId,comparison:preview.comparison,
            resources:{resourceChanges,resourceCosts,resourceRecovery,manaObservationStale}});
        } catch (error) {
          rows.push({supportIndex, id:support.supportId, comparison:{supported:false,reasons:[error.message]}});
        }
      }
      state.supportImpact = {rowIndex, rows};
    },
    async rank(mode){
      const job={mode,busy:true,checked:0,total:0};
      state.upgrades=job;
      const active=()=>state.upgrades===job;
      try{
        const group=mode==='gear'?'all':state.upgradeGroup??'all';
        const result=await rankSeasonUpgrades(state.document,state.report,{mode,slot:(mode==='gear'?state.replacementSlot:state.upgradeSlot)??'all',group,skill:state.upgradeSkill??'all',
          assemble:(mode==='gear'?state.assembleEquipment:group==='craft'?state.assembleCraft:state.assembleRolls)===true,source:state.upgradeSource??'all',
          shelf:(mode==='gear'||group==='legendary')&&state.upgradeSource!=='catalog'?readShelf(storage):[],active,
          progress(checked,total){
            Object.assign(job,{checked,total});
            const out=root?.querySelector?.('[data-upgrade-progress]');
            if(active()&&out)out.textContent=checked+' / '+total;
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
    open(id) {
      if (state.dirty || state.pending.size) api.save();
      const loaded = loadSeasonWorkspaces(storage);
      if (loaded.error) throw new Error(loaded.error);
      const next = loaded.documents.find(d => d.id === id);
      if (!next) throw new Error("저장한 빌드를 찾을 수 없습니다.");
      state.document = next; state.documents = loaded.documents; state.pending.clear(); state.dirty = false; state.overlay = null; state.fromOverview=false; state.error = "";
      state.calculationIndex=0;
      state.history.clear(); state.supportIndex = null; state.picker = null; savedTarget = JSON.stringify(next.targetBuild);
      savedDocument=next;
      state.slateEditor=createSlateEditorState();
      recalculate();
      state.editComparison = editComparison.reset(state.document, state.report);
      state.notice=next.targetBuild.name+" 빌드를 열었습니다.";
      try { storage.setItem(ACTIVE_SEASON_WORKSPACE_KEY, id); } catch { state.notice = "빌드를 열었지만 다음 시작 선택은 저장하지 못했습니다."; }
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
          if (!result.ok || result.sourceFormat!=='91tob-bd_document_v1') {
            const message={
              'unsupported-external-schema-version':'지원하지 않는 91TOB 파일 버전입니다.',
              'external-format-unsupported':'이 91TOB 파일에 가져올 수 없는 구성이 있습니다. 파일을 적용하지 않았습니다.',
              'context-unavailable':'91TOB 파일을 확인할 데이터를 불러오지 못했습니다.',
            }[result.reason]??'91TOB 파일 형식이나 구성을 확인하세요.';
            throw new Error(message);
          }
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
      if (state.dirty || state.pending.size) api.save();
      const saved=saveSeasonWorkspace(storage,next);
      api.open(saved.id);
      state.notice=external?'91TOB 파일을 SS14 이전 검토 사본으로 열었습니다.':next.targetBuild.name+' 빌드를 새 사본으로 가져왔습니다.';
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
      if(event.target.hasAttribute?.('data-blocked-skill-filter')){
        const panel=event.target.closest('[data-role="ranking-exclusions"]');
        const key=value=>String(value).normalize('NFKC').toLocaleLowerCase('ko').replace(/\s/gu,'');
        const query=key(event.target.value);
        let visible=false;
        for(const entry of panel.querySelectorAll('[data-blocked-skill-name]')){
          entry.hidden=!key(entry.dataset.blockedSkillName).includes(query);
          visible||=!entry.hidden;
        }
        panel.querySelector('[data-blocked-skill-empty]').hidden=visible;
        return;
      }
      if(event.target.hasAttribute?.('data-memory-search')){
        const picker=event.target.closest('[data-memory-picker]');
        const key=value=>String(value).normalize('NFKC').toLocaleLowerCase('ko').replace(/\s/gu,'');
        let matches=0;
        for(const option of picker.querySelectorAll('[data-memory-choice]')){
          option.hidden=!key(option.dataset.search).includes(key(event.target.value));
          if(!option.hidden)matches++;
        }
        picker.querySelector('[data-memory-empty]').hidden=matches>0;
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
        const edit=readSeasonPlannerEdit(event.target);
        state.overlay.pending.set(editKey(edit),edit);
        const comparison=event.target.type==='number'&&root?.querySelector?.('[data-role="board-change-detail"]');
        if(comparison){
          const bar=root.querySelector('.drawer-dps');
          try {
            api.flush();
            const opened=[...comparison.querySelectorAll('details[open]')].map(detail=>detail.dataset.role);
            setPlannerHtml(comparison,renderBoardComparison(state));
            for(const detail of comparison.querySelectorAll('details[data-role]'))detail.open=opened.includes(detail.dataset.role);
            if(bar)bar.outerHTML=renderDrawerBar(state);
          } catch(error) {
            comparison.textContent=error.message;
            if(bar){bar.querySelector('strong').textContent='입력 확인';bar.querySelector('small').textContent='전체 DPS';bar.querySelector('button').disabled=true;}
          }
        }
        return;
      }
      if (event.target.hasAttribute?.('data-slate-search')) {
        state.slateEditor.query=event.target.value;
        const query=event.target.value.replace(/\s/gu,'').toLowerCase();let count=0;
        for (const option of globalThis.document.querySelectorAll('[data-slate-option]')) {
          option.hidden=!option.dataset.search.replace(/\s/gu,'').toLowerCase().includes(query);
          if(!option.hidden)count++;
        }
        const empty=globalThis.document.querySelector('[data-slate-empty]');if(empty)empty.hidden=count>0;
        return;
      }
      if (event.target.hasAttribute?.("data-numeric-filter")) {
        const query = event.target.value.normalize("NFKC").toLocaleLowerCase("ko").replace(/\s/gu, "");
        for (const row of globalThis.document.querySelectorAll?.("[data-numeric-row]") ?? [])
          row.hidden = !row.textContent.normalize("NFKC").toLocaleLowerCase("ko").replace(/\s/gu, "").includes(query);
        return;
      }
      const input = event.target;
      if (workshop() && input.closest?.('[data-item-workshop]')) {
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
          const pair=input.closest?.('.craft-roll-pair');
          if(pair && input.value!=='' && input.validity.valid){
            const linked=pair.querySelector(input.type==='range'?'input[type=number]':'input[type=range]');
            if(linked)linked.value=input.value;
          }
          if(draft.kind==='memory')edit.enhancedBase=true;
          if(edit.kind==='memory-enhancement' && input.type==='range') {
            const output=input.closest('label')?.querySelector('[data-memory-level]');
            if(output)output.textContent='+'+edit.value;
          }
          if (edit.kind === 'workshop-affix') edit.value=input.value;
          draft.pending.set(editKey(edit),edit);
          const bar=root?.querySelector?.('.drawer-dps');
          if(bar){bar.querySelector('strong').textContent='입력 적용 대기';bar.querySelector('small').textContent='전체 DPS';}
          return;
        }
      }
      if(input.hasAttribute?.('data-shelf-search')){
        state.overlay.query=input.value;
        const query=input.value.trim().toLocaleLowerCase('ko');
        const rows=[...root.querySelectorAll('[data-shelf-record]')];
        for(const row of rows)row.hidden=!row.dataset.shelfRecord.includes(query);
        root.querySelector('[data-shelf-empty]').hidden=rows.some(row=>!row.hidden);
        return;
      }
      if(input.hasAttribute?.('data-spirit-filter')){
        state.pactRoster.query=input.value;
        filterSpiritPicker(root,input.value,state.pactRoster.group??'all');
        return;
      }
      if (input.hasAttribute?.("data-hunter-filter")) {
        const normalize = value => value.normalize("NFKC").toLocaleLowerCase("ko").replace(/\s/gu, "");
        const query = normalize(input.value);
        const choices = [...globalThis.document.querySelectorAll("[data-hunter-name]")];
        for (const choice of choices) choice.hidden = !normalize(choice.dataset.hunterName).includes(query);
        globalThis.document.querySelector("[data-hunter-empty]").hidden = choices.some(choice => !choice.hidden);
        return;
      }
      if (input.hasAttribute?.("data-picker-filter")) {
        state.picker ??= { candidate: "", query: "" };
        state.picker.query = input.value;
        const key = value => String(value).normalize("NFKC").toLocaleLowerCase("ko").replace(/\s/gu, "");
        let count = 0, hiddenSelection = false;
        for (const option of globalThis.document.querySelectorAll("[data-picker-option]")) {
          option.hidden = !key(option.dataset.search).includes(key(input.value));
          if (!option.hidden) count++;
          else if (option.dataset.id === state.picker.candidate) hiddenSelection = true;
        }
        if (hiddenSelection) {
          Object.assign(state.picker,{candidate:'',preview:null,edit:null});
          const caret=input.selectionStart;
          api.render();
          const search=root?.querySelector?.('[data-picker-filter]');
          search?.focus({preventScroll:true});
          if (caret != null) search?.setSelectionRange(caret,caret);
        } else {
          const empty=globalThis.document.querySelector('[data-picker-empty]');
          if (empty) empty.hidden=count>0;
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
      if (input.dataset?.seasonFilter) {
        const select = globalThis.document.getElementById(input.dataset.seasonFilter);
        if (select) filterSeasonSelection(select, input.value);
        return;
      }
      if (!input.dataset?.seasonEdit) return;
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
      if(input.hasAttribute?.('data-assemble-equipment')){
        state.assembleEquipment=input.checked;
        state.upgrades=null;api.render();return;
      }
      if(input.hasAttribute?.('data-upgrade-source')){
        if(Object.hasOwn(GEAR_UPGRADE_SOURCES,input.value))state.upgradeSource=input.value;
        state.upgrades=null;api.render();return;
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
        api.run(()=>{api.input(event);api.flush();});return;
      }
      if (workshop() && input.closest?.('[data-item-workshop]')) {
        if(input.hasAttribute('data-workshop-slot')){
          api.run(()=>{
            api.flushWorkshop();
            const draft=workshop();
            draft.document=editItemWorkshop(draft,draft.document,{kind:'workshop-slot',family:input.dataset.family,position:Number(input.dataset.position),value:input.value});
            state.focusRole=input.dataset.role;
          });
          return;
        }
        if(input.hasAttribute('data-memory-option')) {
          api.run(()=>api.chooseMemoryOption(input.value,input.dataset.previous,Number(input.dataset.position)));
          return;
        }
        if (input.dataset.seasonEdit) api.run(() => {
          api.input(event);api.flushWorkshop();
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
        state.picker={...state.picker,query:state.picker?.query??'',filter:event.target.value,candidate:'',preview:null,edit:null};api.render();return;
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
      if (event.target.hasAttribute?.('data-analysis-metric')) {
        if (Object.hasOwn(SEASON_ADVISOR_METRICS, event.target.value)) {
          state.analysisMetric = event.target.value;
          state.analysis = null;
          state.focusRole = 'saved-comparison-metric';
          api.render();
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
            picker.value=String(matchingTrainingDummy(enemy)?.level ?? '');
            if (!picker.value) picker.options[0].textContent='직접 설정한 방어';
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
      api.run(() => api.flush());
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
    filterEffects() {
      const query = globalThis.document.querySelector("[data-effect-filter]")?.value.trim().toLocaleLowerCase("ko") ?? "";
      const status = globalThis.document.querySelector("[data-effect-status]")?.value ?? "";
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
      if (action === 'look-up-ingame-code') {
        void api.lookUpIngameCode();
        return true;
      }
      if (['share','copy-link','copy-code','import-code'].includes(action)) {
        void api.share(action);
        return true;
      }
      api.run(() => {
        if(action==='toggle-navigation'){state.navCollapsed=!state.navCollapsed;state.focusRole='nav-toggle';return;}
        if(state.section==='overview' && !state.overlay && ['inspect-gear','inspect-skill','inspect-socket','overview-board'].includes(action))state.fromOverview=true;
        if(action==='overview-board' && ['talents','pact','divinity'].includes(d.section)){api.openBoard(d.section);return;}
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
          state.picker={candidate:'',query:slot.grades.length===1?`(${slot.grades[0]})`:'',
            unlockSupportSlot:row.unlockedSupportCount<=socket};
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
            if (draft.category !== d.category) state.overlay={...createItemWorkshop(draft.kind,draft.index),category:d.category,name:draft.name};
            return;
          }
          api.flushWorkshop();
          if (action === 'workshop-add-slot' && draft.kind==='gear') {
            draft.document=editItemWorkshop(draft,draft.document,{kind:'workshop-slot',family:d.family,position:Number(d.position)});
            state.focusRole='craft-'+d.family+'-'+d.position;
          } else if (action === 'memory-preset' && draft.kind==='memory') {
            draft.document=editItemWorkshop(draft,draft.document,{kind:action,value:Number(d.quality)});
            state.focusRole='memory-preset-'+d.quality;
          } else if (action === 'workshop-equip') {
            const entry=draft.kind==='gear'||draft.document.targetBuild.hero.memories[draft.index]?finishedWorkshopItem(draft):null;
            api.edit(entry
              ? {kind:'shelf-apply',slotIndex:draft.index,value:entry}
              : {kind:'memory-selection',slotIndex:draft.index,value:''});
            if(entry)keepConfirmed(draft.kind,draft.index,entry);
            api.closeOverlay(true);
          } else if (action === 'workshop-remove') {
            draft.document=editItemWorkshop(draft,draft.document,{kind:action,value:d.key});
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
            openShelf(list,kind,slot,all);
            if(boardDraft)state.overlay.boardDraft=boardDraft;
            if(action==='shelf-tab')state.focusRole='shelf-tab-'+kind;
            return;
          }
          if(action==='shelf-save'){storeEntry(captureShelf(api.workingDocument().targetBuild,kind,slot));state.notice='보관함에 저장했습니다.';return;}
          const pos=list.findIndex(v=>v.id===d.id&&v.kind===kind);
          if(pos<0)throw Error('보관 항목을 찾을 수 없습니다.');
          const index=all?list[pos].index:slot;
          if(action==='shelf-use' && ['prism','divinity'].includes(kind)){
            if(boardDraft)state.overlay=boardDraft;
            else api.openBoard(kind==='prism'?'talents':'divinity');
            api.edit({kind:'shelf-apply',slotIndex:index,value:list[pos]});return;
          }
          if(action==='shelf-remove'){const query=state.overlay.query;list.splice(pos,1);storage.setItem(SHELF_KEY,JSON.stringify(list));openShelf(list,kind,slot,all);Object.assign(state.overlay,{query,boardDraft});return;}
          if(action==='shelf-preview'){
            const baseline=boardDraft??state;
            const preview=previewSlotEdit(baseline.document,baseline.report,{kind:'shelf-apply',slotIndex:index,value:list[pos]},{includeSnapshot:true});
            Object.assign(state.overlay,{candidate:d.id,candidateIndex:index,preview});
            state.focusRole='shelf-candidate';
            return;
          }
          if(action==='shelf-use'){api.edit({kind:'shelf-apply',slotIndex:index,value:list[pos]});state.overlay=null;state.picker=null;if(kind==='memory')api.openMemory(index);if(kind==='gear')api.openGear(index,false);state.slateEditor=createSlateEditorState();state.notice='보관 항목을 적용했습니다.';return;}
        }
        if (handleSlateEditorAction(api,action,d)) {
          if (['slate-type','slate-select','slate-socket'].includes(action) || action==='slate-cell' && !state.slateEditor.draft) state.focusRole='slate-inspector';
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
          state.talentNode=null;state.talentCoreGroup=null;state.talentPicking=false;return;
        }
        if (action === 'talent-allocate') { api.allocateTalent(d.id,1); return; }
        if (action === 'talent-inspect') { state.talentNode=d.id; state.focusRole='talent-inspector'; return; }
        if (action === 'pact-inspect') {
          if(state.overlay?.rosterBase){
            api.stageBoard(state.overlay.rosterBase);delete state.overlay.rosterBase;
          }
          state.pactRoster=null; state.pactIndex=Number(d.index); state.pactRing=d.key??null; state.focusRole='pact-inspector'; return;
        }
        if (action === 'pact-roster') {
          const index=Number(d.index);
          if(state.overlay?.type==='board'){
            const original=state.overlay.rosterBase??=state.overlay.document;
            if(d.id){
              const candidate=d.id===original.targetBuild.pact?.slots?.[index]?.spirit?.spiritId?original
                :editSeasonWorkspace(original,{kind:'spirit-selection',slotIndex:index,value:d.id});
              api.stageBoard(candidate);
            }
          }
          state.pactIndex=index;state.pactRoster={index,id:d.id||null,query:state.pactRoster?.query??'',group:state.pactRoster?.group??'all'};return;
        }
        if(action==='pact-roster-filter'){
          if(state.pactRoster&&(d.value==='all'||SPIRIT_PICKER_GROUPS.some(([key])=>key===d.value)))state.pactRoster.group=d.value;
          return;
        }
        if (action === 'pact-clear') {api.edit({kind:'spirit-selection',slotIndex:Number(d.index),value:''});state.pactRing=null;return;}
        if (action === 'pact-roster-apply') {
          if(state.overlay?.type==='board')delete state.overlay.rosterBase;
          if (state.pactRoster?.id && state.pactRoster.id!==api.workingDocument().targetBuild.pact?.slots?.[state.pactRoster.index]?.spirit?.spiritId) api.edit({kind:'spirit-selection',slotIndex:state.pactRoster.index,value:state.pactRoster.id});
          state.pactRoster=null; state.pactRing=null; return;
        }
        if (action === 'pact-spend') {
          api.edit({kind:'pact-allocation',slotIndex:Number(d.index),key:'sequence',value:Number(globalThis.document.getElementById('pact-spend-count').value)});
          return;
        }
        if (action === 'fate-slot') {
          const index=Number(d.index);
          api.edit({kind:'fate-slot',slotIndex:index,value:d.value});
          const count=api.workingDocument().targetBuild.pact.slots[index].undeterminedFate?.slots?.length ?? 0;
          state.pactRing=count ? 'extra-'+(count-1) : 'undetermined';
          state.focusRole='pact-inspector';
          return;
        }
        if (action === 'pact-allocation' || action === 'pact-remove-destiny') {
          api.edit({kind:action==='pact-allocation'?action:'destiny-selection',slotIndex:Number(d.index),key:d.key,value:action==='pact-allocation'?Number(d.value):''});
          return;
        }
        if (action === 'talent-step') {
          if(Number(d.index)===(state.talentIndex??0))api.allocateTalent(d.id,Number(d.step),{
            inspector:true,target:d.target===undefined?undefined:Number(d.target),
          });
          return;
        }
        if (action === 'clear-combat-conditions') {
          api.flush();
          api.edit({kind:action});
          state.notice = '수동 전투 조건을 초기화했습니다.';
          state.focusRole = 'training-dummy-picker';
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
          const conflicts=state.report.fullDps.dotWindowConflicts??state.report.assumedDps?.dotWindowConflicts??[];
          const conflict=conflicts.find(row=>row.id===d.key && row.start===Number(d.start) && row.stop===Number(d.stop));
          const edit=seasonDotWindowAssignment(state.document.targetBuild,conflict,Number(d.index));
          if (!edit) throw new Error('겹친 구간이 바뀌었거나 시간표가 입력 한도를 넘었습니다. 적용 구간을 확인하세요.');
          api.edit(edit);
          state.focusField={edit:edit.kind,key:edit.key,inResults:true};
          return;
        }
        if (action === 'result-tab') {
          state.showComparisonReasons = d.tab === 'analysis' && d.showReasons === 'true';
          state.showDpsNotes = d.tab === 'calculation' && d.showDps === 'true';
          if (d.tab === 'calculation' && /^[0-8]$/u.test(d.index??'')) state.calculationIndex = Number(d.index);
          if (RESULT_TABS.some(([key]) => key === d.tab)) {
            state.resultTab = d.tab;
            state.focusRole = d.focusRole;
            if(d.tab==='conditions'&&d.field)state.focusField={edit:d.field,key:d.fieldKey,inResults:true};
          }
          if(d.tab==='analysis'&&!state.upgrades)void api.rank('options');
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
        if(action==='rank-options'||action==='rank-gear'){void api.rank(action==='rank-gear'?'gear':'options');return;}
        if(action==='rank-cancel'){state.upgrades=null;return;}
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
        if(action==='rank-copy'){
          const row=d.index==='assembled'?state.upgrades?.assembled:state.upgrades?.rows?.[Number(d.index)];
          if(!row||row.saved)return;
          const copy=copySeasonUpgrade(state.document,state.report,row);
          const saved=saveSeasonWorkspace(storage,copy);
          row.saved=saved.id;
          state.notice=saved.targetBuild.name+' 저장됨';
          return;
        }
        if(action==='rank-skill-trial'){
          const row=state.upgrades?.blockedSkills?.[Number(d.index)];
          if(!row||state.pending.size)return;
          const copy=copySeasonSkillTrial(state.document,row);
          api.openImportedCopy(copy);
          state.section='overview';
          state.calculationIndex=row.edits[0].rowIndex;
          state.resultTab='calculation';
          state.showDpsNotes=true;
          state.notice='시험 사본을 열었습니다. 전체 DPS 보류 이유를 확인하세요.';
          state.focusRole='calculation-requirements';
          return;
        }
        if (action === 'compare-builds') { api.compare(); return; }
        if (action === 'reset-comparison') { api.resetComparison(); return; }
        if (["section", "advisor-open-section", "inspect-skill", "inspect-gear", "inspect-socket", "edit-slot", "requirement"].includes(action)) state.picker = null;
        if (["inspect-skill","inspect-gear"].includes(action) && globalThis.matchMedia?.("(max-width:760px)").matches) state.focusRole = "slot-detail-heading";
        if (action === "section" || action === "advisor-open-section") { state.section = d.section === "dps" ? "combat" : d.section; state.overlay = null; }
        else if (action === "pick-hunter") {
          if (state.document.targetBuild.ss14Inputs.heroSelection?.heroId !== d.id) api.edit({ kind: "hero-selection", value: d.id });
          state.overlay = null;
        }
        else if (action === "pick-trait") {
          api.edit({ kind: "hero-choice", key: d.level, choiceIndex:Number(d.choiceIndex??0), value: d.value });
        }
        else if(action==='inspect-calculation-skill'){
          const section=state.section;
          api.openSkill(Number(d.index));
          state.overlay.returnSection=section;
        }
        else if (action === "inspect-skill") api.openSkill(Number(d.index));
        else if (action === "inspect-gear") api.openGear(Number(d.index));
        else if (action === "inspect-socket") { const i = Number(d.index); api.openSkill(Number(d.row??state.skillIndex),Number.isInteger(i) && i >= 0 && i < 5 ? i : null); }
        else if (action === "edit-slot") {
          if (d.type === "gear") api.openGear(Number(d.index));
          else if (d.type === "skills") api.openSkill(Number(d.index));
          else if (d.type === "memory") api.openMemory(Number(d.index));
          else if(['talents','pact','divinity'].includes(d.type)) {
            if(d.type==='talents')state.talentIndex=Number(d.index)||0;
            if(d.type==='pact')state.pactIndex=Number(d.index)||0;
            api.openBoard(d.type);
          }
          else state.overlay = { type: d.type, index: Number(d.index), ...(d.choiceIndex!==undefined?{choiceIndex:Number(d.choiceIndex)}:{}),
            ...(d.type==='extensions'?{initial:{document:state.document,report:state.report}}:{}) };
        }
        else if (action === "requirement") {
          state.section = d.section;
          const index=Number(d.index)||0;
          if(d.section==='gear')state.gearIndex=index;
          if(d.section==='skills'){state.skillIndex=index;state.supportIndex=null;}
          state.overlay = d.type ? { type: d.type, index } : null;
          if(d.type==='memory')api.openMemory(index);
          if(['talents','pact','divinity'].includes(d.section)){
            if(d.section==='talents')state.talentIndex=index;
            if(d.section==='pact')state.pactIndex=index;
            api.openBoard(d.section);
          }
          if(d.section==='skills'&&(!d.type||d.type==='skills'))api.openSkill(index,/^[0-4]$/u.test(d.support??'')?Number(d.support):null);
          if(d.section==='gear' && (!d.type || d.type==='gear')) api.openGear(index,false);
          state.focusField=d.field?{edit:d.field,key:d.fieldKey}:null;
          state.focusRole = d.focusRole;
        }
        else if (action === "close") api.closeOverlay();
        else if (action === "picker-gear-kind") state.picker={gearKind:d.category,filter:'',candidate:'',query:state.picker?.query??''};
        else if (action === "picker-group") state.picker={...state.picker,filter:d.filter,candidate:'',preview:null,edit:null};
        else if (action === "open-picker") state.picker = { candidate: "", query: "" };
        else if (action === 'gear-candidate-list') {
          const {query,filter,gearKind,candidate}=state.picker;
          state.picker={query,filter,gearKind,candidate:''};
          state.focusRole='gear-option-'+candidate;
        }
        else if (action === "cancel-picker") state.picker = null;
        else if(action==='view-worn-gear'){
          const index=state.gearIndex,id=state.document.targetBuild.gear?.slots?.[index]?.itemId;
          if(id){
            state.picker={candidate:'',query:''};
            selectGearCandidate(index,id);
            state.focusRole='candidate-detail';
          }
        }
        else if (action === "preview-item") {
          const gear=state.section==='gear', index=gear?state.gearIndex:state.skillIndex;
          if(gear&&state.picker?.candidate===d.id&&workshop())return;
          if(gear)selectGearCandidate(index,d.id);
          else selectSkillCandidate(d.id);
          if (gear) state.focusRole='candidate-detail';
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
        else if (action === "save") api.save();
        else if (action === "saves") { const loaded = loadSeasonWorkspaces(storage); if (loaded.error) throw new Error(loaded.error); state.documents = loaded.documents; state.overlay = { type: "saves" }; }
        else if (action === "open") api.open(d.id);
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
          const copy = applyLocalGameLog(state.document, state.logImport.preview);
          const importedSlates = state.logImport.preview.slates?.selected && !state.logImport.preview.slates.blocked;
          if (state.dirty) api.save();
          const saved = saveSeasonWorkspace(storage, copy);
          api.open(saved.id); state.logImport = null; ++logRequest;
          state.section = importedSlates ? "divinity" : "skills"; state.notice = "선택한 항목을 새 로그 사본에 반영했습니다. 옵션 수치와 유지된 구성은 직접 확인하세요.";
        }
        else if (action === "add-slate") api.edit({ kind: "slate-add", value: globalThis.document.getElementById("native-slate-type").value, key: globalThis.document.getElementById("native-slate-shape").value });
        else if (action === "rotate-slate" || action === "remove-slate") {
          api.edit({ kind: action === "rotate-slate" ? "slate-rotate" : "slate-remove", key: d.id });
          if(action==='remove-slate')state.slateEditor=createSlateEditorState();
        }
        else if (action === "copy") {
          const copy = importSeasonWorkspace(exportSeasonWorkspace(state.document));
          const named = editSeasonWorkspace(copy, { kind: "name", value: `${copy.targetBuild.name} · 사본` });
          const saved = saveSeasonWorkspace(storage, named);
          api.open(saved.id);
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
      if (state.dirty || state.pending.size) api.save();
      const saved = saveSeasonWorkspace(storage, imported);
      api.open(saved.id);
      state.section = 'overview';
      state.notice = '공유 빌드를 새 사본으로 열었습니다.';
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
    async share(action) {
      let panel=state.overlay;
      try {
        if (action==='share') {
          api.flush();
          panel={type:'share',code:'',link:'',paste:'',message:'',busy:false};
          state.overlay=panel;
          state.error='';
          api.render();
          panel.code=await encodeBuildCode(state.document);
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
        panel.paste=globalThis.document.getElementById('share-paste')?.value??panel.paste;
        api.render();
      }
    },
    allocateTalent(id,step,{inspector=false,target}={}) {
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
      api.stageTalentAllocation(next,index);
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
      if(cell && !event.altKey && !event.ctrlKey && !event.metaKey && (directions[event.key] || event.key==='Delete' || event.key.toLowerCase()==='r')){
        event.preventDefault();
        api.run(()=>{
          api.flush();
          const id=cell.dataset.slateId, x=Number(cell.dataset.x), y=Number(cell.dataset.y);
          state.focusRole='slate-cell-'+x+'-'+y;
          if(event.key==='Delete'){
            api.edit({kind:'slate-remove',key:id});
            state.slateEditor=createSlateEditorState();
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
        const nodes = [...(globalThis.document.querySelectorAll?.('.season-native-modal button:not([disabled]), .season-native-modal input:not([disabled]), .season-native-modal select:not([disabled]), .season-native-modal textarea:not([disabled]), .season-native-modal summary, .season-native-modal a[href]') ?? [])].filter(el => el.getClientRects?.().length);
        const first = nodes[0], last = nodes.at(-1);
        if (event.shiftKey && globalThis.document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && globalThis.document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    },
  };
  return api;
}
