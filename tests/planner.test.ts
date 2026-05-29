import { describe, expect, it } from "vitest";

import { buildPlan, rulesetSatisfiesDesired } from "../src/app/planner.js";
import type { GitHubClient } from "../src/github/client.js";
import type { GitHubRepo, GitHubRuleset, RulesetSummary } from "../src/github/types.js";
import {
  DESIRED_REPO_SETTINGS,
  desiredRulesetPayload,
  RULESET_NAME
} from "../src/policy/defaults.js";

describe("buildPlan", () => {
  it("plans setting changes and ruleset creation", async () => {
    const client = fakeClient({
      repo: {
        ...baseRepo(),
        allow_auto_merge: false,
        delete_branch_on_merge: false
      },
      rulesets: []
    });

    await expect(
      buildPlan(client, { org: "dutifuldev", repos: ["scratch"], all: false })
    ).resolves.toEqual([
      {
        name: "scratch",
        fullName: "dutifuldev/scratch",
        archived: false,
        settingChanges: [
          { key: "allow_auto_merge", current: false, desired: true },
          { key: "delete_branch_on_merge", current: false, desired: true }
        ],
        ruleset: { action: "create" }
      }
    ]);
  });

  it("plans no ruleset change when a differently named ruleset covers the policy", async () => {
    const desired = desiredRulesetPayload();
    const client = fakeClient({
      repo: baseRepo(),
      rulesets: [{ id: 99, name: "Protect main", target: "branch", enforcement: "active" }],
      ruleset: { id: 99, ...desired, name: "Protect main" }
    });

    await expect(
      buildPlan(client, { org: "dutifuldev", repos: ["scratch"], all: false })
    ).resolves.toMatchObject([{ ruleset: { action: "none", coveredBy: "Protect main" } }]);
  });

  it("plans managed ruleset creation when a differently named ruleset is insufficient", async () => {
    const desired = desiredRulesetPayload();
    const client = fakeClient({
      repo: baseRepo(),
      rulesets: [{ id: 99, name: "Protect main", target: "branch", enforcement: "active" }],
      ruleset: { id: 99, ...desired, name: "Protect main", rules: [{ type: "deletion" }] }
    });

    await expect(
      buildPlan(client, { org: "dutifuldev", repos: ["scratch"], all: false })
    ).resolves.toMatchObject([{ ruleset: { action: "create" } }]);
  });

  it("plans managed ruleset updates when the named ruleset is insufficient", async () => {
    const desired = desiredRulesetPayload();
    const client = fakeClient({
      repo: baseRepo(),
      rulesets: [{ id: 99, name: RULESET_NAME, target: "branch", enforcement: "active" }],
      ruleset: { id: 99, ...desired, rules: [{ type: "deletion" }] }
    });

    await expect(
      buildPlan(client, { org: "dutifuldev", repos: ["scratch"], all: false })
    ).resolves.toMatchObject([{ ruleset: { action: "update" } }]);
  });

  it("plans no ruleset change when payload already matches", () => {
    const desired = desiredRulesetPayload();
    const existing: GitHubRuleset = { id: 1, ...desired };

    expect(rulesetSatisfiesDesired(existing, desired)).toBe(true);
  });

  it("plans no ruleset change when an existing ruleset has extra rules", () => {
    const desired = desiredRulesetPayload();
    const existing: GitHubRuleset = {
      id: 1,
      ...desired,
      rules: [
        ...desired.rules,
        { type: "pull_request", parameters: { required_approving_review_count: 1 } }
      ]
    };

    expect(rulesetSatisfiesDesired(existing, desired)).toBe(true);
  });

  it("plans no ruleset change when an existing ruleset protects more refs", () => {
    const desired = desiredRulesetPayload();
    const existing: GitHubRuleset = {
      id: 1,
      ...desired,
      conditions: { ref_name: { include: ["~ALL"], exclude: [] } }
    };

    expect(rulesetSatisfiesDesired(existing, desired)).toBe(true);
  });
});

type FakeClientOptions = {
  repo: GitHubRepo;
  rulesets: RulesetSummary[];
  ruleset?: GitHubRuleset;
};

function fakeClient(options: FakeClientOptions): GitHubClient {
  return {
    getRepo: () => Promise.resolve(options.repo),
    listOrgRepos: () => Promise.resolve([options.repo]),
    updateRepoDefaults: () => Promise.resolve(),
    listRepoRulesets: () => Promise.resolve(options.rulesets),
    getRepoRuleset: () => {
      if (options.ruleset === undefined) {
        return Promise.reject(new Error("ruleset not found"));
      }

      return Promise.resolve(options.ruleset);
    },
    createRepoRuleset: () => Promise.resolve(),
    updateRepoRuleset: () => Promise.resolve()
  };
}

function baseRepo(): GitHubRepo {
  return {
    ...DESIRED_REPO_SETTINGS,
    name: "scratch",
    full_name: "dutifuldev/scratch",
    archived: false,
    disabled: false,
    default_branch: "main"
  };
}
