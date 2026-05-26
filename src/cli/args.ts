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
  all: boolean;
};

function parseFlags(args: string[]): ParsedFlags {
  const flags: ParsedFlags = { repos: [], all: false };

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

export function usage(): string {
  return [
    "Usage:",
    "  github-sane-defaults plan --org <org> --repo <repo>",
    "  github-sane-defaults apply --org <org> --repo <repo>",
    "  github-sane-defaults apply --org <org> --all"
  ].join("\n");
}
