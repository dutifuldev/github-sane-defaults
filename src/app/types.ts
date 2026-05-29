import type { RepoSettingChange } from "../policy/types.js";

export type TargetSelection = {
  org: string;
  repos: string[];
  all: boolean;
};

export type RulesetPlan = {
  action: "create" | "update" | "none";
  coveredBy?: string;
};

export type RepoPlan = {
  name: string;
  fullName: string;
  archived: boolean;
  settingChanges: RepoSettingChange[];
  ruleset: RulesetPlan;
};

export type ApplySummary = {
  planned: RepoPlan[];
  applied: number;
};
