import {
  ADVANCED_BARRIER_BURST_MECHANIC,
  REGULAR_BARRIER_BURST_MECHANIC,
} from "./barrierBurstMechanics.js";
import {
  createIrisSpiritActiveSkillRecords,
  filterIrisSpiritActiveSkillRecords,
  getIrisSpiritHeroMode,
  getIrisSpiritHostSkillForActiveSkill,
} from "./irisSpiritSkillRuntime.js";
import {
  compareSkillPickerSourceNames,
  getSkillPickerSupportKindOrder,
  isModularizationSkillPickerRecord,
} from "./skillPickerParityContract.js";
import { getCurrentTlidbSupportCompatibility } from "./tlidbSupportCompatibility.js";

export const SUPPORT_SLOT_ENERGY_COSTS = Object.freeze([0, 10, 15, 50, 100]);
export const PASSIVE_SUPPORT_SLOT_ENERGY_COSTS = Object.freeze([10, 10, 15, 50, 100]);
export const SKILL_DEFAULT_LEVEL = 20;
export const SKILL_MAX_LEVEL = 21;
export const FIREBIRD_NECKLACE_ITEM_ID = "gear-tlidb-com-cn-necklace-of-firebird";
export const FIREBIRD_BARRIER_BURST_SKILL_ID = "active-barrier-burst-firebird";
export const FIREBIRD_NECKLACE_GEAR_SLOT_INDEX = 4;
export const FIREBIRD_BARRIER_BURST_AFFIX_SLOT_ID = "slot-3";

const FIREBIRD_BARRIER_BURST_DESCRIPTION = [
  "对周围敌人造成屏障值一定比例的法术火焰伤害",
  "该技能无法被使用",
  "该技能被触发时能够激活法术迸发",
  "该技能只能通过淬火之鸟的颈链触发",
].join("\n");
const FIREBIRD_BARRIER_BURST_TLIDB_TEXT = REGULAR_BARRIER_BURST_MECHANIC.tlidbText;
const FIREBIRD_BARRIER_BURST_SKILL = Object.freeze({
  id: FIREBIRD_BARRIER_BURST_SKILL_ID,
  flatItemId: null,
  kind: "active",
  role: "active",
  name: "屏障爆裂",
  url: "https://tlidb.com/cn/Barrier_Burst",
  iconUrl: "",
  localIconPath: "/assets/tlidb-icons/b91bfa3316c18a3640d82402.webp",
  tags: ["spell", "fire", "area"],
  tagsCn: ["法术", "火焰", "范围"],
  manaCost: 0,
  sealedManaPercent: 0,
  description: FIREBIRD_BARRIER_BURST_DESCRIPTION,
  tlidbText: FIREBIRD_BARRIER_BURST_TLIDB_TEXT,
  effects: [],
  calculationSupported: REGULAR_BARRIER_BURST_MECHANIC.calculationSupported,
  calculationModelAuthority: REGULAR_BARRIER_BURST_MECHANIC.calculationModelAuthority,
  calculationUnsupportedReason: REGULAR_BARRIER_BURST_MECHANIC.calculationUnsupportedReason,
  rawTags: ["strength", "intelligence", "spell", "fire", "area"],
  compatibilityTags: [
    "strength", "intelligence", "spell", "fire", "area", "active",
    "damage", "hit", "ailment_or_dot", "can_activate_spell_burst",
  ],
  hostCapabilities: {
    canDealDamage: true,
    canHit: true,
    canAilmentOrDot: true,
    canBeCatalyzed: false,
  },
  raw: {
    source: "Necklace_of_Firebird",
    canonicalDescription: FIREBIRD_BARRIER_BURST_DESCRIPTION,
    mechanicRecord: REGULAR_BARRIER_BURST_MECHANIC,
    separateMechanicRecords: Object.freeze([ADVANCED_BARRIER_BURST_MECHANIC]),
    localizationEvidence: Object.freeze({
      status: "current-coefficient-unavailable",
      currentSourceCheckedAt: "2026-07-17",
      currentSources: Object.freeze({
        cn: "https://tlidb.com/cn/Barrier_Burst",
        ko: "https://tlidb.com/ko/Barrier_Burst",
        en: "https://tlidb.com/en/Barrier_Burst",
      }),
      currentCoefficient: null,
      historicalUnreceipted: Object.freeze({
        structuralPercent: 75,
        localizedPercent: 300,
      }),
    }),
  },
});

const ACTIVE_SLOT_COUNT = 5;
const PASSIVE_SLOT_COUNT = 4;
const DEFAULT_SKILL_LEVEL = SKILL_DEFAULT_LEVEL;
const MAX_SKILL_LEVEL = SKILL_MAX_LEVEL;
const NON_SELECTABLE_ACTIVE_SOURCE_SLUGS = new Set([
  "vendetta",
  "endless_vendetta",
  "aember_rain",
  "undercurrent",
]);
const PASSIVE_TAG_CN_BY_EN = Object.freeze({
  area: "范围",
  aura: "光环",
  spell: "法术",
  infuse: "贯注",
  cold: "冰冷",
  fire: "火焰",
  lightning: "闪电",
  summon: "召唤",
  attack: "攻击",
  erosion: "腐蚀",
  spirit: "魔灵",
  physical: "物理",
  projectile: "投射物",
  melee: "近战",
  持续: "持续",
});

const SUPPORT_TAG_CN_BY_EN = Object.freeze({
  activation: "激发",
  area: "范围",
  attack: "攻击",
  aura: "光环",
  beam: "射线",
  bombardment: "轰炸",
  chain: "连锁",
  channeling: "引导",
  cold: "冰冷",
  combo: "连携",
  curse: "诅咒",
  basic: "基础技能",
  defense: "防御",
  duration: "持续",
  empower: "强化技能",
  elixir: "灵药",
  erosion: "腐蚀",
  falling: "坠落",
  fire: "火焰",
  ground: "地面",
  guard: "防护",
  infuse: "贯注",
  lightning: "闪电",
  lob: "抛射",
  melee: "近战",
  modularization: "模组",
  movement: "位移",
  physical: "物理",
  projectile: "投射物",
  ranged: "远程",
  recovery: "恢复",
  sentry: "哨卫",
  shadow_strike: "影袭",
  spell: "法术",
  spirit: "魔灵",
  steep_strike: "猛击",
  straight_shot: "直射",
  strike: "打击",
  summon: "召唤",
  synthetic: "智械",
  warcry: "战吼",
  support: "辅助",
  focus: "聚焦",
  strengthen: "强化",
  ultimate: "终极技能",
});

const TAG_ALIASES = Object.freeze({
  位移: "movement",
  mobility: "movement",
  攻击: "attack",
  法术: "spell",
  近战: "melee",
  远程: "ranged",
  投射物: "projectile",
  范围: "area",
  持续: "duration",
  引导: "channeling",
  物理: "physical",
  火焰: "fire",
  冰冷: "cold",
  闪电: "lightning",
  腐蚀: "erosion",
  直射: "straight_shot",
  连锁: "chain",
  挥斩: "steep_strike",
  影袭: "shadow_strike",
  破击: "strike",
  demolisher: "strike",
  堕星: "falling",
  坠落: "falling",
  射线: "beam",
  轰击: "bombardment",
  轰炸: "bombardment",
  召唤: "summon",
  模组: "modularization",
  哨卫: "sentry",
  抛射: "lob",
  防护: "guard",
  defense: "guard",
  战吼: "warcry",
  回复: "recovery",
  诅咒: "curse",
  贯注: "infuse",
  灵药: "elixir",
  强化: "empower",
  触发: "triggered",
  力量: "strength",
  敏捷: "dexterity",
  智慧: "intelligence",
  魔灵: "spirit",
  地面: "ground",
  激发: "activation",
  智械: "synthetic",
  基础技能: "basic",
  "basic skill": "basic",
  强化技能: "empower",
  "empower skill": "empower",
  终极技能: "ultimate",
  "ultimate skill": "ultimate",
  连携技能: "combo",
  连携: "combo",
});

const CHINESE_SUPPORT_TAGS = Object.freeze([
  ["投射物", "projectile"], ["范围", "area"], ["法术", "spell"], ["攻击", "attack"],
  ["引导", "channeling"], ["近战", "melee"], ["远程", "ranged"], ["位移", "movement"],
  ["连锁", "chain"], ["持续", "duration"], ["回复", "recovery"], ["防护", "guard"],
  ["战吼", "warcry"], ["诅咒", "curse"], ["灵药", "elixir"], ["激发", "activation"],
  ["召唤", "summon"], ["模组", "modularization"], ["哨卫", "sentry"], ["光环", "aura"],
  ["基础", "basic"], ["强化", "empower"], ["终极", "ultimate"], ["连携", "combo"],
  ["贯注", "infuse"], ["直射", "straight_shot"], ["射线", "beam"], ["地面", "ground"],
  ["坠落", "falling"], ["轰炸", "bombardment"], ["影袭", "shadow_strike"],
  ["挥斩", "steep_strike"], ["破击", "strike"], ["打击", "strike"], ["魔灵", "spirit"],
  ["智械", "synthetic"],
]);

const DAMAGE_TAGS = new Set(["physical", "fire", "cold", "lightning", "erosion"]);
const NON_HIT_ACTIVE_SKILLS = new Set(["摄念夺识", "暗影之沼", "枯萎射线", "寒霜地面", "烈焰之径"]);
const NON_HIT_INFUSE_SKILLS = new Set(["熔火贯注", "精密 熔火贯注"]);
const NO_SPELL_BURST_SKILLS = new Set(["流焰炎蛇引", "闪电风暴", "月华斩"]);
const SUPPORT_GRANTED_TAGS = Object.freeze({
  "分裂射击：长驱（崇高）": ["channeling"],
  "标记箭雨：沐雨（崇高）": ["channeling"],
  "流焰炎蛇引：涌流（崇高）": ["can_activate_spell_burst"],
  "闪电风暴：澎湃（崇高）": ["can_activate_spell_burst"],
  "月华斩：盈亏（崇高）": ["can_activate_spell_burst"],
  "熔火贯注：火石（华贵）": ["hit", "duration", "ailment_or_dot"],
  "寒冰贯注：肃凛（崇高）": ["ailment_or_dot"],
});
const SUPPORT_REMOVED_TAGS = Object.freeze({
  "寒冰贯注：肃凛（崇高）": ["hit"],
});
const HOST_EXTRA_TAGS = Object.freeze({
  震撼大地: ["duration"],
});

