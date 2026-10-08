import { Router, Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler = (fn: AsyncFn): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

function wrapArg(arg: unknown): unknown {
  return typeof arg === 'function' && arg.length <= 3 ? asyncHandler(arg as AsyncFn) : arg;
}

let patched = false;

function patchRouterForAsyncErrors() {
  if (patched) return;
  patched = true;
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'all'] as const;

  // Layer 1: router.get/post/... (express <4.22 keeps these on Router.prototype, 4.22 on the Router function object)
  for (const method of methods) {
    for (const target of [Router.prototype as unknown as Record<string, unknown>, Router as unknown as Record<string, unknown>]) {
      const original = target[method];
      if (typeof original !== 'function') continue;
      target[method] = function (...args: unknown[]) {
        return original.apply(this, args.map(wrapArg));
      };
    }
  }

  // Layer 2: Route.prototype — app.get() bypasses router.get() and calls route.get() directly,
  // so handlers registered on the express app itself would otherwise escape the patch
  try {
    const probeRoute = Router().route('/__async_patch_probe');
    const routeProto = Object.getPrototypeOf(probeRoute) as Record<string, unknown>;
    for (const method of methods) {
      const original = routeProto[method];
      if (typeof original !== 'function') continue;
      routeProto[method] = function (...args: unknown[]) {
        return original.apply(this, args.map(wrapArg));
      };
    }
  } catch {
    // express layout changed — Layer 1 still covers router-based registrations
  }
}

patchRouterForAsyncErrors();
