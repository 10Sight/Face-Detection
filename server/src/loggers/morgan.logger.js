import morgan from "morgan";
import logger from "./winston.logger.js";
import env from "../configs/env.config.js";

const { nodeEnv } = env;

const morganStream = {
    write: (message) => logger.http(message),
};

const morganConfig = () => {
    if (nodeEnv === "development") {
        return morgan("dev", { stream: morganStream });
    }
    return morgan("combined", { stream: morganStream });
};

export default morganConfig;