import type { GitHubClient } from "../github/client.js";
import { desiredRulesetPayload, RULESET_NAME } from "../policy/defaults.js";
import type { ApplySummary, RepoPlan, TargetSelection } from "./types.js";
import { buildPlan } from "./planner.js";

export async function applyDefaults(
  client: GitHubClient,
  selection: TargetSelection
): Promise<ApplySummary> {
  const planned = await buildPlan(client, selection);

  for (const plan of planned) {
    await applyRepoPlan(client, selection.org, plan);
  }

  return {
    planned,
    applied: planned.length
  };
}

async function applyRepoPlan(client: GitHubClient, owner: string, plan: RepoPlan): Promise<void> {
  if (plan.settingChanges.length > 0) {
    await client.updateRepoDefaults(owner, plan.name);
  }

  if (plan.ruleset.action === "none") {
    return;
  }

  const desired = desiredRulesetPayload();

  if (plan.ruleset.action === "create") {
    await client.createRepoRuleset(owner, plan.name, desired);
    return;
  }

  const summaries = await client.listRepoRulesets(owner, plan.name);
  const existing = summaries.find((ruleset) => ruleset.name === RULESET_NAME);

  if (existing === undefined) {
    await client.createRepoRuleset(owner, plan.name, desired);
    return;
  }

  await client.updateRepoRuleset(owner, plan.name, existing.id, desired);
}
