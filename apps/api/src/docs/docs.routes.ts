// apps/api/src/docs/docs.routes.ts
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import { loadOpenApiDocument } from './openapi';

const router = Router();

router.get('/openapi.json', (_req, res) => {
  res.json(loadOpenApiDocument());
});

router.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: { url: '/api/docs/openapi.json', displayRequestDuration: true, persistAuthorization: true },
    customSiteTitle: 'TaskVerse API reference',
  })
);

export default router;
