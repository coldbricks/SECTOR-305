import { loadDefaultPack } from "../loadPack.js";

try {
  const pack = loadDefaultPack();
  console.log(`OK pack ${pack.id}@${pack.version} — ${pack.natures.length} natures, ${pack.rubric.length} rubric rules`);
} catch (e) {
  console.error(e);
  process.exit(1);
}
