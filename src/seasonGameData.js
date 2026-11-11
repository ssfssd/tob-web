import { SS14_GAME_CRITICAL } from "./data/ss14GameCritical.generated.js";
import { SS14_ICE_LANCES_CRITICAL } from "./data/ss14IceLancesCritical.generated.js";

const receipts = [SS14_GAME_CRITICAL, SS14_ICE_LANCES_CRITICAL];

export function seasonGameCritical(record) {
  return receipts.find(data => record?.season === "SS14" && record.itemId === data.itemId
    && record.sourcePageSha256 === data.cardSha256) ?? null;
}

export function validGameCriticalBinding(binding) {
  if (binding?.gameDataReceipt === undefined) return true;
  return receipts.some(data => binding.gameDataReceipt === data.receiptSha256
    && binding.itemId === data.itemId && binding.sourcePageSha256 === data.cardSha256
    && binding.baseCriticalRating === data.baseCriticalRating);
}
