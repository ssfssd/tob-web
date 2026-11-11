import { SS14_DESTINY } from "./data/ss14Destiny.generated.js";
import { memoryRange, validMemoryRollValue } from "./seasonMemoryRolls.js";
import { SS14_DESTINY_RULES } from './data/ss14DestinyRules.generated.js';

const pattern = /[+]?\(-?\d+(?:\.\d+)?–-?\d+(?:\.\d+)?\)/gu;
const tokens = (text) => [...text.matchAll(pattern)].map((m) => m[0]);

// Older planner builds counted every equipped spirit node.
export const pactNodeActive = (slot, key) => !slot?.inactiveNodes?.includes(key);

export function seasonDestinyOptions(ringSlot) {
  const instruction=/^innerRing[1-6]$/u.test(ringSlot)?'Install to replace a Micro Talent Node'
    :/^midRing[1-3]$/u.test(ringSlot)?'Install to replace a Medium Talent Node':null;
  if(!instruction)return [];
  return SS14_DESTINY.identities.flatMap(identity=>{
    const entry=SS14_DESTINY.pages.en.rows.find(r=>r.slug===identity.slug);
    const ko=SS14_DESTINY.pages.ko.rows.find(r=>r.slug===identity.slug);
    if(!entry?.completeModifierText||entry.instructions.split('\n')[0]!==instruction||!ko)return [];
    return [{id:identity.catalogId,slug:identity.slug,name:ko.name,detail:ko.detail}];
  });
}

