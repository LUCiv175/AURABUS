import fs from 'fs';
const stopsData = JSON.parse(fs.readFileSync(new URL('../data/stops.json', import.meta.url)));
const routesData = JSON.parse(fs.readFileSync(new URL('../data/routes.json', import.meta.url)));

const stops = new Map();
stopsData.forEach(stop => {
  stops.set(stop.stopId, stop);
});

const routes = new Map();
routesData.forEach(route => {
  routes.set(route.routeId, route);
});


export { stops, routes };