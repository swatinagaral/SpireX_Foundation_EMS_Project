const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/permissionMiddleware");
const c = require("../controllers/userController");

const router = express.Router();
router.use(protect, authorize("users.manage"));

router.get("/", c.listUsers);
router.post("/", c.createUser);
router.patch("/:id/role", c.changeRole);
router.patch("/:id/status", c.changeStatus);

module.exports = router;
