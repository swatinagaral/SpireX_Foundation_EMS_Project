// Turns [{col: value}] rows into CSV / XLSX / PDF buffers.
// columns = [{ key: "email", label: "Email" }, ...]  (key can be a dotted path like "to.email")

const getVal = (row, key) =>
  key.split(".").reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), row);

const fmtCell = (v) => {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

// ---------- CSV (no dependency needed) ----------
const toCSV = (rows, columns) => {
  const escape = (s) => {
    const str = fmtCell(s);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const header = columns.map((c) => escape(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escape(getVal(row, c.key))).join(","));
  return "\uFEFF" + [header, ...lines].join("\r\n"); // BOM so Excel opens UTF-8 correctly
};

// ---------- XLSX (needs the "xlsx" package) ----------
const toXLSX = (rows, columns, sheetName = "Report") => {
  const XLSX = require("xlsx");
  const data = rows.map((row) => {
    const obj = {};
    columns.forEach((c) => { obj[c.label] = fmtCell(getVal(row, c.key)); });
    return obj;
  });
  const sheet = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.label) });
  sheet["!cols"] = columns.map((c) => ({ wch: Math.max(12, c.label.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
};

// ---------- PDF (needs the "pdfkit" package) ----------
const toPDF = (rows, columns, title = "Report") =>
  new Promise((resolve, reject) => {
    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ margin: 30, size: "A4", layout: rows.length && columns.length > 5 ? "landscape" : "portrait" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(title, { align: "left" });
    doc.fontSize(9).fillColor("#666").text(`Generated: ${new Date().toLocaleString()}  •  ${rows.length} record(s)`);
    doc.moveDown(0.8);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = pageWidth / columns.length;
    const rowHeight = 18;

    const drawHeader = () => {
      doc.fontSize(8).fillColor("#fff");
      const y = doc.y;
      doc.rect(doc.page.margins.left, y, pageWidth, rowHeight).fill("#4338ca");
      doc.fillColor("#fff");
      columns.forEach((c, i) => {
        doc.text(c.label, doc.page.margins.left + i * colWidth + 3, y + 5, { width: colWidth - 6, ellipsis: true });
      });
      doc.y = y + rowHeight;
      doc.fillColor("#111");
    };

    drawHeader();
    doc.fontSize(8);
    rows.forEach((row, idx) => {
      if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        drawHeader();
      }
      const y = doc.y;
      if (idx % 2 === 1) doc.rect(doc.page.margins.left, y, pageWidth, rowHeight).fill("#f3f4f6").fillColor("#111");
      columns.forEach((c, i) => {
        doc.text(fmtCell(getVal(row, c.key)).slice(0, 60), doc.page.margins.left + i * colWidth + 3, y + 5, {
          width: colWidth - 6, height: rowHeight - 4, ellipsis: true,
        });
      });
      doc.y = y + rowHeight;
    });

    doc.end();
  });

const CONTENT_TYPES = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

// Renders rows/columns in the requested format and sends it as a file download.
const sendExport = async (res, { format, filename, title, rows, columns }) => {
  const f = String(format || "csv").toLowerCase();
  if (!CONTENT_TYPES[f]) {
    return res.status(400).json({ success: false, message: "format must be csv, xlsx or pdf" });
  }

  let body;
  if (f === "csv") body = toCSV(rows, columns);
  else if (f === "xlsx") body = toXLSX(rows, columns, title);
  else body = await toPDF(rows, columns, title);

  res.setHeader("Content-Type", CONTENT_TYPES[f]);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.${f}"`);
  res.send(body);
};

module.exports = { toCSV, toXLSX, toPDF, sendExport };
