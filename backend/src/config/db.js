import { connect } from "mongoose";
import config from "./index.js";

export async function connectDb() {
  const { uri, user, pass, host, name } = config.db;

  // A path-less URI resolves to `test`.
  const mongoURI =
    uri || `mongodb://${user}:${pass}@${host}:27017/${name}?authSource=admin`;

  if (!mongoURI) {
    console.error("❌ Error: Missing MongoDB configuration (URI or user/password)");
    process.exit(1);
  }

  try {
    await connect(mongoURI);
    console.log("✅ Connected to MongoDB successfully!");
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err.message);
    process.exit(1);
  }
}
