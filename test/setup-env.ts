process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://puul:puul@localhost:5433/puul_test';
process.env.JWT_SECRET = 'test-secret';
process.env.THROTTLE_ENABLED = 'false';
