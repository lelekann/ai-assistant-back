import { Request, Response } from "express";
import { mockCertificates } from "../mock/orders";

export const getExpiringCertificates = (_req: Request, res: Response): void => {
  res.json(mockCertificates);
};

export const acknowledgeCertificate = (req: Request, res: Response): void => {
  const id = req.params.id as string;
  const cert = mockCertificates.find((c) => c.id === id);

  if (!cert) {
    res.status(404).json({ error: "Certificate not found" });
    return;
  }

  cert.acknowledged = true;
  res.json(cert);
};
