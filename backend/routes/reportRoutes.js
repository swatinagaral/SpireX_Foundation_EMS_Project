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

router.get("/performance", c.getPerformanceReport);
router.get("/performance/export", authorize("reports.export"), c.exportPerformanceReport);

router.get("/attendance", c.getAttendanceReport);

router.get(
  "/attendance/export",
  authorize("reports.export"),
  c.exportAttendanceReport
);

router.get("/certificates", c.getCertificateReport);

router.get(
  "/certificates/export",
  authorize("reports.export"),
  c.exportCertificateReport
);


module.exports = router;
