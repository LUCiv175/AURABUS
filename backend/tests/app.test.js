import request from 'supertest';
import mongoose from 'mongoose';
import { app, connectDb } from '../src/app.js';
import expectedStops from '../data/stops.json' with { type: 'json' };

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

  it('GET /stops it should return 200 and all stops data', async () => {
    const response = await request(app)
      .get('/stops') 
      .expect('Content-Type', /json/) 
      .expect(200);

    const sortByStopId = arr => arr.slice().sort((a, b) => {
      if (a.stopId < b.stopId) return -1;
      if (a.stopId > b.stopId) return 1;
      return 0;
    });
    expect(sortByStopId(response.body)).toEqual(sortByStopId(expectedStops));
  });
});