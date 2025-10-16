import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createServer } from './server.js';

describe('health endpoint', () => {
  it('returns healthy status', async () => {
    const app = await createServer();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'healthy' });
  });
});
