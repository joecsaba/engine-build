import { db } from "./index.js";
import { enginesTable } from "./schema/index.js";
import { eq } from "drizzle-orm";

async function migrateEngineSlugs() {
  console.log("Setting engine slugs for build-sheet engines...");

  const slugMap: Record<string, string> = {
    "LS1 5.7L": "ls1",
    "SBC 350 (4-bolt main)": "sbc350",
    "5.0L Coyote (Ti-VCT)": "coyote50",
  };

  for (const [name, slug] of Object.entries(slugMap)) {
    const result = await db
      .update(enginesTable)
      .set({ slug })
      .where(eq(enginesTable.name, name))
      .returning({ id: enginesTable.id, name: enginesTable.name });

    if (result.length > 0) {
      console.log(`  Set slug '${slug}' on engine: ${result[0].name} (id=${result[0].id})`);
    } else {
      console.warn(`  WARNING: Engine not found: ${name}`);
    }
  }

  console.log("Done.");
  process.exit(0);
}

migrateEngineSlugs().catch(err => {
  console.error(err);
  process.exit(1);
});
