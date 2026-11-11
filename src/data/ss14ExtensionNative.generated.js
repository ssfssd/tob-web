// Current installed table evidence. REA evidence identifies the executable; tables are parsed by the scoped reader.
export const SS14_EXTENSION_NATIVE = {
  "season": "SS14",
  "latestMount": 6173858,
  "buffPatch": 6163611,
  "buffSha256": "a621d24461158011413ae1d88444f12bf16cb21f1441b562cd2e545b4b4cb928",
  "skillSha256": "a9e40d447ea4bf3b8e0d4e5b2b5435abb2d31ff0ea1e4695d123e5b6f49b1fb1",
  "reaEvidence": "ev_b3201a2ce80d833c83af9fe7742ab8eb68282889006444d2f21f27b0e498cb45",
  "infiltration": {
    "fire": {
      "id": 3441,
      "bucket": 58,
      "offset": 2010,
      "action": "[101010552{P1:13};101010005{P1:-8}]",
      "duration": 10,
      "moreTaken": 13,
      "rangeSha256": "19bf1c93dce7b6d4af337a97e681f5b76c70677026d86b5dce9ee47829c8056c",
      "receipt": {
        "sourceUrl": "https://tlidb.com/en/Fire_Infiltration",
        "sourcePageSha256": "b4ca9163113e01d30bc4de277c58bfee216e8df6323271ed4557a687fc31bc8c",
        "locale": "en",
        "slug": "Fire_Infiltration",
        "season": "SS14",
        "title": "Fire Infiltration",
        "body": "Additionally increases Fire Damage taken by 13%. Reduces Skill Area by 8%\n\nInfiltration\n\nIncludes Cold Infiltration, Fire Infiltration, and Lightning Infiltration\n\nFire Protocol\n\nInflicts Fire Infiltration when Minions summoned by this skill deal Fire Damage\n\nFire Explosion\n\nThis skill inflicts Fire Infiltration upon dealing damage\n\nBlazing Meteor\n\nInflicts Fire Infiltration when this skill hits, and +100% Fire Infiltration Effect",
        "rootReceipt": {
          "sourceUrl": "https://tlidb.com/en/",
          "sourcePageSha256": "7e843138b38010082b813189edb9820d592155831d89ca0286b3abb9f6eb2345"
        },
        "anchorReceipt": {
          "sourceUrl": "https://tlidb.com/en/Ring_of_Ice",
          "sourcePageSha256": "72a713e969cb118695a3fc3e07d435d7d6c7ed90f6e1511c00e46121d92d13af"
        }
      }
    },
    "cold": {
      "id": 3451,
      "bucket": 68,
      "offset": 1570,
      "action": "[465133{P1:13};200000402{P1:-5}]",
      "duration": 10,
      "moreTaken": 13,
      "rangeSha256": "d57927d4a86ed4b3d3f7cfd0bed443ef1ebf10dcbdcbd7a4b2e40916517b4020",
      "receipt": {
        "sourceUrl": "https://tlidb.com/en/Cold_Infiltration",
        "sourcePageSha256": "d5a9872b7962bcaf83141b2dd9ab44ddff06eef3d81da7129258a7a3c29ec64b",
        "locale": "en",
        "slug": "Cold_Infiltration",
        "season": "SS14",
        "title": "Cold Infiltration",
        "body": "Reduces Cold Resistance by 10%\n\nAdditionally increases Cold Damage taken by 13%. Reduces Movement Speed by 5%\n\nInfiltration\n\nIncludes Cold Infiltration, Fire Infiltration, and Lightning Infiltration\n\nCold Protocol\n\nInflicts Cold Infiltration when Minions summoned by this skill deal Cold Damage\n\nGlacial Freeze\n\nInflicts Cold Infiltration when this skill deals damage to enemies with 1 or more Frostbite Rating",
        "rootReceipt": {
          "sourceUrl": "https://tlidb.com/en/",
          "sourcePageSha256": "7e843138b38010082b813189edb9820d592155831d89ca0286b3abb9f6eb2345"
        },
        "anchorReceipt": {
          "sourceUrl": "https://tlidb.com/en/Ring_of_Ice",
          "sourcePageSha256": "72a713e969cb118695a3fc3e07d435d7d6c7ed90f6e1511c00e46121d92d13af"
        }
      }
    },
    "lightning": {
      "id": 3461,
      "bucket": 78,
      "offset": 1629,
      "action": "[101010553{P1:13};512314{P1:-5}]",
      "duration": 10,
      "moreTaken": 13,
      "rangeSha256": "eaadd868634bd94b7d411bb5a2435101e33b5a4dafea219a55fe4f15f01f3db3",
      "receipt": {
        "sourceUrl": "https://tlidb.com/en/Lightning_Infiltration",
        "sourcePageSha256": "9435be1ef8ee60e4b70ca88ecf92a4ba57a8c886c6505656b9003e879ad2b7a2",
        "locale": "en",
        "slug": "Lightning_Infiltration",
        "season": "SS14",
        "title": "Lightning Infiltration",
        "body": "Additionally increases Lightning Damage taken by 13%. Reduces Attack Speed by 5%\n\nInfiltration\n\nIncludes Cold Infiltration, Fire Infiltration, and Lightning Infiltration\n\nLightning Protocol\n\nInflicts Lightning Infiltration when Minions summoned by this skill deal Lightning Damage\n\nHigh Voltage\n\nInflicts Lightning Infiltration when this skill lands a Critical Strike",
        "rootReceipt": {
          "sourceUrl": "https://tlidb.com/en/",
          "sourcePageSha256": "7e843138b38010082b813189edb9820d592155831d89ca0286b3abb9f6eb2345"
        },
        "anchorReceipt": {
          "sourceUrl": "https://tlidb.com/en/Ring_of_Ice",
          "sourcePageSha256": "72a713e969cb118695a3fc3e07d435d7d6c7ed90f6e1511c00e46121d92d13af"
        }
      }
    }
  },
  "actions": {
    "Blitz_Strike": {
      "stone": 2642,
      "native": 567472,
      "bucket": 494,
      "offset": 1644,
      "graphSha256": "cb5dfccb16d797b301b93de3fd1d3c5fc09e83c3d2280875024873763363ccf7"
    },
    "Burst_Hammer": {
      "stone": 2643,
      "native": 734152,
      "bucket": 495,
      "offset": 1755,
      "graphSha256": "c6d1cfd2009929e0d4a9ce9a4e081a3b14595a7d6b81c83537683a485479cbe9"
    },
    "Flickering_Shadow": {
      "stone": 2662,
      "native": 580256,
      "bucket": 514,
      "offset": 4,
      "graphSha256": "809204ab484d1b476489ba94756c659c535fbb9c52356201bace704427155291"
    },
    "Sin_of_the_Fallen": {
      "stone": 2663,
      "native": 401776,
      "bucket": 515,
      "offset": 4,
      "graphSha256": "473d1062622a5a8a3456a72694c8a748fce39750f0fa3f8c4f04955adad9e4d5"
    }
  },
  "receiptSha256": "ef7b34dd16b410dfe64050273d190d34ee6ac711d5a16a1c3980d881d4c43dc7"
};
