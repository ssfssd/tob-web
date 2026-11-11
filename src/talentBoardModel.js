import { resolveCurrentSs13TalentValueAuthority } from "./ss13TalentValueAuthority.js";

function cloneJson(value, fallback) {
  if (value === undefined) return fallback;
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export const TALENT_SUBTREE_SLUGS_BY_GOD = Object.freeze({
  God_of_Might: Object.freeze(["The_Brave", "Onslaughter", "Warlord", "Warrior"]),
  Goddess_of_Hunting: Object.freeze(["Marksman", "Bladerunner", "Druid", "Assassin"]),
  Goddess_of_Knowledge: Object.freeze(["Magister", "Arcanist", "Elementalist", "Prophet"]),
  God_of_War: Object.freeze(["Shadowdancer", "Ronin", "Ranger", "Sentinel"]),
  Goddess_of_Deception: Object.freeze(["Shadowmaster", "Psychic", "Warlock", "Lich"]),
  God_of_Machines: Object.freeze(["Machinist", "Steel_Vanguard", "Alchemist", "Artisan"]),
});

export const TALENT_CALCULATION_REFERENCE = Object.freeze({
  appVersion: "Beta 1.1.0",
  sourceRole: "structural-reference",
  structuralReferenceVersion: "SS13.2",
  valueAuthority: false,
  bundleUrl: "https://91tob.com/assets/App-BfJTsflU.js",
  runtimePath: Object.freeze(["Zg", "k8", "a5", "ZX"]),
});

const MUTATION_TEXT = "异化核心天赋不再将原天赋替换，为当前天赋板核心天赋附加：";
const MUTATION_PENALTIES = new Set(["-8% 防御值", "-5% 元素抗性", "-15 全属性"]);

// 91TOB App-BfJTsflU.js의 M$e 별칭 표. 프리즘 전용 핵심은 일반 coreTalents에 없어서
// 원본이 계산 요청에 넣는 raw_text/parser_text를 그대로 보존한다.
const PRISM_CORE_TALENT_ALIASES = Object.freeze({
  一荣俱荣: [{ rawText: "获得 50% 火焰抗性的冰冷与闪电抗性" }],
  不动如山: [{
    rawText: "每隔 10 秒，获得等同于护甲值 2% 的防护，吸收 100% 受到的非真实伤害，再次获得时刷新防护值 最大生命值固定为 100 你的闪避值和最大护盾恒定为 0",
    parserText: "不动如山",
  }],
  所向披靡: [{
    rawText: "连携技能的终结技处于连续攻击状态时，必定造成相当于最大连续攻击计数的伤害",
    parserText: "所向披靡",
  }],
  动若脱兔: [{
    rawText: "离开静止状态时，获得 1 层增益，增益持续 2 秒，上限 5 层 每层增益额外 +14% 对近处敌人造成的伤害，+8% 攻击速度",
    parserText: "动若脱兔",
  }],
  风卷残云: [
    { rawText: "核心远程直射投射物技能击中时，有 100% 几率额外释放核心技能，额外释放的技能投射物环形发射，且额外 -60% 伤害，该效果有 0.03 秒间隔。无法对哨卫、坠落和引导技能生效。" },
    { rawText: "投射物数量上限为 5" },
    { rawText: "+2 直射投射物穿透次数" },
  ],
  神机妙算: [{
    rawText: "根据装备的不同法术技能的数量，获得各种不同的增益效果：每装备一个激发技能，额外 +13% 法术伤害（叠乘） 每装备一个诅咒技能， +6% 元素和腐蚀抗性穿透， +6% 护甲减伤穿透 每装备一个防护技能，额外 +13% 最大魔力（叠乘） 每装备一个位移技能，额外 +13% 施法速度（叠乘）",
    parserText: "神机妙算",
  }],
  盛气凌人: [{
    rawText: "附加 主手武器 伤害的 100% 至法术 附加 主手武器 暴击值的 75% 至法术技能基础暴击值 额外 -99% 异常伤害",
    parserText: "盛气凌人",
  }],
  推波助澜: [{
    rawText: "法术技能击中时，有 50% 几率生成一道脉冲，造成 150% 击中伤害的真实伤害，该效果有 0.03 秒间隔",
    parserText: "推波助澜",
  }],
  势不可挡: [{
    rawText: "暴击时，使敌人降低 10% 护甲、2% 元素抗性和腐蚀抗性，持续 8 秒，最多叠加 10 层",
    parserText: "势不可挡",
  }],
  刚柔并济: [
    { rawText: "如果最近未被击中，+40% 受伤缓冲" },
    { rawText: "被击中时，该效果继续生效 4 秒" },
    { rawText: "如果最近被击中，每 0.5 秒获得 1 层 偏斜" },
  ],
  万夫之勇: [{ rawText: "固定拥有 130 点战意值", parserText: "+30 战意上限" }],
  自欺欺人: [
    { rawText: "敌人每拥有一种控制类状态，额外 +12% 对其造成的腐蚀伤害" },
    { rawText: "施加的控制类状态反射自身" },
  ],
  变本加厉: [{
    rawText: "每点加剧值效果替换为：额外 +0.1% - +4% 受到的持续伤害，且现在每隔 1 秒刷新一次，受到伤害幸运加成，对最大伤害加成与额外加成的 70% 同样作用于持续伤害，额外 -20% 击中伤害",
    parserText: "变本加厉",
  }],
  三军夺帅: [{
    rawText: "额外 -100% 坚韧祝福、灵动祝福、聚能祝福效果 获得任意祝福时，周围 10 米内的召唤物也获得对应祝福 召唤物的祝福上限等同于你的祝福上限的两倍",
    parserText: "三军夺帅",
  }],
  生生不息: [
    { rawText: "每隔 1 秒，获得等同于距离自身最近的魔灵 80% 的生长值，且生长值获得与统御值相同的回归速度" },
    { rawText: "每拥有 10 点生长值，魔灵额外 +1% 伤害", parserText: "每拥有 10 点棱镜生长值，魔灵额外 +1% 伤害" },
    { rawText: "每拥有 10 点生长值，自身额外 +0.1% 体型" },
    { rawText: "每拥有 10 点生长值，自身额外 +0.5% 技能范围", parserText: "每拥有 10 点棱镜生长值，自身额外 +0.5% 技能范围" },
  ],
  妙手回春: [
    { rawText: "释放回复技能时，触发妙手偶得" },
    { rawText: "回复技能每秒获得 1 充能进度" },
  ],
  兵临城下: [{
    rawText: "释放黑暗之门时，向指定方向位移一段距离 黑暗之门 +3 充能点数上限 黑暗之门额外 +50% 冷却回复速度 如果最近释放过黑暗之门，额外 +30% 召唤物伤害",
    parserText: "兵临城下",
  }],
  运筹帷幄: [{ rawText: "+1000 最大能量值" }],
  摧枯拉朽: [
    {
      rawText: "攻击或者法术击败敌人时 25% 几率爆炸，对半径 5 米内的敌人造成被击败的敌人最大生命 250% 的真实伤害",
      parserText: "攻击或者法术击败敌人时25%几率爆炸，对半径5米内的敌人造成被击败的敌人最大生命250%的真实伤害",
    },
    { rawText: "额外 +30% 对劲敌造成的伤害", parserText: "对劲敌，额外+30%伤害" },
  ],
  叱咤风云: [
    { rawText: "每释放一个不同的战吼，额外 +35% 攻击伤害，持续 8 秒", parserText: "叱咤风云" },
    { rawText: "额外 -100% 激发技能与防护技能效果" },
  ],
  引火上身: [{
    rawText: "施加 烧灼 代替 点燃 周围 10 米内的敌人每有 1 层 烧灼，-10% 火焰抗性",
    parserText: "引火上身",
  }],
  异想天开: [
    { rawText: "每拥有 +1% 超过 100% 的 点燃 几率，额外 +3% 点燃 伤害，最多额外 +150%" },
    { rawText: "每拥有 +1% 超过 100% 的 凋零 几率，额外 +3% 凋零 伤害，最多额外 +150%" },
    { rawText: "每拥有 +1% 超过 100% 的 创伤 几率，额外 +3% 创伤 伤害，最多额外 +150%" },
  ],
});

const FIXED_INTERVAL_PATTERNS = [
  /(\d+(?:\.\d+)?)\s*秒\s*(?:冷却|间隔)/g,
  /(?:冷却|间隔)\s*(?:时间|为)?\s*(\d+(?:\.\d+)?)\s*秒/g,
  /每隔\s*(\d+(?:\.\d+)?)\s*秒/g,
];
const GOD_EFFECT_CAP_PATTERN = /[（(]\s*神格生效上限[:：]\s*\d+(?:\.\d+)?\s*[)）]/g;
const INTEGER_SCALING_PATTERNS = [
  /^([+-]?\d+(?:\.\d+)?)\s*(冰冷|火焰|闪电|攻击|法术|持续|物理|腐蚀|被动|主动|全部|贯注|智械|召唤召唤物|魔灵)\s*技能等级(?:\s*[（(].*)?$/u,
  /^([+-]?\d+(?:\.\d+)?)\s*(聚能祝福|灵动祝福|坚韧祝福)层数上限(?:\s*[（(].*)?$/u,
  /^([+-]?\d+(?:\.\d+)?)\s*(引导层数上限|幻影数量|弹射次数|抛射投射物分裂数量|直射投射物穿透次数|智械召唤物数量上限|充能点数上限|魔灵最大数量上限|一次能够放置的哨卫数量)(?:\s*[（(].*)?$/u,
  /^法术迸发上限\s*([+-]?\d+(?:\.\d+)?)(?:\s*[（(].*)?$/u,
];

function roundAwayFromZero(value) {
  if (Math.abs(value) <= 1e-12) return 0;
  const sign = value > 0 ? 1 : -1;
  const absolute = Math.abs(value);
  return sign * (Math.trunc(absolute) + (absolute - Math.trunc(absolute) >= 0.5 - 1e-12 ? 1 : 0));
}

function shouldIntegerScale(text) {
  return INTEGER_SCALING_PATTERNS.some((pattern) => pattern.test(text));
}

export function scaleTalentEffectText(text, factor) {
  const source = String(text ?? "").trim();
  const multiplier = Number.isFinite(Number(factor)) ? Number(factor) : 1;
  if (!source || Math.abs(multiplier - 1) <= 1e-12) return source;

  if (shouldIntegerScale(source)) {
    const match = source.match(/([+-]?)(\d+(?:\.\d+)?)/);
    if (match) {
      const value = Number.parseFloat(`${match[1] ?? ""}${match[2] ?? ""}`);
      if (Number.isFinite(value)) {
        const scaled = roundAwayFromZero(value * multiplier);
        return source.replace(/([+-]?)(\d+(?:\.\d+)?)/, `${scaled >= 0 ? "+" : "-"}${Math.abs(scaled)}`);
      }
    }
  }

  const fixedIntervals = [];
  const effectCaps = [];
  const thresholds = [];
  for (const pattern of FIXED_INTERVAL_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      if (match.index !== undefined) fixedIntervals.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  for (const match of source.matchAll(GOD_EFFECT_CAP_PATTERN)) {
    if (match.index !== undefined) effectCaps.push({ start: match.index, end: match.index + match[0].length });
  }
  for (const match of source.matchAll(/(每(?:有|拥有|获得)?\s*[+\-]?\d+(?:\.\d+)?\s*(?:层|点|个|米|秒)?[^，,\n]*[，,])/g)) {
    if (match.index !== undefined) thresholds.push({ start: match.index, end: match.index + match[0].length });
  }
  const inRange = (ranges, index) => ranges.some((range) => range.start <= index && index < range.end);

  return source.replace(/([+-]?)(\d+(?:\.\d+)?)/g, (full, sign, digits, offset) => {
    if (inRange(fixedIntervals, offset) || inRange(effectCaps, offset) || inRange(thresholds, offset)) return full;
    const value = Number.parseFloat(String(digits ?? ""));
    if (!Number.isFinite(value)) return full;
    const scaled = value * multiplier;
    let formatted;
    if (String(digits).includes(".")) {
      formatted = scaled.toFixed(String(digits).split(".", 2)[1]?.length ?? 0);
    } else if (Math.abs(scaled - Math.round(scaled)) <= 1e-9) {
      formatted = String(Math.round(scaled));
    } else {
      formatted = scaled.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    }
    return `${String(sign ?? "")}${formatted}`;
  });
}

function boardSlotId(boardIndex) {
  return `tree${boardIndex + 1}`;
}

function coordinateKey(position) {
  return `${position.x}:${position.y}`;
}

function samePosition(left, right) {
  return Boolean(left && right && left.x === right.x && left.y === right.y);
}

function positionsAround(position) {
  const result = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      const x = position.x + dx;
      const y = position.y + dy;
      if (x >= 0 && x < 7 && y >= 0 && y < 5) result.push({ x, y });
    }
  }
  return result;
}

function reflectedPosition(position) {
  return { x: 6 - position.x, y: 4 - position.y };
}

function talentItemMaps(talentItems) {
  const byId = new Map();
  const byStableId = new Map();
  const treeBySlug = new Map();
  for (const item of talentItems ?? []) {
    if (item?.id) byId.set(item.id, item);
    for (const stableId of talentStableIds(item)) byStableId.set(stableId, item);
    if (item?.talentTree?.slug) treeBySlug.set(item.talentTree.slug, item);
  }
  return { byId, byStableId, treeBySlug };
}

function talentStableIds(item) {
  const ids = [];
  for (const locale of ["ko", "en", "cn"]) {
    const record = item?.tlidbText?.[locale];
    ids.push(...(record?.sourceDataIds
      ?? (record?.sourceDataId == null ? [] : [record.sourceDataId])));
  }
  return [...new Set(ids.map(String).filter(Boolean))];
}

function currentKoreanTalentAuthority(item) {
  const ko = item?.tlidbText?.ko;
  if (
    ko?.sourceSeasonEvidence?.sourcePageVersion !== "SS13"
    || ko?.sourceFieldStatus?.name !== "exact"
    || ko?.sourceFieldStatus?.detail !== "exact"
    || typeof ko?.name !== "string"
    || !ko.name
    || typeof ko?.detail !== "string"
    || !ko.detail
    || typeof ko?.sourceUrl !== "string"
    || !ko.sourceUrl
  ) return null;
  return {
    flatItemId: item.id,
    name: ko.name,
    detail: ko.detail,
    sourceUrl: ko.sourceUrl,
  };
}

function sourceTreeSlug(item) {
  if (item?.talentPosition?.treeSlug) return item.talentPosition.treeSlug;
  try {
    const url = new URL(String(item?.sourceUrl ?? ""));
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");
  } catch {
    return "";
  }
}

function sourceItemsWithoutRuntimeTopology(talentItems, runtimeStableIds) {
  const seenStableIds = new Set();
  return (talentItems ?? []).filter((item) => {
    if (item?.talentTree || item?.talentPosition) return false;
    const ids = talentStableIds(item);
    if (!ids.length || ids.some((id) => runtimeStableIds.has(id))) return false;
    if (ids.some((id) => seenStableIds.has(id))) return false;
    ids.forEach((id) => seenStableIds.add(id));
    return true;
  }).map((item) => ({
    ...cloneJson(item, {}),
    flatItemId: item.id,
    stableIds: talentStableIds(item),
    treeSlug: sourceTreeSlug(item),
  }));
}

function emptyBoard(slotIndex) {
  return {
    boardId: null,
    slotType: slotIndex === 0 ? "base" : "sub",
    treeSlug: null,
    nodePoints: {},
    reflectedNodePoints: {},
    selectedNodeIds: [],
    coreTalentIds: [],
  };
}

export function createTalentBoardState() {
  return {
    boards: Array.from({ length: 4 }, (_, index) => emptyBoard(index)),
    prismInventory: [],
    inverseImageInventory: [],
    placedPrism: null,
    placedInverseImage: null,
  };
}

function normalizePlacement(source, kind) {
  if (!isPlainObject(source)) return null;
  const instanceId = String(source.instanceId ?? source[`${kind}Id`] ?? "").trim();
  const boardIndex = Number(source.boardIndex ?? (
    typeof source.treeSlotId === "string" ? Number(source.treeSlotId.replace("tree", "")) - 1 : NaN
  ));
  const nodeId = String(source.nodeId ?? "").trim();
  const x = Number(source.x ?? source.position?.x);
  const y = Number(source.y ?? source.position?.y);
  if (!instanceId || !Number.isInteger(boardIndex) || boardIndex < 0 || boardIndex > 3) return null;
  if (!Number.isInteger(x) || x < 0 || x > 6 || !Number.isInteger(y) || y < 0 || y > 4) return null;
  return { instanceId, boardIndex, nodeId: nodeId || null, x, y };
}

function migrateBoardPlacement(boards, field, kind) {
  for (const [boardIndex, board] of boards.entries()) {
    const slot = Array.isArray(board?.[field]) ? board[field][0] : null;
    if (!slot) continue;
    return normalizePlacement({ ...slot, boardIndex }, kind);
  }
  return null;
}

export function normalizeTalentBoardState(_model, input) {
  if (!isPlainObject(input)) return createTalentBoardState();
  const source = cloneJson(input, {});
  const boards = Array.from({ length: 4 }, (_, index) => {
    const board = isPlainObject(source.boards?.[index]) ? source.boards[index] : {};
    const normalized = {
      ...emptyBoard(index),
      ...board,
      slotType: index === 0 ? "base" : "sub",
      treeSlug: typeof board.treeSlug === "string" && board.treeSlug ? board.treeSlug : null,
      nodePoints: isPlainObject(board.nodePoints) ? board.nodePoints : {},
      reflectedNodePoints: isPlainObject(board.reflectedNodePoints) ? board.reflectedNodePoints : {},
      selectedNodeIds: Array.isArray(board.selectedNodeIds) ? board.selectedNodeIds : [],
      coreTalentIds: Array.isArray(board.coreTalentIds) ? board.coreTalentIds : [],
    };
    delete normalized.prismSlots;
    delete normalized.inverseImageSlots;
    return normalized;
  });
  const placedPrism = normalizePlacement(source.placedPrism, "prism")
    ?? migrateBoardPlacement(source.boards ?? [], "prismSlots", "prism");
  const placedInverseImage = normalizePlacement(source.placedInverseImage, "inverseImage")
    ?? migrateBoardPlacement(source.boards ?? [], "inverseImageSlots", "inverseImage");
  return {
    ...source,
    boards,
    prismInventory: Array.isArray(source.prismInventory) ? source.prismInventory : [],
    inverseImageInventory: Array.isArray(source.inverseImageInventory) ? source.inverseImageInventory : [],
    placedPrism,
    placedInverseImage,
  };
}

export function createTalentBoardModel(dataset, options = {}) {
  const sourceTrees = Array.isArray(dataset?.trees) ? dataset.trees : [];
  const sourceCoreTalents = Array.isArray(dataset?.coreTalents) ? dataset.coreTalents : [];
  const hasFlatAuthority = Array.isArray(options.talentItems) && options.talentItems.length > 0;
  const {
    byId: flatItemById,
    byStableId: flatItemByStableId,
    treeBySlug: flatTreeBySlug,
  } = talentItemMaps(options.talentItems);

  const trees = sourceTrees.map((sourceTree) => {
    let nodes = (sourceTree.nodes ?? []).map((sourceNode) => {
      const stableId = String(sourceNode.dataId);
      const flatItem = flatItemByStableId.get(stableId)
        ?? flatItemById.get(`talents-${stableId}`)
        ?? null;
      const authority = currentKoreanTalentAuthority(flatItem);
      const calculationValueAuthority = resolveCurrentSs13TalentValueAuthority(flatItem);
      return {
        ...cloneJson(sourceNode, {}),
        id: stableId,
        treeSlug: sourceTree.slug,
        flatItemId: authority?.flatItemId ?? null,
        calculationValueAuthority,
        ...(authority ? {
          name: authority.name,
          rawAffix: authority.detail,
          sourceUrl: authority.sourceUrl,
        } : {}),
      };
    }).filter((node) => !hasFlatAuthority || node.flatItemId);
    const nodeByCoordinate = new Map(nodes.map((node) => [`${node.x}:${node.y}`, node]));
    nodes = nodes.map((node) => {
      const prerequisite = node.prerequisite
        ? nodeByCoordinate.get(`${node.prerequisite.x}:${node.prerequisite.y}`)
        : null;
      return {
        ...node,
        prerequisite: prerequisite ? node.prerequisite : null,
        prerequisiteNodeId: prerequisite?.flatItemId ?? null,
      };
    });
    const coreTalents = sourceCoreTalents
      .filter((core) => core.treeSlug === sourceTree.slug)
      .map((core) => {
        const stableId = String(core.dataId);
        const flatItem = flatItemByStableId.get(stableId)
          ?? flatItemById.get(`talents-${stableId}`)
          ?? null;
        const authority = currentKoreanTalentAuthority(flatItem);
        return {
          ...cloneJson(core, {}),
          id: stableId,
          flatItemId: authority?.flatItemId ?? null,
          structuralReferenceName: core.name,
          ...(authority ? {
            name: authority.name,
            effect: authority.detail,
            sourceUrl: authority.sourceUrl,
          } : {}),
        };
      })
      .filter((core) => !hasFlatAuthority || core.flatItemId);
    return {
      ...cloneJson(sourceTree, {}),
      flatItemId: flatTreeBySlug.get(sourceTree.slug)?.id ?? null,
      nodes,
      coreTalents,
    };
  });

  const nodes = trees.flatMap((tree) => tree.nodes);
  const coreTalents = trees.flatMap((tree) => tree.coreTalents);
  const runtimeStableIds = new Set([
    ...nodes.map(({ id }) => String(id)),
    ...coreTalents.map(({ id }) => String(id)),
  ]);
  const sourceOnlyTalentItems = sourceItemsWithoutRuntimeTopology(
    options.talentItems,
    runtimeStableIds,
  );
  const prismItems = cloneJson(dataset?.prisms?.items, []);
  const prismAffixes = [
    ...(dataset?.prisms?.baseAffixes ?? []),
    ...(dataset?.prisms?.areaAffixes ?? []),
    ...(dataset?.prisms?.rareGaugeAffixes ?? []),
    ...(dataset?.prisms?.legendaryGaugeAffixes ?? []),
    ...(dataset?.prisms?.mutationAffixes ?? []),
  ].map((affix) => cloneJson(affix, {}));
  const baseAffixes = cloneJson(dataset?.prisms?.baseAffixes, []);
  const areaAffixes = cloneJson(dataset?.prisms?.areaAffixes, []);
  const rareGaugeAffixes = cloneJson(dataset?.prisms?.rareGaugeAffixes, []);
  const prismLegacyRareDisplayMappings = cloneJson(
    dataset?.prisms?.prismLegacyRareDisplayMappings,
    [],
  );
  const legendaryGaugeAffixes = cloneJson(dataset?.prisms?.legendaryGaugeAffixes, []);
  const mutationAffixes = cloneJson(dataset?.prisms?.mutationAffixes, []);
  return {
    seasonLabel: dataset?.seasonLabel ?? "",
    catalogVersion: dataset?.catalogVersion ?? "",
    trees,
    nodes,
    coreTalents,
    prerequisiteCount: nodes.filter((node) => node.prerequisite).length,
    treeBySlug: new Map(trees.map((tree) => [tree.slug, tree])),
    nodeById: new Map(nodes.map((node) => [node.id, node])),
    nodeByFlatItemId: new Map(nodes.map((node) => [node.flatItemId, node])),
    coreTalentById: new Map(coreTalents.map((core) => [core.id, core])),
    coreTalentByFlatItemId: new Map(coreTalents.map((core) => [core.flatItemId, core])),
    sourceOnlyTalentItems,
    prismItems,
    prismItemBySlug: new Map(prismItems.map((item) => [item.slug, item])),
    prismAffixes,
    prismAffixById: new Map(prismAffixes.map((affix) => [affix.modifierId, affix])),
    baseAffixes,
    areaAffixes,
    rareGaugeAffixes,
    prismLegacyRareDisplayMappings,
    rareBaseModifierIdByDisplayId: new Map(
      prismLegacyRareDisplayMappings.map((mapping) => [mapping.displayModifierId, mapping.baseModifierId]),
    ),
    legendaryGaugeAffixes,
    mutationAffixes,
    prismCoreTalentAliases: cloneJson(PRISM_CORE_TALENT_ALIASES, {}),
    prisms: cloneJson(dataset?.prisms, {}),
  };
}

export function getAvailableTalentTrees(model, input, boardIndex) {
  const state = normalizeTalentBoardState(model, input);
  const board = state.boards?.[boardIndex];
  if (!board) return [];
  const used = new Set(state.boards
    .filter((_, index) => index !== boardIndex)
    .map((candidate) => candidate.treeSlug)
    .filter(Boolean));
  if (boardIndex === 0) {
    return model.trees.filter((tree) => (
      tree.kind === "god" && tree.isSupported !== false && !used.has(tree.slug)
    ));
  }
  if (boardIndex === 1) {
    const allowed = new Set(TALENT_SUBTREE_SLUGS_BY_GOD[state.boards[0]?.treeSlug] ?? []);
    return model.trees.filter((tree) => (
      tree.kind === "profession" && tree.isSupported !== false && allowed.has(tree.slug) && !used.has(tree.slug)
    ));
  }
  return model.trees.filter((tree) => (
    tree.kind === "profession" && tree.isSupported !== false && !used.has(tree.slug)
  ));
}

export function getTalentCoreUnlockRequirement(boardIndex, groupIndex = 0) {
  return boardIndex === 0 && groupIndex === 0 ? 12 : 24;
}

export function getTalentCoreGroups(model, input, boardIndex) {
  const state = normalizeTalentBoardState(model, input);
  const tree = model?.treeBySlug?.get(state.boards?.[boardIndex]?.treeSlug);
  if (!tree) return [];
  return boardIndex === 0
    ? [tree.coreTalents.slice(0, 3), tree.coreTalents.slice(3, 6)]
    : [tree.coreTalents];
}

export function getTalentTreeGrid(model, treeSlug) {
  const tree = model?.treeBySlug?.get(treeSlug);
  const nodeByCoordinate = new Map((tree?.nodes ?? []).map((node) => [`${node.x}:${node.y}`, node]));
  return {
    width: 7,
    height: 5,
    cells: Array.from({ length: 35 }, (_, index) => {
      const x = index % 7;
      const y = Math.floor(index / 7);
      return { x, y, node: nodeByCoordinate.get(`${x}:${y}`) ?? null };
    }),
  };
}

function inventoryInstanceId(item) {
  return String(item?.instanceId ?? item?.id ?? "").trim();
}

function placementPosition(placement) {
  return placement ? { x: placement.x, y: placement.y } : null;
}

function placementOnBoard(state, field, boardIndex) {
  const placement = state?.[field];
  return placement?.boardIndex === boardIndex ? placement : null;
}

function prismAreaPositions(model, state, boardIndex) {
  const placement = placementOnBoard(state, "placedPrism", boardIndex);
  if (!placement) return [];
  const prism = state.prismInventory.find((item) => inventoryInstanceId(item) === placement.instanceId);
  const area = model.prismAffixById.get(prism?.areaAffixModifierId);
  if (!area || !Number.isInteger(area.w) || !Number.isInteger(area.h)) return [placementPosition(placement)];
  const result = [];
  for (let row = 0; row < area.h; row += 1) {
    for (let column = 0; column < area.w; column += 1) {
      const x = placement.x - Number(area.anchorCol ?? 0) + column;
      const y = placement.y - Number(area.anchorRow ?? 0) + row;
      if (x >= 0 && x < 7 && y >= 0 && y < 5) result.push({ x, y });
    }
  }
  return result;
}

function prismDefinition(model, prism) {
  if (!prism) return null;
  return model?.prismItemBySlug?.get(prism.prismItemSlug)
    ?? model?.prismItems?.find((item) => item.baseAffixModifierId === prism.baseAffixModifierId)
    ?? null;
}

function prismBaseAffix(model, prism) {
  const definition = prismDefinition(model, prism);
  const modifierId = prism?.baseAffixModifierId || definition?.baseAffixModifierId;
  return model?.prismAffixById?.get(modifierId) ?? null;
}

function prismRareAffix(model, prism) {
  const modifierId = model?.rareBaseModifierIdByDisplayId?.get(prism?.rareRandomAffixModifierId)
    ?? prism?.rareRandomAffixModifierId;
  return model?.prismAffixById?.get(modifierId) ?? null;
}

function prismLegendaryAffix(model, prism) {
  return model?.prismAffixById?.get(prism?.legendaryRandomAffixModifierId) ?? null;
}

function parsePrismBonusAffix(text) {
  const match = String(text ?? "").trim()
    .match(/^范围内的所有(小型|中型|传奇中型)天赋还获得[:：]\s*(.+)$/u);
  if (!match) return null;
  const targetNodeType = match[1] === "小型" ? "micro" : match[1] === "中型" ? "medium" : "legendary";
  const bonusText = String(match[2] ?? "").trim();
  return bonusText ? { targetNodeType, bonusText } : null;
}

function parsePrismExtraPointsAffix(text) {
  const match = String(text ?? "").trim()
    .match(/^范围内的所有(小型|中型)天赋可额外加点\s*(\d+)\s*次$/u);
  if (!match) return null;
  const extraPoints = Number.parseInt(String(match[2] ?? "0"), 10);
  if (!Number.isFinite(extraPoints) || extraPoints <= 0) return null;
  return { targetNodeType: match[1] === "小型" ? "micro" : "medium", extraPoints };
}

function parsePrismIgnorePrerequisiteAffix(text) {
  return String(text ?? "").trim().includes("范围内的所有传奇中型天赋可无视前置点数要求")
    ? { targetNodeType: "legendary" }
    : null;
}

function parsePrismAreaActivationAffix(text) {
  const match = String(text ?? "").trim()
    .match(/^范围内激活\s*(\d+)\s*个传奇中型天赋时[，,]\s*(.+)$/u);
  if (!match) return null;
  const requiredCount = Number.parseInt(String(match[1] ?? "0"), 10);
  const effectText = String(match[2] ?? "").trim();
  if (!Number.isFinite(requiredCount) || requiredCount <= 0 || !effectText) return null;
  return { requiredCount, effectText };
}

function parsePrismMutationAffix(text) {
  const lines = String(text ?? "").trim().split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  let addedCoreTalentName = "";
  const penaltyLines = [];
  for (const line of lines) {
    const match = line.match(/^异化核心天赋不再将原天赋替换，为当前天赋板核心天赋附加[:：]\s*(.+)$/u);
    if (match) addedCoreTalentName = String(match[1] ?? "").trim();
    else penaltyLines.push(line);
  }
  return addedCoreTalentName ? { penaltyLines, addedCoreTalentName } : null;
}

function prismRandomEffectFactor(model, prism) {
  const base = prismBaseAffix(model, prism);
  if (base?.kind !== "random_affix_effect_boost") return 1;
  const match = String(base.text ?? "").match(/([+-]?\d+(?:\.\d+)?)\s*%/u);
  if (!match) return 1.75;
  const value = Number.parseFloat(String(match[1] ?? "75"));
  return Number.isFinite(value) ? Math.max(0, 1 + value / 100) : 1.75;
}

function prismRuntimeModifiers(model, prism) {
  const legendary = prismLegendaryAffix(model, prism);
  return {
    bonusAffix: parsePrismBonusAffix(prismRareAffix(model, prism)?.text),
    extraPointsAffix: parsePrismExtraPointsAffix(legendary?.text),
    ignorePrerequisiteAffix: parsePrismIgnorePrerequisiteAffix(legendary?.text),
    areaActivationAffix: parsePrismAreaActivationAffix(legendary?.text),
    mutationAffix: prism?.rarity === "legendary" ? parsePrismMutationAffix(legendary?.text) : null,
    randomEffectFactor: prismRandomEffectFactor(model, prism),
    baseAffix: prismBaseAffix(model, prism),
    legendaryAffix: legendary,
  };
}

function prismNodeModifiers(model, state, boardIndex, node, isReflected) {
  if (isReflected) return { extraPoints: 0, ignoresPrerequisite: false };
  const placement = placementOnBoard(state, "placedPrism", boardIndex);
  if (!placement) return { extraPoints: 0, ignoresPrerequisite: false };
  const inArea = prismAreaPositions(model, state, boardIndex).some((position) => samePosition(position, node));
  if (!inArea) return { extraPoints: 0, ignoresPrerequisite: false };
  const prism = state.prismInventory.find((item) => inventoryInstanceId(item) === placement.instanceId);
  const modifiers = prismRuntimeModifiers(model, prism);
  return {
    extraPoints: modifiers.extraPointsAffix?.targetNodeType === node.nodeType
      ? modifiers.extraPointsAffix.extraPoints
      : 0,
    ignoresPrerequisite: modifiers.ignorePrerequisiteAffix?.targetNodeType === node.nodeType,
  };
}

function reflectedStorageKey(position) {
  return `reflected:${position.x}:${position.y}`;
}

function inverseImageEffect(inverseImage, nodeType) {
  if (nodeType === "micro") return Number(inverseImage?.microTalentEffect ?? 0);
  if (nodeType === "medium") return Number(inverseImage?.mediumTalentEffect ?? 0);
  return Number(inverseImage?.legendaryTalentEffect ?? 0);
}

export function getTalentBoardRuntime(model, input, boardIndex) {
  const state = normalizeTalentBoardState(model, input);
  const board = state.boards?.[boardIndex];
  const tree = model?.treeBySlug?.get(board?.treeSlug);
  if (!board || !tree) {
    return { state, board, tree: null, nodes: [], totalPoints: 0, placedPrism: null, placedInverseImage: null };
  }
  const placedPrism = placementOnBoard(state, "placedPrism", boardIndex);
  const placedInverseImage = placementOnBoard(state, "placedInverseImage", boardIndex);
  const inverseImage = placedInverseImage
    ? state.inverseImageInventory.find((item) => inventoryInstanceId(item) === placedInverseImage.instanceId)
    : null;
  const prismArea = prismAreaPositions(model, state, boardIndex);
  const prismAreaKeys = new Set(prismArea.map(coordinateKey));
  const targetArea = placedInverseImage
    ? positionsAround(reflectedPosition(placementPosition(placedInverseImage)))
    : [];
  const targetKeys = new Set(targetArea.map(coordinateKey));
  const realNodes = tree.nodes
    .filter((node) => !targetKeys.has(coordinateKey(node)))
    .map((node) => {
      const modifiers = prismNodeModifiers(model, state, boardIndex, node, false);
      return {
        ...node,
        runtimeNodeId: node.flatItemId,
        storageNodeId: node.flatItemId,
        points: Number(
          board.nodePoints?.[node.flatItemId]
          ?? (board.selectedNodeIds?.includes(node.flatItemId) ? 1 : 0),
        ),
        baseMaxPoints: node.maxPoints,
        maxPoints: node.maxPoints + modifiers.extraPoints,
        isReflected: false,
        ignoresPrerequisiteFromPrism: modifiers.ignoresPrerequisite,
        hasPlacedPrism: samePosition(node, placedPrism),
        hasPlacedInverseImage: samePosition(node, placedInverseImage),
        isInPrismArea: prismAreaKeys.has(coordinateKey(node)),
        inverseImageEffect: null,
      };
    });
  const reflectedNodes = [];
  if (placedInverseImage && inverseImage) {
    const sourceKeys = new Set(positionsAround(placementPosition(placedInverseImage)).map(coordinateKey));
    for (const sourceNode of tree.nodes.filter((node) => sourceKeys.has(coordinateKey(node)))) {
      const position = reflectedPosition(sourceNode);
      const storageNodeId = reflectedStorageKey(position);
      reflectedNodes.push({
        ...sourceNode,
        x: position.x,
        y: position.y,
        prerequisite: null,
        prerequisiteNodeId: null,
        runtimeNodeId: storageNodeId,
        storageNodeId,
        sourceFlatItemId: sourceNode.flatItemId,
        points: Number(board.reflectedNodePoints?.[storageNodeId] ?? 0),
        baseMaxPoints: sourceNode.maxPoints,
        maxPoints: sourceNode.maxPoints,
        isReflected: true,
        reflectedSource: { x: sourceNode.x, y: sourceNode.y },
        ignoresPrerequisiteFromPrism: false,
        hasPlacedPrism: false,
        hasPlacedInverseImage: false,
        isInPrismArea: prismAreaKeys.has(coordinateKey(position)),
        inverseImageEffect: inverseImageEffect(inverseImage, sourceNode.nodeType),
      });
    }
  }
  const nodes = [...realNodes, ...reflectedNodes].sort((left, right) => (
    left.x - right.x || left.y - right.y || Number(left.isReflected) - Number(right.isReflected)
  ));
  const selectedCoreTalents = (board.coreTalentIds ?? []).map((coreTalentId) => (
    model?.coreTalentByFlatItemId?.get(coreTalentId) ?? model?.coreTalentById?.get(coreTalentId)
  )).filter((core) => core?.treeSlug === tree.slug);
  return {
    state,
    board,
    tree,
    nodes,
    totalPoints: nodes.reduce((total, node) => total + node.points, 0),
    placedPrism,
    placedInverseImage,
    prismArea,
    selectedCoreTalents,
  };
}

export function getTalentBoardNodeGrid(model, input, boardIndex) {
  const runtime = getTalentBoardRuntime(model, input, boardIndex);
  const nodeByCoordinate = new Map(runtime.nodes.map((node) => [coordinateKey(node), node]));
  return {
    ...runtime,
    width: 7,
    height: 5,
    cells: Array.from({ length: 35 }, (_, index) => {
      const x = index % 7;
      const y = Math.floor(index / 7);
      return { x, y, node: nodeByCoordinate.get(`${x}:${y}`) ?? null };
    }),
  };
}

export function deriveTalentFlatItemIds(model, input) {
  return projectTalentBoardCalculation(model, input).selectionIds;
}

function coordinateLabel(position) {
  return `${position.x},${position.y}`;
}

function talentNodeEffectMultiplier(node) {
  if (!node.isReflected && node.points <= 0) return 1;
  if (!node.isReflected) return node.points;
  const inverseMultiplier = Math.max(0, 1 + Number(node.inverseImageEffect ?? 0) / 100);
  return (node.points > 0 ? node.points : 1) * inverseMultiplier;
}

function entryKeyPart(value) {
  return String(value ?? "unknown").trim().replace(/\s+/g, "-");
}

function appendProjectedText(entries, input) {
  const rawLines = String(input.rawText ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
  const parserLines = String(input.parserText ?? input.rawText ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const [lineIndex, rawText] of rawLines.entries()) {
    const parserText = parserLines[lineIndex] ?? parserLines[0] ?? rawText;
    const idKey = input.sourceItemId
      ?? input.metadata?.talent_node_key
      ?? input.metadata?.talent_core_name
      ?? input.sourceModifierId
      ?? lineIndex;
    const sequence = entries.length;
    const metadata = cloneJson(input.metadata, {});
    const scaledText = scaleTalentEffectText(rawText, input.multiplier);
    const authorityStats = input.calculationValueAuthority?.lineStats?.[rawText] ?? null;
    const calculationStats = authorityStats
      ? Object.fromEntries(Object.entries(authorityStats).map(([key, value]) => (
          [key, Number(value) * Number(input.multiplier)]
        )))
      : null;
    const compactText = (value) => String(value ?? "").trim().replace(/ /g, "").replace(/　/g, "");
    entries.push({
      id: `talent:board:${input.boardIndex}:${input.origin}:${entryKeyPart(idKey)}:${lineIndex}:${sequence}`,
      boardIndex: input.boardIndex,
      origin: input.origin,
      sourceItemId: input.sourceItemId ?? null,
      sourceModifierId: input.sourceModifierId ?? null,
      sourceUrl: input.sourceUrl ?? "",
      sourceLabel: input.sourceLabel ?? rawText,
      rawText,
      parserText,
      multiplier: input.multiplier,
      scaledText,
      calculationValueAuthority: authorityStats
        ? input.calculationValueAuthority.authorityId
        : null,
      calculationStats,
      calculationAuthorityReason: authorityStats
        ? null
        : input.calculationAuthorityReason ?? "talent-effect-semantic-model-unavailable",
      metadata,
      requestEntry: {
        raw_text: compactText(scaledText),
        parser_text: compactText(parserText),
        ...(Object.keys(metadata).length ? { metadata } : {}),
      },
    });
  }
}

function appendCoreTalentEntries(model, entries, input) {
  const talentName = String(input.talentName ?? "").trim();
  if (!talentName) return;
  const core = model?.coreTalents?.find((candidate) => (
    candidate.name === talentName || candidate.structuralReferenceName === talentName
  ));
  if (core) {
    appendProjectedText(entries, {
      ...input,
      sourceItemId: input.sourceItemId ?? core.flatItemId,
      sourceUrl: input.sourceUrl ?? core.sourceUrl,
      sourceLabel: core.name,
      rawText: core.effect,
      parserText: core.effect,
    });
    return;
  }
  for (const alias of PRISM_CORE_TALENT_ALIASES[talentName] ?? []) {
    appendProjectedText(entries, {
      ...input,
      sourceLabel: input.sourceLabel ?? talentName,
      rawText: alias.rawText,
      parserText: alias.parserText ?? alias.rawText,
    });
  }
}

function validTalentPlacement(state, runtime, field, inventoryField) {
  const placement = runtime?.[field];
  if (!placement || placement.boardIndex === 0) return false;
  if (!(state?.[inventoryField] ?? []).some((item) => (
    inventoryInstanceId(item) === placement.instanceId
  ))) return false;
  if (
    field === "placedPrism"
    && state.placedInverseImage?.boardIndex === placement.boardIndex
  ) return false;
  if (
    field === "placedInverseImage"
    && state.placedPrism?.boardIndex === placement.boardIndex
  ) return false;

  const node = runtime.tree?.nodes.find((candidate) => samePosition(candidate, placement));
  if (!node) return false;
  if (field === "placedPrism") {
    return Number(runtime.board?.nodePoints?.[node.flatItemId] ?? 0) <= 0;
  }
  return node.y === 0 || node.y === 4 || node.x <= 1 || node.x >= 5;
}

function hasNestedTalentAllocation(model, state) {
  return (state.boards ?? []).some((_, boardIndex) => {
    const runtime = getTalentBoardRuntime(model, state, boardIndex);
    if (!runtime.tree) return false;
    const validInversePlacement = validTalentPlacement(
      state,
      runtime,
      "placedInverseImage",
      "inverseImageInventory",
    );
    return runtime.nodes.some((node) => (
      Number(node.points ?? 0) > 0 && (!node.isReflected || validInversePlacement)
    ))
      || runtime.selectedCoreTalents.length > 0
      || validTalentPlacement(state, runtime, "placedPrism", "prismInventory")
      || validInversePlacement;
  });
}

export function projectTalentBoardCalculation(model, input) {
  const state = normalizeTalentBoardState(model, input);
  const entries = [];
  const rules = [];
  const selectionIds = [];

  for (let boardIndex = 0; boardIndex < state.boards.length; boardIndex += 1) {
    const runtime = getTalentBoardRuntime(model, state, boardIndex);
    if (!runtime.tree) continue;
    const board = state.boards[boardIndex];
    const treeSlug = runtime.tree.slug ?? "";
    const treeName = runtime.tree.name ?? "";
    const placedPrismItem = runtime.placedPrism
      ? state.prismInventory.find((item) => inventoryInstanceId(item) === runtime.placedPrism.instanceId)
      : null;
    const prismModifiers = prismRuntimeModifiers(model, placedPrismItem);
    let activeLegendaryNodesInArea = 0;

    for (const node of runtime.nodes) {
      const points = Number(node.points ?? 0);
      if (!node.isReflected && node.isInPrismArea) {
        if (prismModifiers.extraPointsAffix?.targetNodeType === node.nodeType) {
          rules.push({
            id: `talent:board:${boardIndex}:prism_extra_points:${node.flatItemId}`,
            boardIndex,
            origin: "prism_extra_points",
            sourceModifierId: prismModifiers.legendaryAffix?.modifierId ?? null,
            sourceUrl: prismModifiers.legendaryAffix?.sourceUrl ?? "",
            nodeItemId: node.flatItemId,
            nodeType: node.nodeType,
            extraPoints: prismModifiers.extraPointsAffix.extraPoints,
          });
        }
        if (prismModifiers.ignorePrerequisiteAffix?.targetNodeType === node.nodeType) {
          rules.push({
            id: `talent:board:${boardIndex}:prism_ignore_prerequisite:${node.flatItemId}`,
            boardIndex,
            origin: "prism_ignore_prerequisite",
            sourceModifierId: prismModifiers.legendaryAffix?.modifierId ?? null,
            sourceUrl: prismModifiers.legendaryAffix?.sourceUrl ?? "",
            nodeItemId: node.flatItemId,
            nodeType: node.nodeType,
          });
        }
      }
      if (points <= 0) continue;

      const sourceItemId = node.isReflected ? node.sourceFlatItemId : node.flatItemId;
      const selectedPointCount = Math.max(0, Math.trunc(points));
      for (let pointIndex = 0; pointIndex < selectedPointCount; pointIndex += 1) {
        if (sourceItemId) selectionIds.push(sourceItemId);
      }
      const sourceCoordinate = node.isReflected && node.reflectedSource
        ? coordinateLabel(node.reflectedSource)
        : coordinateLabel(node);
      const metadata = {
        talent_node_type: node.nodeType,
        talent_node_key: sourceCoordinate,
        talent_tree_slug: treeSlug,
        talent_tree_name: treeName,
        talent_entry_origin: node.isReflected ? "inverse_image_reflection" : "regular_node",
      };
      if (node.isReflected) metadata.talent_reflected_target_key = coordinateLabel(node);
      appendProjectedText(entries, {
        boardIndex,
        origin: metadata.talent_entry_origin,
        sourceItemId,
        sourceUrl: node.sourceUrl,
        sourceLabel: node.name,
        rawText: node.rawAffix,
        parserText: node.rawAffix,
        metadata,
        multiplier: talentNodeEffectMultiplier(node),
        calculationValueAuthority: (
          !node.isReflected && points <= Number(node.baseMaxPoints ?? node.maxPoints)
        ) ? node.calculationValueAuthority : null,
        calculationAuthorityReason: node.isReflected
          ? "talent-structural-transform-value-authority-unverified"
          : points > Number(node.baseMaxPoints ?? node.maxPoints)
            ? "talent-prism-extra-point-value-authority-unverified"
            : "talent-effect-semantic-model-unavailable",
      });

      if (
        prismModifiers.bonusAffix
        && node.isInPrismArea
        && node.nodeType === prismModifiers.bonusAffix.targetNodeType
      ) {
        appendProjectedText(entries, {
          boardIndex,
          origin: "prism_bonus_affix",
          sourceModifierId: prismRareAffix(model, placedPrismItem)?.modifierId,
          sourceUrl: prismRareAffix(model, placedPrismItem)?.sourceUrl,
          sourceLabel: prismModifiers.bonusAffix.bonusText,
          rawText: prismModifiers.bonusAffix.bonusText,
          parserText: prismModifiers.bonusAffix.bonusText,
          metadata: {
            talent_node_type: node.nodeType,
            talent_node_key: sourceCoordinate,
            talent_tree_slug: treeSlug,
            talent_tree_name: treeName,
            talent_entry_origin: "prism_bonus_affix",
          },
          multiplier: Math.max(0, points * prismModifiers.randomEffectFactor),
          calculationAuthorityReason: "talent-prism-value-authority-unverified",
        });
      }
      if (node.isInPrismArea && node.nodeType === "legendary") activeLegendaryNodesInArea += 1;
    }
    for (const nodeId of board.selectedNodeIds ?? []) {
      if (!model?.nodeByFlatItemId?.has(nodeId) && !model?.nodeById?.has(nodeId)) selectionIds.push(nodeId);
    }

    const hasSelectedCore = runtime.selectedCoreTalents.length > 0;
    const mutation = prismModifiers.mutationAffix;
    const replacesSelectedCore = Boolean(
      hasSelectedCore
      && prismModifiers.baseAffix?.kind === "replacement_core_talent"
      && prismModifiers.baseAffix.replacementCoreTalentName
      && !mutation?.addedCoreTalentName,
    );
    for (const core of runtime.selectedCoreTalents) {
      if (core.flatItemId) selectionIds.push(core.flatItemId);
      if (replacesSelectedCore) continue;
      appendCoreTalentEntries(model, entries, {
        boardIndex,
        origin: "selected_core_talent",
        talentName: core.name,
        sourceItemId: core.flatItemId,
        sourceUrl: core.sourceUrl,
        sourceLabel: core.name,
        multiplier: 1,
        calculationAuthorityReason: "talent-core-effect-semantic-model-unavailable",
        metadata: {
          talent_node_type: "core",
          talent_core_data_id: core.dataId,
          talent_core_name: core.name,
          talent_tree_slug: treeSlug,
          talent_tree_name: treeName,
          talent_entry_origin: "selected_core_talent",
        },
      });
    }
    for (const coreTalentId of board.coreTalentIds ?? []) {
      if (!model?.coreTalentByFlatItemId?.has(coreTalentId) && !model?.coreTalentById?.has(coreTalentId)) {
        selectionIds.push(coreTalentId);
      }
    }

    if (
      hasSelectedCore
      && prismModifiers.baseAffix?.kind === "additional_effect"
      && prismModifiers.baseAffix.additionalEffectText
    ) {
      appendProjectedText(entries, {
        boardIndex,
        origin: "prism_base_additional_effect",
        sourceModifierId: prismModifiers.baseAffix.modifierId,
        sourceUrl: prismModifiers.baseAffix.sourceUrl,
        sourceLabel: prismModifiers.baseAffix.label,
        rawText: prismModifiers.baseAffix.additionalEffectText,
        parserText: prismModifiers.baseAffix.additionalEffectText,
        multiplier: 1,
        calculationAuthorityReason: "talent-prism-value-authority-unverified",
        metadata: {
          talent_node_type: "core",
          talent_tree_slug: treeSlug,
          talent_tree_name: treeName,
          talent_entry_origin: "prism_base_additional_effect",
        },
      });
    }
    if (replacesSelectedCore) {
      appendCoreTalentEntries(model, entries, {
        boardIndex,
        origin: "prism_base_replacement_core",
        talentName: prismModifiers.baseAffix.replacementCoreTalentName,
        sourceModifierId: prismModifiers.baseAffix.modifierId,
        sourceUrl: prismModifiers.baseAffix.sourceUrl,
        multiplier: 1,
        calculationAuthorityReason: "talent-prism-value-authority-unverified",
        metadata: {
          talent_node_type: "core",
          talent_core_name: prismModifiers.baseAffix.replacementCoreTalentName,
          talent_tree_slug: treeSlug,
          talent_tree_name: treeName,
          talent_entry_origin: "prism_base_replacement_core",
        },
      });
    }

    if (
      placedPrismItem?.rarity === "legendary"
      && prismModifiers.areaActivationAffix
      && activeLegendaryNodesInArea >= prismModifiers.areaActivationAffix.requiredCount
    ) {
      const definition = prismDefinition(model, placedPrismItem);
      appendProjectedText(entries, {
        boardIndex,
        origin: "prism_legendary_area_activation",
        sourceModifierId: prismModifiers.legendaryAffix?.modifierId,
        sourceUrl: prismModifiers.legendaryAffix?.sourceUrl,
        sourceLabel: prismModifiers.legendaryAffix?.label,
        rawText: prismModifiers.areaActivationAffix.effectText,
        parserText: prismModifiers.areaActivationAffix.effectText,
        multiplier: 1,
        calculationAuthorityReason: "talent-prism-value-authority-unverified",
        metadata: {
          talent_node_type: "legendary",
          talent_tree_slug: treeSlug,
          talent_tree_name: treeName,
          talent_entry_origin: "prism_legendary_area_activation",
          prism_item_slug: placedPrismItem.prismItemSlug || definition?.slug || "",
          prism_item_name: placedPrismItem.prismItemName || definition?.name || placedPrismItem.name || "",
        },
      });
    }

    if (hasSelectedCore && mutation) {
      for (const penaltyLine of mutation.penaltyLines) {
        appendProjectedText(entries, {
          boardIndex,
          origin: "prism_mutation_penalty",
          sourceModifierId: prismModifiers.legendaryAffix?.modifierId,
          sourceUrl: prismModifiers.legendaryAffix?.sourceUrl,
          sourceLabel: penaltyLine,
          rawText: penaltyLine,
          parserText: penaltyLine,
          multiplier: prismModifiers.randomEffectFactor,
          calculationAuthorityReason: "talent-prism-value-authority-unverified",
          metadata: {
            talent_node_type: "core",
            talent_tree_slug: treeSlug,
            talent_tree_name: treeName,
            talent_entry_origin: "prism_mutation_penalty",
          },
        });
      }
      appendCoreTalentEntries(model, entries, {
        boardIndex,
        origin: "prism_mutation_added_core",
        talentName: mutation.addedCoreTalentName,
        sourceModifierId: prismModifiers.legendaryAffix?.modifierId,
        sourceUrl: prismModifiers.legendaryAffix?.sourceUrl,
        sourceLabel: mutation.addedCoreTalentName,
        multiplier: prismModifiers.randomEffectFactor,
        calculationAuthorityReason: "talent-prism-value-authority-unverified",
        metadata: {
          talent_node_type: "core",
          talent_core_name: mutation.addedCoreTalentName,
          talent_tree_slug: treeSlug,
          talent_tree_name: treeName,
          talent_entry_origin: "prism_mutation_added_core",
        },
      });
    }
  }

  return {
    reference: TALENT_CALCULATION_REFERENCE,
    active: hasNestedTalentAllocation(model, state),
    entries,
    rules,
    selectionIds,
  };
}

function boardRuntimeNode(model, state, boardIndex, nodeId) {
  const runtime = getTalentBoardRuntime(model, state, boardIndex);
  const node = runtime.nodes.find((candidate) => (
    candidate.runtimeNodeId === nodeId
    || (!candidate.isReflected && candidate.id === nodeId)
  ));
  return node ? { runtime, board: state.boards?.[boardIndex], node } : {};
}

function synchronizeSelectedNodes(board) {
  board.selectedNodeIds = Object.entries(board.nodePoints ?? {})
    .filter(([, points]) => Number(points) > 0)
    .map(([nodeId]) => nodeId);
}

function previousColumnsUnlocked(runtime, targetX, nodes = runtime.nodes) {
  const requiredPoints = targetX * 3;
  const allocated = nodes
    .filter((node) => node.x < targetX)
    .reduce((total, node) => total + Number(node.points ?? 0), 0);
  return allocated >= requiredPoints;
}

function prerequisiteIsBypassed(runtime, node) {
  if (!node.prerequisite || node.isReflected || node.ignoresPrerequisiteFromPrism) return true;
  if (runtime.placedPrism && samePosition(runtime.placedPrism, node.prerequisite)) return true;
  if (!runtime.placedInverseImage) return false;
  const targetArea = positionsAround(reflectedPosition(placementPosition(runtime.placedInverseImage)));
  return samePosition(runtime.placedInverseImage, node.prerequisite)
    || targetArea.some((position) => samePosition(position, node.prerequisite));
}

function prerequisiteSatisfied(runtime, node, nodes = runtime.nodes) {
  if (prerequisiteIsBypassed(runtime, node)) return true;
  const prerequisite = nodes.find((candidate) => (
    !candidate.isReflected && samePosition(candidate, node.prerequisite)
  ));
  return Boolean(prerequisite) && prerequisite.points >= prerequisite.baseMaxPoints;
}

function withRuntimePoint(nodes, runtimeNodeId, nextPoints) {
  return nodes.map((node) => node.runtimeNodeId === runtimeNodeId ? { ...node, points: nextPoints } : node);
}

function pruneLockedCoreTalents(model, state, boardIndex) {
  const board = state.boards[boardIndex];
  const groups = getTalentCoreGroups(model, state, boardIndex);
  const totalPoints = getTalentBoardRuntime(model, state, boardIndex).totalPoints;
  const allowedIds = new Set();
  for (const [groupIndex, group] of groups.entries()) {
    if (totalPoints < getTalentCoreUnlockRequirement(boardIndex, groupIndex)) continue;
    for (const core of group) allowedIds.add(core.flatItemId);
  }
  board.coreTalentIds = (board.coreTalentIds ?? []).filter((id) => allowedIds.has(id));
}

export function addTalentNodePoint(model, input, boardIndex, nodeId) {
  const state = normalizeTalentBoardState(model, input);
  const { runtime, board, node } = boardRuntimeNode(model, state, boardIndex, nodeId);
  if (!board || !node) return { status: "invalid-node", state };
  const pointMap = node.isReflected ? board.reflectedNodePoints : board.nodePoints;
  const current = Number(pointMap?.[node.storageNodeId] ?? 0);
  if (current >= node.maxPoints) return { status: "max-points", state };
  if (node.hasPlacedPrism) return { status: "occupied-by-prism", state };
  if (node.hasPlacedInverseImage) return { status: "occupied-by-inverse-image", state };
  if (!previousColumnsUnlocked(runtime, node.x)) return { status: "column-locked", state };
  if (!prerequisiteSatisfied(runtime, node)) return { status: "prerequisite-not-maxed", state };

  if (node.isReflected) {
    board.reflectedNodePoints = {
      ...(board.reflectedNodePoints ?? {}),
      [node.storageNodeId]: current + 1,
    };
  } else {
    board.nodePoints = { ...(board.nodePoints ?? {}), [node.storageNodeId]: current + 1 };
  }
  synchronizeSelectedNodes(board);
  return { status: "added", state };
}

export function removeTalentNodePoint(model, input, boardIndex, nodeId) {
  const state = normalizeTalentBoardState(model, input);
  const { runtime, board, node } = boardRuntimeNode(model, state, boardIndex, nodeId);
  if (!board || !node) return { status: "invalid-node", state };
  const pointMap = node.isReflected ? board.reflectedNodePoints : board.nodePoints;
  const current = Number(pointMap?.[node.storageNodeId] ?? 0);
  if (current <= 0) return { status: "no-points", state };
  const next = current - 1;
  const nextNodes = withRuntimePoint(runtime.nodes, node.runtimeNodeId, next);
  const laterColumnBlocked = nextNodes.some((candidate) => (
    candidate.x > node.x
    && candidate.points > 0
    && !previousColumnsUnlocked(runtime, candidate.x, nextNodes)
  ));
  if (laterColumnBlocked) return { status: "required-by-column", state };
  const requiredByDependent = !node.isReflected && next < node.baseMaxPoints && nextNodes.some((candidate) => (
    !candidate.isReflected
    && candidate.points > 0
    && samePosition(candidate.prerequisite, node)
    && !prerequisiteIsBypassed(runtime, candidate)
  ));
  if (requiredByDependent) return { status: "required-by-dependent", state };

  const field = node.isReflected ? "reflectedNodePoints" : "nodePoints";
  board[field] = { ...(board[field] ?? {}) };
  if (next > 0) board[field][node.storageNodeId] = next;
  else delete board[field][node.storageNodeId];
  synchronizeSelectedNodes(board);
  pruneLockedCoreTalents(model, state, boardIndex);
  return { status: "removed", state };
}

export function toggleCoreTalent(model, input, boardIndex, coreTalentId) {
  const state = normalizeTalentBoardState(model, input);
  const board = state.boards?.[boardIndex];
  const core = model?.coreTalentByFlatItemId?.get(coreTalentId) ?? model?.coreTalentById?.get(coreTalentId);
  if (!board || !core) return { status: "invalid-core", state };
  if (board.treeSlug !== core.treeSlug) return { status: "wrong-tree", state };

  const groups = getTalentCoreGroups(model, state, boardIndex);
  const groupIndex = groups.findIndex((group) => group.some((candidate) => candidate.flatItemId === core.flatItemId));
  if (groupIndex < 0) return { status: "invalid-core", state };
  const totalPoints = getTalentBoardRuntime(model, state, boardIndex).totalPoints;
  if (totalPoints < getTalentCoreUnlockRequirement(boardIndex, groupIndex)) {
    return { status: "core-locked", state };
  }
  const groupIds = new Set(groups[groupIndex].map((candidate) => candidate.flatItemId));
  const selected = Array.isArray(board.coreTalentIds) ? [...board.coreTalentIds] : [];
  const existingIndex = selected.indexOf(core.flatItemId);
  if (existingIndex >= 0) {
    selected.splice(existingIndex, 1);
    board.coreTalentIds = selected;
    return { status: "removed", state };
  }

  board.coreTalentIds = [
    ...selected.filter((id) => !groupIds.has(id)),
    core.flatItemId,
  ];
  return { status: selected.some((id) => groupIds.has(id)) ? "replaced" : "added", state };
}

export function addPrismToInventory(model, input, draft) {
  const state = normalizeTalentBoardState(model, input);
  const instanceId = String(draft?.instanceId ?? draft?.id ?? "").trim();
  const definition = model?.prismItemBySlug?.get(
    draft?.prismItemSlug ?? draft?.prismId ?? draft?.prismSlug,
  );
  if (!instanceId || !definition) return { status: "invalid-prism", state };
  if (!definition.supportedRarities?.includes(draft?.rarity)) {
    return { status: "invalid-rarity", state };
  }
  if (
    state.prismInventory?.some((item) => inventoryInstanceId(item) === instanceId)
    || state.inverseImageInventory?.some((item) => inventoryInstanceId(item) === instanceId)
  ) {
    return { status: "duplicate-instance", state };
  }
  const baseAffixModifierId = String(draft?.baseAffixModifierId ?? "").trim();
  const areaAffixModifierId = String(draft?.areaAffixModifierId ?? "").trim();
  const rareRandomAffixModifierId = String(draft?.rareRandomAffixModifierId ?? "").trim();
  const legendaryRandomAffixModifierId = String(draft?.legendaryRandomAffixModifierId ?? "").trim();
  if (!getPrismBaseAffixes(model, definition.slug).some((affix) => affix.modifierId === baseAffixModifierId)) {
    return { status: "invalid-base-affix", state };
  }
  if (!model.areaAffixes.some((affix) => affix.modifierId === areaAffixModifierId)) {
    return { status: "invalid-area-affix", state };
  }
  if (!model.rareGaugeAffixes.some((affix) => affix.modifierId === rareRandomAffixModifierId)) {
    return { status: "invalid-rare-affix", state };
  }
  if (draft.rarity === "legendary") {
    if (!getPrismLegendaryAffixes(model, definition.slug)
      .some((affix) => affix.modifierId === legendaryRandomAffixModifierId)) {
      return { status: "invalid-legendary-affix", state };
    }
  } else if (legendaryRandomAffixModifierId) {
    return { status: "legendary-affix-on-rare", state };
  }
  const item = {
    ...cloneJson(draft, {}),
    instanceId,
    id: instanceId,
    name: String(draft?.name ?? "").trim() || definition.name,
    summary: String(draft?.summary ?? "").trim(),
    createdAt: String(draft?.createdAt ?? "").trim() || new Date().toISOString(),
    prismItemSlug: definition.slug,
    prismItemName: definition.name,
    rarity: draft.rarity,
    baseAffixModifierId,
    areaAffixModifierId,
    rareRandomAffixModifierId,
    legendaryRandomAffixModifierId: draft.rarity === "legendary" ? legendaryRandomAffixModifierId : null,
  };
  delete item.prismId;
  delete item.prismSlug;
  delete item.slotCount;
  delete item.affixSlots;
  state.prismInventory = [item, ...(state.prismInventory ?? [])];
  return { status: "created", state, item };
}

export function getPrismBaseAffixes(model, prismSlug) {
  const definition = model?.prismItemBySlug?.get(prismSlug);
  const fixed = model?.prismAffixById?.get(definition?.baseAffixModifierId);
  return fixed ? [fixed] : (model?.baseAffixes ?? []).filter((affix) => affix.kind === "additional_effect");
}

export function getPrismLegendaryAffixes(model, prismSlug) {
  const definition = model?.prismItemBySlug?.get(prismSlug);
  const base = model?.prismAffixById?.get(definition?.baseAffixModifierId);
  const standard = model?.legendaryGaugeAffixes ?? [];
  if (base?.kind !== "replacement_core_talent") return standard;
  const mutations = (model?.mutationAffixes ?? []).filter((affix) => {
    const firstLine = String(affix.text ?? "").split("\n")[0].trim();
    return affix.label === base.replacementCoreTalentName
      && String(affix.text ?? "").includes(MUTATION_TEXT)
      && MUTATION_PENALTIES.has(firstLine);
  });
  return [...standard, ...mutations];
}

function deleteInventoryInstance(input, inventoryField, placementField, instanceId) {
  const state = normalizeTalentBoardState(null, input);
  if (!(state[inventoryField] ?? []).some((item) => inventoryInstanceId(item) === instanceId)) {
    return { status: "missing-inventory", state };
  }
  state[inventoryField] = state[inventoryField].filter((item) => inventoryInstanceId(item) !== instanceId);
  if (state[placementField]?.instanceId === instanceId) state[placementField] = null;
  return { status: "deleted", state };
}

export function deletePrismFromInventory(input, instanceId) {
  return deleteInventoryInstance(input, "prismInventory", "placedPrism", instanceId);
}

export function deleteInverseImageFromInventory(input, instanceId) {
  return deleteInventoryInstance(input, "inverseImageInventory", "placedInverseImage", instanceId);
}

export function placePrism(model, input, boardIndex, instanceId, nodeId) {
  const state = normalizeTalentBoardState(model, input);
  const prism = state.prismInventory?.find((item) => inventoryInstanceId(item) === instanceId);
  const { board, node } = boardRuntimeNode(model, state, boardIndex, nodeId);
  if (!prism) return { status: "missing-inventory", state };
  if (!board || !node) return { status: "invalid-node", state };
  if (boardIndex === 0) return { status: "base-board-forbidden", state };
  if (state.placedPrism) return { status: "prism-already-placed", state };
  if (state.placedInverseImage?.boardIndex === boardIndex) {
    return { status: "inverse-image-on-board", state };
  }
  if (node.isReflected || node.points > 0) return { status: "node-assigned", state };
  state.placedPrism = {
    instanceId,
    boardIndex,
    nodeId: node.flatItemId,
    x: node.x,
    y: node.y,
  };
  return { status: "placed", state };
}

export function unplacePrism(model, input, instanceId) {
  const state = normalizeTalentBoardState(model, input);
  if (!state.placedPrism || (instanceId && state.placedPrism.instanceId !== instanceId)) {
    return { status: "not-placed", state };
  }
  const runtime = getTalentBoardRuntime(model, state, state.placedPrism.boardIndex);
  const required = runtime.nodes.some((node) => (
    !node.isReflected
    && node.points > 0
    && samePosition(node.prerequisite, state.placedPrism)
  ));
  if (required) return { status: "required-by-dependent", state };
  state.placedPrism = null;
  return { status: "unplaced", state };
}

export function movePrism(model, input, instanceId, boardIndex, nodeId) {
  const state = normalizeTalentBoardState(model, input);
  if (!state.placedPrism || state.placedPrism.instanceId !== instanceId) {
    return { status: "not-placed", state };
  }
  const unplaced = unplacePrism(model, state, instanceId);
  if (unplaced.status !== "unplaced") return { status: unplaced.status, state };
  const placed = placePrism(model, unplaced.state, boardIndex, instanceId, nodeId);
  if (placed.status !== "placed") return { status: placed.status, state };
  return { status: "moved", state: placed.state };
}

export function rotatePlacedPrism(input, instanceId, turns = 1) {
  const state = normalizeTalentBoardState(null, input);
  return { status: "unsupported", state, instanceId, turns };
}

export function getTalentBoardPerimeter() {
  return [
    ...Array.from({ length: 7 }, (_, x) => ({ x, y: 0 })),
    ...Array.from({ length: 3 }, (_, index) => ({ x: 6, y: index + 1 })),
    ...Array.from({ length: 7 }, (_, index) => ({ x: 6 - index, y: 4 })),
    ...Array.from({ length: 3 }, (_, index) => ({ x: 0, y: 3 - index })),
  ];
}

export function getInverseImagePlacementNodes(model, input, boardIndex) {
  if (boardIndex === 0) return [];
  const runtime = getTalentBoardRuntime(model, input, boardIndex);
  return runtime.nodes.filter((node) => (
    !node.isReflected
    && (node.y === 0 || node.y === 4 || node.x <= 1 || node.x >= 5)
  ));
}

export function addInverseImageToInventory(input, draft) {
  const state = normalizeTalentBoardState(null, input);
  const instanceId = String(draft?.instanceId ?? draft?.id ?? draft?.inverseImageId ?? "").trim();
  const microTalentEffect = Number(draft?.microTalentEffect ?? 0);
  const mediumTalentEffect = Number(draft?.mediumTalentEffect ?? 0);
  const legendaryTalentEffect = Number(draft?.legendaryTalentEffect ?? 0);
  if (!instanceId) return { status: "invalid-inverse-image", state };
  if (!Number.isFinite(microTalentEffect) || microTalentEffect < -100 || microTalentEffect > 200) {
    return { status: "invalid-micro-effect", state };
  }
  if (!Number.isFinite(mediumTalentEffect) || mediumTalentEffect < -100 || mediumTalentEffect > 100) {
    return { status: "invalid-medium-effect", state };
  }
  if (!Number.isFinite(legendaryTalentEffect) || legendaryTalentEffect < -100 || legendaryTalentEffect > 50) {
    return { status: "invalid-legendary-effect", state };
  }
  if (
    state.inverseImageInventory?.some((item) => inventoryInstanceId(item) === instanceId)
    || state.prismInventory?.some((item) => inventoryInstanceId(item) === instanceId)
  ) {
    return { status: "duplicate-instance", state };
  }
  const item = {
    ...cloneJson(draft, {}),
    id: instanceId,
    instanceId,
    name: String(draft?.name ?? "").trim() || "自定义逆像",
    createdAt: String(draft?.createdAt ?? "").trim() || new Date().toISOString(),
    microTalentEffect,
    mediumTalentEffect,
    legendaryTalentEffect,
  };
  delete item.inverseImageId;
  state.inverseImageInventory = [item, ...(state.inverseImageInventory ?? [])];
  return { status: "created", state, item };
}

export function placeInverseImage(model, input, boardIndex, instanceId, nodeId) {
  const state = normalizeTalentBoardState(model, input);
  const board = state.boards?.[boardIndex];
  const inverseImage = state.inverseImageInventory?.find((item) => inventoryInstanceId(item) === instanceId);
  if (!board?.treeSlug) return { status: "invalid-board", state };
  if (!inverseImage) return { status: "missing-inventory", state };
  if (boardIndex === 0) return { status: "base-board-forbidden", state };
  const runtime = getTalentBoardRuntime(model, state, boardIndex);
  if (runtime.totalPoints > 0) return { status: "points-allocated", state };
  if (state.placedPrism?.boardIndex === boardIndex) return { status: "prism-on-board", state };
  if (state.placedInverseImage) {
    return { status: "inverse-image-already-placed", state };
  }
  const node = getInverseImagePlacementNodes(model, state, boardIndex)
    .find((candidate) => candidate.runtimeNodeId === nodeId || candidate.id === nodeId);
  if (!node) return { status: "invalid-position", state };
  state.placedInverseImage = {
    instanceId,
    boardIndex,
    nodeId: node.flatItemId,
    x: node.x,
    y: node.y,
  };
  return { status: "placed", state };
}

export function unplaceInverseImage(model, input, instanceId) {
  const state = normalizeTalentBoardState(model, input);
  if (!state.placedInverseImage || (instanceId && state.placedInverseImage.instanceId !== instanceId)) {
    return { status: "not-placed", state };
  }
  const runtime = getTalentBoardRuntime(model, state, state.placedInverseImage.boardIndex);
  if (runtime.totalPoints > 0) return { status: "points-allocated", state };
  state.placedInverseImage = null;
  return { status: "unplaced", state };
}

export function moveInverseImage(model, input, instanceId, boardIndex, nodeId) {
  const state = normalizeTalentBoardState(model, input);
  if (!state.placedInverseImage || state.placedInverseImage.instanceId !== instanceId) {
    return { status: "not-placed", state };
  }
  const unplaced = unplaceInverseImage(model, state, instanceId);
  if (unplaced.status !== "unplaced") return { status: unplaced.status, state };
  const placed = placeInverseImage(model, unplaced.state, boardIndex, instanceId, nodeId);
  if (placed.status !== "placed") return { status: placed.status, state };
  return { status: "moved", state: placed.state };
}

export function rotatePlacedInverseImage(input, instanceId, turns = 1) {
  const state = normalizeTalentBoardState(null, input);
  return { status: "unsupported", state, instanceId, turns };
}

function replaceBoardSelection(state, boardIndex, treeSlug = null) {
  const board = state.boards[boardIndex];
  state.boards[boardIndex] = {
    ...emptyBoard(boardIndex),
    boardId: board.boardId ?? null,
    treeSlug,
  };
  if (state.placedPrism?.boardIndex === boardIndex) state.placedPrism = null;
  if (state.placedInverseImage?.boardIndex === boardIndex) state.placedInverseImage = null;
}

export function resetTalentBoard(model, input, boardIndex) {
  const state = normalizeTalentBoardState(model, input);
  if (!state.boards?.[boardIndex]) return { status: "invalid-board", state };
  replaceBoardSelection(state, boardIndex);
  return { status: "reset", state };
}

export function resetAllTalentBoards(model, input) {
  const state = normalizeTalentBoardState(model, input);
  for (let boardIndex = 0; boardIndex < 4; boardIndex += 1) {
    replaceBoardSelection(state, boardIndex);
  }
  state.placedPrism = null;
  state.placedInverseImage = null;
  return { status: "reset", state };
}

export function selectTalentTree(model, input, boardIndex, treeSlug) {
  const state = normalizeTalentBoardState(model, input);
  const board = state.boards?.[boardIndex];
  const tree = model?.treeBySlug?.get(treeSlug);
  if (!board || !tree) return { status: "invalid-tree", state };
  if (tree.isSupported === false) return { status: "unsupported-tree", state };
  const expectedKind = boardIndex === 0 ? "god" : "profession";
  if (tree.kind !== expectedKind) return { status: "wrong-tree-kind", state };
  if (board.treeSlug === tree.slug) return { status: "unchanged", state };
  if (state.boards.some((candidate, index) => index !== boardIndex && candidate?.treeSlug === tree.slug)) {
    return { status: "duplicate-tree", state };
  }
  if (!getAvailableTalentTrees(model, state, boardIndex).some((candidate) => candidate.slug === tree.slug)) {
    return { status: boardIndex === 1 ? "base-tree-mismatch" : "tree-unavailable", state };
  }

  replaceBoardSelection(state, boardIndex, tree.slug);
  if (boardIndex === 0) {
    const allowedSecond = new Set(TALENT_SUBTREE_SLUGS_BY_GOD[tree.slug] ?? []);
    if (state.boards[1].treeSlug && !allowedSecond.has(state.boards[1].treeSlug)) {
      replaceBoardSelection(state, 1);
    }
  }
  return { status: "selected", state };
}

function addError(errors, code, path, details = {}) {
  errors.push({ code, path, ...details });
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function inventoryMap(errors, items, path) {
  for (const instanceId of findDuplicates((items ?? []).map(inventoryInstanceId))) {
    addError(errors, "duplicate-inventory-instance", path, { instanceId });
  }
  return new Map((items ?? []).filter(inventoryInstanceId).map((item) => [inventoryInstanceId(item), item]));
}

export function diagnoseTalentBoardState(model, input) {
  const state = normalizeTalentBoardState(model, input);
  const errors = [];
  if (Array.isArray(input?.boards) && input.boards.length !== 4) {
    addError(errors, "invalid-board-count", "boards", { expected: 4 });
  }

  for (const treeSlug of findDuplicates((state.boards ?? []).map((board) => board?.treeSlug))) {
    addError(errors, "duplicate-tree", "boards", { treeSlug });
  }

  const prismByInstance = inventoryMap(errors, state.prismInventory, "prismInventory");
  const inverseByInstance = inventoryMap(errors, state.inverseImageInventory, "inverseImageInventory");
  for (const instanceId of findDuplicates([
    ...(state.prismInventory ?? []).map(inventoryInstanceId),
    ...(state.inverseImageInventory ?? []).map(inventoryInstanceId),
  ])) {
    if (prismByInstance.has(instanceId) && inverseByInstance.has(instanceId)) {
      addError(errors, "duplicate-inventory-instance", "inventory", { instanceId });
    }
  }

  for (const [index, item] of (state.prismInventory ?? []).entries()) {
    const definition = model?.prismItemBySlug?.get(item?.prismItemSlug);
    if (!inventoryInstanceId(item) || !definition) addError(errors, "invalid-prism", `prismInventory.${index}`);
    if (definition && !definition.supportedRarities?.includes(item?.rarity)) {
      addError(errors, "invalid-rarity", `prismInventory.${index}.rarity`);
    }
    if (definition && !getPrismBaseAffixes(model, definition.slug)
      .some((affix) => affix.modifierId === item.baseAffixModifierId)) {
      addError(errors, "invalid-base-affix", `prismInventory.${index}.baseAffixModifierId`);
    }
    if (!model.areaAffixes.some((affix) => affix.modifierId === item.areaAffixModifierId)) {
      addError(errors, "invalid-area-affix", `prismInventory.${index}.areaAffixModifierId`);
    }
    if (!model.rareGaugeAffixes.some((affix) => affix.modifierId === item.rareRandomAffixModifierId)) {
      addError(errors, "invalid-rare-affix", `prismInventory.${index}.rareRandomAffixModifierId`);
    }
    if (item.rarity === "legendary" && definition && !getPrismLegendaryAffixes(model, definition.slug)
      .some((affix) => affix.modifierId === item.legendaryRandomAffixModifierId)) {
      addError(errors, "invalid-legendary-affix", `prismInventory.${index}.legendaryRandomAffixModifierId`);
    }
  }
  for (const [index, item] of (state.inverseImageInventory ?? []).entries()) {
    if (!inventoryInstanceId(item)) {
      addError(errors, "invalid-inverse-image", `inverseImageInventory.${index}`);
    }
    const effects = [
      [item?.microTalentEffect, -100, 200, "microTalentEffect"],
      [item?.mediumTalentEffect, -100, 100, "mediumTalentEffect"],
      [item?.legendaryTalentEffect, -100, 50, "legendaryTalentEffect"],
    ];
    for (const [value, minimum, maximum, field] of effects) {
      if (!Number.isFinite(Number(value)) || Number(value) < minimum || Number(value) > maximum) {
        addError(errors, "invalid-inverse-effect", `inverseImageInventory.${index}.${field}`);
      }
    }
  }

  for (const [boardIndex, board] of (state.boards ?? []).entries()) {
    const path = `boards.${boardIndex}`;
    const tree = model?.treeBySlug?.get(board?.treeSlug);
    const expectedKind = boardIndex === 0 ? "god" : "profession";
    if (board?.treeSlug && !tree) addError(errors, "invalid-tree", `${path}.treeSlug`);
    if (tree && tree.kind !== expectedKind) addError(errors, "wrong-tree-kind", `${path}.treeSlug`);
    if (tree?.isSupported === false) addError(errors, "unsupported-tree", `${path}.treeSlug`);
    if (boardIndex === 1 && tree) {
      const allowed = TALENT_SUBTREE_SLUGS_BY_GOD[state.boards[0]?.treeSlug] ?? [];
      if (!allowed.includes(tree.slug)) addError(errors, "base-tree-mismatch", `${path}.treeSlug`);
    }

    for (const nodeId of findDuplicates(board?.selectedNodeIds ?? [])) {
      addError(errors, "duplicate-node", `${path}.selectedNodeIds`, { nodeId });
    }
    const runtime = getTalentBoardRuntime(model, state, boardIndex);
    const runtimeByStorageId = new Map(runtime.nodes.map((node) => [node.storageNodeId, node]));
    for (const [field, pointMap] of [
      ["nodePoints", board?.nodePoints ?? {}],
      ["reflectedNodePoints", board?.reflectedNodePoints ?? {}],
    ]) {
      for (const [nodeId, points] of Object.entries(pointMap)) {
        const node = runtimeByStorageId.get(nodeId);
        if (!node || (field === "reflectedNodePoints") !== node.isReflected) {
          addError(errors, "invalid-node", `${path}.${field}.${nodeId}`);
          continue;
        }
        if (!Number.isInteger(points) || points < 1 || points > node.maxPoints) {
          addError(errors, "invalid-node-points", `${path}.${field}.${nodeId}`, { points });
        }
        if (!previousColumnsUnlocked(runtime, node.x)) {
          addError(errors, "column-locked", `${path}.${field}.${nodeId}`);
        }
        if (!prerequisiteSatisfied(runtime, node)) {
          addError(errors, "prerequisite-not-maxed", `${path}.${field}.${nodeId}`);
        }
      }
    }

    const coreTalentIds = board?.coreTalentIds ?? [];
    for (const coreTalentId of findDuplicates(coreTalentIds)) {
      addError(errors, "duplicate-core", `${path}.coreTalentIds`, { coreTalentId });
    }
    if (coreTalentIds.length > Number(tree?.coreTalentSlotCount ?? 2)) {
      addError(errors, "core-slot-limit", `${path}.coreTalentIds`);
    }
    for (const coreTalentId of coreTalentIds) {
      const core = model?.coreTalentByFlatItemId?.get(coreTalentId) ?? model?.coreTalentById?.get(coreTalentId);
      if (!core || core.treeSlug !== board?.treeSlug) {
        addError(errors, "invalid-core", `${path}.coreTalentIds`, { coreTalentId });
        continue;
      }
      const groups = getTalentCoreGroups(model, state, boardIndex);
      const groupIndex = groups.findIndex((group) => group.some((candidate) => candidate.flatItemId === core.flatItemId));
      if (runtime.totalPoints < getTalentCoreUnlockRequirement(boardIndex, groupIndex)) {
        addError(errors, "core-locked", `${path}.coreTalentIds`, { coreTalentId });
      }
    }
  }

  if (isPlainObject(input?.placedPrism) && !state.placedPrism) {
    addError(errors, "invalid-placement", "placedPrism");
  }
  if (state.placedPrism) {
    const placement = state.placedPrism;
    const board = state.boards[placement.boardIndex];
    const node = model?.nodeByFlatItemId?.get(placement.nodeId)
      ?? model?.treeBySlug?.get(board?.treeSlug)?.nodes.find((candidate) => samePosition(candidate, placement));
    if (!prismByInstance.has(placement.instanceId)) addError(errors, "missing-inventory", "placedPrism");
    if (placement.boardIndex === 0) addError(errors, "base-board-forbidden", "placedPrism.boardIndex");
    if (!node || node.treeSlug !== board?.treeSlug || !samePosition(node, placement)) {
      addError(errors, "invalid-node", "placedPrism.nodeId");
    } else if (Number(board.nodePoints?.[node.flatItemId] ?? 0) > 0) {
      addError(errors, "node-assigned", "placedPrism.nodeId");
    }
  }
  if (isPlainObject(input?.placedInverseImage) && !state.placedInverseImage) {
    addError(errors, "invalid-placement", "placedInverseImage");
  }
  if (state.placedInverseImage) {
    const placement = state.placedInverseImage;
    const board = state.boards[placement.boardIndex];
    const tree = model?.treeBySlug?.get(board?.treeSlug);
    const node = tree?.nodes.find((candidate) => samePosition(candidate, placement));
    if (!inverseByInstance.has(placement.instanceId)) addError(errors, "missing-inventory", "placedInverseImage");
    if (placement.boardIndex === 0) addError(errors, "base-board-forbidden", "placedInverseImage.boardIndex");
    if (!node || !(node.y === 0 || node.y === 4 || node.x <= 1 || node.x >= 5)) {
      addError(errors, "invalid-position", "placedInverseImage.nodeId");
    }
  }
  if (
    state.placedPrism
    && state.placedInverseImage
    && state.placedPrism.boardIndex === state.placedInverseImage.boardIndex
  ) {
    addError(errors, "placement-conflict", "placements");
  }

  return { valid: errors.length === 0, errors, state };
}
