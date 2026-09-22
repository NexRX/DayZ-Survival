#!/usr/bin/env -S deno run -A

/**
 * Generates a changelog from git history in JSON format.
 * Only includes commits newer than the latest date already in the existing changelog.
 */

const CHANGELOG_PATH = new URL("../changelog.json", import.meta.url);

// 1. Load existing changelog to find the newest date already included.
let latestIncludedDate: string | null = null;
try {
  const existing = JSON.parse(await Deno.readTextFile(CHANGELOG_PATH));
  if (existing.Descriptions?.length) {
    latestIncludedDate = existing.Descriptions[0].Date; // first = newest
  }
} catch {
  // No existing changelog or parse error — start from scratch
}

// 2. Fetch git log entries.
const cmd = new Deno.Command("git", {
  args: [
    "log",
    "--format=%aI||%s",
    "--date-order",
  ],
});

const { stdout } = await cmd.output();
const logLines = new TextDecoder().decode(stdout).trim().split("\n").filter(Boolean);

// 3. Build descriptions from new commits only.
const descriptions: Array<{ Date: string; DescriptionText: string }> = [];

for (const line of logLines) {
  const sepIndex = line.indexOf("||");
  const date = line.slice(0, sepIndex);
  const message = line.slice(sepIndex + 2);

  // Stop when we hit a date we've already included.
  if (latestIncludedDate && date <= latestIncludedDate) break;

  // Skip commits that don't warrant changelog entries.
  if (/^(chore|refactor|test|docs?|wip|style|build|ops)(\(|:|$)/i.test(message)) continue;

  descriptions.push({ Date: date, DescriptionText: message });
}

// 4. If nothing new, we're done.
if (descriptions.length === 0) {
  console.log("ℹ️ No new commits since last changelog.");
  Deno.exit(0);
}

// 5. Merge with existing data (new entries at the top).
let output: { Descriptions: typeof descriptions };
try {
  const existing = JSON.parse(await Deno.readTextFile(CHANGELOG_PATH));
  output = { Descriptions: [...descriptions, ...existing.Descriptions] };
} catch {
  output = { Descriptions: descriptions };
}

// 6. Write changelog.
await Deno.writeTextFile(CHANGELOG_PATH, JSON.stringify(output, null, 2) + "\n");

console.log(`✅ Changelog updated: ${descriptions.length} new entry(ies)`);
