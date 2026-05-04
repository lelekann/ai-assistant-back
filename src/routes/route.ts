import { Router } from "express";
import multer from "multer";
import { processShipment } from "../controllers/process";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/shipment/process
router.post(
  "/process",
  upload.array("files"),
  processShipment
);

export default router;