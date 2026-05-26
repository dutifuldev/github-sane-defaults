import type { GitHubClient } from "../github/client.js";
import type { GitHubRuleset } from "../github/types.js";
import type { GitHubRepo } from "../github/types.js";
import { desiredRulesetPayload, repoSettingChanges, RULESET_NAME } from "../policy/defaults.js";
import type { RulesetPayload } from "../policy/types.js";
import type { RepoPlan, RulesetPlan, TargetSelection } from "./types.js";

export async function buildPlan(
  client: GitHubClient,
  selection: TargetSelection
): Promise<RepoPlan[]> {
  const repos = await selectRepos(client, selection);
  const activeRepos = repos.filter((repo) => !repo.archived && !repo.disabled);

  return Promise.all(activeRepos.map((repo) => buildRepoPlan(client, selection.org, repo)));
}

async function selectRepos(
  client: GitHubClient,
  selection: TargetSelection
): Promise<GitHubRepo[]> {
  if (selection.all) {
    return client.listOrgRepos(selection.org);
  }

  return Promise.all(selection.repos.map((repo) => client.getRepo(selection.org, repo)));
}

async function buildRepoPlan(
  client: GitHubClient,
  owner: string,
  repo: GitHubRepo
): Promise<RepoPlan> {
  const ruleset = await planRuleset(client, owner, repo.name, desiredRulesetPayload());

  return {
    name: repo.name,
    fullName: repo.full_name,
    archived: repo.archived,
    settingChanges: repoSettingChanges(repo),
    ruleset
  };
}

async function planRuleset(
  client: GitHubClient,
  owner: string,
  repo: string,
  desired: RulesetPayload
): Promise<RulesetPlan> {
  const summaries = await client.listRepoRulesets(owner, repo);
  const existingSummary = summaries.find((ruleset) => ruleset.name === RULESET_NAME);

  if (existingSummary === undefined) {
    return { action: "create" };
  }

  const existing = await client.getRepoRuleset(owner, repo, existingSummary.id);

  if (rulesetEquivalent(existing, desired)) {
    return { action: "none" };
  }

  return { action: "update" };
}

export function rulesetEquivalent(existing: GitHubRuleset, desired: RulesetPayload): boolean {
  return canonicalRuleset(existing) === canonicalRuleset(desired);
}

function canonicalRuleset(ruleset: GitHubRuleset | RulesetPayload): string {
  return JSON.stringify({
    name: ruleset.name,
    target: ruleset.target,
    enforcement: ruleset.enforcement,
    bypass_actors: ruleset.bypass_actors,
    conditions: ruleset.conditions,
    rules: ruleset.rules
  });
}