export function seasonDestinyRow(build, index, ring, { data = SS14_DESTINY } = {}) {
  const slot = build.pact.slots[index]; const selected = slot.rings?.[ring.slotId]?.installedDestiny;
  if (!selected) return null;
  const identity = data.identities.find((r) => [r.id, r.catalogId].includes(selected.destinyId));
  const page = data.pages.en;
  const entry = page.rows.find((r) => r.slug === identity?.slug);
  const ko = data.pages.ko.rows.find((r) => r.slug === identity?.slug);
  const path = `pact.slots.${index}.rings.${ring.slotId}`;
  const row = { path, item: { id: identity?.catalogId }, page, record: entry?.slug, text: entry?.detail,
    koText: { name: ko?.name, detail: ko?.detail }, destinyRollControls: [], reason: "" };
  const instances = build.pact.slots.flatMap((s) => Object.values(s.rings ?? {}).map((r) => r.installedDestiny?.instanceId)).filter(Boolean);
  const micro = /^innerRing[1-6]$/u.test(ring.slotId) && ring.dataLevel === Number(ring.slotId.at(-1));
  const medium = /^midRing[1-3]$/u.test(ring.slotId) && ring.dataLevel === 6 + Number(ring.slotId.at(-1));
  const instruction = entry?.instructions.split("\n")[0];
  if (index > 2 || !selected.instanceId || instances.filter((id) => id === selected.instanceId).length !== 1
    || slot.undeterminedFate || !(micro && instruction === "Install to replace a Micro Talent Node"
      || medium && instruction === "Install to replace a Medium Talent Node")
    || !entry?.completeModifierText || !entry.modifiers.length
    || new Set(entry.modifiers.map((m) => m.id)).size !== entry.modifiers.length) {
    row.reason = "운명의 SS14 원문·칸·중복 배치를 확인하세요. 미정 숙명의 추가 칸은 아직 연결되지 않았습니다.";
    return row;
  }
  const header='Activates the following effects when there are 2 of this Kismet on the same pact page:';
  if(identity.slug.startsWith('Dual_Kismet_')) {
    if(!entry.detail.startsWith(`${header}\n`)||SS14_DESTINY_RULES.season!=='SS14'
      ||!SS14_DESTINY_RULES.body.includes('Each type of Dual Kismet can only be activated once.')) {
      row.reason='이중 천명의 활성화 규칙 원문을 확인할 수 없습니다.';return row;
    }
    const equipped=build.pact.slots.flatMap((s,i)=>!s.spirit?[]:Object.entries(s.rings??{}).flatMap(([slotId,r])=>
      /^midRing[1-3]$/u.test(slotId)&&pactNodeActive(s,slotId)&&[identity.id,identity.catalogId].includes(r.installedDestiny?.destinyId)
        ?[`pact.slots.${i}.rings.${slotId}`]:[])).sort();
    row.activation={kind:'dual-kismet',count:equipped.length,required:2,owner:equipped[0],receipt:SS14_DESTINY_RULES,
      inactiveReason:equipped.length<2?'같은 이중 천명 2개를 장착하면 활성화됩니다.':equipped[0]!==path?'같은 이중 천명 효과는 한 번만 적용됩니다.':''};
    if(row.activation.inactiveReason)return row;
  }
  let complete = true;
  const rendered = entry.modifiers.map((modifier) => {
    let cursor = 0;
    return modifier.text.replace(pattern, (fragment) => {
      const range = memoryRange(fragment); const ordinal = ++cursor;
      if (!range) { complete = false; return fragment; }
      const key = `${path}:${modifier.id}:${ordinal}`;
      const identity = { instanceId: selected.instanceId, destinyId: row.item.id, modifierId: modifier.id,
        sourcePageSha256: page.sourcePageSha256 };
      const b = build.ss14Inputs?.destinyRolls?.[key];
      const bound = b && Object.entries(identity).every(([k, v]) => b[k] === v) && validMemoryRollValue(range, b.value);
      row.destinyRollControls.push({ ...range, ...identity, key, index, ringSlot: ring.slotId, ordinal, value: bound ? b.value : "" });
      if (!bound) complete = false;
      return bound ? `${range.positive && b.value >= 0 ? "+" : ""}${b.value}` : fragment;
    });
  });
  // Substitute Korean numbers only within the same modifier ID and range order.
  const koRendered = entry.modifiers.map((m) => {
    const translated = ko?.modifiers.find((k) => k.id === m.id);
    if (!translated || JSON.stringify(tokens(m.text)) !== JSON.stringify(tokens(translated.text))) return null;
    let cursor = 0;
    return translated.text.replace(pattern, (fragment, offset) => {
      const ordinal = ++cursor;
      const c = row.destinyRollControls.find((c) => c.modifierId === m.id && c.ordinal === ordinal);
      const line = translated.text.slice(translated.text.lastIndexOf('\n', offset) + 1).split('\n')[0];
      if (c && tokens(line).length === 1) c.label = line.replace(pattern, '').trim();
      return c && c.value !== "" ? `${fragment.startsWith("+") && c.value >= 0 ? "+" : ""}${c.value}` : fragment;
    });
  });
  row.text = rendered.join("\n");
  if(row.activation)row.text=row.text.replace(`${header}\n`,'');
  if (complete && koRendered.every((t) => t !== null)) row.koText.detail = koRendered.join("\n");
  if (!complete) row.reason = "SS14 운명 수치를 현재 원문 범위에서 직접 확인하세요. 이전 시즌 수치는 자동 적용하지 않습니다.";
  return row;
}

export function validSeasonDestinyRolls(build, controls) {
  const bindings = build.ss14Inputs?.destinyRolls;
  if (bindings === undefined) return true;
  if (!bindings || typeof bindings !== "object" || Array.isArray(bindings)) return false;
  return Object.entries(bindings).every(([key, b]) => {
    if (!/^pact\.slots\.[0-2]\.rings\.(innerRing[1-6]|midRing[1-3]):\d+:[1-9]\d*$/u.test(key)
      || !b || typeof b.instanceId !== "string" || typeof b.destinyId !== "string" || !/^\d+$/u.test(b.modifierId)
      || !/^[a-f0-9]{64}$/u.test(b.sourcePageSha256) || typeof b.value !== "number" || !Number.isFinite(b.value)) return false;
    const c = controls.find((c) => c.key === key && c.sourcePageSha256 === b.sourcePageSha256);
    return !c || validMemoryRollValue(c, b.value);
  });
}