const ACTIVATION_HOST_GROUPS = Object.freeze([
  ["activation"], ["guard"], ["recovery"], ["curse"], ["warcry"], ["elixir"],
]);
const REGULAR_SUPPORT_OVERRIDES = Object.freeze({
  灵能乍泄: { requiredTagGroups: [["can_activate_spell_burst"]] },
});
const ACTIVATION_SUPPORT_OVERRIDES = Object.freeze({
  "触媒: 预备": { excludedTags: ["channeling", "attack"] },
  "触媒: 永动": { requiredTagGroups: ACTIVATION_HOST_GROUPS, excludedTags: ["channeling"] },
  "触媒: 劲敌": { requiredTagGroups: ACTIVATION_HOST_GROUPS, excludedTags: ["channeling"] },
  "触媒: 首领": { requiredTagGroups: ACTIVATION_HOST_GROUPS, excludedTags: ["channeling"] },
  "触媒: 生命": { requiredTagGroups: [["recovery"], ["elixir"]], excludedTags: ["channeling"] },
  "触媒: 护盾": { requiredTagGroups: ACTIVATION_HOST_GROUPS, excludedTags: ["channeling"] },
  "触媒: 重创": { requiredTagGroups: ACTIVATION_HOST_GROUPS, excludedTags: ["channeling"] },
  "触媒: 连续攻击": {
    requiredTagGroups: [["activation"], ["guard"], ["recovery"], ["curse"], ["movement"], ["warcry"], ["elixir"]],
    excludedTags: ["channeling", "attack"],
  },
  "触媒: 破击": { requiredTagGroups: ACTIVATION_HOST_GROUPS, excludedTags: ["channeling"] },
  "触媒: 法术迸发": { requiredTagGroups: ACTIVATION_HOST_GROUPS, excludedTags: ["channeling"] },
  "触媒: 起步": { requiredTagGroups: ACTIVATION_HOST_GROUPS, excludedTags: ["channeling"] },
  "触媒: 止步": { requiredTagGroups: ACTIVATION_HOST_GROUPS, excludedTags: ["channeling"] },
  "触媒: 激活共鸣": { requiredTagGroups: ACTIVATION_HOST_GROUPS, excludedTags: ["channeling"] },
  "触媒: 共鸣": { requiredTagGroups: ACTIVATION_HOST_GROUPS, excludedTags: ["channeling"] },
  "触媒: 律动": { hostRole: "active", requiredSupportSlot: 1, excludedTags: ["channeling"], requiresDamage: true },
  "触媒: 疾风律动": {
    hostRole: "active", requiredSupportSlot: 1, requiredTagGroups: [["spell"]],
    excludedTags: ["channeling"], requiresDamage: true,
  },
  "触媒: 止步攻击": { requiredTagGroups: [["attack"]], excludedTags: ["channeling"], requiresDamage: true },
  "触媒: 静止攻击": { requiredTagGroups: [["attack"]], excludedTags: ["channeling"], requiresDamage: true },
  "触媒: 哨卫": { requiredTagGroups: [["sentry"]] },
  "触媒: 召唤物": { requiredTagGroups: [["synthetic"]] },
  "触媒: 暴击": { excludedTags: ["summon"], requiresHit: true },
  "触媒: 引导": { requiredTagGroups: [["channeling"]] },
  "触媒: 指令": { hostRole: "active", requiredSupportSlot: 1, excludedTags: ["channeling"], requiresDamage: true },
  "触媒: 锁定": {},
  "触媒: 追踪": { excludedTags: ["channeling"], requiresDamage: true },
  "触媒: 激活迸发": {
    hostRole: "active", requiredSupportSlot: 1, requiredTagGroups: [["can_activate_spell_burst"]],
    excludedTags: ["channeling"], requiresDamage: true,
  },
  "触媒: 静止": { requiredTagGroups: [["attack"], ["spell"]], excludedTags: ["channeling"], requiresDamage: true },
});

function sourceSlug(value) {
  if (typeof value !== "string") return "";
  const path = value.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  const encoded = path.slice(path.lastIndexOf("/") + 1);
  try {
    return decodeURIComponent(encoded).toLowerCase();
  } catch {
    return encoded.toLowerCase();
  }
}

function recordId(prefix, record, index) {
  const raw = record?.id ?? sourceSlug(record?.url) ?? record?.name_en ?? record?.name;
  return `${prefix}:${String(raw || index).toLowerCase()}`;
}

function sourceKey(value) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/\/+$/, "") : "";
}

function flatItemMap(items) {
  const result = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item?.id) continue;
    if (item.sourceUrl) result.set(sourceKey(item.sourceUrl), item);
    if (item.name) result.set(`name:${normalizedText(item.name)}`, item);
  }
  return result;
}

function strings(input) {
  return Array.isArray(input) ? input.filter((value) => typeof value === "string" && value) : [];
}

function cloneJson(value) {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneJson(entry)]));
  }
  return value;
}

function normalizedText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function canonicalTag(value) {
  const normalized = normalizedText(value).toLowerCase();
  return normalized ? TAG_ALIASES[normalized] ?? normalized : "";
}

function uniqueCanonicalTags(values) {
  const result = [];
  for (const value of values ?? []) {
    const tag = canonicalTag(value);
    if (tag && !result.includes(tag)) result.push(tag);
  }
  return result;
}

function uniqueText(values) {
  const result = [];
  for (const value of values ?? []) {
    const text = normalizedText(value);
    if (text && !result.includes(text)) result.push(text);
  }
  return result;
}

function isPopulatedObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0;
}

function hasDamageData(record) {
  const template = normalizedText(record?.description?.template);
  const summary = normalizedText(record?.description?.summary);
  const damageToken = /\{damage[_a-zA-Z0-9]*\}/;
  return isPopulatedObject(record?.base_damages_by_level)
    || isPopulatedObject(record?.weapon_ratio_by_level)
    || isPopulatedObject(record?.extra_damages_by_level)
    || damageToken.test(template)
    || damageToken.test(summary);
}

function activeHostCapabilities(record, rawTags) {
  const canDealDamage = rawTags.includes("attack") || (rawTags.includes("spell") && hasDamageData(record));
  const canHit = canDealDamage && !NON_HIT_ACTIVE_SKILLS.has(normalizedText(record?.name));
  const canAilmentOrDot = canDealDamage && (
    rawTags.some((tag) => DAMAGE_TAGS.has(tag)) || rawTags.includes("duration")
  );
  const description = `${normalizedText(record?.description?.summary)} ${normalizedText(record?.description?.template)}`;
  return {
    canDealDamage,
    canHit,
    canAilmentOrDot,
    canBeCatalyzed: !description.includes("无法被触媒技能辅助"),
  };
}

function infuseHostCapabilities(record, rawTags) {
  return {
    canDealDamage: rawTags.includes("attack") || rawTags.some((tag) => DAMAGE_TAGS.has(tag)),
    canHit: !NON_HIT_INFUSE_SKILLS.has(normalizedText(record?.name)),
    canAilmentOrDot: rawTags.some((tag) => DAMAGE_TAGS.has(tag)) || rawTags.includes("duration"),
    canBeCatalyzed: false,
  };
}

function passiveHostCapabilities(record, rawTags) {
  if (rawTags.includes("infuse")) return infuseHostCapabilities(record, rawTags);
  const canDealDamage = !record?.is_aura && rawTags.includes("summon") && rawTags.includes("spirit");
  return {
    canDealDamage,
    canHit: canDealDamage && !NON_HIT_ACTIVE_SKILLS.has(normalizedText(record?.name)),
    canAilmentOrDot: canDealDamage && (
      rawTags.some((tag) => DAMAGE_TAGS.has(tag)) || rawTags.includes("duration")
    ),
    canBeCatalyzed: false,
  };
}

function supportHostCapabilities() {
  return { canDealDamage: false, canHit: false, canAilmentOrDot: false, canBeCatalyzed: false };
}

function canActivateSpellBurst(record, rawTags) {
  return !NO_SPELL_BURST_SKILLS.has(normalizedText(record?.name))
    && rawTags.includes("spell")
    && !rawTags.includes("summon")
    && !rawTags.includes("sentry")
    && !rawTags.includes("channeling");
}

function skillCompatibility(record, role) {
  const rawTags = uniqueCanonicalTags([
    ...strings(record?.skill_types),
    ...strings(record?.skill_types_cn),
    ...strings(record?.primary_attributes),
    ...strings(record?.primary_attributes_cn),
  ]);
  const hostCapabilities = role === "active"
    ? activeHostCapabilities(record, rawTags)
    : role === "passive"
      ? passiveHostCapabilities(record, rawTags)
      : supportHostCapabilities();
  const extraTags = role === "active"
    ? [
        canActivateSpellBurst(record, rawTags) ? "can_activate_spell_burst" : "",
        ...(HOST_EXTRA_TAGS[normalizedText(record?.name)] ?? []),
      ]
    : [];
  const compatibilityTags = uniqueCanonicalTags([
    ...rawTags,
    role === "support" ? "" : role,
    hostCapabilities.canDealDamage ? "damage" : "",
    hostCapabilities.canHit ? "hit" : "",
    hostCapabilities.canAilmentOrDot ? "ailment_or_dot" : "",
    ...extraTags,
  ]);
  return { rawTags, hostCapabilities, compatibilityTags };
}

function splitChineseTagList(value) {
  return normalizedText(value)
    .replace(/[，,]/g, "、")
    .replace(/或者/g, "、")
    .replace(/或/g, "、")
    .replace(/和/g, "、")
    .split("、")
    .map(normalizedText)
    .filter(Boolean);
}

function splitChineseAlternatives(value) {
  return normalizedText(value).replace(/或者/g, "或").split("或").map(normalizedText).filter(Boolean);
}

function parseChineseTags(value) {
  const result = [];
  let remainder = normalizedText(value);
  for (const [phrase, tag] of CHINESE_SUPPORT_TAGS) {
    if (!remainder.includes(phrase)) continue;
    if (!result.includes(tag)) result.push(tag);
    remainder = remainder.split(phrase).join("");
  }
  return uniqueCanonicalTags(result);
}

function extractSupportAllowClause(sentence) {
  const text = normalizedText(sentence);
  if (!text.startsWith("辅助")) return "";
  const body = text.slice(2);
  const stop = /(?=被辅助|释放被辅助|使用被辅助|每释放|每使用|该技能只能安装|静止时|低魔时|生命濒危时|受到重创时|至少拥有|同时拥有|10米内|自身每|自身受|敌人每|增益存在|否则|获得增益)/;
  return normalizedText(body.split(stop, 1)[0] ?? body).replace(/[。；;]+$/g, "");
}

