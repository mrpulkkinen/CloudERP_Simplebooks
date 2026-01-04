import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'events';
import { createRequest, createResponse } from 'node-mocks-http';

import { createServer } from './server.js';

describe('server', () => {
  it('exposes health check', async () => {
    const app = await createServer();
    const req = createRequest({
      method: 'GET',
      url: '/healthz'
    });
    const res = createResponse({
      eventEmitter: EventEmitter
    });

    await new Promise<void>((resolve, reject) => {
      res.on('end', resolve);
      res.on('error', reject);
      app(req, res);
    });

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().status).toBe('ok');
  });
});
