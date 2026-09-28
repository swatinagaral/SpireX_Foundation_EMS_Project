const nodemailer = require("nodemailer");

let transporter;

const isSmtpConfigured = () => Boolean(process.env.SMTP_HOST);

const getTransporter = () => {
  if (transporter) return transporter;

  if (isSmtpConfigured()) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  } else {
    console.warn("[mailer] SMTP_HOST not set -> DEV MODE: emails are NOT really delivered.");
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
};

const sendMail = ({ to, subject, html, text }) =>
  getTransporter().sendMail({
    from: process.env.EMAIL_FROM || "EMS <no-reply@ems.local>",
    to,
    subject,
    html,
    text,
  });

module.exports = { sendMail, isSmtpConfigured };
