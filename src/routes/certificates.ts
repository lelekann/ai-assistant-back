import { Router } from "express";
import { acknowledgeCertificate, getExpiringCertificates } from "../controllers/certificates";

const router = Router();

router.get("/expiring", getExpiringCertificates);
router.patch("/:id/acknowledge", acknowledgeCertificate);

export default router;
