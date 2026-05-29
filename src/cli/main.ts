#!/usr/bin/env node
import { applyPlannedDefaults } from "../app/apply.js";
import { buildPlan } from "../app/planner.js";
import type { ApplySummary } from "../app/types.js";
import { RestGitHubClient, resolveToken } from "../github/client.js";
import { confirmApply } from "./confirm.js";
import { formatApplySummary, formatPlan, shouldUseColor } from "./format.js";
import { parseArgs } from "./args.js";

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const client = new RestGitHubClient(resolveToken(options.token));
  const formatOptions = { color: shouldUseColor() };

  if (options.command === "plan") {
    console.log(formatPlan(await buildPlan(client, options), formatOptions));
    return;
  }

  const planned = await buildPlan(client, options);

  console.log(formatPlan(planned, formatOptions));

  if (!options.yes && !(await confirmApply())) {
    console.error("Apply cancelled.");
    process.exitCode = 1;
    return;
  }

  await applyPlannedDefaults(client, options.org, planned);

  const summary: ApplySummary = { planned, applied: planned.length };
  console.log("");
  console.log(formatApplySummary(summary, formatOptions));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
