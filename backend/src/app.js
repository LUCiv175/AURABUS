import express from 'express';
import { connect } from 'mongoose';
import config from './config.js';
import { stops, routes } from './data.js';

export const app = express();

const header = {
  method: 'GET',
  headers: {
    Authorization: 'Basic ' + Buffer.from(`${config.tnt.username}:${config.tnt.password}`).toString('base64'),
    'X-Requested-With': 'it.tndigit.mit'
  }
};

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
  res.json(Array.from(stops.values()));
});

app.get('/stop/:id', async(req, res) => {
  const stopId = req.params.id;
  const result = await fetch(`${config.tnt.url}/trips_new?stopId=${stopId}&type=U&limit=30`, header);
  const data = await result.json();
  if (data.error) {
    return res.status(500).json({ error: data.error });
  }
  const trips = [];
  data.forEach(element => {
    const route = routes.get(element.routeId);
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