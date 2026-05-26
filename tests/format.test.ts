import { describe, expect, it } from "vitest";

import { formatApplySummary, formatPlan } from "../src/cli/format.js";

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
        "dutifuldev/scratch",
        "  settings:",
        "    allow_auto_merge: false -> true",
        "  ruleset: create"
      ].join("\n")
    );
  });
});

describe("formatApplySummary", () => {
  it("formats the apply count and nested plan", () => {
    expect(formatApplySummary({ planned: [], applied: 0 })).toBe(
      "Applied sane defaults to 0 repository/repositories.\n\nNo repositories selected."
    );
  });
});
