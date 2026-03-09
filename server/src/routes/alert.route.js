import { Router } from "express";
import upload from "../middlewares/multer.js";
import { notifyUnknownFace } from "../controllers/alert.controller.js";

const router = Router();

router.post("/unknown", upload.single("file"), notifyUnknownFace);

export default router;
