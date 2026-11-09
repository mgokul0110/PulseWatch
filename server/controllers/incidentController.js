const pool = require("../config/db");

const getIncidentHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const monitorResult = await pool.query(
      `SELECT id
       FROM monitors
       WHERE id = $1
         AND user_id = $2`,
      [id, userId]
    );

    if (monitorResult.rows.length === 0) {
      return res.status(404).json({
        message: "Monitor not found",
      });
    }

    const result = await pool.query(
      `SELECT
         i.id,
         i.started_at,
         i.resolved_at,
         i.reason,
         i.status
       FROM incidents i
       WHERE i.monitor_id = $1
       ORDER BY i.started_at DESC
       LIMIT 50`,
      [id]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Incident history error:", error);

    return res.status(500).json({
      message: "Could not load incident history",
    });
  }
};

module.exports = {
  getIncidentHistory,
};