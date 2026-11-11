export const PUBLIC_91TOB_SKILL_PICKER_CONTRACT = Object.freeze({
  sourceArtifact: "https://91tob.com/assets/App-Bp8Ow0pk.js",
  sourceSha256: "9020c96d3f01f207b3c4019a435590da911a01527866fdd168520dfd4f860e23",
  sourceNameLocale: "zh-Hans-CN",
  activeOrder: Object.freeze([
    "source-name",
    "modularization-source-order",
  ]),
  supportKindOrder: Object.freeze([
    "activation",
    "magnificent",
    "noble",
    "regular",
  ]),
  localSupportExtensionOrder: Object.freeze(["modular"]),
});

export function compareSkillPickerSourceNames(left, right) {
  return String(left?.name ?? "").localeCompare(
    String(right?.name ?? ""),
    PUBLIC_91TOB_SKILL_PICKER_CONTRACT.sourceNameLocale,
  );
}

export function isModularizationSkillPickerRecord(record) {
  return record?.raw?._isModularizationCatalogRecord === true;
}

export function getSkillPickerSupportKindOrder() {
  return [
    ...PUBLIC_91TOB_SKILL_PICKER_CONTRACT.supportKindOrder,
    ...PUBLIC_91TOB_SKILL_PICKER_CONTRACT.localSupportExtensionOrder,
  ];
}
