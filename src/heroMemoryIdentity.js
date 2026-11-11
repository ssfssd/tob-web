const TYPE_IDENTITIES = Object.freeze([
  Object.freeze({
    runtimeId: "memory_1",
    sourcePath: "Memory_of_Origin",
    flatCatalogId: "heroMemory-tlidb-com-cn-memory-of-origin",
  }),
  Object.freeze({
    runtimeId: "memory_2",
    sourcePath: "Memory_of_Discipline",
    flatCatalogId: "heroMemory-tlidb-com-cn-memory-of-discipline",
  }),
  Object.freeze({
    runtimeId: "memory_3",
    sourcePath: "Memory_of_Progress",
    flatCatalogId: "heroMemory-tlidb-com-cn-memory-of-progress",
  }),
]);

const CANONICAL_BY_ALIAS = new Map(TYPE_IDENTITIES.flatMap((identity) => [
  [identity.runtimeId, identity.flatCatalogId],
  [identity.flatCatalogId, identity.flatCatalogId],
]));

export const HERO_MEMORY_TYPE_IDENTITIES = TYPE_IDENTITIES;

export function normalizeHeroMemoryTypeId(value) {
  if (typeof value !== "string" || !value) return value;
  return CANONICAL_BY_ALIAS.get(value) ?? value;
}

export function getHeroMemoryTypeIdentity(value) {
  const canonicalId = normalizeHeroMemoryTypeId(value);
  return TYPE_IDENTITIES.find(({ flatCatalogId }) => flatCatalogId === canonicalId) ?? null;
}
