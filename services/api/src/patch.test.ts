import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import './middleware/asyncHandler';

describe('asyncHandler patch', () => {
  it('catches async throws', async () => {
    const app = express();
    app.get('/boom', async () => {
      await new Promise((r) => setTimeout(r, 10));
      throw new Error('boom');
    });
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err.message });
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('boom');
  });
});
