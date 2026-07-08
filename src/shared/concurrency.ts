export async function mapWithConcurrency<T, U>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<U>
): Promise<U[]> {
  const limit = Math.max(1, Math.floor(concurrency));
  const results: ({ value: U } | undefined)[] = Array.from(
    { length: items.length },
    () => undefined
  );
  let firstError: Error | undefined;
  let nextIndex = 0;

  function recordFailure(error: unknown): void {
    firstError ??= error instanceof Error ? error : new Error(String(error));
  }

  async function runWorker(): Promise<void> {
    while (firstError === undefined) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      const item = items[index];

      if (item === undefined) {
        recordFailure(new Error(`Missing concurrency item at index ${String(index)}.`));
        return;
      }

      try {
        results[index] = { value: await worker(item, index) };
      } catch (error) {
        recordFailure(error);
        return;
      }
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  if (firstError !== undefined) {
    throw firstError;
  }

  return results.map((result, index) => {
    if (result === undefined) {
      throw new Error(`Missing concurrency result at index ${String(index)}.`);
    }

    return result.value;
  });
}
