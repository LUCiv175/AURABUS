import { jest } from "@jest/globals";
import request from "supertest";
import { initData } from "../src/utils/staticData.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret";
process.env.REFRESH_SECRET = "test_refresh_secret";
process.env.GOOGLE_AUTH_CLIENT_ID = "test-google-client-id";
process.env.API_URL = "https://api.tnt.test";
process.env.API_USER = "test_user";
process.env.API_PASSWORD = "test_pass";
process.env.PREDICTION_URL = "https://prediction.test";

const mockBcrypt = {
  genSalt: jest.fn().mockResolvedValue("salt"),
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn().mockResolvedValue(true),
};

jest.unstable_mockModule("bcryptjs", () => ({ default: mockBcrypt }));

const mockUser = { findOne: jest.fn(), findById: jest.fn(), find: jest.fn() };
jest.unstable_mockModule("../src/models/User.js", () => ({ User: mockUser }));

const verifyIdToken = jest.fn();
jest.unstable_mockModule("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdToken;
  },
}));

const mockRedisClient = {
  on: jest.fn(),
  connect: jest.fn(),
  isOpen: true,
  get: jest.fn().mockResolvedValue(null),
  setEx: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  sendCommand: jest.fn().mockResolvedValue("OK"),
};

jest.unstable_mockModule("../src/config/redis.js", () => ({
  redisClient: mockRedisClient,
  initRedis: jest.fn(),
}));

const mockBusFind = jest.fn();
jest.unstable_mockModule("../src/models/Bus.js", () => ({
  Bus: {
    find: mockBusFind,
  },
}));

const { app } = await import("../src/app.js");

const originalFetch = globalThis.fetch;
let fetchMock;

