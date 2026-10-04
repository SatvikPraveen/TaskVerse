// apps/api/src/docs/openapi.ts
import fs from 'fs';
import path from 'path';

import YAML from 'yaml';

export interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

const SPEC_PATH = path.resolve(__dirname, '../../openapi/openapi.yaml');

let cached: OpenApiDocument | null = null;

/** Parses the hand-maintained OpenAPI document once per process. */
export const loadOpenApiDocument = (): OpenApiDocument => {
  if (!cached) {
    cached = YAML.parse(fs.readFileSync(SPEC_PATH, 'utf8')) as OpenApiDocument;
  }
  return cached;
};

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);

/** Every (METHOD, path) pair the specification documents. */
export const documentedOperations = (doc: OpenApiDocument): Set<string> => {
  const ops = new Set<string>();
  for (const [route, item] of Object.entries(doc.paths)) {
    for (const method of Object.keys(item)) {
      if (HTTP_METHODS.has(method)) ops.add(`${method.toUpperCase()} ${route}`);
    }
  }
  return ops;
};
