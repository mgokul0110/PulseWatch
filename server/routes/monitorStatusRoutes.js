const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getMonitorStatuses,
} = require("../controllers/monitorStatusController");

const router = express.Router();

router.get("/", authMiddleware, getMonitorStatuses);

module.exports = router;