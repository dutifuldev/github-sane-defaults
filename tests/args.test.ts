import { describe, expect, it } from "vitest";

import { parseArgs } from "../src/cli/args.js";

describe("parseArgs", () => {
  it("parses a positional repository plan command", () => {
    expect(parseArgs(["plan", "osolmaz/scratch"])).toEqual({
      command: "plan",
      owner: "osolmaz",
      repos: ["scratch"],
      all: false,
      yes: false
    });
  });

  it("parses an owner targeted plan command", () => {
    expect(parseArgs(["plan", "--owner", "example-org", "--repo", "scratch"])).toEqual({
      command: "plan",
      owner: "example-org",
      repos: ["scratch"],
      all: false,
      yes: false
    });
  });

  it("parses a legacy targeted plan command", () => {
    expect(parseArgs(["plan", "--org", "example-org", "--repo", "scratch"])).toEqual({
      command: "plan",
      owner: "example-org",
      repos: ["scratch"],
      all: false,
      yes: false
    });
  });

  it("parses an owner-wide apply command", () => {
    expect(parseArgs(["apply", "example-org", "--all"])).toEqual({
      command: "apply",
      owner: "example-org",
      repos: [],
      all: true,
      yes: false
    });
  });

  it("parses apply confirmation bypass flags", () => {
    expect(parseArgs(["apply", "osolmaz/scratch", "--yes"])).toMatchObject({
      command: "apply",
      owner: "osolmaz",
      repos: ["scratch"],
      all: false,
      yes: true
    });
    expect(parseArgs(["apply", "osolmaz/scratch", "-y"])).toMatchObject({ yes: true });
  });

  it("parses progress flags", () => {
    expect(parseArgs(["plan", "osolmaz/scratch", "--progress"])).toMatchObject({
      progress: "always"
    });
    expect(parseArgs(["plan", "osolmaz/scratch", "--no-progress"])).toMatchObject({
      progress: "never"
    });
  });

  it("rejects commands without target repositories", () => {
    expect(() => parseArgs(["plan", "--org", "example-org"])).toThrow(
      "Pass at least one --repo value or --all."
    );
  });

  it("rejects mixed all and repo targeting", () => {
    expect(() =>
      parseArgs(["apply", "--org", "example-org", "--all", "--repo", "scratch"])
    ).toThrow("Use either --all or --repo");
  });

  it("rejects malformed positional repository targets", () => {
    expect(() => parseArgs(["plan", "scratch"])).toThrow(
      "Repository targets must look like <owner>/<repo>"
    );
  });

  it("rejects conflicting owner targets", () => {
    expect(() => parseArgs(["plan", "--owner", "other", "osolmaz/scratch"])).toThrow(
      "Conflicting owner targets"
    );
  });

  it("rejects missing option values", () => {
    expect(() => parseArgs(["plan", "--org"])).toThrow("--org requires a value.");
  });

  it("rejects unknown options", () => {
    expect(() => parseArgs(["plan", "--org", "example-org", "--wat"])).toThrow(
      "Unknown option: --wat"
    );
  });

  it("parses an explicit token", () => {
    expect(parseArgs(["plan", "osolmaz/scratch", "--token", "t"])).toEqual({
      command: "plan",
      owner: "osolmaz",
      repos: ["scratch"],
      all: false,
      yes: false,
      token: "t"
    });
  });
});
