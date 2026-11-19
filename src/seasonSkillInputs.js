import { SS14_CARDS_EN } from './data/ss14Cards.en.generated.js';
import { seasonGameCritical } from './seasonGameData.js';
import { seasonOffenseRulePins } from './seasonOffense.js';

export const PERIODIC_BURST_INPUT = '0:periodicBurstUptime';
export const readPeriodicBurstUptime = dps => dps?.periodicBurstUptime ?? dps?.skills?.[0]?.periodicBurstUptime;
export function writePeriodicBurstUptime(dps,value) {
  if(dps.skills?.[0])delete dps.skills[0].periodicBurstUptime;
  if(value==='')delete dps.periodicBurstUptime;
  else dps.periodicBurstUptime=value;
}
export const hasPeriodicBurstSupport = (components=[]) => components.some(c => c.category==='supports'
  && c.calculations?.some(entry=>entry.mechanics?.some(m=>m.kind==='periodic-burst')));

// Only encounter choices whose meaning is independent of the selected skill
// can survive replacement. Proc rates, weapon values and minion bases cannot.
export function rebindSeasonSkillInputs(inputs, index, id) {
  const old = inputs.dps?.skills?.[index];
  if(index===0&&old?.periodicBurstUptime!==undefined)
    writePeriodicBurstUptime(inputs.dps,readPeriodicBurstUptime(inputs.dps));
  if (inputs.offense) delete inputs.offense[index];
  if (inputs.dps?.skills) delete inputs.dps.skills[index];
  const record = SS14_CARDS_EN.records[id];
  if (!id || record?.season !== 'SS14') return;
  if (old) {
    const common = Object.fromEntries(['useShare', 'hitChance'].filter(key => Number.isFinite(old[key]) && old[key] >= 0 && old[key] <= 100)
      .map(key => [key, old[key]]));
    if (Object.keys(common).length) inputs.dps.skills[index] = { itemId:id, sourcePageSha256:record.sourcePageSha256, ...common };
  }
  const critical = seasonGameCritical(record);
  if (critical) {
    inputs.offense ??= {};
    inputs.offense[index] = { itemId:id, sourcePageSha256:record.sourcePageSha256,
      baseCriticalRating:critical.baseCriticalRating, gameDataReceipt:critical.receiptSha256 };
    inputs.offenseRuleReceipts = seasonOffenseRulePins();
  }
}
