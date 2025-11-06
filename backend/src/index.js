const express = require('express');
const mongoose = require('mongoose');

const config = require('./config');

const app = express();
const port = config.api.port;

const { user, pass, host, name } = config.db;
const mongoURI = `mongodb://${user}:${pass}@${host}:27017/${name}?authSource=admin`;

mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch(err => {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  });

app.get('/', (req, res) => {
  res.send('Hello World! My AuraBus API is alive!');
});

app.listen(port, () => {
  console.log(`Server API listening on port ${port}`);
});