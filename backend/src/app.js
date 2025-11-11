const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');

const app = express();

const { user, pass, host, name } = config.db;
const mongoURI = `mongodb://${user}:${pass}@${host}:27017/${name}?authSource=admin`;

async function connectDb() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB successfully!');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  }
}

connectDb();

app.get('/', (req, res) => {
  res.send('Hello World! My AuraBus API is alive!');
});

module.exports = app;