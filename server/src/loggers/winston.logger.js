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
    winston.format.printf(({ level, message, timestamp, stack }) => {
        if (stack) {
            return `${timestamp} [${level}] ${message}\n${stack}`;
        }
        return `${timestamp} [${level}] ${message}`;
    })
);

const transports = [];

if (nodeEnv === "development") {
    transports.push(
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), logFormat),
        })
    );
} else {
    transports.push(
        new winston.transports.File({ filename: "logs/error.log", level: "error" }),
        new winston.transports.File({ filename: "logs/warn.log", level: "warn" }),
        new winston.transports.File({ filename: "logs/info.log", level: "info" }),
        new winston.transports.File({ filename: "logs/http.log", level: "http" }),
        new winston.transports.File({ filename: "logs/verbose.log", level: "verbose" }),
        new winston.transports.File({ filename: "logs/debug.log", level: "debug" }),
        new winston.transports.File({ filename: "logs/silly.log", level: "silly" }),
        new winston.transports.File({ filename: "logs/combined.log" })
    );
}

const logger = winston.createLogger({
    level: nodeEnv === "development" ? "debug" : "warn",
    format: logFormat,
    transports,
});

export default logger;