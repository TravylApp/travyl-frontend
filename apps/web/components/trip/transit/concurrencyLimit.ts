/**
 * Lightweight concurrency limiter — replaces `p-limit` which depends on
 * Node.js `async_hooks` and can't be bundled for the browser by Turbopack.
 */
export function concurrencyLimit(concurrency: number) {
  const queue: (() => void)[] = [];
  let active = 0;

  function next() {
    if (active < concurrency && queue.length > 0) {
      const task = queue.shift()!;
      active++;
      task();
    }
  }

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      queue.push(async () => {
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        } finally {
          active--;
          next();
        }
      });
      next();
    });
  };
}
