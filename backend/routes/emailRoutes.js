const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/permissionMiddleware");
const c = require("../controllers/emailController");

const router = express.Router();
router.use(protect);

router.post("/send", authorize("emails.send"), c.sendEmail);
router.post("/bulk", authorize("emails.bulk"), c.sendBulkEmail);

router.get("/history", authorize("emails.history"), c.getHistory);
router.get("/stats", authorize("emails.history"), c.getStats);
router.get("/:id", authorize("emails.history"), c.getEmail);
router.post("/:id/retry", authorize("emails.send"), c.retryEmail);
router.post("/:id/cancel", authorize("emails.send"), c.cancelEmail);

module.exports = router;
