import { describe, expect, it } from "vitest";

import {
  parseRepo,
  parseRepoNames,
  parseRuleset,
  parseRulesetSummaries
} from "../src/github/parse.js";
import { DESIRED_REPO_SETTINGS, desiredRulesetPayload } from "../src/policy/defaults.js";

describe("parseRepo", () => {
  it("parses repository settings from GitHub", () => {
    expect(
      parseRepo({
        ...DESIRED_REPO_SETTINGS,
        name: "scratch",
        full_name: "dutifuldev/scratch",
        archived: false,
        disabled: false,
        default_branch: "main"
      })
    ).toMatchObject({
      name: "scratch",
      full_name: "dutifuldev/scratch",
      allow_auto_merge: true
    });
  });

  it("rejects unsupported squash title values", () => {
    expect(() =>
      parseRepo({
        ...DESIRED_REPO_SETTINGS,
        squash_merge_commit_title: "OTHER",
        name: "scratch",
        full_name: "dutifuldev/scratch",
        archived: false,
        disabled: false,
        default_branch: "main"
      })
    ).toThrow("squash_merge_commit_title");
  });

  it("rejects unsupported squash message values", () => {
    expect(() =>
      parseRepo({
        ...DESIRED_REPO_SETTINGS,
        squash_merge_commit_message: "OTHER",
        name: "scratch",
        full_name: "dutifuldev/scratch",
        archived: false,
        disabled: false,
        default_branch: "main"
      })
    ).toThrow("squash_merge_commit_message");
  });

  it("rejects non-object repo responses", () => {
    expect(() => parseRepo(null)).toThrow("repo must be an object");
  });
});

describe("parseRepoNames", () => {
  it("parses repository names from GitHub list responses", () => {
    expect(
      parseRepoNames([
        { name: "scratch", full_name: "dutifuldev/scratch" },
        { name: "bob", full_name: "dutifuldev/bob" }
      ])
    ).toEqual(["scratch", "bob"]);
  });

  it("rejects non-array repository list responses", () => {
    expect(() => parseRepoNames({})).toThrow("repos response must be an array");
  });
});

describe("parseRulesetSummaries", () => {
  it("parses summary responses", () => {
    expect(
      parseRulesetSummaries([{ id: 1, name: "main", target: "branch", enforcement: "active" }])
    ).toEqual([{ id: 1, name: "main", target: "branch", enforcement: "active" }]);
  });

  it("rejects non-array summary responses", () => {
    expect(() => parseRulesetSummaries({})).toThrow("rulesets response must be an array");
  });
});

describe("parseRuleset", () => {
  it("parses default branch rulesets", () => {
    expect(parseRuleset({ id: 1, ...desiredRulesetPayload() })).toEqual({
      id: 1,
      ...desiredRulesetPayload()
    });
  });

  it("preserves extra rules so drift can be repaired", () => {
    expect(
      parseRuleset({
        id: 1,
        ...desiredRulesetPayload(),
        rules: [...desiredRulesetPayload().rules, { type: "pull_request" }]
      }).rules
    ).toContainEqual({ type: "pull_request" });
  });

  it("preserves non-active enforcement and bypass actors", () => {
    expect(
      parseRuleset({
        id: 1,
        ...desiredRulesetPayload(),
        enforcement: "evaluate",
        bypass_actors: [{ actor_id: null, actor_type: "OrganizationAdmin", bypass_mode: "always" }]
      })
    ).toMatchObject({
      enforcement: "evaluate",
      bypass_actors: [{ actor_id: null, actor_type: "OrganizationAdmin", bypass_mode: "always" }]
    });
  });

  it("rejects non-branch targets", () => {
    expect(() =>
      parseRuleset({
        id: 1,
        ...desiredRulesetPayload(),
        target: "tag"
      })
    ).toThrow("ruleset.target must be branch");
  });

  it("rejects unsupported enforcement values", () => {
    expect(() =>
      parseRuleset({
        id: 1,
        ...desiredRulesetPayload(),
        enforcement: "monitor"
      })
    ).toThrow("unsupported ruleset enforcement");
  });

  it("rejects malformed bypass actors", () => {
    expect(() =>
      parseRuleset({
        id: 1,
        ...desiredRulesetPayload(),
        bypass_actors: [{ actor_id: "1", actor_type: "Team", bypass_mode: "always" }]
      })
    ).toThrow("actor_id");
  });

  it("rejects malformed ref include values", () => {
    expect(() =>
      parseRuleset({
        id: 1,
        ...desiredRulesetPayload(),
        conditions: {
          ref_name: {
            include: [1],
            exclude: []
          }
        }
      })
    ).toThrow("include");
  });
});
