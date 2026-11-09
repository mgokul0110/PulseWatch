const pool = require("../config/db");
const { checkMonitor } = require("../services/monitorService");

const runMonitorCheck = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM monitors
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Monitor not found",
      });
    }

    const checkResult = await checkMonitor(result.rows[0]);

    return res.json({
      message: "Monitor checked successfully",
      check: checkResult,
    });
  } catch (error) {
    console.error("Monitor check error:", error);

    return res.status(500).json({
      message: "Could not check monitor",
    });
  }
};

module.exports = {
  runMonitorCheck,
};