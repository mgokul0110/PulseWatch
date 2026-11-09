const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { runMonitorCheck } = require("../controllers/checkController");

const router = express.Router();

router.post(
  "/:id",
  authMiddleware,
  runMonitorCheck
);

module.exports = router;