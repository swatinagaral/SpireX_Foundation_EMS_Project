const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/permissionMiddleware");
const c = require("../controllers/templateController");

const router = express.Router();
router.use(protect);

// people who can send emails need to see templates too
router.get("/", authorize("emails.template", "emails.send"), c.listTemplates);
router.get("/:id", authorize("emails.template", "emails.send"), c.getTemplate);

router.post("/", authorize("emails.template"), c.createTemplate);
router.patch("/:id", authorize("emails.template"), c.updateTemplate);
router.delete("/:id", authorize("emails.template"), c.deleteTemplate);
router.post("/:id/preview", authorize("emails.template"), c.previewTemplate);

module.exports = router;
