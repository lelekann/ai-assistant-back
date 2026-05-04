import path from "path";
import { Request, Response } from "express";
import { mockDocumentFiles, mockDocuments, mockOrders } from "../mock/orders";
import { chatWithOrderAI, ChatHistoryMessage } from "../services/ai/orderChat";
import { runAnalyzeAgent } from "../services/ai/analyze";

export const getOrderById = (req: Request, res: Response): void => {
  const id = req.params.id as string;
  const order = mockOrders.find((o) => o.id === id);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(order);
};

export const getOrderDocuments = (req: Request, res: Response): void => {
  const id = req.params.id as string;
  const order = mockOrders.find((o) => o.id === id);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(mockDocuments[id] ?? []);
};

export const getOrderDocumentContent = (req: Request, res: Response): void => {
  const id = req.params.id as string;
  const docId = req.params.docId as string;
  const docs = mockDocuments[id];

  if (!docs) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const doc = docs.find((d) => d.id === docId);
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const filePath = mockDocumentFiles[docId];
  if (!filePath) {
    res.status(404).json({ error: "No file available for this document" });
    return;
  }

  const absolutePath = path.resolve(filePath);
  res.sendFile(absolutePath);
};

export const getOrderDocumentById = (req: Request, res: Response): void => {
  const id = req.params.id as string;
  const docId = req.params.docId as string;
  const docs = mockDocuments[id];

  if (!docs) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const doc = docs.find((d) => d.id === docId);
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json(doc);
};

export const analyzeOrder = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const order = mockOrders.find((o) => o.id === id);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  try {
    const result = await runAnalyzeAgent(id);
    res.json(result);
  } catch (err) {
    console.error("analyzeOrder agent error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
};

export const fixDocument = (req: Request, res: Response): void => {
  const id = req.params.id as string;
  const docId = req.params.docId as string;
  const { field, value } = req.body as { field: string; value: string };

  if (!field || value === undefined) {
    res.status(400).json({ error: "field and value are required" });
    return;
  }

  const docs = mockDocuments[id];
  if (!docs) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const doc = docs.find((d) => d.id === docId);
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  doc.status = "verified";
  doc.generatedByAI = true;

  res.json(doc);
};

export const fixCrossCheck = (req: Request, res: Response): void => {
  const id = req.params.id as string;
  const { field } = req.body as { field: string };

  if (!field) {
    res.status(400).json({ error: "field is required" });
    return;
  }

  const docs = mockDocuments[id];
  if (!docs) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const updatedDocuments: string[] = [];

  for (const doc of docs) {
    if (doc.generatedByAI) {
      doc.status = "verified";
      updatedDocuments.push(doc.id);
    }
  }

  res.json({ success: true, updatedDocuments });
};

export const chatWithOrder = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const order = mockOrders.find((o) => o.id === id);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const { message, history } = req.body as {
    message: string;
    history?: ChatHistoryMessage[];
  };

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const content = await chatWithOrderAI(order, message, history ?? []);

  res.json({
    id: `msg-${Date.now()}`,
    role: "agent",
    content,
  });
};
