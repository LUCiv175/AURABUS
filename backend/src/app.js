import express from "express";
import { connect } from "mongoose";
import config from "./config.js";
import { stops, routes } from "./data.js";
import { setupSwagger } from "./swagger.js";

export const app = express();

setupSwagger(app);

const header = {
  method: "GET",
  headers: {
    Authorization:
      "Basic " +
      Buffer.from(`${config.tnt.username}:${config.tnt.password}`).toString(
        "base64"
      ),
    "X-Requested-With": "it.tndigit.mit",
  },
};

export async function connectDb() {
  const { user, pass, host, name } = config.db;
  if (!user || !pass || !host) {
    console.error(
      "Error: Missing MongoDB environment variables (USER, PASS, or HOST)"
    );
    process.exit(1);
  }

  const mongoURI = `mongodb://${user}:${pass}@${host}:27017/${name}?authSource=admin`;

  try {
    await connect(mongoURI);
    console.log("Connected to MongoDB successfully!");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err.message);
    process.exit(1);
  }
}

app.get("/", (req, res) => {
  res.send("Hello World! My AuraBus API is alive!");
});

app.get("/stops", (req, res) => {
  res.json(Array.from(stops.values()));
});

app.get("/stops/:id", async (req, res) => {
  const stopId = req.params.id;
  try {
    const result = await fetch(
      `${config.tnt.url}/trips_new?stopId=${stopId}&type=U&limit=30`,
      header
    );
    if (!result.ok) {
      return res.status(502).json({
        error: `Failed to fetch data from external API: ${result.status} ${result.statusText}`,
      });
    }
    const data = await result.json();
    if (data.error) {
      return res.status(500).json({ error: data.error });
    }
    const trips = [];
    data.forEach((element) => {
      const route = routes.get(element.routeId);
      trips.push({
        routeId: route.routeId,
        routeShortName: route.routeShortName,
        routeLongName: route.routeLongName,
        routeColor: route.routeColor,
        busId: element.matricolaBus,
        delay: element.delay,
        lastStopId: element.stopLast,
        nextStopId: element.stopNext,
        arrivalTimeScheduled: element.oraArrivoProgrammataAFermataSelezionata,
        arrivalTimeEstimated: element.oraArrivoEffettivaAFermataSelezionata,
        stopTimes: Array.isArray(element.stopTimes)
          ? element.stopTimes.map((st) => ({
              stopId: st.stopId,
              stopName: stops.get(st.stopId)?.stopName || "Unknown",
              arrivalTimeScheduled: st.arrivalTime,
              arrivalTimeEstimated: st.departureTime,
            }))
          : [],
      });
    });
    trips.sort((a, b) =>
      a.arrivalTimeEstimated.localeCompare(b.arrivalTimeEstimated)
    );
    res.json(trips);
  } catch (err) {
    console.error("Error fetching or processing data from external API:", err);
    res
      .status(502)
      .json({ error: "Failed to fetch or process data from external API." });
  }
});
