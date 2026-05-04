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
  const cur = data.currency;

  const PAGE_W = 595;
  const MARGIN = 50;
  const CW = PAGE_W - MARGIN * 2; // 495

  // ── Палітра ────────────────────────────────────────────────────────────────
  const DARK_BLUE   = "#0D2B55";
  const MID_BLUE    = "#1A508B";
  const ACCENT      = "#2E86C1";
  const LIGHT_BLUE  = "#EAF2FB";
  const BORDER_GREY = "#C8D6E5";
  const TEXT_DARK   = "#1C2833";
  const TEXT_GREY   = "#5D6D7E";
  const ROW_ALT     = "#F5F8FA";
  const WHITE       = "#FFFFFF";

  const fmt = (n: number) =>
    `${cur} ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  // ── Хелпери ────────────────────────────────────────────────────────────────
  const fillRect = (x: number, y: number, w: number, h: number, color: string) => {
    doc.save().rect(x, y, w, h).fill(color).restore();
  };

  const strokeRect = (x: number, y: number, w: number, h: number, color = BORDER_GREY, lw = 0.5) => {
    doc.save().rect(x, y, w, h).lineWidth(lw).stroke(color).restore();
  };

  const hline = (x: number, y: number, w: number, color = BORDER_GREY, lw = 0.5) => {
    doc.save().moveTo(x, y).lineTo(x + w, y).lineWidth(lw).stroke(color).restore();
  };

  const vline = (x: number, y: number, h: number, color = BORDER_GREY, lw = 0.4) => {
    doc.save().moveTo(x, y).lineTo(x, y + h).lineWidth(lw).stroke(color).restore();
  };

  // ── HEADER ─────────────────────────────────────────────────────────────────
  fillRect(0, 0, PAGE_W, 58, DARK_BLUE);
  fillRect(0, 58, PAGE_W, 4, ACCENT);

  doc.save()
    .fillColor(WHITE).font("Helvetica-Bold").fontSize(17)
    .text("COMMERCIAL INVOICE", MARGIN, 18, { width: CW / 2 });

  doc.fillColor("#A9CCE3").font("Helvetica").fontSize(9)
    .text(data.invoiceNumber, MARGIN + CW / 2, 16, { width: CW / 2, align: "right" })
    .text(`Date: ${data.date}`, MARGIN + CW / 2, 32, { width: CW / 2, align: "right" });
  doc.restore();

  let y = 74; // нижче header + stripe

  // ── Секційна плашка ─────────────────────────────────────────────────────────
  const sectionHeading = (text: string) => {
    fillRect(MARGIN, y, CW, 22, MID_BLUE);
    doc.save()
      .fillColor(WHITE).font("Helvetica-Bold").fontSize(8.5)
      .text(text.toUpperCase(), MARGIN + 10, y + 7, { width: CW - 20 })
      .restore();
    y += 22;
  };

  // ── Картка поля ─────────────────────────────────────────────────────────────
  const infoCard = (
    label: string, value: string,
    x: number, cardY: number, w: number, bg: string
  ) => {
    const H = 44;
    fillRect(x, cardY, w, H, bg);
    strokeRect(x, cardY, w, H);
    doc.save()
      .fillColor(TEXT_GREY).font("Helvetica-Bold").fontSize(8)
      .text(label, x + 10, cardY + 8, { width: w - 20 });
    doc.fillColor(TEXT_DARK).font("Helvetica").fontSize(9)
      .text(value, x + 10, cardY + 22, { width: w - 20, ellipsis: true });
    doc.restore();
    return H;
  };

  // ── PARTIES ─────────────────────────────────────────────────────────────────
  sectionHeading("Parties");
  y += 6;
  const halfW = (CW - 6) / 2;
  infoCard(data.fields[0].label, data.fields[0].value, MARGIN, y, halfW, LIGHT_BLUE);
  infoCard(data.fields[1].label, data.fields[1].value, MARGIN + halfW + 6, y, halfW, ROW_ALT);
  y += 44 + 10;

  // ── SHIPMENT DETAILS ────────────────────────────────────────────────────────
  sectionHeading("Shipment Details");
  y += 6;
  const detFields = data.fields.slice(2);
  const detW = CW / detFields.length;
  const detBgs = [LIGHT_BLUE, ROW_ALT, LIGHT_BLUE];
  detFields.forEach((f, i) => {
    infoCard(f.label, f.value, MARGIN + i * detW, y, detW, detBgs[i]);
  });
  y += 44 + 10;

  // ── GOODS TABLE ─────────────────────────────────────────────────────────────
  sectionHeading("Goods Description");
  y += 6;

  const colRatios = [0.37, 0.13, 0.07, 0.10, 0.165, 0.165];
  const cws = colRatios.map(r => CW * r);
  const HEADER_H = 26;
  const ROW_H    = 30;

  const colHeaders = [
    { text: "Description",  align: "left"  },
    { text: "HS Code",      align: "left"  },
    { text: "Qty",          align: "right" },
    { text: "Unit",         align: "left"  },
    { text: "Unit Price",   align: "right" },
    { text: "Total",        align: "right" },
  ] as const;

  // Заголовок таблиці
  fillRect(MARGIN, y, CW, HEADER_H, DARK_BLUE);
  let cx = MARGIN;
  colHeaders.forEach(({ text, align }, i) => {
    doc.save()
      .fillColor(WHITE).font("Helvetica-Bold").fontSize(8)
      .text(text, cx + 6, y + 9, { width: cws[i] - 12, align })
      .restore();
    cx += cws[i];
  });
  y += HEADER_H;

  // Рядки товарів
  data.lineItems.forEach((item, ri) => {
    const bg = ri % 2 === 0 ? "#FAFCFE" : LIGHT_BLUE;
    fillRect(MARGIN, y, CW, ROW_H, bg);
    hline(MARGIN, y, CW, BORDER_GREY, 0.4);

    const rowValues = [
      { text: item.description, align: "left"  as const },
      { text: item.hsCode,      align: "left"  as const },
      { text: String(item.quantity), align: "right" as const },
      { text: item.unit,        align: "left"  as const },
      { text: fmt(item.unitPrice),   align: "right" as const },
      { text: fmt(item.total),       align: "right" as const },
    ];

    cx = MARGIN;
    rowValues.forEach(({ text, align }, ci) => {
      doc.save()
        .fillColor(TEXT_DARK).font("Helvetica").fontSize(9)
        .text(text, cx + 6, y + 10, { width: cws[ci] - 12, align, ellipsis: true })
        .restore();
      cx += cws[ci];
    });
    y += ROW_H;
  });

  // Зовнішня рамка + вертикальні лінії
  strokeRect(MARGIN, y - HEADER_H - ROW_H * data.lineItems.length, CW,
             HEADER_H + ROW_H * data.lineItems.length, BORDER_GREY, 0.6);
  cx = MARGIN;
  cws.slice(0, -1).forEach(w => {
    cx += w;
    vline(cx, y - HEADER_H - ROW_H * data.lineItems.length,
          HEADER_H + ROW_H * data.lineItems.length);
  });

  y += 8;

  // ── TOTAL BAR ───────────────────────────────────────────────────────────────
  const TOTAL_H = 36;
  fillRect(MARGIN, y, CW, TOTAL_H, DARK_BLUE);
  doc.save()
    .fillColor(WHITE).font("Helvetica-Bold").fontSize(10)
    .text("TOTAL AMOUNT DUE", MARGIN + 14, y + 12, { width: CW * 0.55 });
  doc.font("Helvetica-Bold").fontSize(14)
    .text(fmt(data.totalValue), MARGIN, y + 10, { width: CW - 14, align: "right" });
  doc.restore();
  y += TOTAL_H + 12;

  // ── PAYMENT INSTRUCTIONS ────────────────────────────────────────────────────
  sectionHeading("Payment Instructions");
  y += 6;

  const bankRows = [
    ["Bank Name",     "Deutsche Handelsbank AG"],
    ["IBAN",          "DE89 3704 0044 0532 0130 00"],
    ["BIC / SWIFT",   "DHABDEHHXXX"],
    ["Reference",     data.invoiceNumber],
    ["Payment Terms", "Net 30 days from invoice date"],
  ];
  const BANK_H   = 22;
  const labelCW  = CW * 0.28;
  const valueCW  = CW * 0.72;
  const bankTop  = y;

  bankRows.forEach(([label, value], ri) => {
    fillRect(MARGIN, y, CW, BANK_H, ri % 2 === 0 ? LIGHT_BLUE : WHITE);
    hline(MARGIN, y, CW, BORDER_GREY, 0.3);
    doc.save()
      .fillColor(TEXT_GREY).font("Helvetica-Bold").fontSize(8)
      .text(label, MARGIN + 10, y + 6, { width: labelCW - 14 });
    doc.fillColor(TEXT_DARK).font("Helvetica").fontSize(9)
      .text(value, MARGIN + labelCW + 6, y + 6, { width: valueCW - 14 });
    doc.restore();
    y += BANK_H;
  });
  strokeRect(MARGIN, bankTop, CW, BANK_H * bankRows.length);
  vline(MARGIN + labelCW, bankTop, BANK_H * bankRows.length);
  y += 12;

  // ── DECLARATIONS ────────────────────────────────────────────────────────────
  sectionHeading("Declarations & Certifications");
  y += 8;

  doc.save()
    .fillColor(TEXT_GREY).font("Helvetica-Oblique").fontSize(8)
    .text(
      "I, the undersigned, hereby declare that the information on this invoice is true and " +
      "correct, and that the contents of this consignment are as stated above. " +
      `The goods are of ${data.fields[2].value} origin and comply with all applicable export regulations.`,
      MARGIN, y, { width: CW }
    )
    .restore();
  y += 36;

  // Підписи
  [[MARGIN, "Authorised Signature"], [MARGIN + CW * 0.55, "Date"]] .forEach(([sx, label]) => {
    hline(sx as number, y + 20, 130, BORDER_GREY, 0.8);
    doc.save()
      .fillColor(TEXT_GREY).font("Helvetica").fontSize(8)
      .text(label as string, sx as number, y + 24)
      .restore();
  });

  // ── FOOTER ─────────────────────────────────────────────────────────────────
  const footerY = 815;
  fillRect(0, footerY, PAGE_W, 27, LIGHT_BLUE);
  hline(0, footerY, PAGE_W, BORDER_GREY, 0.5);
  doc.save()
    .fillColor(TEXT_GREY).font("Helvetica").fontSize(8)
    .text("This document is computer-generated and valid without signature.",
          MARGIN, footerY + 9, { width: CW })
    .restore();
};

const renderPackingList = (doc: PDFKit.PDFDocument, input: ShipmentInput) => {
  const data = getPackingListData(input);

  const PAGE_W = 595;
  const MARGIN = 50;
  const CW = PAGE_W - MARGIN * 2;

  // ── Палітра ─────────────────────────────────────────────────────────────────
  const DARK_BLUE   = "#0D2B55";
  const MID_BLUE    = "#1A508B";
  const ACCENT      = "#2E86C1";
  const LIGHT_BLUE  = "#EAF2FB";
  const BORDER_GREY = "#C8D6E5";
  const TEXT_DARK   = "#1C2833";
  const TEXT_GREY   = "#5D6D7E";
  const ROW_ALT     = "#F5F8FA";
  const WHITE       = "#FFFFFF";

  // ── Хелпери ─────────────────────────────────────────────────────────────────
  const fillRect = (x: number, y: number, w: number, h: number, color: string) => {
    doc.save().rect(x, y, w, h).fill(color).restore();
  };

  const strokeRect = (x: number, y: number, w: number, h: number, color = BORDER_GREY, lw = 0.5) => {
    doc.save().rect(x, y, w, h).lineWidth(lw).stroke(color).restore();
  };

  const hline = (x: number, y: number, w: number, color = BORDER_GREY, lw = 0.5) => {
    doc.save().moveTo(x, y).lineTo(x + w, y).lineWidth(lw).stroke(color).restore();
  };

  const vline = (x: number, y: number, h: number, color = BORDER_GREY, lw = 0.4) => {
    doc.save().moveTo(x, y).lineTo(x, y + h).lineWidth(lw).stroke(color).restore();
  };

  // ── HEADER ──────────────────────────────────────────────────────────────────
  fillRect(0, 0, PAGE_W, 58, DARK_BLUE);
  fillRect(0, 58, PAGE_W, 4, ACCENT);

  doc.save()
    .fillColor(WHITE).font("Helvetica-Bold").fontSize(17)
    .text("PACKING LIST", MARGIN, 18, { width: CW / 2 });

  doc.fillColor("#A9CCE3").font("Helvetica").fontSize(9)
    .text(`Ref: PL-${Date.now()}`, MARGIN + CW / 2, 16, { width: CW / 2, align: "right" })
    .text(`Date: ${data.date}`, MARGIN + CW / 2, 32, { width: CW / 2, align: "right" });
  doc.restore();

  let y = 74;

  // ── Секційна плашка ─────────────────────────────────────────────────────────
  const sectionHeading = (text: string) => {
    fillRect(MARGIN, y, CW, 22, MID_BLUE);
    doc.save()
      .fillColor(WHITE).font("Helvetica-Bold").fontSize(8.5)
      .text(text.toUpperCase(), MARGIN + 10, y + 7, { width: CW - 20 })
      .restore();
    y += 22;
  };

  // ── Картка поля ─────────────────────────────────────────────────────────────
  const infoCard = (
    label: string, value: string,
    x: number, cardY: number, w: number, bg: string
  ) => {
    const H = 40;
    fillRect(x, cardY, w, H, bg);
    strokeRect(x, cardY, w, H);
    doc.save()
      .fillColor(TEXT_GREY).font("Helvetica-Bold").fontSize(8)
      .text(label, x + 10, cardY + 7, { width: w - 20 });
    doc.fillColor(TEXT_DARK).font("Helvetica").fontSize(9)
      .text(value, x + 10, cardY + 20, { width: w - 20, ellipsis: true });
    doc.restore();
    return H;
  };

  // ── SHIPMENT INFO ───────────────────────────────────────────────────────────
  sectionHeading("Shipment Information");
  y += 6;

  const halfW = (CW - 6) / 2;
  // перші два поля поруч
  if (data.fields.length >= 2) {
    infoCard(data.fields[0].label, data.fields[0].value, MARGIN, y, halfW, LIGHT_BLUE);
    infoCard(data.fields[1].label, data.fields[1].value, MARGIN + halfW + 6, y, halfW, ROW_ALT);
    y += 40 + 6;
  }
  // решта полів — по три в ряд
  const remaining = data.fields.slice(2);
  for (let i = 0; i < remaining.length; i += 3) {
    const chunk = remaining.slice(i, i + 3);
    const cardW = CW / chunk.length;
    const bgs   = [LIGHT_BLUE, ROW_ALT, LIGHT_BLUE];
    chunk.forEach((f, ci) => {
      infoCard(f.label, f.value, MARGIN + ci * cardW, y, cardW, bgs[ci]);
    });
    y += 40 + 6;
  }
  y += 4;

  // ── PACKAGES TABLE ──────────────────────────────────────────────────────────
  sectionHeading("Package Details");
  y += 6;

  const colDefs = [
    { header: "#",           ratio: 0.06,  align: "center" as const },
    { header: "Description", ratio: 0.34,  align: "left"   as const },
    { header: "Gross Wt (kg)",ratio: 0.15, align: "right"  as const },
    { header: "Net Wt (kg)", ratio: 0.15,  align: "right"  as const },
    { header: "Dimensions",  ratio: 0.18,  align: "left"   as const },
    { header: "Qty",         ratio: 0.12,  align: "right"  as const },
  ];
  const cws     = colDefs.map(c => CW * c.ratio);
  const HEADER_H = 26;
  const ROW_H    = 28;

  // Заголовок таблиці
  fillRect(MARGIN, y, CW, HEADER_H, DARK_BLUE);
  let cx = MARGIN;
  colDefs.forEach(({ header, align }, i) => {
    doc.save()
      .fillColor(WHITE).font("Helvetica-Bold").fontSize(8)
      .text(header, cx + 5, y + 9, { width: cws[i] - 10, align })
      .restore();
    cx += cws[i];
  });
  y += HEADER_H;

  // Рядки пакетів
  const tableTop = y;
  data.packages.forEach((pkg, ri) => {
    fillRect(MARGIN, y, CW, ROW_H, ri % 2 === 0 ? "#FAFCFE" : LIGHT_BLUE);
    hline(MARGIN, y, CW, BORDER_GREY, 0.4);

    const cells = [
      { text: String(pkg.number),      align: "center" as const },
      { text: pkg.description,         align: "left"   as const },
      { text: String(pkg.grossWeight), align: "right"  as const },
      { text: String(pkg.netWeight),   align: "right"  as const },
      { text: pkg.dimensions,          align: "left"   as const },
      { text: "1",                     align: "right"  as const },
    ];

    cx = MARGIN;
    cells.forEach(({ text, align }, ci) => {
      doc.save()
        .fillColor(TEXT_DARK).font("Helvetica").fontSize(9)
        .text(text, cx + 5, y + 9, { width: cws[ci] - 10, align, ellipsis: true })
        .restore();
      cx += cws[ci];
    });
    y += ROW_H;
  });

  // Рамка + вертикальні лінії
  strokeRect(MARGIN, tableTop - HEADER_H, CW, HEADER_H + ROW_H * data.packages.length, BORDER_GREY, 0.6);
  cx = MARGIN;
  cws.slice(0, -1).forEach(w => {
    cx += w;
    vline(cx, tableTop - HEADER_H, HEADER_H + ROW_H * data.packages.length);
  });

  y += 8;

  // ── TOTALS BAR ──────────────────────────────────────────────────────────────
  const totals = [
    { label: "Total Packages", value: String(data.packages.length) },
    { label: "Total Gross Weight", value: `${data.totalGrossWeight} kg` },
    { label: "Total Net Weight",  value: `${data.totalNetWeight} kg` },
  ];
  const totalColW = CW / totals.length;

  fillRect(MARGIN, y, CW, 40, DARK_BLUE);
  totals.forEach(({ label, value }, i) => {
    const tx = MARGIN + i * totalColW;
    doc.save()
      .fillColor("#A9CCE3").font("Helvetica").fontSize(8)
      .text(label.toUpperCase(), tx + 10, y + 7, { width: totalColW - 20 });
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(13)
      .text(value, tx + 10, y + 19, { width: totalColW - 20 });
    doc.restore();
    if (i > 0) vline(tx, y, 40, "#1A508B", 1);
  });
  y += 40 + 12;

  // ── DECLARATIONS ────────────────────────────────────────────────────────────
  sectionHeading("Declarations & Certifications");
  y += 8;

  doc.save()
    .fillColor(TEXT_GREY).font("Helvetica-Oblique").fontSize(8)
    .text(
      "I, the undersigned, hereby certify that the contents of this packing list " +
      "are true and accurate. All packages have been packed and verified in accordance " +
      "with applicable international trade regulations.",
      MARGIN, y, { width: CW }
    )
    .restore();
  y += 34;

  // Підписи
  const sigPairs: [number, string][] = [
    [MARGIN, "Authorised Signature"],
    [MARGIN + CW * 0.55, "Date"],
  ];
  sigPairs.forEach(([sx, label]) => {
    doc.save().moveTo(sx, y + 20).lineTo(sx + 130, y + 20)
      .lineWidth(0.8).stroke(BORDER_GREY).restore();
    doc.save()
      .fillColor(TEXT_GREY).font("Helvetica").fontSize(8)
      .text(label, sx, y + 24)
      .restore();
  });

  // ── FOOTER ──────────────────────────────────────────────────────────────────
  fillRect(0, 815, PAGE_W, 27, LIGHT_BLUE);
  hline(0, 815, PAGE_W, BORDER_GREY, 0.5);
  doc.save()
    .fillColor(TEXT_GREY).font("Helvetica").fontSize(8)
    .text(
      "This document is computer-generated and valid without signature.",
      MARGIN, 824, { width: CW }
    )
    .restore();
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