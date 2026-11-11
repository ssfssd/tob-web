// Group repeated calculation diagnostics by the place where the user can act.
// Keep every original diagnostic; grouping never changes calculation support.
const routes = [
  { id: 'shotgun', label: '보조 스킬·반복 적중 조건', section: 'skills', pattern: /같은 적에 적중|반복 적중마다 누적 점프|적중 전 점프 횟수|후속 적중까지 걸린 시간/u },
  { id: "gear", label: "장비 옵션 수치", section: "gear", pattern: /장비 옵션 수치를 입력/u },
  { id: "log-review", label: "로그에 없는 구성 확인", section: "combat", role: "season-dps-input", pattern: /로그에 없는/u },
  { id: "traits", label: "히어로 특성·단계", type: "traits", pattern: /특성.*(?:선택|단계)|기본 특성/u },
  { id: "slates", label: "석판 옵션", section: "divinity", pattern: /신성의 일각|추락하는 별빛|석판.*옵션/u },
  { id: "attributes", label: "캐릭터 기본 수치", section: "combat", role: "season-character-input", pattern: /주 속성 수치|기본 힘|기본 민첩|기본 지혜/u },
  { id: "elixirs", label: "영약 조건", section: "skills", type: "extensions", role: "native-extension-conditions", pattern: /영약|재료|방황|불길 저주|오멘/u },
  { id: "modules", label: "모듈·소환체 조건", section: "skills", type: "extensions", role: "native-extension-conditions", pattern: /모듈|소환체|오라 범위|처형 대상/u },
  { id: "combat", label: "스킬·대상 전투 조건", section: "combat", role: "season-dps-input", pattern: /전투 입력|시전 시간 배분|대상 적중률|적 아머|유효.*저항|DPS 공식|전체 DPS(?:를)? 산출/u },
];
export function seasonInputRequirements(report) {
  const groups = new Map();
  for (const diagnostic of new Set(report?.fullDps?.blockers ?? [])) {
    const route = routes.find(r => r.pattern.test(diagnostic)) ?? { id: "effects", label: "효과·조건 확인", section: "combat" };
    if (!groups.has(route.id)) groups.set(route.id, { ...route, diagnostics: [] });
    groups.get(route.id).diagnostics.push(diagnostic);
  }
  return [...groups.values()];
}
