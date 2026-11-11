import { SS14_MEMORIES } from "./data/ss14Memories.generated.js";
import { SS14_COMPONENTS } from "./data/ss14Components.generated.js";
import { SS14_RULES } from "./data/ss14Rules.generated.js";
import { SS14_SPIRIT_NAMES } from "./data/ss14SpiritNames.generated.js";
import { getCatalogItems, findItemById } from "./catalog.js";
import { captureSeasonConfiguration } from "./seasonConfiguration.js";
import { pinSeasonComponentReceipts } from "./seasonComponents.js";
import { SS14_CURRENT_DATABASE } from "./data/ss14CurrentDatabase.generated.js";
import { seasonDestinyOptions, pactNodeActive, validFateLayout, pactAllocationKeys } from './seasonDestiny.js';
import { EMPTY_TRAIT_MEMORY } from "./seasonHeroSelection.js";

const ko = value => typeof value === "string" && /[가-힣]/u.test(value) && !/\p{Script=Han}/u.test(value) ? value : "한국어 원문 미제공";
const verified = page => page?.season === "SS14" && page.sourceSeasonEvidence?.actualSeason === 14 && page.sourceSeasonEvidence.verificationComplete;
export function seasonMemoryOptions(index) {
  const type = SS14_MEMORIES.types[index];
  if (!type) return null;
  const row = ref => ref && SS14_MEMORIES.pages[`ko/${ref.slug}`]?.rows.find(r => r.id === ref.modifierId);
  return { ...type, name: ko(SS14_MEMORIES.pages[`ko/${type.sourcePath}`]?.name),
    bases: type.baseGroups.map(group => ({ id: group.id, name: ko(row(group.rows[0])?.text) })),
    affixes: type.affixGroups.flatMap(group => group.tiers.filter(t => t.ref && row(t.ref)).map(t => ({
      id: `${group.id}|${t.tierId}`, groupId: group.id, tierId: t.tierId, kind: group.kind, name: ko(row(t.ref).text),
    }))) };
}
export function seasonTalentBoards() {
  return Object.values(SS14_COMPONENTS.pages).filter(p => p.locale === "en" && p.category === "talents" && verified(p))
    .map(p => ({ id: p.slug, name: ko(SS14_COMPONENTS.pages[p.sourceUrl.replace("/en/", "/ko/")]?.parsed.name) }));
}
export function seasonTalentNodes(slug) {
  const en = SS14_COMPONENTS.pages[`https://tlidb.com/en/${slug}`];
  const korean = SS14_COMPONENTS.pages[`https://tlidb.com/ko/${slug}`];
  if (!verified(en) || !verified(korean)) return [];
  return [...getCatalogItems("talents"), ...SS14_CURRENT_DATABASE.identities.filter(i=>i.categoryId==="talents")].flatMap(item => {
    const match = item.tlidbText?.en?.sourceRecordKey?.match(/^data-(?:talent-)?id:(\d+):(regular|core)$/u);
    const row = match && en.parsed.entries.find(r => r.id === match[1] && r.section === match[2]);
    const translated = row && korean.parsed.entries.find(r => r.id === row.id && r.section === row.section);
    const rule = SS14_RULES.talents[slug]?.nodes[item.id.replace(/^talents-/u, "")];
    // Core identities come from the shared Talent index; the current board's
    // verified SS14 row and rule establish membership and numeric authority.
    const core = item.tags?.includes("coreTalent") === true;
    if (!translated || !rule || (!core && item.tlidbText?.en?.sourceUrl !== en.sourceUrl)
      || SS14_RULES.talents[slug]?.sourcePageSha256 !== en.sourcePageSha256) return [];
    return [{ id: item.id, name: ko(translated.name), detail: ko(translated.detail), core, iconUrl: row.iconUrl,
      max: rule.maxPoints, required: rule.requiredPoints }];
  }).sort((a, b) => a.required - b.required || a.id.localeCompare(b.id));
}
export function seasonSpiritOptions() {
  return SS14_COMPONENTS.spiritIdentities.flatMap(identity => {
    const page = SS14_COMPONENTS.pages[`https://tlidb.com/en/${identity.id}`];
    const korean = SS14_COMPONENTS.pages[`https://tlidb.com/ko/${identity.id}`];
    if (!verified(page) || !verified(korean)) return [];
    const label = SS14_SPIRIT_NAMES[identity.catalogId];
    if ((label?.structurePageSha256 ?? label?.sourcePageSha256) !== korean.sourcePageSha256) return [];
    const drop = findItemById(identity.catalogId)?.tags?.some(t=>['掉落','드롭'].includes(t));
    return [{ id: identity.catalogId, aliases: [identity.id, ...identity.aliases], name: ko(label.name), levels: page.parsed.levelAffixes.map(row => row.level), page, korean, drop }];
  });
}

