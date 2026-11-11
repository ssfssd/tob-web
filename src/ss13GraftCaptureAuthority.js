import { SS13_GRAFT_CAPTURE_AUTHORITY as authority } from './data/ss13GraftCaptureAuthority.generated.js';

// This supplements gaps in the legacy structural overlay from the official
// equipment's own SS13 tables, without borrowing ordinary-ring modifiers.
export function applySs13GraftCaptureAuthority(catalog, registry, sources = {}) {
  if (registry.metadata?.targetSeason !== 13 || authority.season !== 13
    || authority.sourceSeasonEvidence?.actualSeason !== 13
    || authority.sourceSeasonEvidence?.verificationComplete !== true) return {catalog, registry};
  const item = catalog.gear.find(item => item.id === authority.itemId);
  if (item?.craftRuntimeSupport !== 'verified-current-tlidb') return {catalog, registry};
  const refs = {...registry.refs};
  const affixes = item.craftAffixes.map(affix => ({...affix, tierOptions:[...affix.tierOptions]}));
  const families = new Map();
  let addedTiers = 0;
  for (const row of authority.rows) {
    const record = registry.records[row.recordKey];
    if (record?.status !== 'exact' || record.sourceModifierId !== row.modifierId
      || record.ko?.text !== row.text || record.ko?.renderTemplate !== row.renderTemplate
      || (sources[record.ko?.sourceRef]?.sourcePageSha256 ?? record.ko?.sourcePageSha256) !== authority.sourcePageSha256) continue;
    const family = row.modifierId.slice(0, -2);
    let affix = families.get(family);
    if (!affix) {
      affix = affixes.find(affix => affix.tierOptions.some(tier =>
        registry.records[registry.refs[tier.activeLocaleAliases?.tier]]?.ko?.renderTemplate === row.renderTemplate));
      if (!affix) {
        const affixId = `graft:tlidb-ss13-digits:${family}`;
        affix = {affixId, affixName:row.text, library:row.library, tierOptions:[],
          activeLocaleAliases:{affix:`craft-affix:${affixId}`}};
        refs[affix.activeLocaleAliases.affix] = row.recordKey;
        affixes.push(affix);
      }
      families.set(family, affix);
    }
    if (affix.tierOptions.some(tier => tier.tierLabel === `T${row.tier}`)) continue;
    const tierId = `${affix.affixId}:modifier:${row.modifierId}`;
    const tierAlias = `craft-tier:${tierId}`;
    refs[tierAlias] = row.recordKey;
    const rolls = Object.fromEntries(row.rolls.map(roll => {
      const alias = `craft-roll:${tierId}:${roll.key}`;
      refs[alias] = row.recordKey;
      return [roll.key, alias];
    }));
    affix.tierOptions.push({tierId,tierIndex:Number.parseInt(row.tier),tierLabel:`T${row.tier}`,requiredLevel:0,
      text:record.cn.text,renderTemplate:record.cn.renderTemplate,
      rollDefs:row.rolls.map(roll => ({...roll,label:row.text})),activeLocaleAliases:{tier:tierAlias,rolls},
      sourceModifierId:row.modifierId,sourcePageSha256:authority.sourcePageSha256});
    addedTiers++;
  }
  return {
    catalog:{...catalog,gear:catalog.gear.map(entry => entry === item ? {...item,craftAffixes:affixes} : entry)},
    registry:Object.freeze({...registry,refs:Object.freeze(refs),metadata:Object.freeze({...registry.metadata,
      activeCounts:Object.freeze({...registry.metadata.activeCounts,refs:Object.keys(refs).length}),
      graftCaptureSupplement:Object.freeze({season:13,itemId:item.id,addedTiers,sourceUrl:authority.sourceUrl,
        sourcePageSha256:authority.sourcePageSha256})})}),
  };
}
