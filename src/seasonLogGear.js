import { SS14_LOG_GEAR } from "./data/ss14LogGear.generated.js";
import { SS14_CRAFT } from "./data/ss14Craft.generated.js";
import { getSeasonSelectionRecord } from "./seasonSelections.js";
import { memoryRange } from "./seasonMemoryRolls.js";
import { parseTlidbGearTooltip } from "./tlidbGearTooltipCalculation.js";
import { mapTlidbTooltipEffects } from "./tlidbTooltipStatMapping.js";
import { resolveTlidbTooltipEffects } from "./tlidbTooltipEffectRuntime.js";
import { SS14_LOG_COMPLETION } from "./data/ss14LogCompletion.generated.js";
import { SS14_INSTALLED_LOG_OPTIONS } from "./data/ss14InstalledLogOptions.generated.js";
import { resolveLogGearMechanics, logMechanicStats } from "./seasonLogGearMechanics.js";
import { normalizeSeasonGearEffects, SEASON_LOCAL_WEAPON_STATS, SEASON_SPELL_FLAT_STATS, SEASON_NATIVE_GEAR_STATS } from "./seasonGearEffects.js";
import { resolveSeasonGearConditions } from './seasonGearConditions.js';

Object.assign(SS14_LOG_GEAR.records, SS14_LOG_COMPLETION.gear);

