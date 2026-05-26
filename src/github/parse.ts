import type { GitHubRepo, GitHubRuleset, RulesetSummary } from "./types.js";
import type { RepoSettings, RulesetRule } from "../policy/types.js";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown, label: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value as JsonRecord;
}

function asString(record: JsonRecord, key: string, label: string): string {
  const value = record[key];

  if (typeof value !== "string") {
    throw new Error(`${label}.${key} must be a string`);
  }

  return value;
}

function asNumber(record: JsonRecord, key: string, label: string): number {
  const value = record[key];

  if (typeof value !== "number") {
    throw new Error(`${label}.${key} must be a number`);
  }

  return value;
}

function asBoolean(record: JsonRecord, key: string, label: string): boolean {
  const value = record[key];

  if (typeof value !== "boolean") {
    throw new Error(`${label}.${key} must be a boolean`);
  }

  return value;
}

function asStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be a string array`);
  }

  return value.map((item) => String(item));
}

function asRepoSettings(record: JsonRecord, label: string): RepoSettings {
  const squashTitle = asString(record, "squash_merge_commit_title", label);
  const squashMessage = asString(record, "squash_merge_commit_message", label);

  if (squashTitle !== "PR_TITLE" && squashTitle !== "COMMIT_OR_PR_TITLE") {
    throw new Error(`${label}.squash_merge_commit_title is not supported`);
  }

  if (
    squashMessage !== "PR_BODY" &&
    squashMessage !== "COMMIT_MESSAGES" &&
    squashMessage !== "BLANK"
  ) {
    throw new Error(`${label}.squash_merge_commit_message is not supported`);
  }

  return {
    allow_merge_commit: asBoolean(record, "allow_merge_commit", label),
    allow_squash_merge: asBoolean(record, "allow_squash_merge", label),
    allow_rebase_merge: asBoolean(record, "allow_rebase_merge", label),
    allow_auto_merge: asBoolean(record, "allow_auto_merge", label),
    allow_update_branch: asBoolean(record, "allow_update_branch", label),
    delete_branch_on_merge: asBoolean(record, "delete_branch_on_merge", label),
    squash_merge_commit_title: squashTitle,
    squash_merge_commit_message: squashMessage
  };
}

export function parseRepo(value: unknown): GitHubRepo {
  const record = asRecord(value, "repo");

  return {
    ...asRepoSettings(record, "repo"),
    name: asString(record, "name", "repo"),
    full_name: asString(record, "full_name", "repo"),
    archived: asBoolean(record, "archived", "repo"),
    disabled: asBoolean(record, "disabled", "repo"),
    default_branch: asString(record, "default_branch", "repo")
  };
}

export function parseRepos(value: unknown): GitHubRepo[] {
  if (!Array.isArray(value)) {
    throw new Error("repos response must be an array");
  }

  return value.map(parseRepo);
}

export function parseRulesetSummaries(value: unknown): RulesetSummary[] {
  if (!Array.isArray(value)) {
    throw new Error("rulesets response must be an array");
  }

  return value.map((item) => {
    const record = asRecord(item, "ruleset");

    return {
      id: asNumber(record, "id", "ruleset"),
      name: asString(record, "name", "ruleset"),
      target: asString(record, "target", "ruleset"),
      enforcement: asString(record, "enforcement", "ruleset")
    };
  });
}

function parseRules(value: unknown): RulesetRule[] {
  if (!Array.isArray(value)) {
    throw new Error("ruleset.rules must be an array");
  }

  return value.map((item) => {
    const record = asRecord(item, "ruleset.rules[]");
    const type = asString(record, "type", "ruleset.rules[]");

    if (type !== "deletion" && type !== "non_fast_forward" && type !== "required_linear_history") {
      throw new Error(`unsupported ruleset rule: ${type}`);
    }

    return { type };
  });
}

export function parseRuleset(value: unknown): GitHubRuleset {
  const record = asRecord(value, "ruleset");
  const conditions = asRecord(record["conditions"], "ruleset.conditions");
  const refName = asRecord(conditions["ref_name"], "ruleset.conditions.ref_name");

  return {
    id: asNumber(record, "id", "ruleset"),
    name: asString(record, "name", "ruleset"),
    target: "branch",
    enforcement: "active",
    bypass_actors: [],
    conditions: {
      ref_name: {
        include: asStringArray(refName["include"], "ruleset.conditions.ref_name.include"),
        exclude: asStringArray(refName["exclude"], "ruleset.conditions.ref_name.exclude")
      }
    },
    rules: parseRules(record["rules"])
  };
}
