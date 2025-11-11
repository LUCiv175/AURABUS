require('dotenv').config();

const config = {
  api: {
    port: process.env.API_PORT || 8888
  },
  db: {
    user: process.env.MONGO_USER,
    pass: process.env.MONGO_PASS,
    host: process.env.MONGO_HOST,
    name: 'aurabus_db'
  }
};

module.exports = config;