import { SS14_CURRENT_DATABASE } from './data/ss14CurrentDatabase.generated.js';
import { seasonGearSlotsForIndex } from './seasonGearSlots.js';
import { findItemById } from './catalog.js';

const weaponIndexes = new Map(SS14_CURRENT_DATABASE.inventory.filter(r=>r.category==='gear')
  .map(r=>[r.runtimeId,r.indexes.filter(index=>seasonGearSlotsForIndex(index).includes(0))]));
const firearms=['Pistol','Musket'];
const ranges=['Bow','Crossbow',...firearms,'Fire_Cannon'];
const families = {
  bows:['Bow'], crossbows:['Crossbow'], guns:firearms, firearms, cannons:['Fire_Cannon'], 'ranged weapons':ranges,
  swords:['One-Handed_Sword','Two-Handed_Sword'], axes:['One-Handed_Axe','Two-Handed_Axe'], hammers:['One-Handed_Hammer','Two-Handed_Hammer'],
  'one-handed swords':['One-Handed_Sword'], 'one-handed axes':['One-Handed_Axe'], 'one-handed hammers':['One-Handed_Hammer'],
  'two-handed axes':['Two-Handed_Axe'], 'two-handed hammers':['Two-Handed_Hammer'],
  claws:['Claw'], daggers:['Dagger'], cudgels:['Cudgel'], 'tin staffs':['Tin_Staff'], staffs:['Tin_Staff'],
  rods:['Rod'], scepters:['Scepter'], canes:['Cane'], wands:['Wand'], unarmed:['unarmed'],
};

export function seasonWeaponRestrictionIssue(build, card) {
  if(card?.season!=='SS14')return null;
  const header=card.detail?.split('\nSimple\n')[0];
  const line=header?.split('\n').find(text=>/^Limited to /iu.test(text));
  if(!line)return null;
  const requirement=line.slice('Limited to '.length).trim().toLowerCase().replace(/\.$/u,'');
  const dual=/^du(?:al|el)[ -]wielding /u.test(requirement);
  const parts=requirement.replace(/^du(?:al|el)[ -]wielding /u,'').split(/\s*,\s*|\s+and\s+/u).map(t=>t.replace(/^and\s+/u,''));
  if(parts.some(t=>!Object.hasOwn(families,t)))return '스킬의 SS14 무기 제한을 확인할 수 없습니다.';
  const allowed=new Set(parts.flatMap(t=>families[t]));
  const [main,off]=build.gear?.slots??[];
  const mainTypes=weaponIndexes.get(main?.itemId)??[];
  if(!main?.itemId){
    if(!off?.itemId&&allowed.has('unarmed')&&!dual)return null;
    return '스킬의 무기 제한에 맞는 메인 무기를 선택하세요.';
  }
  if(!mainTypes.length)return '메인 무기의 SS14 종류를 확인할 수 없습니다.';
  if(!mainTypes.some(t=>allowed.has(t)))return '메인 무기가 스킬의 무기 제한에 맞지 않습니다.';
  if(!dual)return null;
  const offTypes=weaponIndexes.get(off?.itemId)??[];
  return offTypes.some(t=>allowed.has(t)&&seasonGearSlotsForIndex(t).includes(1))&&findItemById(off?.itemId)?.tags?.includes('mainHand')
    ? null : '스킬의 무기 제한에 맞는 서브 무기를 선택하세요.';
}
