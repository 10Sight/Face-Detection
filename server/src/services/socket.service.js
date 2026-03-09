import { Server } from "socket.io";
import logger from "../loggers/winston.logger.js";

class SocketService {
    constructor() {
        this.io = null;
        this.sessions = new Map(); // socket.id -> { startTime, metadata }
    }

    /**
     * Initializes Socket.io with the HTTP server.
     */
    initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.CORS_ORIGIN || "http://localhost:5173",
                methods: ["GET", "POST"],
                credentials: true
            },
            pingTimeout: 10000,
            pingInterval: 5000
        });

        this.io.on("connection", (socket) => {
            logger.info(`[Socket] Client connected: ${socket.id}`);
            this.sessions.set(socket.id, { startTime: Date.now() });

            // Allow client to join specific camera/stream rooms
            socket.on("join_stream", (streamId) => {
                socket.join(`stream_${streamId}`);
                logger.info(`[Socket] ${socket.id} joined stream_${streamId}`);
            });

            socket.on("disconnect", (reason) => {
                logger.info(`[Socket] Client disconnected: ${socket.id} (${reason})`);
                this.sessions.delete(socket.id);
            });

            socket.on("error", (err) => {
                logger.error(`[Socket] Error for ${socket.id}: ${err.message}`);
            });
        });
    }

    /**
     * Broadcasts lightweight detection results to all connected clients or a specific room.
     */
    broadcastResults(results, roomId = null) {
        if (!this.io) return;

        // Strip any sensitive fields just in case (e.g., embeddings)
        const sanitizedResults = this.sanitize(results);

        const target = roomId ? this.io.to(`stream_${roomId}`) : this.io;
        target.emit("detection_result", {
            ...sanitizedResults,
            serverTimestamp: Date.now()
        });
    }

    /**
     * Final safety check to ensure no embeddings leak through WebSockets.
     */
    sanitize(data) {
        if (typeof data !== 'object' || data === null) return data;

        const copy = JSON.parse(JSON.stringify(data)); // Deep copy to avoid mutating source

        if (copy.faces) {
            copy.faces.forEach(face => delete face.embedding);
        }
        if (copy.objects) {
            copy.objects.forEach(obj => delete obj.embedding);
        }

        return copy;
    }
}

export const socketService = new SocketService();
