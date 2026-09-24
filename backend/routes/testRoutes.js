const express = require("express");

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/permissionMiddleware");

const router = express.Router();

router.post(
  "/announcement-create-test",
  protect,
  authorize("announcements.create"),
  (req, res) => {
    res.json({
      success: true,
      message: "RBAC test passed. You can create announcements.",
      user: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role,
      },
    });
  }
);

module.exports = router;