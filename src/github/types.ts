import type { BypassActor, RepoSettings, RulesetConditions, RulesetRule } from "../policy/types.js";

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

export type GitHubRuleset = {
  id: number;
  name: string;
  target: "branch";
  enforcement: "active" | "evaluate" | "disabled";
  bypass_actors: BypassActor[];
  conditions: RulesetConditions;
  rules: RulesetRule[];
};

export type GitHubErrorContext = {
  method: string;
  path: string;
  status: number;
  body: string;
};