function parseSupportDescription(description) {
  const text = normalizedText(description).replace(/\s+/g, "");
  const sentences = text.split(/[。；;]/).map(normalizedText).filter(Boolean);
  const allowSentence = sentences.find((sentence) => sentence.startsWith("辅助")) ?? "";
  const allowClause = extractSupportAllowClause(allowSentence);
  let hostRole = "any";
  let requiresHit = false;
  let requiresDamage = false;
  let requiresAilmentOrDot = false;
  const requiredTagGroups = [];

  if (allowClause) {
    let remainder = normalizedText(allowClause);
    if (remainder.includes("主动")) {
      hostRole = "active";
      remainder = remainder.replace(/主动/g, "");
    }
    if (remainder.includes("被动")) {
      hostRole = "passive";
      remainder = remainder.replace(/被动/g, "");
    }
    if (remainder.includes("击中敌人的") || remainder.includes("击中")) {
      requiresHit = true;
      remainder = remainder.replace(/击中敌人的/g, "").replace(/击中/g, "");
    }
    if (remainder.includes("能造成伤害的") || remainder.includes("造成伤害的")) {
      requiresDamage = true;
      remainder = remainder.replace(/能造成伤害的/g, "").replace(/造成伤害的/g, "");
    }
    if (
      remainder.includes("造成持续伤害或能造成异常状态的")
      || remainder.includes("持续或能造成异常状态的")
      || remainder.includes("能造成异常状态的")
    ) {
      requiresAilmentOrDot = true;
      remainder = remainder
        .replace(/造成持续伤害或能造成异常状态的/g, "")
        .replace(/持续或能造成异常状态的/g, "")
        .replace(/能造成异常状态的/g, "");
    }
    remainder = remainder.replace(/任意/g, "");
    for (const alternative of splitChineseAlternatives(remainder)) {
      const group = uniqueCanonicalTags(splitChineseTagList(alternative).flatMap(parseChineseTags));
      if (group.length) requiredTagGroups.push(group);
    }
  }

  const excludedTags = uniqueCanonicalTags(sentences.flatMap((sentence) => {
    if (!sentence.includes("无法辅助")) return [];
    const excluded = sentence.split("无法辅助", 2)[1]?.replace(/技能/g, "") ?? "";
    return splitChineseTagList(excluded).flatMap(parseChineseTags);
  }));
  const slotMatch = text.match(/第\s*(\d+)\s*个辅助技能栏位/);
  const requiredSupportSlot = slotMatch ? Number(slotMatch[1]) : null;
  return {
    hasAllowClause: Boolean(allowClause),
    hasExcludeClause: sentences.some((sentence) => sentence.includes("无法辅助")),
    hostRole,
    requiresHit,
    requiresDamage,
    requiresAilmentOrDot,
    requiredTagGroups,
    excludedTags,
    requiredSupportSlot: Number.isFinite(requiredSupportSlot) ? requiredSupportSlot : null,
  };
}

function exclusiveHostSkillNames(name) {
  const prefix = normalizedText(name).split(/[:：]/, 1)[0] ?? "";
  return prefix ? [normalizedText(prefix)] : [];
}

function normalizeSupportCompatibility(record, kind) {
  const name = normalizedText(record?.name);
  const parsed = parseSupportDescription(record?.description);
  const compatibleTags = uniqueCanonicalTags(record?.compatible_tags);
  const oneOfTags = uniqueCanonicalTags(record?.one_of_tags);
  const rawRequiredTagGroups = [
    ...(compatibleTags.length ? [compatibleTags] : []),
    ...oneOfTags.map((tag) => [tag]),
  ];
  const parsedRequiredGroups = parsed.hasAllowClause ? parsed.requiredTagGroups : rawRequiredTagGroups;
  const parsedExcludedTags = parsed.hasExcludeClause
    ? parsed.excludedTags
    : uniqueCanonicalTags(record?.excluded_tags);
  const override = kind === "activation"
    ? ACTIVATION_SUPPORT_OVERRIDES[name]
    : kind === "regular"
      ? REGULAR_SUPPORT_OVERRIDES[name]
      : undefined;
  const requiredTagGroups = (override?.requiredTagGroups ?? parsedRequiredGroups)
    .map((group) => uniqueCanonicalTags(group))
    .filter((group) => group.length);
  let excludedTags = uniqueCanonicalTags(override?.excludedTags ?? parsedExcludedTags);
  if (name === "酣战" && requiredTagGroups.flat().includes("activation")) {
    excludedTags = excludedTags.filter((tag) => tag !== "summon");
  }
  const recordSlot = typeof record?.required_support_slot === "number"
    ? record.required_support_slot
    : typeof record?.required_slot === "number"
      ? record.required_slot
      : null;
  const specificHostSkillNames = uniqueText(
    override?.specificHostSkillNames
      ?? (kind === "magnificent" || kind === "noble" ? exclusiveHostSkillNames(name) : []),
  );
  return {
    requiredTagGroups,
    excludedTags,
    specificHostSkillNames,
    hostRole: override?.hostRole
      ?? (parsed.hostRole !== "any" ? parsed.hostRole : kind === "activation" ? "active" : "any"),
    requiresHit: override?.requiresHit ?? parsed.requiresHit,
    requiresDamage: override?.requiresDamage ?? parsed.requiresDamage,
    requiresAilmentOrDot: override?.requiresAilmentOrDot ?? parsed.requiresAilmentOrDot,
    requiredSupportSlot: override?.requiredSupportSlot
      ?? parsed.requiredSupportSlot
      ?? recordSlot
      ?? (kind === "activation" ? 1 : null),
  };
}

function applyCurrentTlidbSupportCompatibility(fallback, flatItem) {
  const current = getCurrentTlidbSupportCompatibility(flatItem);
  if (!current) return fallback;
  return {
    ...fallback,
    requiredTagGroups: current.requiredTagGroups,
    excludedTags: current.excludedTags,
    specificHostSkillNames: current.specificHostSkillNames,
    hostRole: current.hostRole,
    requiresHit: current.requiresHit,
    requiresDamage: current.requiresDamage,
    requiresAilmentOrDot: current.requiresAilmentOrDot,
  };
}

function displaySupportTags(record, kind) {
  const prefix = kind === "activation" ? "触媒" : kind === "magnificent" ? "华贵" : kind === "noble" ? "崇高" : "";
  const mapped = strings(record?.skill_types).map((tag) => (
    kind === "activation" && canonicalTag(tag) === "activation"
      ? "辅助"
      : SUPPORT_TAG_CN_BY_EN[canonicalTag(tag)] ?? normalizedText(tag)
  ));
  return uniqueText([prefix, ...mapped]);
}

function sortByChineseName(records) {
  return records.sort(compareSkillPickerSourceNames);
}

const EXCLUSIVE_SUPPORT_TIERS = Object.freeze(["T0", "T1", "T2"]);
const ACTIVATION_SUPPORT_TIERS = Object.freeze(["T0", "T1", "T2", "T3"]);

function tierId(value, allowed = ACTIVATION_SUPPORT_TIERS) {
  const normalized = normalizedText(value).toUpperCase();
  return allowed.includes(normalized) ? normalized : null;
}

function decimalPlaces(value) {
  const text = String(Number(value));
  if (text.includes("e-")) return Math.max(0, Number(text.split("e-")[1]) || 0);
  return (text.split(".")[1] ?? "").length;
}

function rangeStep(...values) {
  const places = values.reduce((maximum, value) => Math.max(maximum, decimalPlaces(value)), 0);
  return Number((1 / (10 ** places)).toFixed(places));
}

function normalizedTierRanges(input, tiers, rangeIndex = null) {
  const result = {};
  for (const tier of tiers) {
    const source = input?.[tier];
    const range = rangeIndex === null ? source : Array.isArray(source) ? source[rangeIndex] : null;
    if (!Array.isArray(range) || range.length < 2) continue;
    const first = Number(range[0]);
    const second = Number(range[1]);
    if (Number.isFinite(first) && Number.isFinite(second)) result[tier] = [first, second];
  }
  return result;
}

function activationControlLabel(effect, rangeIndex, rangeCount) {
  const description = normalizedText(effect?.description);
  const sourceLabel = description || normalizedText(effect?.id);
  return rangeCount > 1 ? `${sourceLabel} #${rangeIndex + 1}` : sourceLabel;
}

function activationFieldBinding(effect, rangeIndex, minimum, maximum) {
  const description = normalizedText(effect?.description);
  const hint = normalizedText(effect?.mod_params?.data?.semantic_hint).toLowerCase();
  if (hint.includes("interval") || (rangeIndex === 0 && description.includes("每隔"))) return "activationIntervalSeconds";
  if (hint.includes("distance") || description.includes("距离") || (description.includes("米") && Math.max(minimum, maximum) >= 5)) {
    return "activationDistanceMeters";
  }
  return null;
}

function activationEditorConfig(record) {
  const effects = Array.isArray(record?.effects) ? record.effects : [];
  const seenTiers = new Set();
  for (const effect of effects) {
    for (const source of [
      effect?.activation_medium_tier_ranges,
      effect?.activation_medium_tier_descriptions,
      effect?.activation_medium_tier_numbers,
    ]) {
      for (const key of Object.keys(source ?? {})) if (ACTIVATION_SUPPORT_TIERS.includes(key)) seenTiers.add(key);
    }
  }
  const tierOptions = ACTIVATION_SUPPORT_TIERS.filter((tier) => seenTiers.has(tier));
  const numericControls = [];
  const clauses = [];
  for (const effect of effects) {
    const effectId = normalizedText(effect?.id || effect?.description);
    const description = normalizedText(effect?.description);
    const ranges = (effect?.mod_params?.data?.ranges ?? []).filter((range) => (
      Number.isFinite(Number(range?.min)) && Number.isFinite(Number(range?.max))
    ));
    const tierDescriptions = Object.fromEntries(tierOptions.flatMap((tier) => {
      const text = normalizedText(effect?.activation_medium_tier_descriptions?.[tier]);
      return text ? [[tier, text]] : [];
    }));
    const clauseTierOptions = tierOptions.filter((tier) => (
      effect?.activation_medium_tier_ranges?.[tier]
      || effect?.activation_medium_tier_descriptions?.[tier]
      || effect?.activation_medium_tier_numbers?.[tier]
    ));
    const controlKeys = [];
    ranges.forEach((range, rangeIndex) => {
      const minimum = Number(range.min);
      const maximum = Number(range.max);
      const fieldBinding = activationFieldBinding(effect, rangeIndex, minimum, maximum);
      const storageKey = ranges.length > 1 ? `${effectId}#${rangeIndex}` : effectId;
      const tierRanges = normalizedTierRanges(effect?.activation_medium_tier_ranges, tierOptions, rangeIndex);
      const interval = fieldBinding === "activationIntervalSeconds";
      const defaultValue = interval ? Math.min(minimum, maximum) : Math.max(minimum, maximum);
      controlKeys.push(storageKey);
      numericControls.push({
        storage_key: storageKey,
        label: activationControlLabel(effect, rangeIndex, ranges.length),
        description,
        kind: "slider",
        min: Math.min(minimum, maximum),
        max: Math.max(minimum, maximum),
        step: fieldBinding === "activationDistanceMeters" ? 1 : rangeStep(minimum, maximum),
        default_value: defaultValue,
        override_keys: uniqueText([storageKey, effectId, description]),
        field_binding: fieldBinding,
        effect_id: effectId,
        activation_medium_tier_range_presets: tierRanges,
        activation_medium_tier_descriptions: tierDescriptions,
      });
    });
    clauses.push({
      effect_id: effectId,
      description,
      tier_options: clauseTierOptions,
      tier_descriptions: tierDescriptions,
      control_keys: controlKeys,
    });
  }
  return {
    kind: "activation_medium",
    tier_options: tierOptions,
    default_tier: tierOptions[0] ?? "T0",
    numeric_controls: numericControls,
    clauses,
    combat_numeric_controls: [],
  };
}

