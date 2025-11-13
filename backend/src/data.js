import fs from "fs";

const stops = new Map();
const routes = new Map();

export async function initData() {
  try {
    const stopsJson = await fs.promises.readFile(
      new URL("../data/stops.json", import.meta.url),
      "utf-8"
    );
    const routesJson = await fs.promises.readFile(
      new URL("../data/routes.json", import.meta.url),
      "utf-8"
    );

    const stopsData = JSON.parse(stopsJson);
    const routesData = JSON.parse(routesJson);

    stopsData.forEach((stop) => {
      stops.set(stop.stopId, stop);
    });

    routesData.forEach((route) => {
      routes.set(route.routeId, route);
    });

    console.log("Data (stops & routes) loaded successfully!");
  } catch (err) {
    console.error("Error loading data files:", err);
    process.exit(1);
  }
}

export { stops, routes };
