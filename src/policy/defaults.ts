import type { RepoSettingChange, RepoSettingKey, RepoSettings, RulesetPayload } from "./types.js";

export const RULESET_NAME = "github-sane-defaults: default branch";

export const DESIRED_REPO_SETTINGS: RepoSettings = {
  allow_merge_commit: false,
  allow_squash_merge: true,
  allow_rebase_merge: true,
  allow_auto_merge: true,
  allow_update_branch: true,
  delete_branch_on_merge: true,
  squash_merge_commit_title: "COMMIT_OR_PR_TITLE",
  squash_merge_commit_message: "COMMIT_MESSAGES"
};

export const REPO_SETTING_KEYS: RepoSettingKey[] = [
  "allow_merge_commit",
  "allow_squash_merge",
  "allow_rebase_merge",
  "allow_auto_merge",
  "allow_update_branch",
  "delete_branch_on_merge",
  "squash_merge_commit_title",
  "squash_merge_commit_message"
];

export function desiredRulesetPayload(): RulesetPayload {
  return {
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
    rules: [{ type: "deletion" }, { type: "non_fast_forward" }, { type: "required_linear_history" }]
  };
}

export function repoSettingChanges(current: Partial<RepoSettings>): RepoSettingChange[] {
  return REPO_SETTING_KEYS.flatMap((key) => {
    const desired = DESIRED_REPO_SETTINGS[key];
    const existing = current[key] ?? null;

    if (existing === desired) {
      return [];
    }

    return [{ key, current: existing, desired }];
  });
}