function exclusiveEditorConfig(record) {
  const numericControls = [];
  for (const effect of record?.effects ?? []) {
    const tierRanges = normalizedTierRanges(effect?.tier_ranges, EXCLUSIVE_SUPPORT_TIERS);
    if (!Object.keys(tierRanges).length) continue;
    const storageKey = normalizedText(effect?.id || effect?.description);
    const values = Object.values(tierRanges).flat();
    const selected = tierRanges.T0 ?? tierRanges.T1 ?? tierRanges.T2;
    numericControls.push({
      storage_key: storageKey,
      label: normalizedText(effect?.description) || storageKey,
      description: normalizedText(effect?.description),
      kind: "slider",
      min: Math.min(...values),
      max: Math.max(...values),
      step: Math.min(rangeStep(...values), 0.1),
      default_value: (Number(selected[0]) + Number(selected[1])) / 2,
      override_keys: uniqueText([storageKey, effect?.description]),
      tier_range_presets: tierRanges,
      is_tier_driven: true,
      effect_id: storageKey,
    });
  }
  return {
    kind: "exclusive_support",
    tier_options: [...EXCLUSIVE_SUPPORT_TIERS],
    default_tier: "T0",
    default_level: 1,
    level_options: [1, 2, 3, 4, 5],
    numeric_controls: numericControls,
  };
}

function supportEditorConfig(record, kind) {
  if (kind === "activation") return activationEditorConfig(record);
  if (kind === "magnificent" || kind === "noble") return exclusiveEditorConfig(record);
  return { kind: "basic_support", numeric_controls: [] };
}

function normalizeSkillRecord(record, kind, index, flatBySource = new Map(), flatById = new Map()) {
  const flatCategory = kind.startsWith("support-") ? "supports" : "skills";
  const derivedFlatId = record?.id
    ? `${flatCategory}-${String(record.id).toLowerCase().replaceAll("_", "-")}`
    : "";
  const flatItem = flatById.get(derivedFlatId)
    ?? flatBySource.get(sourceKey(record?.url))
    ?? flatBySource.get(`name:${normalizedText(record?.name)}`);
  const role = kind === "active" || kind === "passive" ? kind : "support";
  const compatibility = skillCompatibility(record?._compatibilitySource ?? record, role);
  const { _compatibilitySource: omittedCompatibilitySource, ...rawRecord } = record ?? {};
  return {
    id: flatItem?.id ?? recordId(kind, record, index),
    flatItemId: flatItem?.id ?? null,
    kind,
    role,
    name: typeof record?.name === "string" ? record.name : "",
    nameEn: typeof record?.name_en === "string" ? record.name_en : "",
    url: typeof record?.url === "string" ? record.url : "",
    iconUrl: typeof record?.icon_url === "string" ? record.icon_url : "",
    localIconPath: typeof record?.local_icon_path === "string" ? record.local_icon_path : "",
    tags: strings(record?.skill_types),
    tagsCn: strings(record?.skill_types_cn),
    displayTags: strings(record?._displayTags).length
      ? strings(record._displayTags)
      : strings(record?.skill_types_cn).length
        ? strings(record.skill_types_cn)
        : strings(record?.skill_types),
    tlidbText: cloneJson(flatItem?.tlidbText ?? record?.tlidbText ?? {}),
    manaCost: Number(record?.mana_cost) || 0,
    sealedManaPercent: Number(record?.sealed_mana_pct) || 0,
    description: cloneJson(record?.description ?? ""),
    descriptionEn: typeof record?.description_en === "string" ? record.description_en : "",
    effects: cloneJson(record?.effects ?? []),
    rawTags: compatibility.rawTags,
    compatibilityTags: compatibility.compatibilityTags,
    hostCapabilities: compatibility.hostCapabilities,
    raw: cloneJson(rawRecord),
  };
}

function normalizeSupportRecord(record, kind, index, flatBySource = new Map(), flatById = new Map()) {
  const normalizedSkill = normalizeSkillRecord(record, `support-${kind}`, index, flatBySource, flatById);
  const flatItem = flatById.get(normalizedSkill.flatItemId)
    ?? flatBySource.get(sourceKey(record?.url))
    ?? flatBySource.get(`name:${normalizedText(record?.name)}`);
  const flatProfile = flatItem?.supportProfile;
  const compatibilitySource = flatProfile
    ? {
        ...record,
        compatible_tags: strings(record?.compatible_tags).length
          ? record.compatible_tags
          : flatProfile.compatibleTags,
        excluded_tags: strings(record?.excluded_tags).length
          ? record.excluded_tags
          : flatProfile.excludedTags,
        one_of_tags: strings(record?.one_of_tags).length
          ? record.one_of_tags
          : flatProfile.oneOfTags,
      }
    : record;
  const supportCompatibility = applyCurrentTlidbSupportCompatibility(
    normalizeSupportCompatibility(compatibilitySource, kind),
    flatItem,
  );
  return {
    ...normalizedSkill,
    supportKind: kind,
    tagsCn: displaySupportTags(record, kind),
    compatibleTags: uniqueCanonicalTags(compatibilitySource?.compatible_tags),
    excludedTags: uniqueCanonicalTags(compatibilitySource?.excluded_tags),
    oneOfTags: uniqueCanonicalTags(compatibilitySource?.one_of_tags),
    manaCostMultiplier: Number(record?.mana_cost_multiplier) || 100,
    maxLevel: MAX_SKILL_LEVEL,
    requiredSlot: supportCompatibility.requiredSupportSlot,
    supportCompatibility,
    grantedHostCompatibilityTags: uniqueCanonicalTags(SUPPORT_GRANTED_TAGS[normalizedText(record?.name)] ?? []),
    removedHostCompatibilityTags: uniqueCanonicalTags(SUPPORT_REMOVED_TAGS[normalizedText(record?.name)] ?? []),
    specialType: typeof record?.special_type === "string" ? record.special_type : "",
    tierTable: cloneJson(record?.tier_table ?? []),
    editorConfig: supportEditorConfig(record, kind),
  };
}

function modularSupports(dataset) {
  return [
    ...(dataset?.programs ?? []),
    ...(dataset?.protocols ?? []),
    ...(dataset?.aura_overwrites ?? []),
    ...(dataset?.source_codes ?? []),
  ];
}

function skillTagTranslations(datasets) {
  const translations = new Map();
  for (const record of [...(datasets?.skill_active ?? []), ...(datasets?.skill_passive ?? [])]) {
    const english = strings(record?.skill_types);
    const chinese = strings(record?.skill_types_cn);
    chinese.forEach((tag, index) => {
      if (english[index] && !translations.has(tag)) translations.set(tag, english[index]);
    });
  }
  return translations;
}

function selectableActiveRecords(datasets) {
  const modular = datasets?.skill_modularization_catalog ?? {};
  const modularSummonSkillNames = new Set(
    (modular.modularization_skills ?? []).flatMap((record) => strings(record?.summon_skill_names)),
  );
  const rootName = modular.skill?.name;
  const rootRecord = (datasets?.skill_active ?? []).find((record) => record?.name === rootName) ?? modular.skill;
  const regular = (datasets?.skill_active ?? []).filter((record) => (
    record?.name !== rootName
    && !modularSummonSkillNames.has(record?.name)
    && !NON_SELECTABLE_ACTIVE_SOURCE_SLUGS.has(sourceSlug(record?.url))
  ));
  const tagTranslations = skillTagTranslations(datasets);
  const modularSkills = (modular.modularization_skills ?? []).map((record) => {
    const sourceDisplayTags = strings(record?.skill_types_cn).length
      ? strings(record.skill_types_cn)
      : strings(record?.skill_types);
    const chineseTags = [...new Set([...strings(record?.skill_types_cn), "模组"])];
    return {
      ...record,
      _displayTags: sourceDisplayTags,
      _compatibilitySource: rootRecord,
      url: record?.source_url ?? "",
      icon_url: record?.icon_url ?? "",
      local_icon_path: record?.local_icon_path ?? "",
      skill_types_cn: chineseTags,
      skill_types: chineseTags.map((tag) => tagTranslations.get(tag) ?? (tag === "模组" ? "modular" : tag)),
      mana_cost: Number(record?.mana_cost) || 0,
      description: record?.summary ?? "",
      has_custom_logic: true,
      _isModularizationCatalogRecord: true,
    };
  });
  return [...regular, ...modularSkills];
}

function passiveRecords(datasets) {
  return (datasets?.skill_passive ?? []).map((record) => ({
    ...record,
    _displayTags: strings(record?.skill_types_cn).length
      ? strings(record.skill_types_cn)
      : strings(record?.skill_types),
    skill_types_cn: strings(record?.skill_types).map((tag) => PASSIVE_TAG_CN_BY_EN[tag] ?? tag),
  }));
}

function normalizeElixir(dataset) {
  return {
    version: Number(dataset?.catalog_version) || 0,
    bottles: (dataset?.bottles ?? []).map((bottle) => ({
      ...cloneJson(bottle),
      displayName: bottle.display_name ?? "",
      slotId: bottle.slot_id ?? "",
      baseIngredientCapacity: Number(bottle.base_ingredient_capacity) || 0,
      ingredientSlotCategoryIds: strings(bottle.ingredient_slot_category_ids),
    })),
    categories: (dataset?.ingredient_categories ?? []).map((category) => ({
      ...cloneJson(category),
      displayName: category.display_name ?? "",
    })),
    ingredients: (dataset?.ingredients ?? []).map((ingredient) => ({
      ...cloneJson(ingredient),
      displayName: ingredient.display_name ?? "",
      categoryId: ingredient.category_id ?? "",
      allowedBottleIds: strings(ingredient.allowed_bottle_ids),
      effects: cloneJson(ingredient.effect_entries ?? []),
    })),
    skills: (dataset?.skills ?? []).map((skill) => ({
      ...cloneJson(skill),
      name: skill.skill_name ?? "",
      effects: cloneJson(skill.effect_entries ?? []),
    })),
  };
}

