import { describe, expect, it } from "vitest";

import {
  countChangedRepos,
  formatApplySummary,
  formatPlan,
  planHasChanges
} from "../src/cli/format.js";

describe("formatPlan", () => {
  it("formats an empty plan", () => {
    expect(formatPlan([])).toBe("No repositories selected.");
  });

  it("formats repository setting and ruleset changes", () => {
    expect(
      formatPlan([
        {
          name: "scratch",
          fullName: "dutifuldev/scratch",
          archived: false,
          settingChanges: [{ key: "allow_auto_merge", current: false, desired: true }],
          ruleset: { action: "create" }
        }
      ])
    ).toBe(
      [
        "Plan: 1 repository",
        "1 with changes, 0 already clean",
        "",
        "changes dutifuldev/scratch",
        "  Settings",
        "    allow_auto_merge            false -> true",
        "  Ruleset   create"
      ].join("\n")
    );
  });

  it("formats clean repositories", () => {
    expect(
      formatPlan([
        {
          name: "scratch",
          fullName: "dutifuldev/scratch",
          archived: false,
          settingChanges: [],
          ruleset: { action: "none" }
        }
      ])
    ).toBe(
      [
        "Plan: 1 repository",
        "0 with changes, 1 already clean",
        "",
        "clean dutifuldev/scratch",
        "  Settings  no changes",
        "  Ruleset   no changes"
      ].join("\n")
    );
  });

  it("formats rulesets covered by existing policy", () => {
    expect(
      formatPlan([
        {
          name: "scratch",
          fullName: "dutifuldev/scratch",
          archived: false,
          settingChanges: [],
          ruleset: { action: "none", coveredBy: "Protect main" }
        }
      ])
    ).toBe(
      [
        "Plan: 1 repository",
        "0 with changes, 1 already clean",
        "",
        "clean dutifuldev/scratch",
        "  Settings  no changes",
        "  Ruleset   no changes (covered by Protect main)"
      ].join("\n")
    );
  });

  it("formats colored output when requested", () => {
    expect(
      formatPlan(
        [
          {
            name: "scratch",
            fullName: "dutifuldev/scratch",
            archived: false,
            settingChanges: [],
            ruleset: { action: "none" }
          }
        ],
        { color: true }
      )
    ).toContain("\u001B[32mclean\u001B[0m");
  });
});

describe("formatApplySummary", () => {
  it("formats the apply count and nested plan", () => {
    expect(formatApplySummary({ planned: [], applied: 0 })).toBe(
      "Applied sane defaults to 0 repositories.\n\nNo repositories selected."
    );
  });
});

describe("planHasChanges", () => {
  it("detects clean and changed plans", () => {
    const cleanPlan = {
      name: "clean",
      fullName: "dutifuldev/clean",
      archived: false,
      settingChanges: [],
      ruleset: { action: "none" as const }
    };
    const changedPlan = {
      name: "changed",
      fullName: "dutifuldev/changed",
      archived: false,
      settingChanges: [{ key: "allow_auto_merge" as const, current: false, desired: true }],
      ruleset: { action: "none" as const }
    };

    expect(planHasChanges([cleanPlan])).toBe(false);
    expect(planHasChanges([cleanPlan, changedPlan])).toBe(true);
    expect(countChangedRepos([cleanPlan, changedPlan])).toBe(1);
  });
});
