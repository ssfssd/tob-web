export const HADES_COPY_CAPABILITIES_SS13_4 = Object.freeze([
  "last_non_core",
  "medium_or_legendary",
]);

export const HADES_COPYABLE_TALENT_CONTRACTS_SS13_4 = Object.freeze([
  Object.freeze({ sourceId: "hades-imprint-common-001", localStableId: "92100001", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "精密 狂猛获得额外基础效果：+5% 几率造成双倍伤害" }),
  Object.freeze({ sourceId: "hades-imprint-common-002", localStableId: "92100002", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "对近处的敌人，额外 +15% 物理伤害" }),
  Object.freeze({ sourceId: "hades-imprint-common-003", localStableId: "92100003", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "每 +1 法术技能等级，+5 法术暴击值，+10% 法术暴击值，上限 10 层" }),
  Object.freeze({ sourceId: "hades-imprint-common-004", localStableId: "92100004", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "每封印 1% 生命，额外 +0.14% 法术伤害" }),
  Object.freeze({ sourceId: "hades-imprint-common-005", localStableId: "92100005", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "攻击直射投射物有 14% 几率返回自身" }),
  Object.freeze({ sourceId: "hades-imprint-common-006", localStableId: "92100006", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "-50 暴击值；投射物暴击时额外 +18% 伤害" }),
  Object.freeze({ sourceId: "hades-imprint-common-007", localStableId: "92100007", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "每有 6% 击退距离，额外 +1% 投射物伤害，最多 3 次" }),
  Object.freeze({ sourceId: "hades-imprint-common-008", localStableId: "92100008", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "恶兆获得额外基础效果：额外 +2% 受到伤害" }),
  Object.freeze({ sourceId: "hades-imprint-common-009", localStableId: "92100009", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "额外 +8% 加剧效果，+48 每秒施加加剧值" }),
  Object.freeze({ sourceId: "hades-imprint-common-010", localStableId: "92100010", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "收割时，20% 概率触发 1 级灼热波纹，间隔 2 秒" }),
  Object.freeze({ sourceId: "hades-imprint-common-011", localStableId: "92100011", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "+1 召唤召唤物的技能等级，额外 +4% 召唤物伤害" }),
  Object.freeze({ sourceId: "hades-imprint-common-012", localStableId: "92100012", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "每拥有一个召唤物，额外 +2% 召唤物伤害，最多 6 层；+15% 召唤物生命" }),
  Object.freeze({ sourceId: "hades-imprint-common-013", localStableId: "92100013", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "最近每次非暴击，+20% 暴击伤害，上限 4 层" }),
  Object.freeze({ sourceId: "hades-imprint-common-014", localStableId: "92100014", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "+1 全部技能等级" }),
  Object.freeze({ sourceId: "hades-imprint-common-015", localStableId: "92100015", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "周围 10 米的敌人额外受到的火焰伤害 +14%" }),
  Object.freeze({ sourceId: "hades-imprint-common-016", localStableId: "92100016", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "额外 +14% 最大闪电伤害" }),
  Object.freeze({ sourceId: "hades-imprint-common-017", localStableId: "92100017", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "暴击时，额外 +16% 冰冷伤害" }),
  Object.freeze({ sourceId: "hades-imprint-common-018", localStableId: "92100018", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "攻击和法术格挡率不小于 50% 时，-50% 受到的瘫痪、虚弱、减速效果" }),
  Object.freeze({ sourceId: "hades-imprint-common-019", localStableId: "92100019", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "27% 受到的腐蚀伤害转化为元素伤害" }),
  Object.freeze({ sourceId: "hades-imprint-common-020", localStableId: "92100020", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "最近每释放一次激发或防护技能，额外 +3% 伤害，上限 4 次 (叠乘)" }),
  Object.freeze({ sourceId: "hades-imprint-common-021", localStableId: "92100021", localCategory: "common_imprint", copyCapabilities: HADES_COPY_CAPABILITIES_SS13_4, sourceText: "击中时，额外 +1% 腐蚀伤害，上限 12 层，持续 3 秒" }),
]);

const HADES_COPYABLE_TALENT_BY_LOCAL_STABLE_ID_SS13_4 = new Map(
  HADES_COPYABLE_TALENT_CONTRACTS_SS13_4.map((record) => [record.localStableId, record]),
);

export function getHadesCopyableTalentContractSs13_4(selection) {
  const localStableId = String(selection?.localStableId ?? selection?.stableId ?? "");
  const contract = HADES_COPYABLE_TALENT_BY_LOCAL_STABLE_ID_SS13_4.get(localStableId) ?? null;
  const localCategory = selection?.localCategory ?? selection?.category ?? selection?.hadesCategory;
  return contract?.localCategory === localCategory ? contract : null;
}
