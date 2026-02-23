import { Router } from "express";
import { getHistory, getQuickStats, forensicSearch, getReport } from "../controllers/analytics.controller.js";
import { exportCSV, exportPDF } from "../controllers/report.controller.js";
import upload from "../middlewares/multer.js";

const router = Router();

router.route("/history").get(getHistory);
router.route("/stats").get(getQuickStats);
router.route("/forensic-search").post(upload.single("file"), forensicSearch);
router.route("/report").get(getReport);
router.route("/export/csv").get(exportCSV);
router.route("/export/pdf").get(exportPDF);

export default router;
