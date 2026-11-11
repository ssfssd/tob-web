import { setPlannerHtml } from "./offlinePresentation.js";
import { createSeasonWorkspace, editSeasonWorkspace, loadSeasonWorkspaces, saveSeasonWorkspace, exportSeasonWorkspace, importSeasonWorkspace } from "./seasonWorkspace.js";
import { prepareSeasonMigration } from "./seasonMigration.js";
import { calculateSeasonBuild } from "./seasonBuild.js";
import { renderSeasonPlanner, renderNativeDps, renderEditHistory, renderEffectSources } from "./seasonPlannerView.js";
import { filterSeasonSelection } from "./seasonSelectionSearch.js";
import { createSeasonEditHistory } from "./seasonEditHistory.js";
import { rebindLogGear } from "./seasonLogGear.js";
import { readLocalGameLog, previewLocalGameLog, applyLocalGameLog } from "./localGameLogImport.js";
import { assertLocalLogAccess } from "./runtimePolicy.js";
import { createSlateEditorState, handleSlateEditorAction, slateEditorBoard, showSlateFootprint, slatePreviewOffsets } from './seasonSlateEditor.js';
import { recommendSeasonWorkspaces, SEASON_ADVISOR_METRICS } from './seasonAdvisor.js';
import { RESULT_TABS } from './seasonResultPanels.js';
import { createSeasonEditComparison } from './seasonEditComparison.js';
import { seasonTalentNodes } from './seasonNativeSelections.js';
import { encodeBuildCode, decodeBuildCode } from './seasonBuildCode.js';

export const ACTIVE_SEASON_WORKSPACE_KEY = "tob.activeSeasonWorkspace.v1";
const stringKinds = new Set(["name", "hero-selection", "hero-choice", "skill-selection", "gear-selection", "support-selection", "memory-selection", "slate-affix", "talent-board", "spirit-selection", "destiny-selection", "thea-board", "elixir-selection", "module-selection", "module-option", "nether-layout", "nether-quality", "nether-banishment"]);
export function readSeasonPlannerEdit(input) {
  const d = input.dataset, kind = d.seasonEdit;
  return { kind, rowIndex: Number(d.row), supportIndex: Number(d.support), slotIndex: Number(d.slot), key: d.key ?? d.choice ?? d.roll,
    value: stringKinds.has(kind) ? input.value : String(input.value).trim() === "" ? "" : Number(input.value) };
}
const editKey = e => JSON.stringify([e.kind, e.rowIndex, e.supportIndex, e.slotIndex, e.key]);

