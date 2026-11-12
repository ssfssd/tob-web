// Installed SS14 config_c, mount 6346940: 9080 (enhancement cap),
// 9078 (random affix cap). Quality is independent of current enhancement.
export const memoryQualities = [
  { id: 1, name: '노멀', maxLevel: 10, randomLimit: 0 },
  { id: 2, name: '매직', maxLevel: 20, randomLimit: 1 },
  { id: 3, name: '레어', maxLevel: 30, randomLimit: 1 },
  { id: 4, name: '엘리트', maxLevel: 40, randomLimit: 2 },
  { id: 5, name: '절대자', maxLevel: 50, randomLimit: 2 },
];
export const memoryQuality = id => memoryQualities.find(row => row.id === id);

export function validMemoryQuality(memory) {
  if (memory?.ss14Quality === undefined) return true;
  const quality = memoryQuality(memory.ss14Quality);
  return Boolean(quality && memory.enhancement <= quality.maxLevel && (memory.randomAffixIds?.length ?? 0) <= quality.randomLimit);
}
