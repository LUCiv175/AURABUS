import express from 'express';
import { connect } from 'mongoose';
import config from './config.js';
import stopsData from '../data/stops.json' with { type: 'json' };
import routesData from '../data/routes.json' with { type: 'json' };

export const app = express();

const header = 'Basic ' + Buffer.from(`${config.tnt.username}:${config.tnt.password}`).toString('base64');

export async function connectDb() {
  const { user, pass, host, name } = config.db;
  if (!user || !pass || !host) {
    console.error('Error: Missing MongoDB environment variables (USER, PASS, or HOST)');
    process.exit(1);
  }
  
  const mongoURI = `mongodb://${user}:${pass}@${host}:27017/${name}?authSource=admin`;

  try {
    await connect(mongoURI);
    console.log('Connected to MongoDB successfully!');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  }
}

app.get('/', (req, res) => {
  res.send('Hello World! My AuraBus API is alive!');
});

app.get('/stops', (req, res) => {
  res.json(stopsData);
});

app.get('/stop/:id', async(req, res) => {
  const stopId = req.params.id;
  const result = await fetch(`${config.tnt.url}/trips_new?stopId=${stopId}&type=U&limit=30`, {
    method: 'GET',
    headers: {
      Authorization: header
    }
  })
  const data = await result.json();
  if (data.error) {
    return res.status(500).json({ error: data.error });
  }
  const trips = [];
  data.forEach(element => {
    const route = routesData.find(route => route.routeId === element.routeId);
    trips.push({
      routeId: route.routeId,
      routeShortName: route.routeShortName,
      routeLongName: route.routeLongName,
      routeColor: route.routeColor,
      arrivalTimeScheduled: element.oraArrivoProgrammataAFermataSelezionata,
      arrivalTimeEstimated: element.oraArrivoEffettivaAFermataSelezionata,
    });
  });
  trips.sort((a, b) => a.arrivalTimeEstimated.localeCompare(b.arrivalTimeEstimated));

  res.json(trips);

});


export { config };