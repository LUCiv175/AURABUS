import request from 'supertest';
import mongoose from 'mongoose';
import { app, connectDb } from '../src/app.js';
import expectedStops from '../data/stops.json' with { type: 'json' };
import { initData } from '../src/data.js';
import { jest } from "@jest/globals";

describe('API Endpoints', () => {
  
  beforeAll(async () => {
    await connectDb();
    await initData();
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

describe("GET /stops/:id (Trip Details)", () => {
  let fetchSpy;
  beforeEach(() => {
    jest.clearAllMocks();
    fetchSpy = jest.spyOn(global, "fetch");
  });

  it("should return 200 and transformed trips on success", async () => {
    const mockApiData = [
      {
        routeId: "R1",
        matricolaBus: "B123",
        delay: 0,
        stopLast: "S1",
        stopNext: "S3",
        oraArrivoProgrammataAFermataSelezionata: "10:00:00",
        oraArrivoEffettivaAFermataSelezionata: "10:00:15",
        stopTimes: [
          { stopId: "S1", arrivalTime: "09:55:00", departureTime: "09:55:10" },
          { stopId: "S2", arrivalTime: "10:00:00", departureTime: "10:00:15" },
        ],
      },
    ];

    const mockRoute = {
      routeId: "R1",
      routeShortName: "10",
      routeLongName: "Centro - Sobborgo",
      routeColor: "blue",
    };
    
    const mockStopTime1 = { stopName: "Fermata 1" };
    const mockStopTime2 = { stopName: "Fermata 2" };

    fetchSpy.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockApiData),
    });
    routes.get.mockReturnValue(mockRoute);
    stops.get.mockImplementation((stopId) => {
      if (stopId === "S1") return mockStopTime1;
      if (stopId === "S2") return mockStopTime2;
      return { stopName: "Unknown" };
    });

    const res = await request(app).get("/stops/S2");

    expect(res.statusCode).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("stopId=S2"),
      expect.any(Object)
    );
    expect(routes.get).toHaveBeenCalledWith("R1");
    expect(stops.get).toHaveBeenCalledWith("S1");
    expect(stops.get).toHaveBeenCalledWith("S2");
    
    expect(res.body).toEqual([
      {
        routeId: "R1",
        routeShortName: "10",
        routeLongName: "Centro - Sobborgo",
        routeColor: "blue",
        busId: "B123",
        delay: 0,
        lastStopId: "S1",
        nextStopId: "S3",
        arrivalTimeScheduled: "10:00:00",
        arrivalTimeEstimated: "10:00:15",
        stopTimes: [
          { stopId: "S1", stopName: "Fermata 1", arrivalTimeScheduled: "09:55:00", arrivalTimeEstimated: "09:55:10" },
          { stopId: "S2", stopName: "Fermata 2", arrivalTimeScheduled: "10:00:00", arrivalTimeEstimated: "10:00:15" },
        ],
      },
    ]);
  });

  it("should return 502 if external API fetch fails", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Down",
    });

    const res = await request(app).get("/stops/qualunque-id");

    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({
      error: "Failed to fetch data from external API: 503 Service Down",
    });
  });

  it("should return 500 if external API returns an application error", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ error: "Invalid API Key" }),
    });

    const res = await request(app).get("/stops/id-valido");

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Invalid API Key" });
  });
  
  it("should return 502 if fetch throws a network error", async () => {
    fetchSpy.mockRejectedValue(new Error("Network connection failed"));

    const res = await request(app).get("/stops/id-valido");

    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: "Failed to fetch or process data from external API." });
  });
});