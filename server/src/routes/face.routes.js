import { Router } from "express";
import upload from "../middlewares/multer.js";
import { detectFace, registerFace, getTelemetry, identifyFaceByEmbedding } from "../controllers/face.controller.js";

const router = Router();

router.post("/detect", upload.single("file"), detectFace);
router.post("/register", upload.single("file"), registerFace);
router.post("/identify", identifyFaceByEmbedding);
router.get("/telemetry", getTelemetry);

export default router;
