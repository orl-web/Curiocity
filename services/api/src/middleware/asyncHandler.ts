import { Router, Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler = (fn: AsyncFn): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

let patched = false;

function patchRouterForAsyncErrors() {
  if (patched) return;
  patched = true;
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'all'] as const;
  for (const method of methods) {
    const original = (Router.prototype as any)[method];
    if (typeof original !== 'function') continue;
    (Router.prototype as any)[method] = function (...args: unknown[]) {
      const wrapped = args.map((arg) =>
        typeof arg === 'function' && arg.length <= 3 ? asyncHandler(arg as AsyncFn) : arg
      );
      return original.apply(this, wrapped);
    };
  }
}

patchRouterForAsyncErrors();
