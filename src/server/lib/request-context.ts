import { AsyncLocalStorage } from "node:async_hooks";

const requestContext = new AsyncLocalStorage<{ sseClientId?: string }>();

export function getRequestSSEClientId(): string | undefined {
  return requestContext.getStore()?.sseClientId;
}

export function runWithRequestContext<T>(
  ctx: { sseClientId?: string },
  fn: () => T
): T {
  return requestContext.run(ctx, fn);
}
