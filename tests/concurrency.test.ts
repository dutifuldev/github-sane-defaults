import { describe, expect, it } from "vitest";

import { mapWithConcurrency } from "../src/shared/concurrency.js";

describe("mapWithConcurrency", () => {
  it("stops assigning new work after the first failure and awaits active workers", async () => {
    const started: number[] = [];
    let slowWorkerFinished = false;
    const failure = new Error("request failed");

    await expect(
      mapWithConcurrency([0, 1, 2, 3], 2, async (item) => {
        started.push(item);

        if (item === 0) {
          await delay(5);
          throw failure;
        }

        if (item === 1) {
          await delay(20);
          slowWorkerFinished = true;
          return item;
        }

        throw new Error(`Unexpected work item: ${String(item)}`);
      })
    ).rejects.toBe(failure);

    expect(started).toEqual([0, 1]);
    expect(slowWorkerFinished).toBe(true);
  });
});

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
