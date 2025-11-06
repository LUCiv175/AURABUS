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

const requiredEnv = [
  config.db.user,
  config.db.pass,
  config.db.host
];

if (requiredEnv.some(val => val === undefined || val === null || val === '')) {
  console.error('Error: Missing required environment variables for database connection.');
  console.error('Please ensure that MONGO_USER, MONGO_PASS, and MONGO_HOST are set in the .env file');
  process.exit(1);
}

module.exports = config;