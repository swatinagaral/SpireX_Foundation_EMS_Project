const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/permissionMiddleware");
const c = require("../controllers/announcementController");

const router = express.Router();
router.use(protect);

// fixed paths first, then /:id
router.get("/", authorize("announcements.read"), c.getMyAnnouncements);
router.get("/manage", authorize("announcements.create", "announcements.update"), c.getManageList);
router.get("/unread-count", authorize("announcements.read"), c.getUnreadCount);
router.post("/", authorize("announcements.create"), c.createAnnouncement);

router.get("/:id", authorize("announcements.read"), c.getAnnouncement);
router.patch("/:id", authorize("announcements.update"), c.updateAnnouncement);
router.delete("/:id", authorize("announcements.delete"), c.deleteAnnouncement);
router.post("/:id/read", authorize("announcements.read"), c.markAsRead);

module.exports = router;
