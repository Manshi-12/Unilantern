import "dotenv/config";

import app from "./app.js";
import { logger } from "./shared/utils/logger.js";

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "127.0.0.1";

const server = app.listen(port, host, () => {
  logger.success(`Server is running`, {
    path: `http://${host}:${port}`,
  });
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
