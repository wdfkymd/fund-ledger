/**
 * Run async work over items with a max concurrency limit.
 * Failures are isolated per-item via the worker itself.
 */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return []

  const limit = Math.max(1, Math.min(concurrency, items.length))
  const results = new Array<R>(items.length)
  let next = 0

  async function run(): Promise<void> {
    while (next < items.length) {
      const i = next
      next += 1
      results[i] = await worker(items[i], i)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => run()))
  return results
}
