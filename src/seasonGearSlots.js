// Source index -> the editor's stable slot order. Never move a saved item.
export function seasonGearSlotsForIndex(slug) {
  if(/(?:Helmet|Head)$/u.test(slug))return [2];
  if(/(?:Chest_Armor|Chest)$/u.test(slug))return [3];
  if(/(?:Gloves|Hands)$/u.test(slug))return [5];
  if(/(?:Boots|Legs)$/u.test(slug))return [9];
  if(/Shield$/u.test(slug))return [1];
  if(/(?:Necklace|Neck)$/u.test(slug))return [4];
  if(/(?:Ring|Digits)$/u.test(slug))return [7,8];
  if(/(?:Belt|Waist)$/u.test(slug))return [6];
  if(/^(?:Claw|Dagger|One-Handed_\w+|Wand|Rod|Scepter|Cane|Pistol)$/u.test(slug))return [0,1];
  if(/^(?:Two-Handed_\w+|Tin_Staff|Cudgel|Bow|Crossbow|Musket|Fire_Cannon)$/u.test(slug))return [0];
  return [];
}

export function seasonGearMetadata(indexes) {
  const slots=[...new Set(indexes.flatMap(seasonGearSlotsForIndex))];
  const tags=[];
  if(slots.includes(0))tags.push('mainHand',slots.includes(1)?'oneHand':'twoHand');
  else if(slots.includes(1))tags.push('offHand');
  for(const [slot,tag] of [[2,'helmet'],[3,'bodyArmor'],[4,'amulet'],[5,'gloves'],[6,'belt'],[7,'ring'],[9,'boots']])
    if(slots.includes(slot))tags.push(tag);
  return {slots,tags};
}
