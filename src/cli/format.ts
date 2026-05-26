import type { ApplySummary, RepoPlan } from "../app/types.js";

export function formatPlan(plans: RepoPlan[]): string {
  if (plans.length === 0) {
    return "No repositories selected.";
  }

  return plans.map(formatRepoPlan).join("\n\n");
}

export function formatApplySummary(summary: ApplySummary): string {
  return [
    `Applied sane defaults to ${String(summary.applied)} repository/repositories.`,
    formatPlan(summary.planned)
  ]
    .filter((line) => line.length > 0)
    .join("\n\n");
}

function formatRepoPlan(plan: RepoPlan): string {
  const lines = [plan.fullName];

  if (plan.settingChanges.length === 0) {
    lines.push("  settings: no changes");
  } else {
    lines.push("  settings:");
    lines.push(
      ...plan.settingChanges.map(
        (change) =>
          `    ${change.key}: ${formatValue(change.current)} -> ${formatValue(change.desired)}`
      )
    );
  }

  lines.push(`  ruleset: ${plan.ruleset.action}`);

  return lines.join("\n");
}

function formatValue(value: boolean | string | null): string {
  return value === null ? "unset" : String(value);
}