export function selectedSeasonSpirit(id, options = seasonSpiritOptions()) {
  return options.find(option => option.id === id || option.aliases.includes(id));
}
function capture(target, group) {
  target.ss14Inputs.configurations ??= {};
  target.ss14Inputs.configurations[group] = captureSeasonConfiguration(target, group);
  target.ss14Inputs.componentReceipts = { ...target.ss14Inputs.componentReceipts, ...pinSeasonComponentReceipts(target, [group]) };
}
export function editNativeSeasonSelection(target, edit) {
  const index = edit.slotIndex;
  if (edit.kind === "hero-level") {
    if (!Number.isInteger(edit.value) || edit.value < 1 || edit.value > 100) throw new Error("히어로 레벨을 1~100으로 입력하세요.");
    target.heroLevel = edit.value; target.hero = { ...target.hero, level: edit.value }; capture(target, "hero");
  } else if (edit.kind === "support-count") {
    if (!Number.isInteger(edit.rowIndex) || edit.rowIndex < 0 || edit.rowIndex > 8) throw new Error("스킬 칸을 확인하세요.");
    const slot = edit.rowIndex < 5 ? target.skills.active[edit.rowIndex] : target.skills.passive[edit.rowIndex - 5];
    if (!slot?.skillId || !Number.isInteger(edit.value) || edit.value < 0 || edit.value > 5) throw new Error("보조 칸을 0~5개로 선택하세요.");
    if (slot.supports?.slice(edit.value).some(Boolean)) throw new Error("닫을 칸의 보조 스킬을 먼저 해제하세요.");
    slot.unlockedSupportCount = edit.value; capture(target, "skills");
  } else if (["memory-selection", "memory-affix", "memory-enhancement"].includes(edit.kind)) {
    const options = Number.isInteger(index) && index >= 0 && index < 3 && seasonMemoryOptions(index);
    if (!options) throw new Error("추억 칸을 확인하세요.");
    target.ss14Inputs.heroMemoryMode = "configured-v1";
    target.hero ??= {}; target.hero.memories ??= [];
    while(target.hero.memories.length<index)target.hero.memories.push(null);
    const memory = target.hero.memories[index];
    if (edit.kind === "memory-selection") {
      if (edit.value && !options.bases.some(row => row.id === edit.value)) throw new Error("SS14 추억의 기본 옵션을 선택하세요.");
      target.hero.memories[index] = edit.value ? { instanceId: `ss14-memory-${index}`, memoryTypeId: options.flatCatalogId,
        baseAttributeId: edit.value, enhancement: 1, fixedAffixIds: [], randomAffixIds: [], affixRolls: {} } : null;
      const choices = target.ss14Inputs.heroSelection?.choices;
      const level = [45, 60, 75][index];
      if (edit.value && choices?.[level] === EMPTY_TRAIT_MEMORY) delete choices[level];
      if(edit.value && Array.isArray(choices?.[level]) && choices[level].includes(EMPTY_TRAIT_MEMORY)) {
        choices[level]=choices[level].map(k=>k===EMPTY_TRAIT_MEMORY?"":k);
        if(!choices[level].some(Boolean))delete choices[level];
      }
    } else {
      if (!memory) throw new Error("추억 기본 옵션을 먼저 선택하세요.");
      if (edit.kind === "memory-enhancement") {
        if (!Number.isInteger(edit.value) || edit.value < 1 || edit.value > 50) throw new Error("추억 강화 단계를 확인하세요.");
        memory.enhancement = edit.value;
      } else {
        const option = options.affixes.find(row => row.id === edit.key);
        if (!option || ![0, 1].includes(edit.value)) throw new Error("SS14 추억 옵션을 선택하세요.");
        const key = option.kind === "fixed" ? "fixedAffixIds" : "randomAffixIds";
        const selected = memory[key].filter(id => id !== option.groupId);
        if (edit.value && selected.length >= 2) throw new Error("종류별 추억 옵션은 두 개까지 선택하세요.");
        memory[key] = edit.value ? [...selected, option.groupId] : selected;
        if (edit.value) memory.affixRolls[option.groupId] = { tierId: option.tierId, rolls: {} };
        else delete memory.affixRolls[option.groupId];
      }
    }
    if (target.ss14Inputs.memoryBases) delete target.ss14Inputs.memoryBases[index];
    for (const key of Object.keys(target.ss14Inputs.memoryRolls ?? {})) if (key.startsWith(`hero.memories.${index}.`)) delete target.ss14Inputs.memoryRolls[key];
    capture(target, "hero");
  } else if (["talent-board", "talent-node"].includes(edit.kind)) {
    if (!Number.isInteger(index) || index < 0 || index > 2) throw new Error("재능 패널을 확인하세요. 4번째 패널은 계시의 예언에서 편집하세요.");
    target.talents ??= { boards: [] };
    if (edit.kind === "talent-board") {
      if (edit.value && !seasonTalentBoards().some(b => b.id === edit.value)) throw new Error("SS14 재능 패널을 선택하세요.");
      if (target.talents.boards[index]?.treeSlug === edit.value) return true;
      if ([target.talents.placedPrism, target.talents.placedInverseImage].some(p => p?.boardIndex === index)) throw new Error("배치된 프리즘·역상을 먼저 해제하세요.");
      target.talents.boards[index] = { boardId: null, slotType: index ? "sub" : "main", treeSlug: edit.value || null,
        nodePoints: {}, reflectedNodePoints: {}, selectedNodeIds: [], coreTalentIds: [] };
    } else {
      const board = target.talents.boards[index];
      const node = seasonTalentNodes(board?.treeSlug).find(n => n.id === edit.key);
      if (!node || !Number.isInteger(edit.value) || edit.value < 0 || edit.value > node.max) throw new Error("SS14 재능 포인트 상한을 확인하세요.");
      if (node.core) board.coreTalentIds = [...(board.coreTalentIds ?? []).filter(id => id !== node.id), ...(edit.value ? [node.id] : [])];
      else {
        board.nodePoints ??= {};
        if (edit.value) board.nodePoints[node.id] = edit.value; else delete board.nodePoints[node.id];
        board.selectedNodeIds = Object.keys(board.nodePoints);
      }
    }
    const ids = target.talents.boards.flatMap(b => [...Object.entries(b?.nodePoints ?? {}).filter(([, n]) => n > 0).map(([id]) => id), ...(b?.coreTalentIds ?? [])]);
    target.selections = { ...target.selections, talents: ids };
    target.selectionProjection = { ...target.selectionProjection, talents: ids };
    capture(target, "talents");
  } else if (edit.kind === 'fate-slot' || edit.kind === 'destiny-selection' && /^extra-/.test(edit.key)) {
    const slot = target.pact?.slots?.[index], spirit = selectedSeasonSpirit(slot?.spirit?.spiritId);
    if (!Number.isInteger(index) || index < 0 || index > 2 || !spirit || spirit.drop) throw new Error('전투 정령을 선택하세요.');
    let shell = slot.undeterminedFate;
    if (shell && !validFateLayout(shell)) throw new Error('기존 미정 숙명의 배치를 확인하세요.');
    const prefix = `pact.slots.${index}.undeterminedFate.slots.`;
    let cleared;
    if (edit.kind === 'fate-slot' && ['micro','medium'].includes(edit.value)) {
      if (!shell) {
        const id = `ss14-fate-${index}`;
        shell = slot.undeterminedFate = {instanceId:id, destiny:{instanceId:id+'-item',destinyId:'destiny-undetermined-fate'},slots:[]};
      }
      if (shell.slots.length >= 5) throw new Error('추가 슬롯은 최대 5칸입니다.');
      shell.slots.push({slotType:edit.value,slotId:`${shell.instanceId}:slot:${shell.slots.length}`,installedDestiny:null});
    } else if (edit.kind === 'fate-slot' && edit.value === 'remove' && shell) {
      cleared = shell.slots.length - 1;
      shell.slots.pop();
      if (!shell.slots.length) slot.undeterminedFate = null;
      if(slot.inactiveNodes)slot.inactiveNodes=slot.inactiveNodes.filter(key=>pactAllocationKeys(slot).includes(key));
    } else if (edit.kind === 'destiny-selection' && /^extra-[0-4]$/u.test(edit.key)) {
      const n = Number(edit.key.at(-1)), child = shell?.slots[n];
      if (!child || edit.value && !seasonDestinyOptions(child.slotType === 'micro' ? 'innerRing1' : 'midRing1').some(o=>o.id===edit.value)) throw new Error('슬롯 크기에 맞는 운명을 선택하세요.');
      if ((child.installedDestiny?.destinyId ?? child.destiny?.destinyId ?? '') === edit.value) return true;
      delete child.destiny;
      child.installedDestiny = edit.value ? {instanceId:`ss14-extra-${index}-${n}`,destinyId:edit.value} : null;
      cleared = n;
    } else throw new Error('미정 숙명의 추가 슬롯을 확인하세요.');
    if (cleared !== undefined) for (const key of Object.keys(target.ss14Inputs.destinyRolls ?? {}))
      if (key.startsWith(prefix+cleared+':')) delete target.ss14Inputs.destinyRolls[key];
    capture(target,'pact');
  } else if (edit.kind === 'pact-allocation') {
    const slot=target.pact?.slots?.[index];
    const spirit=selectedSeasonSpirit(slot?.spirit?.spiritId);
    if (!spirit || spirit.drop) throw new Error('전투 정령의 활성 노드를 선택하세요.');
    const keys=pactAllocationKeys(slot);
    if(edit.key==='sequence'){
      const available=keys.filter(key=>!pactNodeActive(slot,key));
      if(!Number.isInteger(edit.value)||edit.value<1||edit.value>available.length)throw new Error('이 정령에 투자할 포인트 수를 확인하세요.');
      slot.inactiveNodes=available.slice(edit.value);
    } else {
      if(![0,1].includes(edit.value)||edit.key!=='all' && !keys.includes(edit.key))throw new Error('정령의 노드를 확인하세요.');
      slot.inactiveNodes=keys.filter(k=>edit.key==='all'||edit.key===k ? !edit.value : !pactNodeActive(slot,k));
    }
    if(!slot.inactiveNodes.length)delete slot.inactiveNodes;
    capture(target,'pact');
  } else if (edit.kind === 'destiny-selection') {
    if(!Number.isInteger(index)||index<0||index>2)throw new Error('정령 칸을 확인하세요.');
    const slot=target.pact?.slots?.[index];
    const spirit=selectedSeasonSpirit(slot?.spirit?.spiritId);
    if(!spirit?.page.parsed.rings.some(r=>r.slotId===edit.key))throw new Error('정령의 운명 장착 칸을 확인하세요.');
    if(edit.value&&!seasonDestinyOptions(edit.key).some(o=>o.id===edit.value))throw new Error('이 칸에 장착할 SS14 운명을 선택하세요.');
    if(edit.value&&!pactNodeActive(slot,edit.key))throw new Error('링을 활성화한 뒤 운명을 장착하세요.');
    if((slot.rings?.[edit.key]?.installedDestiny?.destinyId??'')===edit.value)return true;
    slot.rings??={};slot.rings[edit.key]??={};
    if(edit.value)slot.rings[edit.key].installedDestiny={instanceId:`ss14-destiny-${index}-${edit.key}`,destinyId:edit.value};
    else delete slot.rings[edit.key].installedDestiny;
    for(const key of Object.keys(target.ss14Inputs.destinyRolls??{}))if(key.startsWith(`pact.slots.${index}.rings.${edit.key}:`))delete target.ss14Inputs.destinyRolls[key];
    capture(target,'pact');
  } else if (["spirit-selection", "spirit-level"].includes(edit.kind)) {
    if (!Number.isInteger(index) || index < 0 || index > 2) throw new Error("정령 칸을 확인하세요.");
    target.pact ??= {}; target.pact.slots ??= [];
    if (edit.kind === "spirit-selection") {
      const option = seasonSpiritOptions().find(row => row.id === edit.value);
      if (edit.value && !option) throw new Error("SS14 정령을 선택하세요.");
      const currentId=target.pact.slots[index]?.spirit?.spiritId;
      if((currentId??'')===edit.value || option && option.aliases.includes(currentId))return true;
      for(const key of Object.keys(target.ss14Inputs.destinyRolls??{}))if(key.startsWith(`pact.slots.${index}.`))delete target.ss14Inputs.destinyRolls[key];
      target.pact.slots[index] = { spirit: option ? { spiritId: option.id, level: option.levels[0] } : null, rings: {} };
    } else {
      const slot = target.pact.slots[index];
      if (!selectedSeasonSpirit(slot?.spirit?.spiritId)?.levels.includes(edit.value)) throw new Error("정령 레벨을 확인하세요.");
      slot.spirit.level = edit.value;
    }
    capture(target, "pact");
  } else return false;
  return true;
}
