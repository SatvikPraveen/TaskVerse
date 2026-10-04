// apps/api/src/tests/openapi.int.test.ts
import { documentedOperations, loadOpenApiDocument } from '@/docs/openapi';
import { listRoutes } from '@/utils/routes';

import { app, request } from './helpers';

/** Routes that are infrastructure for the docs themselves. */
const UNDOCUMENTED_PREFIXES = ['/api/docs'];

describe('OpenAPI contract', () => {
  it('parses and declares the API version', () => {
    const doc = loadOpenApiDocument();
    expect(doc.openapi).toMatch(/^3\.1/);
    expect(doc.info.title).toBe('TaskVerse API');
    expect(doc.info.version).toBe('2.0.0');
  });

  it('documents every route the application actually serves', () => {
    const documented = documentedOperations(loadOpenApiDocument());
    const served = listRoutes(app)
      .filter(r => !UNDOCUMENTED_PREFIXES.some(p => r.path.startsWith(p)))
      .map(r => `${r.method} ${r.path}`);

    expect(served.length).toBeGreaterThan(40);
    const missing = served.filter(op => !documented.has(op));
    expect(missing).toEqual([]);
  });

  it('does not document routes that no longer exist', () => {
    const served = new Set(listRoutes(app).map(r => `${r.method} ${r.path}`));
    const stale = [...documentedOperations(loadOpenApiDocument())].filter(op => !served.has(op));
    expect(stale).toEqual([]);
  });

  it('serves the document as JSON and the interactive reference', async () => {
    const json = await request(app).get('/api/docs/openapi.json').expect(200);
    expect(json.body.info.title).toBe('TaskVerse API');

    const html = await request(app).get('/api/docs/').expect(200);
    expect(html.headers['content-type']).toMatch(/text\/html/);
    expect(html.text).toMatch(/TaskVerse API reference/);
  });
});
