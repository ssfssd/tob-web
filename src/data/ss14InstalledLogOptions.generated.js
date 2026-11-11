// Native modifier group, argument program and ranges cross-checked against SS14 TLIDB semantics.
export const SS14_INSTALLED_LOG_OPTIONS = {
  "season": "SS14",
  "installedReceipt": {
    "layer": "6163611",
    "name": "config_modifier_ChunkA0.bin",
    "path": "../../../UE_game/Content/Script/Data/ConfigLogic/config_modifier_ChunkA0.bin",
    "pak": "UE_game_6163611_P.pak",
    "offset": 2950079,
    "size": 3751287,
    "sha256": "a73a981a7a332e3b1db9bdbcf8cecee4c6c01b00b0495641f794d89b99affb6a",
    "compression": "Oodle",
    "stableRead": true
  },
  "records": {
    "gear-tlidb-com-cn-rock-lizard-27s-skull": [
      {
        "row": {
          "id": "51420122",
          "text": "+(80–100) Max Life",
          "renderTemplate": "{{roll_1}} Max Life",
          "rollFragments": [
            "+(20–30)"
          ]
        },
        "ko": {
          "id": "51420122",
          "text": "최대 HP +(80–100)",
          "renderTemplate": "최대 HP {{roll_1}}",
          "rollFragments": [
            "+(20–30)"
          ]
        },
        "replaces": "51420121",
        "sourceUrl": "https://tlidb.com/en/Rock_Lizards_Skull",
        "sourcePageSha256": "41f9799321c89ea9398b4c9870ca21d945ec287b97569fb3fe48ceb1c8291f65",
        "installed": {
          "id": 51420122,
          "group": 5142012,
          "affix": 101010011,
          "count": 1,
          "ranges": [
            [
              20,
              30
            ]
          ],
          "key": "101010011_d1_mt6",
          "bucket": 248,
          "offset": 3608,
          "rangeSha256": "3b32d1f01d4921b149fe443f67a5daeb689ec98c173908729d6fa020e8ad38af",
          "tableSha256": "a73a981a7a332e3b1db9bdbcf8cecee4c6c01b00b0495641f794d89b99affb6a"
        }
      }
    ],
    "gear-tlidb-com-cn-born-in-fire": [
      {
        "row": {
          "id": "51510111",
          "text": "+5 Max Life per 1 levels",
          "renderTemplate": "{{roll_1}} Max Life per {{roll_2}} levels",
          "rollFragments": [
            "+5",
            "1"
          ],
          "argumentOrder": [
            1,
            0
          ]
        },
        "ko": {
          "id": "51510111",
          "text": "1 레벨 당, 최대 HP +5",
          "renderTemplate": "{{roll_1}} 레벨 당, 최대 HP {{roll_2}}",
          "rollFragments": [
            "1",
            "+5"
          ],
          "argumentOrder": [
            0,
            1
          ]
        },
        "replaces": "51510111",
        "sourceUrl": "https://tlidb.com/en/Born_in_Fire",
        "sourcePageSha256": "66122389fada015c7121bd2a20340831156a440d6920335e0453213a448a8fd7",
        "installed": {
          "id": 51510111,
          "group": 5151011,
          "affix": 56216,
          "count": 2,
          "ranges": [
            [
              1,
              1
            ],
            [
              5,
              5
            ]
          ],
          "key": "56216_d1_d2_mt6",
          "bucket": 831,
          "offset": 1441,
          "rangeSha256": "3c570512e59676550ef3ab0cc3bc70f43e0891312b1a38c25720f7b3c96f4a46",
          "tableSha256": "a73a981a7a332e3b1db9bdbcf8cecee4c6c01b00b0495641f794d89b99affb6a"
        }
      },
      {
        "row": {
          "id": "51510142",
          "text": "Regenerates (30–40) Life per second",
          "renderTemplate": "Regenerates {{roll_1}} Life per second",
          "rollFragments": [
            "(15–29)"
          ]
        },
        "ko": {
          "id": "51510142",
          "text": "1초당 HP (30–40) 회복",
          "renderTemplate": "1초당 HP {{roll_1}} 회복",
          "rollFragments": [
            "(15–29)"
          ]
        },
        "replaces": "51510141",
        "sourceUrl": "https://tlidb.com/en/Born_in_Fire",
        "sourcePageSha256": "66122389fada015c7121bd2a20340831156a440d6920335e0453213a448a8fd7",
        "installed": {
          "id": 51510142,
          "group": 5151014,
          "affix": 101010179,
          "count": 1,
          "ranges": [
            [
              15,
              29
            ]
          ],
          "key": "101010179_d1_mt6",
          "bucket": 862,
          "offset": 1822,
          "rangeSha256": "8579e58a330bd70e9e991c6de749c04d04e95ff99e3a3c6713b17a417ff68631",
          "tableSha256": "a73a981a7a332e3b1db9bdbcf8cecee4c6c01b00b0495641f794d89b99affb6a"
        }
      }
    ],
    "gear-tlidb-com-cn-marksman-bracers": [
      {
        "row": {
          "id": "51431422",
          "text": "+(154–176) Max Life",
          "renderTemplate": "{{roll_1}} Max Life",
          "rollFragments": [
            "+(55–66)"
          ]
        },
        "ko": {
          "id": "51431422",
          "text": "최대 HP +(154–176)",
          "renderTemplate": "최대 HP {{roll_1}}",
          "rollFragments": [
            "+(55–66)"
          ]
        },
        "replaces": "51431421",
        "sourceUrl": "https://tlidb.com/en/Marksman_Bracers",
        "sourcePageSha256": "7807466c78baf48df306a04e5813a221f1b9088cf2d17991036c2106d3e31e3d",
        "installed": {
          "id": 51431422,
          "group": 5143142,
          "affix": 101010011,
          "count": 1,
          "ranges": [
            [
              55,
              66
            ]
          ],
          "key": "101010011_d1_mt6",
          "bucket": 1630,
          "offset": 4009,
          "rangeSha256": "4e05a463beef05e75959dcaa082fe960f4f9cb6a5882f5c1dd864618d60fd732",
          "tableSha256": "a73a981a7a332e3b1db9bdbcf8cecee4c6c01b00b0495641f794d89b99affb6a"
        }
      }
    ],
    "gear-ss14-tortoiseshell-amulet": [
      {
        "row": {
          "id": "109200207",
          "text": "+(10–12) Intelligence",
          "renderTemplate": "{{roll_1}} Intelligence",
          "rollFragments": [
            "+(10–12)"
          ]
        },
        "ko": {
          "id": "109200207",
          "text": "지혜 +(10–12)",
          "renderTemplate": "지혜 {{roll_1}}",
          "rollFragments": [
            "+(10–12)"
          ]
        },
        "replaces": null,
        "sourceUrl": "https://tlidb.com/en/Necklace",
        "sourcePageSha256": "0d9c928f79fdf28e6fbb6864d27096ed73bcae8cace6f44b0001cc19c6ce0bff",
        "installed": {
          "id": 109200207,
          "group": 1092002,
          "affix": 101010111,
          "count": 1,
          "ranges": [
            [
              10,
              12
            ]
          ],
          "key": "101010111_d1_mt3",
          "bucket": 999,
          "offset": 1147,
          "rangeSha256": "e22c92e4899f0d54fcfd555633dc94ec06eaae634a372f1b9864b00304fb4d85",
          "tableSha256": "a73a981a7a332e3b1db9bdbcf8cecee4c6c01b00b0495641f794d89b99affb6a"
        }
      },
      {
        "row": {
          "id": "104200008",
          "text": "+(330–372) Max Life",
          "renderTemplate": "{{roll_1}} Max Life",
          "rollFragments": [
            "+(27–33)"
          ]
        },
        "ko": {
          "id": "104200008",
          "text": "최대 HP +(330–372)",
          "renderTemplate": "최대 HP {{roll_1}}",
          "rollFragments": [
            "+(27–33)"
          ]
        },
        "replaces": null,
        "sourceUrl": "https://tlidb.com/en/Necklace",
        "sourcePageSha256": "0d9c928f79fdf28e6fbb6864d27096ed73bcae8cace6f44b0001cc19c6ce0bff",
        "installed": {
          "id": 104200008,
          "group": 1042000,
          "affix": 101010011,
          "count": 1,
          "ranges": [
            [
              27,
              33
            ]
          ],
          "key": "101010011_d1_mt3",
          "bucket": 198,
          "offset": 1350,
          "rangeSha256": "2c0e72d66a5a9c4ef9a8b574b645300524be0ac84ed937e0ae675ca86840608d",
          "tableSha256": "a73a981a7a332e3b1db9bdbcf8cecee4c6c01b00b0495641f794d89b99affb6a"
        }
      },
      {
        "row": {
          "id": "140200807",
          "text": "+4 % Blessing Duration",
          "renderTemplate": "{{roll_1}}% Blessing Duration",
          "rollFragments": [
            "+4"
          ]
        },
        "ko": {
          "id": "140200807",
          "text": "축복 지속 시간 +4 %",
          "renderTemplate": "축복 지속 시간 {{roll_1}}%",
          "rollFragments": [
            "+4"
          ]
        },
        "replaces": null,
        "sourceUrl": "https://tlidb.com/en/Necklace",
        "sourcePageSha256": "0d9c928f79fdf28e6fbb6864d27096ed73bcae8cace6f44b0001cc19c6ce0bff",
        "installed": {
          "id": 140200807,
          "group": 1402008,
          "affix": 655843,
          "count": 1,
          "ranges": [
            [
              4,
              4
            ]
          ],
          "key": "655843_d1_mt4",
          "bucket": 2773,
          "offset": 3537,
          "rangeSha256": "b94393810a267db58bec4a2e5b0e5a4faf00e6d36ecdf7ede3180a808ae3e094",
          "tableSha256": "a73a981a7a332e3b1db9bdbcf8cecee4c6c01b00b0495641f794d89b99affb6a"
        }
      }
    ],
    "gear-ss14-rock-waistguard": [
      {
        "row": {
          "id": "140230303",
          "text": "+(30–36) % damage",
          "renderTemplate": "{{roll_1}}% damage",
          "rollFragments": [
            "+(30–36)"
          ]
        },
        "ko": {
          "id": "140230303",
          "text": "대미지 +(30–36) %",
          "renderTemplate": "대미지 {{roll_1}}%",
          "rollFragments": [
            "+(30–36)"
          ]
        },
        "replaces": null,
        "sourceUrl": "https://tlidb.com/en/Belt",
        "sourcePageSha256": "61d71e8250f151bd2f08772758001503b2264e8760fb571644c261af62ed2a39",
        "installed": {
          "id": 140230303,
          "group": 1402303,
          "affix": 101010131,
          "count": 1,
          "ranges": [
            [
              30,
              36
            ]
          ],
          "key": "101010131_d1_mt3",
          "bucket": 2515,
          "offset": 3595,
          "rangeSha256": "39ebbe5b4c765cde14c10bc18ac8b74abd242b29187f7875228a02166e90625c",
          "tableSha256": "a73a981a7a332e3b1db9bdbcf8cecee4c6c01b00b0495641f794d89b99affb6a"
        }
      },
      {
        "row": {
          "id": "105230203",
          "text": "+(141–175) Max Energy Shield",
          "renderTemplate": "{{roll_1}} Max Energy Shield",
          "rollFragments": [
            "+(141–175)"
          ]
        },
        "ko": {
          "id": "105230203",
          "text": "최대 보호막 +(141–175)",
          "renderTemplate": "최대 보호막 {{roll_1}}",
          "rollFragments": [
            "+(141–175)"
          ]
        },
        "replaces": null,
        "sourceUrl": "https://tlidb.com/en/Belt",
        "sourcePageSha256": "61d71e8250f151bd2f08772758001503b2264e8760fb571644c261af62ed2a39",
        "installed": {
          "id": 105230203,
          "group": 1052302,
          "affix": 101010056,
          "count": 1,
          "ranges": [
            [
              141,
              175
            ]
          ],
          "key": "101010056_d1_mt3",
          "bucket": 1507,
          "offset": 2960,
          "rangeSha256": "a6dd53be12e4114abdd3921151db85c4b64310d5fd54885686b4f7361ec986a2",
          "tableSha256": "a73a981a7a332e3b1db9bdbcf8cecee4c6c01b00b0495641f794d89b99affb6a"
        }
      },
      {
        "row": {
          "id": "109230203",
          "text": "+(25–30) Intelligence",
          "renderTemplate": "{{roll_1}} Intelligence",
          "rollFragments": [
            "+(25–30)"
          ]
        },
        "ko": {
          "id": "109230203",
          "text": "지혜 +(25–30)",
          "renderTemplate": "지혜 {{roll_1}}",
          "rollFragments": [
            "+(25–30)"
          ]
        },
        "replaces": null,
        "sourceUrl": "https://tlidb.com/en/Belt",
        "sourcePageSha256": "61d71e8250f151bd2f08772758001503b2264e8760fb571644c261af62ed2a39",
        "installed": {
          "id": 109230203,
          "group": 1092302,
          "affix": 101010111,
          "count": 1,
          "ranges": [
            [
              25,
              30
            ]
          ],
          "key": "101010111_d1_mt3",
          "bucket": 1241,
          "offset": 1110,
          "rangeSha256": "7f74581e4a59a0d254b6b15a2e5f7fa9e8b33f135413455a3e0ae50f2f499be1",
          "tableSha256": "a73a981a7a332e3b1db9bdbcf8cecee4c6c01b00b0495641f794d89b99affb6a"
        }
      },
      {
        "row": {
          "id": "108230003",
          "text": "+(11–14) % Fire Resistance",
          "renderTemplate": "{{roll_1}}% Fire Resistance",
          "rollFragments": [
            "+(11–14)"
          ]
        },
        "ko": {
          "id": "108230003",
          "text": "화염 저항 +(11–14) %",
          "renderTemplate": "화염 저항 {{roll_1}}%",
          "rollFragments": [
            "+(11–14)"
          ]
        },
        "replaces": null,
        "sourceUrl": "https://tlidb.com/en/Belt",
        "sourcePageSha256": "61d71e8250f151bd2f08772758001503b2264e8760fb571644c261af62ed2a39",
        "installed": {
          "id": 108230003,
          "group": 1082300,
          "affix": 101010103,
          "count": 1,
          "ranges": [
            [
              11,
              14
            ]
          ],
          "key": "101010103_d1_mt4",
          "bucket": 317,
          "offset": 3378,
          "rangeSha256": "55d573e28461fa2294643997236482bbfadd1a9a0a37ccdd88e6494e69bfbb07",
          "tableSha256": "a73a981a7a332e3b1db9bdbcf8cecee4c6c01b00b0495641f794d89b99affb6a"
        }
      },
      {
        "row": {
          "id": "130230303",
          "text": "+(4–5) % Elemental Resistance\n+(6–8) % chance to avoid Elemental Ailments",
          "renderTemplate": "{{roll_1}}% Elemental Resistance\n{{roll_2}}% chance to avoid Elemental Ailments",
          "rollFragments": [
            "+(4–5)",
            "+(6–8)"
          ]
        },
        "ko": {
          "id": "130230303",
          "text": "원소 저항 +(4–5) %\n+(6–8) % 의 확률로 원소 상태 이상 을 회피한다.",
          "renderTemplate": "원소 저항 {{roll_1}}%\n{{roll_2}}% 의 확률로 원소 상태 이상 을 회피한다.",
          "rollFragments": [
            "+(4–5)",
            "+(6–8)"
          ]
        },
        "replaces": null,
        "sourceUrl": "https://tlidb.com/en/Belt",
        "sourcePageSha256": "61d71e8250f151bd2f08772758001503b2264e8760fb571644c261af62ed2a39",
        "installed": null
      },
      {
        "row": {
          "id": "108230303",
          "text": "+(11–14) % Erosion Resistance",
          "renderTemplate": "{{roll_1}}% Erosion Resistance",
          "rollFragments": [
            "+(11–14)"
          ]
        },
        "ko": {
          "id": "108230303",
          "text": "부식 저항 +(11–14) %",
          "renderTemplate": "부식 저항 {{roll_1}}%",
          "rollFragments": [
            "+(11–14)"
          ]
        },
        "replaces": null,
        "sourceUrl": "https://tlidb.com/en/Belt",
        "sourcePageSha256": "61d71e8250f151bd2f08772758001503b2264e8760fb571644c261af62ed2a39",
        "installed": {
          "id": 108230303,
          "group": 1082303,
          "affix": 101010106,
          "count": 1,
          "ranges": [
            [
              11,
              14
            ]
          ],
          "key": "101010106_d1_mt4",
          "bucket": 617,
          "offset": 2269,
          "rangeSha256": "e2dfae858a113bda9ffabab66665357a6a08901d01f81e666078acbfad850ea6",
          "tableSha256": "a73a981a7a332e3b1db9bdbcf8cecee4c6c01b00b0495641f794d89b99affb6a"
        }
      },
      {
        "row": {
          "id": "3401029",
          "text": "+1 to All Skills' Levels",
          "renderTemplate": "{{roll_1}} to All Skills' Levels",
          "rollFragments": [
            "+1"
          ]
        },
        "ko": {
          "id": "3401029",
          "text": "모든 스킬 레벨 +1",
          "renderTemplate": "모든 스킬 레벨 {{roll_1}}",
          "rollFragments": [
            "+1"
          ]
        },
        "replaces": null,
        "sourceUrl": "https://tlidb.com/en/Belt",
        "sourcePageSha256": "61d71e8250f151bd2f08772758001503b2264e8760fb571644c261af62ed2a39",
        "installed": null
      }
    ]
  },
  "unresolved": []
};
