import winston from "winston";
import env from "../configs/env.config.js";

const {
    nodeEnv
} = env;

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
};

const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "cyan",
    verbose: "blue",
    debug: "magenta",
    silly: "white",
};

winston.addColors(colors);

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.printf((info) => {
        const { level, message, timestamp, stack, ...meta } = info;
        let logMsg = stack ? `${timestamp} [${level}] ${message}\n${stack}` : `${timestamp} [${level}] ${message}`;
        if (Object.keys(meta).length) {
            logMsg += `\n${JSON.stringify(meta, null, 2)}`;
        }
        return logMsg;
    })
);

const transports = [
    new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" })
];

const logger = winston.createLogger({
    level: nodeEnv === "development" ? "debug" : "warn",
    format: logFormat,
    transports,
});

export default logger;