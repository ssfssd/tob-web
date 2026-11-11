import { RUNTIME_CATALOG } from "./data/runtimeCatalog.generated.js";
import { TLIDB_CATALOG } from "./data/tlidbCatalog.ss13.generated.js";
import { createActiveSs13PactDestinyModel } from "./pactDestinyModel.js";

export const PACT_CALCULATION_MODEL = createActiveSs13PactDestinyModel(
  RUNTIME_CATALOG.datasets.pactspirit_catalog,
  RUNTIME_CATALOG.datasets.destiny_catalog,
  {
    spirits: TLIDB_CATALOG.catalog.spirits,
    destiny: TLIDB_CATALOG.catalog.destiny,
  },
);
