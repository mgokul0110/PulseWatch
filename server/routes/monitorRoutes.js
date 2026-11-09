const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createMonitor,
  getMonitors,
  getMonitorById,
  updateMonitor,
  deleteMonitor,
} = require("../controllers/monitorController");

const router = express.Router();

router.post("/", authMiddleware, createMonitor);
router.get("/", authMiddleware, getMonitors);
router.get("/:id", authMiddleware, getMonitorById);
router.put("/:id", authMiddleware, updateMonitor);
router.delete("/:id", authMiddleware, deleteMonitor);
module.exports = router;