import "dotenv/config";

import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./shared/utils/logger.js";

const port = Number(env.PORT) || 3000;
const host = env.HOST || "127.0.0.1";
const nodeEnv = env.NODE_ENV || "development";

const server = app.listen(port, host, () => {
  logger.success(`Server is running`, {
    path: `http://${host}:${port}`,
  });
  logger.info(`Environment: ${nodeEnv}`);
  logger.info(`Modules: advisor, student`);
  logger.info(`Advisor API: http://${host}:${port}/api/v1/auth/advisor`);
});

const shutdown = (signal: string) => {
  logger.info(`${signal} received. Closing server...`);

  server.close(() => {
    logger.success("Server closed gracefully");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", reason as Error);
});