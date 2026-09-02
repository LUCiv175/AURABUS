import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, "../../.env");

if (fs.existsSync(envPath)) {
  console.log(`✅ .env found at: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  if (process.env.NODE_ENV === "production" || process.env.MONGO_USER) {
    console.log(
      `ℹ️  .env file not found, but environment variables seem to be set. Skipping file load.`,
    );
  } else {
    console.warn(
      `⚠️  WARNING: .env file NOT found at: ${envPath}. Ensure variables are set via environment.`,
    );
  }
}

const config = {
  api: {
    port: process.env.API_PORT || 8888,
    baseUrl: process.env.API_BASE_URL || "http://localhost",
  },
  db: {
    uri: process.env.MONGO_URI,
    host: process.env.MONGO_HOST || "localhost",
    user: process.env.MONGO_USER,
    pass: process.env.MONGO_PASSWORD,
    name: "aurabus_db",
  },
  tnt: {
    url: process.env.API_URL,
    username: process.env.API_USER,
    password: process.env.API_PASSWORD,
  },
  prediction: {
    url: process.env.PREDICTION_URL,
    internalKey: process.env.INTERNAL_API_KEY,
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },
};

const missingEnvConfig = [];
if (!config.tnt.url) missingEnvConfig.push("API_URL");
if (!config.tnt.username) missingEnvConfig.push("API_USER");
if (!config.tnt.password) missingEnvConfig.push("API_PASSWORD");
if (!config.db.uri && (!config.db.user || !config.db.pass)) {
  missingEnvConfig.push("MONGO_URI");
}
if (!config.prediction.url) missingEnvConfig.push("PREDICTION_URL");
if (!config.redis.password) missingEnvConfig.push("REDIS_PASSWORD");

if (missingEnvConfig.length > 0) {
  throw new Error(
    `❌ CRITICAL ERROR: Missing required environment configuration: ${missingEnvConfig.join(
      ", ",
    )}`,
  );
}

export default config;
