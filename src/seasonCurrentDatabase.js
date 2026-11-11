import { SS14_CURRENT_DATABASE } from "./data/ss14CurrentDatabase.generated.js";
import { SS14_CARDS } from "./data/ss14Cards.generated.js";
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { SS14_GEAR_EN } from "./data/ss14Gear.en.generated.js";
import { SS14_SUPPORTS } from "./data/ss14Supports.generated.js";
import { SS14_SUPPORTS_EN } from "./data/ss14Supports.en.generated.js";
import { SS14_LOG_COMPLETION } from "./data/ss14LogCompletion.generated.js";
import { SS14_LOG_GEAR } from "./data/ss14LogGear.generated.js";
import { SS14_COMPONENTS } from "./data/ss14Components.generated.js";
import { SS14_SPIRIT_NAMES } from "./data/ss14SpiritNames.generated.js";
import { seasonGearMetadata } from './seasonGearSlots.js';

// Correct source-index compatibility in memory, without migrating saved builds.
for(const identity of SS14_CURRENT_DATABASE.identities.filter(i=>i.categoryId==='gear')) {
  const source=SS14_CURRENT_DATABASE.inventory.find(r=>r.runtimeId===identity.id);
  if(!source)continue;
  const metadata=seasonGearMetadata(source.indexes);
  identity.slots=metadata.slots;
  identity.tags=[...new Set([...(identity.tags??[]),...metadata.tags])];
}

const verified = record => record?.season === "SS14" && record.status === "collected-preview";
// Equivalent cards keep their receipt. Changed cards invalidate the old binding
// until the user reselects them; persisted source builds are never rewritten.
for (const [id, locales] of Object.entries(SS14_CURRENT_DATABASE.records)) {
  const category = locales.en.category;
  const en = category === "gear" ? SS14_GEAR_EN : category === "supports" ? SS14_SUPPORTS_EN : SS14_CARDS_EN;
  const ko = category === "supports" ? SS14_SUPPORTS : SS14_CARDS;
  if (!verified(en.records[id]) || locales.en.supersedesHash === en.records[id]?.sourcePageSha256) en.records[id] = locales.en;
  if (locales.ko && (!verified(ko.records[id]) || locales.ko.supersedesHash === ko.records[id]?.sourcePageSha256)) ko.records[id] = locales.ko;
}
for (const data of [SS14_CARDS, SS14_CARDS_EN, SS14_GEAR_EN, SS14_SUPPORTS, SS14_SUPPORTS_EN]) {
  data.requested = Object.keys(data.records).length;
  data.collected = Object.values(data.records).filter(verified).length;
}
for (const [id, table] of Object.entries(SS14_CURRENT_DATABASE.levels))
  if (!SS14_LOG_COMPLETION.levels[id] || SS14_CURRENT_DATABASE.records[id]?.en.supersedesHash) SS14_LOG_COMPLETION.levels[id] = table;
for (const [id, record] of Object.entries(SS14_CURRENT_DATABASE.gear))
  if (!SS14_LOG_GEAR.records[id]) SS14_LOG_GEAR.records[id] = record;
for (const [url, page] of Object.entries(SS14_CURRENT_DATABASE.componentPages))
  if (!SS14_COMPONENTS.pages[url]) SS14_COMPONENTS.pages[url] = page;
for (const identity of SS14_CURRENT_DATABASE.spiritIdentities ?? []) {
  const index = SS14_COMPONENTS.spiritIdentities.findIndex(i => i.catalogId === identity.catalogId);
  if (index < 0) SS14_COMPONENTS.spiritIdentities.push(identity);
  else SS14_COMPONENTS.spiritIdentities[index] = identity;
}
for (const identity of SS14_CURRENT_DATABASE.heroIdentities ?? [])
  if (!SS14_COMPONENTS.heroIdentities.some(i => i.catalogId === identity.catalogId)) SS14_COMPONENTS.heroIdentities.push(identity);
Object.assign(SS14_SPIRIT_NAMES, SS14_CURRENT_DATABASE.spiritNames);

export const SS14_CURRENT_IDENTITIES = SS14_CURRENT_DATABASE.identities;
