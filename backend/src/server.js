import { app, connectDb, config } from "./app.js";
import { initData } from "./data.js";

const port = config.api.port;

async function startServer() {
  try {
    await Promise.all([connectDb(), initData()]);

    app.listen(port, () => {
      console.log(`Server API listening on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
