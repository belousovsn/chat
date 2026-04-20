import { buildApp } from "./app.js";
import { config } from "./config.js";

const start = async () => {
  const app = await buildApp();
  try {
    await app.listen({
      host: config.appHost,
      port: config.appPort
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
