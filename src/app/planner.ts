import type { GitHubClient } from "../github/client.js";
import type { GitHubRuleset } from "../github/types.js";
import type { GitHubRepo } from "../github/types.js";
import { desiredRulesetPayload, repoSettingChanges, RULESET_NAME } from "../policy/defaults.js";
import type { ExistingRulesetRule, RefNameCondition, RulesetPayload } from "../policy/types.js";
import type { RepoPlan, RulesetPlan, TargetSelection } from "./types.js";

export async function buildPlan(
  client: GitHubClient,
  selection: TargetSelection
): Promise<RepoPlan[]> {
  const repos = await selectRepos(client, selection);
  const activeRepos = repos.filter((repo) => !repo.archived && !repo.disabled);
  const plans: RepoPlan[] = [];

  for (const repo of activeRepos) {
    plans.push(await buildRepoPlan(client, selection.org, repo));
  }

  return plans;
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

  if (rulesetSatisfiesDesired(existing, desired)) {
    return { action: "none" };
  }

  return { action: "update" };
}

export function rulesetSatisfiesDesired(existing: GitHubRuleset, desired: RulesetPayload): boolean {
  return (
    existing.name === desired.name &&
    existing.enforcement === desired.enforcement &&
    canonicalRulesetRules(existing.rules) ===
      canonicalRulesetRules(mergeRules(existing.rules, desired.rules)) &&
    JSON.stringify(existing.bypass_actors) === JSON.stringify(desired.bypass_actors) &&
    refConditionIncludes(existing.conditions.ref_name, desired.conditions.ref_name)
  );
}

export function mergeRulesetPayload(
  existing: GitHubRuleset,
  desired: RulesetPayload
): RulesetPayload {
  return {
    ...desired,
    bypass_actors: desired.bypass_actors,
    conditions: {
      ref_name: mergeRefCondition(existing.conditions.ref_name, desired.conditions.ref_name)
    },
    rules: mergeRules(existing.rules, desired.rules)
  };
}

function mergeRules(
  existing: ExistingRulesetRule[],
  desired: ExistingRulesetRule[]
): ExistingRulesetRule[] {
  const rules = [...existing];
  const existingTypes = new Set(existing.map((rule) => rule.type));

  for (const rule of desired) {
    if (!existingTypes.has(rule.type)) {
      rules.push(rule);
    }
  }

  return rules;
}

function refConditionIncludes(existing: RefNameCondition, desired: RefNameCondition): boolean {
  return (
    desired.include.every((ref) => refIncluded(existing.include, ref)) &&
    desired.include.every((ref) => !existing.exclude.includes(ref))
  );
}

function mergeRefCondition(
  existing: RefNameCondition,
  desired: RefNameCondition
): RefNameCondition {
  const include = desired.include.reduce(
    (refs, ref) => (refIncluded(refs, ref) ? refs : [...refs, ref]),
    [...existing.include]
  );
  const exclude = existing.exclude.filter((ref) => !desired.include.includes(ref));

  return { include, exclude };
}

function refIncluded(include: string[], ref: string): boolean {
  return include.includes("~ALL") || include.includes(ref);
}

function canonicalRulesetRules(rules: ExistingRulesetRule[]): string {
  return JSON.stringify(rules);
}
