// Official hero showcase, reviewed 2026-10-15. Artwork only; never a game-value source.
// https://torchlight.xd.com/us
// torchlight-heroes-v2@3.11.0, specialty.id -> current TLIDB branch ID.
const cdn = "https://website.xdcdn.net/";
const legacy = "homepage/torchlight/imgs/v2.0/mobile/lie/";
export const INGAME_HERO_ART = Object.freeze(Object.fromEntries([
  ["anger", "rehan_1", "poster/227017/sS11_stg2/N08axqIm.png"],
  ["seething-silhouette", "rehan_2", `${legacy}rehan_2.png`],
  ["ranger-of-glory", "carino_1", "poster/227017/sS11_stg2/N08ax6KG.png"],
  ["lethal-flash", "carino_2", `${legacy}carino_2.png`],
  ["zealot-of-war", "carino_3", `${legacy}carino_3.png`],
  ["wind-stalker", "erika_1", `${legacy}erika_1.png`],
  ["lightning-shadow", "erika_2", `${legacy}erika_2.png`],
  ["vendetta-27s-sting", "erika_3", "poster/227017/sS11_stg2/N0RnGMp2.png"],
  ["blast-nova", "bing_1", `${legacy}bing_1.png`],
  ["creative-genius", "bing_2", "poster/172664/ss10/homepage/LuM0qM4I.png"],
  ["flame-of-pleasure", "gemma_4", "poster/172664/homepage/APrd0fCi.png"],
  ["frostbitten-heart", "gemma_2", `${legacy}gemma_2.png`],
  ["ice-fire-fusion", "gemma_1", "poster/227017/sS11_stg2/N08axc4L.png"],
  ["wisdom-of-the-gods", "thea_1", `${legacy}thea_1.png`],
  ["incarnation-of-the-gods", "thea_2", `${legacy}thea_2.png`],
  ["blasphemer", "thea_3", "poster/227017/homepage/ss8/JOyhNs0s.png"],
  ["spacetime-illusion", "youga_1", `${legacy}youga_1.png`],
  ["spacetime-elapse", "youga_2", "homepage/torchlight/imgs/pc/hero/role_youga_2.png"],
  ["order-calling", "moto_1", `${legacy}moto_1.png`],
  ["charge-calling", "moto_2", `${legacy}moto_2.png`],
  ["high-court-chariot", "rosa_1", "poster/172664/homepage/BDo3Gwqq.png"],
  ["unsullied-blade", "rosa_2", "poster/172664/ss9/KcEpH2zr.png"],
  ["growing-breeze", "iris_1", "poster/172664/homepage/APrL5Zvq.png"],
  ["vigilant-breeze", "iris_2", "poster/172664/ss10/homepage/LvNHRqpU.png"],
  ["sing-with-the-tide", "selena_1", "poster/172664/homepage/GaM3xfnD.png"],
  ["licorice-note", "sage_1", "poster/172664/ss12/stg_2/OoQ5fc0k.png"],
].map(([slug, officialId, path]) => [
  `hero-tlidb-com-cn-${slug}`,
  Object.freeze({ officialId, sourceUrl: `${cdn}${path}`, localPath: `./assets/ingame-heroes/${officialId}.png` }),
])));

export function getIngameHeroArt(heroId) {
  return INGAME_HERO_ART[heroId]?.localPath ?? null;
}
