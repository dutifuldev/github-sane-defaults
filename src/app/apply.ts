import type { GitHubClient } from "../github/client.js";
import { desiredRulesetPayload, RULESET_NAME } from "../policy/defaults.js";
import type { ApplyOptions, ApplySummary, RepoPlan, TargetSelection } from "./types.js";
import { buildPlan } from "./planner.js";
import { mergeRulesetPayload } from "./planner.js";

export async function applyDefaults(
  client: GitHubClient,
  selection: TargetSelection,
  options: ApplyOptions = {}
): Promise<ApplySummary> {
  const planned = await buildPlan(client, selection, options);

  await applyPlannedDefaults(client, selection.owner, planned, options);

  return {
    planned,
    applied: countChangedRepos(planned)
  };
}

export async function applyPlannedDefaults(
  client: GitHubClient,
  owner: string,
  planned: RepoPlan[],
  options: ApplyOptions = {}
): Promise<void> {
  const changedPlans = planned.filter(repoPlanHasChanges);
  let completed = 0;

  options.progress?.applyingRepos?.({ owner, total: changedPlans.length });

  for (const plan of changedPlans) {
    await applyRepoPlan(client, owner, plan);
    completed += 1;
    options.progress?.appliedRepo?.({
      owner,
      total: changedPlans.length,
      completed,
      current: plan.fullName
    });
  }
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

  const existingRuleset = await client.getRepoRuleset(owner, plan.name, existing.id);
  await client.updateRepoRuleset(
    owner,
    plan.name,
    existing.id,
    mergeRulesetPayload(existingRuleset, desired)
  );
}

function countChangedRepos(planned: RepoPlan[]): number {
  return planned.filter(repoPlanHasChanges).length;
}

function repoPlanHasChanges(plan: RepoPlan): boolean {
  return plan.settingChanges.length > 0 || plan.ruleset.action !== "none";
}
