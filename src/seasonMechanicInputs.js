import { SS14_MECHANICS } from "./data/ss14Mechanics.generated.js";

export const SEASON_HERO_COMBAT_FIELDS = {
  coreExtraSentries: { label: "추가된 최대 센트리 수", min: 0, max: 100, integer: true },
  boonActive: { label: "신의 은총 버프 적용 중 (0 또는 1)", min: 0, max: 1, integer: true },
  boonFocus: { label: "첫 은총에서 소모한 집요한 축복 중첩", min: 0, max: 100, integer: true },
  boonAtMax: { label: "첫 은총에서 최대 중첩을 소모함 (0 또는 1)", min: 0, max: 1, integer: true },
  boonActiveSecond: { label: "무결한 예언의 두 번째 은총 적용 중 (0 또는 1)", min: 0, max: 1, integer: true },
  boonFocusSecond: { label: "두 번째 은총에서 소모한 집요한 축복 중첩", min: 0, max: 100, integer: true },
  boonAtMaxSecond: { label: "두 번째 은총에서 최대 중첩을 소모함 (0 또는 1)", min: 0, max: 1, integer: true },
  legendaryMediumTalents: { label: "분배한 레전드 중위 재능 수", min: 0, max: 100, integer: true },
  signal: { label: "기발 시그널이 대상에게 적용됨", min: 0, max: 1, integer: true },
  whimsy: { label: "현재 기발 중첩", min: 0, max: 8, integer: true },
  empowers: { label: "현재 적용 중인 자극 또는 실드 스킬 수", min: 0, max: 20, integer: true },
  overloads: { label: "창의 오버로드 실제 발동 횟수 (초당)", min: 0, max: 100 },
  burstActivations: { label: "일반 시전의 매직 버스트 실제 발동 횟수 (초당)", min: 0, max: 100 },
};
export const validCombatValue = (field, value) => field && typeof value === "number" && Number.isFinite(value)
  && value >= field.min && value <= field.max && (!field.integer || Number.isInteger(value));
export const seasonMechanicPins = () => Object.fromEntries(Object.values(SS14_MECHANICS.pages).filter(p => p.locale === "en").map(p => [p.sourceUrl, p.sourcePageSha256]));
export function mechanicPage(build, slug) {
  const page = SS14_MECHANICS.pages[`en/${slug}`];
  return page?.season === "SS14" && build.ss14Inputs?.mechanicReceipts?.[page.sourceUrl] === page.sourcePageSha256 ? page : null;
}
export function validHeroCombatInputs(inputs) {
  const value = inputs.heroCombat;
  if (value !== undefined && (!value || typeof value !== "object" || Array.isArray(value)
    || !Object.entries(value).every(([key, n]) => validCombatValue(SEASON_HERO_COMBAT_FIELDS[key], n)))) return false;
  return inputs.mechanicReceipts === undefined || inputs.mechanicReceipts && typeof inputs.mechanicReceipts === "object"
    && !Array.isArray(inputs.mechanicReceipts) && Object.entries(inputs.mechanicReceipts).every(([url, hash]) => Object.hasOwn(seasonMechanicPins(), url) && /^[a-f0-9]{64}$/u.test(hash));
}
