import { describe, expect, it } from "vitest";

import { parseArgs } from "../src/cli/args.js";

describe("parseArgs", () => {
  it("parses a targeted plan command", () => {
    expect(parseArgs(["plan", "--org", "dutifuldev", "--repo", "scratch"])).toEqual({
      command: "plan",
      org: "dutifuldev",
      repos: ["scratch"],
      all: false
    });
  });

  it("parses an org-wide apply command", () => {
    expect(parseArgs(["apply", "--org", "dutifuldev", "--all"])).toEqual({
      command: "apply",
      org: "dutifuldev",
      repos: [],
      all: true
    });
  });

  it("rejects commands without target repositories", () => {
    expect(() => parseArgs(["plan", "--org", "dutifuldev"])).toThrow(
      "Pass at least one --repo value or --all."
    );
  });

  it("rejects mixed all and repo targeting", () => {
    expect(() => parseArgs(["apply", "--org", "dutifuldev", "--all", "--repo", "scratch"])).toThrow(
      "Use either --all or --repo"
    );
  });

  it("rejects missing option values", () => {
    expect(() => parseArgs(["plan", "--org"])).toThrow("--org requires a value.");
  });

  it("rejects unknown options", () => {
    expect(() => parseArgs(["plan", "--org", "dutifuldev", "--wat"])).toThrow(
      "Unknown option: --wat"
    );
  });

  it("parses an explicit token", () => {
    expect(parseArgs(["plan", "--org", "dutifuldev", "--repo", "scratch", "--token", "t"])).toEqual(
      {
        command: "plan",
        org: "dutifuldev",
        repos: ["scratch"],
        all: false,
        token: "t"
      }
    );
  });
});
