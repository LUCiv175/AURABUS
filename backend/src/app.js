const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');

const app = express();

async function connectDb() {
  const { user, pass, host, name } = config.db;
  if (!user || !pass || !host) {
    console.error('Error: Missing MongoDB environment variables (USER, PASS, or HOST)');
    process.exit(1);
  }
  
  const mongoURI = `mongodb://${user}:${pass}@${host}:27017/${name}?authSource=admin`;

  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB successfully!');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  connectDb();
}

app.get('/', (req, res) => {
  res.send('Hello World! My AuraBus API is alive!');
});

module.exports = app;