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
  const pageWidth = 595 - 100; // A4 minus margins
  const col1 = 50;
  const col2 = 50 + pageWidth / 2;
  const cellHeight = 45;
  const smallCell = 32;

  const drawCell = (
    x: number, y: number, w: number, h: number,
    label: string, value: string, labelSize = 7, valueSize = 9
  ) => {
    doc.rect(x, y, w, h).stroke();
    doc.fontSize(labelSize).font("Helvetica").fillColor("#666666")
      .text(label, x + 3, y + 3, { width: w - 6 });
    doc.fontSize(valueSize).font("Helvetica-Bold").fillColor("#000000")
      .text(value, x + 3, y + 14, { width: w - 6, height: h - 18, ellipsis: true });
  };

  // ── HEADER ──
  doc.rect(col1, 50, pageWidth, 28).fillAndStroke("#1a1a2e", "#1a1a2e");
  doc.fontSize(13).font("Helvetica-Bold").fillColor("#ffffff")
    .text("CMR — INTERNATIONAL CONSIGNMENT NOTE", col1, 58, { width: pageWidth, align: "center" });
  doc.fontSize(7).font("Helvetica").fillColor("#aaaaaa")
    .text("Convention on the Contract for the International Carriage of Goods by Road", col1, 72, { width: pageWidth, align: "center" });

  // ── ROW 1: Sender | Consignee ──
  let y = 85;
  drawCell(col1, y, pageWidth / 2, cellHeight,
    "1. Sender (name, address, country)",
    `${input.origin ?? "N/A"} — Exporter Company`);
  drawCell(col2, y, pageWidth / 2, cellHeight,
    "2. Consignee (name, address, country)",
    `${input.destination ?? "N/A"} — Importer Company`);

  // ── ROW 2: Delivery | Carrier ──
  y += cellHeight;
  drawCell(col1, y, pageWidth / 2, smallCell,
    "3. Place of delivery of the goods",
    input.destination ?? "N/A");
  drawCell(col2, y, pageWidth / 2, smallCell,
    "4. Place and date of taking over goods",
    `${input.origin ?? "N/A"}, ${input.shipDate?.split("T")[0] ?? new Date().toISOString().split("T")[0]}`);

  // ── ROW 3: Carrier | Documents attached ──
  y += smallCell;
  drawCell(col1, y, pageWidth / 2, smallCell,
    "6. Carrier (name, address, country)",
    "TBD — To be determined");
  drawCell(col2, y, pageWidth / 2, smallCell,
    "5. Documents attached",
    "Commercial Invoice, Packing List");

  // ── ROW 4: Successive carriers ──
  y += smallCell;
  drawCell(col1, y, pageWidth, smallCell,
    "7. Successive carriers (name, address, country)",
    "N/A");

  // ── ROW 5: Sender instructions ──
  y += smallCell;
  drawCell(col1, y, pageWidth, smallCell,
    "13. Sender's instructions (customs and other formalities)",
    `HS Code: ${hsCode} | Country of origin: ${input.origin ?? "N/A"}`);

  // ── GOODS TABLE HEADER ──
  y += smallCell;
  const colWidths = [30, 80, 60, 55, 55, 55, 60];
  const colLabels = ["Marks", "Description of goods", "HS Code", "Packages", "Gross wt (kg)", "Volume (m³)", "Value"];
  const colX = [col1];
  colWidths.forEach((w, i) => { if (i > 0) colX.push(colX[i - 1] + colWidths[i - 1]); });

  // Header row
  doc.rect(col1, y, pageWidth, 16).fillAndStroke("#f0f0f0", "#000000");
  colLabels.forEach((label, i) => {
    doc.rect(colX[i], y, colWidths[i], 16).stroke();
    doc.fontSize(6.5).font("Helvetica-Bold").fillColor("#000000")
      .text(label, colX[i] + 2, y + 5, { width: colWidths[i] - 4 });
  });

  // Data row
  y += 16;
  const rowData = [
    "1",
    input.description ?? "N/A",
    hsCode,
    "1 PLT",
    String(input.weight ?? "N/A"),
    "N/A",
    input.value ? `EUR ${input.value}` : "N/A",
  ];
  doc.rect(col1, y, pageWidth, 22).stroke();
  rowData.forEach((val, i) => {
    doc.rect(colX[i], y, colWidths[i], 22).stroke();
    doc.fontSize(8).font("Helvetica").fillColor("#000000")
      .text(val, colX[i] + 2, y + 7, { width: colWidths[i] - 4, ellipsis: true });
  });

  // ── TOTALS ROW ──
  y += 22;
  drawCell(col1, y, pageWidth / 3, smallCell, "Total gross weight (kg)", String(input.weight ?? "N/A"));
  drawCell(col1 + pageWidth / 3, y, pageWidth / 3, smallCell, "Total packages", "1");
  drawCell(col1 + (pageWidth / 3) * 2, y, pageWidth / 3, smallCell, "Total declared value", input.value ? `EUR ${input.value}` : "N/A");

  // ── SPECIAL AGREEMENTS ──
  y += smallCell;
  drawCell(col1, y, pageWidth, smallCell,
    "21. Special agreements",
    "Carriage subject to CMR Convention notwithstanding any clause to the contrary");

  // ── SIGNATURES SECTION ──
  y += smallCell;
  const sigWidth = pageWidth / 3;

  doc.rect(col1, y, sigWidth, 55).stroke();
  doc.fontSize(7).font("Helvetica").fillColor("#666666")
    .text("22. Established in (place)", col1 + 3, y + 3);
  doc.fontSize(8).font("Helvetica-Bold").fillColor("#000000")
    .text(input.origin ?? "N/A", col1 + 3, y + 14);
  doc.fontSize(7).font("Helvetica").fillColor("#666666")
    .text("on (date)", col1 + 3, y + 26);
  doc.fontSize(8).font("Helvetica-Bold").fillColor("#000000")
    .text(input.shipDate?.split("T")[0] ?? new Date().toISOString().split("T")[0], col1 + 3, y + 37);

  doc.rect(col1 + sigWidth, y, sigWidth, 55).stroke();
  doc.fontSize(7).font("Helvetica").fillColor("#666666")
    .text("23. Signature and stamp of the sender", col1 + sigWidth + 3, y + 3);
  doc.fontSize(7).font("Helvetica").fillColor("#bbbbbb")
    .text("_______________________", col1 + sigWidth + 3, y + 35);

  doc.rect(col1 + sigWidth * 2, y, sigWidth, 55).stroke();
  doc.fontSize(7).font("Helvetica").fillColor("#666666")
    .text("24. Signature and stamp of the carrier", col1 + sigWidth * 2 + 3, y + 3);
  doc.fontSize(7).font("Helvetica").fillColor("#bbbbbb")
    .text("_______________________", col1 + sigWidth * 2 + 3, y + 35);

  // ── FOOTER ──
  y += 55;
  doc.rect(col1, y, pageWidth, 16).fillAndStroke("#f8f8f8", "#cccccc");
  doc.fontSize(6.5).font("Helvetica").fillColor("#999999")
    .text(
      "This CMR consignment note is generated for compliance purposes only. Verify all data before use. " +
      "Original CMR must be signed by sender, carrier and consignee.",
      col1 + 4, y + 5, { width: pageWidth - 8 }
    );
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