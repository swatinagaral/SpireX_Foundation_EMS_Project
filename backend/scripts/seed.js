// Run once:  npm run seed
// Creates the first super_admin (from .env) + default email templates.
require("dotenv").config();
const connectDB = require("../config/db");
const User = require("../models/User");
const EmailTemplate = require("../models/EmailTemplate");

const templates = [
  { key: "welcome", name: "Welcome", category: "welcome",
    subject: "Welcome to EMS, {{name}}!",
    body: "<h2>Welcome, {{name}} 👋</h2><p>Your account has been created with the email <b>{{email}}</b>.</p>" },
  { key: "application_received", name: "Application Received", category: "application",
    subject: "We received your application",
    body: "<p>Hi {{name}},</p><p>Thank you for applying to <b>{{program}}</b>. We will review your application and get back to you soon.</p>" },
  { key: "application_approved", name: "Application Approved", category: "application",
    subject: "Your application has been approved",
    body: "<p>Hi {{name}},</p><p>Congratulations! Your application for <b>{{program}}</b> has been approved.</p>" },
  { key: "application_rejected", name: "Application Rejected", category: "application",
    subject: "Update on your application",
    body: "<p>Hi {{name}},</p><p>Thank you for your interest in <b>{{program}}</b>. Unfortunately we cannot move forward with your application right now.</p>" },
  { key: "offer_letter", name: "Offer Letter", category: "offer_letter",
    subject: "Your offer letter - {{position}}",
    body: "<p>Dear {{name}},</p><p>We are pleased to offer you the position of <b>{{position}}</b>. Your offer letter is attached / available at: {{link}}</p>" },
  { key: "certificate_issued", name: "Certificate Issued", category: "certificate",
    subject: "Your certificate is ready",
    body: "<p>Hi {{name}},</p><p>Your certificate <b>{{certificateId}}</b> has been issued. Verify it here: {{link}}</p>" },
  { key: "reminder", name: "General Reminder", category: "reminder",
    subject: "Reminder: {{title}}",
    body: "<p>Hi {{name}},</p><p>This is a reminder: {{message}}</p>" },
];

(async () => {
  await connectDB();

  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const exists = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (exists) {
      console.log(`Admin already exists: ${ADMIN_EMAIL}`);
    } else {
      await User.create({ name: ADMIN_NAME || "Super Admin", email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "super_admin" });
      console.log(`Super admin created: ${ADMIN_EMAIL}`);
    }
  } else {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set - skipping admin creation");
  }

  for (const t of templates) {
    const res = await EmailTemplate.updateOne({ key: t.key }, { $setOnInsert: t }, { upsert: true });
    console.log(`${res.upsertedCount ? "Created" : "Exists "} template: ${t.key}`);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
