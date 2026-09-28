const mongoose = require("mongoose");
const EmailTemplate = require("../models/EmailTemplate");
const httpError = require("../utils/httpError");
const { render, wrapHtml } = require("../services/templateRender");

const FIELDS = ["name", "key", "category", "subject", "body", "isActive"];
const pick = (obj) => Object.fromEntries(FIELDS.filter((f) => obj[f] !== undefined).map((f) => [f, obj[f]]));

const findOr404 = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid template id");
  const t = await EmailTemplate.findById(id);
  if (!t) throw httpError(404, "Template not found");
  return t;
};

const listTemplates = async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.active === "true") filter.isActive = true;
  const templates = await EmailTemplate.find(filter).select("-body").sort({ name: 1 });
  res.json({ success: true, count: templates.length, templates });
};

const getTemplate = async (req, res) => {
  res.json({ success: true, template: await findOr404(req.params.id) });
};

const createTemplate = async (req, res) => {
  const template = await EmailTemplate.create({ ...pick(req.body), createdBy: req.user._id });
  res.status(201).json({ success: true, message: "Template created", template });
};

const updateTemplate = async (req, res) => {
  const template = await findOr404(req.params.id);
  template.set(pick(req.body));
  await template.save();
  res.json({ success: true, message: "Template updated", template });
};

const deleteTemplate = async (req, res) => {
  const template = await findOr404(req.params.id);
  await template.deleteOne();
  res.json({ success: true, message: "Template deleted" });
};

// Shows how the email will look with sample variables
const previewTemplate = async (req, res) => {
  const t = await findOr404(req.params.id);
  const vars = req.body.variables || {};
  res.json({
    success: true,
    preview: {
      subject: render(t.subject, vars),
      html: wrapHtml(render(t.body, vars, { escape: true })),
      variables: t.variables,
    },
  });
};

module.exports = { listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate, previewTemplate };