export function createSkillRuntimeModel(datasets, catalogs = {}) {
  const skillBySource = flatItemMap(catalogs.skills);
  const skillById = new Map((catalogs.skills ?? []).map((item) => [item.id, item]));
  const supportBySource = flatItemMap(catalogs.supports);
  const supportById = new Map((catalogs.supports ?? []).map((item) => [item.id, item]));
  const activeRecords = selectableActiveRecords(datasets);
  const active = activeRecords.map((record, index) => (
    normalizeSkillRecord(record, "active", index, skillBySource, skillById)
  ));
  const regularActive = sortByChineseName(active.filter((record) => (
    !isModularizationSkillPickerRecord(record)
  )));
  const modularActive = active.filter(isModularizationSkillPickerRecord);
  const passive = sortByChineseName(passiveRecords(datasets).map((record, index) => (
    normalizeSkillRecord(record, "passive", index, skillBySource, skillById)
  )));
  const irisSpiritActive = createIrisSpiritActiveSkillRecords(passive);
  const supports = {
    regular: sortByChineseName((datasets?.skill_support ?? []).map((record, index) => normalizeSupportRecord(record, "regular", index, supportBySource))),
    activation: sortByChineseName((datasets?.skill_activation_medium ?? []).map((record, index) => normalizeSupportRecord(record, "activation", index, supportBySource))),
    magnificent: sortByChineseName((datasets?.skill_magnificent_support ?? []).map((record, index) => normalizeSupportRecord(record, "magnificent", index, supportBySource))),
    noble: sortByChineseName((datasets?.skill_noble_support ?? []).map((record, index) => normalizeSupportRecord(record, "noble", index, supportBySource))),
    modular: modularSupports(datasets?.skill_modularization_catalog).map((record, index) =>
      normalizeSupportRecord(record, "modular", index, supportBySource, supportById)),
  };
  const allSupports = getSkillPickerSupportKindOrder()
    .flatMap((kind) => supports[kind] ?? []);
  return {
    active: [...regularActive, ...modularActive],
    irisSpiritActive,
    passive,
    external: [FIREBIRD_BARRIER_BURST_SKILL],
    supports,
    allSupports,
    elixir: normalizeElixir(datasets?.skill_elixir_catalog),
  };
}

export function getExternalMainSkillOverride(model, build, kind, rowIndex) {
  if (kind !== "active" || rowIndex !== 0) return null;
  const equippedGearIds = Array.isArray(build?.selections?.gear) ? build.selections.gear : [];
  if (equippedGearIds[FIREBIRD_NECKLACE_GEAR_SLOT_INDEX] !== FIREBIRD_NECKLACE_ITEM_ID) return null;
  const nestedNecklace = build?.gear?.slots?.[FIREBIRD_NECKLACE_GEAR_SLOT_INDEX];
  const legendaryDraft = build?.gearLegendaryDrafts?.[FIREBIRD_NECKLACE_ITEM_ID]
    ?? (nestedNecklace?.itemId === FIREBIRD_NECKLACE_ITEM_ID ? nestedNecklace.legendaryDraft : null);
  const hasExplicitCorrosionSlots = Array.isArray(legendaryDraft?.corrodedSlotIds);
  const isBarrierBurstAffixCorroded = hasExplicitCorrosionSlots
    ? legendaryDraft.corrodedSlotIds.includes(FIREBIRD_BARRIER_BURST_AFFIX_SLOT_ID)
    : Boolean(build?.gearCorruptions?.[FIREBIRD_NECKLACE_ITEM_ID]);
  const skill = model?.external?.find(({ id }) => id === FIREBIRD_BARRIER_BURST_SKILL_ID)
    ?? FIREBIRD_BARRIER_BURST_SKILL;
  return {
    skill,
    level: isBarrierBurstAffixCorroded ? 25 : 20,
    sourceItemId: FIREBIRD_NECKLACE_ITEM_ID,
  };
}

function minimumUnlockedSupportCount(kind) {
  return kind === "passive" ? 0 : 1;
}

function emptySkillSlot(kind = "active") {
  return {
    skillId: null,
    level: DEFAULT_SKILL_LEVEL,
    unlockedSupportCount: minimumUnlockedSupportCount(kind),
    supports: Array(5).fill(null),
    sealedLife: 0,
    sealedMana: 0,
  };
}

export function createDefaultSkillState() {
  return {
    active: Array.from({ length: ACTIVE_SLOT_COUNT }, () => emptySkillSlot("active")),
    passive: Array.from({ length: PASSIVE_SLOT_COUNT }, () => emptySkillSlot("passive")),
    energyMax: 525,
    elixirs: [null, null],
  };
}

function clampLevel(value, maximum = MAX_SKILL_LEVEL) {
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) ? Math.max(1, Math.min(maximum, number)) : Math.min(DEFAULT_SKILL_LEVEL, maximum);
}

export function normalizeSupportRuntimeConfig(input, support = null) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  let effectRollOverrides = Object.fromEntries(Object.entries(input.effectRollOverrides ?? {}).flatMap(([key, value]) => {
    const normalizedKey = normalizedText(key);
    const number = Number(value);
    return normalizedKey && Number.isFinite(number) ? [[normalizedKey, number]] : [];
  }));
  if (support?.editorConfig?.kind === "exclusive_support") {
    const allowed = new Set(support.editorConfig.numeric_controls.flatMap((control) => (
      [control.storage_key, ...(control.override_keys ?? [])].filter(Boolean)
    )));
    effectRollOverrides = Object.fromEntries(Object.entries(effectRollOverrides).filter(([key]) => allowed.has(key)));
  }
  const specialTier = tierId(input.specialTier, EXCLUSIVE_SUPPORT_TIERS);
  const specialLevelNumber = Math.trunc(Number(input.specialLevel));
  const specialLevel = input.specialLevel === undefined || !Number.isFinite(specialLevelNumber)
    ? null
    : Math.max(1, Math.min(5, specialLevelNumber));
  const activationIntervalSeconds = Number(input.activationIntervalSeconds);
  const activationDistanceMeters = Number(input.activationDistanceMeters);
  const activationMediumTier = tierId(input.activationMediumTier);
  const activationMediumTierByClause = Object.fromEntries(Object.entries(input.activationMediumTierByClause ?? {}).flatMap(([key, value]) => {
    const normalizedKey = normalizedText(key);
    const normalizedTier = tierId(value);
    return normalizedKey && normalizedTier ? [[normalizedKey, normalizedTier]] : [];
  }));
  const config = {
    effectRollOverrides,
    ...(specialTier ? { specialTier } : {}),
    ...(specialLevel !== null ? { specialLevel } : {}),
    ...(Number.isFinite(activationIntervalSeconds) ? { activationIntervalSeconds } : {}),
    ...(Number.isFinite(activationDistanceMeters) ? { activationDistanceMeters } : {}),
    ...(activationMediumTier ? { activationMediumTier } : {}),
    ...(Object.keys(activationMediumTierByClause).length ? { activationMediumTierByClause } : {}),
  };
  return Object.keys(effectRollOverrides).length || Object.keys(config).length > 1 ? config : undefined;
}

export function createDefaultSupportRuntimeConfig(support) {
  if (support?.editorConfig?.kind !== "exclusive_support") return undefined;
  return { effectRollOverrides: {}, specialTier: "T0", specialLevel: 1 };
}

function supportRuntimeConfigForEditing(support, input) {
  return {
    ...(createDefaultSupportRuntimeConfig(support) ?? { effectRollOverrides: {} }),
    ...(normalizeSupportRuntimeConfig(input, support) ?? {}),
    effectRollOverrides: {
      ...(createDefaultSupportRuntimeConfig(support)?.effectRollOverrides ?? {}),
      ...(normalizeSupportRuntimeConfig(input, support)?.effectRollOverrides ?? {}),
    },
    ...(input?.activationMediumTierByClause ? {
      activationMediumTierByClause: { ...(normalizeSupportRuntimeConfig(input, support)?.activationMediumTierByClause ?? {}) },
    } : {}),
  };
}

function roundControlValue(control, value) {
  const step = Number(control?.step) || 0.1;
  const places = decimalPlaces(step);
  return Number(Number(value).toFixed(places));
}

function tierRange(control, tier, activation = false) {
  const ranges = activation
    ? control?.activation_medium_tier_range_presets
    : control?.tier_range_presets;
  const range = ranges?.[tier];
  if (!Array.isArray(range) || range.length < 2) return null;
  const first = Number(range[0]);
  const second = Number(range[1]);
  return Number.isFinite(first) && Number.isFinite(second)
    ? [Math.min(first, second), Math.max(first, second)]
    : null;
}

function setSupportControlValue(config, control, value) {
  const next = {
    ...config,
    effectRollOverrides: { ...(config.effectRollOverrides ?? {}) },
    ...(config.activationMediumTierByClause ? {
      activationMediumTierByClause: { ...config.activationMediumTierByClause },
    } : {}),
  };
  next.effectRollOverrides[control.storage_key] = roundControlValue(control, value);
  if (control.field_binding === "activationIntervalSeconds") next.activationIntervalSeconds = Number(value);
  if (control.field_binding === "activationDistanceMeters") next.activationDistanceMeters = Number(value);
  return next;
}

export function updateSupportRuntimeConfigTier(support, input, tier, effectId = null) {
  const editor = support?.editorConfig;
  if (!editor) return normalizeSupportRuntimeConfig(input, support);
  const allowed = effectId
    ? editor.clauses?.find((clause) => clause.effect_id === effectId)?.tier_options ?? []
    : editor.tier_options ?? [];
  const normalizedTier = tierId(tier, allowed);
  if (!normalizedTier) return normalizeSupportRuntimeConfig(input, support);
  let next = supportRuntimeConfigForEditing(support, input);
  if (editor.kind === "exclusive_support") next.specialTier = normalizedTier;
  else if (effectId) {
    next.activationMediumTierByClause = {
      ...(next.activationMediumTierByClause ?? {}),
      [effectId]: normalizedTier,
    };
  } else next.activationMediumTier = normalizedTier;
  const controls = editor.numeric_controls.filter((control) => !effectId || control.effect_id === effectId);
  for (const control of controls) {
    const range = tierRange(control, normalizedTier, editor.kind === "activation_medium");
    if (!range) continue;
    next = setSupportControlValue(next, control, (range[0] + range[1]) / 2);
  }
  return normalizeSupportRuntimeConfig(next, support);
}

