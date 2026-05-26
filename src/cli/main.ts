#!/usr/bin/env node
import { applyDefaults } from "../app/apply.js";
import { buildPlan } from "../app/planner.js";
import { RestGitHubClient, resolveToken } from "../github/client.js";
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

  console.log(formatApplySummary(await applyDefaults(client, options), formatOptions));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
