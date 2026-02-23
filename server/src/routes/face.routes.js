import { Router } from "express";
import upload from "../middlewares/multer.js";
import { detectFace, registerFace } from "../controllers/face.controller.js";

const router = Router();

router.post("/detect", upload.single("file"), detectFace);
router.post("/register", upload.single("file"), registerFace);

export default router;
