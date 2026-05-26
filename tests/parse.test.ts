import { describe, expect, it } from "vitest";

import { parseRepo, parseRuleset, parseRulesetSummaries } from "../src/github/parse.js";
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

  it("rejects unsupported rules", () => {
    expect(() =>
      parseRuleset({
        id: 1,
        ...desiredRulesetPayload(),
        rules: [{ type: "creation" }]
      })
    ).toThrow("unsupported ruleset rule");
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
