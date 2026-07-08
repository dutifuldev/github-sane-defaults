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
      buildPlan(client, { owner: "dutifuldev", repos: ["scratch"], all: false })
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
      buildPlan(client, { owner: "dutifuldev", repos: ["scratch"], all: false })
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
      buildPlan(client, { owner: "dutifuldev", repos: ["scratch"], all: false })
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
      buildPlan(client, { owner: "dutifuldev", repos: ["scratch"], all: false })
    ).resolves.toMatchObject([{ ruleset: { action: "update" } }]);
  });

  it("plans repositories concurrently while preserving repository order", async () => {
    const repos = [baseRepo("a"), baseRepo("b"), baseRepo("c")];
    let activeCalls = 0;
    let maxActiveCalls = 0;
    const completed: string[] = [];
    const progressCompleted: number[] = [];
    const client = fakeClient({
      repo: repos[0] ?? baseRepo("missing"),
      repos,
      rulesets: [],
      onListRepoRulesets: async (repo) => {
        activeCalls += 1;
        maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
        await delay(repo === "a" ? 20 : 5);
        completed.push(repo);
        activeCalls -= 1;
      }
    });

    const plans = await buildPlan(
      client,
      { owner: "dutifuldev", repos: [], all: true },
      {
        concurrency: 2,
        progress: {
          plannedRepo: (state) => {
            progressCompleted.push(state.completed);
          }
        }
      }
    );

    expect(plans.map((plan) => plan.name)).toEqual(["a", "b", "c"]);
    expect(completed[0]).not.toBe("a");
    expect(maxActiveCalls).toBe(2);
    expect(progressCompleted).toEqual([1, 2, 3]);
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
  onListRepoRulesets?: (repo: string) => Promise<void>;
  repo: GitHubRepo;
  repos?: GitHubRepo[];
  rulesets: RulesetSummary[];
  ruleset?: GitHubRuleset;
};

function fakeClient(options: FakeClientOptions): GitHubClient {
  return {
    getRepo: () => Promise.resolve(options.repo),
    listOwnerRepos: () => Promise.resolve(options.repos ?? [options.repo]),
    updateRepoDefaults: () => Promise.resolve(),
    listRepoRulesets: async (_owner: string, repo: string) => {
      await options.onListRepoRulesets?.(repo);
      return options.rulesets;
    },
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

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function baseRepo(name = "scratch"): GitHubRepo {
  return {
    ...DESIRED_REPO_SETTINGS,
    name,
    full_name: `dutifuldev/${name}`,
    archived: false,
    disabled: false,
    default_branch: "main"
  };
}