export function updateSupportRuntimeConfigSpecialLevel(support, input, level) {
  if (support?.editorConfig?.kind !== "exclusive_support") return normalizeSupportRuntimeConfig(input, support);
  const next = supportRuntimeConfigForEditing(support, input);
  const number = Math.trunc(Number(level));
  next.specialLevel = Number.isFinite(number) ? Math.max(1, Math.min(5, number)) : 1;
  return normalizeSupportRuntimeConfig(next, support);
}

export function updateSupportRuntimeConfigRoll(support, input, storageKey, value) {
  const editor = support?.editorConfig;
  const control = editor?.numeric_controls?.find((candidate) => candidate.storage_key === storageKey);
  const number = Number(value);
  if (!control || !Number.isFinite(number)) return normalizeSupportRuntimeConfig(input, support);
  let next = supportRuntimeConfigForEditing(support, input);
  if (editor.kind === "exclusive_support") {
    const currentTier = next.specialTier ?? editor.default_tier;
    const currentRange = tierRange(control, currentTier, false);
    const matchedTier = editor.tier_options.find((candidate) => {
      const range = tierRange(control, candidate, false);
      return range && number >= range[0] && number <= range[1];
    });
    if (matchedTier && matchedTier !== currentTier) {
      next = updateSupportRuntimeConfigTier(support, next, matchedTier) ?? next;
      return normalizeSupportRuntimeConfig(next, support);
    }
    const range = currentRange ?? [control.min, control.max];
    next = setSupportControlValue(next, control, Math.max(range[0], Math.min(range[1], number)));
  } else {
    const effectId = control.effect_id;
    const selectedTier = next.activationMediumTierByClause?.[effectId]
      ?? next.activationMediumTier
      ?? editor.clauses?.find((clause) => clause.effect_id === effectId)?.tier_options?.[0]
      ?? editor.default_tier;
    const range = tierRange(control, selectedTier, true) ?? [control.min, control.max];
    next = setSupportControlValue(next, control, Math.max(range[0], Math.min(range[1], number)));
  }
  return normalizeSupportRuntimeConfig(next, support);
}

function normalizeSupportSlot(input, supportById) {
  if (!input || typeof input !== "object") return null;
  const support = supportById.get(input.supportId);
  if (!support) return null;
  const cloned = cloneJson(input);
  delete cloned.config;
  const config = normalizeSupportRuntimeConfig(input.config, support);
  return {
    ...cloned,
    supportId: support.id,
    level: clampLevel(input.level, support.maxLevel),
    ...(config ? { config } : {}),
  };
}

function normalizeUnlockedSupportCount(input, kind) {
  const minimum = minimumUnlockedSupportCount(kind);
  const supports = Array.isArray(input?.supports) ? input.supports : [];
  const inferred = supports.reduce((last, support, index) => support ? index + 1 : last, minimum);
  const requested = input?.unlockedSupportCount === undefined
    ? inferred
    : Math.trunc(Number(input.unlockedSupportCount));
  return Number.isFinite(requested) ? Math.max(minimum, Math.min(5, requested)) : inferred;
}

export function isModularizationSkill(record) {
  const sourceId = typeof record?.raw?.id === "string" ? record.raw.id : "";
  const sourceUrl = typeof record?.url === "string" ? record.url : "";
  return record?.role === "active"
    && sourceId.startsWith("modularization_skill_")
    && sourceUrl.includes("/Modularization_Skill");
}

export function getModularizationOptionRecords(model) {
  return (model?.supports?.modular ?? []).filter((record) => (
    typeof record?.raw?.id === "string" && Boolean(record.raw.id)
  ));
}

function normalizeModularizationConfig(input, skill, modularOptionIds) {
  if (!isModularizationSkill(skill)) return null;
  const moduleOptionIds = [];
  const seen = new Set();
  for (const sourceId of Array.isArray(input?.moduleOptionIds) ? input.moduleOptionIds : []) {
    const normalizedId = typeof sourceId === "string" ? sourceId.trim() : "";
    if (!normalizedId || seen.has(normalizedId) || !modularOptionIds.has(normalizedId)) continue;
    seen.add(normalizedId);
    moduleOptionIds.push(normalizedId);
    if (moduleOptionIds.length >= 3) break;
  }
  const summonCount = Number(input?.summonCount);
  const elementalProtocolDamageType = ["fire", "cold", "lightning"].includes(
    input?.elementalProtocolDamageType,
  ) ? input.elementalProtocolDamageType : null;
  return {
    modularizationSkillId: skill.raw.id,
    moduleOptionIds,
    ...(input?.summonCount !== undefined && Number.isFinite(summonCount)
      ? { summonCount: Math.max(0, summonCount) }
      : {}),
    ...(moduleOptionIds.includes("protocol_elemental") && elementalProtocolDamageType
      ? { elementalProtocolDamageType }
      : {}),
  };
}

function normalizeMainSlot(
  input,
  skillById,
  supportById,
  modularOptionIds,
  kind,
  externalSkill = null,
  compatibilityHostSkill = null,
) {
  const skill = skillById.get(input?.skillId);
  const staleExternalMain = input?.skillId === FIREBIRD_BARRIER_BURST_SKILL_ID && !externalSkill;
  const unlockedSupportCount = normalizeUnlockedSupportCount(input, kind);
  const supports = [];
  for (let index = 0; index < 5; index += 1) {
    if (staleExternalMain || index >= unlockedSupportCount) {
      supports.push(null);
      continue;
    }
    const normalized = normalizeSupportSlot(input?.supports?.[index], supportById);
    supports.push(normalized);
  }
  const hostSkill = compatibilityHostSkill ?? skill ?? externalSkill;
  if (hostSkill) {
    for (let pass = 0; pass < supports.length; pass += 1) {
      let changed = false;
      for (let index = 0; index < supports.length; index += 1) {
        const supportSlot = supports[index];
        const support = supportById.get(supportSlot?.supportId);
        if (!support) continue;
        const otherSupports = supports.flatMap((candidate, candidateIndex) => {
          if (candidateIndex === index) return [];
          const candidateSupport = supportById.get(candidate?.supportId);
          return candidateSupport ? [candidateSupport] : [];
        });
        const effectiveHost = getEffectiveSupportCompatibilityHostSkill(hostSkill, otherSupports);
        if (isSupportCompatible(effectiveHost, support, index + 1)) continue;
        supports[index] = null;
        changed = true;
      }
      if (!changed) break;
    }
  }
  const preservedExternalMainId = externalSkill && input?.skillId === FIREBIRD_BARRIER_BURST_SKILL_ID
    ? FIREBIRD_BARRIER_BURST_SKILL_ID
    : null;
  const modularization = normalizeModularizationConfig(input?.modularization, skill, modularOptionIds);
  return {
    skillId: skill?.id ?? preservedExternalMainId,
    level: skill ? clampLevel(input?.level) : DEFAULT_SKILL_LEVEL,
    unlockedSupportCount,
    supports,
    sealedLife: Math.max(0, Number(input?.sealedLife) || 0),
    sealedMana: Math.max(0, Number(input?.sealedMana) || 0),
    ...(modularization ? { modularization } : {}),
  };
}

