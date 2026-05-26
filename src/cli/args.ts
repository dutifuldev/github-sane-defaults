import type { TargetSelection } from "../app/types.js";

export type CliCommand = "plan" | "apply";

export type CliOptions = TargetSelection & {
  command: CliCommand;
  token?: string;
};

export function parseArgs(args: string[]): CliOptions {
  const [command, ...rest] = args;

  if (command !== "plan" && command !== "apply") {
    throw new Error(usage());
  }

  const parsed = parseFlags(rest);

  validateFlags(parsed);

  const options: CliOptions = {
    command,
    org: parsed.org,
    repos: parsed.repos,
    all: parsed.all
  };

  if (parsed.token !== undefined) {
    options.token = parsed.token;
  }

  return options;
}

function validateFlags(parsed: ParsedFlags): asserts parsed is ParsedFlags & { org: string } {
  applyPositionalTargets(parsed);

  if (parsed.org === undefined) {
    throw new Error("Missing required --org option.\n\n" + usage());
  }

  if (!parsed.all && parsed.repos.length === 0) {
    throw new Error("Pass at least one --repo value or --all.\n\n" + usage());
  }

  if (parsed.all && parsed.repos.length > 0) {
    throw new Error("Use either --all or --repo, not both.");
  }
}

type ParsedFlags = {
  org?: string;
  token?: string;
  repos: string[];
  targets: string[];
  all: boolean;
};

function parseFlags(args: string[]): ParsedFlags {
  const flags: ParsedFlags = { repos: [], targets: [], all: false };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === undefined) {
      throw new Error("Unexpected missing argument.");
    }

    index = parseFlag(args, index, flags);
  }

  return flags;
}

function parseFlag(args: string[], index: number, flags: ParsedFlags): number {
  const arg = args[index];

  if (arg === undefined) {
    throw new Error("Unexpected missing argument.");
  }

  if (!arg.startsWith("--")) {
    flags.targets.push(arg);
    return index;
  }

  if (arg === "--all") {
    flags.all = true;
    return index;
  }

  return parseValueFlag(args, index, flags, arg);
}

function parseValueFlag(args: string[], index: number, flags: ParsedFlags, arg: string): number {
  if (arg !== "--org" && arg !== "--repo" && arg !== "--token") {
    throw new Error(`Unknown option: ${arg}`);
  }

  const value = args[index + 1];

  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${arg} requires a value.`);
  }

  setFlag(flags, arg, value);
  return index + 1;
}

function setFlag(flags: ParsedFlags, arg: string, value: string): void {
  if (arg === "--org") {
    flags.org = value;
    return;
  }

  if (arg === "--repo") {
    flags.repos.push(value);
    return;
  }

  flags.token = value;
}

function applyPositionalTargets(flags: ParsedFlags): void {
  if (flags.targets.length === 0) {
    return;
  }

  if (flags.all) {
    applyOrgTarget(flags);
    return;
  }

  for (const target of flags.targets) {
    applyRepoTarget(flags, target);
  }
}

function applyOrgTarget(flags: ParsedFlags): void {
  if (flags.targets.length !== 1 || flags.targets[0]?.includes("/") === true) {
    throw new Error("Use an organization name with --all, for example: dutifuldev --all.");
  }

  setTargetOrg(flags, flags.targets[0]);
}

function applyRepoTarget(flags: ParsedFlags, target: string): void {
  const [org, repo, extra] = target.split("/");

  if (
    org === undefined ||
    repo === undefined ||
    org.length === 0 ||
    repo.length === 0 ||
    extra !== undefined
  ) {
    throw new Error(`Repository targets must look like <org>/<repo>: ${target}`);
  }

  setTargetOrg(flags, org);
  flags.repos.push(repo);
}

function setTargetOrg(flags: ParsedFlags, org: string | undefined): void {
  if (org === undefined) {
    throw new Error("Missing organization target.");
  }

  if (flags.org !== undefined && flags.org !== org) {
    throw new Error(`Conflicting organization targets: ${flags.org} and ${org}.`);
  }

  flags.org = org;
}

export function usage(): string {
  return [
    "Usage:",
    "  github-sane-defaults plan <org>/<repo>",
    "  github-sane-defaults apply <org>/<repo>",
    "  github-sane-defaults plan <org> --all",
    "  github-sane-defaults apply <org> --all",
    "  github-sane-defaults plan --org <org> --repo <repo>",
    "  github-sane-defaults apply --org <org> --repo <repo>"
  ].join("\n");
}
