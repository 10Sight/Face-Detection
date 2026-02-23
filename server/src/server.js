import app from "./app.js";
import connectDB from "./db/connectDB.js";
import env from "./configs/env.config.js";
import morganConfig from "./loggers/morgan.logger.js";
import logger from "./loggers/winston.logger.js";

const { port, serverUrl, nodeEnv } = env;

connectDB();
app.use(morganConfig());
app.listen(port, () => {
    logger.info(`${serverUrl}:${port} -- ${nodeEnv}`);
});