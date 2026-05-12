import path from "path";
import {Request, Response} from "express";
import {
  mockAgentOutput,
  mockDocumentFiles,
  mockDocuments,
  mockOrders,
} from "../mock/orders";
import {chatWithOrderAI, ChatHistoryMessage} from "../services/ai/orderChat";
import {runAnalyzeAgent} from "../services/ai/analyze";
import {fixDocument as fixDocumentService} from "../services/documents/fixDocument";
import {
  getCached,
  setCached,
  clearCached,
  hashDocuments,
} from "../lib/analysis-cache";

export const getOrderById = (req: Request, res: Response): void => {
  const id = req.params.id as string;
  const order = mockOrders.find((o) => o.id === id);

  if (!order) {
    res.status(404).json({error: "Order not found"});
    return;
  }

  res.json(order);
};

export const getOrderDocuments = (req: Request, res: Response): void => {
  const id = req.params.id as string;
  const order = mockOrders.find((o) => o.id === id);

  if (!order) {
    res.status(404).json({error: "Order not found"});
    return;
  }

  res.json(mockDocuments[id] ?? []);
};

export const getOrderDocumentContent = (req: Request, res: Response): void => {
  const id = req.params.id as string;
  const docId = req.params.docId as string;
  const docs = mockDocuments[id];

  if (!docs) {
    res.status(404).json({error: "Order not found"});
    return;
  }

  const doc = docs.find((d) => d.id === docId);
  if (!doc) {
    res.status(404).json({error: "Document not found"});
    return;
  }

  const filePath = mockDocumentFiles[docId];
  if (!filePath) {
    res.status(404).json({error: "No file available for this document"});
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
    res.status(404).json({error: "Order not found"});
    return;
  }

  const doc = docs.find((d) => d.id === docId);
  if (!doc) {
    res.status(404).json({error: "Document not found"});
    return;
  }

  res.json(doc);
};

export const analyzeOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = req.params.id as string;
  const force = req.query.force === "true";
  const order = mockOrders.find((o) => o.id === id);

  if (!order) {
    res.status(404).json({error: "Order not found"});
    return;
  }

  const docs = mockDocuments[id] ?? [];
  const currentHash = hashDocuments(docs);

  if (!force) {
    const cached = getCached(id);
    if (cached && cached.documentsHash === currentHash) {
      res.json({...(cached.result as object), cached: true});
      return;
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    const fallback = mockAgentOutput[id];
    if (fallback) {
      setCached(id, fallback, currentHash);
      res.json({...fallback, cached: false});
    } else {
      res
        .status(404)
        .json({error: "No mock analysis available for this order"});
    }
    return;
  }

  try {
    const result = await runAnalyzeAgent(id);

    const docs = mockDocuments[id] ?? [];
    const mockStatuses: Record<string, "verified" | "error" | "pending"> = {
      "doc-1": "pending",
      "doc-2": "pending",
      "doc-3": "pending",
    };

    for (const doc of docs) {
      if (mockStatuses[doc.id]) {
        doc.status = mockStatuses[doc.id];
      }
    }

    setCached(id, result, currentHash);
    res.json({...result, cached: false});
  } catch {
    res.status(500).json({error: "Analysis failed"});
  }
};

export const getOrderAnalysis = (req: Request, res: Response): void => {
  const id = req.params.id as string;
  const order = mockOrders.find((o) => o.id === id);

  if (!order) {
    res.status(404).json({error: "Order not found"});
    return;
  }

  const cached = getCached(id);
  if (!cached) {
    res.status(204).end();
    return;
  }

  res.json({...(cached.result as object), cached: true});
};

export const fixDocument = (req: Request, res: Response): void => {
  const id = req.params.id as string;
  const docId = req.params.docId as string;
  const {field, value} = req.body as {field: string; value: string};

  if (!field || value === undefined) {
    res.status(400).json({error: "field and value are required"});
    return;
  }

  const docs = mockDocuments[id];
  if (!docs) {
    res.status(404).json({error: "Order not found"});
    return;
  }

  const doc = docs.find((d) => d.id === docId);
  if (!doc) {
    res.status(404).json({error: "Document not found"});
    return;
  }

  doc.status = "verified";
  doc.generatedByAI = true;
  clearCached(id);

  res.json(doc);
};

export const fixDocumentHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const orderId = req.params.orderId as string;
  const docId = req.params.docId as string;

  const order = mockOrders.find((o) => o.id === orderId);
  if (!order) {
    res.status(404).json({error: "Order not found"});
    return;
  }

  const docs = mockDocuments[orderId];
  const doc = docs?.find((d) => d.id === docId);
  if (!doc) {
    res.status(404).json({error: "Document not found"});
    return;
  }

  try {
    const {filePath} = await fixDocumentService(doc, order);
    doc.status = "verified";
    doc.generatedByAI = true;
    doc.fixedAt = new Date().toISOString();
    mockDocumentFiles[docId] = filePath;
    clearCached(orderId);
    res.json(doc);
  } catch (err) {
    res
      .status(500)
      .json({error: "Failed to regenerate document", detail: String(err)});
  }
};

export const fixCrossCheck = (req: Request, res: Response): void => {
  const id = req.params.id as string;
  const {field} = req.body as {field: string};

  if (!field) {
    res.status(400).json({error: "field is required"});
    return;
  }

  const docs = mockDocuments[id];
  if (!docs) {
    res.status(404).json({error: "Order not found"});
    return;
  }

  const updatedDocuments: string[] = [];

  for (const doc of docs) {
    if (doc.generatedByAI) {
      doc.status = "verified";
      updatedDocuments.push(doc.id);
    }
  }
  clearCached(id);
  res.json({success: true, updatedDocuments});
};

export const chatWithOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = req.params.id as string;
  const order = mockOrders.find((o) => o.id === id);

  if (!order) {
    res.status(404).json({error: "Order not found"});
    return;
  }

  const {message, history} = req.body as {
    message: string;
    history?: ChatHistoryMessage[];
  };

  if (!message) {
    res.status(400).json({error: "message is required"});
    return;
  }

  const content = await chatWithOrderAI(order, message, history ?? []);

  res.json({
    id: `msg-${Date.now()}`,
    role: "agent",
    content,
  });
};
