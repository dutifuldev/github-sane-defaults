export type RepoSettingValue = boolean | string;

export type RepoSettings = {
  allow_merge_commit: boolean;
  allow_squash_merge: boolean;
  allow_rebase_merge: boolean;
  allow_auto_merge: boolean;
  allow_update_branch: boolean;
  delete_branch_on_merge: boolean;
  squash_merge_commit_title: "PR_TITLE" | "COMMIT_OR_PR_TITLE";
  squash_merge_commit_message: "PR_BODY" | "COMMIT_MESSAGES" | "BLANK";
};

export type RepoSettingKey = keyof RepoSettings;

export type RepoSettingChange = {
  key: RepoSettingKey;
  current: RepoSettingValue | null;
  desired: RepoSettingValue;
};

export type RefNameCondition = {
  include: string[];
  exclude: string[];
};

export type RulesetConditions = {
  ref_name: RefNameCondition;
};

export type RulesetRule = {
  type: "deletion" | "non_fast_forward" | "required_linear_history";
};

export type RulesetPayload = {
  name: string;
  target: "branch";
  enforcement: "active";
  bypass_actors: [];
  conditions: RulesetConditions;
  rules: RulesetRule[];
};
