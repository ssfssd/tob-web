import { SS14_CRAFT } from './data/ss14Craft.generated.js';
import { SS14_CURRENT_DATABASE } from './data/ss14CurrentDatabase.generated.js';
import { getSeasonSelectionRecord } from './seasonSelections.js';

const indexes = new Map(SS14_CURRENT_DATABASE.inventory.filter(r => r.category === 'gear').map(r => [r.runtimeId, r.indexes]));
const keysByPage=new Map();
for (const [key,identity] of Object.entries(SS14_CRAFT.identities)) {
  if (!keysByPage.has(identity.slug)) keysByPage.set(identity.slug,[]);
  keysByPage.get(identity.slug).push(key);
}
function baseGearPage(id) {
  const pages=indexes.get(id)??[];
  if(pages.includes('Legendary_Gear'))return null;
  const tags=getSeasonSelectionRecord('gear',id)?.tags??[];
  const matching=pages.filter(slug=>tags.includes(slug.replaceAll('_',' ')) && SS14_CRAFT.pages['en/'+slug]?.season==='SS14');
  return matching.length===1?matching[0]:null;
}
export function itemGearKind(id) {
  const pages = indexes.get(id);
  if (pages?.includes('Legendary_Gear')) return 'legendary';
  return baseGearPage(id)?'base':'';
}

const options = new Map();
export function craftOptions(id) {
  if (options.has(id)) return options.get(id);
  const rows = [];
  const slug=baseGearPage(id);
  if (slug) for (const key of SS14_CRAFT.gear[id] ?? keysByPage.get(slug) ?? []) {
    const identity = SS14_CRAFT.identities[key];
    if(identity?.slug!==slug)continue;
    const family = identity?.affixId.split(':')[1];
    if (!['craft_prefix', 'craft_suffix'].includes(family)) continue;
    const page = SS14_CRAFT.pages['ko/' + identity.slug];
    const row = page?.rows.find(r => r.id === identity.modifierId);
    if (row && SS14_CRAFT.pages['en/'+slug].rows.some(r=>r.id===row.id) && !/\p{Script=Han}/u.test(row.text)) rows.push({ ...identity, key, family, name: (family === 'craft_prefix' ? '접두' : '접미') + ' · T' + row.tier + ' · ' + row.text });
  }
  options.set(id, rows);
  return rows;
}
