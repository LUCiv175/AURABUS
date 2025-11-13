import express from 'express';
import { connect } from 'mongoose';
import config from './config.js';
import stopData from '../data/stops.json' with { type: 'json' };

export const app = express();

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
  res.json(stopData);
});


export { config };