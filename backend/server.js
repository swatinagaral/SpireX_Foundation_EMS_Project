// const express = require("express");
// const cors = require("cors");
// const dotenv = require("dotenv");
// const connectDB = require("./config/db");
// const authRoutes = require("./routes/authRoutes");
// const testRoutes = require("./routes/testRoutes");

// dotenv.config();

// const app = express();

// connectDB();

// app.use(
//   cors({
//     origin: "http://localhost:3000",
//     credentials: true,
//   })
// );


// app.use(express.json());

// app.use("/api/auth", authRoutes);
// app.use("/api/test", testRoutes);

// app.get("/", (req, res) => {
//   res.json({
//     success: true,
//     message: "EMS Communication API is running 🚀",
//   });
// });

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`EMS Backend running on port ${PORT}`);
// });





// const express = require("express");
// const cors = require("cors");
// const dotenv = require("dotenv");

// dotenv.config();

// const connectDB = require("./config/db");
// const authRoutes = require("./routes/authRoutes");
// const testRoutes = require("./routes/testRoutes");
// const announcementRoutes = require("./routes/announcementRoutes");
// const emailRoutes = require("./routes/emailRoutes");
// const templateRoutes = require("./routes/templateRoutes");
// const { notFound, errorHandler } = require("./middleware/errorHandler");
// const { startEmailQueue } = require("./services/emailQueue");

// const app = express();

// app.use(
//   cors({
//     origin: (process.env.CLIENT_URL || "http://localhost:3000").split(","),
//     credentials: true,
//   })
// );

// app.use(express.json({ limit: "1mb" }));

// app.use("/api/auth", authRoutes);
// app.use("/api/test", testRoutes);
// app.use("/api/announcements", announcementRoutes);
// app.use("/api/emails", emailRoutes);
// app.use("/api/email-templates", templateRoutes);

// app.get("/", (req, res) => {
//   res.json({
//     success: true,
//     message: "EMS Communication API is running 🚀",
//   });
// });

// app.use(notFound);
// app.use(errorHandler);

// const PORT = process.env.PORT || 5000;

// connectDB().then(async () => {
//   await startEmailQueue();
//   app.listen(PORT, () => {
//     console.log(`EMS Backend running on port ${PORT}`);
//   });
// });





// const express = require("express");
// const cors = require("cors");
// const dotenv = require("dotenv");

// dotenv.config();

// const connectDB = require("./config/db");
// const authRoutes = require("./routes/authRoutes");
// const testRoutes = require("./routes/testRoutes");
// const userRoutes = require("./routes/userRoutes");
// const announcementRoutes = require("./routes/announcementRoutes");
// const emailRoutes = require("./routes/emailRoutes");
// const templateRoutes = require("./routes/templateRoutes");
// const { notFound, errorHandler } = require("./middleware/errorHandler");
// const { startEmailQueue } = require("./services/emailQueue");

// const app = express();

// app.use(
//   cors({
//     origin: (process.env.CLIENT_URL || "http://localhost:3000").split(","),
//     credentials: true,
//   })
// );

// app.use(express.json({ limit: "1mb" }));

// app.use("/api/auth", authRoutes);
// app.use("/api/test", testRoutes);
// app.use("/api/users", userRoutes);
// app.use("/api/announcements", announcementRoutes);
// app.use("/api/emails", emailRoutes);
// app.use("/api/email-templates", templateRoutes);

// app.get("/", (req, res) => {
//   res.json({
//     success: true,
//     message: "EMS Communication API is running 🚀",
//   });
// });

// app.use(notFound);
// app.use(errorHandler);

// const PORT = process.env.PORT || 5000;

// connectDB().then(async () => {
//   await startEmailQueue();
//   app.listen(PORT, () => {
//     console.log(`EMS Backend running on port ${PORT}`);
//   });
// });




// const express = require("express");
// const cors = require("cors");
// const dotenv = require("dotenv");

// dotenv.config();

// const connectDB = require("./config/db");
// const authRoutes = require("./routes/authRoutes");
// const testRoutes = require("./routes/testRoutes");
// const userRoutes = require("./routes/userRoutes");
// const announcementRoutes = require("./routes/announcementRoutes");
// const emailRoutes = require("./routes/emailRoutes");
// const templateRoutes = require("./routes/templateRoutes");
// const reportRoutes = require("./routes/reportRoutes");
// const { notFound, errorHandler } = require("./middleware/errorHandler");
// const { startEmailQueue } = require("./services/emailQueue");

// const app = express();

// app.use(
//   cors({
//     origin: (process.env.CLIENT_URL || "http://localhost:3000").split(","),
//     credentials: true,
//   })
// );

// app.use(express.json({ limit: "1mb" }));

// app.use("/api/auth", authRoutes);
// app.use("/api/test", testRoutes);
// app.use("/api/users", userRoutes);
// app.use("/api/announcements", announcementRoutes);
// app.use("/api/emails", emailRoutes);
// app.use("/api/email-templates", templateRoutes);
// app.use("/api/reports", reportRoutes);

// app.get("/", (req, res) => {
//   res.json({
//     success: true,
//     message: "EMS Communication API is running 🚀",
//   });
// });

// app.use(notFound);
// app.use(errorHandler);

// const PORT = process.env.PORT || 5000;

// connectDB().then(async () => {
//   await startEmailQueue();
//   app.listen(PORT, () => {
//     console.log(`EMS Backend running on port ${PORT}`);
//   });
// });





const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const userRoutes = require("./routes/userRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const emailRoutes = require("./routes/emailRoutes");
const templateRoutes = require("./routes/templateRoutes");
const reportRoutes = require("./routes/reportRoutes");
const dataRoutes = require("./routes/dataRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { startEmailQueue } = require("./services/emailQueue");

const app = express();

app.use(
  cors({
    origin: (process.env.CLIENT_URL || "http://localhost:3000").split(","),
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/users", userRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/email-templates", templateRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/data", dataRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "EMS Communication API is running 🚀",
  });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await startEmailQueue();
  app.listen(PORT, () => {
    console.log(`EMS Backend running on port ${PORT}`);
  });
});
