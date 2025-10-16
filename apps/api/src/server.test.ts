import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from './server.js';

describe('server', () => {
  it('exposes health check', async () => {
    const app = await createServer();
    const response = await request(app).get('/healthz');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
