import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "../src/config/index.js";
import { prisma } from "../src/db.js";
import { importLegacy, normalizeLegacy } from "../src/legacy-import.js";

const dryRun = process.argv.includes("--dry-run");
const paths = process.argv.slice(2).filter((value) => value !== "--dry-run");
const filenames = paths.length ? paths.map((filename) => resolve(filename)) : [config.legacyDataFile];
try {
  const documents: unknown[] = [];
  for (const filename of filenames) {
    try { documents.push(JSON.parse((await readFile(filename, "utf8")).replace(/^\uFEFF/, ""))); }
    catch (error) {
      if (!paths.length && (error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
  }
  if (!documents.length) {
    console.log("No legacy JSON file found; PostgreSQL is the active store.");
  } else if (dryRun) {
    const data = normalizeLegacy(documents);
    console.log(JSON.stringify({ dryRun: true, reviews: data.reviews.length, sessions: data.sessions.length, streaks: data.streaks.length }));
  } else {
    console.log(JSON.stringify(await importLegacy(documents)));
  }
} finally { await prisma.$disconnect(); }
