import {
  HADES_COPYABLE_TALENT_CONTRACTS_SS13_4,
} from "./hadesCopyContract.ss13_4.generated.js";

export const TOB91_DIVINITY_INTEROP_RECEIPT = Object.freeze({
  sourceArtifact: "https://91tob.com/assets/App-Bp8Ow0pk.js",
  sourceLastModified: "Wed, 12 Aug 2026 04:30:20 GMT",
  sourceByteLength: 2313502,
  sourceSha256: "9020c96d3f01f207b3c4019a435590da911a01527866fdd168520dfd4f860e23",
  catalogFingerprint: "frontend-divinity-catalog-2026-03-26-v1",
  boardMaskVersion: "frontend-divinity-board-mask-2026-03-26-v1",
  hadesDataset: Object.freeze({
    packageVersion: "SS13.4",
    packageGeneratedAt: "2026-08-12T04:29:41.328Z",
    url: "https://91tob.com/.generated-runtime/datasets/hades-divinity-catalog.json",
    bytes: 30801,
    sha256: "666fc690710e71e324a9b88bc1844f9fc38a00958eb3b6f1ce17b6b301f9511a",
    entryCount: 102,
    copyableTalentCount: 21,
  }),
  hadesTalentIdentityGroups: Object.freeze([
    Object.freeze({
      sourcePrefix: "hades-fixed-",
      localCategory: "fixed",
      localStableIds: Object.freeze([
        "90000000", "90000001", "90000002", "90000003", "90000004", "90000005",
        "90000006", "90000007", "90000008", "90000009", "90000010", "90000011",
        "90000012", "90000013", "90000014", "90000015", "90000016", "90000017",
        "90000018", "90000019", "90000100", "90000101", "90000102", "90000103",
        "90000104", "90000105", "90000106", "90000107", "90000108", "90000109",
        "90000110", "90000111", "90000112", "90000113", "90000114", "90000115",
        "90000116", "90000117", "90000200", "90000201", "90000202", "90000203",
        "90000204", "90000205", "90000206", "90000207", "90000208", "90000209",
        "90000210", "90000211", "90000212", "90000213", "90000214",
      ]),
    }),
    Object.freeze({
      sourcePrefix: "hades-imprint-infusion-",
      localCategory: "contamination_imprint",
      localStableIds: Object.freeze([
        "92000001", "92000002", "92000003", "92000004", "92000005", "92000006",
        "92000007",
      ]),
    }),
    Object.freeze({
      sourcePrefix: "hades-imprint-common-",
      localCategory: "common_imprint",
      localStableIds: Object.freeze([
        "92100001", "92100002", "92100003", "92100004", "92100005", "92100006",
        "92100007", "92100008", "92100009", "92100010", "92100011", "92100012",
        "92100013", "92100014", "92100015", "92100016", "92100017", "92100018",
        "92100019", "92100020", "92100021",
      ]),
    }),
    Object.freeze({
      sourcePrefix: "hades-imprint-banishment-",
      localCategory: "banishment_imprint",
      localStableIds: Object.freeze([
        "92200001", "92200002", "92200101", "92200102", "92200103", "92200104",
      ]),
    }),
    Object.freeze({
      sourcePrefix: "hades-imprint-judgment-",
      localCategory: "judgment_imprint",
      localStableIds: Object.freeze([
        "92300001", "92300002", "92300003", "92300004", "92300005",
      ]),
    }),
  ]),
  hadesCopyingTalentContracts: HADES_COPYABLE_TALENT_CONTRACTS_SS13_4,
  hadesVariants: Object.freeze([
    Object.freeze({
      sectionKey: "hades_judgment",
      templateId: "hades_judgment",
      variantId: "L",
      shapeId: "hades_judgment_a",
      fixedPosition: Object.freeze({ x: 1, y: 1 }),
      imprintSlotKeys: Object.freeze(["imprint_1", "imprint_2", "imprint_3"]),
    }),
    Object.freeze({
      sectionKey: "hades_judgment",
      templateId: "hades_judgment",
      variantId: "LINE",
      shapeId: "hades_judgment_line",
      fixedPosition: Object.freeze({ x: 1, y: 1 }),
      imprintSlotKeys: Object.freeze(["imprint_1", "imprint_2"]),
    }),
    Object.freeze({
      sectionKey: "hades_infusion",
      templateId: "hades_contamination",
      variantId: "COMPLETE",
      shapeId: "hades_infusion_complete",
      fixedPosition: Object.freeze({ x: 1, y: 3 }),
      imprintSlotKeys: Object.freeze(["imprint_1", "imprint_2", "imprint_3"]),
    }),
    Object.freeze({
      sectionKey: "hades_infusion",
      templateId: "hades_contamination",
      variantId: "BROKEN",
      shapeId: "hades_infusion_broken",
      fixedPosition: Object.freeze({ x: 1, y: 3 }),
      imprintSlotKeys: Object.freeze(["imprint_1", "imprint_2"]),
    }),
    ...["A", "B", "C", "D"].map((variantId, index) => Object.freeze({
      sectionKey: "hades_banishment",
      templateId: "hades_banishment",
      variantId,
      shapeId: `hades_banishment_${variantId.toLowerCase()}`,
      fixedPosition: Object.freeze([
        { x: 0, y: 0 },
        { x: 0, y: 3 },
        { x: 3, y: 3 },
        { x: 3, y: 0 },
      ][index]),
      imprintSlotKeys: Object.freeze(["imprint_1", "imprint_2", "imprint_3"]),
    })),
  ]),
  hadesAuthorityMappings: Object.freeze([
    Object.freeze({ sourceId: "hades-banishment-strike", localArchetype: "Demolisher" }),
    Object.freeze({ sourceId: "hades-banishment-steep-strike", localArchetype: "Steep Strike" }),
    Object.freeze({ sourceId: "hades-banishment-shadow-strike", localArchetype: "Shadow Strike" }),
    Object.freeze({ sourceId: "hades-banishment-spell-burst", localArchetype: "Spell Burst" }),
    Object.freeze({ sourceId: "hades-banishment-affliction", localArchetype: "Ill Omen" }),
    Object.freeze({ sourceId: "hades-banishment-ground", localArchetype: "Quagmire" }),
    Object.freeze({ sourceId: "hades-banishment-projectile", localArchetype: "Projection" }),
    Object.freeze({ sourceId: "hades-banishment-elixir", localArchetype: "Provision" }),
    Object.freeze({ sourceId: "hades-banishment-entangle", localArchetype: "Tangle" }),
    Object.freeze({ sourceId: "hades-banishment-undying", localArchetype: "Indomitable" }),
  ]),
  supportedTemplates: Object.freeze([
    Object.freeze({
      catalogId: "six_gods",
      allowedShapeIds: Object.freeze(["a_4", "a_2", "a_1", "a_3"]),
      requiresGodSelection: true,
      maxPlacedCount: null,
    }),
    Object.freeze({
      catalogId: "stars_fall",
      allowedShapeIds: Object.freeze(["b_2"]),
      requiresGodSelection: false,
      maxPlacedCount: 3,
    }),
    Object.freeze({
      catalogId: "corner_of_divinity",
      allowedShapeIds: Object.freeze(["c"]),
      requiresGodSelection: false,
      maxPlacedCount: 3,
    }),
    Object.freeze({
      catalogId: "genealogy",
      allowedShapeIds: Object.freeze(["f"]),
      requiresGodSelection: false,
      maxPlacedCount: 1,
    }),
    Object.freeze({
      catalogId: "starfire",
      allowedShapeIds: Object.freeze(["d_1"]),
      requiresGodSelection: false,
      maxPlacedCount: 3,
    }),
    Object.freeze({
      catalogId: "moth_fire",
      allowedShapeIds: Object.freeze(["d_2"]),
      requiresGodSelection: false,
      maxPlacedCount: 1,
    }),
    Object.freeze({
      catalogId: "void_gap",
      allowedShapeIds: Object.freeze(["e"]),
      requiresGodSelection: false,
      maxPlacedCount: 1,
    }),
    Object.freeze({
      catalogId: "residence_of_stars",
      allowedShapeIds: Object.freeze(["residence_of_stars"]),
      requiresGodSelection: false,
      maxPlacedCount: 1,
      orientationLocked: true,
    }),
  ]),
  copyingTemplateContracts: Object.freeze([
    Object.freeze({
      catalogId: "starfire",
      slots: Object.freeze([
        Object.freeze({
          slotKey: "effect",
          valueType: "special_effect",
          values: Object.freeze([
            Object.freeze({ id: "sparks_copy_up", direction: "up", text: "复制上侧相邻石板的最后一条非核心天赋，无法复制核心天赋。" }),
            Object.freeze({ id: "sparks_copy_left", direction: "left", text: "复制左侧相邻石板的最后一条非核心天赋，无法复制核心天赋。" }),
            Object.freeze({ id: "sparks_copy_down", direction: "down", text: "复制下侧相邻石板的最后一条非核心天赋，无法复制核心天赋。" }),
            Object.freeze({ id: "sparks_copy_right", direction: "right", text: "复制右侧相邻石板的最后一条非核心天赋，无法复制核心天赋。" }),
          ]),
        }),
      ]),
    }),
    Object.freeze({
      catalogId: "moth_fire",
      slots: Object.freeze([
        Object.freeze({
          slotKey: "effect",
          valueType: "special_effect",
          values: Object.freeze([
            Object.freeze({ id: "prairie_copy_all", direction: "all", text: "复制上下左右四个方向相邻石板的最后一条非核心天赋，无法复制核心天赋。" }),
          ]),
        }),
      ]),
    }),
    Object.freeze({
      catalogId: "void_gap",
      slots: Object.freeze([
        Object.freeze({
          slotKey: "copy_left",
          valueType: "copy_slot",
          values: Object.freeze([
            Object.freeze({ id: "copy_left", direction: "left", copyType: "medium_or_legendary" }),
          ]),
        }),
        Object.freeze({
          slotKey: "copy_right",
          valueType: "copy_slot",
          values: Object.freeze([
            Object.freeze({ id: "copy_right", direction: "right", copyType: "medium_or_legendary" }),
          ]),
        }),
      ]),
    }),
    Object.freeze({
      catalogId: "residence_of_stars",
      slots: Object.freeze([
        Object.freeze({
          slotKey: "effect",
          valueType: "special_effect",
          values: Object.freeze([
            Object.freeze({
              id: "residence_copy_all",
              direction: "all",
              text: "复制相邻石板的中型天赋到该石板，无法复制传奇中型天赋。",
            }),
          ]),
        }),
      ]),
    }),
  ]),
  coreTalentSnapshot: Object.freeze({
    talentCatalog: Object.freeze({
      url: "https://91tob.com/.generated-runtime/datasets/talent-catalog.json",
      bytes: 636553,
      sha256: "08edd089095951f869018e41ed5b4a836c1dae1d9f8ede04ba2568a2157852bb",
    }),
    seasonKey: "Vorax_Season",
    catalogVersion: "frontend_talent_catalog_v1",
    candidateCount: 133,
    supportedCount: 126,
    excludedBindings: Object.freeze([
      Object.freeze({ sourceId: "divinity-talent-1021", dataId: "52001300", reason: "public-talent-effect-mismatch" }),
      Object.freeze({ sourceId: "divinity-talent-212", dataId: "21001400", reason: "public-talent-effect-mismatch" }),
      Object.freeze({ sourceId: "divinity-talent-518", dataId: "40001100", reason: "public-talent-effect-mismatch" }),
      Object.freeze({ sourceId: "divinity-talent-750", dataId: "52001400", reason: "public-talent-effect-mismatch" }),
      Object.freeze({ sourceId: "divinity-talent-817", dataId: "54001400", reason: "public-talent-effect-mismatch" }),
      Object.freeze({ sourceId: "divinity-talent-850", dataId: "60001300", reason: "public-talent-effect-mismatch" }),
      Object.freeze({ sourceId: "divinity-talent-917", dataId: "62001200", reason: "public-talent-effect-mismatch" }),
    ]),
    sourceIdentityJsonLength: 31807,
    sourceIdentityFnv1a64: "222d3772ec47275c",
    sourceIdentitySha256: "9e9cf3b4b671f7cb76c297d96ab2a15af5e4b6cd196642c2a09a7d409beed897",
  }),
  supportedValueTypes: Object.freeze([
    "talent_affix",
    "core_talent",
    "special_effect",
    "copy_slot",
  ]),
  unsupportedScopes: Object.freeze([
    "frontend-resolved-hades-affixes-outside-pinned-common-and-generic-sources",
  ]),
  identitySha256: "29b74f47146c740e448b27bee44c9c65f976b67c3a7d37700e05a0e20cc3aace",
});
