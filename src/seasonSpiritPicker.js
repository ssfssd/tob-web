// UI group labels are not game effect translations. Effect text below is kept
// verbatim from the verified Korean SS14 spirit page.
export const SPIRIT_PICKER_GROUPS = [
  ['attack','공격'], ['spell','주술'], ['minion','소환'], ['dot','지속·상태 이상'],
  ['defense','생존'], ['projectile','투사체'], ['fire','화염'], ['cold','냉기'],
  ['lightning','번개'], ['erosion','부식'], ['terra','지면'], ['drop','드롭'], ['other','기타'],
];
export const normalizeSpiritSearch = value => String(value??'').normalize('NFKC').toLocaleLowerCase('ko').replace(/\s/gu,'');
const safeKorean = value => typeof value==='string' && /[가-힣]/u.test(value) && !/\p{Script=Han}/u.test(value);

export function spiritPickerEntry(option) {
  const parsed=option.korean.parsed;
  const inner=option.page.parsed.rings.filter(r=>/^innerRing/u.test(r.slotId)).map(r=>r.name).join(' ');
  const primary=option.page.parsed.rings.find(r=>r.slotId==='innerRing1')?.name??'';
  const group=option.drop?'drop'
    : /Fire Damage/u.test(primary)?'fire' : /Cold Damage/u.test(primary)?'cold'
    : /Lightning Damage/u.test(primary)?'lightning' : /Erosion Damage/u.test(primary)?'erosion'
    : /Terra Damage/u.test(primary)?'terra' : /Projectile Damage/u.test(primary)?'projectile'
    : /Servant|Spirit Magus/u.test(primary)?'minion'
    : /Damage Over Time|Ailment|Reaping/u.test(primary)?'dot'
    : /Max Life|Max Energy Shield|Elemental Resistance/u.test(primary)?'defense'
    : /Spell|Cast Speed/u.test(inner)&&!/Attack/u.test(primary)?'spell'
    : /Attack|Double Damage/u.test(primary)?'attack':'other';
  const effects=[...new Set(parsed.rings.filter(r=>/^innerRing/u.test(r.slotId)).map(r=>r.effect).filter(safeKorean))];
  const fullText=[option.name,...parsed.rings.flatMap(r=>[r.name,r.effect]),parsed.mainAffix?.name,...parsed.levelAffixes.flatMap(r=>r.affixes)].filter(safeKorean).join(' ');
  return {option,group,effects,search:normalizeSpiritSearch(fullText)};
}

export function spiritPickerMatches(entry,query='',group='all') {
  return (group==='all'||entry.group===group)&&entry.search.includes(normalizeSpiritSearch(query));
}

export function filterSpiritPicker(root,query,group='all') {
  const cards=[...root.querySelectorAll('[data-spirit-search]')];
  for(const card of cards)card.hidden=!spiritPickerMatches({group:card.dataset.spiritGroupKey,search:card.dataset.spiritSearch},query,group);
  for(const section of root.querySelectorAll('[data-spirit-group]')){
    const count=[...section.querySelectorAll('[data-spirit-search]')].filter(card=>!card.hidden).length;
    section.hidden=!count;
    section.querySelector('[data-spirit-group-count]').textContent=String(count);
  }
  const count=cards.filter(card=>!card.hidden).length;
  const total=root.querySelector('[data-spirit-count]');if(total)total.textContent=String(count);
  const empty=root.querySelector('[data-spirit-empty]');if(empty)empty.hidden=!!count;
  return count;
}
