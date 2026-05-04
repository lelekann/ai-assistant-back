import PDFDocument from "pdfkit";
import { ShipmentInput, GeneratedDocument } from "../../types/types";
import { getCMRData } from "./templates/cmr";
import { getInvoiceData } from "./templates/invoice";
import { getPackingListData } from "./templates/packingList";

const generatePDFBuffer = (
  renderFn: (doc: PDFKit.PDFDocument) => void
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    renderFn(doc);
    doc.end();
  });
};

// --- Рендерери ---

const renderCMR = (doc: PDFKit.PDFDocument, input: ShipmentInput, hsCode: string) => {
  const data = getCMRData(input, hsCode);

  doc.fontSize(16).font("Helvetica-Bold").text(data.title, { align: "center" });
  doc.moveDown();
  doc.fontSize(9).font("Helvetica")
    .text("International Consignment Note (Convention on the Contract for the International Carriage of Goods by Road)");
  doc.moveDown();

  data.fields.forEach(({ label, value }) => {
    doc.fontSize(9).font("Helvetica-Bold").text(`${label}:`, { continued: true });
    doc.font("Helvetica").text(` ${value}`);
    doc.moveDown(0.3);
  });

  doc.moveDown();
  doc.fontSize(8).font("Helvetica").fillColor("gray")
    .text("This CMR is generated for compliance purposes. Verify all data before use.");
};

const renderInvoice = (doc: PDFKit.PDFDocument, input: ShipmentInput, hsCode: string) => {
  const data = getInvoiceData(input, hsCode);

  doc.fontSize(16).font("Helvetica-Bold").text(data.title, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica").text(`Invoice No: ${data.invoiceNumber}`);
  doc.text(`Date: ${data.date}`);
  doc.moveDown();

  data.fields.forEach(({ label, value }) => {
    doc.fontSize(10).font("Helvetica-Bold").text(`${label}:`, { continued: true });
    doc.font("Helvetica").text(` ${value}`);
    doc.moveDown(0.3);
  });

  doc.moveDown();
  doc.fontSize(10).font("Helvetica-Bold").text("Line Items:");
  doc.moveDown(0.3);

  // Таблиця товарів
  const tableTop = doc.y;
  const colWidths = [180, 70, 50, 50, 80, 80];
  const headers = ["Description", "HS Code", "Qty", "Unit", "Unit Price", "Total"];

  headers.forEach((h, i) => {
    const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
    doc.fontSize(9).font("Helvetica-Bold").text(h, x, tableTop, { width: colWidths[i] });
  });

  doc.moveDown(0.5);

  data.lineItems.forEach((item) => {
    const rowY = doc.y;
    const values = [
      item.description,
      item.hsCode,
      String(item.quantity),
      item.unit,
      `€${item.unitPrice}`,
      `€${item.total}`,
    ];
    values.forEach((v, i) => {
      const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.fontSize(9).font("Helvetica").text(v, x, rowY, { width: colWidths[i] });
    });
    doc.moveDown();
  });

  doc.moveDown();
  doc.fontSize(11).font("Helvetica-Bold")
    .text(`Total: €${data.totalValue} ${data.currency}`, { align: "right" });
};

const renderPackingList = (doc: PDFKit.PDFDocument, input: ShipmentInput) => {
  const data = getPackingListData(input);

  doc.fontSize(16).font("Helvetica-Bold").text(data.title, { align: "center" });
  doc.moveDown(0.5);
  doc.text(`Date: ${data.date}`);
  doc.moveDown();

  data.fields.forEach(({ label, value }) => {
    doc.fontSize(10).font("Helvetica-Bold").text(`${label}:`, { continued: true });
    doc.font("Helvetica").text(` ${value}`);
    doc.moveDown(0.3);
  });

  doc.moveDown();
  doc.fontSize(10).font("Helvetica-Bold").text("Packages:");
  doc.moveDown(0.3);

  data.packages.forEach((pkg) => {
    doc.fontSize(10).font("Helvetica")
      .text(`Package #${pkg.number}: ${pkg.description}`)
      .text(`  Gross weight: ${pkg.grossWeight} kg`)
      .text(`  Net weight: ${pkg.netWeight} kg`)
      .text(`  Dimensions: ${pkg.dimensions}`);
    doc.moveDown(0.5);
  });

  doc.moveDown();
  doc.fontSize(10).font("Helvetica-Bold")
    .text(`Total gross weight: ${data.totalGrossWeight} kg`)
    .text(`Total net weight: ${data.totalNetWeight} kg`);
};

export const generateShipmentDocuments = async (
  input: ShipmentInput,
  hsCode: string
): Promise<GeneratedDocument[]> => {
  const [cmrBuffer, invoiceBuffer, packingBuffer] = await Promise.all([
    generatePDFBuffer((doc) => renderCMR(doc, input, hsCode)),
    generatePDFBuffer((doc) => renderInvoice(doc, input, hsCode)),
    generatePDFBuffer((doc) => renderPackingList(doc, input)),
  ]);

  return [
    {
      id: "doc-cmr",
      name: "CMR Consignment Note",
      status: "generated",
      base64: cmrBuffer.toString("base64"),
      filename: "cmr.pdf",
    },
    {
      id: "doc-invoice",
      name: "Commercial Invoice",
      status: "generated",
      base64: invoiceBuffer.toString("base64"),
      filename: "invoice.pdf",
    },
    {
      id: "doc-packing",
      name: "Packing List",
      status: "generated",
      base64: packingBuffer.toString("base64"),
      filename: "packing-list.pdf",
    },
  ];
};