// Explicit economy-only text. Unknown clauses on the same card still block.
// Do not classify an arbitrary line as harmless merely because it mentions loot.
export function seasonNonCombatEffect(text) {
  const line=text.trim().replace(/\.$/u,'');
  // A missing loot number remains missing; it does not block combat DPS or
  // supply a zero to an economy calculator. No generic missing-number rule.
  return line==='+% Drop Quantity'
    || /^[+-]?\s*\d+(?:\.\d+)?\s*%\s*(?:additional |Increased )?(?:(?:[A-Za-z'-]+ )*(?:Drop Quantity|drop Rarity|Reward Quantity)(?: for Doll Securities| in the Overrealm)?|XP earned|XP lost upon death|XP falloff caused by the level difference between the player and the map)$/u.test(line)
    || /^Increases (?:Antidote Vial|Warden's Cache) Drop Quantity by \d+(?:\.\d+)? %$/u.test(line)
    || /^(?:Mistville Intel|Destiny|Colored Snow) dropped has a \d+(?:\.\d+)? % chance to be replicated once$/u.test(line)
    || /^[+]?\d+(?:\.\d+)? % Drop Quantity (?:from Wraiths|for TOWER Securities)$/u.test(line)
    || /^Dropped Pages of Aeterna have a \d+(?:\.\d+)? % chance to be replicated once$/u.test(line)
    || /^\+\d+(?:\.\d+)? % Quantity of Items dropped by Nightmare monsters$/u.test(line)
    || /^Member Services refresh attempts \+\d+$/u.test(line)
    || /^All Member Services gain an additional effect: When settling Clockwork Ballet Games, there is a \d+(?:\.\d+)?% chance to settle the rewards \d+ additional time\. This can only be triggered once \(takes effect immediately after selecting Member Services and lasts for the duration of this game\)$/u.test(line)
    || /^All Member Services gain an additional effect: Each time after completing Operation Cogwheel, there is a \d+(?:\.\d+)?% chance to get \d+ additional Cogwheel Voucher \(takes effect immediately after selecting Member Services and lasts for the duration of this game\)$/u.test(line)
    || /^When Strumming, there is a \d+(?:\.\d+)?% chance to buff all activated units, replicating their drops \d+ additional time$/u.test(line)
    || /^Bosses defeated: \d+(?:\.\d+)? % chance to drop \d+-\d+ additional random Embers$/u.test(line)
    || /^\d+(?:\.\d+)? % chance for defeated monsters to drop \d+ additional set\(s\) of random Flame Fuel$/u.test(line)
    || /^\d+(?:\.\d+)? % chance to unlock \d+ additional reward type\(s\) when the Dark Surge is initiated for the first time on a map$/u.test(line)
    || /^Fluorescent Memories dropped have a \d+(?:\.\d+)? % chance to be replicated \d+ time\(s\)$/u.test(line)
    || /^When replicated, all items dropped have a \d+(?:\.\d+)?% chance to be replicated \d+ additional time$/u.test(line)
    || /^All items dropped in the Overrealm have a \d+(?:\.\d+)? % chance to be replicated \d+ additional time\(s\)$/u.test(line)
    || /^There is a \d+(?:\.\d+)?% chance for rewards to be doubled when the player enters the reward gameplay in the City of Aeterna$/u.test(line)
    || /^When opening a Warden's Cache , all items dropped from it have a \d+(?:\.\d+)?% chance to be replicated \d+ additional time$/u.test(line)
    || /^When opening a Chest of Destiny in Fateful Contest , (?:there is a \d+(?:\.\d+)?% chance to double the Chest of Destiny rewards|doubled Chest of Destiny rewards have a \d+(?:\.\d+)?% chance to be tripled instead) \(takes effect immediately after entering Fateful Contest\)$/u.test(line);
}
