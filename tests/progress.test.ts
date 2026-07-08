import { describe, expect, it } from "vitest";

import {
  createProgressReporter,
  type ProgressEnvironment,
  type ProgressStream
} from "../src/cli/progress.js";

describe("createProgressReporter", () => {
  it("does not write progress for non-tty auto mode", () => {
    const stream = fakeStream({ isTTY: false });
    const progress = createProgressReporter("auto", stream, {});

    progress.loadingRepos?.("osolmaz");
    progress.selectedRepos?.({ owner: "osolmaz", total: 1, skipped: 0 });
    progress.plannedRepo?.({
      owner: "osolmaz",
      total: 1,
      completed: 1,
      changed: 1,
      clean: 0,
      skipped: 0,
      current: "osolmaz/tools"
    });
    progress.stop();

    expect(stream.chunks).toEqual([]);
  });

  it("renders and clears a single-line status bar", () => {
    const stream = fakeStream({ columns: 120, isTTY: true });
    const progress = createProgressReporter("auto", stream, {});

    progress.loadingRepos?.("osolmaz");
    progress.loadingRepoDetails?.({ owner: "osolmaz", total: 2 });
    progress.loadedRepoDetails?.({
      owner: "osolmaz",
      total: 2,
      completed: 1,
      current: "osolmaz/tools"
    });
    progress.selectedRepos?.({ owner: "osolmaz", total: 2, skipped: 1 });
    progress.plannedRepo?.({
      owner: "osolmaz",
      total: 2,
      completed: 1,
      changed: 1,
      clean: 0,
      skipped: 1,
      current: "osolmaz/tools"
    });
    progress.applyingRepos?.({ owner: "osolmaz", total: 1 });
    progress.appliedRepo?.({
      owner: "osolmaz",
      total: 1,
      completed: 1,
      current: "osolmaz/tools"
    });
    progress.stop();

    expect(stream.chunks.join("")).toContain("Loading repositories for osolmaz");
    expect(stream.chunks.join("")).toContain("Loading repository details for osolmaz");
    expect(stream.chunks.join("")).toContain("Planning osolmaz");
    expect(stream.chunks.join("")).toContain("Applying osolmaz");
    expect(stream.chunks.join("")).toContain("[##########----------]");
    expect(stream.chunks.join("")).toContain("[####################]");
    expect(stream.chunks.join("")).toContain("1/2");
    expect(stream.chunks.at(-1)).toBe("\r\x1b[K");
  });

  it("can force progress in non-tty output and disables progress in CI", () => {
    const forcedStream = fakeStream({ isTTY: false });
    const ciStream = fakeStream({ isTTY: true });
    const ciEnvironment: ProgressEnvironment = { CI: "true" };

    createProgressReporter("always", forcedStream, {}).loadingRepos?.("osolmaz");
    createProgressReporter("auto", ciStream, ciEnvironment).loadingRepos?.("osolmaz");

    expect(forcedStream.chunks.join("")).toContain("Loading repositories");
    expect(ciStream.chunks).toEqual([]);
  });
});

type FakeStream = ProgressStream & {
  chunks: string[];
};

function fakeStream(options: { columns?: number; isTTY: boolean }): FakeStream {
  const chunks: string[] = [];
  const stream: FakeStream = {
    isTTY: options.isTTY,
    chunks,
    write: (chunk: string) => {
      chunks.push(chunk);
      return true;
    }
  };

  if (options.columns !== undefined) {
    stream.columns = options.columns;
  }

  return stream;
}
