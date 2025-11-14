import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { fileURLToPath } from "url";
import config from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = config.api.port;

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "AuraBus API",
      version: "1.0.0",
      description: "API for tracking bus status in real time",
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: "Development Server",
      },
    ],
  },
  apis: [
    path.join(__dirname, "../docs/paths/*.yaml"),
    path.join(__dirname, "../docs/components/schemas/*.yaml"),
  ],
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
  console.log("Documentation Swagger UI available on /api-docs");
}