// The current editor has one SS14 document and one calculation. Historical
// build keys are never written here, including when no SS14 copy exists yet.
export function createSeasonPlanner(storage, sourceBuild, { sourceUnavailable = false } = {}) {
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
  const state = { document, documents: loaded.documents, section: "hero", overlay: null, dirty: false, pending: new Map(), error, notice: "", report: null,
    history: createSeasonEditHistory(), gearIndex: 0, skillIndex: 0, supportIndex: null, picker: null, logImport: null, slateEditor:createSlateEditorState(), resultTab:'stats', analysisMetric:'fullDps', analysis:null };
  let savedTarget = document ? JSON.stringify(document.targetBuild) : "", logRequest = 0;
  let root;
  let editComparison;
  const recalculate = () => {
    state.analysis = null;
    state.report = state.document ? calculateSeasonBuild(state.document.targetBuild, { sourceBuild: state.document.sourceBuild }) : null;
    if (editComparison) state.editComparison = editComparison.update(state.document, state.report);
  };
  recalculate();
  if (state.document) {
    editComparison = createSeasonEditComparison(state.document, state.report);
    state.editComparison = editComparison.result();
  }
  const api = {
    active: true, state,
    render(element = root) {
      const bindFocus=element && element !== root;
      root = element;
      if (!root) return;
      // Commit pending fields inside the click action. A blur-triggered dock
      // refresh can otherwise move/remove the button between pointer down/up.
      root.onpointerdown = event => {
        if (event.button === 0 && globalThis.document.activeElement?.matches?.('input[data-season-edit]')
          && event.target.closest?.('button[data-ss14-action], button[data-action]')) event.preventDefault();
      };
      root.ondragstart = event => api.slateDragStart(event);
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
      const scroll = globalThis.document.querySelector?.(".season-native-scroll")?.scrollTop ?? 0;
      const contentScroll = globalThis.document.querySelector?.('.native-content')?.scrollTop ?? 0;
      const resultScroll = globalThis.document.querySelector?.('.native-dps-dock')?.scrollTop ?? 0;
      const modalScroll = globalThis.document.querySelector?.(".season-native-modal-body")?.scrollTop ?? 0;
      const open = [...(globalThis.document.querySelectorAll?.(".season-native details[open][data-role], .season-native-backdrop details[open][data-role]") ?? [])].map(el => el.dataset.role);
      setPlannerHtml(root, renderSeasonPlanner(state));
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
      if (state.focusRole) {
        const detail = globalThis.document.querySelector?.(`[data-role="${state.focusRole}"]`);
        if (detail) { detail.open = true; detail.querySelector?.("input, select")?.focus(); detail.scrollIntoView?.({ block: "nearest" }); }
        state.focusRole = null;
      }
    },
    edit(edit) {
      const next = editSeasonWorkspace(state.document, edit);
      state.history.record(state.document.targetBuild, next.targetBuild);
      state.document = next; state.dirty = true; state.error = ""; state.notice = "";
      recalculate();
    },
    flush() {
      if (!state.pending.size) return;
      let next = state.document;
      for (const edit of state.pending.values()) next = editSeasonWorkspace(next, edit);
      state.history.record(state.document.targetBuild, next.targetBuild);
      state.document = next; state.pending.clear(); state.dirty = true; state.error = "";
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
      state.dirty = JSON.stringify(target) !== savedTarget;
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
      state.notice = "SS14 빌드를 저장했습니다.";
      try { storage.setItem(ACTIVE_SEASON_WORKSPACE_KEY, state.document.id); }
      catch { state.notice += " 다음 시작 빌드 선택은 저장하지 못했습니다."; }
    },
    compare() {
      api.flush();
      const loaded = loadSeasonWorkspaces(storage);
      if (loaded.error) throw new Error(loaded.error);
      state.documents = loaded.documents;
      state.analysis = recommendSeasonWorkspaces(state.document, loaded.documents, state.analysisMetric);
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
      state.document = next; state.documents = loaded.documents; state.pending.clear(); state.dirty = false; state.overlay = null; state.error = "";
      state.history.clear(); state.supportIndex = null; state.picker = null; savedTarget = JSON.stringify(next.targetBuild);
      state.slateEditor=createSlateEditorState();
      recalculate();
      state.editComparison = editComparison.reset(state.document, state.report);
      try { storage.setItem(ACTIVE_SEASON_WORKSPACE_KEY, id); } catch { state.notice = "빌드를 열었지만 다음 시작 선택은 저장하지 못했습니다."; }
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
    input(event) {
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
        let count = 0;
        for (const option of globalThis.document.querySelectorAll("[data-picker-option]")) {
          option.hidden = !key(option.dataset.search).includes(key(input.value));
          if (!option.hidden) count++;
        }
        globalThis.document.querySelector("[data-picker-count]").textContent = `${count}개`;
        return;
      }
      if (input.hasAttribute?.("data-effect-filter")) { api.filterEffects(); return; }
      if (input.dataset?.seasonFilter) {
        const select = globalThis.document.getElementById(input.dataset.seasonFilter);
        if (select) filterSeasonSelection(select, input.value);
        return;
      }
      if (!input.dataset?.seasonEdit) return;
      const edit = readSeasonPlannerEdit(input);
      state.pending.set(editKey(edit), edit);
      const output = globalThis.document.querySelector?.('[data-role="native-dps"]');
      if (output) output.textContent = "입력 적용 대기";
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
      if (event.target.hasAttribute?.('data-analysis-metric')) {
        if (Object.hasOwn(SEASON_ADVISOR_METRICS, event.target.value)) {
          state.analysisMetric = event.target.value; state.analysis = null; api.render();
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
      api.input(event);
      // Number/text fields commit on blur without removing the button that the
      // user is clicking. Selects rebuild their dependent option controls.
      if (event.target.tagName === "INPUT") {
        try { api.flush(); state.error = ""; }
        catch (error) { state.error = error.message; }
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
        if (status) status.textContent = state.error || "저장하지 않은 변경";
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
      if (input?.tagName === "INPUT" && input.dataset?.seasonEdit
        && state.pending.has(editKey(readSeasonPlannerEdit(input)))) api.change(event);
    },
    run(action) {
      try { action(); state.error = ""; } catch (e) { state.error = e.message; }
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
      if (['share','copy-code','import-code'].includes(action)) {
        void api.share(action);
        return true;
      }
      api.run(() => {
        if (action === "undo" || action === "redo") { api.restore(action === "redo"); return; }
        api.flush();
        if (handleSlateEditorAction(api,action,d)) return;
        if (action === 'talent-slot') { state.talentIndex=Number(d.index); state.talentNode=null; return; }
        if (action === 'talent-inspect') { state.talentNode=d.id; return; }
        if (action === 'pact-inspect') { state.pactIndex=Number(d.index); state.pactRing=d.key??null; return; }
        if (action === 'talent-step') {
          const index=Number(d.index), board=state.document.targetBuild.talents.boards[index];
          const n=seasonTalentNodes(board?.treeSlug).find(n=>n.id===d.id);
          if(!n || ![-1,1].includes(Number(d.step))) return;
          const count=n.core?Number(!!board.coreTalentIds?.includes(n.id)):(board.nodePoints?.[n.id]??0);
          api.edit({kind:'talent-node',slotIndex:index,key:n.id,value:count+Number(d.step)}); return;
        }
        if (action === 'result-tab') {
          if (RESULT_TABS.some(([key]) => key === d.tab)) state.resultTab = d.tab;
          return;
        }
        if (action === 'compare-builds') { api.compare(); return; }
        if (action === 'reset-comparison') { api.resetComparison(); return; }
        if (["section", "advisor-open-section", "inspect-skill", "inspect-gear", "inspect-socket", "edit-slot", "requirement"].includes(action)) state.picker = null;
        if (action === "section" || action === "advisor-open-section") { state.section = d.section === "dps" ? "combat" : d.section; state.overlay = null; }
        else if (action === "pick-hunter") {
          if (state.document.targetBuild.ss14Inputs.heroSelection?.heroId !== d.id) api.edit({ kind: "hero-selection", value: d.id });
          state.overlay = null;
        }
        else if (action === "pick-trait") {
          const current = state.document.targetBuild.ss14Inputs.heroSelection?.choices?.[d.level] ?? "";
          if (current !== d.value) api.edit({ kind: "hero-choice", key: d.level, value: d.value });
        }
        else if (action === "inspect-skill") { const i = Number(d.index); if (Number.isInteger(i) && i >= 0 && i < 9) { state.skillIndex = i; state.supportIndex = null; } }
        else if (action === "inspect-gear") { const i = Number(d.index); if (Number.isInteger(i) && i >= 0 && i < 10) state.gearIndex = i; }
        else if (action === "inspect-socket") { const i = Number(d.index); state.supportIndex = Number.isInteger(i) && i >= 0 && i < 5 ? i : null; }
        else if (action === "edit-slot") {
          if (["skills", "gear"].includes(d.type)) { state.section = d.type; state[d.type === "skills" ? "skillIndex" : "gearIndex"] = Number(d.index); state.supportIndex = null; state.overlay = null; }
          else state.overlay = { type: d.type, index: Number(d.index) };
        }
        else if (action === "requirement") {
          state.section = d.section;
          state.overlay = d.type ? { type: d.type, index: 0 } : null;
          state.focusRole = d.focusRole;
        }
        else if (action === "close") { state.overlay = null; state.logImport = null; ++logRequest; }
        else if (action === "open-picker") state.picker = { candidate: "", query: "" };
        else if (action === "cancel-picker") state.picker = null;
        else if (action === "preview-item") state.picker = { ...state.picker, candidate: d.id };
        else if (action === "equip-item" || action === "clear-slot") {
          if (!["gear-selection", "skill-selection", "support-selection"].includes(d.kind)) throw new Error("선택할 슬롯을 확인하세요.");
          api.edit({ kind: d.kind, slotIndex: Number(d.index), rowIndex: Number(d.index),
            supportIndex: Number(d.support), value: action === "clear-slot" ? "" : d.id });
          state.picker = null;
        }
        else if (action === "effect-sources") state.overlay = { type: "effects" };
        else if (action === "save") api.save();
        else if (action === "saves") { const loaded = loadSeasonWorkspaces(storage); if (loaded.error) throw new Error(loaded.error); state.documents = loaded.documents; state.overlay = { type: "saves" }; }
        else if (action === "open") api.open(d.id);
        else if (action === "files") state.overlay = { type: "files" };
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
        } else if (action === "import") {
          const text = globalThis.document.getElementById("native-import").value;
          const next = importSeasonWorkspace(text);
          const saved = saveSeasonWorkspace(storage, next);
          api.open(saved.id);
        } else if (action === "advisor-apply-game-critical") api.edit({ kind: "game-critical-input", key: d.row });
        else if (action === "advisor-select-thea-board") api.edit({ kind: "thea-board", value: globalThis.document.getElementById("season-thea-board").value });
      });
      return true;
    },
    async share(action) {
      let panel=state.overlay;
      try {
        if (action==='share') {
          api.flush();
          panel={type:'share',code:'',paste:'',message:'',busy:false};
          state.overlay=panel;
          state.error='';
          api.render();
          panel.code=await encodeBuildCode(state.document);
        } else {
          if (panel?.type!=='share' || panel.busy) return;
          panel.paste=globalThis.document.getElementById('share-paste')?.value??'';
          if (action==='copy-code') {
            try { await navigator.clipboard.writeText(panel.code); panel.message='복사했습니다.'; }
            catch {
              const field=globalThis.document.getElementById('share-code');
              if(state.overlay===panel && field) {
                const status=globalThis.document.getElementById('share-status');
                if(status)status.textContent='선택한 코드를 직접 복사하세요.';
                field.focus();field.select();return;
              }
            }
          } else {
            panel.busy=true;
            const imported=await decodeBuildCode(panel.paste);
            if(state.overlay!==panel)return;
            if(state.dirty || state.pending.size)api.save();
            const saved=saveSeasonWorkspace(storage,imported);
            api.open(saved.id);
            state.section='hero';state.notice='공유 빌드를 새 사본으로 열었습니다.';
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
    slateDragStart(event) {
      const cell=event.target.closest?.('[data-slate-id][draggable="true"]');
      const slate=slateEditorBoard(state.document.targetBuild).slateInventory.find(s=>s.instanceId===cell?.dataset.slateId);
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
        api.flush();api.edit({kind:'slate-move',key:drag.id,value:{x:Number(cell.dataset.x)-drag.dx,y:Number(cell.dataset.y)-drag.dy}});
        Object.assign(state.slateEditor,{selectedId:drag.id,draft:null,moving:false});
      });
    },
    keydown(event) {
      const editingText = event.target?.closest?.("input, textarea, select, [contenteditable=true]");
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !editingText && ["z", "y"].includes(event.key.toLowerCase())) {
        event.preventDefault(); api.run(() => api.restore(event.shiftKey || event.key.toLowerCase() === "y")); return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); api.run(() => api.save()); }
      if (event.key === "Escape" && state.overlay) { event.preventDefault(); api.run(() => { api.flush(); state.overlay = null; state.logImport = null; ++logRequest; }); }
      if (event.key === "Tab" && state.overlay) {
        const nodes = [...(globalThis.document.querySelectorAll?.('.season-native-modal button:not([disabled]), .season-native-modal input, .season-native-modal select, .season-native-modal textarea') ?? [])].filter(el => el.getClientRects?.().length);
        const first = nodes[0], last = nodes.at(-1);
        if (event.shiftKey && globalThis.document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && globalThis.document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    },
  };
  return api;
}
