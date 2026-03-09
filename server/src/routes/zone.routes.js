import { Router } from "express";
import { getZonesByCamera, createZone, deleteZone } from "../controllers/zone.controller.js";

const router = Router();

router.get("/camera/:cameraId", getZonesByCamera);
router.post("/", createZone);
router.delete("/:id", deleteZone);

export default router;
