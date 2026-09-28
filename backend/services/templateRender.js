const escapeHtml = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Replaces {{name}} with variables.name. Missing variables become "".
// escape=true -> values are HTML-escaped (use for the email body).
const render = (str, vars = {}, { escape = false } = {}) =>
  String(str || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const val = vars[key];
    if (val === undefined || val === null) return "";
    return escape ? escapeHtml(val) : String(val);
  });

const wrapHtml = (inner) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:600px;margin:auto;padding:16px">${inner}</div>`;

const toText = (html) =>
  String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>|<\/p>|<\/h\d>|<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

module.exports = { escapeHtml, render, wrapHtml, toText };
