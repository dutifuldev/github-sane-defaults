import { describe, expect, it } from "vitest";

import { applyDefaults } from "../src/app/apply.js";
import type { GitHubClient } from "../src/github/client.js";
import type { GitHubRepo, GitHubRuleset, RulesetSummary } from "../src/github/types.js";
import {
  DESIRED_REPO_SETTINGS,
  desiredRulesetPayload,
  RULESET_NAME
} from "../src/policy/defaults.js";
import type { RulesetPayload } from "../src/policy/types.js";

describe("applyDefaults", () => {
  it("updates settings and creates a missing ruleset", async () => {
    const calls: string[] = [];
    const client = fakeClient({
      calls,
      repo: { ...baseRepo(), allow_auto_merge: false },
      rulesets: []
    });

    await expect(
      applyDefaults(client, { org: "dutifuldev", repos: ["scratch"], all: false })
    ).resolves.toMatchObject({ applied: 1 });

    expect(calls).toEqual([
      "listRepoRulesets:scratch",
      "updateRepoDefaults:scratch",
      "createRepoRuleset:scratch"
    ]);
  });

  it("updates an existing changed ruleset without touching matching settings", async () => {
    const calls: string[] = [];
    const updatedPayloads: RulesetPayload[] = [];
    const currentRuleset: GitHubRuleset = {
      id: 123,
      ...desiredRulesetPayload(),
      rules: [
        { type: "deletion" },
        { type: "pull_request", parameters: { required_approving_review_count: 1 } }
      ]
    };
    const client = fakeClient({
      calls,
      updatedPayloads,
      repo: baseRepo(),
      rulesets: [{ id: 123, name: RULESET_NAME, target: "branch", enforcement: "active" }],
      ruleset: currentRuleset
    });

    await applyDefaults(client, { org: "dutifuldev", repos: ["scratch"], all: false });

    expect(calls).toEqual([
      "listRepoRulesets:scratch",
      "getRepoRuleset:123",
      "listRepoRulesets:scratch",
      "getRepoRuleset:123",
      "updateRepoRuleset:123"
    ]);
    expect(updatedPayloads).toHaveLength(1);
    expect(updatedPayloads[0]?.rules).toEqual([
      { type: "deletion" },
      { type: "pull_request", parameters: { required_approving_review_count: 1 } },
      { type: "non_fast_forward" },
      { type: "required_linear_history" }
    ]);
  });

  it("creates the ruleset if it disappears between plan and apply", async () => {
    const calls: string[] = [];
    const client = fakeClient({
      calls,
      repo: baseRepo(),
      rulesets: [{ id: 123, name: RULESET_NAME, target: "branch", enforcement: "active" }],
      ruleset: {
        id: 123,
        ...desiredRulesetPayload(),
        rules: [{ type: "deletion" }]
      },
      rulesetsAfterPlan: []
    });

    await applyDefaults(client, { org: "dutifuldev", repos: ["scratch"], all: false });

    expect(calls).toEqual([
      "listRepoRulesets:scratch",
      "getRepoRuleset:123",
      "listRepoRulesets:scratch",
      "createRepoRuleset:scratch"
    ]);
  });
});

type FakeClientOptions = {
  calls: string[];
  repo: GitHubRepo;
  rulesets: RulesetSummary[];
  rulesetsAfterPlan?: RulesetSummary[];
  ruleset?: GitHubRuleset;
  updatedPayloads?: RulesetPayload[];
};

function fakeClient(options: FakeClientOptions): GitHubClient {
  let rulesetListCalls = 0;

  return {
    getRepo: () => Promise.resolve(options.repo),
    listOrgRepos: () => Promise.resolve([options.repo]),
    updateRepoDefaults: (_owner: string, repo: string) => {
      options.calls.push(`updateRepoDefaults:${repo}`);
      return Promise.resolve();
    },
    listRepoRulesets: (_owner: string, repo: string) => {
      rulesetListCalls += 1;
      options.calls.push(`listRepoRulesets:${repo}`);
      return Promise.resolve(
        rulesetListCalls > 1 && options.rulesetsAfterPlan !== undefined
          ? options.rulesetsAfterPlan
          : options.rulesets
      );
    },
    getRepoRuleset: (_owner: string, _repo: string, id: number) => {
      options.calls.push(`getRepoRuleset:${String(id)}`);
      return options.ruleset === undefined
        ? Promise.reject(new Error("ruleset not found"))
        : Promise.resolve(options.ruleset);
    },
    createRepoRuleset: (_owner: string, repo: string, payload: RulesetPayload) => {
      expect(payload.name).toBe(RULESET_NAME);
      options.calls.push(`createRepoRuleset:${repo}`);
      return Promise.resolve();
    },
    updateRepoRuleset: (_owner: string, _repo: string, id: number, payload: RulesetPayload) => {
      expect(payload.name).toBe(RULESET_NAME);
      options.updatedPayloads?.push(payload);
      options.calls.push(`updateRepoRuleset:${String(id)}`);
      return Promise.resolve();
    }
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
