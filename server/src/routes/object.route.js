import { Router } from "express";
import upload from "../middlewares/multer.js";
import { identifyObjectHandler, registerObjectHandler, getAllObjectsHandler, deleteObjectHandler, registerObjectFromImageHandler } from "../controllers/object.controller.js";

const router = Router();

router.post("/identify", identifyObjectHandler);
router.post("/register", registerObjectHandler);
router.post("/register-image", upload.single("file"), registerObjectFromImageHandler);
router.get("/", getAllObjectsHandler);
router.delete("/:id", deleteObjectHandler);

export default router;
