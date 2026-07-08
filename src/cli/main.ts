#!/usr/bin/env node
import { applyPlannedDefaults } from "../app/apply.js";
import { buildPlan } from "../app/planner.js";
import type { ApplySummary } from "../app/types.js";
import { RestGitHubClient, resolveToken } from "../github/client.js";
import { confirmApply } from "./confirm.js";
import {
  countChangedRepos,
  formatApplySummary,
  formatPlan,
  planHasChanges,
  shouldUseColor
} from "./format.js";
import { parseArgs } from "./args.js";
import { createProgressReporter } from "./progress.js";

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const client = new RestGitHubClient(resolveToken(options.token));
  const formatOptions = { color: shouldUseColor() };
  const progress = createProgressReporter(options.progress);

  try {
    if (options.command === "plan") {
      const planned = await buildPlan(client, options, { progress });
      progress.stop();
      console.log(formatPlan(planned, formatOptions));
      return;
    }

    const planned = await buildPlan(client, options, { progress });
    progress.stop();

    console.log(formatPlan(planned, formatOptions));

    if (!planHasChanges(planned)) {
      console.error("No changes to apply.");
      return;
    }

    if (!options.yes && !(await confirmApply())) {
      console.error("Apply cancelled.");
      process.exitCode = 1;
      return;
    }

    await applyPlannedDefaults(client, options.owner, planned, { progress });

    const summary: ApplySummary = { planned, applied: countChangedRepos(planned) };
    console.log("");
    console.log(formatApplySummary(summary, formatOptions));
  } finally {
    progress.stop();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
