const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/permissionMiddleware");
const c = require("../controllers/reportController");

const router = express.Router();
router.use(protect, authorize("reports.view"));

router.get("/dashboard", c.getDashboardAnalytics);

router.get("/emails", c.getEmailReport);
router.get("/emails/export", authorize("reports.export"), c.exportEmailReport);

router.get("/announcements", c.getAnnouncementReport);
router.get("/announcements/export", authorize("reports.export"), c.exportAnnouncementReport);

module.exports = router;
