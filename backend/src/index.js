const express = require('express');
const mongoose = require('mongoose');

require('dotenv').config();

const dbUser = process.env.MONGO_USER;
const dbPass = process.env.MONGO_PASS;
const dbHost = process.env.MONGO_HOST;
const dbName = 'aurabus_db';

const mongoURI = `mongodb://${dbUser}:${dbPass}@${dbHost}:27017/${dbName}?authSource=admin`;

mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('Error connecting to MongoDB:', err.message));

const app = express();
const port = process.env.API_PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server Api Listening on port ${port}`);
});