const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');

describe('API Endpoints', () => {

  afterAll(async () => {
    await mongoose.connection.close();
  });


  it('GET / it should return 200 and a greeting message', async () => {
    const response = await request(app)
      .get('/')
      .expect('Content-Type', /text\/html/)
      .expect(200);
    expect(
      response.text
    ).toBe('Hello World! My AuraBus API is alive!');
  });

});