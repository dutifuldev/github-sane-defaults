import type { RepoSettings, RulesetPayload, RulesetRule } from "../policy/types.js";

export type GitHubRepo = RepoSettings & {
  name: string;
  full_name: string;
  archived: boolean;
  disabled: boolean;
  default_branch: string;
};

export type RulesetSummary = {
  id: number;
  name: string;
  target: string;
  enforcement: string;
};

export type GitHubRuleset = RulesetPayload & {
  id: number;
  rules: RulesetRule[];
};

export type GitHubErrorContext = {
  method: string;
  path: string;
  status: number;
  body: string;
};
