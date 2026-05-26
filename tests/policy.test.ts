import { describe, expect, it } from "vitest";

import {
  DESIRED_REPO_SETTINGS,
  desiredRulesetPayload,
  repoSettingChanges,
  RULESET_NAME
} from "../src/policy/defaults.js";

describe("policy defaults", () => {
  it("enables the intended repository defaults", () => {
    expect(DESIRED_REPO_SETTINGS).toEqual({
      allow_merge_commit: false,
      allow_squash_merge: true,
      allow_rebase_merge: true,
      allow_auto_merge: true,
      allow_update_branch: true,
      delete_branch_on_merge: true,
      squash_merge_commit_title: "PR_TITLE",
      squash_merge_commit_message: "PR_BODY"
    });
  });

  it("builds the default branch ruleset payload", () => {
    expect(desiredRulesetPayload()).toEqual({
      name: RULESET_NAME,
      target: "branch",
      enforcement: "active",
      bypass_actors: [],
      conditions: {
        ref_name: {
          include: ["~DEFAULT_BRANCH"],
          exclude: []
        }
      },
      rules: [
        { type: "deletion" },
        { type: "non_fast_forward" },
        { type: "required_linear_history" }
      ]
    });
  });

  it("reports only changed repository settings", () => {
    expect(
      repoSettingChanges({
        ...DESIRED_REPO_SETTINGS,
        allow_auto_merge: false,
        delete_branch_on_merge: false
      })
    ).toEqual([
      { key: "allow_auto_merge", current: false, desired: true },
      { key: "delete_branch_on_merge", current: false, desired: true }
    ]);
  });
});
