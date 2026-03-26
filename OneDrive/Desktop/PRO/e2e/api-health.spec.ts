import { test, expect } from '@playwright/test';

test.describe('Health API', () => {
  test('GET /api/health returns 200 with valid structure', async ({ request }) => {
    const response = await request.get('/api/health');

    // Should return 200 (healthy) or 503 (unhealthy — e.g. no DB in test)
    expect([200, 503]).toContain(response.status());

    const body = await response.json();

    // Verify required fields
    expect(body).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);

    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('environment');

    // Verify checks structure
    expect(body).toHaveProperty('checks');
    expect(body.checks).toHaveProperty('database');
    expect(body.checks).toHaveProperty('cache');

    expect(body.checks.database).toHaveProperty('status');
    expect(['up', 'down']).toContain(body.checks.database.status);

    expect(body.checks.cache).toHaveProperty('status');
    expect(['up', 'down']).toContain(body.checks.cache.status);
    expect(body.checks.cache).toHaveProperty('type');
  });

  test('health endpoint has correct headers', async ({ request }) => {
    const response = await request.get('/api/health');
    const headers = response.headers();

    expect(headers['cache-control']).toContain('no-store');
    expect(headers['x-health-status']).toBeTruthy();
    expect(headers['x-response-time']).toBeTruthy();
  });

  test('health endpoint returns valid timestamp', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = await response.json();

    const timestamp = new Date(body.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();

    // Timestamp should be reasonably recent (within last minute)
    const now = Date.now();
    const diff = now - timestamp.getTime();
    expect(diff).toBeLessThan(60_000);
  });
});
