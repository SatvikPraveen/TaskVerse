// apps/api/src/utils/routes.ts
import type { Application } from 'express';

export interface RouteEntry {
  method: string;
  path: string;
}

interface Layer {
  route?: { path: string; methods: Record<string, boolean> };
  name: string;
  handle: { stack?: Layer[] };
  regexp: RegExp & { fast_slash?: boolean };
  keys?: Array<{ name: string }>;
}

/**
 * Recovers the mount path of a sub-router from the regexp Express builds
 * for it, e.g. /^\/api\/tasks\/?(?=\/|$)/i → "/api/tasks".
 */
const mountPath = (layer: Layer): string => {
  if (layer.regexp.fast_slash) return '';
  const source = layer.regexp.source
    .replace(/^\^/, '')
    .replace(/\\\/\?\(\?=\\\/\|\$\)\$?$/, '')
    .replace(/\\\//g, '/');
  // Express encodes params in mounts as capture groups; map them back.
  let index = 0;
  return source.replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, () => `:${layer.keys?.[index++]?.name ?? 'param'}`);
};

/** Express route params become OpenAPI templates and regex suffixes are dropped. */
const toTemplate = (expressPath: string): string =>
  expressPath.replace(/:([A-Za-z0-9_]+)(\([^)]*\))?/g, '{$1}').replace(/\/$/, '') || '/';

const walk = (stack: Layer[], prefix: string, out: RouteEntry[]): void => {
  for (const layer of stack) {
    if (layer.route) {
      const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      for (const p of paths) {
        for (const method of Object.keys(layer.route.methods)) {
          out.push({ method: method.toUpperCase(), path: toTemplate(`${prefix}${p}`) });
        }
      }
    } else if (layer.name === 'router' && layer.handle.stack) {
      walk(layer.handle.stack, `${prefix}${mountPath(layer)}`, out);
    }
  }
};

/** Lists every concrete route an Express 4 application serves. */
export const listRoutes = (app: Application): RouteEntry[] => {
  const router = (app as unknown as { _router?: { stack: Layer[] } })._router;
  const out: RouteEntry[] = [];
  if (router) walk(router.stack, '', out);
  return out;
};
