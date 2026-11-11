import { CATALOG } from "./catalog.js";
import { RUNTIME_CATALOG } from "./data/runtimeCatalog.generated.js";
import { createTalentBoardModel } from "./talentBoardModel.js";

export const TALENT_CALCULATION_MODEL = createTalentBoardModel(
  RUNTIME_CATALOG.datasets.talent_catalog,
  { talentItems: CATALOG.talents },
);
