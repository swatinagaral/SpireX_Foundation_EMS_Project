// const crypto = require("crypto");
// const EmailTemplate = require("../models/EmailTemplate");
// const EmailLog = require("../models/EmailLog");
// const httpError = require("../utils/httpError");
// const { render, wrapHtml, toText } = require("./templateRender");

// // Renders subject + body for one recipient
// const buildMessage = ({ subject, body, variables = {} }) => {
//   const html = wrapHtml(render(body, variables, { escape: true }));
//   return {
//     subject: render(subject, variables).replace(/[\r\n]+/g, " ").trim().slice(0, 200),
//     html,
//     text: toText(html),
//   };
// };

// // Either loads a template, or validates a custom subject/body
// const resolveContent = async ({ templateId, templateKey, subject, body }) => {
//   if (templateId || templateKey) {
//     const template = await EmailTemplate.findOne(
//       templateId ? { _id: templateId, isActive: true } : { key: String(templateKey).toLowerCase(), isActive: true }
//     );
//     if (!template) throw httpError(404, "Email template not found or inactive");
//     return { template, subject: template.subject, body: template.body };
//   }
//   if (!subject || !body) throw httpError(400, "Provide templateId, or both subject and body");
//   if (String(subject).length > 200) throw httpError(400, "Subject is too long (max 200)");
//   if (String(body).length > 50000) throw httpError(400, "Body is too long");
//   return { template: null, subject: String(subject), body: String(body) };
// };

// // Adds emails to the queue (the worker in emailQueue.js sends them)
// const queueEmails = async ({
//   recipients, subject, body, template, variables = {},
//   type = "single", sentBy, scheduledAt, announcement, bulkId,
// }) => {
//   if (!recipients.length) throw httpError(400, "No valid recipients found");

//   const docs = recipients.map((r) => {
//     const vars = { ...variables, ...(r.name ? { name: r.name } : {}), email: r.email, ...(r.variables || {}) };
//     return {
//       to: { email: r.email, name: r.name },
//       ...buildMessage({ subject, body, variables: vars }),
//       type,
//       template: template?._id,
//       templateKey: template?.key,
//       bulkId,
//       announcement,
//       sentBy,
//       scheduledAt: scheduledAt || new Date(),
//       status: "queued",
//     };
//   });
//   return EmailLog.insertMany(docs);
// };

// // ---- For OTHER modules (offer letters, certificates, applications...) ----
// // await sendTemplateEmail("offer_letter", { email, name }, { position: "Intern" });
// const sendTemplateEmail = async (templateKey, to, variables = {}, { sentBy } = {}) => {
//   const content = await resolveContent({ templateKey });
//   const [log] = await queueEmails({
//     recipients: [{ email: to.email, name: to.name }],
//     subject: content.subject,
//     body: content.body,
//     template: content.template,
//     variables,
//     type: "automated",
//     sentBy,
//   });
//   return log;
// };

// const newBulkId = () => crypto.randomUUID();

// module.exports = { buildMessage, resolveContent, queueEmails, sendTemplateEmail, newBulkId };

const crypto = require("crypto");
const EmailTemplate = require("../models/EmailTemplate");
const EmailLog = require("../models/EmailLog");
const httpError = require("../utils/httpError");
const { render, wrapHtml, toText } = require("./templateRender");

// Renders subject + body for one recipient
const buildMessage = ({ subject, body, variables = {} }) => {
  const html = wrapHtml(render(body, variables, { escape: true }));
  return {
    subject: render(subject, variables)
      .replace(/[\r\n]+/g, " ")
      .trim()
      .slice(0, 200),
    html,
    text: toText(html),
  };
};

// Either loads a template, or validates a custom subject/body
const resolveContent = async ({ templateId, templateKey, subject, body }) => {
  if (templateId || templateKey) {
    const template = await EmailTemplate.findOne(
      templateId
        ? { _id: templateId, isActive: true }
        : { key: String(templateKey).toLowerCase(), isActive: true },
    );
    if (!template) throw httpError(404, "Email template not found or inactive");
    return { template, subject: template.subject, body: template.body };
  }
  if (!subject || !body)
    throw httpError(400, "Provide templateId, or both subject and body");
  if (String(subject).length > 200)
    throw httpError(400, "Subject is too long (max 200)");
  if (String(body).length > 50000) throw httpError(400, "Body is too long");
  return { template: null, subject: String(subject), body: String(body) };
};

// Adds emails to the queue (the worker in emailQueue.js sends them)
const queueEmails = async ({
  recipients,
  subject,
  body,
  template,
  variables = {},
  type = "single",
  sentBy,
  scheduledAt,
  announcement,
  bulkId,
  audience,
}) => {
  if (!recipients.length) throw httpError(400, "No valid recipients found");

  const docs = recipients.map((r) => {
    const vars = {
      ...variables,
      ...(r.name ? { name: r.name } : {}),
      email: r.email,
      ...(r.variables || {}),
    };
    return {
      to: { email: r.email, name: r.name },
      ...buildMessage({ subject, body, variables: vars }),
      type,
      template: template?._id,
      templateKey: template?.key,
      bulkId,
      announcement,
      sentBy,
      scheduledAt: scheduledAt || new Date(),
      status: "queued",
      ...(audience ? { audience } : {}),
    };
  });
  return EmailLog.insertMany(docs);
};

// ---- For OTHER modules (offer letters, certificates, applications...) ----
// await sendTemplateEmail("offer_letter", { email, name }, { position: "Intern" });
const sendTemplateEmail = async (
  templateKey,
  to,
  variables = {},
  { sentBy } = {},
) => {
  const content = await resolveContent({ templateKey });
  const [log] = await queueEmails({
    recipients: [{ email: to.email, name: to.name }],
    subject: content.subject,
    body: content.body,
    template: content.template,
    variables,
    type: "automated",
    sentBy,
  });
  return log;
};

const newBulkId = () => crypto.randomUUID();

module.exports = {
  buildMessage,
  resolveContent,
  queueEmails,
  sendTemplateEmail,
  newBulkId,
};
