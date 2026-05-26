import type { ApplySummary, RepoPlan } from "../app/types.js";

type FormatOptions = {
  color?: boolean;
};

const ansi = {
  reset: "\u001B[0m",
  bold: "\u001B[1m",
  dim: "\u001B[2m",
  green: "\u001B[32m",
  yellow: "\u001B[33m",
  cyan: "\u001B[36m"
};

export function shouldUseColor(): boolean {
  return process.env["NO_COLOR"] === undefined && process.stdout.isTTY;
}

export function formatPlan(plans: RepoPlan[], options: FormatOptions = {}): string {
  if (plans.length === 0) {
    return "No repositories selected.";
  }

  const style = createStyle(options.color === true);
  const changed = plans.filter(hasChanges).length;

  return [
    style.title(`Plan: ${formatCount(plans.length, "repository")}`),
    style.dim(`${String(changed)} with changes, ${String(plans.length - changed)} already clean`),
    "",
    ...plans.map((plan) => formatRepoPlan(plan, style)).flatMap((lines) => [...lines, ""])
  ]
    .join("\n")
    .trimEnd();
}

export function formatApplySummary(summary: ApplySummary, options: FormatOptions = {}): string {
  const style = createStyle(options.color === true);

  return [
    style.success(`Applied sane defaults to ${formatCount(summary.applied, "repository")}.`),
    "",
    formatPlan(summary.planned, options)
  ].join("\n");
}

function formatRepoPlan(plan: RepoPlan, style: Style): string[] {
  const status = hasChanges(plan) ? style.warn("changes") : style.success("clean");
  const lines = [`${status} ${style.repo(plan.fullName)}`];

  if (plan.settingChanges.length === 0) {
    lines.push(`  Settings  ${style.success("no changes")}`);
  } else {
    lines.push("  Settings");
    lines.push(
      ...plan.settingChanges.map(
        (change) =>
          `    ${change.key.padEnd(27)} ${formatValue(change.current)} -> ${formatValue(change.desired)}`
      )
    );
  }

  lines.push(`  Ruleset   ${formatRulesetAction(plan.ruleset.action, style)}`);

  return lines;
}

function formatValue(value: boolean | string | null): string {
  return value === null ? "unset" : String(value);
}

function formatRulesetAction(action: RepoPlan["ruleset"]["action"], style: Style): string {
  if (action === "none") {
    return style.success("no changes");
  }

  if (action === "create") {
    return style.warn("create");
  }

  return style.warn("update");
}

function hasChanges(plan: RepoPlan): boolean {
  return plan.settingChanges.length > 0 || plan.ruleset.action !== "none";
}

function formatCount(count: number, noun: string): string {
  const suffix = noun.endsWith("y") ? "ies" : "s";
  const plural = noun.endsWith("y") ? noun.slice(0, -1) : noun;

  return `${String(count)} ${count === 1 ? noun : plural + suffix}`;
}

type Style = {
  title(value: string): string;
  repo(value: string): string;
  success(value: string): string;
  warn(value: string): string;
  dim(value: string): string;
};

function createStyle(enabled: boolean): Style {
  return {
    title: (value) => colorize(value, `${ansi.bold}${ansi.cyan}`, enabled),
    repo: (value) => colorize(value, ansi.bold, enabled),
    success: (value) => colorize(value, ansi.green, enabled),
    warn: (value) => colorize(value, ansi.yellow, enabled),
    dim: (value) => colorize(value, ansi.dim, enabled)
  };
}

function colorize(value: string, code: string, enabled: boolean): string {
  return enabled ? `${code}${value}${ansi.reset}` : value;
}
