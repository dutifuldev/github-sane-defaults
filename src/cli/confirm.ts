import { createInterface } from "node:readline/promises";

type ConfirmOptions = {
  input?: NodeJS.ReadStream;
  output?: NodeJS.WriteStream;
};

export async function confirmApply(options: ConfirmOptions = {}): Promise<boolean> {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stderr;

  if (!input.isTTY || !output.isTTY) {
    throw new Error(
      "Apply requires confirmation. Re-run with --yes to skip confirmation in non-interactive environments."
    );
  }

  const readline = createInterface({ input, output });

  try {
    return isConfirmationAccepted(await readline.question("Apply these changes? [y/N] "));
  } finally {
    readline.close();
  }
}

export function isConfirmationAccepted(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  return normalized === "y" || normalized === "yes";
}
