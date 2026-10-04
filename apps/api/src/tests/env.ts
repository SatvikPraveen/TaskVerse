// apps/api/src/tests/env.ts
// Runs before any module is imported so `config/env` validates against a
// deterministic, hermetic environment. mongodb-memory-server supplies the URI.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskverse_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-access-secret-must-be-at-least-32-chars';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-must-be-at-least-32-chars';
process.env.LOG_LEVEL = 'error';
process.env.RATE_LIMIT_MAX_REQUESTS = '100000';
process.env.AUTH_RATE_LIMIT_MAX = '100000';
process.env.UPLOAD_RATE_LIMIT_MAX = '100000';
process.env.METRICS_ENABLED = 'false';
