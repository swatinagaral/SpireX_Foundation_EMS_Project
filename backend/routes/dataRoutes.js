const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/permissionMiddleware");
const c = require("../controllers/dataController");

const router = express.Router();
router.use(protect, authorize("data.manage"));

router.get("/programs", c.programCrud.list);
router.post("/programs", c.createProgram);
router.delete("/programs/:id", c.programCrud.remove);

router.get("/batches", c.batchCrud.list);
router.post("/batches", c.createBatch);
router.delete("/batches/:id", c.batchCrud.remove);

router.get("/students", c.studentCrud.list);
router.post("/students", c.createStudent);
router.delete("/students/:id", c.studentCrud.remove);

router.get("/tasks", c.taskCrud.list);
router.post("/tasks", c.createTask);
router.delete("/tasks/:id", c.taskCrud.remove);

router.get("/attendance", c.attendanceCrud.list);
router.post("/attendance", c.createAttendance);
router.delete("/attendance/:id", c.attendanceCrud.remove);

router.get("/performance", c.performanceCrud.list);
router.post("/performance", c.createPerformance);
router.delete("/performance/:id", c.performanceCrud.remove);

router.get("/certificates", c.certificateCrud.list);
router.post("/certificates", c.createCertificate);
router.delete("/certificates/:id", c.certificateCrud.remove);

module.exports = router;
