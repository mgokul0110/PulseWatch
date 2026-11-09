const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getIncidentHistory,
} = require("../controllers/incidentController");

const router = express.Router();

router.get("/:id", authMiddleware, getIncidentHistory);

module.exports = router;