// SS14 installed mount 6346940, config_c 1249/1250 → config_char_buff
// 55300–55303. Effects 851405/560655/602222 feed armor/elemental/erosion
// attributes 4001/5741/5401. Values are the level buff at base effect scale.
export const trainingDummyLevels = [
  { level: 40, armor: 7321, resistance: 10 },
  { level: 60, armor: 12330, resistance: 15 },
  { level: 75, armor: 18570, resistance: 20 },
  { level: 85, armor: 27270, resistance: 30 },
];

const resistances = ["fire", "cold", "lightning", "erosion"];
export function matchingTrainingDummy(enemy) {
  return trainingDummyLevels.find(row => enemy?.armor === row.armor && resistances.every(key => enemy[key] === row.resistance));
}
export function renderTrainingDummyPicker(enemy) {
  const preset=matchingTrainingDummy(enemy);
  const custom=enemy && ['armor',...resistances].some(key=>Number.isFinite(enemy[key]));
  return `<label>허수아비 방어 적용<select data-role="training-dummy-picker" data-season-edit="dummy-level" aria-label="허수아비 방어 적용">
    <option value=""${preset ? "" : " selected"} disabled>${custom ? "직접 설정한 방어" : "레벨 선택"}</option>
    ${trainingDummyLevels.map(({ level, armor, resistance }) =>
      `<option value="${level}"${level===preset?.level ? " selected" : ""}>${level}레벨 · 아머 ${armor.toLocaleString('ko-KR')} · 저항 ${resistance}%</option>`).join('')}
    </select></label><details data-role="training-dummy-rule"><summary>허수아비 방어 기준</summary><p>마을 허수아비의 레벨 효과에 따른 아머와 화염·냉기·번개·부식 저항을 적용합니다. 관통은 계산 시 반영합니다.</p></details>`;
}
