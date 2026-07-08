import type { TargetSelection } from "../app/types.js";

export type CliCommand = "plan" | "apply";

export type CliOptions = TargetSelection & {
  command: CliCommand;
  token?: string;
  yes: boolean;
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
    owner: parsed.owner,
    repos: parsed.repos,
    all: parsed.all,
    yes: parsed.yes
  };

  if (parsed.token !== undefined) {
    options.token = parsed.token;
  }

  return options;
}

function validateFlags(parsed: ParsedFlags): asserts parsed is ParsedFlags & { owner: string } {
  applyPositionalTargets(parsed);

  if (parsed.owner === undefined) {
    throw new Error("Missing required owner target.\n\n" + usage());
  }

  if (!parsed.all && parsed.repos.length === 0) {
    throw new Error("Pass at least one --repo value or --all.\n\n" + usage());
  }

  if (parsed.all && parsed.repos.length > 0) {
    throw new Error("Use either --all or --repo, not both.");
  }
}

type ParsedFlags = {
  owner?: string;
  token?: string;
  repos: string[];
  targets: string[];
  all: boolean;
  yes: boolean;
};

function parseFlags(args: string[]): ParsedFlags {
  const flags: ParsedFlags = { repos: [], targets: [], all: false, yes: false };

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

  if (arg === "--all") {
    flags.all = true;
    return index;
  }

  if (arg === "--yes" || arg === "-y") {
    flags.yes = true;
    return index;
  }

  if (!arg.startsWith("--")) {
    flags.targets.push(arg);
    return index;
  }

  return parseValueFlag(args, index, flags, arg);
}

function parseValueFlag(args: string[], index: number, flags: ParsedFlags, arg: string): number {
  if (arg !== "--org" && arg !== "--owner" && arg !== "--repo" && arg !== "--token") {
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
  if (arg === "--org" || arg === "--owner") {
    flags.owner = value;
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
    applyOwnerTarget(flags);
    return;
  }

  for (const target of flags.targets) {
    applyRepoTarget(flags, target);
  }
}

function applyOwnerTarget(flags: ParsedFlags): void {
  if (flags.targets.length !== 1 || flags.targets[0]?.includes("/") === true) {
    throw new Error("Use an owner name with --all, for example: example-owner --all.");
  }

  setTargetOwner(flags, flags.targets[0]);
}

function applyRepoTarget(flags: ParsedFlags, target: string): void {
  const [owner, repo, extra] = target.split("/");

  if (
    owner === undefined ||
    repo === undefined ||
    owner.length === 0 ||
    repo.length === 0 ||
    extra !== undefined
  ) {
    throw new Error(`Repository targets must look like <owner>/<repo>: ${target}`);
  }

  setTargetOwner(flags, owner);
  flags.repos.push(repo);
}

function setTargetOwner(flags: ParsedFlags, owner: string | undefined): void {
  if (owner === undefined) {
    throw new Error("Missing owner target.");
  }

  if (flags.owner !== undefined && flags.owner !== owner) {
    throw new Error(`Conflicting owner targets: ${flags.owner} and ${owner}.`);
  }

  flags.owner = owner;
}

export function usage(): string {
  return [
    "Usage:",
    "  github-sane-defaults plan <owner>/<repo>",
    "  github-sane-defaults apply <owner>/<repo>",
    "  github-sane-defaults plan <owner> --all",
    "  github-sane-defaults apply <owner> --all",
    "  github-sane-defaults plan --owner <owner> --repo <repo>",
    "  github-sane-defaults apply --owner <owner> --repo <repo>",
    "",
    "Options:",
    "  -y, --yes  Skip apply confirmation"
  ].join("\n");
}
