import { Router } from "express";
import {
  analyzeOrder,
  chatWithOrder,
  fixCrossCheck,
  fixDocument,
  getOrderById,
  getOrderDocumentById,
  getOrderDocumentContent,
  getOrderDocuments,
} from "../controllers/orders";

const router = Router();

router.get("/:id", getOrderById);
router.get("/:id/documents", getOrderDocuments);
router.get("/:id/documents/:docId", getOrderDocumentById);
router.get("/:id/documents/:docId/content", getOrderDocumentContent);
router.post("/:id/analyze", analyzeOrder);
router.patch("/:id/documents/:docId/fix", fixDocument);
router.post("/:id/cross-check/fix", fixCrossCheck);
router.post("/:id/chat", chatWithOrder);

export default router;