function normalizeElixirSlot(input, bottle, elixir) {
  if (!input || input.bottleId !== bottle.id) return null;
  const skillIds = new Set(elixir.skills.map(({ id }) => id));
  const ingredientById = new Map(elixir.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const seen = new Set();
  const ingredientIds = [];
  for (const ingredientId of Array.isArray(input.ingredientIds) ? input.ingredientIds : []) {
    const ingredient = ingredientById.get(ingredientId);
    if (!ingredient || seen.has(ingredientId) || !ingredient.allowedBottleIds.includes(bottle.id)) continue;
    seen.add(ingredientId);
    ingredientIds.push(ingredientId);
    if (ingredientIds.length >= bottle.baseIngredientCapacity) break;
  }
  return {
    bottleId: bottle.id,
    skillId: skillIds.has(input.skillId) ? input.skillId : null,
    ingredientIds,
  };
}

const SHARED_SPIRIT_HOST_FIELDS = Object.freeze([
  "level",
  "unlockedSupportCount",
  "supports",
]);

function copySharedSpiritHostFields(target, source) {
  for (const field of SHARED_SPIRIT_HOST_FIELDS) target[field] = cloneJson(source[field]);
}

function synchronizeSharedSpiritHostRows(state, sourceRowIndex = null) {
  const active = Array.isArray(state?.active) ? state.active : [];
  const source = Number.isInteger(sourceRowIndex) ? active[sourceRowIndex] : null;
  if (source?.spiritHost?.shared === true && source.spiritHost.skillId) {
    for (const slot of active) {
      if (slot?.spiritHost?.shared === true
        && slot.spiritHost.skillId === source.spiritHost.skillId) {
        copySharedSpiritHostFields(slot, source);
      }
    }
    return state;
  }
  const canonicalByHostId = new Map();
  for (const slot of active) {
    const hostId = slot?.spiritHost?.shared === true ? slot.spiritHost.skillId : "";
    if (!hostId) continue;
    const canonical = canonicalByHostId.get(hostId);
    if (canonical) copySharedSpiritHostFields(slot, canonical);
    else canonicalByHostId.set(hostId, slot);
  }
  return state;
}

export function normalizeSkillState(model, input, options = {}) {
  const fallback = createDefaultSkillState();
  const heroIdentifier = options.heroIdentifier
    ?? options.build?.hero?.branchId
    ?? options.build?.selections?.hero?.[0]
    ?? "";
  const selectableActive = filterIrisSpiritActiveSkillRecords([
    ...(model.active ?? []),
    ...(model.irisSpiritActive ?? []),
  ], heroIdentifier);
  const activeById = new Map(selectableActive.map((skill) => [skill.id, skill]));
  const passiveById = new Map(model.passive.map((skill) => [skill.id, skill]));
  const supportById = new Map(model.allSupports.map((support) => [support.id, support]));
  const modularOptionIds = new Set(getModularizationOptionRecords(model).map((record) => record.raw.id));
  const state = {
    active: Array.from({ length: ACTIVE_SLOT_COUNT }, (_, index) => {
      const requestedSkill = activeById.get(input?.active?.[index]?.skillId);
      const selectableSkill = requestedSkill?.irisSpiritActive === true
        && getIrisSpiritHeroMode(heroIdentifier) !== "growing-breeze"
        ? null
        : requestedSkill;
      const spiritHost = getIrisSpiritHostSkillForActiveSkill(model, selectableSkill, heroIdentifier);
      const normalized = normalizeMainSlot(
        input?.active?.[index],
        new Map(selectableSkill ? [[selectableSkill.id, selectableSkill]] : []),
        supportById,
        modularOptionIds,
        "active",
        getExternalMainSkillOverride(model, options.build, "active", index)?.skill ?? null,
        spiritHost,
      );
      return spiritHost && normalized.skillId
        ? {
            ...normalized,
            spiritHost: {
              skillId: spiritHost.id,
              shared: getIrisSpiritHeroMode(heroIdentifier) === "vigilant-breeze",
            },
          }
        : normalized;
    }),
    passive: Array.from({ length: PASSIVE_SLOT_COUNT }, (_, index) =>
      normalizeMainSlot(
        input?.passive?.[index],
        passiveById,
        supportById,
        modularOptionIds,
        "passive",
      )),
    energyMax: Math.max(0, Number(input?.energyMax) || fallback.energyMax),
    elixirs: model.elixir.bottles.map((bottle, index) =>
      normalizeElixirSlot(input?.elixirs?.[index], bottle, model.elixir)),
  };
  return synchronizeSharedSpiritHostRows(state);
}

export function isSupportCompatible(skill, support, slotNumber) {
  if (!skill || !support) return false;
  if (skill.role === "support" || support.role !== "support") return false;
  const compatibility = support.supportCompatibility;
  if (!compatibility) return true;
  const tags = new Set(skill.compatibilityTags ?? []);
  const hostNames = uniqueText([
    normalizedText(skill.name),
    normalizedText(skill.nameEn),
    normalizedText(skill?.tlidbText?.en?.name),
  ]).flatMap((name) => (
    name.startsWith("精密 ") ? [name, name.slice(3)] : [name]
  ));
  const supportName = normalizedText(support.name);
  if (compatibility.hostRole === "active" && skill.role !== "active") return false;
  if (compatibility.hostRole === "passive" && skill.role !== "passive") return false;
  if (
    compatibility.specificHostSkillNames.length
    && !compatibility.specificHostSkillNames.some((name) => (
      hostNames.some((hostName) => normalizedText(name) === hostName)
    ))
  ) return false;
  if (
    typeof compatibility.requiredSupportSlot === "number"
    && compatibility.requiredSupportSlot > 0
    && Number(slotNumber) !== compatibility.requiredSupportSlot
  ) return false;
  if (compatibility.requiresDamage && !skill.hostCapabilities?.canDealDamage) return false;
  if (compatibility.requiresHit && !skill.hostCapabilities?.canHit) return false;
  if (compatibility.requiresAilmentOrDot && !skill.hostCapabilities?.canAilmentOrDot) return false;
  if (support.supportKind === "activation" && !skill.hostCapabilities?.canBeCatalyzed) return false;
  if (
    (supportName === "触媒: 律动" || supportName === "触媒: 指令")
    && tags.has("attack")
    && tags.has("movement")
  ) return false;
  if (tags.has("aura")) {
    const auraOrArea = new Set(["aura", "area"]);
    const requiresAura = compatibility.requiredTagGroups.some((group) => group.includes("aura"));
    const passiveSupport = compatibility.hostRole === "passive";
    const unrestricted = compatibility.requiredTagGroups.length === 0
      && compatibility.hostRole === "any"
      && !compatibility.requiresHit
      && !compatibility.requiresDamage
      && !compatibility.requiresAilmentOrDot;
    const onlyAuraOrArea = compatibility.requiredTagGroups.some((group) => (
      group.every((tag) => auraOrArea.has(tag))
    ));
    if (!requiresAura && !passiveSupport && !unrestricted && !onlyAuraOrArea) return false;
  }
  if (compatibility.excludedTags.some((tag) => tags.has(tag))) return false;
  if (supportName === "弹射") {
    if (!tags.has("chain") && !(tags.has("projectile") && tags.has("straight_shot"))) return false;
  } else if (
    compatibility.requiredTagGroups.length
    && !compatibility.requiredTagGroups.some((group) => group.every((tag) => tags.has(tag)))
  ) return false;
  return true;
}

export function getHostIndependentSupportRuntimeRecords(model) {
  const hosts = [
    ...(model?.active ?? []),
    ...(model?.passive ?? []),
    ...(model?.external ?? []),
  ];
  return (model?.allSupports ?? []).filter((support) => {
    const fieldCount = (support?.editorConfig?.clauses?.length ?? 0)
      + (support?.editorConfig?.numeric_controls?.length ?? 0);
    if (!fieldCount) return false;
    return !hosts.some((host) => (
      [1, 2, 3, 4, 5].some((slotNumber) => isSupportCompatible(host, support, slotNumber))
    ));
  });
}

export function getEffectiveSupportCompatibilityHostSkill(skill, equippedSupports = []) {
  if (!skill || skill.role === "support") return skill ?? null;
  const grantedTags = uniqueCanonicalTags(equippedSupports.flatMap((support) => (
    support?.role === "support" ? support.grantedHostCompatibilityTags ?? [] : []
  )));
  const removedTags = new Set(uniqueCanonicalTags(equippedSupports.flatMap((support) => (
    support?.role === "support" ? support.removedHostCompatibilityTags ?? [] : []
  ))));
  if (!grantedTags.length && !removedTags.size) return skill;
  const compatibilityTags = uniqueCanonicalTags([
    ...(skill.compatibilityTags ?? []),
    ...grantedTags,
  ]).filter((tag) => !removedTags.has(tag));
  return {
    ...skill,
    compatibilityTags,
    hostCapabilities: {
      ...skill.hostCapabilities,
      canHit: Boolean(skill.hostCapabilities?.canHit || grantedTags.includes("hit")) && !removedTags.has("hit"),
      canAilmentOrDot: Boolean(
        skill.hostCapabilities?.canAilmentOrDot || grantedTags.includes("ailment_or_dot")
      ) && !removedTags.has("ailment_or_dot"),
    },
  };
}

export function getSkillEnergyUsage(input) {
  const sourceRows = [
    ...(input?.active ?? []).map((slot) => ({ kind: "active", slot })),
    ...(input?.passive ?? []).map((slot) => ({ kind: "passive", slot })),
  ];
  const chargedSharedSpiritHosts = new Set();
  const rows = sourceRows.map(({ kind, slot }, rowIndex) => {
    const unlockedSupportCount = Math.max(0, Math.min(5, Math.trunc(Number(slot?.unlockedSupportCount) || 0)));
    const energyCosts = kind === "passive"
      ? PASSIVE_SUPPORT_SLOT_ENERGY_COSTS
      : SUPPORT_SLOT_ENERGY_COSTS;
    const sharedHostId = kind === "active" && slot?.spiritHost?.shared === true
      ? slot.spiritHost.skillId
      : "";
    const alreadyCharged = Boolean(sharedHostId && chargedSharedSpiritHosts.has(sharedHostId));
    if (sharedHostId && !alreadyCharged) chargedSharedSpiritHosts.add(sharedHostId);
    const supportCosts = energyCosts.map((cost, index) => (
      !alreadyCharged && index < unlockedSupportCount ? cost : 0
    ));
    return {
      rowIndex,
      kind,
      unlockedSupportCount,
      supportCosts,
      used: supportCosts.reduce((sum, cost) => sum + cost, 0),
    };
  });
  const used = rows.reduce((sum, row) => sum + row.used, 0);
  const maximum = Math.max(0, Number(input?.energyMax) || 0);
  return { maximum, used, remaining: maximum - used, over: Math.max(0, used - maximum), rows };
}

export function findSkillRuntimeRecord(model, skillId) {
  return [
    ...(model?.active ?? []),
    ...(model?.irisSpiritActive ?? []),
    ...(model?.passive ?? []),
    ...(model?.external ?? []),
  ]
    .find((skill) => skill.id === skillId) ?? null;
}

export function findSupportRuntimeRecord(model, supportId) {
  return model?.allSupports?.find((support) => support.id === supportId) ?? null;
}

function searchableValues(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap(searchableValues);
  if (typeof value === "object") return Object.values(value).flatMap(searchableValues);
  return [String(value)];
}

function matchesSearch(record, query) {
  const normalized = String(query ?? "").trim().toLowerCase();
  if (!normalized) return true;
  return [
    record.name,
    record.nameEn,
    resolveSkillRuntimeDescription(record, DEFAULT_SKILL_LEVEL),
    ...searchableValues(record.description),
    ...searchableValues(record.descriptionEn),
    ...record.tags,
    ...record.tagsCn,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function matchesTags(record, tags) {
  const selected = strings(tags);
  if (!selected.length) return true;
  const recordTags = new Set([...(record.tags ?? []), ...(record.tagsCn ?? [])].map((tag) => tag.toLowerCase()));
  return selected.every((tag) => recordTags.has(tag.toLowerCase()));
}

export function filterSkillRuntimeRecords(
  model,
  kind,
  { query = "", tags = [], heroIdentifier = "" } = {},
) {
  const records = kind === "passive"
    ? model?.passive ?? []
    : filterIrisSpiritActiveSkillRecords([
        ...(model?.active ?? []),
        ...(model?.irisSpiritActive ?? []),
      ], heroIdentifier);
  return records.filter((record) => matchesSearch(record, query) && matchesTags(record, tags));
}

export function getCompatibleSupportRuntimeRecords(
  model,
  skillId,
  slotNumber,
  {
    query = "",
    tags = [],
    kinds = [],
    equippedSupports = [],
    currentSupportIndex = null,
    heroIdentifier = "",
  } = {},
) {
  const skill = findSkillRuntimeRecord(model, skillId);
  const equippedSupportRecords = equippedSupports.flatMap((slot, index) => {
    if (index === currentSupportIndex) return [];
    const supportId = typeof slot === "string" ? slot : slot?.supportId;
    const support = findSupportRuntimeRecord(model, supportId);
    return support ? [support] : [];
  });
  const compatibilityHost = getIrisSpiritHostSkillForActiveSkill(model, skill, heroIdentifier) ?? skill;
  const effectiveSkill = getEffectiveSupportCompatibilityHostSkill(compatibilityHost, equippedSupportRecords);
  const allowedKinds = new Set(strings(kinds));
  return (model?.allSupports ?? []).filter((support) => (
    (!allowedKinds.size || allowedKinds.has(support.supportKind))
    && isSupportCompatible(effectiveSkill, support, slotNumber)
    && matchesSearch(support, query)
    && matchesTags(support, tags)
  ));
}

function skillCollectionKey(kind) {
  return kind === "passive" ? "passive" : "active";
}

export function updateMainSkill(model, input, kind, rowIndex, skillId, options = {}) {
  const state = normalizeSkillState(model, input, options);
  const collection = skillCollectionKey(kind);
  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= state[collection].length) return state;
  const current = state[collection][rowIndex];
  const heroIdentifier = options.heroIdentifier
    ?? options.build?.hero?.branchId
    ?? options.build?.selections?.hero?.[0]
    ?? "";
  const candidates = collection === "active"
    ? filterIrisSpiritActiveSkillRecords([
        ...(model.active ?? []),
        ...(model.irisSpiritActive ?? []),
      ], heroIdentifier)
    : model.passive ?? [];
  const skill = candidates.find((record) => record.id === skillId);
  if (skill?.id === current.skillId) return state;
  state[collection][rowIndex] = skill
    ? {
        ...current,
        skillId: skill.id,
        level: DEFAULT_SKILL_LEVEL,
        supports: Array(5).fill(null),
      }
    : {
        ...emptySkillSlot(collection),
        unlockedSupportCount: current.unlockedSupportCount,
      };
  return normalizeSkillState(model, state, options);
}

export function updateMainSkillLevel(model, input, kind, rowIndex, level, options = {}) {
  const state = normalizeSkillState(model, input, options);
  const collection = skillCollectionKey(kind);
  if (!state[collection]?.[rowIndex]?.skillId) return state;
  state[collection][rowIndex].level = clampLevel(level);
  return collection === "active" ? synchronizeSharedSpiritHostRows(state, rowIndex) : state;
}

export function updateMainSkillModularizationOption(
  model,
  input,
  kind,
  rowIndex,
  optionIndex,
  optionId,
  options = {},
) {
  const state = normalizeSkillState(model, input, options);
  const collection = skillCollectionKey(kind);
  const slot = state[collection]?.[rowIndex];
  const skill = model[collection]?.find((record) => record.id === slot?.skillId);
  if (!slot?.modularization
    || !isModularizationSkill(skill)
    || !Number.isInteger(optionIndex)
    || optionIndex < 0
    || optionIndex > 2) return state;
  const optionIds = [...slot.modularization.moduleOptionIds];
  while (optionIds.length <= optionIndex) optionIds.push("");
  optionIds[optionIndex] = typeof optionId === "string" ? optionId : "";
  slot.modularization = {
    ...slot.modularization,
    moduleOptionIds: optionIds,
  };
  return normalizeSkillState(model, state, options);
}

export function updateMainSkillModularizationSummonCount(
  model,
  input,
  kind,
  rowIndex,
  summonCount,
  options = {},
) {
  const state = normalizeSkillState(model, input, options);
  const collection = skillCollectionKey(kind);
  const slot = state[collection]?.[rowIndex];
  if (!slot?.modularization) return state;
  if (summonCount === "" || summonCount === null || summonCount === undefined) {
    delete slot.modularization.summonCount;
  } else {
    slot.modularization.summonCount = summonCount;
  }
  return normalizeSkillState(model, state, options);
}

export function updateMainSkillModularizationElementalDamageType(
  model,
  input,
  kind,
  rowIndex,
  damageType,
  options = {},
) {
  const state = normalizeSkillState(model, input, options);
  const collection = skillCollectionKey(kind);
  const slot = state[collection]?.[rowIndex];
  if (!slot?.modularization?.moduleOptionIds.includes("protocol_elemental")) return state;
  if (["fire", "cold", "lightning"].includes(damageType)) {
    slot.modularization.elementalProtocolDamageType = damageType;
  } else {
    delete slot.modularization.elementalProtocolDamageType;
  }
  return normalizeSkillState(model, state, options);
}

export function updateSkillSupport(
  model,
  input,
  kind,
  rowIndex,
  supportIndex,
  supportId,
  configInput = undefined,
  options = {},
) {
  const state = normalizeSkillState(model, input, options);
  const collection = skillCollectionKey(kind);
  const slot = state[collection]?.[rowIndex];
  const externalMain = getExternalMainSkillOverride(model, options.build, collection, rowIndex);
  if (!slot || !Number.isInteger(supportIndex) || supportIndex < 0 || supportIndex > 4) {
    return { status: "invalid", state };
  }
  if (!supportId) {
    slot.supports[supportIndex] = null;
    if (collection === "active") synchronizeSharedSpiritHostRows(state, rowIndex);
    return { status: "removed", state };
  }
  if (!slot.skillId && !externalMain) return { status: "invalid", state };
  if (supportIndex >= slot.unlockedSupportCount) return { status: "locked", state };
  const selectedSkill = externalMain?.skill ?? findSkillRuntimeRecord(model, slot.skillId);
  const skill = getIrisSpiritHostSkillForActiveSkill(model, selectedSkill, options.heroIdentifier) ?? selectedSkill;
  const support = findSupportRuntimeRecord(model, supportId);
  const equippedSupportRecords = slot.supports.flatMap((supportSlot, index) => {
    if (index === supportIndex) return [];
    const equippedSupport = findSupportRuntimeRecord(model, supportSlot?.supportId);
    return equippedSupport ? [equippedSupport] : [];
  });
  const effectiveSkill = getEffectiveSupportCompatibilityHostSkill(skill, equippedSupportRecords);
  if (!support || !isSupportCompatible(effectiveSkill, support, supportIndex + 1)) {
    return { status: "incompatible", state };
  }

  const previousSupports = cloneJson(slot.supports);
  slot.supports = slot.supports.map((supportSlot, index) => (
    index !== supportIndex && supportSlot?.supportId === support.id ? null : supportSlot
  ));
  const config = normalizeSupportRuntimeConfig(
    configInput ?? createDefaultSupportRuntimeConfig(support),
    support,
  );
  slot.supports[supportIndex] = {
    supportId: support.id,
    level: Math.min(DEFAULT_SKILL_LEVEL, support.maxLevel),
    ...(config ? { config } : {}),
  };
  if (collection === "active") synchronizeSharedSpiritHostRows(state, rowIndex);
  const usage = getSkillEnergyUsage(state);
  if (usage.over > 0) {
    slot.supports = previousSupports;
    if (collection === "active") synchronizeSharedSpiritHostRows(state, rowIndex);
    return { status: "energy-limit", state };
  }
  return { status: "updated", state: normalizeSkillState(model, state, options) };
}

export function updateUnlockedSupportCount(model, input, kind, rowIndex, unlockedSupportCount, options = {}) {
  const state = normalizeSkillState(model, input, options);
  const collection = skillCollectionKey(kind);
  const slot = state[collection]?.[rowIndex];
  if (!slot) return { status: "invalid", state };
  const minimum = minimumUnlockedSupportCount(collection);
  const requested = Math.trunc(Number(unlockedSupportCount));
  if (!Number.isFinite(requested) || requested < minimum || requested > 5) {
    return { status: "limit", state };
  }
  if (requested === slot.unlockedSupportCount) return { status: "unchanged", state };
  const previousCount = slot.unlockedSupportCount;
  slot.unlockedSupportCount = requested;
  if (requested < previousCount) {
    for (let index = requested; index < slot.supports.length; index += 1) slot.supports[index] = null;
  }
  if (collection === "active") synchronizeSharedSpiritHostRows(state, rowIndex);
  if (getSkillEnergyUsage(state).over > 0) {
    slot.unlockedSupportCount = previousCount;
    if (collection === "active") synchronizeSharedSpiritHostRows(state, rowIndex);
    return { status: "energy-limit", state: normalizeSkillState(model, state, options) };
  }
  return { status: "updated", state: normalizeSkillState(model, state, options) };
}

export function updateSkillSupportLevel(model, input, kind, rowIndex, supportIndex, level, options = {}) {
  const state = normalizeSkillState(model, input, options);
  const collection = skillCollectionKey(kind);
  const supportSlot = state[collection]?.[rowIndex]?.supports?.[supportIndex];
  if (!supportSlot) return state;
  const support = findSupportRuntimeRecord(model, supportSlot.supportId);
  supportSlot.level = clampLevel(level, support?.maxLevel ?? MAX_SKILL_LEVEL);
  if (collection === "active") synchronizeSharedSpiritHostRows(state, rowIndex);
  return normalizeSkillState(model, state, options);
}

export function updateSkillSupportConfig(model, input, kind, rowIndex, supportIndex, configInput, options = {}) {
  const state = normalizeSkillState(model, input, options);
  const collection = skillCollectionKey(kind);
  const supportSlot = state[collection]?.[rowIndex]?.supports?.[supportIndex];
  if (!supportSlot) return state;
  const support = findSupportRuntimeRecord(model, supportSlot.supportId);
  const config = normalizeSupportRuntimeConfig(configInput, support);
  if (config) supportSlot.config = config;
  else delete supportSlot.config;
  if (collection === "active") synchronizeSharedSpiritHostRows(state, rowIndex);
  return normalizeSkillState(model, state, options);
}

function descriptionValuesAtLevel(description, level) {
  const rows = Array.isArray(description?.by_level) ? description.by_level : [];
  if (!rows.length) return null;
  const normalizedLevel = clampLevel(level);
  const exact = rows.find((row) => Number(row?.level) === normalizedLevel);
  if (exact?.values && typeof exact.values === "object") return exact.values;
  const fallback = rows
    .filter((row) => Number.isFinite(Number(row?.level)) && Number(row.level) <= normalizedLevel)
    .sort((left, right) => Number(right.level) - Number(left.level))[0] ?? rows.at(-1);
  return fallback?.values && typeof fallback.values === "object" ? fallback.values : null;
}

export function resolveSkillRuntimeDescription(record, level = DEFAULT_SKILL_LEVEL) {
  const description = record?.description;
  if (typeof description === "string") return normalizedText(description);
  const template = normalizedText(description?.template);
  const values = descriptionValuesAtLevel(description, level);
  if (template && values) {
    let unresolved = false;
    const resolved = template.replace(/\{([a-zA-Z0-9_]+)\}/g, (token, key) => {
      const value = values[key];
      if (value === undefined || value === null || value === "") {
        unresolved = true;
        return token;
      }
      return String(value);
    });
    if (!unresolved) return normalizedText(resolved);
  }
  return normalizedText(description?.summary ?? template);
}

export function getSkillSealUsage(model, input) {
  const state = normalizeSkillState(model, input);
  const passiveById = new Map(model.passive.map((skill) => [skill.id, skill]));
  const sealedManaPercent = state.passive.reduce(
    (total, slot) => total + (passiveById.get(slot.skillId)?.sealedManaPercent ?? 0),
    0,
  );
  const sealedLifePercent = state.passive.reduce(
    (total, slot) => total + (Number(passiveById.get(slot.skillId)?.raw?.sealed_life_pct) || 0),
    0,
  );
  return { sealedLifePercent, sealedManaPercent };
}
