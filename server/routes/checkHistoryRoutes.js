const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getCheckHistory,
} = require("../controllers/checkHistoryController");

const router = express.Router();

router.get("/:id", authMiddleware, getCheckHistory);

module.exports = router;