describe("Stops API", () => {
  beforeAll(async () => {
    await initData();
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    mockRedisClient.get.mockReset();
    mockRedisClient.setEx.mockReset();
    mockBusFind.mockReset();
    fetchMock.mockReset();

    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.setEx.mockResolvedValue("OK");
    mockBusFind.mockResolvedValue([
      { bus_id: "BUS001", capacity: 80, type: "electric" },
      { bus_id: "BUS002", capacity: 100, type: "standard" },
    ]);

    fetchMock.mockImplementation((url) => {
      if (url.includes("/trips_new")) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      if (url.includes("/predict")) {
        return Promise.resolve({
          ok: false,
          status: 404,
        });
      }
      return Promise.reject(new Error(`Unmocked fetch URL: ${url}`));
    });
  });

  describe("GET /stops/:id - Success Cases", () => {
    it("should return stop details with valid stop ID", async () => {
      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP123",
          directionId: 0,
          delay: 120,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 5,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:47:00Z",
          stopTimes: [
            { stopId: 101, arrivalTime: "10:30:00", sequence: 1 },
            { stopId: 102, arrivalTime: "10:45:00", sequence: 2 },
            { stopId: 103, arrivalTime: "11:00:00", sequence: 3 },
          ],
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        if (url.includes("/predict")) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const trip = res.body[0];
      expect(trip).toHaveProperty("routeId");
      expect(trip).toHaveProperty("routeShortName");
      expect(trip).toHaveProperty("routeLongName");
      expect(trip).toHaveProperty("busId");
      expect(trip).toHaveProperty("busCapacity");
      expect(trip).toHaveProperty("occupancy");
      expect(trip.occupancy).toHaveProperty("realTime");
      expect(trip.occupancy).toHaveProperty("expected");
      expect(trip).toHaveProperty("stopTimes");
      expect(Array.isArray(trip.stopTimes)).toBe(true);
    });

    it("should serve from cache when available", async () => {
      const cachedData = [
        {
          routeId: 396,
          routeShortName: "1",
          busId: "BUS001",
          occupancy: {
            realTime: { percentage: 50 },
            expected: { percentage: 60 },
          },
        },
      ];

      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(cachedData));

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(cachedData);

      expect(mockRedisClient.get).toHaveBeenCalledWith(
        "aurabus_cache:/stops/102",
      );
    });

    it("should cache successful responses", async () => {
      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP123",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:45:00Z",
          stopTimes: [
            { stopId: 101, arrivalTime: "10:30:00", sequence: 1 },
            { stopId: 102, arrivalTime: "10:45:00", sequence: 2 },
          ],
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        if (url.includes("/predict")) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      await request(app).get("/stops/102");

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        "aurabus_cache:/stops/102",
        60,
        expect.any(String),
      );
    });

    it("should handle multiple trips for same stop", async () => {
      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP1",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:45:00Z",
          stopTimes: [{ stopId: 102, arrivalTime: "10:45:00", sequence: 1 }],
        },
        {
          routeId: 396,
          matricolaBus: "BUS002",
          tripId: "TRIP2",
          directionId: 1,
          delay: 60,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 2,
          lastEventRecivedAt: "2024-01-15T10:40:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T11:00:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T11:01:00Z",
          stopTimes: [{ stopId: 102, arrivalTime: "11:00:00", sequence: 1 }],
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        if (url.includes("/predict")) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].busId).toBe("BUS001");
      expect(res.body[1].busId).toBe("BUS002");
    });

    it("should sort trips by arrival time", async () => {
      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS002",
          tripId: "TRIP2",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T11:00:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T11:00:00Z",
          stopTimes: [{ stopId: 102, arrivalTime: "11:00:00", sequence: 1 }],
        },
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP1",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:45:00Z",
          stopTimes: [{ stopId: 102, arrivalTime: "10:45:00", sequence: 1 }],
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        if (url.includes("/predict")) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
      expect(res.body[0].arrivalTimeEstimated).toBe("2024-01-15T10:45:00Z");
      expect(res.body[1].arrivalTimeEstimated).toBe("2024-01-15T11:00:00Z");
    });
  });

  describe("GET /stops/:id - Error Cases", () => {
    it("should return 400 for invalid stop ID", async () => {
      const res = await request(app).get("/stops/invalid");

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid stop ID");
    });

    it("should return 400 for non-numeric stop ID", async () => {
      const res = await request(app).get("/stops/abc123");

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should handle external API errors gracefully", async () => {
      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
          });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("External API Error");
    });

    it("should handle API timeout", async () => {
      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return new Promise((resolve, reject) => {
            setTimeout(() => reject({ name: "AbortError" }), 6000);
          });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("External service unavailable");
    });

    it("should handle API error response", async () => {
      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ error: "Stop not found in TNT system" }),
          });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Stop not found in TNT system");
    });

    it("should handle network errors", async () => {
      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Network error");
    });

    it("should continue if Redis read fails", async () => {
      mockRedisClient.get.mockRejectedValueOnce(
        new Error("Redis connection failed"),
      );

      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP123",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:45:00Z",
          stopTimes: [{ stopId: 102, arrivalTime: "10:45:00", sequence: 1 }],
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        if (url.includes("/predict")) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should continue if Redis write fails", async () => {
      mockRedisClient.setEx.mockRejectedValueOnce(
        new Error("Redis write failed"),
      );

      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP123",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:45:00Z",
          stopTimes: [{ stopId: 102, arrivalTime: "10:45:00", sequence: 1 }],
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        if (url.includes("/predict")) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /stops/:id - Edge Cases", () => {
    it("should filter out trips with unknown route IDs", async () => {
      const mockApiResponse = [
        {
          routeId: 999999,
          matricolaBus: "BUS001",
          tripId: "TRIP1",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:45:00Z",
          stopTimes: [{ stopId: 102, arrivalTime: "10:45:00", sequence: 1 }],
        },
        {
          routeId: 396,
          matricolaBus: "BUS002",
          tripId: "TRIP2",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T11:00:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T11:00:00Z",
          stopTimes: [{ stopId: 102, arrivalTime: "11:00:00", sequence: 1 }],
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        if (url.includes("/predict")) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].routeId).toBe(396);
    });

    it("should use default capacity when bus not found in DB", async () => {
      mockBusFind.mockResolvedValueOnce([]);

      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS_UNKNOWN",
          tripId: "TRIP123",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:45:00Z",
          stopTimes: [{ stopId: 102, arrivalTime: "10:45:00", sequence: 1 }],
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        if (url.includes("/predict")) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
      expect(res.body[0].busCapacity).toBe(100);
      expect(res.body[0].busType).toBe("standard");
    });

    it("should handle empty stopTimes array", async () => {
      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP123",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 0,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:45:00Z",
          stopTimes: [],
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(0);
    });

    it("should handle missing stopTimes property", async () => {
      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP123",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 0,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:45:00Z",
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(0);
    });

    it("should handle prediction service success", async () => {
      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP123",
          directionId: 0,
          delay: 120,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:47:00Z",
          stopTimes: [
            { stopId: 101, arrivalTime: "10:30:00", sequence: 1 },
            { stopId: 102, arrivalTime: "10:45:00", sequence: 2 },
            { stopId: 103, arrivalTime: "11:00:00", sequence: 3 },
          ],
        },
      ];

      const mockPredictionResponse = {
        predictions: [
          { stop_encoded: 102, predicted_delay: 180 },
          { stop_encoded: 103, predicted_delay: 240 },
        ],
      };

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        if (url.includes("/predict")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockPredictionResponse,
          });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
      const stopTime102 = res.body[0].stopTimes.find((st) => st.stopId === 102);
      expect(stopTime102.delayPredicted).toBe(180);
    });

    it("should send the origin stop and both horizon distances to the AI service", async () => {
      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP123",
          directionId: 0,
          delay: 4,
          stopLast: 101,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:47:00Z",
          stopTimes: [
            { stopId: 101, arrivalTime: "10:30:00", sequence: 1 },
            { stopId: 102, arrivalTime: "10:45:00", sequence: 2 },
            { stopId: 103, arrivalTime: "11:00:00", sequence: 3 },
          ],
        },
      ];

      let sentBody = null;
      fetchMock.mockImplementation((url, options) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({ ok: true, json: async () => mockApiResponse });
        }
        if (url.includes("/predict")) {
          sentBody = JSON.parse(options.body);
          return Promise.resolve({
            ok: true,
            json: async () => ({ predictions: [] }),
          });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      await request(app).get("/stops/102");

      expect(sentBody.current_stop_encoded).toBe(101);
      expect(sentBody.current_delay).toBe(4);
      expect(sentBody.future_stops).toEqual([
        expect.objectContaining({
          stop_encoded: 102,
          hour: 10,
          stops_ahead: 1,
          minutes_ahead: 15,
        }),
        expect.objectContaining({
          stop_encoded: 103,
          hour: 11,
          stops_ahead: 2,
          minutes_ahead: 30,
        }),
      ]);
    });

    it("should assign predictions per visit when a route calls at the same stop twice", async () => {
      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP123",
          directionId: 0,
          delay: 120,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:47:00Z",
          stopTimes: [
            { stopId: 101, arrivalTime: "10:30:00", sequence: 1 },
            { stopId: 102, arrivalTime: "10:45:00", sequence: 2 },
            { stopId: 103, arrivalTime: "11:00:00", sequence: 3 },
            // Loop back through 102 on the way to the terminus.
            { stopId: 102, arrivalTime: "11:15:00", sequence: 4 },
          ],
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({ ok: true, json: async () => mockApiResponse });
        }
        if (url.includes("/predict")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              predictions: [
                { stop_encoded: 102, predicted_delay: 180 },
                { stop_encoded: 103, predicted_delay: 240 },
                { stop_encoded: 102, predicted_delay: 300 },
              ],
            }),
          });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
      const stopTimes = res.body[0].stopTimes;
      expect(stopTimes[1].delayPredicted).toBe(180);
      expect(stopTimes[2].delayPredicted).toBe(240);
      expect(stopTimes[3].delayPredicted).toBe(300);
    });

    it("should handle prediction service failure gracefully", async () => {
      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP123",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:45:00Z",
          stopTimes: [
            { stopId: 101, arrivalTime: "10:30:00", sequence: 1 },
            { stopId: 102, arrivalTime: "10:45:00", sequence: 2 },
          ],
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        if (url.includes("/predict")) {
          return Promise.reject(new Error("Prediction service down"));
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
      expect(res.body[0].stopTimes[1].delayPredicted).toBeNull();
    });

    it("should handle prediction service non-OK response", async () => {
      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP123",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:45:00Z",
          stopTimes: [
            { stopId: 101, arrivalTime: "10:30:00", sequence: 1 },
            { stopId: 102, arrivalTime: "10:45:00", sequence: 2 },
          ],
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        if (url.includes("/predict")) {
          return Promise.resolve({
            ok: false,
            status: 503,
          });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
      expect(res.body[0].stopTimes[1].delayPredicted).toBeNull();
    });
  });

  describe("GET /stops/:id - Bus Repository Integration", () => {
    it("should fetch bus details from database", async () => {
      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP123",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:45:00Z",
          stopTimes: [{ stopId: 102, arrivalTime: "10:45:00", sequence: 1 }],
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        if (url.includes("/predict")) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      await request(app).get("/stops/102");

      expect(mockBusFind).toHaveBeenCalledWith({
        bus_id: { $in: ["BUS001"] },
      });
    });

    it("should map multiple buses correctly", async () => {
      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP1",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:45:00Z",
          stopTimes: [{ stopId: 102, arrivalTime: "10:45:00", sequence: 1 }],
        },
        {
          routeId: 396,
          matricolaBus: "BUS002",
          tripId: "TRIP2",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:40:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T11:00:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T11:00:00Z",
          stopTimes: [{ stopId: 102, arrivalTime: "11:00:00", sequence: 1 }],
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        if (url.includes("/predict")) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
      expect(res.body[0].busCapacity).toBe(80);
      expect(res.body[0].busType).toBe("electric");
      expect(res.body[1].busCapacity).toBe(100);
      expect(res.body[1].busType).toBe("standard");
    });
  });

  describe("GET /stops/:id - Stop Name Resolution", () => {
    it("should resolve stop names from static data", async () => {
      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP123",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 1,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:45:00Z",
          stopTimes: [
            { stopId: 101, arrivalTime: "10:30:00", sequence: 1 },
            { stopId: 102, arrivalTime: "10:45:00", sequence: 2 },
          ],
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        if (url.includes("/predict")) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
      const stopTimes = res.body[0].stopTimes;
      stopTimes.forEach((st) => {
        expect(st).toHaveProperty("stopId");
        expect(st).toHaveProperty("stopName");
        expect(typeof st.stopName).toBe("string");
      });
    });

    it("should use 'Unknown' for unresolvable stop names", async () => {
      const mockApiResponse = [
        {
          routeId: 396,
          matricolaBus: "BUS001",
          tripId: "TRIP123",
          directionId: 0,
          delay: 0,
          stopLast: 0,
          stopNext: 102,
          lastSequenceDetection: 0,
          lastEventRecivedAt: "2024-01-15T10:30:00Z",
          oraArrivoProgrammataAFermataSelezionata: "2024-01-15T10:45:00Z",
          oraArrivoEffettivaAFermataSelezionata: "2024-01-15T10:45:00Z",
          stopTimes: [{ stopId: 999999, arrivalTime: "10:30:00", sequence: 1 }],
        },
      ];

      fetchMock.mockImplementation((url) => {
        if (url.includes("/trips_new")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockApiResponse,
          });
        }
        if (url.includes("/predict")) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
      });

      const res = await request(app).get("/stops/102");

      expect(res.statusCode).toBe(200);
    });
  });
});
