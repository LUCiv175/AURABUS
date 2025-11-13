import request from 'supertest';
import mongoose from 'mongoose';
import { app, connectDb } from '../src/app.js';

describe('API Endpoints', () => {
  
  beforeAll(async () => {
    await connectDb();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('GET / it should return 200 and a greeting message', async () => {
    const response = await request(app)
      .get('/')
      .expect('Content-Type', /text\/html/)
      .expect(200);
    expect(response.text).toBe('Hello World! My AuraBus API is alive!');
  });
});