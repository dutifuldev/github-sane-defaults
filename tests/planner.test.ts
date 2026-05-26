import { describe, expect, it } from "vitest";

import { buildPlan, rulesetEquivalent } from "../src/app/planner.js";
import type { GitHubClient } from "../src/github/client.js";
import type { GitHubRepo, GitHubRuleset, RulesetSummary } from "../src/github/types.js";
import { DESIRED_REPO_SETTINGS, desiredRulesetPayload } from "../src/policy/defaults.js";

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

  it("plans no ruleset change when payload already matches", () => {
    const desired = desiredRulesetPayload();
    const existing: GitHubRuleset = { id: 1, ...desired };

    expect(rulesetEquivalent(existing, desired)).toBe(true);
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
