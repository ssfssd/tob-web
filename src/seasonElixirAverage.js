// Time-weight final scenario outputs, never non-linear stats or MORE modifiers.
// Only one elixir is supported: marginal uptimes do not determine joint uptime.
export function calculateElixirAverage(build, projection, calculateState) {
  const rows = projection.rows.filter(r => r.elixirState);
  const result = { supported: false, uptime: null, activeDps: null, inactiveDps: null, expectedDps: null, blockers: [],
    limitation: "영약 하나의 관측 유지율로 활성·비활성 상태의 최종 부분 DPS를 평균냅니다. 자동 충전 시뮬레이션·전체 빌드 DPS가 아니며 나머지 조건은 두 상태에서 같다고 가정합니다." };
  if (!rows.length) { result.blockers.push("선택 영약이 없습니다."); return result; }
  if (rows.length !== 1 || (build.skills?.elixirs ?? []).filter(s => s?.skillId).length !== 1) { result.blockers.push("여러 영약의 동시 활성 시간 분포를 알 수 없어 평균내지 않습니다."); return result; }
  const row = rows[0]; const state = row.elixirState;
  if (state.uptime === "" || state.enabled === "" || state.scale === "") result.blockers.push("영약의 활성 상태·효과 배율·관측 유지율을 확인하세요.");
  if (row.blockers.length || projection.rows.some(r => r.path.startsWith(`${row.path}.`) && r.blockers.length)) result.blockers.push("선택 영약 또는 재료의 미해석 효과가 있어 유지율 평균은 미지원입니다.");
  if (result.blockers.length) return result;
  result.uptime = state.uptime;
  for (const enabled of [0, 1]) {
    const input = structuredClone(build);
    input.ss14Inputs.extensionInputs[`elixir:${state.index}:active`].value = enabled;
    const report = calculateState(input);
    if (report.componentProjection.rows.some(r => (r.path === row.path || r.path.startsWith(`${row.path}.`)) && r.blockers.length))
      result.blockers.push("활성·비활성 상태의 영약·재료 조건을 모두 확인해야 합니다.");
    const value = report.offense.rows.find(r => r.rowIndex === 0)?.values.expectedDps;
    if (!Number.isFinite(value)) result.blockers.push("활성·비활성 상태 중 계산할 수 없는 DPS가 있습니다.");
    else result[enabled ? "activeDps" : "inactiveDps"] = value;
  }
  result.supported = !result.blockers.length;
  if (result.supported) result.expectedDps = result.activeDps * state.uptime / 100 + result.inactiveDps * (1 - state.uptime / 100);
  return result;
}
