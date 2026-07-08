import type { RepoSettingChange } from "../policy/types.js";

export type TargetSelection = {
  owner: string;
  repos: string[];
  all: boolean;
};

export type PlanProgressSelectedRepos = {
  owner: string;
  total: number;
  skipped: number;
};

export type PlanProgressLoadingRepoDetails = {
  owner: string;
  total: number;
};

export type PlanProgressLoadedRepoDetails = {
  owner: string;
  total: number;
  completed: number;
  current: string;
};

export type PlanProgressPlannedRepo = {
  owner: string;
  total: number;
  completed: number;
  changed: number;
  clean: number;
  skipped: number;
  current: string;
};

export type PlanProgress = {
  loadingRepos?(owner: string): void;
  loadingRepoDetails?(state: PlanProgressLoadingRepoDetails): void;
  loadedRepoDetails?(state: PlanProgressLoadedRepoDetails): void;
  selectedRepos?(state: PlanProgressSelectedRepos): void;
  plannedRepo?(state: PlanProgressPlannedRepo): void;
};

export type BuildPlanOptions = {
  concurrency?: number;
  progress?: PlanProgress;
};

export type ApplyProgressSelectedRepos = {
  owner: string;
  total: number;
};

export type ApplyProgressAppliedRepo = {
  owner: string;
  total: number;
  completed: number;
  current: string;
};

export type ApplyProgress = {
  applyingRepos?(state: ApplyProgressSelectedRepos): void;
  appliedRepo?(state: ApplyProgressAppliedRepo): void;
};

export type ApplyOptions = {
  progress?: ApplyProgress & PlanProgress;
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
