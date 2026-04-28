import { Router } from "express";
import { processShipment } from "../controllers/process";

const router = Router();

// POST /api/shipment/process
router.post("/process", processShipment);

export default router;