const families = ["Prefix", "Suffix", "BaseAffix", "BaseAttrAffix", "FixedBaseAffix", "EnchantAffixs", "ChipAffix"];
const object = v => v !== null && typeof v === "object" && !Array.isArray(v);
const hash = v => typeof v === "string" && /^[a-f0-9]{64}$/u.test(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const safeKo = text => /[가-힣]/u.test(text ?? "") && !/\p{Script=Han}/u.test(text) ? text : "한국어 원문 미제공";
const bounds = fragment => memoryRange(fragment) ?? (/^[+-]?\d+(?:\.\d+)?$/u.test(fragment)
  ? { min: Number(fragment), max: Number(fragment), positive: fragment.startsWith("+") } : null);

// Only game-definition IDs and numeric arguments cross this boundary. In
// particular an item instance ID, account, filename or raw text cannot persist.
export function captureLogGear(item, itemId, complete = true) {
  return { version: 1, itemId, authoritySha256: SS14_LOG_GEAR.records[itemId]?.sourcePageSha256 ?? null, complete,
    affixes: families.flatMap(family => (item.affixes?.[family] ?? []).map(a => ({ family,
      id: Number.isSafeInteger(a.Id) && a.Id > 0 ? a.Id : null,
      ...(a.DynArgs !== undefined ? { args: a.DynArgs.map(v => Number.isFinite(v) ? v : null) } : {}),
      ...(a.invalid ? { invalid: true } : {}) }))) };
}
export function validLogGear(log, itemId) {
  return object(log) && log.version === 1 && log.itemId === itemId && typeof log.complete === "boolean"
    && (log.authoritySha256 === null || hash(log.authoritySha256))
    && Object.keys(log).every(k => ["version", "itemId", "authoritySha256", "complete", "affixes"].includes(k))
    && Array.isArray(log.affixes) && log.affixes.length <= 100
    && log.affixes.every(a => object(a) && families.includes(a.family) && (a.id === null || Number.isSafeInteger(a.id) && a.id > 0)
      && Object.keys(a).every(k => ["family", "id", "args", "invalid"].includes(k)) && (a.invalid === undefined || a.invalid === true)
      && (a.args === undefined || Array.isArray(a.args) && a.args.length <= 32 && a.args.every(v => v === null || Number.isFinite(v))));
}
export function rebindLogGear(log, itemId) {
  return { ...structuredClone(log), itemId, authoritySha256: SS14_LOG_GEAR.records[itemId]?.sourcePageSha256 ?? null };
}

function definition(authority, itemId, affix) {
  const native = SS14_INSTALLED_LOG_OPTIONS.records[itemId]?.find(r => r.row.id === String(affix.id));
  if (native) return { row: native.row, ko: native.ko, page: native, replaces: native.replaces };
  const matches = [...authority.normal, ...authority.corroded].filter(r => r.id === String(affix.id));
  if (matches.length === 1) return { row: matches[0], page: authority, ko: authority.ko?.rows.find(r => r.id === String(affix.id)) };
  if (matches.length || !["Prefix", "Suffix"].includes(affix.family)) return null;
  const keys = SS14_CRAFT.gear[itemId] ?? [];
  const hits = keys.map(k => SS14_CRAFT.identities[k]).filter(r => r.modifierId === String(affix.id)
    && r.affixId.includes(affix.family === "Prefix" ? "craft_prefix" : "craft_suffix"));
  const choices = hits.flatMap(identity => {
    const page = SS14_CRAFT.pages[`en/${identity.slug}`];
    return (page?.season === "SS14" ? page.rows : []).filter(r => r.id === String(affix.id)).map(row => ({ row, page,
      ko: SS14_CRAFT.pages[`ko/${identity.slug}`]?.rows.find(r => r.id === row.id) }));
  });
  const unique = [...new Map(choices.map(c => [JSON.stringify([c.row, c.page.sourceUrl]), c])).values()];
  return unique.length === 1 ? unique[0] : null;
}

export function inspectLogGear(itemId, log, build, slotIndex) {
  const authority = SS14_LOG_GEAR.records[itemId], card = getSeasonSelectionRecord("gear", itemId);
  const controls = [], rawEffects = [], effects = [], optionRows = [], reasons = [], mechanics = [];
  const conditionControls = [], inactive = [];
  slotIndex ??= build?.gear?.slots?.findIndex((slot, i) => slot?.itemId === itemId && build.ss14Inputs?.gear?.[i]?.logGear === log);
  const receipt = authority && { season: "SS14", sourceUrl: authority.sourceUrl, sourcePageSha256: authority.sourcePageSha256 };
  const result = () => ({ status: reasons.length ? "partial" : "mapped", receipt, controls, rawEffects, effects, mechanics, conditionControls, inactive,
    rollValues: Object.fromEntries(controls.filter(c => c.value !== "").map(c => [c.key, c.value])),
    effectBlockers: reasons, reasons: [...new Set(reasons)], logOptions: optionRows });
  if (!validLogGear(log, itemId) || !authority || !card || authority.cardSha256 !== card.sourcePageSha256
    || log.authoritySha256 !== authority.sourcePageSha256) {
    reasons.push("로그 옵션과 SS14 장비 원문 연결을 확인할 수 없습니다. 로그를 다시 가져오세요."); return result();
  }
  if (!log.complete) reasons.push("로그의 장비 옵션 기록이 생략되었거나 끝나지 않았습니다.");
  const parse = (text, metadata = {}) => {
    const ordinary = parseTlidbGearTooltip({ id: itemId, categoryId: "gear", tlidbText: { en: {
      ...card, detail: text, sourcePageVersion: "SS14", sourceFieldStatus: { detail: "exact" },
    } } }, { season: "SS14", flavorReceipt: { ...card.flavorReceipt, lines: [] } });
    const normalized = normalizeSeasonGearEffects(resolveLogGearMechanics(ordinary, text, build));
    const conditional = resolveSeasonGearConditions(normalized.effects, build, {
      path: `gear.slots.${slotIndex}.${itemId}.log.${metadata.logModifierId ?? 'base'}.conditions`,
      sourcePageSha256: metadata.receipt?.sourcePageSha256 ?? card.sourcePageSha256 });
    const parsed = { ...normalized, effects: conditional.effects, blockers: [...normalized.blockers, ...conditional.blockers] };
    conditionControls.push(...conditional.conditions); inactive.push(...conditional.inactive);
    mechanics.push(...parsed.mechanics);
    const mapped = mapTlidbTooltipEffects(parsed.effects.filter(e => !logMechanicStats.has(e.stat) && !SEASON_LOCAL_WEAPON_STATS.has(e.stat) && !SEASON_SPELL_FLAT_STATS.has(e.stat) && !SEASON_NATIVE_GEAR_STATS.has(e.stat)));
    const resolved = resolveTlidbTooltipEffects(mapped.effects, { rollValues: {} });
    if (parsed.blockers.length || mapped.blockers.length || resolved.excluded.length) reasons.push(...parsed.blockers.map(b => /[가-힣]/u.test(b.reason) ? b.reason : "SS14 장비 옵션의 특수 효과 해석을 확인해야 합니다."),
      ...[...mapped.blockers, ...resolved.excluded].map(() => "SS14 로그 옵션의 효과·조건 해석을 확인해야 합니다."));
    rawEffects.push(...parsed.effects.map(e => ({ ...e, ...metadata })));
    effects.push(...resolved.applied);
  };
  const baseLines = authority.baseLines?.filter(line => !["Neck", "Waist"].includes(line));
  if (baseLines?.length) parse(baseLines.join("\n"));
  const selected = [];
  for (const [index, affix] of log.affixes.entries()) {
    const found = definition(authority, itemId, affix);
    const row = found?.row;
    let reason = "";
    if (affix.invalid) reason = "옵션 기록의 수치 순서 또는 형식이 올바르지 않습니다.";
    else if (log.affixes.filter(a => a.id === affix.id).length > 1) reason = "같은 옵션 ID가 중복되어 합산하지 않습니다.";
    else if (!row) reason = "이 장비의 SS14 옵션 ID를 확인하지 못했습니다.";
    const fragments = row?.rollFragments ?? [];
    const tokens = [...(row?.renderTemplate ?? "").matchAll(/\{\{roll_(\d+)\}\}/gu)].map(m => Number(m[1]));
    if (row && (tokens.length !== fragments.length || tokens.some((n, i) => n !== i + 1))) reason ||= "SS14 옵션의 수치 자리 연결을 확인할 수 없습니다.";
    if (affix.args !== undefined && affix.args.length !== fragments.length) reason ||= "로그 수치 개수와 SS14 옵션의 수치 자리가 다릅니다.";
    const values = fragments.map((fragment, ordinal) => {
      const argument = row.argumentOrder?.[ordinal] ?? ordinal;
      const range = bounds(fragment), actual = affix.args?.[argument];
      if (!range) { reason ||= "SS14 옵션 수치 범위를 확인할 수 없습니다."; return null; }
      // Fixed values can come from the exact current ID; ranges never default.
      const value = actual === undefined && range.min === range.max ? range.min : actual;
      const valid = typeof value === "number" && Number.isFinite(value) && value >= range.min && value <= range.max;
      if (!valid) reason ||= "로그 수치가 없거나 SS14 범위를 벗어났습니다.";
      if (range.min !== range.max) controls.push({ key: `log:${index}:${ordinal}`, min: range.min, max: range.max,
        value: valid ? value : "", stat: "log-option", sourceText: row.text,
        label: safeKo(found.ko?.text), logIndex: index, ordinal: argument });
      return valid ? value : null;
    });
    const render = r => r.renderTemplate ? r.renderTemplate.replace(/\{\{roll_(\d+)\}\}/gu, (_, n) => {
      const index = Number(n) - 1;
      const argument = r.argumentOrder?.[index] ?? index;
      const sourceIndex = row.argumentOrder ? row.argumentOrder.indexOf(argument) : argument;
      const v = values[sourceIndex]; return `${r.rollFragments[index]?.startsWith("+") && v >= 0 ? "+" : ""}${v}`;
    }) : r.text;
    const ko = found?.ko && (same(found.ko.rollFragments, fragments)
      || row.argumentOrder && found.ko.argumentOrder && found.ko.argumentOrder.every((arg, i) => found.ko.rollFragments[i] === fragments[row.argumentOrder.indexOf(arg)])) ? found.ko : null;
    const detail = safeKo(ko ? reason ? ko.text : render(ko) : "");
    optionRows.push({ id: affix.id, family: affix.family, detail, values, reason,
      receipt: found ? { season: "SS14", sourceUrl: found.page.sourceUrl, sourcePageSha256: found.page.sourcePageSha256 } : null });
    if (row) selected.push({ ...row, replaces: found.replaces });
    if (reason) reasons.push(reason);
    else parse(render(row), { logModifierId: affix.id, detail, receipt: optionRows.at(-1).receipt });
  }
  // Require every original option. A corroded variant is a replacement only
  // when the current page supplies the identical template, never by suffix.
  for (const required of authority.normal) {
    const hits = selected.filter(row => row.id === required.id || row.replaces === required.id || authority.corroded.some(c => c.id === row.id)
      && row.renderTemplate && row.renderTemplate === required.renderTemplate);
    if (hits.length !== 1) reasons.push("장비의 기본·고유 옵션 일부가 없거나 대체 옵션이 겹칩니다.");
  }
  return result();
}

export function editLogGearRoll(log, key, value) {
  const control = inspectLogGear(log.itemId, log).controls.find(c => c.key === key);
  if (!control || value !== "" && (typeof value !== "number" || !Number.isFinite(value) || value < control.min || value > control.max))
    throw new Error("장비 수치가 SS14 원문 범위를 벗어났습니다.");
  const affix = log.affixes[control.logIndex];
  const authority = SS14_LOG_GEAR.records[log.itemId];
  const row = definition(authority, log.itemId, affix).row;
  if (!affix.args) {
    affix.args = Array(row.rollFragments.length).fill(null);
    row.rollFragments.forEach((f, i) => { const b = bounds(f); affix.args[row.argumentOrder?.[i] ?? i] = b?.min === b?.max ? b.min : null; });
  }
  affix.args[control.ordinal] = value === "" ? null : value;
}

export function logAllSkillLevelBonus(build) {
  return Object.entries(build.ss14Inputs?.gear ?? {}).reduce((sum, [index, binding]) => {
    if (!binding.logGear || binding.itemId !== build.gear?.slots?.[index]?.itemId
      || binding.sourcePageSha256 !== getSeasonSelectionRecord('gear', binding.itemId)?.sourcePageSha256) return sum;
    return sum + inspectLogGear(binding.itemId, binding.logGear, build).rawEffects
      .filter(e => e.stat === 'all_skill_levels' && e.operation === 'add' && Number.isInteger(e.value)).reduce((n, e) => n + e.value, 0);
  }, 0);
}
