const EmailLog = require("../models/EmailLog");
const { sendMail } = require("./mailer");

const BATCH_SIZE = Number(process.env.EMAIL_BATCH_SIZE) || 10;
const INTERVAL_MS = Number(process.env.EMAIL_QUEUE_INTERVAL_MS) || 5000;

let timer = null;
let running = false;

const processQueue = async () => {
  if (running) return;
  running = true;
  try {
    for (let i = 0; i < BATCH_SIZE; i++) {
      // atomically claim one job so two workers never send the same email
      const job = await EmailLog.findOneAndUpdate(
        { status: "queued", scheduledAt: { $lte: new Date() } },
        { $set: { status: "sending" }, $inc: { attempts: 1 } },
        { sort: { scheduledAt: 1 }, returnDocument: "after" }
      );
      if (!job) break;

      try {
        const info = await sendMail({
          to: job.to.name ? `"${job.to.name.replace(/"/g, "")}" <${job.to.email}>` : job.to.email,
          subject: job.subject,
          html: job.html,
          text: job.text,
        });
        job.status = "sent";
        job.sentAt = new Date();
        job.messageId = info.messageId;
        job.lastError = undefined;
      } catch (err) {
        job.lastError = err.message;
        if (job.attempts >= job.maxAttempts) {
          job.status = "failed";
        } else {
          job.status = "queued"; // retry later with backoff
          job.scheduledAt = new Date(Date.now() + job.attempts * 60 * 1000);
        }
      }
      await job.save();
    }
  } catch (err) {
    console.error("[emailQueue] error:", err.message);
  } finally {
    running = false;
  }
};

const startEmailQueue = async () => {
  // emails stuck in "sending" (server crashed) go back to the queue
  await EmailLog.updateMany({ status: "sending" }, { $set: { status: "queued" } });
  if (timer) return;
  timer = setInterval(processQueue, INTERVAL_MS);
  console.log(`[emailQueue] started (every ${INTERVAL_MS}ms, ${BATCH_SIZE} per run)`);
};

const stopEmailQueue = () => {
  if (timer) clearInterval(timer);
  timer = null;
};

module.exports = { startEmailQueue, stopEmailQueue, processQueue };
