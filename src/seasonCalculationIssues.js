// Cause classification is presentation/audit metadata only. It cannot turn a
// blocked calculation into a supported one or replace an unknown effect by 0.
export const SEASON_ISSUE_LABELS = {
  input: '입력 필요', compatibility: '구성·호환 확인', source: '수치·근거 부족',
  parsing: '효과 문구 해석 필요', integration: '효과 연결 필요', model: '계산 미지원', unresolved: '원인 확인 필요',
};
export function seasonIssueCause(value) {
  const reason = typeof value === 'string' ? value : value?.reason ?? value?.inactiveReason ?? '';
  if (/^(?:tlidb-effect-(?:stat|operation)-unmapped|tlidb-condition-input-unmapped|conditional-input-mapping-unavailable|tlidb-per-unit-input-unavailable)$/u.test(reason)) return 'integration';
  if (/^(?:conditional|per-unit|capped)-effect-pattern-unsupported$|^unsupported-numeric-tooltip-clause$|^calculation-mechanic-without-structured-value$/u.test(reason)) return 'parsing';
  if (/^unsupported-nonnumeric-mechanic-or-flavor$|호환 조건·효과 해석 미완료/u.test(reason)) return 'unresolved';
  if (/^range-value-requires-selected-roll$|^attack-base-damage-unavailable$/u.test(reason)) return 'input';
  if (/^spell-base-damage-unavailable$|^level-formula-pattern-unsupported$/u.test(reason)) return 'source';
  if (/^(?:trigger|stacking|skill-support)-runtime-required$|^legendary-runtime-mechanic$/u.test(reason)) return 'model';
  if (/출처 충돌|원문.*충돌|source.*conflict|ss14-level-row-unavailable|레벨.*수치.*(?:없|미확보)|수치.*근거.*미확보|동일.*카드 미확보|원문 미확보/u.test(reason)) return 'source';
  if (/호환|장착할 수|중복|상한.*초과|초과.*상한|배치.*(?:범위|충돌)|봉인 합.*초과|메인 스킬을.*교체|선택 ID를 찾지/u.test(reason)) return 'compatibility';
  if (/입력|선택하세요|확인하세요|값을 선택|범위에서 직접 확인|원문 근거가 바뀌|원문 연결을 다시/u.test(reason)
    && !/미지원|해석.*미완료|계산.*미완료|범위를 벗어났습니다/u.test(reason)) return 'input';
  if (/unsupported|unmapped|unresolved|미지원|미완료|미연결|연결되지 않은 효과|연산 미확인|분리.*필요|별도 계산.*필요/u.test(reason)) return 'model';
  return 'unresolved';
}
export function seasonCalculationIssues(report) {
  const groups=new Map();
  for(const reason of new Set(report?.fullDps?.blockers??[])) {
    const cause=seasonIssueCause(reason);
    if(!groups.has(cause))groups.set(cause,{cause,label:SEASON_ISSUE_LABELS[cause],reasons:[]});
    groups.get(cause).reasons.push(reason);
  }
  return [...groups.values()];
}

export function seasonDpsStatusLabel(report) {
  const groups = seasonCalculationIssues(report);
  if (groups.length === 1) return groups[0].label;
  return groups.length ? '입력·효과 확인 필요' : '계산 확인 필요';
}
