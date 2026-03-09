import http from "http";
import app from "./app.js";
import connectDB from "./db/connectDB.js";
import env from "./configs/env.config.js";
import morganConfig from "./loggers/morgan.logger.js";
import logger from "./loggers/winston.logger.js";
import { socketService } from "./services/socket.service.js";
import { zoneService } from "./services/zone.service.js";

const { port, serverUrl, nodeEnv } = env;

// Create HTTP Server for Socket.io integration
const server = http.createServer(app);

// Initialize WebSocket Service
socketService.initialize(server);

connectDB().then(() => {
    // Initialize Zone Intelligence Cache
    zoneService.initializeCache();
});

app.use(morganConfig());

server.listen(port, () => {
    logger.info(`[Server] ${serverUrl}:${port} -- ${nodeEnv}`);
});